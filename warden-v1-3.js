(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const STATE = {
    feed: null,
    rewardOptions: null,
    current: null,
    mode: 'close',
    pendingContinuity: []
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const opt = (value, label, selected) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;

  function installDom() {
    const grid = document.querySelector('#modal .grid');
    if (grid && !document.getElementById('contractorName')) {
      const label = document.createElement('label');
      label.innerHTML = '<span class="label">CONTRACTOR / SPECIALIST</span><input id="contractorName" class="field" maxlength="200" placeholder="Name or established identifier">';
      const compensation = document.getElementById('contractor')?.closest('label');
      grid.insertBefore(label, compensation || null);
      document.getElementById('contractorName')?.addEventListener('input', invalidatePreview);
    }

    const rewardBox = document.querySelector('.rewardbox');
    if (rewardBox && !document.getElementById('continuityBox')) {
      const box = document.createElement('div');
      box.id = 'continuityBox';
      box.className = 'rewardbox';
      box.innerHTML = `
        <div class="rewardhead">
          <div>
            <div class="label">CONTINUITY / CONSEQUENCES</div>
            <div class="small">Writes the existing Campaign Thread Ledger beat fields. A next possible beat is never scheduled automatically.</div>
          </div>
          <button id="addContinuity" class="btn mini" type="button" disabled>+ ADD CONTINUITY / CONSEQUENCE</button>
        </div>
        <div id="continuityAvailability" class="small" style="margin-top:8px">Requires Warden backend v1.3.</div>
        <div id="continuityList" class="rewardlist"></div>`;
      rewardBox.insertAdjacentElement('afterend', box);
      document.getElementById('addContinuity').addEventListener('click', () => addContinuity());
    }

    const sub = document.querySelector('header .sub');
    if (sub) sub.textContent = 'Private campaign administration — closeout v1.3 // audited campaign effects & continuity';
  }

  function invalidatePreview() {
    const commit = document.getElementById('commit');
    if (commit) commit.disabled = true;
  }

  function sanitizeFeedForV12(feed) {
    const clone = JSON.parse(JSON.stringify(feed || {}));
    for (const c of clone.history || []) {
      if (Array.isArray(c.audit?.structuredRewards)) {
        c.audit.structuredRewards = c.audit.structuredRewards.filter(x => String(x?.type || '').toUpperCase() !== 'CONTINUITY');
      }
    }
    return clone;
  }

  function captureFeed(feed) {
    STATE.feed = JSON.parse(JSON.stringify(feed || {}));
  }

  function captureRewardOptions(payload) {
    STATE.rewardOptions = payload || null;
    const ok = Array.isArray(payload?.threads) && payload.threads.length && Array.isArray(payload?.threadStates) && payload.threadStates.length;
    const btn = document.getElementById('addContinuity');
    const note = document.getElementById('continuityAvailability');
    if (btn) btn.disabled = !ok;
    if (note) note.textContent = ok
      ? 'Campaign Thread Ledger options loaded. Closeout continuity entries are audited and reversible.'
      : 'Current backend does not expose the v1.3 Campaign Thread Ledger schema yet.';
    if (ok && STATE.pendingContinuity.length) {
      const pending = STATE.pendingContinuity.splice(0);
      pending.forEach(x => addContinuity(x));
    }
  }

  function collectContinuity() {
    return [...document.querySelectorAll('#continuityList .continuity-effect')].map(el => ({
      type: 'CONTINUITY',
      thread: el.querySelector('.cThread').value,
      state: el.querySelector('.cState').value,
      lastBeat: el.querySelector('.cLastBeat').value.trim(),
      whatChanged: el.querySelector('.cChanged').value.trim(),
      playerKnownBoundary: el.querySelector('.cKnown').value.trim(),
      nextPossibleBeat: el.querySelector('.cNext').value.trim(),
      intersectionCandidates: el.querySelector('.cIntersections').value.trim(),
      unresolved: el.querySelector('.cUnresolved').value.trim()
    }));
  }

  function addContinuity(data = {}) {
    const o = STATE.rewardOptions;
    if (!Array.isArray(o?.threads) || !o.threads.length || !Array.isArray(o?.threadStates) || !o.threadStates.length) return;
    const list = document.getElementById('continuityList');
    if (!list) return;
    const thread = data.thread || o.threads[0];
    const state = data.state || 'CONSEQUENCE';
    const el = document.createElement('div');
    el.className = 'reward continuity-effect';
    el.innerHTML = `
      <div class="rewardtop"><strong style="flex:1">CAMPAIGN THREAD LEDGER BEAT</strong><button type="button" class="btn mini danger cRemove">REMOVE</button></div>
      <div class="rewardfields">
        <label class="wide"><span class="label">EXISTING THREAD / ROUTING</span><select class="select cThread">${o.threads.map(x => opt(x,x,x===thread)).join('')}</select></label>
        <label><span class="label">THREAD STATE</span><select class="select cState">${o.threadStates.map(x => opt(x,x,x===state)).join('')}</select></label>
        <label class="wide"><span class="label">LAST BEAT</span><textarea class="textarea cLastBeat" maxlength="1200" style="min-height:65px">${esc(data.lastBeat || '')}</textarea></label>
        <label class="wide"><span class="label">WHAT CHANGED</span><textarea class="textarea cChanged" maxlength="1200" style="min-height:65px">${esc(data.whatChanged || '')}</textarea></label>
        <label class="wide"><span class="label">PLAYER-KNOWN BOUNDARY</span><textarea class="textarea cKnown" maxlength="1200" style="min-height:65px">${esc(data.playerKnownBoundary || '')}</textarea></label>
        <label class="wide"><span class="label">NEXT POSSIBLE BEAT (OPTIONAL — NOT SCHEDULED)</span><textarea class="textarea cNext" maxlength="1200" style="min-height:65px">${esc(data.nextPossibleBeat || '')}</textarea></label>
        <label class="wide"><span class="label">INTERSECTION CANDIDATES (OPTIONAL)</span><textarea class="textarea cIntersections" maxlength="1200" style="min-height:65px">${esc(data.intersectionCandidates || '')}</textarea></label>
        <label class="wide"><span class="label">UNRESOLVED PROMISES / CONSEQUENCES</span><textarea class="textarea cUnresolved" maxlength="1200" style="min-height:75px">${esc(data.unresolved || '')}</textarea></label>
      </div>
      <div class="rewardcontext"></div>`;
    list.appendChild(el);
    const updateContext = () => {
      const t = el.querySelector('.cThread').value;
      el.querySelector('.rewardcontext').textContent = t === 'UNASSIGNED / EMERGENT'
        ? 'Records a play-established consequence without automatically promoting it into a new campaign thread.'
        : 'Records a beat against an existing established thread. The newest committed beat-log entry is the current closeout-derived beat until deliberately consolidated.';
    };
    el.querySelector('.cRemove').addEventListener('click', () => { el.remove(); invalidatePreview(); });
    el.querySelector('.cThread').addEventListener('change', () => { updateContext(); invalidatePreview(); });
    el.querySelectorAll('input,select,textarea').forEach(x => x.addEventListener('input', invalidatePreview));
    updateContext();
    invalidatePreview();
  }

  function clearPatchFields() {
    const name = document.getElementById('contractorName');
    if (name) name.value = '';
    const list = document.getElementById('continuityList');
    if (list) list.innerHTML = '';
    STATE.pendingContinuity = [];
  }

  function openPatchForContract(contract, mode) {
    STATE.current = contract || null;
    STATE.mode = mode || 'close';
    clearPatchFields();
    const name = document.getElementById('contractorName');
    if (name) name.value = contract?.audit?.contractorName || contract?.contractorName || '';
    const prior = mode === 'amend' && Array.isArray(contract?.audit?.structuredRewards)
      ? contract.audit.structuredRewards.filter(x => String(x?.type || '').toUpperCase() === 'CONTINUITY')
      : [];
    if (prior.length) {
      if (STATE.rewardOptions?.threads?.length) prior.forEach(x => addContinuity(x));
      else STATE.pendingContinuity = prior;
    }
  }

  function handleClick(event) {
    const resolve = event.target.closest('[data-r]');
    if (resolve && STATE.feed?.active) {
      openPatchForContract(STATE.feed.active[Number(resolve.dataset.r)], 'close');
      return;
    }
    const amend = event.target.closest('[data-amend]');
    if (amend && STATE.feed?.history) {
      openPatchForContract(STATE.feed.history[Number(amend.dataset.amend)], 'amend');
      return;
    }
    if (event.target.closest('#x,#cancel,#playerPage,#lock')) {
      STATE.current = null;
      STATE.mode = 'close';
      clearPatchFields();
    }
  }

  function patchOutgoingScript(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    let url;
    try { url = new URL(script.src, location.href); } catch (_) { return; }
    if (url.origin + url.pathname !== new URL(API).origin + new URL(API).pathname) return;
    const action = String(url.searchParams.get('action') || '').toLowerCase();
    const callbackName = url.searchParams.get('callback');

    if (['wardenpreview','wardenclose','wardenamend'].includes(action)) {
      const name = document.getElementById('contractorName')?.value.trim() || '';
      url.searchParams.set('contractorName', name);
      let rewards = [];
      try { rewards = JSON.parse(url.searchParams.get('rewards') || '[]'); } catch (_) { rewards = []; }
      rewards = Array.isArray(rewards) ? rewards.filter(x => String(x?.type || '').toUpperCase() !== 'CONTINUITY') : [];
      rewards.push(...collectContinuity());
      url.searchParams.set('rewards', JSON.stringify(rewards));
      script.src = url.toString();
    }

    if (!callbackName) return;
    const original = window[callbackName];
    if (typeof original !== 'function' || original.__wardenV13Wrapped) return;

    const wrapped = payload => {
      if (action === 'wardenfeed' && payload?.ok) {
        captureFeed(payload);
        original(sanitizeFeedForV12(payload));
        return;
      }
      if (action === 'wardenrewardoptions' && payload?.ok) captureRewardOptions(payload);
      original(payload);
    };
    wrapped.__wardenV13Wrapped = true;
    window[callbackName] = wrapped;
  }

  function installInterceptor() {
    const originalAppendChild = Node.prototype.appendChild;
    if (originalAppendChild.__wardenV13Patched) return;
    function patched(node) {
      patchOutgoingScript(node);
      return originalAppendChild.call(this, node);
    }
    patched.__wardenV13Patched = true;
    Node.prototype.appendChild = patched;
  }

  installDom();
  installInterceptor();
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { STATE.current = null; STATE.mode = 'close'; clearPatchFields(); } });
})();
