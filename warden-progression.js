(() => {
  'use strict';

  const BUILD = '20260919-warden-progression-read-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function groupByCharacter(items, key = 'character') {
    const map = new Map();
    (items || []).forEach(item => {
      const name = String(item?.[key] || '').trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(item);
    });
    return map;
  }

  function render(root, state) {
    const feed = state.progression;
    if (!feed?.ok) {
      root.innerHTML = '<div class="warden-empty">PROGRESSION FEED UNAVAILABLE</div>';
      return;
    }
    const characters = Array.isArray(feed.characters) ? feed.characters : [];
    const skills = groupByCharacter(feed.skills || []);
    const legal = groupByCharacter(feed.legal || [], 'holder');
    const training = groupByCharacter(feed.activeTraining || []);
    const reputation = Array.isArray(feed.reputation) ? feed.reputation : [];
    const ship = Array.isArray(feed.ship) ? feed.ship : [];

    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>Progression</h1><p>Current campaign progression state. Read-only in this refactor slice.</p></div><div class="warden-status-chip">READ-ONLY</div></div>
      <div class="warden-metrics">
        <div class="warden-metric"><span>CURRENT PCS</span><strong>${characters.length}</strong></div>
        <div class="warden-metric"><span>SKILL RECORDS</span><strong>${(feed.skills || []).length}</strong></div>
        <div class="warden-metric"><span>LEGAL RECORDS</span><strong>${(feed.legal || []).length}</strong></div>
        <div class="warden-metric"><span>ACTIVE TRAINING</span><strong>${(feed.activeTraining || []).length}</strong></div>
      </div>
      <section class="warden-section"><h2>PC Continuity Snapshot</h2>
        <div class="warden-card-grid">
          ${characters.map(c => {
            const cSkills = skills.get(c.name) || [];
            const cLegal = legal.get(c.name) || [];
            const cTraining = training.get(c.name) || [];
            return `<article class="warden-card">
              <div class="warden-card-title">${esc(c.name)}</div>
              <div class="warden-card-meta">Current Stress: ${esc(c.currentStress ?? '—')} · Minimum Stress: ${esc(c.minimumStress ?? '—')}</div>
              <div class="warden-card-meta">${cSkills.length} Skill record(s) · ${cLegal.length} legal record(s) · ${cTraining.length} active training project(s)</div>
              <details class="warden-details"><summary>SKILLS / TRAINING</summary>
                ${cSkills.length ? cSkills.map(x => `<div class="warden-list-row"><strong>${esc(x.skill)}</strong><span>${esc(x.level || x.status || '—')}${x.status ? ' · ' + esc(x.status) : ''}</span></div>`).join('') : '<div class="warden-small">No Skill records returned.</div>'}
                ${cTraining.length ? '<div class="warden-small" style="margin-top:8px">ACTIVE TRAINING</div>' + cTraining.map(x => `<div class="warden-list-row"><strong>${esc(x.skill || 'Training')}</strong><span>${esc(x.status || x.progress || 'Active')}</span></div>`).join('') : ''}
              </details>
              <details class="warden-details"><summary>LICENSES & LEGAL</summary>
                ${cLegal.length ? cLegal.map(x => `<div class="warden-list-row"><strong>${esc(x.name)}</strong><span>${esc(x.status || '—')} · ${esc(x.jurisdiction || '—')}</span></div>`).join('') : '<div class="warden-small">No legal records returned.</div>'}
              </details>
            </article>`;
          }).join('') || '<div class="warden-empty">No current PCs returned.</div>'}
        </div>
      </section>
      <section class="warden-section"><h2>Reputation / Institutional Access</h2>
        <div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Faction / Institution</th><th>Current Access</th><th>Next Gate</th></tr></thead><tbody>
          ${reputation.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.access || '—')}</td><td>${esc(x.nextGate || '—')}</td></tr>`).join('') || '<tr><td colspan="3">No Reputation records returned.</td></tr>'}
        </tbody></table></div>
      </section>
      <section class="warden-section"><h2>Ship Progression</h2>
        <div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Milestone / Upgrade</th><th>Status</th><th>Target Cost</th><th>Funds Reserved</th><th>Access Requirement</th></tr></thead><tbody>
          ${ship.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.status || '—')}</td><td>${esc(x.targetCost || '—')}</td><td>${esc(x.fundsReserved || '—')}</td><td>${esc(x.accessRequirement || '—')}</td></tr>`).join('') || '<tr><td colspan="5">No Ship Progression records returned.</td></tr>'}
        </tbody></table></div>
      </section>
    `;
  }

  window.HubWardenProgression = Object.freeze({ build: BUILD, render });
})();
