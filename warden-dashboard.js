(() => {
  'use strict';

  const BUILD = '20260919-warden-dashboard-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function render(root, state) {
    const feed = state.feed || {};
    const active = Array.isArray(feed.active) ? feed.active : [];
    const history = Array.isArray(feed.history) ? feed.history : [];
    const audit = Array.isArray(feed.audit) ? feed.audit : [];
    const submissions = Array.isArray(state.submissions) ? state.submissions : [];
    const classified = Array.isArray(state.classifieds?.pending) ? state.classifieds.pending : [];
    const latestAudit = audit.slice(-5).reverse();

    root.innerHTML = `
      <div class="warden-page-heading">
        <div><h1>Dashboard</h1><p>Current Warden operating context. Read-only preview.</p></div>
        <div class="warden-status-chip">CAMPAIGN DATE // ${esc(feed.campaignDate || state.version?.campaignDate || '—')}</div>
      </div>
      <div class="warden-metrics">
        <div class="warden-metric"><span>ACTIVE CONTRACTS</span><strong>${active.length}</strong></div>
        <div class="warden-metric"><span>PLAYER SUBMISSIONS</span><strong>${submissions.length}</strong></div>
        <div class="warden-metric"><span>CLASSIFIED REQUESTS</span><strong>${classified.length}</strong></div>
        <div class="warden-metric"><span>RECENT CLOSEOUTS</span><strong>${history.length}</strong></div>
      </div>
      <div class="warden-two-column">
        <section class="warden-section">
          <h2>Pending Actions</h2>
          ${active.length || submissions.length || classified.length ? `
            <div class="warden-list">
              ${active.length ? `<div class="warden-list-row"><strong>${active.length}</strong><span>accepted contract${active.length === 1 ? '' : 's'} awaiting closeout</span></div>` : ''}
              ${submissions.length ? `<div class="warden-list-row"><strong>${submissions.length}</strong><span>player contract submission${submissions.length === 1 ? '' : 's'} available for review</span></div>` : ''}
              ${classified.length ? `<div class="warden-list-row"><strong>${classified.length}</strong><span>Classified purchase request${classified.length === 1 ? '' : 's'} awaiting decision</span></div>` : ''}
            </div>` : '<div class="warden-empty">No current pending actions were returned by the available feeds.</div>'}
        </section>
        <section class="warden-section">
          <h2>System State</h2>
          <div class="warden-list">
            <div class="warden-list-row"><strong>${esc(state.transport || '—')}</strong><span>request transport</span></div>
            <div class="warden-list-row"><strong>${esc(state.version?.serviceVersion || '—')}</strong><span>Contract Service version</span></div>
            <div class="warden-list-row"><strong>${esc(state.version?.wardenVersion || '—')}</strong><span>Warden backend version</span></div>
            <div class="warden-list-row"><strong>${state.lastRefresh ? esc(new Date(state.lastRefresh).toLocaleString()) : '—'}</strong><span>last explicit refresh</span></div>
          </div>
        </section>
      </div>
      <section class="warden-section">
        <h2>Recent Changes</h2>
        ${latestAudit.length ? `<div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Timestamp</th><th>Event</th><th>Contract</th><th>Transaction</th></tr></thead><tbody>${latestAudit.map(item => `
          <tr><td>${esc(item.completedTimestamp || item.timestamp || '')}</td><td>${esc(item.eventType || item.state || '')}</td><td>${esc(item.title || item.contractId || item.jobId || '')}</td><td>${esc(item.transactionId || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="warden-empty">No audited closeout activity returned.</div>'}
      </section>
    `;
  }

  window.HubWardenDashboard = Object.freeze({ build: BUILD, render });
})();
