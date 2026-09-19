(() => {
  'use strict';

  const BUILD = '20260919-warden-factions-read-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function render(root, state) {
    const feed = state.factions;
    if (!feed?.ok) {
      root.innerHTML = '<div class="warden-empty">FACTION FEED UNAVAILABLE</div>';
      return;
    }
    const factions = Array.isArray(feed.factions) ? feed.factions : [];
    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>Factions</h1><p>Current faction/institution access and operational pressure.</p></div><div class="warden-status-chip">READ-ONLY</div></div>
      <div class="warden-card-grid">
        ${factions.map(f => `<article class="warden-card">
          <div class="warden-card-title">${esc(f.canonicalName || f.name)}</div>
          <div class="warden-card-meta">${esc(f.classification || 'INSTITUTION')} · ${esc(f.organizationForm || 'FORM NOT RECORDED')}</div>
          ${f.warning ? `<div class="warden-danger-text warden-small">${esc(f.warning)}</div>` : ''}
          <div class="warden-list-row"><strong>CURRENT ACCESS</strong><span>${esc(f.access || '—')}</span></div>
          <div class="warden-list-row"><strong>PRIVILEGES</strong><span>${esc(f.privileges || '—')}</span></div>
          <div class="warden-list-row"><strong>RESTRICTIONS</strong><span>${esc(f.restrictions || '—')}</span></div>
          <div class="warden-list-row"><strong>NEXT EVIDENCE / TRUST GATE</strong><span>${esc(f.nextGate || '—')}</span></div>
          <details class="warden-details"><summary>CURRENT PRESSURE</summary>
            <div class="warden-list-row"><strong>CURRENT NEED</strong><span>${esc(f.currentNeed || '—')}</span></div>
            <div class="warden-list-row"><strong>AVAILABLE LEVERAGE</strong><span>${esc(f.availableLeverage || '—')}</span></div>
            <div class="warden-list-row"><strong>SCARCE RESOURCE / PRIORITY</strong><span>${esc(f.scarceResource || '—')}</span></div>
            <div class="warden-list-row"><strong>PRIOR FAVOR / INJURY / PROMISE / PRECEDENT</strong><span>${esc(f.priorInfluence || '—')}</span></div>
            <div class="warden-list-row"><strong>ACCEPTABLE OUTCOME</strong><span>${esc(f.acceptableOutcome || '—')}</span></div>
            <div class="warden-list-row"><strong>OPERATIONAL NOTE</strong><span>${esc(f.operationalNote || '—')}</span></div>
          </details>
        </article>`).join('') || '<div class="warden-empty">No faction records returned.</div>'}
      </div>
      <section class="warden-section"><h2>PC Restrictions</h2>
        <div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Character / Crew</th><th>Scope</th><th>Status</th><th>Restriction</th><th>Player Message</th></tr></thead><tbody>
          ${(feed.restrictions || []).map(x => `<tr><td>${esc(x.character)}</td><td>${esc(x.scopeType || '')} / ${esc(x.scopeValue || '')}</td><td>${esc(x.status || '—')}</td><td>${esc(x.restrictionType || '—')}</td><td>${esc(x.playerMessage || '—')}</td></tr>`).join('') || '<tr><td colspan="5">No current restriction records returned.</td></tr>'}
        </tbody></table></div>
      </section>
    `;
  }

  window.HubWardenFactions = Object.freeze({ build: BUILD, render });
})();
