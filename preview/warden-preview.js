(() => {
  'use strict';

  const BUILD = '20260919-warden-functional-preview-1';
  const SESSION_KEY = 'hub-preview:warden-session';
  const EXPIRY_KEY = 'hub-preview:warden-expiry';
  const shellRoot = document.getElementById('wardenPreviewShell');
  const contentRoot = document.getElementById('wardenPreviewContent');
  const diagnostic = document.getElementById('wardenPreviewDiagnostic');
  const refreshButton = document.getElementById('wardenPreviewRefresh');
  const lockButton = document.getElementById('wardenPreviewLock');

  const state = {
    session: '',
    expiry: 0,
    feed: null,
    audit: null,
    submissions: [],
    classifieds: null,
    version: null,
    lastRefresh: 0,
    transport: window.HubWardenApi?.transport || 'UNAVAILABLE'
  };

  let shell = null;
  let refreshing = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function setDiagnostic(message) {
    diagnostic.textContent = `${BUILD}\n${message}\nTRANSPORT // ${state.transport}\nNO WATCHERS // NO POLLING // PREVIEW STORAGE ONLY`;
  }

  function clearPreviewSession() {
    state.session = '';
    state.expiry = 0;
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch (_) {}
  }

  function loadPreviewSession() {
    try {
      const session = String(localStorage.getItem(SESSION_KEY) || '').trim();
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
      if (session && expiry > Date.now() + 5000) {
        state.session = session;
        state.expiry = expiry;
        return true;
      }
    } catch (_) {}
    clearPreviewSession();
    return false;
  }

  function savePreviewSession(session, expiry) {
    state.session = String(session || '').trim();
    state.expiry = Number(expiry || 0);
    try {
      localStorage.setItem(SESSION_KEY, state.session);
      localStorage.setItem(EXPIRY_KEY, String(state.expiry));
    } catch (_) {}
  }

  function renderAuth(message = '') {
    contentRoot.innerHTML = `
      <section class="warden-auth-panel">
        <h1>Warden Authentication</h1>
        <p>This preview uses a separate preview-only session. Production Warden storage is not reused.</p>
        <form id="wardenPreviewAuthForm" class="warden-auth-form">
          <label class="warden-field-label">WARDEN ACCESS CODE
            <input id="wardenPreviewPin" class="warden-field" type="password" autocomplete="current-password" required>
          </label>
          <button id="wardenPreviewAuthButton" class="warden-button primary" type="submit">UNLOCK READ-ONLY PREVIEW</button>
        </form>
        <div id="wardenPreviewAuthResult" class="warden-notice${message ? ' bad' : ''}"${message ? '' : ' hidden'}>${message ? esc(message) : ''}</div>
      </section>
    `;
    refreshButton.hidden = true;
    lockButton.hidden = true;
    shell?.setMode('READ-ONLY FUNCTIONAL PREVIEW');
    shell?.setStatusRight('AUTH REQUIRED');
    setDiagnostic('AUTHENTICATION REQUIRED');

    const form = document.getElementById('wardenPreviewAuthForm');
    const button = document.getElementById('wardenPreviewAuthButton');
    const pin = document.getElementById('wardenPreviewPin');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      button.disabled = true;
      button.textContent = 'AUTHENTICATING…';
      try {
        const result = await window.HubWardenApi.request('wardenauth', { pin: pin.value });
        if (!result?.ok || !result.session) throw new Error(result?.error || result?.message || 'Warden authentication failed.');
        savePreviewSession(result.session, result.expiresAt);
        pin.value = '';
        await refreshReads();
      } catch (error) {
        renderAuth(String(error?.message || error));
      }
    });
  }

  function placeholder(workspace) {
    const copy = {
      session: ['Session', 'Session close, between-session administration, and campaign-date processing are still being migrated.', ['Session close', 'Between-session work', 'Campaign date and recurring charges']],
      npcs: ['NPCs', 'NPC continuity tools are still being migrated from watcher-dependent legacy modules.', ['NPC index', 'Current state', 'Explicit portrait/meta load']],
      factions: ['Factions', 'Faction continuity tools are still being migrated.', ['Faction index', 'Access state', 'Obligations and current needs']],
      progression: ['Progression', 'Character and campaign progression administration is still being migrated.', ['PC continuity snapshot', 'Skills / qualifications / legal access', 'Equipment / cybernetics / finances']],
      reference: ['Player Reference', 'Warden Reference editing and publication controls are still being migrated.', ['Draft', 'Exact player preview', 'Publish / stale-section review']],
      admin: ['Admin', 'Administrative maintenance beyond Audit Tools is still being migrated.', ['Derived output maintenance', 'Service state', 'Explicit maintenance actions']]
    };
    const data = copy[workspace.id] || [workspace.label, workspace.summary, ['Workspace']];
    contentRoot.innerHTML = `
      <div class="warden-page-heading"><div><h1>${esc(data[0])}</h1><p>${esc(data[1])}</p></div><div class="warden-status-chip">MIGRATION PENDING</div></div>
      <div class="warden-preview-grid">${data[2].map(item => `<div class="warden-preview-card"><strong>${esc(item).toUpperCase()}</strong><span>Not yet active in this functional preview.</span></div>`).join('')}</div>
    `;
  }

  function renderWorkspace(workspace = shell?.workspace) {
    if (!workspace) return;
    if (!state.session) {
      renderAuth();
      return;
    }
    if (workspace.id === 'dashboard' && window.HubWardenDashboard) {
      window.HubWardenDashboard.render(contentRoot, state);
    } else if (workspace.id === 'contracts' && window.HubWardenContracts) {
      window.HubWardenContracts.render(contentRoot, state);
    } else if (workspace.id === 'audit' && window.HubWardenAuditTools) {
      window.HubWardenAuditTools.render(contentRoot, state);
    } else {
      placeholder(workspace);
    }
    shell?.setStatusRight(state.feed?.campaignDate ? `CAMPAIGN DATE ${state.feed.campaignDate}` : 'READ-ONLY');
  }

  async function readOptional(action) {
    try {
      const result = await window.HubWardenApi.request(action, { session: state.session });
      return result?.ok ? result : null;
    } catch (_) {
      return null;
    }
  }

  async function refreshReads() {
    if (refreshing || !state.session) return;
    refreshing = true;
    refreshButton.disabled = true;
    refreshButton.textContent = 'REFRESHING…';
    setDiagnostic('LOADING WARDEN READS…');
    shell?.setStatusRight('LOADING WARDEN READS…');
    try {
      const feed = await window.HubWardenApi.request('wardenfeed', { session: state.session });
      if (!feed?.ok) throw new Error(feed?.error || feed?.message || 'Could not load Warden feed.');
      state.feed = feed;

      const [audit, submissions, classifieds, version] = await Promise.all([
        readOptional('wardenaudit'),
        readOptional('wardensubmissions'),
        readOptional('wardenclassifiedrequests'),
        readOptional('wardenversion')
      ]);
      state.audit = audit;
      state.submissions = Array.isArray(submissions?.submissions) ? submissions.submissions : [];
      state.classifieds = classifieds;
      state.version = version;
      state.lastRefresh = Date.now();

      refreshButton.hidden = false;
      lockButton.hidden = false;
      renderWorkspace();
      setDiagnostic(`ACTIVE WORKSPACE // ${shell.workspace.id.toUpperCase()}\nREADS COMPLETE // MUTATIONS DISABLED`);
    } catch (error) {
      const message = String(error?.message || error);
      if (/session|auth/i.test(message)) {
        clearPreviewSession();
        renderAuth(message);
      } else {
        setDiagnostic('READ ERROR // ' + message);
        contentRoot.innerHTML = `<div class="warden-notice bad">${esc(message)}</div>`;
      }
    } finally {
      refreshing = false;
      refreshButton.disabled = false;
      refreshButton.textContent = 'REFRESH READS';
    }
  }

  if (!window.HubWardenShell || !window.HubWardenApi) {
    setDiagnostic('BOOT FAILED // REQUIRED WARDEN MODULE UNAVAILABLE');
    return;
  }

  shell = window.HubWardenShell.createShell(shellRoot, {
    initialWorkspace: 'dashboard',
    modeLabel: 'READ-ONLY FUNCTIONAL PREVIEW'
  });

  window.addEventListener('hub-warden-workspace-change', event => {
    if (event.detail?.workspace) {
      renderWorkspace(event.detail.workspace);
      setDiagnostic(`ACTIVE WORKSPACE // ${event.detail.workspace.id.toUpperCase()}\n${state.session ? 'READ-ONLY LIVE DATA' : 'AUTHENTICATION REQUIRED'}`);
    }
  });

  refreshButton.addEventListener('click', refreshReads);
  lockButton.addEventListener('click', () => {
    clearPreviewSession();
    state.feed = null;
    state.audit = null;
    state.submissions = [];
    state.classifieds = null;
    state.version = null;
    renderAuth();
  });

  document.getElementById('wardenPreviewPlayer').addEventListener('click', () => location.assign('../index.html'));

  document.documentElement.dataset.wardenPreviewBoot = 'ok';
  if (loadPreviewSession()) refreshReads(); else renderAuth();
})();
