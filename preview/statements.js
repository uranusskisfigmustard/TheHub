(() => {
  'use strict';

  const BUILD = '20260919-statements-preview-3';
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  function render(root, options = {}) {
    if (!root) throw new Error('Statements root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const api = String(options.api || '').trim();
    const cacheKey = String(options.cacheKey || '').trim();
    const legacyCacheKeys = Array.isArray(options.legacyCacheKeys) ? options.legacyCacheKeys : [];
    if (!api) throw new Error('Statements API endpoint is unavailable.');
    if (!cacheKey) throw new Error('Statements cache key is unavailable.');

    const view = root.querySelector('[data-statement-view]');
    const status = root.querySelector('[data-statement-status]');
    const who = root.querySelector('[data-statement-who]');
    const diagnostic = root.querySelector('[data-statement-diagnostic]');
    const john = root.querySelector('[data-statement-character="john"]');
    const prue = root.querySelector('[data-statement-character="prue"]');
    const printButton = root.querySelector('[data-statement-print]');
    const refresh = root.querySelector('[data-statement-refresh]');

    if (!view || !status || !who || !diagnostic || !john || !prue || !printButton || !refresh) {
      throw new Error('Statements page controls are incomplete.');
    }

    function setDiagnostic(message, state = '') {
      diagnostic.textContent = `${BUILD} // ${message}`;
      diagnostic.dataset.state = state;
    }

    for (const key of legacyCacheKeys) {
      try { localStorage.removeItem(key); } catch (_) {}
    }

    let rows = {};
    let selected = 'prue';
    let loadState = '';
    let requestSerial = 0;
    let requestTimer = null;
    let requestController = null;
    let activeJsonpCallback = null;

    function renderView() {
      const row = rows[selected];
      john.classList.toggle('active', selected === 'john');
      prue.classList.toggle('active', selected === 'prue');
      john.setAttribute('aria-pressed', selected === 'john' ? 'true' : 'false');
      prue.setAttribute('aria-pressed', selected === 'prue' ? 'true' : 'false');

      if (!row) {
        view.innerHTML = '<div class="statement-error">Statement information unavailable.</div>';
        who.textContent = '';
        if (!loadState) status.textContent = 'STATEMENT INFORMATION UNAVAILABLE';
        return;
      }

      status.textContent = `${loadState ? loadState + ' // ' : ''}AS OF ${row.asOf || '—'}`;
      who.textContent = row.character || '';
      view.innerHTML = `<article class="statement-sheet"><pre>${esc(row.statementText || '')}</pre></article>`;
    }

    function setRefreshBusy(busy) {
      refresh.disabled = busy;
      refresh.textContent = busy ? 'REFRESHING…' : 'REFRESH';
    }

    function cacheRows(data) {
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) {}
    }

    function clearTimer() {
      if (requestTimer) {
        clearTimeout(requestTimer);
        requestTimer = null;
      }
    }

    function removeJsonpScripts() {
      document.querySelectorAll('script[data-statement-query]').forEach(node => node.remove());
    }

    function clearJsonpCallback() {
      if (!activeJsonpCallback) return;
      try { delete window[activeJsonpCallback]; } catch (_) { window[activeJsonpCallback] = undefined; }
      activeJsonpCallback = null;
    }

    function cancelActiveRequest() {
      clearTimer();
      if (requestController) {
        try { requestController.abort(); } catch (_) {}
        requestController = null;
      }
      clearJsonpCallback();
      removeJsonpScripts();
    }

    function use(data, label, serial, transport) {
      if (serial !== requestSerial) return;
      cancelActiveRequest();
      rows = data;
      loadState = label;
      cacheRows(data);
      setRefreshBusy(false);
      setDiagnostic(`${transport} SUCCEEDED`, 'ok');
      renderView();
    }

    function fallback(reason, serial) {
      if (serial !== requestSerial) return;
      cancelActiveRequest();
      setRefreshBusy(false);
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (Object.keys(cached).length) {
          rows = cached;
          loadState = 'CACHED / STALE // ' + reason;
          setDiagnostic(`LIVE REQUESTS FAILED; USING PREVIEW CACHE // ${reason}`, 'warn');
          renderView();
          return;
        }
      } catch (_) {}
      rows = {};
      loadState = 'STATEMENT INFORMATION UNAVAILABLE // ' + reason;
      setDiagnostic(`LIVE REQUESTS FAILED; NO PREVIEW CACHE // ${reason}`, 'error');
      renderView();
    }

    function normalizeResponse(resp, transportLabel, serial, transportName) {
      if (serial !== requestSerial) return;
      if (!resp || resp.ok !== true) throw new Error(resp?.error || 'Statement service error.');

      const list = Array.isArray(resp.statements) ? resp.statements : [];
      const data = {};
      list.forEach(item => {
        const key = String(item?.key || '').trim().toLowerCase();
        if (!key) return;
        data[key] = {
          key,
          character: String(item?.character || ''),
          asOf: String(item?.asOf || ''),
          statementText: String(item?.statementText || '')
        };
      });

      if (!Object.keys(data).length) throw new Error('Statement service returned no rows.');
      use(
        data,
        `${transportLabel} // LOADED ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        serial,
        transportName
      );
    }

    function requestJsonp(serial, directFailureReason) {
      if (serial !== requestSerial) return;
      clearTimer();
      requestController = null;
      removeJsonpScripts();
      clearJsonpCallback();
      status.textContent = 'RETRYING STATEMENTS IN COMPATIBILITY MODE…';
      setDiagnostic(`DIRECT FAILED: ${directFailureReason} // COMPATIBILITY STARTING`, 'warn');

      const now = Date.now();
      const callback = '__hubStatements_' + now + '_' + serial;
      activeJsonpCallback = callback;

      window[callback] = function receiveStatements(resp) {
        try {
          normalizeResponse(resp, 'LIVE / COMPATIBILITY', serial, 'COMPATIBILITY');
        } catch (error) {
          fallback(`COMPATIBILITY RESPONSE ERROR: ${error.message}`, serial);
        }
      };

      const script = document.createElement('script');
      script.dataset.statementQuery = 'true';
      script.src = api + '?' + new URLSearchParams({ action: 'statements', callback, ts: now });
      script.referrerPolicy = 'no-referrer';
      script.onerror = () => {
        fallback(`DIRECT FAILED: ${directFailureReason}; COMPATIBILITY SCRIPT BLOCKED`, serial);
      };
      document.body.appendChild(script);

      requestTimer = setTimeout(() => {
        fallback(`DIRECT FAILED: ${directFailureReason}; COMPATIBILITY TIMED OUT`, serial);
      }, 18000);
    }

    async function requestDirect(serial) {
      if (serial !== requestSerial) return;
      const controller = new AbortController();
      requestController = controller;
      const timeout = setTimeout(() => controller.abort(), 7000);
      setDiagnostic('DIRECT REQUEST STARTING', 'working');

      try {
        const url = api + '?' + new URLSearchParams({ action: 'statements', ts: Date.now() });
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'follow',
          signal: controller.signal,
          headers: { Accept: 'application/json, text/plain, */*' }
        });
        if (serial !== requestSerial) return;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch (_) {
          throw new Error('direct response was not JSON');
        }
        normalizeResponse(payload, 'LIVE / DIRECT', serial, 'DIRECT');
      } catch (error) {
        if (serial !== requestSerial) return;
        const reason = error?.name === 'AbortError' ? 'request timed out' : String(error?.message || 'request failed');
        requestJsonp(serial, reason);
      } finally {
        clearTimeout(timeout);
        if (requestController === controller) requestController = null;
      }
    }

    function load() {
      const serial = ++requestSerial;
      cancelActiveRequest();
      setRefreshBusy(true);
      status.textContent = 'REFRESHING STATEMENTS…';
      setDiagnostic('LOAD REQUESTED', 'working');
      requestDirect(serial);
    }

    john.addEventListener('click', () => {
      selected = 'john';
      renderView();
    });
    prue.addEventListener('click', () => {
      selected = 'prue';
      renderView();
    });
    printButton.addEventListener('click', () => window.print());
    refresh.addEventListener('click', load);

    root.dataset.rendered = 'true';
    load();
  }

  window.HubStatementsContent = Object.freeze({ build: BUILD, render });
})();
