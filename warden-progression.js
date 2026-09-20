(() => {
  'use strict';

  const BUILD = '20260920-warden-progression-actions-1';
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

  function adjustmentDomains(targets) {
    const map = new Map();
    (targets || []).forEach(target => {
      const domain = String(target?.domain || 'OTHER').trim() || 'OTHER';
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain).push(target);
    });
    return map;
  }

  function previewHtml(result, mutationsEnabled) {
    const summary = Array.isArray(result?.summary) ? result.summary : [];
    return `
      <div class="warden-change-preview">
        <strong>WHAT THIS WILL CHANGE</strong>
        <div class="warden-small">${summary.map(line => esc(line)).join('<br>') || 'Preview returned no summary.'}</div>
        <div class="warden-transaction">STATE TOKEN // ${esc(result?.stateToken || '—')}</div>
        <button class="warden-button primary warden-adjust-commit" type="button" ${mutationsEnabled ? '' : 'disabled'}>${mutationsEnabled ? 'COMMIT CHANGE' : 'COMMIT DISABLED IN PREVIEW'}</button>
      </div>
    `;
  }

  function currentTarget(form, targets) {
    const id = String(form.elements.target?.value || '').trim();
    return (targets || []).find(target => target.id === id) || null;
  }

  function clearAdjustmentPreview(form) {
    form.dataset.stateToken = '';
    const host = form.querySelector('.warden-adjust-action-result');
    if (host) host.innerHTML = '';
  }

  function renderValueField(form, target) {
    const host = form.querySelector('.warden-adjust-value-host');
    if (!host) return;
    if (!target) {
      host.innerHTML = '<div class="warden-empty">Select an adjustment target.</div>';
      return;
    }
    const context = target.context ? `<div class="warden-small">${esc(target.context)}</div>` : '';
    const current = `<div class="warden-list-row"><strong>CURRENT VALUE</strong><span>${esc(target.currentValue ?? '—')}</span></div>`;
    if (target.inputType === 'number') {
      host.innerHTML = `${current}${context}<label class="warden-field-label">NEW VALUE<input class="warden-field" name="value" type="number" value="${esc(target.currentValue ?? '')}" ${target.min !== null && target.min !== undefined ? `min="${esc(target.min)}"` : ''} ${target.max !== null && target.max !== undefined ? `max="${esc(target.max)}"` : ''} required></label>`;
    } else {
      host.innerHTML = `${current}${context}<label class="warden-field-label">NEW VALUE<textarea class="warden-field" name="value" rows="4" maxlength="4000" required>${esc(target.currentValue ?? '')}</textarea></label>`;
    }
  }

  function populateTargets(form, targets, domain, selectedId = '') {
    const select = form.elements.target;
    if (!select) return;
    const matches = (targets || []).filter(target => String(target.domain || '') === domain);
    select.innerHTML = matches.map(target => `<option value="${esc(target.id)}" ${target.id === selectedId ? 'selected' : ''}>${esc(target.label)}</option>`).join('');
    if (!select.value && matches[0]) select.value = matches[0].id;
    renderValueField(form, currentTarget(form, targets));
    clearAdjustmentPreview(form);
  }

  async function previewAdjustment(form, state, targets) {
    const button = form.querySelector('.warden-adjust-preview');
    const resultHost = form.querySelector('.warden-adjust-action-result');
    const target = currentTarget(form, targets);
    if (!target) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'PREVIEWING…';
    resultHost.innerHTML = '';
    try {
      const result = await window.HubWardenApi.request('wardenadjustpreview', {
        session: state.session,
        target: target.id,
        value: form.elements.value?.value ?? '',
        reason: form.elements.reason?.value ?? ''
      }, { timeoutMs: 35000 });
      if (!result?.ok || !result.stateToken) throw new Error(result?.error || result?.message || 'Adjustment Preview failed.');
      form.dataset.stateToken = result.stateToken;
      resultHost.innerHTML = previewHtml(result, Boolean(state.mutationsEnabled));
      const commit = resultHost.querySelector('.warden-adjust-commit');
      if (commit && state.mutationsEnabled) commit.addEventListener('click', () => commitAdjustment(form, state, targets));
    } catch (error) {
      form.dataset.stateToken = '';
      resultHost.innerHTML = `<div class="warden-notice bad">${esc(error?.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function commitAdjustment(form, state, targets) {
    if (!state.mutationsEnabled) return;
    const target = currentTarget(form, targets);
    const stateToken = String(form.dataset.stateToken || '').trim();
    const resultHost = form.querySelector('.warden-adjust-action-result');
    const button = resultHost.querySelector('.warden-adjust-commit');
    if (!target || !stateToken || !button) {
      resultHost.innerHTML = '<div class="warden-notice bad">Preview the change again before Commit.</div>';
      return;
    }
    button.disabled = true;
    button.textContent = 'COMMITTING…';
    try {
      const result = await window.HubWardenApi.request('wardenadjustcommit', {
        session: state.session,
        target: target.id,
        value: form.elements.value?.value ?? '',
        reason: form.elements.reason?.value ?? '',
        stateToken
      }, { timeoutMs: 35000 });
      if (!result?.ok || !result.transactionId) throw new Error(result?.error || result?.message || 'Adjustment Commit failed.');
      resultHost.innerHTML = `<div class="warden-notice warden-ok-text">COMMITTED // ${esc(result.transactionId)}</div>`;
      if (typeof state.refreshReads === 'function') await state.refreshReads();
    } catch (error) {
      resultHost.innerHTML = `<div class="warden-notice bad">${esc(error?.message || error)}</div>`;
    }
  }

  async function undoAdjustment(button, state, transactionId) {
    if (!state.mutationsEnabled || button.disabled) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'UNDOING…';
    try {
      const result = await window.HubWardenApi.request('wardenadjustundo', {
        session: state.session,
        transaction: transactionId
      }, { timeoutMs: 35000 });
      if (!result?.ok) throw new Error(result?.error || result?.message || 'Adjustment Undo failed.');
      if (typeof state.refreshReads === 'function') await state.refreshReads();
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      const row = button.closest('tr');
      if (row) row.insertAdjacentHTML('afterend', `<tr><td colspan="6"><div class="warden-notice bad">${esc(error?.message || error)}</div></td></tr>`);
    }
  }

  function adjustmentSection(state) {
    const feed = state.adjustments;
    if (!feed?.ok) return '<section class="warden-section"><h2>Audited Manual Adjustment</h2><div class="warden-empty">Adjustment feed unavailable.</div></section>';
    const targets = Array.isArray(feed.targets) ? feed.targets : [];
    const history = Array.isArray(feed.history) ? feed.history : [];
    const domains = adjustmentDomains(targets);
    const domainNames = Array.from(domains.keys());
    const firstDomain = domainNames[0] || '';
    const mutationsEnabled = Boolean(state.mutationsEnabled);

    return `
      <section class="warden-section">
        <div class="warden-page-heading"><div><h2>Audited Manual Adjustment</h2><p>Record an already-established campaign change. Preview the exact target and before/after value before Commit. This tool does not create new canon, credentials, access, or progression.</p></div><div class="warden-status-chip">${mutationsEnabled ? 'LIVE MUTATIONS ENABLED' : 'PREVIEW ONLY // WRITES DISABLED'}</div></div>
        ${targets.length ? `<form id="wardenProgressionAdjustmentForm" class="warden-adjust-form">
          <label class="warden-field-label">DOMAIN<select class="warden-field" name="domain">${domainNames.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label>
          <label class="warden-field-label">TARGET<select class="warden-field" name="target"></select></label>
          <div class="warden-adjust-value-host"></div>
          <label class="warden-field-label">REASON FOR ADJUSTMENT<textarea class="warden-field" name="reason" rows="3" maxlength="1600" required></textarea></label>
          <div class="warden-button-stack"><button class="warden-button primary warden-adjust-preview" type="submit">PREVIEW CHANGE</button></div>
          <div class="warden-adjust-action-result"></div>
        </form>` : '<div class="warden-empty">No authoritative adjustment targets returned.</div>'}
      </section>
      <section class="warden-section"><h2>Audited Manual Adjustments</h2>
        ${history.length ? `<div class="warden-table-wrap"><table class="warden-table"><thead><tr><th>When</th><th>Target</th><th>Before</th><th>After</th><th>Transaction</th><th>Undo</th></tr></thead><tbody>
          ${history.slice(0, 20).map(item => `<tr><td>${esc(item.timestamp || item.campaignDate || '—')}</td><td><strong>${esc(item.title || item.after?.label || 'Adjustment')}</strong><div class="warden-small">${esc(item.reason || '—')}</div></td><td>${esc(item.before?.value ?? '—')}</td><td>${esc(item.after?.value ?? '—')}</td><td><span class="warden-transaction">${esc(item.transactionId || '—')}</span></td><td><button class="warden-button warden-adjust-undo" type="button" data-transaction="${esc(item.transactionId || '')}" ${item.canUndo && mutationsEnabled ? '' : 'disabled'}>${item.canUndo ? (mutationsEnabled ? 'UNDO' : 'UNDO DISABLED IN PREVIEW') : 'NOT REVERSIBLE'}</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="warden-empty">No audited manual adjustments recorded.</div>'}
      </section>
      <span class="warden-adjust-first-domain" data-domain="${esc(firstDomain)}" hidden></span>
    `;
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
      <div class="warden-page-heading"><div><h1>Progression</h1><p>Current campaign progression state plus audited manual corrections for established fields.</p></div><div class="warden-status-chip">${state.mutationsEnabled ? 'LIVE' : 'PREVIEW'}</div></div>
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
      ${adjustmentSection(state)}
    `;

    const adjustFeed = state.adjustments;
    const targets = Array.isArray(adjustFeed?.targets) ? adjustFeed.targets : [];
    const form = root.querySelector('#wardenProgressionAdjustmentForm');
    if (form && targets.length) {
      const firstDomain = String(root.querySelector('.warden-adjust-first-domain')?.dataset.domain || form.elements.domain.value || '');
      form.elements.domain.value = firstDomain;
      populateTargets(form, targets, firstDomain);
      form.elements.domain.addEventListener('change', () => populateTargets(form, targets, form.elements.domain.value));
      form.elements.target.addEventListener('change', () => {
        renderValueField(form, currentTarget(form, targets));
        clearAdjustmentPreview(form);
      });
      form.addEventListener('input', event => {
        if (event.target?.name !== 'domain' && event.target?.name !== 'target') clearAdjustmentPreview(form);
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        previewAdjustment(form, state, targets);
      });
    }

    root.querySelectorAll('.warden-adjust-undo').forEach(button => {
      if (!state.mutationsEnabled || button.disabled) return;
      button.addEventListener('click', () => undoAdjustment(button, state, button.dataset.transaction));
    });
  }

  window.HubWardenProgression = Object.freeze({ build: BUILD, render });
})();
