(() => {
  'use strict';

  const BUILD = '20260919-board-preview-2';
  const POST_SOURCE = 'mothership-contract-service-post';
  const SHEET_ID = '1bg6UsBTaNanhCm9xwWbafEag6TpinCuGdlmkqv-c38c';
  const JOBS_GID = '781703719';

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const splitSkills = value => String(value || '')
    .split(/[,/•|;]+/)
    .map(item => item.trim())
    .filter(Boolean);

  function cellValue(cell) {
    if (!cell || cell.v === null || cell.v === undefined) return '';
    return cell.f ?? cell.v;
  }

  function normalizeTable(table) {
    if (!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) return [];
    const labels = table.cols.map((column, index) =>
      String(column.label || String.fromCharCode(65 + index)).trim()
    );
    return table.rows.map(row => {
      const out = {};
      labels.forEach((label, index) => { out[label] = cellValue(row.c?.[index]); });
      return out;
    }).filter(row => String(row.Title || '').trim());
  }

  function qualificationParts(raw) {
    const text = String(raw || '').trim();
    if (!text) return { label: '', text: '' };
    const match = text.match(/^(OPEN|PREFERRED|REQUIRED|REGULATED)\s*[—-]\s*(.*)$/i);
    if (match) return { label: match[1].toUpperCase(), text: match[2] };
    return { label: 'QUALIFICATION', text };
  }

  function betweenSessionKind(pay) {
    const text = String(pay || '');
    if (!/\+\s*1\s*Stress\b/i.test(text)) return '';
    const match = text.match(/([\d,]+(?:\.\d+)?)\s*cr/i);
    const amount = match ? Number(match[1].replace(/,/g, '')) : 0;
    if (amount >= 1500 && amount <= 2500) return 'medium';
    if (amount > 0 && amount < 1500) return 'simple';
    return 'between';
  }

  function render(root, options = {}) {
    if (!root) throw new Error('Board preview root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const api = String(options.api || '').trim();
    const mode = options.mode === 'classifieds' ? 'classifieds' : 'jobs';
    const cachePrefix = String(options.cachePrefix || 'hub-preview:board:');
    if (!api) throw new Error('Contract service endpoint is unavailable.');

    const state = {
      mode,
      jobs: [],
      classifieds: [],
      eligibility: {},
      eligibilityValid: false,
      qualificationFilter: 'all',
      status: mode === 'jobs' ? 'LOADING CONTRACTS…' : 'LOADING CLASSIFIEDS…',
      transport: mode === 'jobs' ? 'QUALIFICATION TRANSPORT // CHECKING' : 'CLASSIFIEDS TRANSPORT // CHECKING'
    };

    root.innerHTML = `
      <div class="board-preview-heading">
        <div class="preview-kicker">MIGRATED PAGE PREVIEW</div>
        <h1>${mode === 'classifieds' ? 'Classifieds' : 'Contracts'}</h1>
        <p data-board-subtitle></p>
      </div>
      <div class="board-preview-warning">READ-ONLY PREVIEW // CONTRACT ACCEPTANCE AND CLASSIFIED REQUESTS ARE DISABLED.</div>
      <div class="board-controls">
        <input type="search" data-board-search aria-label="Search listings">
        <select data-board-primary aria-label="Primary filter"></select>
        <select data-board-secondary aria-label="Secondary filter"></select>
        <button type="button" data-board-clear>CLEAR</button>
        <button type="button" data-board-refresh>REFRESH</button>
      </div>
      <div class="board-qualification-filter" data-board-qfilter>
        <span>QUALIFICATION VIEW</span>
        <button type="button" class="active" data-qf="all">ALL</button>
        <button type="button" data-qf="ready">CREW READY</button>
        <button type="button" data-qf="action">ACTION REQUIRED</button>
      </div>
      <div class="board-statusbar">
        <span data-board-status></span>
        <span data-board-transport></span>
        <span data-board-count></span>
      </div>
      <div class="board-cards" data-board-cards></div>
      <div class="board-footer" data-board-footer></div>
    `;

    const heading = root.querySelector('.board-preview-heading h1');
    const subtitle = root.querySelector('[data-board-subtitle]');
    const search = root.querySelector('[data-board-search]');
    const primary = root.querySelector('[data-board-primary]');
    const secondary = root.querySelector('[data-board-secondary]');
    const clearButton = root.querySelector('[data-board-clear]');
    const refreshButton = root.querySelector('[data-board-refresh]');
    const qualificationFilter = root.querySelector('[data-board-qfilter]');
    const status = root.querySelector('[data-board-status]');
    const transport = root.querySelector('[data-board-transport]');
    const count = root.querySelector('[data-board-count]');
    const cards = root.querySelector('[data-board-cards]');
    const footer = root.querySelector('[data-board-footer]');

    qualificationFilter.hidden = mode !== 'jobs';

    const cache = {
      jobs: cachePrefix + 'jobs-v5',
      jobsTime: cachePrefix + 'jobs-v5:time',
      classifieds: cachePrefix + 'classifieds-v2',
      classifiedsTime: cachePrefix + 'classifieds-v2:time'
    };

    function saveCache(key, timeKey, rows) {
      try {
        localStorage.setItem(key, JSON.stringify(rows));
        localStorage.setItem(timeKey, String(Date.now()));
      } catch (_) {}
    }

    function readCache(key, timeKey) {
      try {
        const rows = JSON.parse(localStorage.getItem(key) || '[]');
        return { rows: Array.isArray(rows) ? rows : [], time: Number(localStorage.getItem(timeKey) || 0) };
      } catch (_) {
        return { rows: [], time: 0 };
      }
    }

    function postRequest(action, params = {}, timeoutMs = 35000) {
      return new Promise((resolve, reject) => {
        const requestId = `board-preview-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const frame = document.createElement('iframe');
        const form = document.createElement('form');
        const frameName = `boardPreviewPost_${requestId.replace(/[^A-Za-z0-9_]/g, '_')}`;
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
          input.value = Array.isArray(value) ? JSON.stringify(value) : String(value);
          form.appendChild(input);
        });

        function cleanup() {
          window.removeEventListener('message', onMessage);
          if (timer) clearTimeout(timer);
          form.remove();
          setTimeout(() => frame.remove(), 0);
        }

        function finish(fn, value) {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        }

        function onMessage(event) {
          const data = event?.data;
          if (!data || data.source !== POST_SOURCE || data.requestId !== requestId) return;
          finish(resolve, data.payload || {});
        }

        window.addEventListener('message', onMessage);
        document.body.append(frame, form);
        timer = setTimeout(() => finish(reject, new Error('POST compatibility transport timed out.')), timeoutMs);
        try { form.submit(); } catch (error) { finish(reject, error); }
      });
    }

    function loadContractsSheet(timeoutMs = 9000) {
      return new Promise((resolve, reject) => {
        const callback = `__hubBoardPreviewJobs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        let timer = null;
        let settled = false;

        function cleanup() {
          if (timer) clearTimeout(timer);
          script.remove();
          try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        }

        function finish(fn, value) {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        }

        window[callback] = response => {
          try {
            if (!response || response.status === 'error') {
              throw new Error(response?.errors?.[0]?.message || 'Google Sheet returned an error.');
            }
            finish(resolve, normalizeTable(response.table));
          } catch (error) {
            finish(reject, error);
          }
        };

        const cacheBust = Date.now() + Math.floor(Math.random() * 1000);
        const tqx = encodeURIComponent(`responseHandler:${callback};reqId:${cacheBust}`);
        script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${JOBS_GID}&headers=1&tqx=${tqx}&_=${cacheBust}`;
        script.onerror = () => finish(reject, new Error('Google Sheets contract feed unavailable.'));
        document.body.appendChild(script);
        timer = setTimeout(() => finish(reject, new Error('Contract listing feed timed out.')), timeoutMs);
      });
    }

    function configureFilters() {
      if (mode === 'jobs') {
        search.placeholder = 'Search title, employer, work type…';
        const types = [...new Set(state.jobs.map(row => String(row['Work Type'] || '').trim()).filter(Boolean))].sort();
        const fits = [...new Set(state.jobs.flatMap(row => splitSkills(row['Good Fit'])))].sort();
        primary.innerHTML = '<option value="">All work types</option>' + types.map(value => `<option>${esc(value)}</option>`).join('');
        secondary.innerHTML = '<option value="">All good-fit areas</option>' + fits.map(value => `<option>${esc(value)}</option>`).join('');
      } else {
        search.placeholder = 'Search item, category, description…';
        const categories = [...new Set(state.classifieds.map(row => String(row.Category || '').trim()).filter(Boolean))].sort();
        primary.innerHTML = '<option value="">All categories</option>' + categories.map(value => `<option>${esc(value)}</option>`).join('');
        secondary.innerHTML = '<option value="">All listing types</option><option value="sale">For sale</option><option value="wanted">Wanted / ISO</option>';
      }
    }

    function qualificationState(job) {
      const id = String(job['Job ID'] || '').trim();
      const explicit = String(state.eligibility[id] || '').trim().toUpperCase();
      if (explicit === 'READY') return 'ready';
      if (explicit === 'ACTION') return 'action';
      const qualification = qualificationParts(job.Qualification);
      if (state.eligibilityValid && qualification.label === 'REGULATED') return 'blocked';
      if (state.eligibilityValid) return 'action';
      return '';
    }

    function qualificationBox(job) {
      const preferred = splitSkills(job['Preferred Skills']);
      const required = splitSkills(job['Required Skills']);
      const fit = splitSkills(job['Good Fit']);
      const qualification = qualificationParts(job.Qualification);
      let label = '';
      let skills = [];
      let baseClass = '';

      if (qualification.label === 'REGULATED') {
        label = 'REQUIRED';
        skills = required.length ? required : fit;
        baseClass = 'regulated';
      } else if (required.length || qualification.label === 'REQUIRED') {
        label = 'REQUIRED SKILLS';
        skills = required.length ? required : fit;
        baseClass = 'required';
      } else if (preferred.length || qualification.label === 'PREFERRED') {
        label = 'PREFERRED SKILLS';
        skills = preferred.length ? preferred : fit;
        baseClass = 'preferred';
      }

      const statusClass = qualificationState(job);
      const additional = fit.filter(item => !skills.includes(item));
      return `${skills.length ? `<div class="board-qual-box ${baseClass} ${statusClass ? `state-${statusClass}` : ''}"><div class="board-qual-label">${esc(label)}</div><div>${skills.map(esc).join(', ')}</div></div>` : ''}${additional.length ? `<div class="board-additional"><span>ADDITIONAL SKILLS</span><div>${additional.map(esc).join(', ')}</div></div>` : ''}${qualification.text ? `<div class="board-qualification-note"><span>QUALIFICATION</span><div>${esc(qualification.text)}</div></div>` : ''}`;
    }

    function betweenSessionBlock(job) {
      const kind = betweenSessionKind(job.Pay);
      if (!kind) return '';
      if (kind === 'medium') {
        return '<div class="board-between"><strong>BETWEEN-SESSION</strong><details><summary>WHAT YOU NEED TO DO</summary><p>Brief completion summary required. Send the Warden a short description of the difficulty you encountered and how your crew handled it. Each participating character gains <strong>+1 Stress</strong> when the work is completed. The reward is split between participating characters.</p></details></div>';
      }
      return '<div class="board-between simple"><strong>BETWEEN-SESSION</strong><details><summary>SIMPLE BETWEEN-SESSION WORK</summary><p>This is a short between-session job. Each participating character gains <strong>+1 Stress</strong> when the work is completed. The reward is split between participating characters.</p></details></div>';
    }

    function renderJobs() {
      const q = search.value.trim().toLowerCase();
      const workType = primary.value;
      const goodFit = secondary.value;
      const filtered = state.jobs.filter(job => {
        const hay = [job.Title, job.Employer, job.Pay, job['Work Type'], job['Good Fit'], job['Preferred Skills'], job['Required Skills'], job.Qualification, job.Summary, job.Details].join(' ').toLowerCase();
        const fits = splitSkills(job['Good Fit']);
        const qs = qualificationState(job);
        const qualificationMatch = state.qualificationFilter === 'all' ||
          (state.qualificationFilter === 'ready' && qs === 'ready') ||
          (state.qualificationFilter === 'action' && qs !== 'ready');
        return (!q || hay.includes(q)) &&
          (!workType || String(job['Work Type'] || '') === workType) &&
          (!goodFit || fits.includes(goodFit)) &&
          qualificationMatch;
      });

      count.textContent = `${filtered.length} of ${state.jobs.length} contract${state.jobs.length === 1 ? '' : 's'}`;
      if (!filtered.length) {
        cards.innerHTML = `<div class="board-empty">${state.jobs.length ? 'No contracts match the current filters.' : 'No contracts are currently posted.'}</div>`;
        return;
      }

      cards.innerHTML = filtered.map(job => {
        const details = String(job.Details || '').trim();
        return `<article class="board-card contract-card"><div class="board-title">${esc(job.Title)}</div><div class="board-pay">${esc(job.Pay)}</div><div class="board-meta">${esc(job.Employer)}${job['Work Type'] ? ` · ${esc(job['Work Type'])}` : ''}</div>${qualificationBox(job)}<div class="board-summary">${esc(job.Summary)}</div>${details ? `<details class="board-details"><summary>View Details</summary><div>${esc(details)}</div></details>` : ''}${betweenSessionBlock(job)}<button class="board-disabled-action" type="button" disabled>PREVIEW // ACCEPT CONTRACT DISABLED</button></article>`;
      }).join('');
    }

    function renderClassifieds() {
      const q = search.value.trim().toLowerCase();
      const category = primary.value;
      const listingType = secondary.value;
      const posted = state.classifieds.filter(row => String(row.Status || 'POSTED').toUpperCase() === 'POSTED');
      const filtered = posted.filter(row => {
        const title = String(row.Title || '').trim();
        const wanted = /^(WANTED|ISO)\s*[—-]/i.test(title);
        const hay = [row.Title, row.Price, row.Category, row.Description].join(' ').toLowerCase();
        return (!q || hay.includes(q)) &&
          (!category || String(row.Category || '') === category) &&
          (!listingType || (listingType === 'wanted' ? wanted : !wanted));
      });

      count.textContent = `${filtered.length} of ${posted.length} classified${posted.length === 1 ? '' : 's'}`;
      if (!filtered.length) {
        cards.innerHTML = `<div class="board-empty">${posted.length ? 'No classifieds match the current filters.' : 'No classifieds are currently posted.'}</div>`;
        return;
      }

      cards.innerHTML = filtered.map(row => {
        const wanted = /^(WANTED|ISO)\s*[—-]/i.test(String(row.Title || '').trim());
        return `<article class="board-card classified-card"><div class="board-title">${esc(row.Title)}</div><div class="board-pay">${esc(row.Price)}</div><div class="board-meta">${esc(row.Category)}</div><div class="board-summary">${esc(row.Description)}</div>${wanted ? '' : '<button class="board-disabled-action" type="button" disabled>PREVIEW // REQUEST ITEM DISABLED</button>'}</article>`;
      }).join('');
    }

    function renderCurrent() {
      heading.textContent = mode === 'jobs' ? 'Contracts' : 'Classifieds';
      subtitle.textContent = mode === 'jobs'
        ? 'Independent work listings — review terms before acceptance.'
        : 'Secondhand goods, surplus equipment, lease transfers, and things somebody wants gone.';
      footer.textContent = mode === 'jobs'
        ? 'GOOD FIT is advisory. PREFERRED SKILLS strengthen a bid but are not mandatory. REQUIRED SKILLS and formal qualification terms are hard gates where shown.'
        : 'Listings are seller-supplied. Condition, compatibility, title, transport, installation, certification, and facility approval remain the buyer’s responsibility unless the listing says otherwise.';
      status.textContent = state.status;
      transport.textContent = state.transport;
      if (mode === 'jobs') renderJobs(); else renderClassifieds();
    }

    async function refreshEligibility() {
      const jobIds = state.jobs.map(job => String(job['Job ID'] || '').trim()).filter(Boolean);
      if (!jobIds.length) {
        state.eligibility = {};
        state.eligibilityValid = true;
        state.transport = 'QUALIFICATION TRANSPORT // POST COMPATIBILITY';
        renderCurrent();
        return;
      }

      try {
        const response = await postRequest('preflight', { jobs: jobIds }, 35000);
        if (!response || response.ok === false || !response.states || typeof response.states !== 'object') {
          throw new Error(response?.error || 'Qualification preflight unavailable.');
        }
        state.eligibility = response.states;
        state.eligibilityValid = true;
        state.transport = 'QUALIFICATION TRANSPORT // POST COMPATIBILITY';
      } catch (_) {
        state.eligibility = {};
        state.eligibilityValid = false;
        state.transport = 'QUALIFICATION TRANSPORT // UNAVAILABLE';
      }
      renderCurrent();
    }

    async function loadJobs() {
      state.status = 'LOADING CONTRACTS…';
      state.transport = 'QUALIFICATION TRANSPORT // CHECKING';
      renderCurrent();

      try {
        const rows = await loadContractsSheet();
        state.jobs = rows.sort((a, b) => Number(a['Sort Order'] || 9999) - Number(b['Sort Order'] || 9999));
        state.status = `LIVE // Contracts loaded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        saveCache(cache.jobs, cache.jobsTime, state.jobs);
      } catch (error) {
        const cached = readCache(cache.jobs, cache.jobsTime);
        state.jobs = cached.rows;
        state.status = cached.rows.length
          ? `CACHED / STALE // Contracts last loaded: ${new Date(cached.time).toLocaleString()}`
          : `CONTRACT DATA UNAVAILABLE // ${String(error?.message || error)}`;
      }

      configureFilters();
      renderCurrent();
      await refreshEligibility();
    }

    async function loadClassifieds() {
      state.status = 'LOADING CLASSIFIEDS…';
      state.transport = 'CLASSIFIEDS TRANSPORT // CHECKING';
      renderCurrent();

      try {
        const response = await postRequest('classifiedsfeed', {}, 20000);
        if (!response || response.ok === false || !Array.isArray(response.classifieds)) {
          throw new Error(response?.error || 'Classifieds feed unavailable.');
        }
        state.classifieds = response.classifieds
          .sort((a, b) => Number(a['Sort Order'] || 9999) - Number(b['Sort Order'] || 9999));
        state.status = `LIVE // Classifieds loaded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        state.transport = 'CLASSIFIEDS TRANSPORT // POST COMPATIBILITY';
        saveCache(cache.classifieds, cache.classifiedsTime, state.classifieds);
      } catch (error) {
        const cached = readCache(cache.classifieds, cache.classifiedsTime);
        state.classifieds = cached.rows;
        state.status = cached.rows.length
          ? `CACHED / STALE // Classifieds last loaded: ${new Date(cached.time).toLocaleString()}`
          : `CLASSIFIED DATA UNAVAILABLE // ${String(error?.message || error)}`;
        state.transport = 'CLASSIFIEDS TRANSPORT // UNAVAILABLE';
      }

      configureFilters();
      renderCurrent();
    }

    async function refresh() {
      refreshButton.disabled = true;
      try {
        if (mode === 'jobs') await loadJobs();
        else await loadClassifieds();
      } finally {
        refreshButton.disabled = false;
      }
    }

    [search, primary, secondary].forEach(element => element.addEventListener('input', renderCurrent));
    clearButton.addEventListener('click', () => {
      search.value = '';
      primary.value = '';
      secondary.value = '';
      state.qualificationFilter = 'all';
      qualificationFilter.querySelectorAll('[data-qf]').forEach(button => {
        button.classList.toggle('active', button.dataset.qf === 'all');
      });
      renderCurrent();
    });
    refreshButton.addEventListener('click', refresh);
    qualificationFilter.addEventListener('click', event => {
      const button = event.target.closest('[data-qf]');
      if (!button) return;
      state.qualificationFilter = button.dataset.qf || 'all';
      qualificationFilter.querySelectorAll('[data-qf]').forEach(item => item.classList.toggle('active', item === button));
      renderCurrent();
    });

    root.dataset.rendered = 'true';
    configureFilters();
    renderCurrent();
    refresh();
  }

  window.HubBoardPreview = Object.freeze({ build: BUILD, render });
})();