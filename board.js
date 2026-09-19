(() => {
  'use strict';

  const BUILD = '20260919-board-prod-1';
  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const POST_SOURCE = 'mothership-contract-service-post';
  const SHEET_ID = '1bg6UsBTaNanhCm9xwWbafEag6TpinCuGdlmkqv-c38c';
  const JOBS_GID = '781703719';
  const JOBS_CACHE = 'mothership_hub_jobs_v5';
  const CLASSIFIEDS_CACHE = 'mothership_hub_classifieds_v2';
  const JOBS_TIME = JOBS_CACHE + '_time';
  const CLASSIFIEDS_TIME = CLASSIFIEDS_CACHE + '_time';
  const ELIGIBILITY_CACHE = 'mothership_hub_eligibility_v1';
  const ELIGIBILITY_LIVE = 'mothership_hub_eligibility_live_v1';
  const SESSION_KEY = 'mothership_hub_board_session_v1';
  const EXPIRY_KEY = 'mothership_hub_board_session_expiry_v1';

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

  function postRequest(action, params = {}, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = `board-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const frame = document.createElement('iframe');
      const form = document.createElement('form');
      const frameName = `boardPost_${requestId.replace(/[^A-Za-z0-9_]/g, '_')}`;
      let settled = false;
      let timer = null;

      frame.name = frameName;
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      form.method = 'POST';
      form.action = API;
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

  function loadJobsSheet(timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const callback = `__hubBoardJobs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
        } catch (error) { finish(reject, error); }
      };
      const cacheBust = Date.now() + Math.floor(Math.random() * 1000);
      const tqx = encodeURIComponent(`responseHandler:${callback};reqId:${cacheBust}`);
      script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${JOBS_GID}&headers=1&tqx=${tqx}&_=${cacheBust}`;
      script.onerror = () => finish(reject, new Error('Google Sheets contract feed unavailable.'));
      document.body.appendChild(script);
      timer = setTimeout(() => finish(reject, new Error('Contract feed timed out.')), timeoutMs);
    });
  }

  function saveCache(key, timeKey, rows) {
    try {
      localStorage.setItem(key, JSON.stringify(rows));
      localStorage.setItem(timeKey, new Date().toISOString());
    } catch (_) {}
  }

  function readCache(key, timeKey) {
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      const time = String(localStorage.getItem(timeKey) || '');
      return { rows: Array.isArray(rows) ? rows : [], time };
    } catch (_) {
      return { rows: [], time: '' };
    }
  }

  function readSession() {
    try {
      const token = String(localStorage.getItem(SESSION_KEY) || '').trim();
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
      if (!token || !Number.isFinite(expiry) || expiry <= Date.now()) return null;
      return { token, expiry };
    } catch (_) { return null; }
  }

  function storeSession(payload) {
    const token = String(payload?.sessionToken || '').trim();
    const expiry = Number(payload?.expiresAtMs || 0);
    if (!token || !Number.isFinite(expiry) || expiry <= Date.now()) return false;
    try {
      localStorage.setItem(SESSION_KEY, token);
      localStorage.setItem(EXPIRY_KEY, String(expiry));
      return true;
    } catch (_) { return false; }
  }

  async function ensureSession(pin) {
    const existing = readSession();
    if (existing) return existing.token;
    const clean = String(pin || '').trim();
    if (!clean) throw new Error('Board access code required.');
    const response = await postRequest('authenticate', { pin: clean }, 30000);
    if (!response?.ok || !response?.authenticated || !storeSession(response)) {
      throw new Error(response?.message || response?.error || 'Board authentication failed.');
    }
    return readSession()?.token || '';
  }

  function render(root, options = {}) {
    if (!root) throw new Error('Board root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const mode = options.mode === 'classifieds' ? 'classifieds' : 'jobs';
    const state = {
      mode,
      jobs: [],
      classifieds: [],
      eligibility: {},
      eligibilityValid: false,
      qualificationFilter: 'all',
      jobsSource: 'LOADING CONTRACTS…',
      classifiedsSource: 'LOADING CLASSIFIEDS…',
      classifiedsTransport: 'CLASSIFIEDS TRANSPORT // CHECKING',
      qualificationTransport: 'QUALIFICATION TRANSPORT // CHECKING',
      acceptance: null,
      requestItem: null,
      requestCharacters: []
    };

    try {
      state.eligibility = JSON.parse(localStorage.getItem(ELIGIBILITY_CACHE) || '{}') || {};
      state.eligibilityValid = localStorage.getItem(ELIGIBILITY_LIVE) === '1';
    } catch (_) {}

    root.innerHTML = `
      <div class="board-heading">
        <h1>${mode === 'classifieds' ? 'Classifieds' : 'Contracts'}</h1>
        <p data-board-subtitle></p>
      </div>
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
        <span data-board-status>LOADING BOARD…</span>
        <span data-board-transport></span>
        <span data-board-count></span>
      </div>
      <div class="board-cards" data-board-cards></div>
      <div class="board-footer" data-board-footer></div>
    `;

    const subtitle = root.querySelector('[data-board-subtitle]');
    const search = root.querySelector('[data-board-search]');
    const primary = root.querySelector('[data-board-primary]');
    const secondary = root.querySelector('[data-board-secondary]');
    const clearButton = root.querySelector('[data-board-clear]');
    const refreshButton = root.querySelector('[data-board-refresh]');
    const qFilter = root.querySelector('[data-board-qfilter]');
    const status = root.querySelector('[data-board-status]');
    const transport = root.querySelector('[data-board-transport]');
    const count = root.querySelector('[data-board-count]');
    const cards = root.querySelector('[data-board-cards]');
    const footer = root.querySelector('[data-board-footer]');

    function configureFilters() {
      if (state.mode === 'jobs') {
        search.placeholder = 'Search title, employer, work type…';
        const types = [...new Set(state.jobs.map(row => String(row['Work Type'] || '').trim()).filter(Boolean))].sort();
        const fits = [...new Set(state.jobs.flatMap(row => splitSkills(row['Good Fit'])))].sort();
        primary.innerHTML = '<option value="">All work types</option>' + types.map(value => `<option>${esc(value)}</option>`).join('');
        secondary.innerHTML = '<option value="">All good-fit areas</option>' + fits.map(value => `<option>${esc(value)}</option>`).join('');
        qFilter.hidden = false;
      } else {
        search.placeholder = 'Search item, category, description…';
        const categories = [...new Set(state.classifieds.map(row => String(row.Category || '').trim()).filter(Boolean))].sort();
        primary.innerHTML = '<option value="">All categories</option>' + categories.map(value => `<option>${esc(value)}</option>`).join('');
        secondary.innerHTML = '<option value="">All listing types</option><option value="sale">For sale</option><option value="wanted">Wanted / ISO</option>';
        qFilter.hidden = true;
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
        label = 'REQUIRED'; skills = required.length ? required : fit; baseClass = 'regulated';
      } else if (required.length || qualification.label === 'REQUIRED') {
        label = 'REQUIRED SKILLS'; skills = required.length ? required : fit; baseClass = 'required';
      } else if (preferred.length || qualification.label === 'PREFERRED') {
        label = 'PREFERRED SKILLS'; skills = preferred.length ? preferred : fit; baseClass = 'preferred';
      }
      const statusClass = qualificationState(job);
      const additional = fit.filter(item => !skills.includes(item));
      return `${skills.length ? `<div class="board-qual-box ${baseClass} ${statusClass ? `state-${statusClass}` : ''}"><div class="board-qual-label">${esc(label)}</div><div>${skills.map(esc).join(', ')}</div></div>` : ''}${additional.length ? `<div class="board-additional"><span>ADDITIONAL SKILLS</span><div>${additional.map(esc).join(', ')}</div></div>` : ''}${qualification.text ? `<div class="board-qualification-note"><span>QUALIFICATION</span><div>${esc(qualification.text)}</div></div>` : ''}`;
    }

    function betweenSessionBlock(job) {
      const kind = betweenSessionKind(job.Pay);
      if (!kind) return '';
      if (kind === 'medium') return `<div class="board-between"><strong>BETWEEN-SESSION</strong><details><summary>WHAT YOU NEED TO DO</summary><p>Brief completion summary required. Send the Warden a short description of the difficulty you encountered and how your crew handled it. Each participating character gains <strong>+1 Stress</strong> when the work is completed. The reward is split between participating characters.</p></details></div>`;
      return `<div class="board-between simple"><strong>BETWEEN-SESSION</strong><details><summary>SIMPLE BETWEEN-SESSION WORK</summary><p>This is a short between-session job. Each participating character gains <strong>+1 Stress</strong> when the work is completed. The reward is split between participating characters.</p></details></div>`;
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
        const jobId = String(job['Job ID'] || '').trim();
        const details = String(job.Details || '').trim();
        return `<article class="board-card contract-card">
          <div class="board-title">${esc(job.Title)}</div>
          <div class="board-pay">${esc(job.Pay)}</div>
          <div class="board-meta">${esc(job.Employer)}${job['Work Type'] ? ` · ${esc(job['Work Type'])}` : ''}</div>
          ${qualificationBox(job)}
          <div class="board-summary">${esc(job.Summary)}</div>
          ${details ? `<details class="board-details"><summary>View Details</summary><div>${esc(details)}</div></details>` : ''}
          ${betweenSessionBlock(job)}
          ${jobId ? `<button class="board-action" type="button" data-accept-job="${esc(jobId)}">ACCEPT CONTRACT</button>` : ''}
        </article>`;
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
        const key = `${String(row.Title || '').trim()}\u241f${String(row.Price || '').trim()}\u241f${String(row.Category || '').trim()}`;
        return `<article class="board-card classified-card">
          <div class="board-title">${esc(row.Title)}</div>
          <div class="board-pay">${esc(row.Price)}</div>
          <div class="board-meta">${esc(row.Category)}</div>
          <div class="board-summary">${esc(row.Description)}</div>
          ${wanted ? '' : `<button class="board-action" type="button" data-request-classified="${esc(key)}">REQUEST ITEM</button>`}
        </article>`;
      }).join('');
    }

    function renderCurrent() {
      subtitle.textContent = state.mode === 'jobs'
        ? 'Independent work listings — review terms before acceptance.'
        : 'Secondhand goods, surplus equipment, lease transfers, and things somebody wants gone.';
      footer.textContent = state.mode === 'jobs'
        ? 'GOOD FIT is advisory. PREFERRED SKILLS strengthen a bid but are not mandatory. REQUIRED SKILLS and formal qualification terms are hard gates where shown.'
        : 'Listings are seller-supplied. Condition, compatibility, title, transport, installation, certification, and facility approval remain the buyer’s responsibility unless the listing says otherwise.';
      status.textContent = state.mode === 'jobs' ? state.jobsSource : state.classifiedsSource;
      transport.textContent = state.mode === 'jobs' ? state.qualificationTransport : state.classifiedsTransport;
      if (state.mode === 'jobs') renderJobs(); else renderClassifieds();
    }

    async function refreshEligibility() {
      const jobIds = state.jobs.map(job => String(job['Job ID'] || '').trim()).filter(Boolean);
      if (!jobIds.length) {
        state.eligibility = {};
        state.eligibilityValid = true;
        state.qualificationTransport = 'QUALIFICATION TRANSPORT // POST COMPATIBILITY';
        try {
          localStorage.setItem(ELIGIBILITY_CACHE, '{}');
          localStorage.setItem(ELIGIBILITY_LIVE, '1');
        } catch (_) {}
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
        state.qualificationTransport = 'QUALIFICATION TRANSPORT // POST COMPATIBILITY';
        try {
          localStorage.setItem(ELIGIBILITY_CACHE, JSON.stringify(state.eligibility));
          localStorage.setItem(ELIGIBILITY_LIVE, '1');
        } catch (_) {}
      } catch (_) {
        state.qualificationTransport = state.eligibilityValid
          ? 'QUALIFICATION TRANSPORT // CACHED'
          : 'QUALIFICATION TRANSPORT // UNAVAILABLE';
      }
      renderCurrent();
    }

    async function loadJobs() {
      state.jobsSource = 'LOADING CONTRACTS…';
      renderCurrent();
      try {
        const rows = await loadJobsSheet();
        state.jobs = rows.sort((a, b) => Number(a['Sort Order'] || 9999) - Number(b['Sort Order'] || 9999));
        state.jobsSource = `LIVE // Contracts loaded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        saveCache(JOBS_CACHE, JOBS_TIME, state.jobs);
      } catch (error) {
        const cached = readCache(JOBS_CACHE, JOBS_TIME);
        state.jobs = cached.rows;
        state.jobsSource = cached.rows.length
          ? `CACHED / STALE // Contracts last loaded: ${cached.time || 'unknown'}`
          : `CONTRACT DATA UNAVAILABLE // ${String(error?.message || error)}`;
      }
      configureFilters();
      renderCurrent();
      await refreshEligibility();
    }

    async function loadClassifieds() {
      state.classifiedsSource = 'LOADING CLASSIFIEDS…';
      state.classifiedsTransport = 'CLASSIFIEDS TRANSPORT // CHECKING';
      renderCurrent();
      try {
        const response = await postRequest('classifiedsfeed', {}, 30000);
        if (!response?.ok || !Array.isArray(response.classifieds)) {
          throw new Error(response?.error || 'Classifieds feed unavailable.');
        }
        state.classifieds = response.classifieds.sort((a, b) => Number(a['Sort Order'] || 9999) - Number(b['Sort Order'] || 9999));
        state.classifiedsSource = `LIVE // Classifieds loaded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        state.classifiedsTransport = 'CLASSIFIEDS TRANSPORT // POST COMPATIBILITY';
        saveCache(CLASSIFIEDS_CACHE, CLASSIFIEDS_TIME, state.classifieds);
      } catch (error) {
        const cached = readCache(CLASSIFIEDS_CACHE, CLASSIFIEDS_TIME);
        state.classifieds = cached.rows;
        state.classifiedsSource = cached.rows.length
          ? `CACHED / STALE // Classifieds last loaded: ${cached.time || 'unknown'}`
          : `CLASSIFIED DATA UNAVAILABLE // ${String(error?.message || error)}`;
        state.classifiedsTransport = cached.rows.length
          ? 'CLASSIFIEDS TRANSPORT // CACHED'
          : 'CLASSIFIEDS TRANSPORT // UNAVAILABLE';
      }
      configureFilters();
      renderCurrent();
    }

    async function refreshAll() {
      refreshButton.disabled = true;
      try {
        if (state.mode === 'jobs') await loadJobs();
        else await loadClassifieds();
      } finally {
        refreshButton.disabled = false;
      }
    }

    function setModalOpen(open) {
      document.body.classList.toggle('modal-open', open);
    }

    function ensureAcceptanceModal() {
      let modal = document.getElementById('boardAcceptanceModal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'boardAcceptanceModal';
      modal.className = 'board-modal hidden';
      modal.innerHTML = `
        <div class="board-modal-shell" role="dialog" aria-modal="true" aria-label="Contract acceptance">
          <button type="button" class="board-modal-close" data-accept-close aria-label="Close">×</button>
          <div class="board-modal-kicker">THE HUB // CONTRACTING SYSTEM</div>
          <h2 data-accept-title>Contract Acceptance</h2>
          <div class="board-modal-section">
            <div class="board-modal-label">PARTICIPATING CHARACTERS</div>
            <div data-accept-characters class="board-character-list"></div>
          </div>
          <div class="board-modal-section" data-accept-pin-wrap>
            <label class="board-modal-label" for="boardAcceptPin">BOARD ACCESS CODE</label>
            <input id="boardAcceptPin" data-accept-pin type="password" autocomplete="off" placeholder="Enter terminal code">
          </div>
          <div class="board-result hidden" data-accept-result></div>
          <div class="board-qualification-action hidden" data-contractor-action>
            <div class="board-modal-label">ADDITIONAL QUALIFIED STAFF REQUIRED</div>
            <p data-contractor-message></p>
            <label class="board-modal-label" for="boardContractorName">QUALIFIED CONTRACTOR</label>
            <input id="boardContractorName" data-contractor-name maxlength="80" placeholder="Contractor name">
            <div class="board-field-grid">
              <div><label class="board-modal-label" for="boardContractorType">COMPENSATION TYPE</label><select id="boardContractorType" data-contractor-type><option value="credits">Fixed credits</option><option value="share">Mission share (%)</option></select></div>
              <div><label class="board-modal-label" for="boardContractorAmount">COMPENSATION</label><input id="boardContractorAmount" data-contractor-amount type="number" min="0" step="1" placeholder="Amount"></div>
            </div>
            <div class="board-modal-actions"><button type="button" class="board-action" data-contractor-submit>SUBMIT CONTRACTOR</button></div>
          </div>
          <div class="board-qualification-action hidden" data-authorization-action>
            <div class="board-modal-label">QUALIFICATION REVIEW</div>
            <p data-authorization-message></p>
            <div class="board-modal-actions"><button type="button" class="board-action" data-authorization-request>REQUEST AUTHORIZATION</button></div>
          </div>
          <div class="board-accept-reveal hidden" data-accept-reveal></div>
          <div class="board-terminal hidden" data-accept-terminal></div>
          <div class="board-modal-actions" data-accept-main-actions>
            <button type="button" class="board-action" data-accept-validate>VALIDATE &amp; ACCEPT</button>
            <button type="button" class="board-secondary-action" data-accept-cancel>CANCEL</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', event => {
        if (event.target === modal || event.target.closest('[data-accept-close], [data-accept-cancel]')) closeAcceptanceModal();
        if (event.target.closest('[data-accept-validate]')) validateAcceptance(false, null);
        if (event.target.closest('[data-contractor-submit]')) submitContractor();
        if (event.target.closest('[data-authorization-request]')) requestAuthorization();
      });
      return modal;
    }

    function closeAcceptanceModal() {
      const modal = document.getElementById('boardAcceptanceModal');
      if (!modal || modal.dataset.busy === '1') return;
      modal.classList.add('hidden');
      setModalOpen(false);
      state.acceptance = null;
    }

    function acceptanceParticipants(modal) {
      return [...modal.querySelectorAll('[data-accept-character]:checked')].map(input => input.value).filter(Boolean);
    }

    function acceptanceResult(message, kind = '') {
      const modal = ensureAcceptanceModal();
      const el = modal.querySelector('[data-accept-result]');
      el.textContent = String(message || '');
      el.className = 'board-result' + (kind ? ` ${kind}` : '');
    }

    function setAcceptanceBusy(busy) {
      const modal = ensureAcceptanceModal();
      modal.dataset.busy = busy ? '1' : '0';
      modal.querySelectorAll('button, input, select').forEach(el => {
        if (el.matches('[data-accept-close], [data-accept-cancel]')) el.disabled = busy;
        else if (!el.closest('.hidden')) el.disabled = busy;
      });
    }

    function showAcceptanceAction(kind, message) {
      const modal = ensureAcceptanceModal();
      modal.querySelector('[data-contractor-action]').classList.toggle('hidden', kind !== 'contractor');
      modal.querySelector('[data-authorization-action]').classList.toggle('hidden', kind !== 'authorization');
      modal.querySelector('[data-accept-main-actions]').classList.add('hidden');
      if (kind === 'contractor') modal.querySelector('[data-contractor-message]').textContent = message || 'The crew needs an additional qualified contractor.';
      if (kind === 'authorization') modal.querySelector('[data-authorization-message]').textContent = message || 'Employer authorization is required to proceed.';
    }

    async function openAcceptance(jobId) {
      const job = state.jobs.find(row => String(row['Job ID'] || '').trim() === jobId);
      if (!job) return;
      const modal = ensureAcceptanceModal();
      state.acceptance = { jobId, job, contractorConfirmed: false, contractorRecord: null, authorization: false, session: '' };
      modal.dataset.busy = '0';
      modal.querySelector('[data-accept-title]').textContent = String(job.Title || 'Contract Acceptance');
      modal.querySelector('[data-accept-result]').className = 'board-result hidden';
      modal.querySelector('[data-contractor-action]').classList.add('hidden');
      modal.querySelector('[data-authorization-action]').classList.add('hidden');
      modal.querySelector('[data-accept-reveal]').classList.add('hidden');
      modal.querySelector('[data-accept-terminal]').classList.add('hidden');
      modal.querySelector('[data-accept-main-actions]').classList.remove('hidden');
      modal.querySelector('[data-accept-pin]').value = '';
      modal.querySelector('[data-contractor-name]').value = '';
      modal.querySelector('[data-contractor-type]').value = 'credits';
      modal.querySelector('[data-contractor-amount]').value = '';
      modal.querySelector('[data-accept-pin-wrap]').classList.toggle('hidden', Boolean(readSession()));
      modal.querySelector('[data-accept-characters]').innerHTML = '<div class="board-modal-muted">Loading characters…</div>';
      modal.classList.remove('hidden');
      setModalOpen(true);
      setAcceptanceBusy(true);
      try {
        const setup = await postRequest('setup', { job: jobId }, 30000);
        if (!setup?.ok || !Array.isArray(setup.characters) || !setup.characters.length) {
          throw new Error(setup?.message || setup?.error || 'Contract setup unavailable.');
        }
        modal.querySelector('[data-accept-title]').textContent = setup.title || job.Title || 'Contract Acceptance';
        modal.querySelector('[data-accept-characters]').innerHTML = setup.characters.map(character => `
          <label class="board-character-option"><input type="checkbox" data-accept-character value="${esc(character)}" checked> <span>${esc(character)}</span></label>`).join('');
      } catch (error) {
        acceptanceResult(String(error?.message || error), 'bad');
      } finally {
        setAcceptanceBusy(false);
      }
    }

    async function validateAcceptance(contractorConfirmed, contractorRecord) {
      const modal = ensureAcceptanceModal();
      if (!state.acceptance || modal.dataset.busy === '1') return;
      const participants = acceptanceParticipants(modal);
      if (!participants.length) {
        acceptanceResult('Select at least one participating character.', 'bad');
        return;
      }
      setAcceptanceBusy(true);
      try {
        const session = await ensureSession(modal.querySelector('[data-accept-pin]').value);
        state.acceptance.session = session;
        state.acceptance.participants = participants;
        state.acceptance.contractorConfirmed = Boolean(contractorConfirmed);
        state.acceptance.contractorRecord = contractorRecord || null;
        modal.querySelector('[data-accept-pin-wrap]').classList.add('hidden');
        const response = await postRequest('validate', {
          job: state.acceptance.jobId,
          participants,
          session,
          contractor: Boolean(contractorConfirmed),
          contractorName: contractorRecord?.name || '',
          contractorCompensationType: contractorRecord?.type || '',
          contractorCompensation: contractorRecord?.amount ?? ''
        }, 35000);
        await handleValidation(response);
      } catch (error) {
        acceptanceResult(String(error?.message || error), 'bad');
      } finally {
        setAcceptanceBusy(false);
      }
    }

    async function handleValidation(response) {
      if (!state.acceptance) return;
      if (!response || response.ok === false) {
        acceptanceResult(response?.error || response?.message || 'No validation response was received.', 'bad');
        return;
      }
      if (response.result === 'ACCEPTABLE') {
        state.eligibility[state.acceptance.jobId] = 'READY';
        renderCurrent();
        await finalizeAcceptance();
        return;
      }
      if (response.result === 'ADDITIONAL QUALIFIED STAFF REQUIRED') {
        state.eligibility[state.acceptance.jobId] = 'ACTION';
        renderCurrent();
        showAcceptanceAction('contractor', response.message);
        return;
      }
      if (response.result === 'QUALIFICATION REVIEW') {
        state.eligibility[state.acceptance.jobId] = 'ACTION';
        renderCurrent();
        showAcceptanceAction('authorization', response.message);
        return;
      }
      acceptanceResult(`${response.result || 'CONTRACT CANNOT BE ACCEPTED'}\n\n${response.message || 'Qualification requirements are not met.'}`, response.result === 'NOT YET AVAILABLE' ? 'warn' : 'bad');
    }

    async function submitContractor() {
      const modal = ensureAcceptanceModal();
      const name = String(modal.querySelector('[data-contractor-name]').value || '').trim();
      const type = String(modal.querySelector('[data-contractor-type]').value || 'credits');
      const raw = String(modal.querySelector('[data-contractor-amount]').value || '').trim();
      const amount = Number(raw);
      if (!name) { acceptanceResult("Enter the qualified contractor's name.", 'bad'); return; }
      if (raw === '' || !Number.isFinite(amount) || amount < 0) { acceptanceResult('Enter valid contractor compensation.', 'bad'); return; }
      await validateAcceptance(true, { name, type, amount });
    }

    async function requestAuthorization() {
      const modal = ensureAcceptanceModal();
      if (!state.acceptance || modal.dataset.busy === '1') return;
      setAcceptanceBusy(true);
      try {
        const response = await postRequest('authorize', {
          job: state.acceptance.jobId,
          participants: state.acceptance.participants || acceptanceParticipants(modal),
          session: state.acceptance.session,
          contractor: Boolean(state.acceptance.contractorConfirmed)
        }, 35000);
        if (!response || response.ok === false) throw new Error(response?.error || response?.message || 'Authorization unavailable.');
        if (response.result !== 'AUTHORIZED' || response.authorized !== true) {
          acceptanceResult(response.message || 'Authorization denied.', 'bad');
          return;
        }
        state.acceptance.authorization = true;
        await finalizeAcceptance();
      } catch (error) {
        acceptanceResult(String(error?.message || error), 'bad');
      } finally {
        setAcceptanceBusy(false);
      }
    }

    async function finalizeAcceptance() {
      const modal = ensureAcceptanceModal();
      if (!state.acceptance) return;
      setAcceptanceBusy(true);
      try {
        const record = state.acceptance.contractorRecord || {};
        const response = await postRequest('accept', {
          job: state.acceptance.jobId,
          participants: state.acceptance.participants || acceptanceParticipants(modal),
          session: state.acceptance.session,
          contractor: Boolean(state.acceptance.contractorConfirmed),
          authorization: Boolean(state.acceptance.authorization),
          contractorName: record.name || '',
          contractorCompensationType: record.type || '',
          contractorCompensation: record.amount ?? ''
        }, 40000);
        if (!response || response.ok === false || response.accepted !== true) {
          throw new Error(response?.message || response?.error || 'Contract acceptance failed.');
        }
        acceptanceResult(response.message || 'CONTRACT ACCEPTED', 'ok');
        modal.querySelector('[data-contractor-action]').classList.add('hidden');
        modal.querySelector('[data-authorization-action]').classList.add('hidden');
        modal.querySelector('[data-accept-main-actions]').classList.add('hidden');
        const reveal = modal.querySelector('[data-accept-reveal]');
        const revealParts = [];
        if (response.employer) revealParts.push(`<div><span>EMPLOYER / SOURCE</span><strong>${esc(response.employer)}</strong></div>`);
        if (response.location) revealParts.push(`<div><span>AUTHORIZED LOCATION</span><strong>${esc(response.location)}</strong></div>`);
        if (revealParts.length) {
          reveal.innerHTML = revealParts.join('');
          reveal.classList.remove('hidden');
        }
        const terminal = modal.querySelector('[data-accept-terminal]');
        if (response.brief && String(response.brief.format || '').toUpperCase() === 'TERMINAL_TEXT' && String(response.brief.text || '').trim()) {
          terminal.innerHTML = `<div class="board-terminal-head">ACCEPTED ASSIGNMENT // SECURE OUTPUT</div><pre>${esc(response.brief.text)}</pre>`;
          terminal.classList.remove('hidden');
        }
        state.jobs = state.jobs.filter(job => String(job['Job ID'] || '').trim() !== state.acceptance.jobId);
        saveCache(JOBS_CACHE, JOBS_TIME, state.jobs);
        configureFilters();
        renderCurrent();
      } catch (error) {
        acceptanceResult(String(error?.message || error), 'bad');
      } finally {
        setAcceptanceBusy(false);
      }
    }

    function ensureRequestModal() {
      let modal = document.getElementById('boardClassifiedRequestModal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'boardClassifiedRequestModal';
      modal.className = 'board-modal hidden';
      modal.innerHTML = `
        <div class="board-modal-shell" role="dialog" aria-modal="true" aria-label="Request classified item">
          <button type="button" class="board-modal-close" data-request-close aria-label="Close">×</button>
          <div class="board-modal-kicker">CLASSIFIED PURCHASE REQUEST</div>
          <h2 data-request-title></h2>
          <div class="board-request-price" data-request-price></div>
          <div class="board-modal-section">
            <label class="board-modal-label" for="boardRequestCharacter">REQUESTING CHARACTER</label>
            <select id="boardRequestCharacter" data-request-character></select>
          </div>
          <div class="board-modal-section" data-request-pin-wrap>
            <label class="board-modal-label" for="boardRequestPin">BOARD ACCESS CODE</label>
            <input id="boardRequestPin" data-request-pin type="password" autocomplete="off" placeholder="Enter terminal code">
          </div>
          <div class="board-result hidden" data-request-result></div>
          <div class="board-modal-actions"><button type="button" class="board-action" data-request-submit>SEND REQUEST</button><button type="button" class="board-secondary-action" data-request-cancel>CANCEL</button></div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', event => {
        if (event.target === modal || event.target.closest('[data-request-close], [data-request-cancel]')) closeRequestModal();
        if (event.target.closest('[data-request-submit]')) submitClassifiedRequest();
      });
      return modal;
    }

    function closeRequestModal() {
      const modal = document.getElementById('boardClassifiedRequestModal');
      if (!modal || modal.dataset.busy === '1') return;
      modal.classList.add('hidden');
      setModalOpen(false);
      state.requestItem = null;
    }

    function requestResult(message, kind = '') {
      const modal = ensureRequestModal();
      const el = modal.querySelector('[data-request-result]');
      el.textContent = String(message || '');
      el.className = 'board-result' + (kind ? ` ${kind}` : '');
    }

    function setRequestBusy(busy) {
      const modal = ensureRequestModal();
      modal.dataset.busy = busy ? '1' : '0';
      modal.querySelectorAll('button, input, select').forEach(el => { el.disabled = busy; });
    }

    async function openClassifiedRequest(key) {
      const row = state.classifieds.find(item => `${String(item.Title || '').trim()}\u241f${String(item.Price || '').trim()}\u241f${String(item.Category || '').trim()}` === key);
      if (!row) return;
      const modal = ensureRequestModal();
      state.requestItem = row;
      modal.querySelector('[data-request-title]').textContent = row.Title || 'Classified Item';
      modal.querySelector('[data-request-price]').textContent = row.Price || '';
      modal.querySelector('[data-request-result]').className = 'board-result hidden';
      modal.querySelector('[data-request-pin]').value = '';
      modal.querySelector('[data-request-pin-wrap]').classList.toggle('hidden', Boolean(readSession()));
      modal.querySelector('[data-request-character]').innerHTML = '<option>Loading…</option>';
      modal.classList.remove('hidden');
      setModalOpen(true);
      setRequestBusy(true);
      try {
        if (!state.requestCharacters.length) {
          const setup = await postRequest('classifiedrequestsetup', {}, 30000);
          if (!setup?.ok || !Array.isArray(setup.characters) || !setup.characters.length) {
            throw new Error(setup?.error || 'Classified request setup unavailable.');
          }
          state.requestCharacters = setup.characters.map(String).filter(Boolean);
        }
        modal.querySelector('[data-request-character]').innerHTML = state.requestCharacters.map(character => `<option value="${esc(character)}">${esc(character)}</option>`).join('');
      } catch (error) {
        requestResult(String(error?.message || error), 'bad');
      } finally {
        setRequestBusy(false);
      }
    }

    async function submitClassifiedRequest() {
      const modal = ensureRequestModal();
      if (!state.requestItem || modal.dataset.busy === '1') return;
      const character = String(modal.querySelector('[data-request-character]').value || '').trim();
      if (!character) { requestResult('Select the requesting character.', 'bad'); return; }
      setRequestBusy(true);
      try {
        const session = await ensureSession(modal.querySelector('[data-request-pin]').value);
        modal.querySelector('[data-request-pin-wrap]').classList.add('hidden');
        const item = state.requestItem;
        const response = await postRequest('classifiedrequest', {
          session,
          character,
          title: item.Title,
          price: item.Price,
          category: item.Category
        }, 35000);
        if (!response?.ok) throw new Error(response?.error || response?.message || 'Request could not be recorded.');
        requestResult('REQUEST SENT // AWAITING WARDEN DECISION', 'ok');
        state.classifieds = state.classifieds.filter(row => row !== item);
        saveCache(CLASSIFIEDS_CACHE, CLASSIFIEDS_TIME, state.classifieds);
        configureFilters();
        renderCurrent();
        setTimeout(() => {
          if (modal.dataset.busy !== '1') closeRequestModal();
        }, 900);
      } catch (error) {
        requestResult(String(error?.message || error), 'bad');
      } finally {
        setRequestBusy(false);
      }
    }

    [search, primary, secondary].forEach(element => element.addEventListener('input', renderCurrent));
    clearButton.addEventListener('click', () => {
      search.value = '';
      primary.value = '';
      secondary.value = '';
      state.qualificationFilter = 'all';
      qFilter.querySelectorAll('[data-qf]').forEach(button => button.classList.toggle('active', button.dataset.qf === 'all'));
      renderCurrent();
    });
    refreshButton.addEventListener('click', refreshAll);
    qFilter.addEventListener('click', event => {
      const button = event.target.closest('[data-qf]');
      if (!button) return;
      state.qualificationFilter = button.dataset.qf || 'all';
      qFilter.querySelectorAll('[data-qf]').forEach(item => item.classList.toggle('active', item === button));
      renderCurrent();
    });
    cards.addEventListener('click', event => {
      const accept = event.target.closest('[data-accept-job]');
      if (accept) { openAcceptance(String(accept.dataset.acceptJob || '').trim()); return; }
      const request = event.target.closest('[data-request-classified]');
      if (request) openClassifiedRequest(String(request.dataset.requestClassified || ''));
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      closeAcceptanceModal();
      closeRequestModal();
    });

    root.dataset.rendered = 'true';
    configureFilters();
    renderCurrent();
    refreshAll();
  }

  window.HubBoardContent = Object.freeze({ build: BUILD, render });
})();
