(() => {
  'use strict';

  const BUILD = '20260919-contract-logs-preview-1';
  const POST_SOURCE = 'mothership-contract-service-post';
  const DEFAULT_CACHE_KEY = 'hub-preview:contractfeed-v1';
  const DEFAULT_CACHE_TIME_KEY = 'hub-preview:contractfeed-v1:time';

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const credits = value => {
    const n = Number(value || 0);
    return n.toLocaleString('en-US', {
      minimumFractionDigits: n % 1 ? 2 : 0,
      maximumFractionDigits: 2
    }) + 'cr';
  };

  function cleanLine(value) {
    return String(value || '')
      .replace(/^\s*[-•]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function section(text, heading, nextHeadings) {
    const source = String(text || '');
    const safe = String(heading).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const next = nextHeadings
      .map(value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const re = new RegExp(
      '(?:^|\\n)' + safe + '\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:' + next + ')\\s*(?:\\n|$)|$)',
      'i'
    );
    return source.match(re)?.[1] || '';
  }

  function acceptedDetails(record) {
    const text = String(record?.brief?.text || '');
    const paySection = section(text, 'PAY', [
      'EXPECTED WORK',
      'AUTHORIZED / PROVIDED',
      'ASSIGNMENT LIMITS',
      'KNOWN RISKS',
      'SUCCESSFUL CLOSEOUT'
    ]);
    const workSection = section(text, 'EXPECTED WORK', [
      'AUTHORIZED / PROVIDED',
      'ASSIGNMENT LIMITS',
      'KNOWN RISKS',
      'SUCCESSFUL CLOSEOUT'
    ]);
    const payLines = paySection.split(/\r?\n/).map(cleanLine).filter(Boolean);
    const workLines = workSection.split(/\r?\n/).map(cleanLine).filter(Boolean);
    return {
      payoutStress: cleanLine(record?.payoutStress) || payLines.join(' · '),
      expectedWork: cleanLine(record?.expectedWork) || workLines[0] || ''
    };
  }

  function render(root, options = {}) {
    if (!root) throw new Error('Contract Logs preview root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const api = String(options.api || '').trim();
    const cacheKey = String(options.cacheKey || DEFAULT_CACHE_KEY);
    const cacheTimeKey = String(options.cacheTimeKey || DEFAULT_CACHE_TIME_KEY);
    if (!api) throw new Error('Contract service endpoint is unavailable.');

    let active = [];
    let history = [];
    let busy = false;

    root.innerHTML = `
      <div class="contract-logs-heading">
        <div class="preview-kicker">MIGRATED PAGE PREVIEW</div>
        <h1>Contract Logs</h1>
        <p>Accepted assignments and verified closeout history.</p>
      </div>

      <div class="contract-preview-warning">
        READ-ONLY PREVIEW // PLAYER SUBMISSIONS ARE DISABLED. Contract records are read from the current player-safe service only.
      </div>

      <div class="contract-log-toolbar">
        <div class="contract-log-status" data-contract-status>LOADING CONTRACT RECORD…</div>
        <div class="contract-log-tools">
          <span data-contract-transport>TRANSPORT // CHECKING</span>
          <button type="button" data-contract-refresh>REFRESH</button>
        </div>
      </div>

      <section class="contract-log-section" aria-labelledby="contractActiveTitle">
        <div class="contract-log-section-head">
          <h2 id="contractActiveTitle">Active Contracts</h2>
          <span data-contract-active-count>—</span>
        </div>
        <div class="contract-log-grid" data-contract-active></div>
      </section>

      <section class="contract-log-section" aria-labelledby="contractHistoryTitle">
        <div class="contract-log-section-head">
          <h2 id="contractHistoryTitle">Contract History</h2>
          <span data-contract-history-count>—</span>
        </div>
        <div class="contract-log-grid" data-contract-history></div>
      </section>
    `;

    const statusEl = root.querySelector('[data-contract-status]');
    const transportEl = root.querySelector('[data-contract-transport]');
    const refreshButton = root.querySelector('[data-contract-refresh]');
    const activeCountEl = root.querySelector('[data-contract-active-count]');
    const historyCountEl = root.querySelector('[data-contract-history-count]');
    const activeRoot = root.querySelector('[data-contract-active]');
    const historyRoot = root.querySelector('[data-contract-history]');

    function setStatus(message, state = '') {
      statusEl.textContent = String(message || '');
      statusEl.dataset.state = state;
    }

    function setTransport(label) {
      transportEl.textContent = `TRANSPORT // ${String(label || '—').toUpperCase()}`;
    }

    function setBusy(value) {
      busy = Boolean(value);
      refreshButton.disabled = busy;
    }

    function saveCache(payload) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(payload));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch (_) {}
    }

    function readCache() {
      try {
        const payload = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        const cacheTime = Number(localStorage.getItem(cacheTimeKey) || 0);
        if (!payload || typeof payload !== 'object') return null;
        return { payload, cacheTime };
      } catch (_) {
        return null;
      }
    }

    function postRequest(action, params = {}, timeoutMs = 18000) {
      return new Promise((resolve, reject) => {
        const requestId = `contract-log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const frame = document.createElement('iframe');
        const form = document.createElement('form');
        const frameName = `contractLogPost_${requestId.replace(/[^A-Za-z0-9_]/g, '_')}`;
        let settled = false;
        let timer = null;

        frame.name = frameName;
        frame.hidden = true;
        frame.setAttribute('aria-hidden', 'true');
        form.method = 'POST';
        form.action = api;
        form.target = frameName;
        form.hidden = true;

        Object.entries({ ...params, action, requestId }).forEach(([name, value]) => {
          if (value === undefined || value === null) return;
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        });

        const cleanup = () => {
          window.removeEventListener('message', onMessage);
          if (timer) clearTimeout(timer);
          form.remove();
          setTimeout(() => frame.remove(), 0);
        };

        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        };

        function onMessage(event) {
          const data = event?.data;
          if (!data || data.source !== POST_SOURCE || data.requestId !== requestId) return;
          finish(resolve, data.payload || {});
        }

        window.addEventListener('message', onMessage);
        document.body.appendChild(frame);
        document.body.appendChild(form);
        timer = setTimeout(
          () => finish(reject, new Error('POST compatibility transport timed out.')),
          timeoutMs
        );

        try {
          form.submit();
        } catch (error) {
          finish(reject, error);
        }
      });
    }

    function jsonpRequest(action, params = {}, timeoutMs = 15000) {
      return new Promise((resolve, reject) => {
        const callback = `__hubContractLogsPreview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        let settled = false;
        let timer = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          script.remove();
          try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        };

        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        };

        window[callback] = payload => finish(resolve, payload || {});
        const query = new URLSearchParams({
          ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
          action,
          callback,
          ts: String(Date.now())
        });
        script.src = `${api}?${query}`;
        script.referrerPolicy = 'no-referrer';
        script.onerror = () => finish(reject, new Error('Legacy compatibility script blocked.'));
        document.body.appendChild(script);
        timer = setTimeout(
          () => finish(reject, new Error('Legacy compatibility request timed out.')),
          timeoutMs
        );
      });
    }

    async function requestFeed() {
      try {
        const payload = await postRequest('contractfeed');
        const unsupported = payload?.ok === false && /unknown submission-service action/i.test(String(payload?.error || ''));
        if (!unsupported) {
          setTransport('POST COMPATIBILITY');
          return payload;
        }
      } catch (_) {
        // Existing deployments may not yet expose contractfeed through POST.
      }

      const payload = await jsonpRequest('contractfeed');
      setTransport('LEGACY JSONP');
      return payload;
    }

    function metaRows(record) {
      const rows = [];
      if (record.employer) rows.push(['Employer / Source', record.employer]);
      if (record.location) rows.push(['Location', record.location]);
      if (Array.isArray(record.participants) && record.participants.length) {
        rows.push(['Participants', record.participants.join(', ')]);
      }
      if (record.acceptedDate) rows.push(['Accepted', record.acceptedDate]);
      return rows.map(([label, value]) => `
        <div class="contract-meta-label">${esc(label)}</div>
        <div class="contract-meta-value">${esc(value)}</div>
      `).join('');
    }

    function renderActive() {
      activeCountEl.textContent = `${active.length} ACTIVE`;
      if (!active.length) {
        activeRoot.innerHTML = '<div class="contract-log-empty">NO ACTIVE CONTRACTS.</div>';
        return;
      }

      activeRoot.innerHTML = active.map(record => {
        const details = acceptedDetails(record);
        return `
          <article class="contract-log-card active" data-contract-id="${esc(record.contractId || record.jobId || '')}">
            <div class="contract-card-title">${esc(record.title)}</div>
            <div class="contract-card-status">ACTIVE</div>
            <div class="contract-card-meta">${metaRows(record)}</div>
            ${details.payoutStress ? `<div class="contract-card-detail"><span>Payout / Stress</span><strong>${esc(details.payoutStress)}</strong></div>` : ''}
            ${details.expectedWork ? `<div class="contract-card-detail"><span>Expected Work</span><strong>${esc(details.expectedWork)}</strong></div>` : ''}
            <div class="contract-submission-preview">
              <span>WHAT DO YOU DO?</span>
              <p>Optional player submission to the Warden. Disabled in this read-only preview.</p>
              <button type="button" disabled>PREVIEW // SUBMISSION DISABLED</button>
            </div>
          </article>
        `;
      }).join('');
    }

    function renderHistory() {
      const ordered = history.slice().sort((a, b) =>
        String(b.closedDate || '').localeCompare(String(a.closedDate || ''))
      );
      historyCountEl.textContent = `${ordered.length} RECORDED`;
      if (!ordered.length) {
        historyRoot.innerHTML = '<div class="contract-log-empty">NO CLOSED CONTRACTS RECORDED.</div>';
        return;
      }

      historyRoot.innerHTML = ordered.map(record => {
        const status = String(record.status || '').trim();
        const cls = status.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
        return `
          <article class="contract-log-card ${esc(cls)}">
            <div class="contract-card-title">${esc(record.title)}</div>
            <div class="contract-card-status">${esc(status)}</div>
            <div class="contract-card-meta">
              ${record.closedDate ? `<div class="contract-meta-label">Closed</div><div class="contract-meta-value">${esc(record.closedDate)}</div>` : ''}
              ${Array.isArray(record.participants) && record.participants.length ? `<div class="contract-meta-label">Participants</div><div class="contract-meta-value">${esc(record.participants.join(', '))}</div>` : ''}
            </div>
            <div class="contract-card-payout">TOTAL PAYOUT // ${esc(credits(record.totalPayout))}</div>
            ${record.closeoutSummary ? `<div class="contract-card-summary">${esc(record.closeoutSummary)}</div>` : ''}
          </article>
        `;
      }).join('');
    }

    function renderAll() {
      renderActive();
      renderHistory();
    }

    async function load() {
      if (busy) return;
      setBusy(true);
      setStatus('LOADING CONTRACT RECORD…');
      activeRoot.innerHTML = '<div class="contract-log-empty">LOADING…</div>';
      historyRoot.innerHTML = '<div class="contract-log-empty">LOADING…</div>';

      try {
        const payload = await requestFeed();
        if (!payload || payload.ok === false) {
          throw new Error(payload?.error || 'Invalid contract feed.');
        }
        active = Array.isArray(payload.active) ? payload.active : [];
        history = Array.isArray(payload.history) ? payload.history : [];
        saveCache(payload);
        renderAll();
        setStatus(`${active.length + history.length} CONTRACT RECORDS // CURRENT`, 'ok');
      } catch (error) {
        const cached = readCache();
        if (cached) {
          active = Array.isArray(cached.payload.active) ? cached.payload.active : [];
          history = Array.isArray(cached.payload.history) ? cached.payload.history : [];
          renderAll();
          const when = cached.cacheTime ? new Date(cached.cacheTime).toLocaleString() : 'previous session';
          setStatus(`CACHED / STALE // LAST VERIFIED ${when}`, 'warn');
        } else {
          active = [];
          history = [];
          renderAll();
          setStatus(String(error?.message || error || 'Contract record unavailable.'), 'error');
        }
      } finally {
        setBusy(false);
      }
    }

    refreshButton.addEventListener('click', load);
    root.dataset.rendered = 'true';
    load();
  }

  window.HubContractLogsPreview = Object.freeze({ build: BUILD, render });
})();
