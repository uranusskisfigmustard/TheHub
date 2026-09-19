(() => {
  'use strict';

  const BUILD = '20260919-contract-submissions-prod-1';
  const POST_SOURCE = 'mothership-contract-service-post';
  const MAX_CHARS = 2000;

  function createPostRequest(api) {
    return function postRequest(action, params = {}, timeoutMs = 18000) {
      return new Promise((resolve, reject) => {
        const requestId = `contract-submit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const iframe = document.createElement('iframe');
        const form = document.createElement('form');
        const frameName = `contractSubmit_${requestId.replace(/[^A-Za-z0-9_]/g, '_')}`;
        let settled = false;

        iframe.name = frameName;
        iframe.hidden = true;
        form.method = 'POST';
        form.action = api;
        form.target = frameName;
        form.hidden = true;

        Object.entries({ action, requestId, ...params }).forEach(([name, value]) => {
          if (value === undefined || value === null) return;
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        });

        const finish = (error, payload) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          form.remove();
          iframe.remove();
          error ? reject(error) : resolve(payload || {});
        };

        function onMessage(event) {
          const data = event.data;
          if (!data || data.source !== POST_SOURCE || data.requestId !== requestId) return;
          finish(null, data.payload);
        }

        window.addEventListener('message', onMessage);
        document.body.append(iframe, form);
        const timer = setTimeout(() => finish(new Error('Contract service timed out.')), timeoutMs);
        try { form.submit(); } catch (error) { finish(error); }
      });
    };
  }

  function authenticationError(value) {
    const text = String(value?.error || value?.message || value || '').toLowerCase();
    return text.includes('board authentication required') ||
      text.includes('invalid board access code') ||
      text.includes('invalid board session') ||
      text.includes('expired board session') ||
      text.includes('session expired') ||
      text.includes('authentication required');
  }

  function attach(root, records, options = {}) {
    const api = String(options.api || '').trim();
    const sessionKey = String(options.sessionKey || 'mothership_hub_board_session_v1');
    const expiryKey = String(options.sessionExpiryKey || 'mothership_hub_board_session_expiry_v1');
    if (!root || !api) return;

    const postRequest = createPostRequest(api);
    let pendingAuthResolve = null;

    let auth = root.querySelector('[data-contract-auth]');
    if (!auth) {
      auth = document.createElement('div');
      auth.className = 'contract-auth hidden';
      auth.dataset.contractAuth = '';
      auth.innerHTML = `
        <div class="contract-auth-dialog" role="dialog" aria-modal="true">
          <div class="contract-auth-kicker">THE HUB // CONTRACTING SYSTEM</div>
          <h2>Mission Request Authorization</h2>
          <label>REQUEST CODE
            <input data-contract-auth-pin type="password" autocomplete="off" placeholder="Enter request code">
          </label>
          <div class="contract-auth-result hidden" data-contract-auth-result aria-live="polite"></div>
          <div class="contract-auth-actions">
            <button type="button" class="primary" data-contract-auth-submit>AUTHORIZE REQUEST</button>
            <button type="button" data-contract-auth-cancel>CANCEL REQUEST</button>
          </div>
        </div>`;
      root.appendChild(auth);
    }

    const pin = auth.querySelector('[data-contract-auth-pin]');
    const result = auth.querySelector('[data-contract-auth-result]');
    const submitAuth = auth.querySelector('[data-contract-auth-submit]');
    const cancelAuth = auth.querySelector('[data-contract-auth-cancel]');

    function clearSession() {
      try {
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(expiryKey);
      } catch (_) {}
    }

    function readSession() {
      try {
        const token = String(localStorage.getItem(sessionKey) || '').trim();
        const expiresAt = Number(localStorage.getItem(expiryKey) || 0);
        if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now() + 5000) {
          clearSession();
          return null;
        }
        return { token, expiresAt };
      } catch (_) {
        return null;
      }
    }

    function storeSession(token, expiresAt) {
      try {
        if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
        localStorage.setItem(sessionKey, token);
        localStorage.setItem(expiryKey, String(expiresAt));
        return true;
      } catch (_) {
        return false;
      }
    }

    function closeAuth(token = '') {
      auth.classList.add('hidden');
      document.body.classList.remove('contract-modal-open');
      pin.value = '';
      result.textContent = '';
      result.classList.add('hidden');
      const resolve = pendingAuthResolve;
      pendingAuthResolve = null;
      if (resolve) resolve(String(token || '').trim());
    }

    function requestSession(message = '') {
      const current = readSession();
      if (current) return Promise.resolve(current.token);
      result.textContent = message;
      result.classList.toggle('hidden', !message);
      auth.classList.remove('hidden');
      document.body.classList.add('contract-modal-open');
      setTimeout(() => pin.focus(), 0);
      return new Promise(resolve => { pendingAuthResolve = resolve; });
    }

    async function authenticate() {
      const code = pin.value.trim();
      if (!code) {
        result.textContent = 'ENTER REQUEST CODE.';
        result.classList.remove('hidden');
        return;
      }

      pin.disabled = submitAuth.disabled = cancelAuth.disabled = true;
      submitAuth.textContent = 'AUTHORIZING…';
      try {
        const payload = await postRequest('authenticate', { pin: code }, 12000);
        const token = String(payload?.sessionToken || '').trim();
        const expiresAt = Number(payload?.expiresAtMs || 0);
        if (!payload?.ok || !payload?.authenticated || !token || expiresAt <= Date.now()) {
          throw new Error(payload?.message || payload?.error || 'REQUEST CODE DENIED');
        }
        if (!storeSession(token, expiresAt)) throw new Error('Board session could not be stored.');
        closeAuth(token);
      } catch (error) {
        pin.value = '';
        result.textContent = String(error?.message || error || 'REQUEST CODE DENIED').toUpperCase();
        result.classList.remove('hidden');
        pin.focus();
      } finally {
        pin.disabled = submitAuth.disabled = cancelAuth.disabled = false;
        submitAuth.textContent = 'AUTHORIZE REQUEST';
      }
    }

    async function send(record, text) {
      let token = await requestSession();
      if (!token) return { cancelled: true };

      let response = await postRequest('contractsubmit', {
        session: token,
        job: String(record.jobId || ''),
        contract: String(record.contractId || ''),
        text
      });

      if (authenticationError(response)) {
        clearSession();
        token = await requestSession('SESSION EXPIRED // ENTER REQUEST CODE');
        if (!token) return { cancelled: true };
        response = await postRequest('contractsubmit', {
          session: token,
          job: String(record.jobId || ''),
          contract: String(record.contractId || ''),
          text
        });
      }
      return response;
    }

    submitAuth.onclick = authenticate;
    pin.onkeydown = event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        authenticate();
      }
    };
    cancelAuth.onclick = () => closeAuth('');

    for (const record of records) {
      const key = String(record.contractId || record.jobId || '').trim();
      const box = [...root.querySelectorAll('[data-contract-submission]')]
        .find(node => node.dataset.contractSubmission === key);
      if (!box) continue;

      const textarea = box.querySelector('textarea');
      const count = box.querySelector('[data-count]');
      const submitButton = box.querySelector('button');
      const submitResult = box.querySelector('[data-result]');

      textarea.oninput = () => {
        count.textContent = `${textarea.value.length} / ${MAX_CHARS}`;
        submitResult.textContent = '';
        submitResult.dataset.state = '';
      };

      submitButton.onclick = async () => {
        const text = textarea.value.trim();
        submitResult.textContent = '';
        submitResult.dataset.state = '';
        if (!text) {
          submitResult.textContent = 'ENTER AN ACTION BEFORE SUBMITTING.';
          submitResult.dataset.state = 'error';
          return;
        }

        submitButton.disabled = textarea.disabled = true;
        submitButton.textContent = readSession() ? 'SUBMITTING…' : 'AUTHENTICATING…';
        try {
          const response = await send(record, text);
          if (response?.cancelled) {
            submitResult.textContent = 'SUBMISSION NOT SENT // AUTHORIZATION CANCELLED.';
            submitResult.dataset.state = 'error';
          } else if (!response?.ok || !response?.submitted) {
            throw new Error(response?.error || response?.message || 'Submission was not accepted.');
          } else {
            textarea.value = '';
            count.textContent = `0 / ${MAX_CHARS}`;
            submitResult.textContent = 'SUBMITTED TO WARDEN' +
              (response.campaignDate ? ` // ${response.campaignDate}` : '');
            submitResult.dataset.state = 'ok';
          }
        } catch (error) {
          submitResult.textContent = String(error?.message || error || 'Submission failed.').toUpperCase();
          submitResult.dataset.state = 'error';
        } finally {
          submitButton.disabled = textarea.disabled = false;
          submitButton.textContent = 'SUBMIT TO WARDEN';
        }
      };
    }
  }

  window.HubContractSubmissions = Object.freeze({ build: BUILD, attach });
})();
