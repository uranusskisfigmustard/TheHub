(() => {
  'use strict';

  const CONTRACT_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const TOKEN_KEY = 'mothership_hub_board_session_v1';
  const EXPIRY_KEY = 'mothership_hub_board_session_expiry_v1';
  const AUTH_STATUS_ID = 'boardAuthStatus';
  const LOCK_BUTTON_ID = 'boardAuthLock';
  const PRIVILEGED_ACTIONS = new Set(['validate', 'authorize', 'accept']);

  let authenticationInFlight = false;

  function readSession() {
    let token = '';
    let expiresAt = 0;
    try {
      token = String(localStorage.getItem(TOKEN_KEY) || '').trim();
      expiresAt = Number(localStorage.getItem(EXPIRY_KEY) || 0);
    } catch (_) {
      return null;
    }

    if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearSession(false);
      return null;
    }

    return { token, expiresAt };
  }

  function storeSession(token, expiresAt) {
    const cleanToken = String(token || '').trim();
    const expiry = Number(expiresAt || 0);
    if (!cleanToken || !Number.isFinite(expiry) || expiry <= Date.now()) return false;

    try {
      localStorage.setItem(TOKEN_KEY, cleanToken);
      localStorage.setItem(EXPIRY_KEY, String(expiry));
    } catch (_) {
      return false;
    }

    const pin = document.getElementById('acceptPin');
    if (pin) pin.value = '';
    syncAuthUi();
    return true;
  }

  function clearSession(sync = true) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch (_) {}
    if (sync) syncAuthUi();
  }

  function ensureAuthStatus() {
    const pinSection = document.getElementById('acceptPinSection');
    if (!pinSection) return null;

    let status = document.getElementById(AUTH_STATUS_ID);
    if (status) return status;

    status = document.createElement('div');
    status.id = AUTH_STATUS_ID;
    status.className = 'accept-section hidden';
    status.innerHTML = `
      <div class="label">BOARD ACCESS</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:7px;padding:10px;border:1px solid var(--ok);border-radius:3px;background:rgba(63,86,51,.18)">
        <span style="color:#bdd2aa;font-weight:800;letter-spacing:.06em">BOARD ACCESS // AUTHENTICATED</span>
        <button id="${LOCK_BUTTON_ID}" class="accept-action secondary" type="button" style="margin:0;padding:7px 10px">LOCK TERMINAL</button>
      </div>
    `;
    pinSection.insertAdjacentElement('afterend', status);

    status.querySelector('#' + LOCK_BUTTON_ID)?.addEventListener('click', () => {
      clearSession(true);
      const pin = document.getElementById('acceptPin');
      if (pin) pin.focus();
    });

    return status;
  }

  function syncAuthUi() {
    const pinSection = document.getElementById('acceptPinSection');
    const status = ensureAuthStatus();
    if (!pinSection || !status) return;

    const session = readSession();
    if (session) {
      pinSection.classList.add('hidden');
      status.classList.remove('hidden');
    } else {
      pinSection.classList.remove('hidden');
      status.classList.add('hidden');
    }
  }

  function authenticationError(payload) {
    const text = String(payload?.error || payload?.message || '').toLowerCase();
    return text.includes('board authentication required') ||
      text.includes('invalid board access code');
  }

  function exchangePinForSession(pin) {
    const cleanPin = String(pin || '');
    if (!cleanPin || authenticationInFlight) return;
    authenticationInFlight = true;

    const callbackName = '__mothershipBoardAuth_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    let timeout = null;

    function cleanup() {
      if (timeout) clearTimeout(timeout);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      script.remove();
      authenticationInFlight = false;
    }

    window[callbackName] = payload => {
      const token = String(payload?.sessionToken || '').trim();
      const expiresAt = Number(payload?.expiresAtMs || 0);
      const valid = payload && payload.ok === true && payload.authenticated === true && token && expiresAt > Date.now();
      cleanup();
      if (valid) storeSession(token, expiresAt);
    };

    script.onerror = cleanup;
    script.src = CONTRACT_SERVICE_URL +
      '?action=authenticate' +
      '&pin=' + encodeURIComponent(cleanPin) +
      '&callback=' + encodeURIComponent(callbackName) +
      '&_=' + Date.now();

    timeout = setTimeout(cleanup, 8000);
    document.head.appendChild(script);
  }

  function wrapPrivilegedJsonp(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;

    let url;
    try { url = new URL(script.src, location.href); } catch (_) { return; }

    const action = String(url.searchParams.get('action') || '').trim().toLowerCase();
    if (!PRIVILEGED_ACTIONS.has(action)) return;

    const callbackName = url.searchParams.get('callback');
    if (!callbackName) return;

    const session = readSession();
    const submittedPin = String(url.searchParams.get('pin') || '');

    if (session) {
      url.searchParams.set('session', session.token);
      url.searchParams.delete('pin');
      script.src = url.href;
    }

    const original = window[callbackName];
    if (typeof original !== 'function' || original.__boardAuthSessionWrapped) return;

    const wrapped = payload => {
      original(payload);

      if (session && authenticationError(payload)) {
        clearSession(true);
        setTimeout(() => {
          const result = document.getElementById('acceptResult');
          if (result) {
            result.textContent = 'SESSION EXPIRED // ENTER BOARD ACCESS CODE';
            result.className = 'accept-result warn';
            result.classList.remove('hidden');
          }
        }, 0);
        return;
      }

      // Any normal privileged response proves that the submitted PIN passed
      // server validation. Exchange it once for the 24-hour opaque token.
      if (!session && submittedPin && payload && payload.ok === true) {
        exchangePinForSession(submittedPin);
      }
    };

    wrapped.__boardAuthSessionWrapped = true;
    window[callbackName] = wrapped;
  }

  function installJsonpInterceptor() {
    const previousAppendChild = Node.prototype.appendChild;
    if (previousAppendChild.__boardAuthSessionPresentationWrapped) return;

    function patchedAppendChild(node) {
      wrapPrivilegedJsonp(node);
      return previousAppendChild.call(this, node);
    }

    patchedAppendChild.__boardAuthSessionPresentationWrapped = true;
    Node.prototype.appendChild = patchedAppendChild;
  }

  function installUiSync() {
    ensureAuthStatus();
    syncAuthUi();

    const modal = document.getElementById('acceptModal');
    if (modal) {
      const observer = new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) queueMicrotask(syncAuthUi);
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    document.addEventListener('click', event => {
      if (event.target.closest('[data-accept-job]')) setTimeout(syncAuthUi, 0);
    }, true);
  }

  installJsonpInterceptor();
  installUiSync();
})();
