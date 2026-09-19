(() => {
  'use strict';

  const BUILD = '20260919-contract-logs-prod-1';
  const POST_SOURCE = 'mothership-contract-service-post';
  const MAX_SUBMISSION_CHARS = 2000;
  const JOBS_CACHE_KEY = 'mothership_hub_jobs_v5';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const credits = value => {
    const n = Number(value || 0);
    return n.toLocaleString('en-US', {
      minimumFractionDigits: n % 1 ? 2 : 0,
      maximumFractionDigits: 2
    }) + 'cr';
  };

  function cleanLine(value) {
    return String(value || '').replace(/^\s*[-•]\s*/, '').replace(/\s+/g, ' ').trim();
  }

  function section(text, heading, nextHeadings) {
    const source = String(text || '');
    const safeHeading = String(heading).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const next = nextHeadings.map(value =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|');
    const expression = new RegExp(
      '(?:^|\\n)' + safeHeading + '\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:' + next + ')\\s*(?:\\n|$)|$)',
      'i'
    );
    return source.match(expression)?.[1] || '';
  }

  function acceptedDetails(record) {
    const text = String(record?.brief?.text || '');
    const payNext = ['EXPECTED WORK', 'AUTHORIZED / PROVIDED', 'ASSIGNMENT LIMITS', 'KNOWN RISKS', 'SUCCESSFUL CLOSEOUT'];
    const workNext = ['AUTHORIZED / PROVIDED', 'ASSIGNMENT LIMITS', 'KNOWN RISKS', 'SUCCESSFUL CLOSEOUT'];
    const payLines = section(text, 'PAY', payNext).split(/\r?\n/).map(cleanLine).filter(Boolean);
    const workLines = section(text, 'EXPECTED WORK', workNext).split(/\r?\n/).map(cleanLine).filter(Boolean);
    return {
      payoutStress: cleanLine(record?.payoutStress) || payLines.join(' · '),
      expectedWork: cleanLine(record?.expectedWork) || workLines[0] || ''
    };
  }

  function normalized(value) {
    return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function jobsCache() {
    try {
      const rows = JSON.parse(localStorage.getItem(JOBS_CACHE_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function betweenSessionKindFromPay(value) {
    const pay = String(value || '');
    if (!/\+\s*1\s*stress\b/i.test(pay)) return '';
    const match = pay.match(/([\d,]+(?:\.\d+)?)\s*cr/i);
    const amount = match ? Number(match[1].replace(/,/g, '')) : 0;
    if (amount >= 1500 && amount <= 2500) return 'medium';
    if (amount > 0 && amount < 1500) return 'simple';
    return 'between';
  }

  function betweenSessionKind(record) {
    const jobId = normalized(record?.jobId || record?.contractId);
    const title = normalized(record?.title);
    const rows = jobsCache();
    const row = rows.find(item =>
      jobId && normalized(item?.['Job ID'] || item?.jobId || item?.id) === jobId
    ) || rows.find(item =>
      title && normalized(item?.Title || item?.title) === title
    );
    const rowKind = row && betweenSessionKindFromPay(row?.Pay ?? row?.pay ?? row?.basePay);
    return rowKind || betweenSessionKindFromPay(record?.payoutStress || record?.pay || '');
  }

  function betweenSessionMarkup(record) {
    const kind = betweenSessionKind(record);
    if (!kind) return '';
    const label = kind === 'medium'
      ? 'AWAITING SUMMARY'
      : kind === 'simple' ? 'BETWEEN-SESSION // SIMPLE' : 'BETWEEN-SESSION';
    const copy = kind === 'medium'
      ? '<strong>Brief completion summary required.</strong><br>Send the Warden a short description of the difficulty you encountered and how your crew handled it. A few sentences is enough. Mention the approach, division of work, equipment, precautions, or other decisions that mattered.<br><br>A reasonable approach may resolve the contract without further action. Risky or incomplete approaches may have additional consequences. Each participating character gains <strong>+1 Stress</strong> when the work is completed. The reward is split between participating characters.'
      : 'This is a short between-session job. Each participating character gains <strong>+1 Stress</strong> when the work is completed. The reward is split between participating characters.';
    return `
      <span class="between-session-state ${kind === 'simple' ? 'simple' : ''}">${esc(label)}</span>
      <details class="between-session-help ${kind === 'simple' ? 'simple' : ''}">
        <summary>${kind === 'medium' ? 'WHAT YOU NEED TO DO' : 'SIMPLE BETWEEN-SESSION WORK'}</summary>
        <div>${copy}</div>
      </details>`;
  }

  function render(root, options = {}) {
    if (!root) throw new Error('Contract Logs root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const api = String(options.api || '').trim();
    const cacheKey = String(options.cacheKey || 'mothership_hub_contractfeed_v1');
    const cacheTimeKey = String(options.cacheTimeKey || 'mothership_hub_contractfeed_v1_time');
    if (!api) throw new Error('Contract service endpoint is unavailable.');

    let active = [];
    let history = [];
    let busy = false;

    root.innerHTML = `
      <div class="contract-logs-heading">
        <h1>Contract Logs</h1>
        <p>Accepted assignments and verified closeout history.</p>
      </div>
      <div class="contract-log-toolbar">
        <div class="contract-log-status" data-contract-status>LOADING CONTRACT RECORD…</div>
        <button type="button" class="contract-refresh" data-contract-refresh>REFRESH</button>
      </div>
      <section class="contract-log-section">
        <div class="contract-log-section-head"><h2>Active Contracts</h2><span data-active-count>—</span></div>
        <div class="contract-log-grid" data-active></div>
      </section>
      <section class="contract-log-section">
        <div class="contract-log-section-head"><h2>Contract History</h2><span data-history-count>—</span></div>
        <div class="contract-log-grid" data-history></div>
      </section>`;

    const status = root.querySelector('[data-contract-status]');
    const refresh = root.querySelector('[data-contract-refresh]');
    const activeCount = root.querySelector('[data-active-count]');
    const historyCount = root.querySelector('[data-history-count]');
    const activeRoot = root.querySelector('[data-active]');
    const historyRoot = root.querySelector('[data-history]');

    function setStatus(message, state = '') {
      status.textContent = String(message || '');
      status.dataset.state = state;
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
        const cachedAt = Number(localStorage.getItem(cacheTimeKey) || 0);
        return payload && typeof payload === 'object' ? { payload, cachedAt } : null;
      } catch (_) {
        return null;
      }
    }

    function postFeed(timeoutMs = 18000) {
      return new Promise((resolve, reject) => {
        const requestId = `contract-feed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const iframe = document.createElement('iframe');
        const form = document.createElement('form');
        const frameName = `contractFeed_${requestId.replace(/[^A-Za-z0-9_]/g, '_')}`;
        let settled = false;

        iframe.name = frameName;
        iframe.hidden = true;
        form.method = 'POST';
        form.action = api;
        form.target = frameName;
        form.hidden = true;
        for (const [name, value] of Object.entries({ action: 'contractfeed', requestId })) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }

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
    }

    function jsonpFeed(timeoutMs = 12000) {
      return new Promise((resolve, reject) => {
        const callback = `__hubContractFeed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        let settled = false;

        const finish = (error, payload) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          script.remove();
          try { delete window[callback]; } catch (_) { window[callback] = undefined; }
          error ? reject(error) : resolve(payload || {});
        };

        window[callback] = payload => finish(null, payload);
        script.onerror = () => finish(new Error('Contract service unavailable.'));
        script.src = api + '?' + new URLSearchParams({
          action: 'contractfeed', callback, _: String(Date.now())
        });
        document.body.appendChild(script);
        const timer = setTimeout(() => finish(new Error('Contract service timed out.')), timeoutMs);
      });
    }

    async function requestFeed() {
      try {
        const payload = await postFeed();
        const unsupported = payload?.ok === false &&
          /unknown submission-service action/i.test(String(payload?.error || ''));
        if (!unsupported) return payload;
      } catch (_) {}
      return jsonpFeed();
    }

    function metaRows(record) {
      const rows = [];
      if (record.employer) rows.push(['Employer / Source', record.employer]);
      if (record.location) rows.push(['Location', record.location]);
      if (record.participants?.length) rows.push(['Participants', record.participants.join(', ')]);
      if (record.acceptedDate) rows.push(['Accepted', record.acceptedDate]);
      return rows.map(([label, value]) =>
        `<div class="contract-meta-label">${esc(label)}</div><div class="contract-meta-value">${esc(value)}</div>`
      ).join('');
    }

    function submissionMarkup(record) {
      const key = String(record.contractId || record.jobId || '').trim();
      return `
        <section class="contract-submission" data-contract-submission="${esc(key)}">
          <div class="contract-submission-label">WHAT DO YOU DO?</div>
          <p>Optional. Send a declared action to the Warden for review. Submitting does not resolve the contract.</p>
          <textarea maxlength="${MAX_SUBMISSION_CHARS}" placeholder="Describe what you do…" aria-label="Describe what you do"></textarea>
          <div class="contract-submission-row">
            <div><span data-count>0 / ${MAX_SUBMISSION_CHARS}</span><span data-result aria-live="polite"></span></div>
            <button type="button">SUBMIT TO WARDEN</button>
          </div>
        </section>`;
    }

    function renderActive() {
      activeCount.textContent = `${active.length} ACTIVE`;
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
            ${betweenSessionMarkup(record)}
            <div class="contract-card-meta">${metaRows(record)}</div>
            ${details.payoutStress ? `<div class="contract-card-detail"><span>Payout / Stress</span><strong>${esc(details.payoutStress)}</strong></div>` : ''}
            ${details.expectedWork ? `<div class="contract-card-detail"><span>Expected Work</span><strong>${esc(details.expectedWork)}</strong></div>` : ''}
            ${submissionMarkup(record)}
          </article>`;
      }).join('');

      window.HubContractSubmissions?.attach?.(root, active, {
        api,
        sessionKey: options.sessionKey,
        sessionExpiryKey: options.sessionExpiryKey
      });
    }

    function renderHistory() {
      const ordered = history.slice().sort((a, b) =>
        String(b.closedDate || '').localeCompare(String(a.closedDate || ''))
      );
      historyCount.textContent = `${ordered.length} RECORDED`;
      if (!ordered.length) {
        historyRoot.innerHTML = '<div class="contract-log-empty">NO CLOSED CONTRACTS RECORDED.</div>';
        return;
      }

      historyRoot.innerHTML = ordered.map(record => {
        const state = String(record.status || '').trim();
        const className = state.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
        return `
          <article class="contract-log-card ${esc(className)}">
            <div class="contract-card-title">${esc(record.title)}</div>
            <div class="contract-card-status">${esc(state)}</div>
            <div class="contract-card-meta">
              ${record.closedDate ? `<div class="contract-meta-label">Closed</div><div class="contract-meta-value">${esc(record.closedDate)}</div>` : ''}
              ${record.participants?.length ? `<div class="contract-meta-label">Participants</div><div class="contract-meta-value">${esc(record.participants.join(', '))}</div>` : ''}
            </div>
            <div class="contract-card-payout">TOTAL PAYOUT // ${esc(credits(record.totalPayout))}</div>
            ${record.closeoutSummary ? `<div class="contract-card-summary">${esc(record.closeoutSummary)}</div>` : ''}
          </article>`;
      }).join('');
    }

    function highlightTarget() {
      const match = String(location.hash || '').match(/^#contract=(.+)$/i);
      if (!match) return;
      let id = match[1];
      try { id = decodeURIComponent(id); } catch (_) {}
      const card = [...activeRoot.querySelectorAll('[data-contract-id]')]
        .find(node => String(node.dataset.contractId || '') === id);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('contract-log-target');
      setTimeout(() => card.classList.remove('contract-log-target'), 1600);
    }

    function renderAll() {
      renderActive();
      renderHistory();
      window.HubPlayerShell?.setBadge?.('contract-logs', active.length, { active: active.length > 0 });
      setTimeout(highlightTarget, 20);
    }

    async function load() {
      if (busy) return;
      busy = true;
      refresh.disabled = true;
      setStatus('LOADING CONTRACT RECORD…');
      activeRoot.innerHTML = historyRoot.innerHTML = '<div class="contract-log-empty">LOADING…</div>';

      try {
        const payload = await requestFeed();
        if (!payload || payload.ok === false) throw new Error(payload?.error || 'Invalid contract feed.');
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
          const when = cached.cachedAt ? new Date(cached.cachedAt).toLocaleString() : 'previous session';
          setStatus(`CACHED / STALE // LAST VERIFIED ${when}`, 'warn');
        } else {
          active = [];
          history = [];
          renderAll();
          setStatus(String(error?.message || error || 'Contract record unavailable.'), 'error');
        }
      } finally {
        busy = false;
        refresh.disabled = false;
      }
    }

    refresh.onclick = load;
    window.addEventListener('hashchange', highlightTarget);
    root.dataset.rendered = 'true';
    load();
  }

  window.HubContractLogsContent = Object.freeze({ build: BUILD, render });
})();
