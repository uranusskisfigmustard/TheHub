(() => {
  'use strict';

  const BUILD = '20260919-warden-npcs-actions-1';
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

  function formParams(form, state, npcName) {
    return {
      session: state.session,
      name: npcName,
      currentState: form.elements.currentState.value,
      availability: form.elements.availability.value,
      lastCampaignBeat: form.elements.lastCampaignBeat.value,
      openObligation: form.elements.openObligation.value,
      operationalNotes: form.elements.operationalNotes.value,
      reason: form.elements.reason.value
    };
  }

  function previewHtml(result, mutationsEnabled) {
    const summary = Array.isArray(result?.summary) ? result.summary : [];
    return `
      <div class="warden-change-preview">
        <strong>WHAT THIS WILL CHANGE</strong>
        <div class="warden-small">${summary.map(line => esc(line)).join('<br>') || 'Preview returned no summary.'}</div>
        <div class="warden-transaction">STATE TOKEN // ${esc(result?.stateToken || '—')}</div>
        <button class="warden-button primary warden-npc-commit" type="button" ${mutationsEnabled ? '' : 'disabled'}>${mutationsEnabled ? 'COMMIT CHANGE' : 'COMMIT DISABLED IN PREVIEW'}</button>
      </div>
    `;
  }

  async function previewChange(form, state, npcName) {
    const button = form.querySelector('.warden-npc-preview');
    const resultHost = form.querySelector('.warden-npc-action-result');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'PREVIEWING…';
    resultHost.innerHTML = '';
    try {
      const params = formParams(form, state, npcName);
      const result = await window.HubWardenApi.request('wardennpcpreview', params, { timeoutMs: 35000 });
      if (!result?.ok || !result.stateToken) throw new Error(result?.error || result?.message || 'NPC Preview failed.');
      form.dataset.stateToken = result.stateToken;
      resultHost.innerHTML = previewHtml(result, Boolean(state.mutationsEnabled));
      const commit = resultHost.querySelector('.warden-npc-commit');
      if (commit && state.mutationsEnabled) {
        commit.addEventListener('click', () => commitChange(form, state, npcName));
      }
    } catch (error) {
      form.dataset.stateToken = '';
      resultHost.innerHTML = `<div class="warden-notice bad">${esc(error?.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function commitChange(form, state, npcName) {
    if (!state.mutationsEnabled) return;
    const commit = form.querySelector('.warden-npc-commit');
    const resultHost = form.querySelector('.warden-npc-action-result');
    const stateToken = String(form.dataset.stateToken || '').trim();
    if (!stateToken) {
      resultHost.innerHTML = '<div class="warden-notice bad">Preview the change again before Commit.</div>';
      return;
    }
    commit.disabled = true;
    commit.textContent = 'COMMITTING…';
    try {
      const params = { ...formParams(form, state, npcName), stateToken };
      const result = await window.HubWardenApi.request('wardennpccommit', params, { timeoutMs: 35000 });
      if (!result?.ok || !result.transactionId) throw new Error(result?.error || result?.message || 'NPC Commit failed.');
      resultHost.innerHTML = `<div class="warden-notice warden-ok-text">COMMITTED // ${esc(result.transactionId)}</div>`;
      if (typeof state.refreshReads === 'function') await state.refreshReads();
    } catch (error) {
      resultHost.innerHTML = `<div class="warden-notice bad">${esc(error?.message || error)}</div>`;
      commit.disabled = false;
      commit.textContent = 'COMMIT CHANGE';
    }
  }

  async function undoChange(button, state, transactionId) {
    if (!state.mutationsEnabled || button.disabled) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'UNDOING…';
    try {
      const result = await window.HubWardenApi.request('wardennpcundo', { session: state.session, transaction: transactionId }, { timeoutMs: 35000 });
      if (!result?.ok) throw new Error(result?.error || result?.message || 'NPC Undo failed.');
      if (typeof state.refreshReads === 'function') await state.refreshReads();
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      const row = button.closest('tr');
      if (row) row.insertAdjacentHTML('afterend', `<tr><td colspan="5"><div class="warden-notice bad">${esc(error?.message || error)}</div></td></tr>`);
    }
  }

  function renderHistory(feed, state) {
    const history = Array.isArray(feed.history) ? feed.history : [];
    if (!history.length) return '<div class="warden-empty">No audited NPC operational-state updates recorded.</div>';
    return `
      <div class="warden-table-wrap"><table class="warden-table">
        <thead><tr><th>When</th><th>Update</th><th>Reason</th><th>Transaction</th><th>Undo</th></tr></thead>
        <tbody>${history.slice(0, 12).map(item => `<tr>
          <td>${esc(item.timestamp || item.campaignDate || '—')}</td>
          <td>${esc(item.title || item.after?.name || 'NPC update')}</td>
          <td>${esc(item.reason || '—')}</td>
          <td><span class="warden-transaction">${esc(item.transactionId || '—')}</span></td>
          <td><button class="warden-button warden-npc-undo" type="button" data-transaction="${esc(item.transactionId || '')}" ${item.canUndo && state.mutationsEnabled ? '' : 'disabled'}>${item.canUndo ? (state.mutationsEnabled ? 'UNDO' : 'UNDO DISABLED IN PREVIEW') : 'NOT REVERSIBLE'}</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    `;
  }

  function render(root, state) {
    const feed = state.npcs;
    if (!feed?.ok) {
      root.innerHTML = '<div class="warden-empty">NPC FEED UNAVAILABLE</div>';
      return;
    }
    const npcs = Array.isArray(feed.npcs) ? feed.npcs : [];
    const mutationsEnabled = Boolean(state.mutationsEnabled);
    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>NPCs</h1><p>CANON NPC continuity records. Preview operational-state changes before Commit.</p></div><div class="warden-status-chip">${mutationsEnabled ? 'LIVE MUTATIONS ENABLED' : 'PREVIEW ONLY // WRITES DISABLED'}</div></div>
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
          <details class="warden-details warden-npc-update"><summary>UPDATE OPERATIONAL STATE</summary>
            <form class="warden-npc-form">
              <label class="warden-field-label">CURRENT STATE<textarea class="warden-field" name="currentState" rows="3" maxlength="800">${esc(npc.currentState || '')}</textarea></label>
              <label class="warden-field-label">AVAILABILITY<select class="warden-field" name="availability">${['UNKNOWN','AVAILABLE','LIMITED','UNAVAILABLE'].map(value => `<option value="${value}" ${String(npc.availability || 'UNKNOWN').toUpperCase() === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
              <label class="warden-field-label">LAST CAMPAIGN BEAT<textarea class="warden-field" name="lastCampaignBeat" rows="3" maxlength="1400">${esc(npc.lastCampaignBeat || '')}</textarea></label>
              <label class="warden-field-label">OPEN OBLIGATION / PRESSURE<textarea class="warden-field" name="openObligation" rows="3" maxlength="1600">${esc(npc.openObligation || '')}</textarea></label>
              <label class="warden-field-label">OPERATIONAL NOTES<textarea class="warden-field" name="operationalNotes" rows="4" maxlength="2000">${esc(npc.operationalNotes || '')}</textarea></label>
              <label class="warden-field-label">REASON FOR UPDATE<textarea class="warden-field" name="reason" rows="3" maxlength="1600" required></textarea></label>
              <div class="warden-button-stack"><button class="warden-button primary warden-npc-preview" type="submit">PREVIEW CHANGE</button></div>
              <div class="warden-npc-action-result"></div>
            </form>
          </details>
          <div class="warden-npc-portrait"></div>
          <button class="warden-button warden-load-portrait" type="button">LOAD PORTRAIT</button>
        </article>`).join('') || '<div class="warden-empty">No CANON NPCs returned.</div>'}
      </div>
      <section class="warden-section"><h2>Audited NPC Updates</h2>${renderHistory(feed, state)}</section>
      ${Array.isArray(feed.excluded) && feed.excluded.length ? `<section class="warden-section"><h2>Excluded Non-CANON Roster Rows</h2><div class="warden-small">${feed.excluded.map(x => `${esc(x.name)} — ${esc(x.reason)}`).join('<br>')}</div></section>` : ''}
    `;

    root.querySelectorAll('.warden-load-portrait').forEach(button => {
      const card = button.closest('[data-npc-index]');
      const npc = npcs[Number(card?.dataset.npcIndex)];
      if (npc) button.addEventListener('click', () => loadPortrait(button, state, npc.name));
    });

    root.querySelectorAll('.warden-npc-form').forEach(form => {
      const card = form.closest('[data-npc-index]');
      const npc = npcs[Number(card?.dataset.npcIndex)];
      if (!npc) return;
      form.addEventListener('submit', event => {
        event.preventDefault();
        previewChange(form, state, npc.name);
      });
      form.addEventListener('input', () => {
        form.dataset.stateToken = '';
        form.querySelector('.warden-npc-action-result').innerHTML = '';
      });
      form.addEventListener('change', () => {
        form.dataset.stateToken = '';
        form.querySelector('.warden-npc-action-result').innerHTML = '';
      });
    });

    root.querySelectorAll('.warden-npc-undo').forEach(button => {
      if (!mutationsEnabled || button.disabled) return;
      button.addEventListener('click', () => undoChange(button, state, button.dataset.transaction));
    });
  }

  window.HubWardenNpcs = Object.freeze({ build: BUILD, render });
})();
