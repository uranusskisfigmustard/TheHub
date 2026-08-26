(() => {
  'use strict';

  const STYLE_ID = 'qualificationPresentationStyles';
  const QUALIFIED_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4L12 2.8Z" stroke="currentColor" stroke-width="1.7"/><path d="m8.2 12.1 2.5 2.5 5.1-5.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ATTENTION_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.4 21 19H3L12 3.4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8.6v5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>';
  const BLOCKED_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="m6 6 12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const DISPOSITION_DELAY_MS = 5000;
  const DISPOSITION_PHASE_MS = 800;
  const DISPOSITION_DOT_MS = 400;
  const CONTRACT_API_TIMEOUT_MS = 30000;

  let dispositionGeneration = 0;
  let dispositionPhaseTimer = null;
  let dispositionDotsTimer = null;
  let dispositionFinalTimer = null;
  let dispositionButtonState = null;

  function installContractApiTimeoutExtension() {
    const currentSetTimeout = window.setTimeout;
    if (currentSetTimeout.__mothershipContractApiTimeoutExtended) return;

    function extendedSetTimeout(handler, delay, ...args) {
      let effectiveDelay = delay;
      if (Number(delay) === 10000) {
        try {
          const stack = String(new Error().stack || '');
          if (stack.includes('apiCall')) effectiveDelay = CONTRACT_API_TIMEOUT_MS;
        } catch (_) {}
      }
      return currentSetTimeout.call(window, handler, effectiveDelay, ...args);
    }

    extendedSetTimeout.__mothershipContractApiTimeoutExtended = true;
    window.setTimeout = extendedSetTimeout;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      article.card.crew-ready,
      article.card.crew-action,
      article.card.regulated-not-met {
        border-color:#3a3f43 !important;
        box-shadow:0 10px 24px rgba(0,0,0,.20) !important;
      }

      #highlightLabel { display:none !important; }
      .eligibility-badge { display:none !important; }

      .qual-box.state-met {
        border-color:#4f6a46 !important;
        background:rgba(39,58,36,.38) !important;
      }
      .qual-box.state-met .qual-head,
      .qual-box.state-met .qual-icon {
        color:#bdd2aa !important;
      }

      .qual-box.state-warn {
        border-color:#8a611f !important;
        background:rgba(63,42,14,.34) !important;
      }
      .qual-box.state-warn .qual-head,
      .qual-box.state-warn .qual-icon {
        color:#f0a347 !important;
      }

      .qual-box.state-blocked {
        border-color:#8b3535 !important;
        background:rgba(62,18,18,.34) !important;
      }
      .qual-box.state-blocked .qual-head,
      .qual-box.state-blocked .qual-icon {
        color:#ff6d63 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function setStateIcon(icon, state) {
    if (!icon) return;
    if (icon.dataset.qualificationStateIcon === state) return;
    icon.innerHTML = state === 'met' ? QUALIFIED_ICON : state === 'blocked' ? BLOCKED_ICON : ATTENTION_ICON;
    icon.dataset.qualificationStateIcon = state;
  }

  function applyPresentation() {
    document.querySelectorAll('article.card').forEach(card => {
      const qualBox = card.querySelector('.qual-box');
      if (!qualBox) {
        card.querySelectorAll('.eligibility-badge').forEach(badge => badge.remove());
        return;
      }

      const icon = qualBox.querySelector('.qual-icon');
      const regulated = qualBox.classList.contains('regulated');
      const ready = card.classList.contains('crew-ready');

      qualBox.classList.remove('crew-qualified','state-met','state-warn','state-blocked');
      card.classList.remove('regulated-not-met');

      if (ready) {
        qualBox.classList.add('state-met');
        setStateIcon(icon, 'met');
      } else if (regulated) {
        qualBox.classList.add('state-blocked');
        setStateIcon(icon, 'blocked');
      } else {
        qualBox.classList.add('state-warn');
        setStateIcon(icon, 'warn');
      }

      card.querySelectorAll('.eligibility-badge').forEach(badge => badge.remove());
    });
  }

  function installObserver() {
    const target = document.getElementById('cards');
    if (!target) return;
    applyPresentation();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        applyPresentation();
      });
    });

    observer.observe(target, { childList:true, subtree:true });
  }

  function setDispositionResult(text, kind) {
    const result = document.getElementById('acceptResult');
    if (!result) return;
    result.textContent = text;
    result.className = 'accept-result ' + kind;
    result.classList.remove('hidden');
  }

  function renderApplicationRejection(payload) {
    if (String(payload?.result || '').trim().toUpperCase() !== 'APPLICATION REJECTED') return;
    const message = String(payload?.message || 'The posting party declined the submitted crew roster.').trim();
    setDispositionResult('APPLICATION REJECTED\n\n' + message, 'bad');
  }

  function restoreDispositionButtons() {
    if (!dispositionButtonState) return;
    dispositionButtonState.forEach(({button, disabled}) => {
      if (button && button.isConnected) button.disabled = disabled;
    });
    dispositionButtonState = null;
  }

  function clearDispositionTimers(restoreButtons = true) {
    if (dispositionPhaseTimer) clearTimeout(dispositionPhaseTimer);
    if (dispositionDotsTimer) clearInterval(dispositionDotsTimer);
    if (dispositionFinalTimer) clearTimeout(dispositionFinalTimer);
    dispositionPhaseTimer = null;
    dispositionDotsTimer = null;
    dispositionFinalTimer = null;
    if (restoreButtons) restoreDispositionButtons();
  }

  function cancelDispositionDelay() {
    dispositionGeneration += 1;
    clearDispositionTimers(true);
  }

  function startApplicationRejectionDelay(payload) {
    cancelDispositionDelay();
    const token = dispositionGeneration;
    const buttons = [
      document.getElementById('acceptValidateBtn'),
      document.getElementById('acceptContractorSubmit'),
      document.getElementById('acceptAuthorizationRequest')
    ].filter(Boolean);
    dispositionButtonState = buttons.map(button => ({button, disabled:button.disabled}));
    buttons.forEach(button => { button.disabled = true; });

    setDispositionResult('Request submitted..', 'warn');

    let dots = 1;
    dispositionPhaseTimer = setTimeout(() => {
      if (token !== dispositionGeneration) return;
      setDispositionResult('Awaiting response.', 'warn');
      dispositionDotsTimer = setInterval(() => {
        if (token !== dispositionGeneration) return;
        dots = dots % 3 + 1;
        setDispositionResult('Awaiting response' + '.'.repeat(dots), 'warn');
      }, DISPOSITION_DOT_MS);
    }, DISPOSITION_PHASE_MS);

    dispositionFinalTimer = setTimeout(() => {
      if (token !== dispositionGeneration) return;
      clearDispositionTimers(true);
      renderApplicationRejection(payload);
    }, DISPOSITION_DELAY_MS);
  }

  function wrapDispositionJsonp(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    let url;
    try { url = new URL(script.src, location.href); } catch (_) { return; }
    const action = String(url.searchParams.get('action') || '').trim().toLowerCase();
    if (action !== 'validate' && action !== 'accept') return;

    const callbackName = url.searchParams.get('callback');
    if (!callbackName) return;
    const original = window[callbackName];
    if (typeof original !== 'function' || original.__applicationDispositionWrapped) return;

    const wrapped = payload => {
      original(payload);
      if (String(payload?.result || '').trim().toUpperCase() === 'APPLICATION REJECTED') {
        startApplicationRejectionDelay(payload);
      }
    };
    wrapped.__applicationDispositionWrapped = true;
    window[callbackName] = wrapped;
  }

  function installDispositionInterceptor() {
    const previousAppendChild = Node.prototype.appendChild;
    if (previousAppendChild.__applicationDispositionPresentationWrapped) return;

    function patchedAppendChild(node) {
      wrapDispositionJsonp(node);
      return previousAppendChild.call(this, node);
    }
    patchedAppendChild.__applicationDispositionPresentationWrapped = true;
    Node.prototype.appendChild = patchedAppendChild;
  }

  function installDispositionResetHooks() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-accept-job], #acceptCancelBtn, #acceptModalClose')) cancelDispositionDelay();
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') cancelDispositionDelay();
    });
  }

  installContractApiTimeoutExtension();
  installStyles();
  installObserver();
  installDispositionInterceptor();
  installDispositionResetHooks();
})();
