(() => {
  'use strict';

  const BUILD = '20260919-warden-audit-tools-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function duplicates(values) {
    const counts = new Map();
    values.filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
  }

  function render(root, state) {
    const feed = state.feed || {};
    const history = Array.isArray(feed.history) ? feed.history : [];
    const auditEvents = Array.isArray(feed.audit) ? feed.audit : [];
    const audited = history.filter(item => item.audit?.transactionId);
    const legacy = history.filter(item => !item.audit?.transactionId);
    const undoable = history.filter(item => item.audit?.canUndo && item.audit?.transactionId);
    const missingIdOnUndoable = history.filter(item => item.audit?.canUndo && !item.audit?.transactionId);
    const duplicateIds = duplicates(audited.map(item => item.audit?.transactionId));
    const eventIds = duplicates(auditEvents.map(item => item.transactionId));

    const checks = [
      { label: 'UNDOABLE CLOSEOUT WITHOUT TRANSACTION ID', count: missingIdOnUndoable.length },
      { label: 'DUPLICATE CLOSEOUT TRANSACTION ID', count: duplicateIds.length },
      { label: 'DUPLICATE AUDIT EVENT TRANSACTION ID', count: eventIds.length }
    ];

    root.innerHTML = `
      <div class="warden-page-heading">
        <div><h1>Audit Tools</h1><p>Explicit Warden-initiated audit and maintenance workspace. No automatic repair.</p></div>
        <div class="warden-status-chip">READ-ONLY PREVIEW</div>
      </div>
      <div class="warden-metrics">
        <div class="warden-metric"><span>AUDITED CLOSEOUTS</span><strong>${audited.length}</strong></div>
        <div class="warden-metric"><span>UNDOABLE</span><strong>${undoable.length}</strong></div>
        <div class="warden-metric"><span>LEGACY / READ-ONLY</span><strong>${legacy.length}</strong></div>
        <div class="warden-metric"><span>AUDIT EVENTS</span><strong>${auditEvents.length}</strong></div>
      </div>
      <section class="warden-section">
        <h2>Integrity Checks</h2>
        <div class="warden-small">Client-side structural checks only. Detection does not alter campaign records.</div>
        <div class="warden-list">${checks.map(check => `<div class="warden-list-row"><strong class="${check.count ? 'warden-danger-text' : 'warden-ok-text'}">${check.count}</strong><span>${esc(check.label)}</span></div>`).join('')}</div>
      </section>
      <section class="warden-section">
        <h2>Transaction Audit</h2>
        ${history.length ? `<div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Contract</th><th>Transaction</th><th>State</th><th>Available production action</th></tr></thead><tbody>${history.map(item => {
          const audit = item.audit || {};
          const action = audit.transactionId ? [audit.canAmend ? 'AMEND' : '', audit.canUndo ? 'UNDO' : ''].filter(Boolean).join(' / ') || 'AUDITED' : 'LEGACY / READ-ONLY';
          return `<tr><td>${esc(item.title || item.contractId || item.jobId || '')}</td><td>${esc(audit.transactionId || '')}</td><td>${esc(item.status || '')}</td><td>${esc(action)}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="warden-empty">No closeout records returned.</div>'}
      </section>
      <div class="warden-two-column">
        <section class="warden-section">
          <h2>Derived Output Maintenance</h2>
          <div class="warden-small">These controls are intentionally inactive in preview.</div>
          <div class="warden-button-stack">
            <button class="warden-button" type="button" disabled>REFRESH PLAYER STATEMENTS</button>
            <button class="warden-button" type="button" disabled>REFRESH PLAYER-SAFE EXPORTS</button>
            <button class="warden-button" type="button" disabled>REFRESH PLAYER REFERENCE OUTPUT</button>
          </div>
        </section>
        <section class="warden-section">
          <h2>System Diagnostics</h2>
          <div class="warden-list">
            <div class="warden-list-row"><strong>${esc(state.transport || '—')}</strong><span>transport</span></div>
            <div class="warden-list-row"><strong>${esc(state.version?.serviceVersion || '—')}</strong><span>Contract Service</span></div>
            <div class="warden-list-row"><strong>${esc(state.version?.wardenVersion || '—')}</strong><span>Warden backend</span></div>
            <div class="warden-list-row"><strong>${esc(state.version?.campaignDate || feed.campaignDate || '—')}</strong><span>campaign date</span></div>
          </div>
        </section>
      </div>
    `;
  }

  window.HubWardenAuditTools = Object.freeze({ build: BUILD, render });
})();
