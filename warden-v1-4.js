(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_warden_session_v1';
  const STATE = { context: null, preview: null };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => (Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})+'cr';

  function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      const cb = '__wsc' + Date.now() + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(() => done(new Error('Warden service timed out.')), 30000);
      function done(err, data) {
        clearTimeout(timer);
        try { delete window[cb]; } catch (_) { window[cb] = undefined; }
        script.remove();
        err ? reject(err) : resolve(data);
      }
      window[cb] = data => done(null, data);
      script.onerror = () => done(new Error('Could not reach Warden service.'));
      script.src = API + '?' + new URLSearchParams({ action, callback: cb, ...params });
      document.head.appendChild(script);
    });
  }

  function installStyles() {
    if ($('sessionCloseStyles')) return;
    const style = document.createElement('style');
    style.id = 'sessionCloseStyles';
    style.textContent = `
      .sessionclose-panel{border-color:var(--accent)!important}
      .sessionclose-head{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}
      .sessionclose-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}
      .sessionclose-grid .wide{grid-column:1/-1}
      .sessionclose-context{display:grid;gap:8px;margin-top:12px}
      .sessionclose-context .ctx{border:1px solid var(--line);background:var(--panel2);padding:9px;font-size:.78rem}
      #sessionCloseModal .shell{width:min(1000px,100%)}
      #sessionCloseModal .textarea{min-height:76px}
      #sessionClosePreview{white-space:normal}
      #sessionClosePreview ul{margin:7px 0 0;padding-left:20px}
      @media(max-width:760px){.sessionclose-grid{grid-template-columns:1fr}.sessionclose-grid .wide{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function installPanel() {
    if ($('sessionClosePanel')) return;
    const consoleEl = $('console');
    const metrics = consoleEl?.querySelector('.metrics');
    if (!consoleEl || !metrics) return;
    const panel = document.createElement('section');
    panel.id = 'sessionClosePanel';
    panel.className = 'panel sessionclose-panel';
    panel.style.marginTop = '15px';
    panel.innerHTML = `
      <div class="sessionclose-head">
        <div><h2 style="margin:0">Session Close</h2><div class="small">Consolidate factual session continuity. Weekly payroll remains under the existing Saturday/Sunday financial workflow.</div></div>
        <button id="openSessionClose" class="btn primary" type="button">OPEN SESSION CLOSE</button>
      </div>
      <div id="sessionCloseVersion" class="small" style="margin-top:9px">Requires Warden backend v1.4 / service v6.5.</div>`;
    metrics.insertAdjacentElement('afterend', panel);
    $('openSessionClose').addEventListener('click', openSessionClose);
  }

  function installModal() {
    if ($('sessionCloseModal')) return;
    const modal = document.createElement('div');
    modal.id = 'sessionCloseModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `<div class="shell">
      <div class="mhead"><div><div class="label">CAMPAIGN ADMINISTRATION</div><h2>SESSION CLOSE</h2><div class="small">Records factual outcomes in Timeline & Session Log. Does not post weekly payroll or auto-advance training.</div></div><button id="sessionCloseX" class="btn">×</button></div>
      <div id="sessionCloseContext" class="sessionclose-context"></div>
      <div class="sessionclose-grid">
        <label><span class="label">SESSION NUMBER</span><input id="scNumber" class="field" type="number" min="1" max="999"></label>
        <label><span class="label">SESSION TITLE (OPTIONAL)</span><input id="scTitle" class="field" maxlength="180"></label>
        <label><span class="label">REAL-WORLD DATE</span><input id="scRealDate" class="field" placeholder="YYYY-MM-DD"></label>
        <label><span class="label">LOCATIONS VISITED</span><input id="scLocations" class="field" maxlength="1000"></label>
        <label><span class="label">CAMPAIGN START</span><input id="scStart" class="field" placeholder="YYYY-DDD"></label>
        <label><span class="label">CAMPAIGN END</span><input id="scEnd" class="field" placeholder="YYYY-DDD"></label>
        <label class="wide"><span class="label">FACTUAL SESSION SUMMARY</span><textarea id="scSummary" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">IMPORTANT SCENES / DECISIONS</span><textarea id="scDecisions" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">NPC / RELATIONSHIP CHANGES</span><textarea id="scNpc" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">INFORMATION DISCOVERED</span><textarea id="scDiscoveries" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">PROMISES / FAVORS / DEBTS / CONTRACTS / BETRAYALS</span><textarea id="scObligations" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">INJURIES / CONDITIONS / STRESS / CYBERNETICS / EQUIPMENT CHANGES</span><textarea id="scStatus" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">CREDITS / OTHER REWARDS</span><textarea id="scRewards" class="textarea" maxlength="1400"></textarea></label>
        <label class="wide"><span class="label">UNRESOLVED QUESTIONS / IMMEDIATE NEXT STEPS</span><textarea id="scUnresolved" class="textarea" maxlength="1800"></textarea></label>
        <label class="wide"><span class="label">REQUIRED SOURCE UPDATES</span><textarea id="scUpdates" class="textarea" maxlength="1800"></textarea></label>
      </div>
      <div id="sessionClosePreview" class="review hidden"></div>
      <div id="sessionCloseResult" class="notice hidden"></div>
      <div class="mactions"><button id="sessionCloseCancel" class="btn">CANCEL</button><button id="sessionClosePreviewBtn" class="btn primary">PREVIEW SESSION CLOSE</button><button id="sessionCloseCommit" class="btn primary" disabled>COMMIT SESSION CLOSE</button></div>
    </div>`;
    document.body.appendChild(modal);
    $('sessionCloseX').addEventListener('click', closeSessionClose);
    $('sessionCloseCancel').addEventListener('click', closeSessionClose);
    $('sessionClosePreviewBtn').addEventListener('click', previewSessionClose);
    $('sessionCloseCommit').addEventListener('click', commitSessionClose);
    modal.querySelectorAll('input,textarea').forEach(x => x.addEventListener('input', () => { STATE.preview=null; $('sessionCloseCommit').disabled=true; $('sessionClosePreview').classList.add('hidden'); }));
  }

  function sessionToken() { return localStorage.getItem(SESSION_KEY) || ''; }

  function closeSessionClose() {
    const m = $('sessionCloseModal');
    if (m) m.classList.add('hidden');
    document.body.style.overflow = '';
    STATE.preview = null;
  }

  function contextHtml(c) {
    const finance = (c.finance||[]).map(x => {
      const weekly = x.weeklyCurrent ? `WEEKLY CURRENT THROUGH ${esc(x.weeklyCloseThrough)}` : `WEEKLY FOLLOW-UP THROUGH ${esc(x.weeklyCloseThrough)}`;
      const interest = x.interestDue ? `INTEREST DUE ${esc(x.nextInterestCheckpoint)}` : (x.nextInterestCheckpoint ? `NEXT INTEREST ${esc(x.nextInterestCheckpoint)}` : 'INTEREST CHECKPOINT UNRESOLVED');
      return `<div class="ctx"><strong>${esc(x.name)}</strong><br>${weekly} · ${interest}<br>Debt ${money(x.totalObligation)} · Personal ${money(x.personalBalance)} · Withhold ${esc(x.withholding)}</div>`;
    }).join('');
    const active = c.activeContracts?.length ? c.activeContracts.map(x=>esc(x.title)).join('; ') : 'None';
    const training = c.activeTraining?.length ? c.activeTraining.map(x=>`${esc(x.character)} — ${esc(x.skill)} (${esc(x.status)})`).join('<br>') : 'None';
    return `${finance}<div class="ctx"><strong>ACTIVE CONTRACTS</strong><br>${active}</div><div class="ctx"><strong>ACTIVE TRAINING — REVIEW ONLY</strong><br>${training}</div>`;
  }

  async function openSessionClose() {
    const token = sessionToken();
    if (!token) return;
    STATE.preview = null;
    $('sessionCloseCommit').disabled = true;
    $('sessionClosePreview').classList.add('hidden');
    $('sessionCloseResult').className = 'notice hidden';
    $('sessionCloseModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('sessionCloseContext').innerHTML = '<div class="ctx">LOADING SESSION CONTEXT…</div>';
    try {
      const c = await jsonp('wardensessionpreview',{session:token,contextOnly:'true'});
      if (!c?.ok) throw new Error(c?.error || 'Session Close context unavailable.');
      STATE.context = c;
      $('sessionCloseVersion').textContent = `BACKEND ${c.serviceVersion || '?'} // WARDEN ${c.wardenVersion || '?'} // SESSION CLOSE READY`;
      $('sessionCloseContext').innerHTML = contextHtml(c);
      $('scNumber').value = c.suggestedSessionNumber || '';
      $('scStart').value = c.campaignDate || '';
      $('scEnd').value = c.campaignDate || '';
      $('scRealDate').value = new Date().toISOString().slice(0,10);
    } catch (e) {
      $('sessionCloseContext').innerHTML = `<div class="ctx" style="border-color:var(--danger)">${esc(e.message||e)}</div>`;
      $('sessionCloseVersion').textContent = 'SESSION CLOSE BACKEND NOT AVAILABLE';
    }
  }

  function params() {
    return {
      session: sessionToken(),
      sessionNumber: $('scNumber').value,
      sessionTitle: $('scTitle').value,
      realDate: $('scRealDate').value,
      campaignStart: $('scStart').value,
      campaignEnd: $('scEnd').value,
      locations: $('scLocations').value,
      summary: $('scSummary').value,
      decisions: $('scDecisions').value,
      npcChanges: $('scNpc').value,
      discoveries: $('scDiscoveries').value,
      obligations: $('scObligations').value,
      statusChanges: $('scStatus').value,
      rewards: $('scRewards').value,
      unresolved: $('scUnresolved').value,
      requiredUpdates: $('scUpdates').value
    };
  }

  async function previewSessionClose() {
    $('sessionClosePreviewBtn').disabled = true;
    $('sessionCloseCommit').disabled = true;
    try {
      const r = await jsonp('wardensessionpreview',params());
      if (!r?.ok) throw new Error(r?.error || 'Session Close preview failed.');
      STATE.preview = r;
      const warnings = r.warnings?.length ? `<ul>${r.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="small">No follow-up warnings.</div>';
      $('sessionClosePreview').innerHTML = `<strong>SESSION ${esc(r.record.sessionNumber)} — ${esc(r.record.campaignStart)} → ${esc(r.record.campaignEnd)}</strong><br><span class="small">This writes Timeline & Session Log only. No weekly wages, charges, interest, or training progress are posted by Session Close.</span>${warnings}`;
      $('sessionClosePreview').classList.remove('hidden');
      $('sessionCloseCommit').disabled = false;
      $('sessionCloseResult').className = 'notice hidden';
    } catch (e) {
      $('sessionCloseResult').textContent = String(e.message||e);
      $('sessionCloseResult').className = 'notice bad';
    } finally { $('sessionClosePreviewBtn').disabled = false; }
  }

  async function commitSessionClose() {
    if (!STATE.preview) return;
    $('sessionCloseCommit').disabled = true;
    $('sessionClosePreviewBtn').disabled = true;
    try {
      const r = await jsonp('wardensessionclose',params());
      if (!r?.ok) throw new Error(r?.error || 'Session Close commit failed.');
      $('sessionCloseResult').textContent = `SESSION ${r.sessionNumber} RECORDED // ${r.receipt}`;
      $('sessionCloseResult').className = 'notice ok';
      STATE.preview = null;
      setTimeout(closeSessionClose, 900);
    } catch (e) {
      $('sessionCloseResult').textContent = String(e.message||e);
      $('sessionCloseResult').className = 'notice bad';
    } finally { $('sessionClosePreviewBtn').disabled = false; }
  }

  function watchLock() {
    document.addEventListener('click', e => {
      if (e.target.closest('#lock,#playerPage')) closeSessionClose();
    }, true);
    const consoleEl = $('console');
    if (consoleEl) new MutationObserver(() => { if (consoleEl.classList.contains('hidden')) closeSessionClose(); }).observe(consoleEl,{attributes:true,attributeFilter:['class']});
  }

  installStyles();
  installPanel();
  installModal();
  watchLock();
})();