(() => {
  'use strict';

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
    let requestTimer = null;

    function renderView() {
      const row = rows[selected];
      john.classList.toggle('active', selected === 'john');
      prue.classList.toggle('active', selected === 'prue');
      john.setAttribute('aria-pressed', selected === 'john' ? 'true' : 'false');
      prue.setAttribute('aria-pressed', selected === 'prue' ? 'true' : 'false');

      if (!row) {
        view.innerHTML = '<div class="statement-error">Statement data unavailable.</div>';
        who.textContent = '';
        if (!loadState) status.textContent = 'STATEMENT DATA UNAVAILABLE';
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

    function use(data, label, serial) {
      if (serial !== requestSerial) return;
      if (requestTimer) {
        clearTimeout(requestTimer);
        requestTimer = null;
      }
      rows = data;
      loadState = label;
      cacheRows(data);
      setRefreshBusy(false);
      renderView();
    }

    function fallback(reason, serial) {
      if (serial !== requestSerial) return;
      if (requestTimer) {
        clearTimeout(requestTimer);
        requestTimer = null;
      }
      setRefreshBusy(false);
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (Object.keys(cached).length) {
          rows = cached;
          loadState = 'CACHED / STALE // ' + reason;
          renderView();
          return;
        }
      } catch (_) {}
      rows = {};
      loadState = 'STATEMENT DATA UNAVAILABLE // ' + reason;
      renderView();
    }

    function load() {
      const serial = ++requestSerial;
      const now = Date.now();
      const callback = '__hubStatements_' + now + '_' + serial;
      const scriptId = 'statementQuery_' + serial;

      setRefreshBusy(true);
      status.textContent = 'REFRESHING STATEMENTS…';
      root.querySelectorAll('script[data-statement-query]').forEach(node => node.remove());
      if (requestTimer) clearTimeout(requestTimer);

      window[callback] = function receiveStatements(resp) {
        try {
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
          use(data, 'LIVE // LOADED ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), serial);
        } catch (error) {
          fallback(error.message, serial);
        } finally {
          try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        }
      };

      const script = document.createElement('script');
      script.id = scriptId;
      script.dataset.statementQuery = 'true';
      script.src = api + '?' + new URLSearchParams({ action: 'statements', callback, _: now });
      script.onerror = () => {
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        fallback('Network or Hub service error.', serial);
      };
      document.body.appendChild(script);

      requestTimer = setTimeout(() => {
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        fallback('Statement request timed out.', serial);
      }, 25000);
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

  window.HubStatementsContent = Object.freeze({ render });
})();
