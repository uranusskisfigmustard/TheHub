(() => {
  'use strict';
  const view = document.querySelector('[data-business-view]');
  const status = document.querySelector('[data-business-status]');
  const refresh = document.querySelector('[data-business-refresh]');
  const api = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  let displayed = null;
  let generation = 0;
  function valid(row) {
    return row && row.key === 'business' && /^\d{4}-\d{3}$/.test(row.asOf || '') && typeof row.statementText === 'string' && row.statementText.trim();
  }
  function show(row, label) {
    if (!valid(row) || (displayed && row.asOf < displayed.asOf)) return false;
    displayed = row;
    status.textContent = label + ' // AS OF ' + row.asOf;
    const article = document.createElement('article'); article.className = 'statement-sheet';
    const pre = document.createElement('pre'); pre.textContent = row.statementText.replace(/^\u200b/, '');
    article.appendChild(pre); view.replaceChildren(article);
    return true;
  }
  function loadLive(serial) {
    return new Promise(resolve => {
      const callback = '__hubBusiness_' + Date.now() + '_' + serial;
      const script = document.createElement('script');
      let done = false;
      const finish = payload => {
        if (done) return; done = true; clearTimeout(timer); script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        if (serial === generation && payload && payload.ok === true && Array.isArray(payload.statements)) {
          const row = payload.statements.find(item => item && item.key === 'business');
          if (row) show(row, 'LIVE');
        }
        resolve();
      };
      window[callback] = finish;
      script.src = api + '?' + new URLSearchParams({action:'statements', callback, ts:Date.now()});
      script.referrerPolicy = 'no-referrer'; script.onerror = () => finish(null);
      const timer = setTimeout(() => finish(null), 12000);
      document.body.appendChild(script);
    });
  }
  async function load() {
    const serial = ++generation; refresh.disabled = true;
    if (!displayed) status.textContent = 'LOADING BUSINESS STATEMENT…';
    try {
      const response = await fetch('./data/business-statement.json?ts=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw new Error('Snapshot unavailable');
      const data = await response.json();
      if (serial === generation && data.ok === true) show(data.statement, 'SNAPSHOT / MAY BE STALE');
    } catch (_) { if (serial === generation && !displayed) status.textContent = 'STATEMENT UNAVAILABLE'; }
    await loadLive(serial);
    if (serial === generation) refresh.disabled = false;
  }
  refresh.addEventListener('click', load);
  document.querySelector('[data-business-print]').addEventListener('click', () => window.print());
  load();
})();
