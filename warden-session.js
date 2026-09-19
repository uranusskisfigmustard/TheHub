(() => {
  'use strict';

  const BUILD = '20260919-warden-session-read-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function stressByCharacter(adjustments) {
    const map = new Map();
    (adjustments?.targets || []).forEach(target => {
      if (target.field !== 'Current Stress') return;
      const name = String(target.label || '').split(' — ')[0].trim();
      if (name) map.set(name, target);
    });
    return map;
  }

  function render(root, state) {
    const progression = state.progression;
    const adjustments = state.adjustments;
    const characters = Array.isArray(progression?.characters) ? progression.characters : [];
    const stress = stressByCharacter(adjustments);
    const active = Array.isArray(state.feed?.active) ? state.feed.active : [];
    const pendingClassifieds = Array.isArray(state.classifieds?.pending) ? state.classifieds.pending : [];

    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>Session</h1><p>Current session-close context. Mutation workflow remains disabled until the explicit preview/commit pass is migrated.</p></div><div class="warden-status-chip">READ-ONLY CONTEXT</div></div>
      <div class="warden-metrics">
        <div class="warden-metric"><span>CAMPAIGN DATE</span><strong style="font-size:1rem">${esc(state.feed?.campaignDate || progression?.campaignDate || '—')}</strong></div>
        <div class="warden-metric"><span>ACTIVE CONTRACTS</span><strong>${active.length}</strong></div>
        <div class="warden-metric"><span>PENDING CLASSIFIED REQUESTS</span><strong>${pendingClassifieds.length}</strong></div>
        <div class="warden-metric"><span>ACTIVE TRAINING</span><strong>${(progression?.activeTraining || []).length}</strong></div>
      </div>
      <section class="warden-section"><h2>PC State Before Session Processing</h2>
        <div class="warden-card-grid">${characters.map(c => {
          const target = stress.get(c.name);
          return `<article class="warden-card"><div class="warden-card-title">${esc(c.name)}</div>
            <div class="warden-list-row"><strong>CURRENT STRESS</strong><span>${esc(target?.currentValue ?? c.currentStress ?? '—')}</span></div>
            <div class="warden-list-row"><strong>MINIMUM STRESS</strong><span>${esc(c.minimumStress ?? '—')}</span></div>
            <div class="warden-list-row"><strong>STRESS RECOVERY</strong><span>${esc(c.stressRecovery || target?.context || '—')}</span></div>
            <div class="warden-list-row"><strong>HOUSING STRESS RECOVERY</strong><span>${esc(c.housingStressRecovery || '—')}</span></div>
          </article>`;
        }).join('') || '<div class="warden-empty">No current PC state returned.</div>'}</div>
      </section>
      <section class="warden-section"><h2>Session Close Workflow</h2>
        <div class="warden-preview-grid">
          <div class="warden-preview-card"><strong>PREVIEW LEDGER</strong><span>Planned: wages, charges, Additional Payments, recurring obligations, interest timing, and resulting balances before commit.</span></div>
          <div class="warden-preview-card"><strong>TIME / RECOVERY</strong><span>Planned: campaign-date advancement, recovery, between-session activity, and established session-reset effects.</span></div>
          <div class="warden-preview-card"><strong>COMMIT ALL</strong><span>Disabled in this slice. No Session mutation route is called by this preview.</span></div>
        </div>
      </section>
    `;
  }

  window.HubWardenSession = Object.freeze({ build: BUILD, render });
})();
