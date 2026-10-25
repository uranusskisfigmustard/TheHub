(() => {
  'use strict';

  const BUILD = '20261018-threshold1';

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
    const cassidy = root.querySelector('[data-statement-character="cassidy"]');
    const printButton = root.querySelector('[data-statement-print]');
    const refresh = root.querySelector('[data-statement-refresh]');

    if (!view || !status || !who || !john || !prue || !cassidy || !printButton || !refresh) {
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
      cassidy.classList.toggle('active', selected === 'cassidy');
      john.setAttribute('aria-pressed', selected === 'john' ? 'true' : 'false');
      prue.setAttribute('aria-pressed', selected === 'prue' ? 'true' : 'false');
      cassidy.setAttribute('aria-pressed', selected === 'cassidy' ? 'true' : 'false');

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

    function normalizeThreshold(statementText) {
      const text = String(statementText || '');
      const principalMatch = text.match(/^PRINCIPAL:\s*([\d,]+(?:\.\d+)?)\s+CR$/m);
      const nextMatch = text.match(/^NEXT:\s+(12,000\.0|6,000\.0) CR \/ [\d,]+(?:\.\d+)? CR TO THRESHOLD$/m);
      if (!principalMatch || !nextMatch) return text;

      const principal = Number(principalMatch[1].replaceAll(',', ''));
      if (!Number.isFinite(principal) || principal <= 6000) return text;

      const threshold = principal > 12000 ? 12000 : 6000;
      const corrected = `NEXT:      ${threshold.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} CR / ${(principal - threshold).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} CR TO THRESHOLD`;
      return text.replace(/^NEXT:.*$/m, corrected);
    }

    function normalizePayload(payload) {
      if (!payload || payload.ok !== true) {
        throw new Error(payload?.error || 'Statement feed error.');
      }

      const data = {};

      (Array.isArray(payload.statements) ? payload.statements : []).forEach(item => {
        const rawKey = String(item?.key || '').trim().toLowerCase();
        // Older statement-generator exports may still use the full-name slug.
        const key = rawKey === 'cassidy-wright' ? 'cassidy' : rawKey;
        if (key !== 'john' && key !== 'prue' && key !== 'cassidy') return;

        data[key] = {
          key,
          character: String(item?.character || ''),
          asOf: String(item?.asOf || ''),
          statementText: key === 'john' || key === 'prue'
            ? normalizeThreshold(item?.statementText)
            : String(item?.statementText || '')
        };
      });

      if (!data.john && !data.prue && !data.cassidy) {
        throw new Error('Statement feed returned no player rows.');
      }

      if (!data.cassidy) {
        data.cassidy = {
          key: 'cassidy',
          character: 'CASSIDY WRIGHT',
          asOf: '2237-283',
          statementText: '== HUB CLAIMS REGISTRY / RECOVERY DEBT ==\n\nSUBJECT: CASSIDY WRIGHT\nACCOUNT STATUS: STATEMENT REFRESH PENDING\n\nA provisional opening principal of 0cr and an M5 local settlement have been recorded. Cassidy’s separate financial agreement remains undecided. The detailed live statement will appear after the private statement service is updated and regenerated.'
        };
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

    cassidy.addEventListener('click', () => {
      selected = 'cassidy';
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
