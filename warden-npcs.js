(() => {
  'use strict';

  const BUILD = '20260927-warden-npcs-major-groups-2';
  const FALLBACK_FACTION = 'Unaffiliated / not recorded';
  const DIRECTORY_GROUPS = [
    'BREAKWATER / RECOVERY',
    'BREATHWORKS / UTILITIES',
    'CLAIMS / RECORDS',
    'PORT / FREIGHT / TRADE',
    'DEEPWELL / INDUSTRIAL REACH',
    'COMMUNITY / CARE'
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = value => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const view = { group: '', npc: '' };

  function factionOf(npc) {
    return String(npc?.faction || '').trim() || FALLBACK_FACTION;
  }

  function directoryGroupOf(npc) {
    const faction = normalize(factionOf(npc));
    const role = normalize(npc?.role);
    const location = normalize(npc?.location);
    const combined = `${faction} ${role} ${location}`;

    if (
      faction.includes('breakwater recovery cooperative') ||
      faction.includes('breakwater-sponsored') ||
      faction.includes('leased breakwater') ||
      faction.includes('breakwater floor-work')
    ) return 'BREAKWATER / RECOVERY';

    if (faction.includes('breathworks compact')) return 'BREATHWORKS / UTILITIES';

    if (
      faction.includes('hub claims registry') ||
      faction.includes('ledger quay consortium') ||
      faction.includes('central records')
    ) return 'CLAIMS / RECORDS';

    if (
      faction.includes('deepwell extractive league') ||
      faction.includes('industrial reach') ||
      combined.includes('industrial reach') ||
      combined.includes('deepwell') ||
      combined.includes('mine threshold')
    ) return 'DEEPWELL / INDUSTRIAL REACH';

    if (
      faction.includes('cistern') ||
      faction.includes('saint orra') ||
      combined.includes('resident community') ||
      combined.includes('neighborhood') ||
      combined.includes('hospital') ||
      combined.includes('clinic')
    ) return 'COMMUNITY / CARE';

    if (
      faction.includes('dock labor') ||
      faction.includes('bonded freight') ||
      faction.includes('blackline') ||
      faction.includes('freight concourse') ||
      faction.includes('primary docks') ||
      combined.includes('freight') ||
      combined.includes('dock') ||
      combined.includes('berth') ||
      combined.includes('cargo') ||
      combined.includes('secondary market') ||
      combined.includes('receiving')
    ) return 'PORT / FREIGHT / TRADE';

    return 'PORT / FREIGHT / TRADE';
  }

  function installStyles() {
    if (document.getElementById('wardenNpcDirectoryStyles')) return;
    const style = document.createElement('style');
    style.id = 'wardenNpcDirectoryStyles';
    style.textContent = `
      .warden-npc-directory-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start;margin-bottom:14px}
      .warden-npc-search-wrap{position:relative;min-width:0}
      .warden-npc-search{min-height:44px}
      .warden-npc-search-results{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 4px);max-height:360px;overflow:auto;border:1px solid var(--warden-line);background:#111518;box-shadow:0 10px 28px rgba(0,0,0,.48)}
      .warden-npc-search-results[hidden]{display:none!important}
      .warden-npc-search-result{display:block;width:100%;min-height:48px;padding:9px 10px;border:0;border-top:1px solid #303538;background:transparent;color:var(--warden-text);text-align:left;cursor:pointer}
      .warden-npc-search-result:first-child{border-top:0}
      .warden-npc-search-result:hover,.warden-npc-search-result:focus-visible{background:#20262a;outline:1px solid var(--accent);outline-offset:-1px}
      .warden-npc-search-result strong{display:block}
      .warden-npc-search-result span{display:block;margin-top:2px;color:var(--warden-muted);font-size:.7rem}
      .warden-npc-directory-context{min-height:44px;display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      .warden-npc-directory-context .warden-status-chip{white-space:normal}
      .warden-npc-faction-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
      .warden-npc-faction-btn{min-height:58px;border:1px solid var(--warden-line);background:var(--warden-panel2);color:var(--warden-text);padding:10px 11px;text-align:left;cursor:pointer}
      .warden-npc-faction-btn:hover,.warden-npc-faction-btn:focus-visible{border-color:var(--accent);outline:none}
      .warden-npc-faction-name{display:block;font-weight:900;line-height:1.2}
      .warden-npc-faction-count{display:block;margin-top:5px;color:var(--warden-muted);font-size:.68rem;letter-spacing:.04em}
      .warden-npc-directory-layout{display:grid;grid-template-columns:minmax(230px,320px) minmax(0,1fr);gap:12px;align-items:start}
      .warden-npc-index{border:1px solid var(--warden-line);background:#15181a}
      .warden-npc-index-heading{padding:9px 10px;border-bottom:1px solid var(--warden-line);color:var(--warden-muted);font-size:.68rem;letter-spacing:.06em;text-transform:uppercase}
      .warden-npc-index-btn{display:block;width:100%;min-height:50px;border:0;border-top:1px solid #303538;background:transparent;color:var(--warden-text);padding:9px 10px;text-align:left;cursor:pointer}
      .warden-npc-index-btn:first-of-type{border-top:0}
      .warden-npc-index-btn:hover,.warden-npc-index-btn:focus-visible{background:#20262a;outline:none}
      .warden-npc-index-btn.active{background:rgba(212,168,75,.10);box-shadow:inset 3px 0 0 var(--accent)}
      .warden-npc-index-btn strong{display:block}
      .warden-npc-index-btn span{display:block;margin-top:2px;color:var(--warden-muted);font-size:.69rem}
      .warden-npc-detail-host>.warden-card{margin:0}
      .warden-npc-directory-hint{margin-top:10px;color:var(--warden-muted);font-size:.72rem}
      @media(max-width:760px){
        .warden-npc-directory-tools{grid-template-columns:1fr}
        .warden-npc-directory-context{justify-content:flex-start}
        .warden-npc-directory-layout{grid-template-columns:1fr}
        .warden-npc-faction-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .warden-npc-search-results{position:static;margin-top:4px;max-height:none;box-shadow:none}
      }
      @media(max-width:360px){.warden-npc-faction-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function groupsFor(npcs) {
    const counts = new Map(DIRECTORY_GROUPS.map(group => [group, 0]));
    npcs.forEach(npc => {
      const group = directoryGroupOf(npc);
      counts.set(group, (counts.get(group) || 0) + 1);
    });
    return DIRECTORY_GROUPS.map(group => [group, counts.get(group) || 0]).filter(([, count]) => count > 0);
  }

  function reconcileView(npcs) {
    const groupNames = new Set(npcs.map(directoryGroupOf));
    if (view.group && !groupNames.has(view.group)) view.group = '';
    const selected = npcs.find(npc => String(npc.name || '') === view.npc);
    if (!selected) view.npc = '';
    if (selected) view.group = directoryGroupOf(selected);
  }

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
      if (commit && state.mutationsEnabled) commit.addEventListener('click', () => commitChange(form, state, npcName));
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

  function renderGroupGrid(npcs) {
    const groups = groupsFor(npcs);
    if (!groups.length) return '<div class="warden-empty">No CANON NPCs returned.</div>';
    return `
      <section class="warden-section">
        <h2>Select Major Group</h2>
        <div class="warden-npc-faction-grid">
          ${groups.map(([group, count]) => `<button type="button" class="warden-npc-faction-btn" data-npc-group="${esc(group)}"><span class="warden-npc-faction-name">${esc(group)}</span><span class="warden-npc-faction-count">${count} NPC${count === 1 ? '' : 's'}</span></button>`).join('')}
        </div>
        <div class="warden-npc-directory-hint">Major groups are directory navigation only. Each NPC retains the exact canonical Faction / Institution shown in their record. Name search can jump directly to an NPC in any group.</div>
      </section>
    `;
  }

  function renderNpcIndex(npcs) {
    const groupNpcs = npcs.filter(npc => directoryGroupOf(npc) === view.group).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return `
      <div class="warden-npc-index" aria-label="${esc(view.group)} NPCs">
        <div class="warden-npc-index-heading">${esc(view.group)} // ${groupNpcs.length} NPC${groupNpcs.length === 1 ? '' : 's'}</div>
        ${groupNpcs.map(npc => `<button type="button" class="warden-npc-index-btn${view.npc === String(npc.name || '') ? ' active' : ''}" data-npc-name="${esc(npc.name || '')}"><strong>${esc(npc.name || 'Unnamed NPC')}</strong><span>${esc(factionOf(npc))} · ${esc(npc.availability || 'UNKNOWN')}</span></button>`).join('') || '<div class="warden-empty">No NPCs are assigned to this directory group.</div>'}
      </div>
    `;
  }

  function renderNpcDetail(npc, state, index) {
    if (!npc) return '<div class="warden-empty">SELECT AN NPC</div>';
    return `<article class="warden-card" data-npc-index="${index}">
      <div class="warden-card-title">${esc(npc.name)}</div>
      <div class="warden-card-meta">${esc(npc.role || 'Role not recorded')}</div>
      <div class="warden-card-meta">FACTION / INSTITUTION: ${esc(factionOf(npc))}</div>
      <div class="warden-card-meta">DIRECTORY GROUP: ${esc(directoryGroupOf(npc))}</div>
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
    </article>`;
  }

  function renderDirectoryBody(root, state, npcs) {
    reconcileView(npcs);
    const selectedNpc = npcs.find(npc => String(npc.name || '') === view.npc) || null;
    const body = root.querySelector('#wardenNpcDirectoryBody');
    const context = root.querySelector('#wardenNpcDirectoryContext');
    if (!body || !context) return;

    if (!view.group) {
      context.innerHTML = '<span class="warden-status-chip">SELECT A MAJOR GROUP OR SEARCH BY NAME</span>';
      body.innerHTML = renderGroupGrid(npcs);
    } else {
      context.innerHTML = `<span class="warden-status-chip">GROUP // ${esc(view.group)}</span><button type="button" class="warden-button" id="wardenNpcAllGroups">CHANGE GROUP</button>`;
      body.innerHTML = `<section class="warden-section"><div class="warden-npc-directory-layout">${renderNpcIndex(npcs)}<div class="warden-npc-detail-host">${renderNpcDetail(selectedNpc, state, selectedNpc ? npcs.indexOf(selectedNpc) : -1)}</div></div></section>`;
      root.querySelector('#wardenNpcAllGroups')?.addEventListener('click', () => {
        view.group = '';
        view.npc = '';
        renderDirectoryBody(root, state, npcs);
      });
      root.querySelectorAll('[data-npc-name]').forEach(button => {
        button.addEventListener('click', () => {
          view.npc = String(button.dataset.npcName || '');
          renderDirectoryBody(root, state, npcs);
          if (window.matchMedia?.('(max-width:760px)').matches) root.querySelector('.warden-npc-detail-host')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    root.querySelectorAll('[data-npc-group]').forEach(button => {
      button.addEventListener('click', () => {
        view.group = String(button.dataset.npcGroup || '');
        view.npc = '';
        renderDirectoryBody(root, state, npcs);
      });
    });

    bindNpcDetail(root, state, npcs);
  }

  function renderSearchResults(root, state, npcs) {
    const input = root.querySelector('#wardenNpcSearch');
    const host = root.querySelector('#wardenNpcSearchResults');
    if (!input || !host) return;
    const query = normalize(input.value);
    if (!query) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    const matches = npcs
      .filter(npc => normalize(npc.name).includes(query))
      .sort((a, b) => {
        const an = normalize(a.name), bn = normalize(b.name);
        const ae = an === query ? 0 : an.startsWith(query) ? 1 : 2;
        const be = bn === query ? 0 : bn.startsWith(query) ? 1 : 2;
        return ae - be || an.localeCompare(bn);
      })
      .slice(0, 10);
    host.innerHTML = matches.length ? matches.map(npc => `<button type="button" class="warden-npc-search-result" data-npc-search-name="${esc(npc.name || '')}"><strong>${esc(npc.name || 'Unnamed NPC')}</strong><span>${esc(directoryGroupOf(npc))} · ${esc(factionOf(npc))}</span></button>`).join('') : '<div class="warden-empty">No NPC names match that search.</div>';
    host.hidden = false;
    host.querySelectorAll('[data-npc-search-name]').forEach(button => {
      button.addEventListener('click', () => {
        const npc = npcs.find(item => String(item.name || '') === String(button.dataset.npcSearchName || ''));
        if (!npc) return;
        view.group = directoryGroupOf(npc);
        view.npc = String(npc.name || '');
        input.value = '';
        host.hidden = true;
        host.innerHTML = '';
        renderDirectoryBody(root, state, npcs);
        root.querySelector('.warden-npc-detail-host')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function bindNpcDetail(root, state, npcs) {
    const button = root.querySelector('.warden-load-portrait');
    if (button) {
      const card = button.closest('[data-npc-index]');
      const npc = npcs[Number(card?.dataset.npcIndex)];
      if (npc) button.addEventListener('click', () => loadPortrait(button, state, npc.name));
    }

    const form = root.querySelector('.warden-npc-form');
    if (form) {
      const card = form.closest('[data-npc-index]');
      const npc = npcs[Number(card?.dataset.npcIndex)];
      if (npc) {
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
      }
    }
  }

  function render(root, state) {
    installStyles();
    const feed = state.npcs;
    if (!feed?.ok) {
      root.innerHTML = '<div class="warden-empty">NPC FEED UNAVAILABLE</div>';
      return;
    }
    const npcs = Array.isArray(feed.npcs) ? feed.npcs : [];
    const mutationsEnabled = Boolean(state.mutationsEnabled);
    reconcileView(npcs);
    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>NPCs</h1><p>CANON NPC continuity records. Browse by major directory group or search by NPC name. Exact Faction / Institution remains visible on every NPC record. Preview operational-state changes before Commit.</p></div><div class="warden-status-chip">${mutationsEnabled ? 'LIVE MUTATIONS ENABLED' : 'PREVIEW ONLY // WRITES DISABLED'}</div></div>
      <div class="warden-npc-directory-tools">
        <div class="warden-npc-search-wrap">
          <label class="warden-field-label" for="wardenNpcSearch">SEARCH NPC NAME</label>
          <input id="wardenNpcSearch" class="warden-field warden-npc-search" type="search" autocomplete="off" spellcheck="false" placeholder="TYPE A NAME…">
          <div id="wardenNpcSearchResults" class="warden-npc-search-results" hidden></div>
        </div>
        <div id="wardenNpcDirectoryContext" class="warden-npc-directory-context"></div>
      </div>
      <div id="wardenNpcDirectoryBody"></div>
      <section class="warden-section"><h2>Audited NPC Updates</h2>${renderHistory(feed, state)}</section>
      ${Array.isArray(feed.excluded) && feed.excluded.length ? `<section class="warden-section"><h2>Excluded Non-CANON Roster Rows</h2><div class="warden-small">${feed.excluded.map(x => `${esc(x.name)} — ${esc(x.reason)}`).join('<br>')}</div></section>` : ''}
    `;

    const search = root.querySelector('#wardenNpcSearch');
    search?.addEventListener('input', () => renderSearchResults(root, state, npcs));
    search?.addEventListener('focus', () => renderSearchResults(root, state, npcs));
    search?.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        search.value = '';
        renderSearchResults(root, state, npcs);
        search.blur();
      }
    });

    renderDirectoryBody(root, state, npcs);

    root.querySelectorAll('.warden-npc-undo').forEach(button => {
      if (!mutationsEnabled || button.disabled) return;
      button.addEventListener('click', () => undoChange(button, state, button.dataset.transaction));
    });
  }

  window.HubWardenNpcs = Object.freeze({ build: BUILD, render });
})();
