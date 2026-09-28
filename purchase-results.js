(() => {
  'use strict';

  const BUILD = '20260928-purchase-results1';

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  function init() {
    const root = document.getElementById('purchaseRoot');
    if (!root || root.dataset.purchaseResultsEnhanced === 'true') return;

    const pageStatus = root.querySelector('[data-purchase-status]');
    const heading = root.querySelector('.purchases-heading');
    const modal = root.querySelector('[data-purchase-modal]');
    const modalCard = modal?.querySelector('.purchase-modal-card');
    const modalTitle = root.querySelector('[data-purchase-modal-title]');
    const modalBody = root.querySelector('[data-purchase-modal-body]');
    const cancelButton = root.querySelector('[data-purchase-cancel]');
    const confirmButton = root.querySelector('[data-purchase-confirm]');

    if (!pageStatus || !heading || !modal || !modalBody || !confirmButton) return;

    const result = document.createElement('section');
    result.className = 'purchase-result';
    result.hidden = true;
    result.tabIndex = -1;
    result.setAttribute('aria-live', 'polite');
    result.setAttribute('aria-atomic', 'true');
    result.innerHTML = `
      <div class="purchase-result-head">
        <div>
          <div class="purchase-result-kicker" data-purchase-result-kicker>TRANSACTION STATUS</div>
          <h2 data-purchase-result-title>—</h2>
        </div>
        <button type="button" class="purchase-result-dismiss" data-purchase-result-dismiss aria-label="Dismiss transaction status">DISMISS</button>
      </div>
      <p class="purchase-result-message" data-purchase-result-message></p>
      <div class="purchase-result-details" data-purchase-result-details></div>
    `;
    heading.insertAdjacentElement('afterend', result);

    const resultKicker = result.querySelector('[data-purchase-result-kicker]');
    const resultTitle = result.querySelector('[data-purchase-result-title]');
    const resultMessage = result.querySelector('[data-purchase-result-message]');
    const resultDetails = result.querySelector('[data-purchase-result-details]');
    const dismissButton = result.querySelector('[data-purchase-result-dismiss]');

    let pending = null;
    let attemptInFlight = false;
    let lastModalError = '';
    let lastResultState = '';

    function summaryValues() {
      const values = {};
      root.querySelectorAll('.purchase-summary-row').forEach(row => {
        const label = String(row.querySelector('span')?.textContent || '').trim();
        const value = String(row.querySelector('strong')?.textContent || '').trim();
        if (label) values[label] = value;
      });
      return values;
    }

    function transactionSnapshot() {
      const values = summaryValues();
      return {
        buyer: values['Buyer / Recipient'] || String(root.querySelector('[data-purchase-who]')?.textContent || '').trim(),
        item: values.Item || '',
        price: values.Price || '',
        financed: values.Financed || '',
        principalAfter: values['Principal After Purchase'] || '',
        payment: values.Payment || (values.Financed ? 'Personal Balance + financing' : '')
      };
    }

    function scrollToResult() {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      requestAnimationFrame(() => {
        try { result.focus({ preventScroll: true }); } catch (_) {}
        try { result.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } catch (_) {}
      });
    }

    function showResult(state, title, message, details = [], shouldScroll = false) {
      lastResultState = state;
      result.hidden = false;
      result.dataset.state = state;
      resultKicker.textContent = state === 'processing' ? 'TRANSACTION IN PROGRESS' : 'TRANSACTION RESULT';
      resultTitle.textContent = title;
      resultMessage.textContent = message;
      resultDetails.innerHTML = details
        .filter(entry => entry && entry[0] && entry[1])
        .map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`)
        .join('');
      result.setAttribute('role', state === 'failure' || state === 'unknown' ? 'alert' : 'status');
      if (shouldScroll) scrollToResult();
    }

    function clearModalResultState() {
      if (modalCard) delete modalCard.dataset.purchaseResult;
      if (modalTitle && !modal.hidden && !attemptInFlight) modalTitle.textContent = 'Confirm Purchase';
    }

    function receiptFromStatus(text) {
      const parts = String(text || '').split('//').map(value => value.trim()).filter(Boolean);
      return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    function recordSuccess(statusText) {
      const tx = pending || transactionSnapshot();
      const receipt = receiptFromStatus(statusText);
      attemptInFlight = false;
      if (modalCard) modalCard.dataset.purchaseResult = 'success';
      showResult(
        'success',
        'PURCHASE COMPLETE',
        `${tx.item || 'Purchase'} was recorded for ${tx.buyer || 'the selected PC'}.`,
        [
          ['ITEM', tx.item],
          ['BUYER / RECIPIENT', tx.buyer],
          ['PRICE', tx.price],
          ['FINANCED', tx.financed],
          ['RECEIPT', receipt]
        ],
        true
      );
    }

    function recordFailure(message, unknown = false) {
      const tx = pending || transactionSnapshot();
      attemptInFlight = false;
      const state = unknown ? 'unknown' : 'failure';
      const title = unknown ? 'PURCHASE STATUS UNKNOWN' : 'PURCHASE NOT COMPLETED';
      const explanation = unknown
        ? 'The Purchase Board did not receive a reliable completion result. Do not repeat the purchase until you refresh the catalog and confirm the balance or ownership state.'
        : String(message || 'The Purchase Board rejected the transaction. No success confirmation was returned.');

      if (modalCard) modalCard.dataset.purchaseResult = state;
      if (modalTitle) modalTitle.textContent = title;
      showResult(
        state,
        title,
        explanation,
        [
          ['ITEM', tx.item],
          ['BUYER / RECIPIENT', tx.buyer],
          ['BOARD MESSAGE', message]
        ],
        false
      );
    }

    function recordFinancingConfirmation() {
      const tx = pending || transactionSnapshot();
      attemptInFlight = false;
      if (modalCard) modalCard.dataset.purchaseResult = 'financing';
      if (modalTitle) modalTitle.textContent = 'Financing Confirmation Required';
      showResult(
        'financing',
        'FINANCING CONFIRMATION REQUIRED',
        `The purchase has not been completed yet. Confirm the financing terms to continue.`,
        [
          ['ITEM', tx.item],
          ['BUYER / RECIPIENT', tx.buyer],
          ['FINANCED', tx.financed],
          ['PRINCIPAL AFTER PURCHASE', tx.principalAfter]
        ],
        false
      );
    }

    function inspectOutcome() {
      if (!attemptInFlight) return;

      const statusText = String(pageStatus.textContent || '').trim();
      const statusState = String(pageStatus.dataset.state || '').trim();
      if (statusState === 'ok' && /\bPURCHASED FOR\b/i.test(statusText)) {
        recordSuccess(statusText);
        return;
      }

      if (statusState === 'error' && /BOARD ACCESS REQUIRED|AUTHENTICATION FAILED|SESSION EXPIRED/i.test(statusText)) {
        recordFailure(statusText, false);
        return;
      }

      const errors = Array.from(modalBody.querySelectorAll('.purchase-modal-error'));
      const errorText = String(errors.at(-1)?.textContent || '').trim();
      if (errorText && errorText !== lastModalError) {
        lastModalError = errorText;
        const uncertain = /timed out|service unavailable|network|failed to fetch|connection/i.test(errorText);
        recordFailure(errorText, uncertain);
        return;
      }

      if (!modal.hidden && /FINANCING REQUIRES CONFIRMATION/i.test(String(modalBody.textContent || ''))) {
        recordFinancingConfirmation();
      }
    }

    root.addEventListener('click', event => {
      const confirm = event.target.closest('[data-purchase-confirm]');
      if (confirm && !confirm.disabled) {
        pending = transactionSnapshot();
        attemptInFlight = true;
        lastModalError = '';
        clearModalResultState();
        showResult(
          'processing',
          'PROCESSING PURCHASE',
          `Submitting ${pending.item || 'purchase'} for ${pending.buyer || 'the selected PC'}. Do not submit it again until the board reports a result.`,
          [
            ['ITEM', pending.item],
            ['BUYER / RECIPIENT', pending.buyer],
            ['PRICE', pending.price],
            ['FINANCED', pending.financed]
          ],
          false
        );
        return;
      }

      if (event.target.closest('[data-purchase-buy]')) {
        clearModalResultState();
      }

      if (event.target.closest('[data-purchase-cancel]') && (lastResultState === 'failure' || lastResultState === 'unknown')) {
        setTimeout(scrollToResult, 0);
      }
    }, true);

    dismissButton.addEventListener('click', () => {
      result.hidden = true;
      lastResultState = '';
    });

    const observer = new MutationObserver(() => inspectOutcome());
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-state', 'hidden']
    });

    root.dataset.purchaseResultsEnhanced = 'true';
    root.dataset.purchaseResultsBuild = BUILD;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
