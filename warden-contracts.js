(() => {
  'use strict';

  const BUILD = '20260919-warden-contracts-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'cr';
  const norm = value => String(value || '').trim().toUpperCase();

  function submissionsFor(contract, submissions) {
    const id = norm(contract.contractId || contract.jobId);
    const title = norm(contract.title);
    const direct = submissions.filter(item => norm(item.contractId) === id || norm(item.jobId) === id);
    return direct.length ? direct : submissions.filter(item => title && norm(item.title) === title);
  }

  function render(root, state) {
    const feed = state.feed || {};
    const active = Array.isArray(feed.active) ? feed.active : [];
    const history = Array.isArray(feed.history) ? feed.history : [];
    const submissions = Array.isArray(state.submissions) ? state.submissions : [];

    root.innerHTML = `
      <div class="warden-page-heading">
        <div><h1>Contracts</h1><p>Contract administration and closeout records. Mutation controls remain disabled in preview.</p></div>
        <div class="warden-status-chip">READ-ONLY // ${active.length} ACTIVE</div>
      </div>
      <section class="warden-section">
        <h2>Contracts Awaiting Closeout</h2>
        ${active.length ? `<div class="warden-card-grid">${active.map(contract => {
          const group = submissionsFor(contract, submissions);
          return `<article class="warden-card">
            <div class="warden-card-title">${esc(contract.title)}</div>
            <div class="warden-card-meta">${esc(contract.contractId || contract.jobId || '')} · ${esc(contract.employer || 'Employer withheld')}</div>
            <div class="warden-card-meta">Participants: ${esc((contract.participants || []).join(', '))}</div>
            <div class="warden-card-pay">${esc(contract.basePay || 'Payout per contract closeout')}</div>
            <div class="warden-badges"><span class="warden-badge">${esc(contract.status || 'ACTIVE')}</span>${contract.qualifiedContractorConfirmed ? '<span class="warden-badge warn">CONTRACTOR CONFIRMED</span>' : ''}</div>
            ${group.length ? `<details class="warden-details"><summary>PLAYER SUBMISSIONS · ${group.length}</summary>${group.map(item => `<div class="warden-submission"><div class="warden-small">${esc(item.campaignDate || '')}${item.submittedAt ? ' · ' + esc(new Date(item.submittedAt).toLocaleString()) : ''}</div><div>${esc(item.text)}</div></div>`).join('')}</details>` : ''}
            <button class="warden-button primary" type="button" disabled>RESOLVE CONTRACT // PREVIEW DISABLED</button>
          </article>`;
        }).join('')}</div>` : '<div class="warden-empty">No active accepted contracts are awaiting closeout.</div>'}
      </section>
      <section class="warden-section">
        <h2>Recent Closed Contracts</h2>
        ${history.length ? `<div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Contract</th><th>Status</th><th>Closed</th><th>Payout</th><th>Audit</th></tr></thead><tbody>${history.map(contract => {
          const audit = contract.audit || {};
          const auditLabel = audit.transactionId ? `${audit.canAmend ? 'AMEND' : ''}${audit.canAmend && audit.canUndo ? ' / ' : ''}${audit.canUndo ? 'UNDO' : 'AUDITED'}` : 'LEGACY / READ-ONLY';
          return `<tr><td><strong>${esc(contract.title)}</strong><div class="warden-small">${esc(contract.contractId || contract.jobId || '')}</div>${audit.transactionId ? `<div class="warden-transaction">${esc(audit.transactionId)}</div>` : ''}</td><td>${esc(contract.status || '')}</td><td>${esc(contract.closedDate || '')}</td><td>${money(contract.totalPayout)}</td><td>${esc(auditLabel)}<div class="warden-small">Preview does not mutate.</div></td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="warden-empty">No posted contract closeouts yet.</div>'}
      </section>
    `;
  }

  window.HubWardenContracts = Object.freeze({ build: BUILD, render });
})();
