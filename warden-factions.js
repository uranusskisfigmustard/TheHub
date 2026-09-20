(() => {
  'use strict';

  const BUILD = '20260920-warden-factions-actions-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function formParams(form, state, factionName) {
    return {
      session: state.session,
      name: factionName,
      currentNeed: form.elements.currentNeed.value,
      availableLeverage: form.elements.availableLeverage.value,
      scarceResource: form.elements.scarceResource.value,
      priorInfluence: form.elements.priorInfluence.value,
      acceptableOutcome: form.elements.acceptableOutcome.value,
      operationalNote: form.elements.operationalNote.value,
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
        <button class="warden-button primary warden-faction-commit" type="button" ${mutationsEnabled ? '' : 'disabled'}>${mutationsEnabled ? 'COMMIT CHANGE' : 'COMMIT DISABLED IN PREVIEW'}</button>
      </div>
    `;
  }

  async function previewChange(form, state, factionName) {
    const button = form.querySelector('.warden-faction-preview');
    const resultHost = form.querySelector('.warden-faction-action-result');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'PREVIEWING…';
    resultHost.innerHTML = '';
    try {
      const params = formParams(form, state, factionName);
      const result = await window.HubWardenApi.request('wardenfactionpreview', params, { timeoutMs: 35000 });
      if (!result?.ok || !result.stateToken) throw new Error(result?.error || result?.message || 'Faction Preview failed.');
      form.dataset.stateToken = result.stateToken;
      resultHost.innerHTML = previewHtml(result, Boolean(state.mutationsEnabled));
      const commit = resultHost.querySelector('.warden-faction-commit');
      if (commit && state.mutationsEnabled) {
        commit.addEventListener('click', () => commitChange(form, state, factionName));
      }
    } catch (error) {
      form.dataset.stateToken = '';
      resultHost.innerHTML = `<div class="warden-notice bad">${esc(error?.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function commitChange(form, state, factionName) {
    if (!state.mutationsEnabled) return;
    const commit = form.querySelector('.warden-faction-commit');
    const resultHost = form.querySelector('.warden-faction-action-result');
    const stateToken = String(form.dataset.stateToken || '').trim();
    if (!stateToken) {
      resultHost.innerHTML = '<div class="warden-notice bad">Preview the change again before Commit.</div>';
      return;
    }
    commit.disabled = true;
    commit.textContent = 'COMMITTING…';
    try {
      const params = { ...formParams(form, state, factionName), stateToken };
      const result = await window.HubWardenApi.request('wardenfactioncommit', params, { timeoutMs: 35000 });
      if (!result?.ok || !result.transactionId) throw new Error(result?.error || result?.message || 'Faction Commit failed.');
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
      const result = await window.HubWardenApi.request('wardenfactionundo', { session: state.session, transaction: transactionId }, { timeoutMs: 35000 });
      if (!result?.ok) throw new Error(result?.error || result?.message || 'Faction Undo failed.');
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
    if (!history.length) return '<div class="warden-empty">No audited faction operational-state updates recorded.</div>';
    return `
      <div class="warden-table-wrap"><table class="warden-table">
        <thead><tr><th>When</th><th>Update</th><th>Reason</th><th>Transaction</th><th>Undo</th></tr></thead>
        <tbody>${history.slice(0, 12).map(item => `<tr>
          <td>${esc(item.timestamp || item.campaignDate || '—')}</td>
          <td>${esc(item.title || item.after?.name || 'Faction update')}</td>
          <td>${esc(item.reason || '—')}</td>
          <td><span class="warden-transaction">${esc(item.transactionId || '—')}</span></td>
          <td><button class="warden-button warden-faction-undo" type="button" data-transaction="${esc(item.transactionId || '')}" ${item.canUndo && state.mutationsEnabled ? '' : 'disabled'}>${item.canUndo ? (state.mutationsEnabled ? 'UNDO' : 'UNDO DISABLED IN PREVIEW') : 'NOT REVERSIBLE'}</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    `;
  }

  function render(root, state) {
    const feed = state.factions;
    if (!feed?.ok) {
      root.innerHTML = '<div class="warden-empty">FACTION FEED UNAVAILABLE</div>';
      return;
    }
    const factions = Array.isArray(feed.factions) ? feed.factions : [];
    const mutationsEnabled = Boolean(state.mutationsEnabled);
    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>Factions</h1><p>Current faction/institution access and operational pressure. Preview pressure changes before Commit.</p></div><div class="warden-status-chip">${mutationsEnabled ? 'LIVE MUTATIONS ENABLED' : 'PREVIEW ONLY // WRITES DISABLED'}</div></div>
      <div class="warden-card-grid">
        ${factions.map((f, index) => `<article class="warden-card" data-faction-index="${index}">
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
          <details class="warden-details warden-faction-update"><summary>UPDATE OPERATIONAL PRESSURE</summary>
            <form class="warden-faction-form">
              <label class="warden-field-label">CURRENT NEED<textarea class="warden-field" name="currentNeed" rows="3" maxlength="1200">${esc(f.currentNeed || '')}</textarea></label>
              <label class="warden-field-label">AVAILABLE LEVERAGE<textarea class="warden-field" name="availableLeverage" rows="3" maxlength="1200">${esc(f.availableLeverage || '')}</textarea></label>
              <label class="warden-field-label">SCARCE RESOURCE / PRIORITY<textarea class="warden-field" name="scarceResource" rows="3" maxlength="1200">${esc(f.scarceResource || '')}</textarea></label>
              <label class="warden-field-label">PRIOR FAVOR / INJURY / PROMISE / PRECEDENT<textarea class="warden-field" name="priorInfluence" rows="3" maxlength="1600">${esc(f.priorInfluence || '')}</textarea></label>
              <label class="warden-field-label">ACCEPTABLE OUTCOME<textarea class="warden-field" name="acceptableOutcome" rows="3" maxlength="1200">${esc(f.acceptableOutcome || '')}</textarea></label>
              <label class="warden-field-label">FACTION OPERATIONAL NOTE<textarea class="warden-field" name="operationalNote" rows="4" maxlength="1800">${esc(f.operationalNote || '')}</textarea></label>
              <label class="warden-field-label">REASON FOR UPDATE<textarea class="warden-field" name="reason" rows="3" maxlength="1600" required></textarea></label>
              <div class="warden-button-stack"><button class="warden-button primary warden-faction-preview" type="submit">PREVIEW CHANGE</button></div>
              <div class="warden-faction-action-result"></div>
            </form>
          </details>
        </article>`).join('') || '<div class="warden-empty">No faction records returned.</div>'}
      </div>
      <section class="warden-section"><h2>Audited Faction Updates</h2>${renderHistory(feed, state)}</section>
      <section class="warden-section"><h2>PC Restrictions</h2>
        <div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>Character / Crew</th><th>Scope</th><th>Status</th><th>Restriction</th><th>Player Message</th></tr></thead><tbody>
          ${(feed.restrictions || []).map(x => `<tr><td>${esc(x.character)}</td><td>${esc(x.scopeType || '')} / ${esc(x.scopeValue || '')}</td><td>${esc(x.status || '—')}</td><td>${esc(x.restrictionType || '—')}</td><td>${esc(x.playerMessage || '—')}</td></tr>`).join('') || '<tr><td colspan="5">No current restriction records returned.</td></tr>'}
        </tbody></table></div>
      </section>
    `;

    root.querySelectorAll('.warden-faction-form').forEach(form => {
      const card = form.closest('[data-faction-index]');
      const faction = factions[Number(card?.dataset.factionIndex)];
      if (!faction) return;
      const factionName = faction.name || faction.canonicalName;
      form.addEventListener('submit', event => {
        event.preventDefault();
        previewChange(form, state, factionName);
      });
      form.addEventListener('input', () => {
        form.dataset.stateToken = '';
        form.querySelector('.warden-faction-action-result').innerHTML = '';
      });
      form.addEventListener('change', () => {
        form.dataset.stateToken = '';
        form.querySelector('.warden-faction-action-result').innerHTML = '';
      });
    });

    root.querySelectorAll('.warden-faction-undo').forEach(button => {
      if (!mutationsEnabled || button.disabled) return;
      button.addEventListener('click', () => undoChange(button, state, button.dataset.transaction));
    });
  }

  window.HubWardenFactions = Object.freeze({ build: BUILD, render });
})();
