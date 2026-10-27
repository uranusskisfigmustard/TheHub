(() => {
  'use strict';

  const BUILD = '20261027-answer-only-restored2';
  const POST_SOURCE = 'mothership-contract-service-post';
  const MAX_SUBMISSION_CHARS = 2000;
  const JOBS_CACHE_KEY = 'mothership_hub_jobs_v5';
  const WRITTEN_RESPONSE_PROMPTS = Object.freeze({
    '5FY-N2K8-L6S3': 'Harvesting is behind schedule as maintenance arrives for the changeover. Describe your plan, what you prioritize, how you divide the work, and how you handle the competing demands.',
    '2JG-R7M4-H9C1': 'Two community groups have overlapping bookings. The movable partitions are in poor condition and the existing layout interferes with both groups. Describe your proposed arrangement, how you speak with the groups, and how you handle the defective fixtures.'
  });

  // Stable-ID fallback for published answer-only work. Accepted jobs leave the
  // public Board and may have no acceptance brief or cached Pay. Do not infer
  // an in-session mission merely from missing contract-feed display metadata.
  // These IDs and prompts follow the current Mission Board Data owner.
  const ANSWER_ONLY_JOBS = Object.freeze({
    'EMR-7K2V-4Q9C': Object.freeze({
      problem: "A repaired work area is about to reopen. The crew wants a practical evacuation and safe-retreat plan suited to the people and equipment available.",
      payoutStress: "600cr +1 Stress",
      employer: "Small night-shift work crew",
      kind: 'simple',
      prompt: 'Briefly describe how you assess the crew and work area, conduct a practical drill, and decide whether the plan is ready for reopening.'
    }),
    'BNC-5P8L-2R6T': Object.freeze({
      problem: "A repair shop’s bench-power regulator shuts down whenever two particular tools operate together. Each tool passes inspection alone, and the shop will not reopen the bench until the interaction is understood and a safe arrangement is proven.",
      payoutStress: "600cr +1 Stress",
      employer: "Independent repair shop",
      kind: 'simple',
      prompt: 'Briefly describe how you isolate the cause, keep the bench safe during testing, and verify the final arrangement under realistic load.'
    }),
    'WCC-9N4K-7V3M': Object.freeze({
      problem: "The living organism recovered from the Sample Workshop is stable in temporary containment, but the enclosure was not designed as a long-term environment. Its environmental needs are not yet known, and no reliable way to exchange basic signals with it has been established.",
      payoutStress: "600cr +1 Stress",
      employer: "Laleh Vaziri / Sample Workshop",
      kind: 'simple',
      prompt: 'Briefly describe how you determine which environmental conditions keep the creature stable, how you build or adjust its enclosure, and how you test repeatable two-way signals for simple states such as stop, continue, need, or distress.'
    }),
    'KBW-6T2P-8L5R': Object.freeze({
      problem: "A food cooperative’s nutrient-return pump is failing. A replacement is available, but removing the old pump will stop circulation to occupied grow beds long enough to damage part of the crop.",
      payoutStress: "1,500cr +1 Stress",
      employer: "Independent food cooperative",
      kind: 'medium',
      prompt: 'Submit one short joint response describing how your team solves the problem and what each participating character contributes.'
    }),
    'TCC-4Q7V-9N2K': Object.freeze({
      problem: "A freight-routing controller has lost its live lane map after twelve secured cargo carts were staged. The carts cannot be released until their destinations, movement routes, custody records, and handling limits agree. Some cargo is temperature-sensitive, and two carts carry the same obsolete route code even though they have different destinations.",
      payoutStress: "1,500cr +1 Stress",
      employer: "Independent freight-routing operator",
      kind: 'medium',
      prompt: 'Submit one short joint response describing how your team solves the problem and what each participating character contributes.'
    })
  });

  function jobId(record) {
    return String(record?.jobId || record?.contractId || '').trim().toUpperCase().replace(/^BOARD-/, '');
  }
  function writtenResponsePrompt(record) {
    const id = jobId(record);
    return ANSWER_ONLY_JOBS[id]?.prompt || WRITTEN_RESPONSE_PROMPTS[id] ||
      cleanLine(section(String(record?.brief?.text || ''), 'WHAT DO YOU DO?', [
        'PAY', 'COMPENSATION', 'EXPECTED WORK', 'ASSIGNMENT LIMITS', 'KNOWN RISKS', 'SUCCESSFUL CLOSEOUT'
      ])) || '';
  }

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
    const known = ANSWER_ONLY_JOBS[jobId(record)];
    const headings = [
      'HIRED BY', 'THE PROBLEM', 'EXPECTED WORK', 'AUTHORIZED / PROVIDED',
      'ASSIGNMENT LIMITS', 'RESTRICTED', 'KNOWN RISKS', 'SUCCESSFUL CLOSEOUT',
      'PAY', 'COMPENSATION', 'INITIAL CONTACT CARD', 'ACCEPTED SCOPE',
      'KNOWN CONSIDERATIONS', 'WHAT DO YOU DO?'
    ];
    const after = heading => headings.filter(item => item !== heading);
    const payLines = section(text, 'PAY', after('PAY')).split(/\r?\n/).map(cleanLine).filter(Boolean);
    const workLines = section(text, 'EXPECTED WORK', after('EXPECTED WORK')).split(/\r?\n/).map(cleanLine).filter(Boolean);
    return {
      hiredBy: cleanLine(section(text, 'HIRED BY', after('HIRED BY'))) || known?.employer || '',
      problemSummary: cleanLine(section(text, 'THE PROBLEM', after('THE PROBLEM'))) || known?.problem || '',
      payoutStress: cleanLine(record?.payoutStress) || payLines.join(' · ') || known?.payoutStress || '',
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
    // Canonical answer-only job IDs survive acceptance and missing brief/pay fields.
    const registered = ANSWER_ONLY_JOBS[jobId(record)];
    if (registered) return registered.kind;
    const type = normalized(record?.workType || record?.workMode || record?.assignmentType || '');
    const acceptedPay = acceptedDetails(record).payoutStress;
    if (/answer.only.*between.session|between.session.*answer.only/.test(type)) {
      return /team/.test(type) ? 'medium' :
        betweenSessionKindFromPay(acceptedPay || record?.payoutStress || record?.pay || '') || 'simple';
    }
    const id = normalized(jobId(record));
    const title = normalized(record?.title);
    const rows = jobsCache();
    const row = rows.find(item =>
      id && normalized(item?.['Job ID'] || item?.jobId || item?.id) === id
    ) || rows.find(item =>
      title && normalized(item?.Title || item?.title) === title
    );
    if (row && /answer.only.*between.session/i.test(String(row?.['Work Type'] || row?.workType || ''))) {
      return /team/i.test(String(row?.['Work Type'] || row?.workType || '')) ? 'medium' :
        betweenSessionKindFromPay(row?.Pay ?? row?.pay ?? row?.basePay) || 'simple';
    }
    const rowKind = row && betweenSessionKindFromPay(row?.Pay ?? row?.pay ?? row?.basePay);
    // Legacy between-session jobs also used a +1 Stress pay line.
    return rowKind || betweenSessionKindFromPay(acceptedPay || record?.payoutStress || record?.pay || '');
  }

  function betweenSessionMarkup(record) {
    const prompt = writtenResponsePrompt(record);
    const kind = betweenSessionKind(record) || (prompt ? 'medium' : '');
    if (!kind) return '';
    const label = kind === 'medium'
      ? 'AWAITING SUMMARY'
      : kind === 'simple' ? 'BETWEEN-SESSION // SIMPLE' : 'BETWEEN-SESSION';
    const answerOnly = Boolean(ANSWER_ONLY_JOBS[jobId(record)]) ||
      /answer.only.*between.session/i.test(String(record?.workType || record?.workMode || ''));
    const copy = answerOnly
      ? kind === 'medium'
        ? '<strong>One short joint written response required.</strong><br>Explain how the team solves the problem and what each participating character contributes. Submit the answer for Warden review. No play scene or automatic roll is required, and submission alone does not complete the job.'
        : '<strong>One short written response required.</strong><br>Explain how your character addresses the posted problem and submit the answer for Warden review. No play scene or automatic roll is required, and submission alone does not complete the job.'
      : kind === 'medium'
        ? '<strong>Written response required before closeout.</strong><br>Describe your approach, decisions, precautions and each participant\'s contribution. The Warden reviews your answer; submission alone does not complete the contract.'
        : '<strong>Short between-session job.</strong><br>Send any requested action to the Warden for review. Submission alone does not resolve the contract.';
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
      const employer = acceptedDetails(record).hiredBy || String(record.employer || '').trim();
      if (employer && !/^(unknown|restricted)$/i.test(employer)) rows.push(['Hired By', employer]);
      if (record.location) rows.push(['Location', record.location]);
      if (record.participants?.length) rows.push(['Participants', record.participants.join(', ')]);
      if (record.acceptedDate) rows.push(['Accepted', record.acceptedDate]);
      return rows.map(([label, value]) =>
        `<div class="contract-meta-label">${esc(label)}</div><div class="contract-meta-value">${esc(value)}</div>`
      ).join('');
    }

    function acceptanceBriefMarkup(record) {
      const text = String(record?.brief?.text || '').trim();
      if (!text) return '';
      return `
        <details class="contract-acceptance-brief">
          <summary>ACCEPTANCE BRIEF</summary>
          <div class="contract-acceptance-brief-body">${esc(text)}</div>
        </details>`;
    }

    function submissionMarkup(record) {
      const key = String(record.contractId || record.jobId || '').trim();
      const prompt = writtenResponsePrompt(record);
      const answerOnly = Boolean(ANSWER_ONLY_JOBS[jobId(record)]);
      const required = answerOnly || Boolean(prompt) || betweenSessionKind(record) === 'medium';
      const label = required ? 'WRITTEN RESPONSE REQUIRED' : 'WHAT DO YOU DO?';
      const instructions = answerOnly
        ? betweenSessionKind(record) === 'medium'
          ? 'Submit one short joint response explaining how your crew handles the problem and what each participating character contributes (maximum 2,000 characters). Submission does not complete or pay the job.'
          : 'Submit one short response explaining how your character handles the problem (maximum 2,000 characters). Submission does not complete or pay the job.'
        : required
          ? 'Enter your response here and submit it to the Warden. The work will not be closed or paid automatically. For this assignment, describe your decisions in approximately 2–4 paragraphs (maximum 2,000 characters).'
          : 'Optional. Send a declared action to the Warden for review. Submitting does not resolve the contract.';
      return `
        <section class="contract-submission" data-contract-submission="${esc(key)}">
          <div class="contract-submission-label">${esc(label)}</div>
          <p>${esc(instructions)}</p>
          ${prompt ? `<p><strong>YOUR ASSIGNMENT:</strong> ${esc(prompt)}</p>` : ''}
          <textarea maxlength="${MAX_SUBMISSION_CHARS}" placeholder="${required ? 'Describe your plan and decisions…' : 'Describe what you do…'}" aria-label="${required ? 'Required written response' : 'Describe what you do'}"></textarea>
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
          <article class="contract-log-card active" data-contract-id="${esc(record.contractId || record.jobId || '')}" data-work-mode="${betweenSessionKind(record) ? 'between-session' : 'session'}">
            <div class="contract-card-title">${esc(record.title)}</div>
            <div class="contract-card-status">ACTIVE</div>
            ${betweenSessionMarkup(record)}
            <div class="contract-card-meta">${metaRows(record)}</div>
            ${details.problemSummary ? `<div class="contract-card-detail"><span>The Problem</span><strong>${esc(details.problemSummary)}</strong></div>` : ''}
            ${details.payoutStress ? `<div class="contract-card-detail"><span>Payout / Stress</span><strong>${esc(details.payoutStress)}</strong></div>` : ''}
            ${details.expectedWork ? `<div class="contract-card-detail"><span>Expected Work</span><strong>${esc(details.expectedWork)}</strong></div>` : ''}
            ${acceptanceBriefMarkup(record)}
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

      const cached = readCache();
      if (cached) {
        active = Array.isArray(cached.payload.active) ? cached.payload.active : [];
        history = Array.isArray(cached.payload.history) ? cached.payload.history : [];
        renderAll();
        const when = cached.cachedAt ? new Date(cached.cachedAt).toLocaleString() : 'previous session';
        setStatus(`CACHED / REFRESHING // LAST VERIFIED ${when}`, 'warn');
      } else {
        setStatus('LOADING CONTRACT RECORD…');
        activeRoot.innerHTML = historyRoot.innerHTML = '<div class="contract-log-empty">LOADING…</div>';
      }

      try {
        const payload = await requestFeed();
        if (!payload || payload.ok === false) throw new Error(payload?.error || 'Invalid contract feed.');
        active = Array.isArray(payload.active) ? payload.active : [];
        history = Array.isArray(payload.history) ? payload.history : [];
        saveCache(payload);
        renderAll();
        setStatus(`${active.length + history.length} CONTRACT RECORDS // CURRENT`, 'ok');
      } catch (error) {
        if (cached) {
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
