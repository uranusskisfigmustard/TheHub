(() => {
  'use strict';

  const BUILD = '20260920-board-prod-2';
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

  // Player-facing contract text is normalized here as a final publication
  // boundary. The source sheet remains authoritative for lifecycle, sorting,
  // qualifications, acceptance, and Warden-only material.
  const PUBLIC_POSTING_OVERRIDES = Object.freeze({
    'HRT-IW79-2SES': {
      Summary: 'Recover sealed high-value property before an off-Hub transfer changes custody.',
      Details: `EXPECTED WORK
- Confirm the assigned property and authorized recipient after the briefing.
- Develop a safe recovery plan within the access actually provided.
- Deliver the property intact and document the final handoff.

AUTHORIZED / PROVIDED
- Assignment-specific identity and custody records after the offer is engaged.
- Responsible contacts, local access, and ordinary handling or security support within their authority.

RESTRICTED
- Employer identity, exact site, and transfer arrangements are disclosed only when the offer is engaged.
- No unrestricted search, detention, lethal-force, or decryption authority.
- Do not open, copy, or retain the property under this contract.

KNOWN RISKS
- Active industrial handling, moving equipment, contested custody, and third-party interference.

SUCCESSFUL CLOSEOUT
- The authorized recipient accepts the intact property and the handoff is recorded.

COMPENSATION
- 7,500cr crew-wide for the intact property delivered to the authorized recipient.
- A materially different outcome requires an explicit agreement.`
    },
    'WKL-RCVR-5K00': {
      Summary: 'Recover stranded personnel and a positioning machine from damaged industrial access, preserve a usable pedestrian route, and arrange an accepted handoff.',
      Details: `EXPECTED WORK
- Reach and support the people stranded with the positioning machine.
- Establish safe access and recover the people and machine, or arrange a qualified takeover.
- Preserve the records and materials needed for an accurate handoff.
- Arrange an accepted handoff or another agreed closeout.

AUTHORIZED / PROVIDED
- Assignment access to the affected work area.
- Available anchors, hoists, response support, transport assistance, and relevant recovery records.
- Qualified medical, rigging, or handling support when requested and accepted.

RESTRICTED
- Recovery grants no ownership of the machine or other property.
- Structural certification and unrelated building work are outside scope.
- Materially expanded work requires agreement before commitment.

KNOWN RISKS
- Damaged access, difficult movement, heavy equipment, and injured personnel.

SUCCESSFUL CLOSEOUT
- The people and machine are safe, pedestrian access is supported, and a responsible party accepts the handoff or agreed revised closeout.

COMPENSATION
- 5,000cr crew-wide for an accepted closeout.
- Approved operating resources are supplied or reimbursed separately.`
    },
    'CCN-MEDS-5K00': {
      Summary: 'A clinic has received temperature-controlled medicine after one container recorded an interrupted cooling interval. Determine what can be accepted, what must be isolated, and how remaining doses can reach patients safely.',
      Details: `EXPECTED WORK
- Secure appropriate handling and distribution space.
- Reconstruct the cooling interruption from the available sensor, seal, timestamp, and custody records.
- Assess the affected medicine with clinic staff.
- Document a medically authorized handling and distribution plan.

AUTHORIZED / PROVIDED
- Assignment access to the receiving area, shipment records, sensors, seals, and available cold storage.
- Clinic staff with authority to determine medical release or isolation.
- Approved handling supplies and ordinary operating expenses.

RESTRICTED
- The crew does not gain independent authority to prescribe, medically release, destroy, or divert medicine.
- Exact clinic, recipients, and distribution arrangements are disclosed on acceptance.

KNOWN RISKS
- Loss of temperature control, damaged evidence, unusable medicine, and delay to patients.

SUCCESSFUL CLOSEOUT
- The clinic accepts a documented disposition for the affected medicine and a viable plan for safe delivery or continued custody.

COMPENSATION
- 5,000cr crew-wide for the accepted documented disposition and distribution plan.
- Approved ordinary handling and transfer costs are separate.`
    },
    'FIS-M5QA-5K00': {
      Summary: 'A supervised preservation inspection of the Marrowell shuttle is scheduled under Ledger Quay custody. Document its condition and any work requested during the appointment.',
      Details: `EXPECTED WORK
- Establish safe supervised access and inspect the shuttle's current condition.
- Compare physical systems, logs, and custody records.
- Document authorized preservation work and unresolved safety issues.
- Close the appointment with an accepted condition record.

AUTHORIZED / PROVIDED
- Supervised assignment access to the shuttle and relevant custody records.
- Routine safety support and preservation materials within the approved appointment.
- Responsible custody and technical contacts.

RESTRICTED
- This contract does not decide title or transfer custody.
- No general Ledger Quay access, launch authority, or recommissioning authority is granted.
- Work outside the written inspection and preservation scope requires separate approval before commitment.

KNOWN RISKS
- Stored energy, life-support systems, confined access, and degraded materials.

SUCCESSFUL CLOSEOUT
- The custodian accepts a defensible condition record.
- Authorized preservation is completed or safely deferred with responsibility documented.

COMPENSATION
- 5,000cr crew-wide for the accepted inspection and preservation closeout.
- Approved ordinary preservation materials are supplied or reimbursed separately.`
    },
    'EMR-7K2V-4Q9C': {
      Summary: 'A repaired work area is about to reopen. The crew wants a practical evacuation and safe-retreat plan suited to the people and equipment available.',
      Details: `EXPECTED WORK
- Review the work area, crew roles, mobility limits, and credible retreat hazards.
- Produce a practical evacuation, muster, and safe-retreat plan.
- Conduct a controlled drill and record the result, delays, and unresolved gaps.

AUTHORIZED / PROVIDED
- Assignment access to the work area, current layout, duty roster, alarms, and ordinary shutdown controls.
- A responsible supervisor and participating work crew for the controlled drill.

RESTRICTED
- The drill does not authorize an uncontrolled alarm, hazardous equipment release, or obstruction of active emergency routes.
- Reopening approval remains with the responsible operator.

KNOWN RISKS
- Congestion, alarm confusion, limited mobility, equipment conflicts, and drill-related stress.

SUCCESSFUL CLOSEOUT
- The crew completes the drill and the responsible supervisor accepts a documented plan, including any condition that must be met before reopening.

COMPENSATION
- 600cr to the completing PC.`
    },
    'BNC-5P8L-2R6T': {
      Summary: 'A repair shop\'s bench-power regulator shuts down whenever two particular tools operate together. Each tool passes inspection alone, and the shop will not reopen the bench until the interaction is understood and a safe arrangement is proven.',
      Details: `EXPECTED WORK
- Review the regulator, tool, and prior shutdown records.
- Test the individual and combined loads under controlled conditions.
- Identify the cause well enough to establish and verify a safe operating arrangement.
- Record the tested limits and final configuration.

AUTHORIZED / PROVIDED
- Supervised access to the bench, affected tools, isolation controls, meters, and suitable test loads.
- Repair-shop staff familiar with the equipment and prior shutdowns.

RESTRICTED
- Do not bypass protective devices, conduct destructive testing, or return the bench to service without the shop's approval.
- Unrelated electrical work and tool modification are outside scope.

KNOWN RISKS
- Electrical shock, arcing, overheating, equipment damage, and unexpected shutdown.

SUCCESSFUL CLOSEOUT
- The shop accepts a repeatable test record and a safe arrangement that remains stable under realistic combined load.

COMPENSATION
- 600cr to the completing PC.`
    },
    'WCC-9N4K-7V3M': {
      Summary: 'The living organism recovered from the Sample Workshop is stable in temporary containment, but the enclosure was not designed as a long-term environment. Its environmental needs are not yet known, and no reliable way to exchange basic signals with it has been established.',
      Details: `EXPECTED WORK
- Establish a safe environmental baseline and observe the organism's responses to controlled changes.
- Define sustainable containment conditions using the available evidence.
- Establish a repeatable method for exchanging at least one basic signal in each direction.
- Record the conditions, responses, uncertainties, and care limits.

AUTHORIZED / PROVIDED
- Controlled access to the enclosure, environmental controls, sensors, observation records, and ordinary habitat materials.
- A responsible containment contact for safety decisions and handoff.

RESTRICTED
- No invasive procedure, drugging, deliberate distress, release, or transport is authorized.
- A repeatable response must not be represented as language or comprehension without supporting evidence.

KNOWN RISKS
- Unknown biological exposure, containment disturbance, environmental instability, and misinterpretation of behavior.

SUCCESSFUL CLOSEOUT
- The responsible contact accepts stable interim care parameters and a documented, repeatable baseline communication method with its limits clearly stated.

COMPENSATION
- 600cr to the completing PC.`
    },
    'KBW-6T2P-8L5R': {
      Summary: 'A food cooperative’s nutrient-return pump is failing. A replacement is available, but removing the old pump will stop circulation to occupied grow beds long enough to damage part of the crop.',
      Details: `EXPECTED WORK
- Inspect the failing pump, connected beds, and available replacement.
- Plan and carry out the replacement while maintaining adequate support for the occupied beds.
- Test restored circulation under normal load and document any remaining limits.

AUTHORIZED / PROVIDED
- Assignment access to the pump, grow beds, isolation controls, replacement unit, tools, and ordinary consumables.
- Cooperative staff familiar with the crop and current operating limits.

RESTRICTED
- Do not discard viable crop, alter nutrient chemistry, or modify unrelated systems without approval.
- Work beyond the pump replacement and immediate circulation support requires separate agreement.

KNOWN RISKS
- Wet electrical equipment, pressurized fluid, contamination, cramped access, and crop loss during interrupted circulation.

SUCCESSFUL CLOSEOUT
- The replacement pump holds required flow, the occupied beds remain viable, and the cooperative accepts the documented handoff.

COMPENSATION
- 1,500cr crew-wide.`
    },
    'TCC-4Q7V-9N2K': {
      Summary: 'A freight-routing controller has lost its live lane map after twelve secured cargo carts were staged. The carts cannot be released until their destinations, movement routes, custody records, and handling limits agree. Some cargo is temperature-sensitive, and two carts carry the same obsolete route code even though they have different destinations.',
      Details: `EXPECTED WORK
- Reconstruct the twelve carts' destinations, handling limits, custody state, and usable movement routes from the available records.
- Contact the responsible parties needed to resolve contradictory or incomplete entries.
- Produce a release sequence and route map that keeps unresolved carts controlled.
- Record the evidence and exceptions supporting each release decision.

AUTHORIZED / PROVIDED
- Assignment access to manifests, cart labels and seals, custody records, route information, and the responsible contacts.
- A freight controller with authority to approve or hold each release.

RESTRICTED
- Do not break seals, alter cargo, invent missing custody, or move a cart without controller approval.
- Authority is limited to reconciling and planning the staged carts named in the assignment.

KNOWN RISKS
- Temperature delay, custody mismatch, congestion, handling-limit conflict, and misrouting.

SUCCESSFUL CLOSEOUT
- The controller accepts a traceable lane map and release sequence; any unresolved cart is clearly identified and remains safely held.

COMPENSATION
- 1,500cr crew-wide.`
    },
    '4FE-96FE-DF05': {
      Summary: 'Sort several years of mixed-language manifests, equipment descriptions, and handoff notes into usable categories for later reconciliation.',
      Details: `EXPECTED WORK
- Interpret and categorize the mixed-language records without losing their source context.
- Build a usable cross-reference for manifests, equipment descriptions, and handoff notes.
- Mark uncertain translations, conflicting identifiers, and gaps that require later review.

AUTHORIZED / PROVIDED
- Access to the assigned record set, available lexicons, prior naming conventions, and a freight contact for procedural questions.

RESTRICTED
- Do not alter source records, invent a translation, or decide ownership or custody from ambiguous text.
- The assignment covers organization and interpretation, not final freight reconciliation.

KNOWN RISKS
- Ambiguous technical language, obsolete terminology, duplicate identifiers, damaged records, and loss of source context.

SUCCESSFUL CLOSEOUT
- The broker accepts an indexed record set with traceable translations and clearly flagged uncertainties.

COMPENSATION
- 600cr to the completing PC.`
    },
    '23N-RM63-D4JZ': {
      Summary: 'Independently inspect a repaired pressure boundary and certify whether it can return to service.',
      Details: `EXPECTED WORK
- Review the named repair, prior defect record, applicable limits, and proposed test plan.
- Inspect the repaired boundary and witness the authorized pressure test.
- Issue a signed certification decision with evidence, operating limits, and unresolved conditions.

AUTHORIZED / PROVIDED
- Controlled access to the named boundary, drawings, repair records, inspection data, test equipment, and site safety controls.
- A responsible operator for isolation, test execution, and final service decision.

RESTRICTED
- Certification authority applies only to the named pressure boundary and documented repair.
- Do not certify missing evidence, bypass test controls, or approve unrelated systems.

KNOWN RISKS
- Stored pressure, sudden decompression, structural failure, debris, and restricted access.

SUCCESSFUL CLOSEOUT
- The responsible operator accepts a defensible signed decision stating whether the boundary may return to service and under what documented limits.

COMPENSATION
- 6,000cr for the accepted certification record.`
    },
    '39A-CEE8-4340': {
      Summary: 'A failed demolition charge is blocking re-entry to a restricted industrial area. Inspect it and complete an authorized render-safe or disposal operation.',
      Details: `EXPECTED WORK
- Review the charge placement and firing record.
- Establish and maintain the required exclusion area.
- Determine an authorized render-safe, removal, or controlled-disposal method.
- Complete the operation and return a signed disposal record.

AUTHORIZED / PROVIDED
- Assignment-specific access after acceptance and authorization.
- Charge placement and firing records, available test data, site controls, and a responsible blast supervisor.
- Approved disposal equipment and operating costs within the contracted plan.

RESTRICTED
- Employer identity and exact blast zone are disclosed after acceptance.
- Authority applies only to the named failed charge and its immediate safety perimeter.
- No unrelated demolition, salvage, excavation, or alteration is authorized.

KNOWN RISKS
- Unstable explosive material, damaged initiation equipment, accidental or secondary detonation, debris, and structural damage.

SUCCESSFUL CLOSEOUT
- The charge is rendered safe, removed, or disposed of through an authorized method.
- The responsible authority formally releases the exclusion area.
- The operation and remaining limitations are documented.

COMPENSATION
- 3,500cr for the accepted disposal closeout.`
    },
    'O0S-0EVW-5TGA': {
      Summary: 'Identify corrosive residue discovered inside an isolated utility line before maintenance can safely reopen it.',
      Details: `EXPECTED WORK
- Preserve sample identity and review the line's operating and maintenance records.
- Conduct appropriate field measurements and identify the residue to a useful level of confidence.
- Document the hazard, uncertainty, and controls required for later maintenance.

AUTHORIZED / PROVIDED
- Assignment access to the isolated line, existing samples, records, field instruments, protective equipment, and a responsible maintenance contact.

RESTRICTED
- Do not reopen the line, perform unrelated repairs, or remove material beyond authorized sampling.
- The assignment does not grant authority to declare the entire system safe for service.

KNOWN RISKS
- Corrosive, toxic, or reactive material; contaminated surfaces; degraded protective equipment; and residual line energy.

SUCCESSFUL CLOSEOUT
- The client accepts a traceable assay stating the best-supported identification, confidence, limitations, and required handling controls.

COMPENSATION
- 1,500cr crew-wide.`
    }
  });

  function standardizePublicPostings(rows) {
    return (Array.isArray(rows) ? rows : []).map(row => {
      const id = String(row?.['Job ID'] || '').trim();
      const override = PUBLIC_POSTING_OVERRIDES[id];
      return override ? { ...row, ...override } : row;
    });
  }

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

  function requiresCrewInvitation(job) {
    if (!betweenSessionKind(job?.Pay)) return false;
    const match = String(job.Pay || '').match(/([\d,]+(?:\.\d+)?)\s*cr/i);
    return Boolean(match && Number(match[1].replace(/,/g, '')) >= 1000);
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
      liveReady: false,
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

    if (mode === 'jobs') {
      const cached = readCache(JOBS_CACHE, JOBS_TIME);
      if (cached.rows.length) {
        state.jobs = standardizePublicPostings(cached.rows);
        state.jobsSource = `CACHED // REFRESHING // Contracts last loaded: ${cached.time || 'unknown'}`;
        state.qualificationTransport = state.eligibilityValid
          ? 'QUALIFICATION TRANSPORT // CACHED'
          : 'QUALIFICATION TRANSPORT // CHECKING';
      }
    } else {
      const cached = readCache(CLASSIFIEDS_CACHE, CLASSIFIEDS_TIME);
      if (cached.rows.length) {
        state.classifieds = cached.rows;
        state.classifiedsSource = `CACHED // REFRESHING // Classifieds last loaded: ${cached.time || 'unknown'}`;
        state.classifiedsTransport = 'CLASSIFIEDS TRANSPORT // CACHED';
      }
    }

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

    function personalRequestRecipient(job) {
      const workType = String(job['Work Type'] || '').trim();
      const direct = workType.match(/^Personal Request\s*[:—–-]\s*(?:For\s+)?(.+)$/i);
      if (direct) return direct[1].trim();
      const explicit = String(job['Requested PC'] || job['For PC'] || '').trim();
      if (explicit) return explicit;
      const detailHeader = String(job.Details || '').match(/^PERSONAL REQUEST\s*[—–:-]\s*(.+)$/im);
      if (!detailHeader) return '';
      const name = detailHeader[1].trim();
      return name === name.toUpperCase()
        ? name.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase())
        : name;
    }

    function isPersonalRequest(job) {
      return /^Personal Request\b/i.test(String(job['Work Type'] || '').trim()) ||
        /^Personal Request\s*[—–:-]/i.test(String(job.Title || '').trim());
    }

    function personalRequestBlock(job) {
      if (!isPersonalRequest(job)) return '';
      const recipient = personalRequestRecipient(job);
      return `<div class="board-personal-request">
        <span class="board-personal-star" aria-hidden="true">☆</span>
        <div class="board-personal-info">
          <div class="board-personal-label">PERSONAL REQUEST</div>
          ${recipient ? `<div class="board-personal-recipient">For ${esc(recipient)}</div>` : ''}
          <div class="board-personal-crew">CREW PARTICIPATION PERMITTED</div>
        </div>
      </div>`;
    }

    function displayJobTitle(job) {
      const title = String(job.Title || '');
      return isPersonalRequest(job)
        ? title.replace(/^\s*PERSONAL REQUEST\s*[—–:-]\s*/i, '')
        : title;
    }

    function displayJobWorkType(job) {
      const value = String(job['Work Type'] || '').trim();
      if (!isPersonalRequest(job)) return value;
      if (/^Personal Request\s*\//i.test(value)) return value.replace(/^Personal Request\s*\/\s*/i, '');
      if (/^Personal Request\s*[:—–-]/i.test(value)) return '';
      return value;
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
        const action = jobId
          ? state.liveReady
            ? `<button class="board-action" type="button" data-accept-job="${esc(jobId)}">ACCEPT CONTRACT</button>`
            : '<button class="board-action" type="button" disabled>REFRESHING…</button>'
          : '';
        return `<article class="board-card contract-card">
          ${personalRequestBlock(job)}
          <div class="board-title">${esc(displayJobTitle(job))}</div>
          <div class="board-pay">${esc(job.Pay)}</div>
          <div class="board-meta">${esc(job.Employer)}${displayJobWorkType(job) ? ` · ${esc(displayJobWorkType(job))}` : ''}</div>
          ${qualificationBox(job)}
          <div class="board-summary">${esc(job.Summary)}</div>
          ${details ? `<details class="board-details"><summary>View Details</summary><div>${esc(details)}</div></details>` : ''}
          ${betweenSessionBlock(job)}
          ${action}
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
        const action = wanted
          ? ''
          : state.liveReady
            ? `<button class="board-action" type="button" data-request-classified="${esc(key)}">REQUEST ITEM</button>`
            : '<button class="board-action" type="button" disabled>REFRESHING…</button>';
        return `<article class="board-card classified-card">
          <div class="board-title">${esc(row.Title)}</div>
          <div class="board-pay">${esc(row.Price)}</div>
          <div class="board-meta">${esc(row.Category)}</div>
          <div class="board-summary">${esc(row.Description)}</div>
          ${action}
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
      state.liveReady = false;
      state.jobsSource = state.jobs.length ? 'CACHED // REFRESHING CONTRACTS…' : 'LOADING CONTRACTS…';
      renderCurrent();
      try {
        const rows = await loadJobsSheet();
        state.jobs = standardizePublicPostings(rows).sort((a, b) => Number(a['Sort Order'] || 9999) - Number(b['Sort Order'] || 9999));
        state.liveReady = true;
        state.jobsSource = `LIVE // Contracts loaded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        saveCache(JOBS_CACHE, JOBS_TIME, state.jobs);
      } catch (error) {
        state.liveReady = false;
        const cached = readCache(JOBS_CACHE, JOBS_TIME);
        state.jobs = standardizePublicPostings(cached.rows);
        state.jobsSource = cached.rows.length
          ? `CACHED / STALE // Contracts last loaded: ${cached.time || 'unknown'}`
          : `CONTRACT DATA UNAVAILABLE // ${String(error?.message || error)}`;
      }
      configureFilters();
      renderCurrent();
      await refreshEligibility();
    }

    async function loadClassifieds() {
      state.liveReady = false;
      state.classifiedsSource = state.classifieds.length ? 'CACHED // REFRESHING CLASSIFIEDS…' : 'LOADING CLASSIFIEDS…';
      state.classifiedsTransport = state.classifieds.length
        ? 'CLASSIFIEDS TRANSPORT // CACHED'
        : 'CLASSIFIEDS TRANSPORT // CHECKING';
      renderCurrent();
      try {
        const response = await postRequest('classifiedsfeed', {}, 30000);
        if (!response?.ok || !Array.isArray(response.classifieds)) {
          throw new Error(response?.error || 'Classifieds feed unavailable.');
        }
        state.classifieds = response.classifieds.sort((a, b) => Number(a['Sort Order'] || 9999) - Number(b['Sort Order'] || 9999));
        state.liveReady = true;
        state.classifiedsSource = `LIVE // Classifieds loaded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        state.classifiedsTransport = 'CLASSIFIEDS TRANSPORT // POST COMPATIBILITY';
        saveCache(CLASSIFIEDS_CACHE, CLASSIFIEDS_TIME, state.classifieds);
      } catch (error) {
        state.liveReady = false;
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
            <div data-crew-invitation class="board-modal-muted hidden" style="margin-top:12px;padding:10px;border:1px solid #66879a;border-radius:3px">
              <strong>CREW PARTICIPATION</strong>
              <p style="margin:7px 0">This job pays 1,000 credits or more. Include all available PCs, or confirm that you invited the others and they declined.</p>
              <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer"><input type="checkbox" data-crew-declined> <span>I asked the other players. They declined to participate.</span></label>
            </div>
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
      modal.addEventListener('change', event => {
        if (event.target.matches('[data-accept-character]')) {
          modal.querySelector('[data-crew-declined]').checked = false;
          updateCrewInvitation(modal);
        }
      });
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

    function updateCrewInvitation(modal) {
      const inputs = [...modal.querySelectorAll('[data-accept-character]')];
      const required = Boolean(state.acceptance && requiresCrewInvitation(state.acceptance.job));
      const missing = inputs.length > 0 && inputs.some(input => !input.checked);
      modal.querySelector('[data-crew-invitation]').classList.toggle('hidden', !required || !missing);
      if (!required || !missing) modal.querySelector('[data-crew-declined]').checked = false;
    }

    function crewInvitationConfirmed(modal) {
      if (!state.acceptance || !requiresCrewInvitation(state.acceptance.job)) return true;
      const inputs = [...modal.querySelectorAll('[data-accept-character]')];
      return inputs.length > 0 &&
        (inputs.every(input => input.checked) || modal.querySelector('[data-crew-declined]').checked);
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
      if (!job || !state.liveReady) return;
      const modal = ensureAcceptanceModal();
      state.acceptance = { jobId, job, contractorConfirmed: false, contractorRecord: null, authorization: false, session: '' };
      modal.dataset.busy = '0';
      modal.querySelector('[data-accept-title]').textContent = String(job.Title || 'Contract Acceptance');
      modal.querySelector('[data-crew-declined]').checked = false;
      modal.querySelector('[data-crew-invitation]').classList.add('hidden');
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
        updateCrewInvitation(modal);
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
      if (!crewInvitationConfirmed(modal)) {
        acceptanceResult('Select all PCs, or confirm that you asked the other players and they declined.', 'bad');
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
      if (!state.liveReady) return;
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
