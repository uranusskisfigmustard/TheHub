(() => {
  'use strict';

  const BUILD = '20260919-warden-npcs-read-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function loadPortrait(button, state, npcName) {
    if (button.disabled) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'LOADING…';
    const host = button.closest('.warden-card')?.querySelector('.warden-npc-portrait');
    try {
      const result = await window.HubWardenApi.request('wardennpcportrait', { session: state.session, name: npcName }, { timeoutMs: 30000 });
      if (!result?.ok) throw new Error(result?.error || result?.message || 'Portrait unavailable.');
      if (!result.found || !result.dataUri) {
        host.innerHTML = '<div class="warden-small">No portrait found.</div>';
      } else {
        host.innerHTML = `<img alt="${esc(npcName)} portrait" src="${esc(result.dataUri)}" style="display:block;max-width:240px;max-height:340px;width:auto;height:auto;object-fit:contain;border:1px solid var(--warden-line);background:#0d0f10;margin:10px 0"><div class="warden-small">${esc(result.sourceName || '')}</div>`;
      }
    } catch (error) {
      host.innerHTML = `<div class="warden-danger-text warden-small">${esc(error?.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function render(root, state) {
    const feed = state.npcs;
    if (!feed?.ok) {
      root.innerHTML = '<div class="warden-empty">NPC FEED UNAVAILABLE</div>';
      return;
    }
    const npcs = Array.isArray(feed.npcs) ? feed.npcs : [];
    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>NPCs</h1><p>CANON NPC continuity records with explicit one-shot portrait loading.</p></div><div class="warden-status-chip">${npcs.length} CANON NPCS</div></div>
      <div class="warden-card-grid">
        ${npcs.map((npc, index) => `<article class="warden-card" data-npc-index="${index}">
          <div class="warden-card-title">${esc(npc.name)}</div>
          <div class="warden-card-meta">${esc(npc.role || 'Role not recorded')} · ${esc(npc.faction || 'Unaffiliated / not recorded')}</div>
          <div class="warden-card-meta">PRIMARY LOCATION: ${esc(npc.location || '—')} · KNOWLEDGE: ${esc(npc.knowledge || '—')}</div>
          <div class="warden-badges"><span class="warden-badge">${esc(npc.authorityStatus || 'CANON')}</span><span class="warden-badge warn">${esc(npc.availability || 'UNKNOWN')}</span></div>
          <div class="warden-list-row"><strong>CURRENT STATE</strong><span>${esc(npc.currentState || '—')}</span></div>
          <div class="warden-list-row"><strong>LAST CAMPAIGN BEAT</strong><span>${esc(npc.lastCampaignBeat || '—')}</span></div>
          <div class="warden-list-row"><strong>OPEN OBLIGATION / PRESSURE</strong><span>${esc(npc.openObligation || '—')}</span></div>
          <details class="warden-details"><summary>WARDEN DETAILS</summary>
            <div class="warden-list-row"><strong>MOTIVATION</strong><span>${esc(npc.motivation || '—')}</span></div>
            <div class="warden-list-row"><strong>PRESSURE / FEAR</strong><span>${esc(npc.pressureFear || '—')}</span></div>
            <div class="warden-list-row"><strong>LEVERAGE</strong><span>${esc(npc.leverage || '—')}</span></div>
            <div class="warden-list-row"><strong>IMMEDIATE NEED</strong><span>${esc(npc.immediateNeed || '—')}</span></div>
            <div class="warden-list-row"><strong>WARDEN-ONLY NOTE</strong><span>${esc(npc.wardenOnlyNote || '—')}</span></div>
            <div class="warden-list-row"><strong>OPERATIONAL NOTES</strong><span>${esc(npc.operationalNotes || '—')}</span></div>
          </details>
          <div class="warden-npc-portrait"></div>
          <button class="warden-button warden-load-portrait" type="button">LOAD PORTRAIT</button>
        </article>`).join('') || '<div class="warden-empty">No CANON NPCs returned.</div>'}
      </div>
      ${Array.isArray(feed.excluded) && feed.excluded.length ? `<section class="warden-section"><h2>Excluded Non-CANON Roster Rows</h2><div class="warden-small">${feed.excluded.map(x => `${esc(x.name)} — ${esc(x.reason)}`).join('<br>')}</div></section>` : ''}
    `;

    root.querySelectorAll('.warden-load-portrait').forEach(button => {
      const card = button.closest('[data-npc-index]');
      const npc = npcs[Number(card?.dataset.npcIndex)];
      if (npc) button.addEventListener('click', () => loadPortrait(button, state, npc.name));
    });
  }

  window.HubWardenNpcs = Object.freeze({ build: BUILD, render });
})();
