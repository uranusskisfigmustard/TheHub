(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const STATE = { context: null, stateToken: '', mutations: [] };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function invalidate() {
    STATE.stateToken = '';
    STATE.mutations = [];
    const commit = $('sessionCloseCommit');
    const preview = $('sessionClosePreview');
    const detail = $('scStatePreview');
    if (commit) commit.disabled = true;
    if (preview) preview.classList.add('hidden');
    if (detail) detail.innerHTML = '';
  }

  function installStyles() {
    if ($('wardenV15Styles')) return;
    const style = document.createElement('style');
    style.id = 'wardenV15Styles';
    style.textContent = `
      .scstate-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
      .scstate-card{border:1px solid var(--line);background:var(--panel2);padding:11px}
      .scstate-card strong{display:block;margin-bottom:6px}
      .scstate-training{display:flex;gap:9px;align-items:flex-start;border-top:1px solid #303538;padding:9px 0}
      .scstate-training:first-child{border-top:0}
      .scstate-training input{margin-top:4px}
      #scStatePreview{margin-top:10px;border-left:2px solid var(--accent);padding-left:10px}
      @media(max-width:760px){.scstate-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installDom() {
    const context = $('sessionCloseContext');
    if (context && !$('scStructuredState')) {
      const box = document.createElement('div');
      box.id = 'scStructuredState';
      box.className = 'rewardbox';
      box.innerHTML = `
        <div class="rewardhead">
          <div>
            <div class="label">STRUCTURED CURRENT STATE / TRAINING</div>
            <div class="small">Optional explicit mutations. Blank Stress means no change. Training advances only when you affirm this session satisfied the listed requirement.</div>
          </div>
        </div>
        <div id="scStateControls" class="small" style="margin-top:8px">Open Session Close to load current state.</div>
        <div id="scStatePreview"></div>`;
      context.insertAdjacentElement('afterend', box);
    }
    const sub = document.querySelector('header .sub');
    if (sub) sub.textContent = 'Private campaign administration — closeout v1.5 // audited campaign effects & session state';
  }

  function renderContext(c) {
    STATE.context = c || null;
    STATE.stateToken = '';
    const host = $('scStateControls');
    if (!host) return;

    const chars = Array.isArray(c?.characters) ? c.characters : [];
    const training = Array.isArray(c?.activeTraining) ? c.activeTraining : [];
    const characterHtml = chars.length ? `
      <div class="label" style="margin-top:8px">CURRENT STRESS</div>
      <div class="scstate-grid">${chars.map(x => {
        const current = x.currentStress === null || x.currentStress === undefined ? 'unreadable' : x.currentStress;
        const minimum = x.minimumStress === null || x.minimumStress === undefined ? '' : ` · explicit minimum ${esc(x.minimumStress)}`;
        const minAttr = x.minimumStress === null || x.minimumStress === undefined ? '0' : String(x.minimumStress);
        const disabled = x.currentStress === null || x.currentStress === undefined ? ' disabled' : '';
        return `<label class="scstate-card">
          <strong>${esc(x.name)}</strong>
          <span class="small">Current ${esc(current)}${minimum}</span>
          <input class="field scStress" data-character="${esc(x.name)}" type="number" min="${esc(minAttr)}" max="20" step="1" placeholder="No change"${disabled}>
        </label>`;
      }).join('')}</div>` : '<div class="small">No current characters available.</div>';

    const trainingHtml = training.length ? `
      <div class="label" style="margin-top:14px">ACTIVE TRAINING</div>
      <div class="scstate-card">${training.map(t => {
        const disabled = t.canAdvance ? '' : ' disabled';
        const note = t.canAdvance
          ? 'Check only if this session actually satisfied the requirement below.'
          : 'This active row is not in a machine-readable session-progress format and cannot be advanced here.';
        return `<label class="scstate-training">
          <input class="scTraining" data-row="${esc(t.row)}" type="checkbox"${disabled}>
          <span><strong>${esc(t.character)} — ${esc(t.skill)} (${esc(t.level)})</strong>
          <span class="small">${esc(t.status)}${t.timeRemaining ? ' · ' + esc(t.timeRemaining) : ''}<br>${esc(note)}<br>REQUIREMENT: ${esc(t.requirement || 'No requirement text recorded.')}</span></span>
        </label>`;
      }).join('')}</div>` : '<div class="small" style="margin-top:12px">No active Training projects.</div>';

    host.innerHTML = characterHtml + trainingHtml;
    host.querySelectorAll('input').forEach(el => el.addEventListener('input', invalidate));
  }

  function collectChanges() {
    const changes = [];
    document.querySelectorAll('.scStress').forEach(input => {
      const raw = String(input.value || '').trim();
      if (!raw) return;
      changes.push({
        type: 'STRESS',
        character: input.dataset.character || '',
        value: Number(raw)
      });
    });
    document.querySelectorAll('.scTraining:checked').forEach(input => {
      changes.push({
        type: 'TRAINING',
        row: Number(input.dataset.row),
        qualifies: true
      });
    });
    return changes;
  }

  function renderPreview(payload) {
    const box = $('scStatePreview');
    if (!box) return;
    const list = Array.isArray(payload?.stateMutations) ? payload.stateMutations : [];
    STATE.mutations = list;
    if (!list.length) {
      box.innerHTML = '<div class="small">Structured state changes: none.</div>';
      return;
    }
    box.innerHTML = `<div class="label">STRUCTURED STATE CHANGES IN THIS COMMIT</div><ul>${
      list.map(m => {
        if (String(m.type).toUpperCase() === 'STRESS') {
          return `<li>${esc(m.character)}: Stress ${esc(m.from)} → ${esc(m.to)}${m.minimumStress !== null && m.minimumStress !== undefined ? `; minimum ${esc(m.minimumStress)} preserved` : ''}</li>`;
        }
        if (String(m.type).toUpperCase() === 'TRAINING') {
          return `<li>${esc(m.character)} — ${esc(m.skill)}: ${esc(m.fromCompleted)} / ${esc(m.totalSessions)} → ${esc(m.toCompleted)} / ${esc(m.totalSessions)}${m.complete ? '; completes training and synchronizes Character Skills' : ''}</li>`;
        }
        return `<li>${esc(m.type)}</li>`;
      }).join('')
    }</ul>`;
  }

  function patchScript(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    let url;
    try { url = new URL(script.src, location.href); } catch (_) { return; }
    let api;
    try { api = new URL(API); } catch (_) { return; }
    if (url.origin !== api.origin || url.pathname !== api.pathname) return;

    const action = String(url.searchParams.get('action') || '').toLowerCase();
    const callbackName = url.searchParams.get('callback');
    if (action === 'wardensessionpreview' || action === 'wardensessionclose') {
      const contextOnly = String(url.searchParams.get('contextOnly') || '').toLowerCase() === 'true';
      if (!contextOnly) {
        url.searchParams.set('stateChanges', JSON.stringify(collectChanges()));
        if (action === 'wardensessionclose' && STATE.stateToken) url.searchParams.set('stateToken', STATE.stateToken);
        script.src = url.toString();
      }
    }

    if (!callbackName) return;
    const original = window[callbackName];
    if (typeof original !== 'function' || original.__wardenV15Wrapped) return;

    const wrapped = payload => {
      if (action === 'wardensessionpreview' && payload?.ok) {
        const contextOnly = String(url.searchParams.get('contextOnly') || '').toLowerCase() === 'true';
        if (contextOnly) {
          renderContext(payload);
        } else {
          STATE.stateToken = String(payload.stateToken || '');
          setTimeout(() => renderPreview(payload), 0);
        }
      }
      if (action === 'wardensessionclose' && payload?.ok) {
        STATE.stateToken = '';
        STATE.mutations = [];
      }
      original(payload);
    };
    wrapped.__wardenV15Wrapped = true;
    window[callbackName] = wrapped;
  }

  function installInterceptor() {
    const prev = Node.prototype.appendChild;
    if (prev.__wardenV15Patched) return;
    function patched(node) {
      patchScript(node);
      return prev.call(this, node);
    }
    patched.__wardenV15Patched = true;
    Node.prototype.appendChild = patched;
  }

  function watch() {
    document.addEventListener('click', e => {
      if (e.target.closest('#openSessionClose')) {
        STATE.stateToken = '';
        STATE.mutations = [];
      }
      if (e.target.closest('#sessionCloseCancel,#sessionCloseX,#lock,#playerPage')) {
        STATE.stateToken = '';
        STATE.mutations = [];
      }
    }, true);
  }

  installStyles();
  installDom();
  installInterceptor();
  watch();
})();