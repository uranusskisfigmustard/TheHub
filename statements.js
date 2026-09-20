(() => {
  'use strict';

  const BUILD = '20260920-statements-fast1';

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  function render(root, options = {}) {
    if (!root) throw new Error('Statements root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const api = String(options.api || '').trim();
    const snapshotUrl = String(options.snapshotUrl || '').trim();
    const cacheKey = String(options.cacheKey || '').trim();
    const legacyCacheKeys = Array.isArray(options.legacyCacheKeys) ? options.legacyCacheKeys : [];

    if (!api) throw new Error('Statements API endpoint is unavailable.');
    if (!snapshotUrl) throw new Error('Statements snapshot URL is unavailable.');
    if (!cacheKey) throw new Error('Statements cache key is unavailable.');

    const view = root.querySelector('[data-statement-view]');
    const status = root.querySelector('[data-statement-status]');
    const who = root.querySelector('[data-statement-who]');
    const john = root.querySelector('[data-statement-character="john"]');
    const prue = root.querySelector('[data-statement-character="prue"]');
    const printButton = root.querySelector('[data-statement-print]');
    const refresh = root.querySelector('[data-statement-refresh]');

    if (!view || !status || !who || !john || !prue || !printButton || !refresh) {
      throw new Error('Statements page controls are incomplete.');
    }

    for (const key of legacyCacheKeys) {
      try { localStorage.removeItem(key); } catch (_) {}
    }

    let rows = {};
    let selected = 'prue';
    let loadState = '';
    let requestSerial = 0;
    let liveTimer = null;
    let snapshotController = null;
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

    function normalizePayload(payload) {
      if (!payload || payload.ok !== true) {
        throw new Error(payload?.error || 'Statement feed error.');
      }

      const data = {};

      (Array.isArray(payload.statements) ? payload.statements : []).forEach(item => {
        const key = String(item?.key || '').trim().toLowerCase();
        if (key !== 'john' && key !== 'prue') return;

        data[key] = {
          key,
          character: String(item?.character || ''),
          asOf: String(item?.asOf || ''),
          statementText: String(item?.statementText || '')
        };
      });

      if (!data.john && !data.prue) {
        throw new Error('Statement feed returned no player rows.');
      }

      return data;
    }

    function show(data, label, serial, cache = true) {
      if (serial !== requestSerial) return false;

      rows = data;
      loadState = label;

      if (cache) cacheRows(data);
      renderView();
      return true;
    }

    function clearLiveRequest() {
      if (liveTimer) {
        clearTimeout(liveTimer);
        liveTimer = null;
      }

      document.querySelectorAll('script[data-statement-query]').forEach(node => node.remove());

      if (activeJsonpCallback) {
        try {
          delete window[activeJsonpCallback];
        } catch (_) {
          window[activeJsonpCallback] = undefined;
        }
        activeJsonpCallback = null;
      }
    }

    function cancelAll() {
      clearLiveRequest();

      if (snapshotController) {
        try { snapshotController.abort(); } catch (_) {}
        snapshotController = null;
      }
    }

    function useLocalCache(serial) {
      if (serial !== requestSerial || Object.keys(rows).length) return false;

      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (cached && Object.keys(cached).length) {
          show(cached, 'CACHED / STALE', serial, false);
          return true;
        }
      } catch (_) {}

      return false;
    }

    function finishLiveFailure(serial) {
      if (serial !== requestSerial) return;

      clearLiveRequest();
      setRefreshBusy(false);

      if (Object.keys(rows).length) {
        renderView();
        return;
      }

      if (useLocalCache(serial)) return;

      loadState = '';
      status.textContent = 'STATEMENT INFORMATION UNAVAILABLE';
      renderView();
    }

    function requestLive(serial) {
      if (serial !== requestSerial) return;

      clearLiveRequest();

      const now = Date.now();
      const callback = '__hubStatements_' + now + '_' + serial;
      activeJsonpCallback = callback;

      window[callback] = function receiveStatements(payload) {
        try {
          const data = normalizePayload(payload);
          show(data, 'LIVE', serial, true);
          clearLiveRequest();
          setRefreshBusy(false);
        } catch (_) {
          finishLiveFailure(serial);
        }
      };

      const script = document.createElement('script');
      script.dataset.statementQuery = 'true';
      script.src = api + '?' + new URLSearchParams({
        action: 'statements',
        callback,
        ts: now
      });
      script.referrerPolicy = 'no-referrer';
      script.onerror = () => finishLiveFailure(serial);
      document.body.appendChild(script);

      liveTimer = setTimeout(() => finishLiveFailure(serial), 12000);
    }

    async function loadSnapshot(serial) {
      const controller = new AbortController();
      snapshotController = controller;
      const timeout = setTimeout(() => controller.abort(), 7000);

      try {
        const separator = snapshotUrl.includes('?') ? '&' : '?';
        const response = await fetch(snapshotUrl + separator + 'ts=' + Date.now(), {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });

        if (serial !== requestSerial) return;
        if (!response.ok) throw new Error('HTTP ' + response.status);

        const data = normalizePayload(await response.json());
        show(data, 'SYNCED', serial, true);
      } catch (_) {
        if (serial !== requestSerial) return;
        useLocalCache(serial);
      } finally {
        clearTimeout(timeout);
        if (snapshotController === controller) snapshotController = null;
      }

      requestLive(serial);
    }

    function load() {
      const serial = ++requestSerial;

      cancelAll();
      const showedCache = useLocalCache(serial);
      setRefreshBusy(true);
      if (!showedCache) status.textContent = 'REFRESHING STATEMENTS…';
      loadSnapshot(serial);
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

  window.HubStatementsContent = Object.freeze({
    build: BUILD,
    render
  });
})();
