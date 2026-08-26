(() => {
  'use strict';

  const CONTRACT_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const TOKEN_KEY = 'mothership_hub_board_session_v1';
  const EXPIRY_KEY = 'mothership_hub_board_session_expiry_v1';
  const GATE_ID = 'boardAccessGate';
  const STATUS_ID = 'boardAccessHeaderStatus';
  const LOCK_ID = 'boardAccessLock';
  const PRIVILEGED_ACTIONS = new Set(['validate', 'authorize', 'accept']);

  let authenticationInFlight = false;

  function removeStoredSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch (_) {}
  }

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
      removeStoredSession();
      return null;
    }
    return { token, expiresAt };
  }

  function contractsActive() {
    const jobsTab = document.getElementById('jobsTab');
    return Boolean(jobsTab && jobsTab.classList.contains('active'));
  }

  function ensureAcceptancePinHidden() {
    const styleId = 'boardAuthAcceptancePinOverride';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = '#acceptPinSection{display:none!important}';
      document.head.appendChild(style);
    }
    const pin = document.getElementById('acceptPin');
    if (pin) pin.value = '';
  }

  function ensureHeaderStatus() {
    let status = document.getElementById(STATUS_ID);
    if (status) return status;

    const host = document.querySelector('.status-tools') || document.querySelector('.statusbar');
    if (!host) return null;

    status = document.createElement('span');
    status.id = STATUS_ID;
    status.className = 'hidden';
    status.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap';
    status.innerHTML = `
      <span style="color:#bdd2aa;font-weight:800;letter-spacing:.06em">BOARD ACCESS // AUTHENTICATED</span>
      <button id="${LOCK_ID}" type="button" style="font:inherit;font-size:.72rem;font-weight:800;letter-spacing:.05em;color:#d5d0c4;background:transparent;border:1px solid #3a3f43;border-radius:3px;padding:5px 8px;cursor:pointer">LOCK TERMINAL</button>
    `;
    host.appendChild(status);
    status.querySelector('#' + LOCK_ID)?.addEventListener('click', () => clearSession(true));
    return status;
  }

  function ensureGate() {
    let gate = document.getElementById(GATE_ID);
    if (gate) return gate;

    gate = document.createElement('div');
    gate.id = GATE_ID;
    gate.className = 'hidden';
    gate.style.cssText = 'position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(4px)';
    gate.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="Board access authentication" style="width:min(520px,100%);background:#111315;border:1px solid #3a3f43;border-radius:5px;box-shadow:0 24px 60px rgba(0,0,0,.55);padding:22px">
        <div style="font-size:1.12rem;font-weight:800;letter-spacing:.08em">CONTRACT BOARD ACCESS</div>
        <div style="color:#aaa79f;font-size:.78rem;margin-top:3px">THE HUB // CONTRACTING SYSTEM</div>
        <div style="margin-top:20px;color:#aaa79f;font-size:.72rem;letter-spacing:.08em">BOARD ACCESS CODE</div>
        <input id="boardAccessGatePin" type="password" autocomplete="off" placeholder="Enter terminal code" style="width:100%;margin-top:7px;padding:11px;font:inherit;color:#e7e4dc;background:#202428;border:1px solid #3a3f43;border-radius:3px">
        <div id="boardAccessGateResult" class="hidden" style="margin-top:12px;padding:10px;border:1px solid #c86655;background:#15181a;white-space:pre-line"></div>
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px">
          <button id="boardAccessGateSubmit" type="button" style="font:inherit;font-weight:800;letter-spacing:.06em;cursor:pointer;padding:10px 14px;border-radius:3px;border:1px solid #d4a84b;color:#e7e4dc;background:rgba(212,168,75,.12)">AUTHENTICATE</button>
          <button id="boardAccessGateCancel" type="button" style="font:inherit;font-weight:800;letter-spacing:.06em;cursor:pointer;padding:10px 14px;border-radius:3px;border:1px solid #3a3f43;color:#e7e4dc;background:transparent">CLASSIFIEDS</button>
        </div>
      </div>
    `;
    document.body.appendChild(gate);

    const pin = gate.querySelector('#boardAccessGatePin');
    const submit = gate.querySelector('#boardAccessGateSubmit');
    submit?.addEventListener('click', () => exchangePinForSession(pin?.value || ''));
    pin?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        exchangePinForSession(pin.value || '');
      }
    });
    gate.querySelector('#boardAccessGateCancel')?.addEventListener('click', () => {
      document.getElementById('classifiedsTab')?.click();
      hideGate();
    });
    return gate;
  }

  function showGate(message = '') {
    const gate = ensureGate();
    const result = gate.querySelector('#boardAccessGateResult');
    const pin = gate.querySelector('#boardAccessGatePin');
    if (result) {
      result.textContent = message;
      result.classList.toggle('hidden', !message);
    }
    gate.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => pin?.focus(), 0);
  }

  function hideGate() {
    const gate = document.getElementById(GATE_ID);
    gate?.classList.add('hidden');
    const acceptModal = document.getElementById('acceptModal');
    if (!acceptModal || acceptModal.classList.contains('hidden')) document.body.classList.remove('modal-open');
  }

  function syncUi() {
    ensureAcceptancePinHidden();
    const session = readSession();
    const status = ensureHeaderStatus();
    if (status) status.classList.toggle('hidden', !session || !contractsActive());

    if (contractsActive() && !session) showGate();
    else hideGate();
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
    const gatePin = document.getElementById('boardAccessGatePin');
    if (gatePin) gatePin.value = '';
    syncUi();
    return true;
  }

  function clearSession(promptIfContracts = true) {
    removeStoredSession();
    const pin = document.getElementById('acceptPin');
    if (pin) pin.value = '';
    const status = ensureHeaderStatus();
    status?.classList.add('hidden');
    if (promptIfContracts && contractsActive()) showGate();
  }

  function authenticationError(payload) {
    const text = String(payload?.error || payload?.message || '').toLowerCase();
    return text.includes('board authentication required') ||
      text.includes('invalid board access code') ||
      text.includes('invalid board session') ||
      text.includes('expired board session') ||
      text.includes('session expired');
  }

  function setGateBusy(busy) {
    const submit = document.getElementById('boardAccessGateSubmit');
    const pin = document.getElementById('boardAccessGatePin');
    if (submit) {
      submit.disabled = busy;
      submit.textContent = busy ? 'AUTHENTICATING…' : 'AUTHENTICATE';
    }
    if (pin) pin.disabled = busy;
  }

  function exchangePinForSession(pin) {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin || authenticationInFlight) return;
    authenticationInFlight = true;
    setGateBusy(true);

    const callbackName = '__mothershipBoardAuth_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    let timeout = null;

    function cleanup() {
      if (timeout) clearTimeout(timeout);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      script.remove();
      authenticationInFlight = false;
      setGateBusy(false);
    }

    function fail(message) {
      cleanup();
      showGate(message || 'BOARD ACCESS DENIED');
      const pinInput = document.getElementById('boardAccessGatePin');
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }

    window[callbackName] = payload => {
      const token = String(payload?.sessionToken || '').trim();
      const expiresAt = Number(payload?.expiresAtMs || 0);
      const valid = payload && payload.ok === true && payload.authenticated === true && token && expiresAt > Date.now();
      if (!valid) {
        fail(payload?.message || payload?.error || 'BOARD ACCESS DENIED');
        return;
      }
      cleanup();
      storeSession(token, expiresAt);
    };

    script.onerror = () => fail('CONTRACT AUTHENTICATION SERVICE UNAVAILABLE');
    script.src = CONTRACT_SERVICE_URL +
      '?action=authenticate' +
      '&pin=' + encodeURIComponent(cleanPin) +
      '&callback=' + encodeURIComponent(callbackName) +
      '&_=' + Date.now();

    timeout = setTimeout(() => fail('CONTRACT AUTHENTICATION TIMED OUT'), 8000);
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
    if (session) {
      url.searchParams.set('session', session.token);
      url.searchParams.delete('pin');
      script.src = url.href;
    }

    const original = window[callbackName];
    if (typeof original !== 'function' || original.__boardAuthSessionWrapped) return;

    const wrapped = payload => {
      original(payload);
      if (authenticationError(payload)) {
        clearSession(false);
        setTimeout(() => showGate('SESSION EXPIRED // ENTER BOARD ACCESS CODE'), 0);
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

  function installViewGate() {
    ensureGate();
    ensureHeaderStatus();
    ensureAcceptancePinHidden();

    document.getElementById('jobsTab')?.addEventListener('click', () => setTimeout(syncUi, 0));
    document.getElementById('classifiedsTab')?.addEventListener('click', () => setTimeout(syncUi, 0));

    const acceptModal = document.getElementById('acceptModal');
    if (acceptModal) {
      const observer = new MutationObserver(() => {
        if (!acceptModal.classList.contains('hidden')) {
          ensureAcceptancePinHidden();
          if (!readSession()) setTimeout(() => showGate(), 0);
        }
      });
      observer.observe(acceptModal, { attributes: true, attributeFilter: ['class'] });
    }

    setTimeout(syncUi, 0);
  }

  installJsonpInterceptor();
  installViewGate();
})();
