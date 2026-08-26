(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_warden_session_v1';
  let lastFeed = null;
  let mutationQueued = false;
  let amendPending = null;

  const money = v => {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    }) + 'cr';
  };

  function installStyles() {
    if (document.getElementById('wardenAuditV11Styles')) return;
    const style = document.createElement('style');
    style.id = 'wardenAuditV11Styles';
    style.textContent = `
      #history .history { grid-template-columns:minmax(160px,1.3fr) .65fr .65fr .75fr auto; align-items:center; }
      .warden-audit-actions { display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap; }
      .warden-audit-actions .btn { padding:6px 8px;font-size:.7rem; }
      .warden-audit-id { color:#777;font-size:.63rem;margin-top:3px;overflow-wrap:anywhere; }
      .warden-audit-legacy { color:#777;font-size:.68rem;text-align:right; }
      @media(max-width:760px){
        #history .history { grid-template-columns:1fr 1fr; }
        .warden-audit-actions,.warden-audit-legacy { justify-content:flex-start;text-align:left; }
      }
    `;
    document.head.appendChild(style);
    const sub = document.querySelector('header .sub');
    if (sub) sub.textContent = 'Private campaign administration — contract closeout v1.1 · audited undo / amend';
  }

  function sessionToken() {
    try { return String(localStorage.getItem(SESSION_KEY) || '').trim(); }
    catch (_) { return ''; }
  }

  function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      const cb = '__wardenAudit_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Warden service timed out.')), 30000);
      function finish(err, data) {
        clearTimeout(timer);
        try { delete window[cb]; } catch (_) { window[cb] = undefined; }
        script.remove();
        err ? reject(err) : resolve(data);
      }
      window[cb] = data => finish(null, data);
      script.onerror = () => finish(new Error('Could not reach Warden service.'));
      script.src = API + '?' + new URLSearchParams({action, callback:cb, ...params});
      document.head.appendChild(script);
    });
  }

  function setConsoleStatus(text) {
    const status = document.getElementById('status');
    if (status) status.textContent = text;
  }

  function captureFeedJsonp(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    let url;
    try { url = new URL(script.src, location.href); } catch (_) { return; }
    if (String(url.searchParams.get('action') || '').toLowerCase() !== 'wardenfeed') return;
    const cb = url.searchParams.get('callback');
    if (!cb) return;
    const original = window[cb];
    if (typeof original !== 'function' || original.__wardenAuditWrapped) return;
    const wrapped = payload => {
      if (payload && payload.ok) lastFeed = payload;
      original(payload);
      setTimeout(() => {
        enhanceHistory();
        continueAmendment();
      }, 0);
    };
    wrapped.__wardenAuditWrapped = true;
    window[cb] = wrapped;
  }

  function installFeedInterceptor() {
    const previous = Node.prototype.appendChild;
    if (previous.__wardenAuditV11Patched) return;
    function patched(node) {
      captureFeedJsonp(node);
      return previous.call(this, node);
    }
    patched.__wardenAuditV11Patched = true;
    Node.prototype.appendChild = patched;
  }

  function enhanceHistory() {
    const host = document.getElementById('history');
    const history = lastFeed?.history || [];
    if (!host || !history.length) return;
    const rows = [...host.querySelectorAll('.history')];
    rows.forEach((row, index) => {
      if (row.querySelector('.warden-audit-actions,.warden-audit-legacy')) return;
      const item = history[index];
      if (!item) return;
      const first = row.firstElementChild;
      if (first && item.transactionId) {
        const id = document.createElement('div');
        id.className = 'warden-audit-id';
        id.textContent = item.transactionId;
        first.appendChild(id);
      }
      if (!item.undoable || !item.transactionId) {
        const legacy = document.createElement('div');
        legacy.className = 'warden-audit-legacy';
        legacy.textContent = 'LEGACY / READ-ONLY';
        row.appendChild(legacy);
        return;
      }
      const controls = document.createElement('div');
      controls.className = 'warden-audit-actions';
      controls.innerHTML = '<button class="btn" type="button">AMEND</button><button class="btn danger" type="button">UNDO</button>';
      controls.children[0].addEventListener('click', () => undo(item, true));
      controls.children[1].addEventListener('click', () => undo(item, false));
      row.appendChild(controls);
    });
  }

  async function undo(item, amend) {
    if (!item?.transactionId) return;
    const message = amend
      ? `Amend ${item.title}?\n\nThe existing closeout will be VOIDED, its payout removed, and the contract restored to Active. The closeout form will then reopen with the prior closeout values for correction.`
      : `Undo closeout for ${item.title}?\n\nThis will VOID the audited closeout, remove its contract payout rows, and restore the exact pre-closeout Tracker, Contracts, and Mission Board state.`;
    if (!confirm(message)) return;

    if (amend) {
      amendPending = {
        jobId:item.jobId || '', contractId:item.contractId || '', status:item.status || 'Completed',
        closedDate:item.closedDate || '', gross:item.grossPayout ?? item.totalPayout ?? '',
        contractor:item.contractorCost ?? 0, summary:item.closeoutSummary || '', outcome:item.existingOutcome || ''
      };
    }

    setConsoleStatus(amend ? 'REOPENING CLOSEOUT FOR AMENDMENT…' : 'UNDOING CLOSEOUT…');
    try {
      const result = await jsonp('wardenundo', {
        session: sessionToken(),
        transaction: item.transactionId
      });
      if (!result?.ok) throw new Error(result?.error || result?.message || 'Undo failed.');
      const refresh = document.getElementById('refresh');
      if (refresh) refresh.click();
      else location.reload();
    } catch (err) {
      amendPending = null;
      setConsoleStatus('WARDEN SERVICE ERROR');
      alert(String(err.message || err));
    }
  }

  function continueAmendment() {
    if (!amendPending || !lastFeed) return;
    const active = lastFeed.active || [];
    const index = active.findIndex(c =>
      (amendPending.jobId && c.jobId === amendPending.jobId) ||
      (amendPending.contractId && c.contractId === amendPending.contractId)
    );
    if (index < 0) return;

    const saved = amendPending;
    amendPending = null;
    const button = document.querySelector(`[data-r="${index}"]`);
    if (!button) {
      alert('The closeout was voided and the contract restored, but the amendment form could not be opened automatically. Use RESOLVE CONTRACT on the restored Active contract.');
      return;
    }
    button.click();
    setTimeout(() => {
      const values = {
        cstatus:saved.status,
        closed:saved.closedDate,
        gross:String(saved.gross),
        contractor:String(saved.contractor),
        summary:saved.summary,
        outcome:saved.outcome
      };
      Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value ?? '';
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
      });
      const result = document.getElementById('result');
      if (result) {
        result.textContent = 'AMENDMENT READY — prior closeout was voided. Review the restored values, Preview Changes, then commit the corrected closeout.';
        result.className = 'notice warn';
      }
    }, 0);
  }

  function installObserver() {
    const host = document.getElementById('history');
    if (!host) return;
    new MutationObserver(() => {
      if (mutationQueued) return;
      mutationQueued = true;
      queueMicrotask(() => { mutationQueued = false; enhanceHistory(); });
    }).observe(host, {childList:true, subtree:true});
  }

  installStyles();
  installFeedInterceptor();
  installObserver();
})();
