(() => {
  'use strict';

  const BUILD = '20260920-warden-purchase-test-admin-3';
  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_warden_session_v1';
  const POST_SOURCE = 'mothership-contract-service-post';
  const $ = id => document.getElementById(id);

  let state = null;
  let supported = false;
  let previewToken = '';
  let rollbackPreview = null;
  let busy = false;
  let noticeMessage = '';
  let noticeKind = '';
  let transport = '';

  function session() {
    try { return String(localStorage.getItem(SESSION_KEY) || '').trim(); }
    catch (_) { return ''; }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function when(ms) {
    const n = Number(ms || 0);
    if (!n) return '—';
    try { return new Date(n).toLocaleString(); }
    catch (_) { return String(n); }
  }

  function money(value) {
    return Number(value || 0).toLocaleString(undefined, {maximumFractionDigits:2}) + 'cr';
  }

  function postRequest(action, params = {}, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = `purchase-test-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
      const iframe = document.createElement('iframe');
      const form = document.createElement('form');
      const frameName = `purchaseTestPost_${requestId.replace(/[^A-Za-z0-9_]/g,'_')}`;
      let settled = false;
      let timer = null;

      iframe.name = frameName;
      iframe.hidden = true;
      iframe.setAttribute('aria-hidden','true');
      form.method = 'POST';
      form.action = API;
      form.target = frameName;
      form.hidden = true;
      form.acceptCharset = 'UTF-8';

      Object.entries({action, requestId, session:session(), ...params}).forEach(([name,value]) => {
        if (value === undefined || value === null) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value);
        form.appendChild(input);
      });

      function cleanup() {
        window.removeEventListener('message', onMessage);
        if (timer) clearTimeout(timer);
        form.remove();
        setTimeout(() => iframe.remove(), 0);
      }

      function finish(fn, value) {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      }

      function onMessage(event) {
        const data = event?.data;
        if (!data || data.source !== POST_SOURCE || data.requestId !== requestId) return;
        finish(resolve, data.payload || {});
      }

      window.addEventListener('message', onMessage);
      iframe.addEventListener('error', () => finish(reject, new Error('Could not reach the Warden service.')), {once:true});
      document.body.appendChild(iframe);
      document.body.appendChild(form);
      timer = setTimeout(() => finish(reject, new Error('Purchase Test service timed out.')), timeoutMs);
      try { form.submit(); }
      catch (error) { finish(reject, error); }
    });
  }

  function jsonpRequest(action, params = {}, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const callback = '__purchaseTestAdmin_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      let settled = false;
      const timer = setTimeout(() => finish(new Error('Purchase Test service timed out.')), timeoutMs);

      function finish(error, payload) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        script.remove();
        error ? reject(error) : resolve(payload);
      }

      window[callback] = payload => finish(null, payload || {});
      script.onerror = () => finish(new Error('Could not reach the Warden service.'));
      script.src = API + '?' + new URLSearchParams({action, callback, session:session(), ...params});
      document.head.appendChild(script);
    });
  }

  async function request(action, params = {}) {
    try {
      const payload = await postRequest(action, params);
      const unsupported = payload?.ok === false && /unknown submission-service action/i.test(String(payload?.error || ''));
      if (!unsupported) {
        transport = 'POST COMPATIBILITY';
        return payload;
      }
    } catch (_) {}

    const payload = await jsonpRequest(action, params);
    transport = 'LEGACY JSONP';
    return payload;
  }

  function installStyles() {
    if ($('wardenPurchaseTestAdminStyles')) return;
    const style = document.createElement('style');
    style.id = 'wardenPurchaseTestAdminStyles';
    style.textContent = `
      #wardenPurchaseTestPanel .pt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
      #wardenPurchaseTestPanel .pt-cell{border:1px solid var(--line);background:var(--panel2);padding:9px 10px;min-width:0}
      #wardenPurchaseTestPanel .pt-cell span{display:block;color:var(--muted);font-size:.68rem;letter-spacing:.07em;text-transform:uppercase}
      #wardenPurchaseTestPanel .pt-cell strong{display:block;margin-top:4px;overflow-wrap:anywhere}
      #wardenPurchaseTestPanel .pt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      #wardenPurchaseTestPanel .pt-note{margin-top:9px;color:var(--muted);font-size:.76rem}
      #wardenPurchaseTestPanel .pt-preview{margin-top:10px;border:1px solid var(--accent);background:#15181a;padding:10px}
      #wardenPurchaseTestPanel .pt-bad{border-color:var(--danger)!important;color:#d78c7d}
      #wardenPurchaseTestPanel .pt-ok{border-color:var(--ok)!important;color:#b6c7a8}
      @media(max-width:900px){#wardenPurchaseTestPanel .pt-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){#wardenPurchaseTestPanel .pt-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installPanel() {
    if ($('wardenPurchaseTestPanel')) return $('wardenPurchaseTestPanel');
    const consoleEl = $('console');
    if (!consoleEl) return null;
    const panel = document.createElement('section');
    panel.id = 'wardenPurchaseTestPanel';
    panel.className = 'panel';
    panel.dataset.workspaces = 'admin';
    const anchor = $('wardenAdjustPanel') || $('audit')?.closest('.panel') || consoleEl.lastElementChild;
    if (anchor && anchor.parentElement === consoleEl) consoleEl.insertBefore(panel, anchor);
    else consoleEl.appendChild(panel);
    syncVisibility();
    return panel;
  }

  function syncVisibility() {
    const panel = $('wardenPurchaseTestPanel');
    if (!panel) return;
    const active = document.querySelector('.wc-workspace-btn.active')?.dataset.workspace || 'dashboard';
    panel.classList.toggle('wc-workspace-hidden', active !== 'admin');
  }

  function setNotice(message, kind = '') {
    noticeMessage = String(message || '');
    noticeKind = String(kind || '');
    const host = $('wardenPurchaseTestMessage');
    if (!host) return;
    host.textContent = noticeMessage;
    host.className = 'notice' + (noticeKind ? ' ' + noticeKind : '') + (noticeMessage ? '' : ' hidden');
  }

  function backupStatus(active, blocked, s, last) {
    if (active || blocked) {
      if (s?.backupLabel) return s.backupLabel;
      if (s?.backupSheets) return '2 HIDDEN SHEETS';
      return '—';
    }
    if (!last) return '—';
    return last.backupDeleted ? 'DELETED AFTER ROLLBACK' : 'RETAINED / CHECK LEDGER';
  }

  function render() {
    const panel = installPanel();
    if (!panel) return;
    const active = Boolean(state?.active);
    const blocked = Boolean(state?.blocked);
    const s = state?.session || null;
    const last = state?.lastResult || null;
    const status = !supported ? 'SERVICE CHECK REQUIRED' : blocked ? 'ROLLBACK BLOCKED' : active ? 'TEST SESSION ACTIVE' : 'INACTIVE';
    const statusClass = blocked ? 'pt-bad' : active ? 'pt-ok' : '';
    const previewHtml = rollbackPreview
      ? `<div class="pt-preview ${rollbackPreview.integrityOk ? 'pt-ok' : 'pt-bad'}"><strong>ROLLBACK PREVIEW</strong><br>Finance rows: ${esc(rollbackPreview.financeRows)}<br>Equipment rows: ${esc(rollbackPreview.equipmentRows)}<br>${rollbackPreview.integrityOk ? 'INTEGRITY CHECK // PASS' : 'INTEGRITY CHECK // FAILED<br>' + esc((rollbackPreview.issues || []).join(' '))}</div>`
      : '';

    panel.innerHTML = `
      <h2>Purchase Board Test Session</h2>
      <div class="small">Run real Purchase Board transactions against the live progression logic, then remove only the tracked test purchases. Hidden emergency copies of Credits &amp; Debt and Equipment are retained during the test.</div>
      <div class="pt-grid">
        <div class="pt-cell ${statusClass}"><span>Status</span><strong>${esc(status)}</strong></div>
        <div class="pt-cell"><span>Session</span><strong>${esc(s?.id || '—')}</strong></div>
        <div class="pt-cell"><span>Test Purchases</span><strong>${esc(s?.transactionCount ?? 0)}</strong></div>
        <div class="pt-cell"><span>Financed</span><strong>${esc(s ? `${s.financedCount || 0} / ${money(s.financedTotal)}` : '—')}</strong></div>
        <div class="pt-cell"><span>Last Activity</span><strong>${esc(when(s?.lastActivityAt))}</strong></div>
        <div class="pt-cell"><span>Auto-Rollback</span><strong>${esc(active ? when(s?.expiresAt) : '60 MIN INACTIVITY')}</strong></div>
        <div class="pt-cell"><span>Last Activity Source</span><strong>${esc(s?.lastActivitySource || '—')}</strong></div>
        <div class="pt-cell"><span>Emergency Backup</span><strong>${esc(backupStatus(active, blocked, s, last))}</strong></div>
      </div>
      ${blocked ? `<div class="notice bad">ROLLBACK BLOCKED // ${esc(s?.rollbackError || 'Tracked test rows no longer match the recorded receipts.')}<br><br>Further test purchases are blocked. The hidden emergency sheet backups have been retained.</div>` : ''}
      ${!active && !blocked && last ? `<div class="notice ok">LAST TEST ROLLBACK // ${esc(last.transactionCount || 0)} purchase(s) // ${esc(last.financeRowsRemoved || 0)} finance row(s) // ${esc(last.equipmentRowsRemoved || 0)} Equipment row(s) // ${esc(last.automatic ? 'AUTO' : 'MANUAL')} // ${esc(last.backupDeleted ? 'BACKUPS DELETED' : 'BACKUPS RETAINED')}</div>` : ''}
      <div class="pt-actions">
        <button id="wardenPurchaseTestStart" class="btn primary" type="button" ${!supported || active || blocked || busy ? 'disabled' : ''}>START TEST SESSION</button>
        <button id="wardenPurchaseTestTouch" class="btn" type="button" ${!active || busy ? 'disabled' : ''}>RESET 60-MIN TIMER</button>
        <button id="wardenPurchaseTestPreview" class="btn" type="button" ${!active || busy ? 'disabled' : ''}>PREVIEW ROLLBACK</button>
        <button id="wardenPurchaseTestRollback" class="btn danger" type="button" ${!previewToken || !rollbackPreview?.integrityOk || blocked || busy ? 'disabled' : ''}>ROLL BACK TEST SESSION</button>
        <button id="wardenPurchaseTestRefresh" class="btn" type="button" ${busy ? 'disabled' : ''}>CHECK / REFRESH STATE</button>
      </div>
      <div class="pt-note">Inactivity is server-side Purchase Board / Admin activity. Keeping a browser tab open does not keep the test alive. No polling or watcher is used.${transport ? ` // ${esc(transport)}` : ''}</div>
      <div id="wardenPurchaseTestPreviewBox">${previewHtml}</div>
      <div id="wardenPurchaseTestMessage" class="notice${noticeKind ? ' ' + esc(noticeKind) : ''}${noticeMessage ? '' : ' hidden'}">${esc(noticeMessage)}</div>
    `;

    $('wardenPurchaseTestStart')?.addEventListener('click', startTest);
    $('wardenPurchaseTestTouch')?.addEventListener('click', resetTimer);
    $('wardenPurchaseTestPreview')?.addEventListener('click', previewRollback);
    $('wardenPurchaseTestRollback')?.addEventListener('click', rollbackTest);
    $('wardenPurchaseTestRefresh')?.addEventListener('click', loadState);
    syncVisibility();
  }

  async function loadState() {
    if (!session() || busy) return;
    busy = true;
    try {
      const result = await request('wardenpurchaseteststate');
      if (!result?.ok) throw new Error(result?.error || 'Purchase Test state unavailable.');
      supported = true;
      state = result;
      previewToken = '';
      rollbackPreview = null;
    } catch (error) {
      supported = false;
      setNotice(String(error?.message || error), 'bad');
    } finally {
      busy = false;
      render();
    }
  }

  async function startTest() {
    if (busy || state?.active || state?.blocked || !session()) return;
    if (!confirm('Start a Purchase Board test session?\n\nHidden emergency copies of Credits & Debt and Equipment will be created. Purchases made while the test is active will be tracked and automatically rolled back after 60 minutes of inactivity.')) return;
    busy = true; previewToken = ''; rollbackPreview = null; noticeMessage = ''; noticeKind = ''; render();
    try {
      const result = await request('wardenpurchaseteststart');
      if (!result?.ok) throw new Error(result?.error || 'Could not start Purchase Test session.');
      supported = true;
      state = result;
      setNotice('PURCHASE TEST SESSION ACTIVE // AUTO-ROLLBACK AFTER 60 MINUTES OF INACTIVITY', 'ok');
    } catch (error) {
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  async function resetTimer() {
    if (busy || !state?.active || !session()) return;
    busy = true; previewToken = ''; rollbackPreview = null; noticeMessage = ''; noticeKind = ''; render();
    try {
      const result = await request('wardenpurchasetesttouch');
      if (!result?.ok) throw new Error(result?.error || 'Could not reset Purchase Test timer.');
      state = result;
      setNotice('INACTIVITY TIMER RESET // 60 MINUTES', 'ok');
    } catch (error) {
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  async function previewRollback() {
    if (busy || !state?.active || !session()) return;
    busy = true; previewToken = ''; rollbackPreview = null; noticeMessage = ''; noticeKind = ''; render();
    try {
      const result = await request('wardenpurchasetestpreview');
      if (!result?.ok || !result.stateToken) throw new Error(result?.error || 'Rollback Preview unavailable.');
      previewToken = result.stateToken;
      rollbackPreview = result;
    } catch (error) {
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  async function rollbackTest() {
    if (busy || !previewToken || !session()) return;
    if (!confirm('Roll back the current Purchase Board test session?\n\nOnly the tracked test Purchase / Cash Advance / Equipment records will be removed.')) return;
    busy = true; render();
    try {
      const result = await request('wardenpurchasetestrollback', {stateToken:previewToken});
      if (!result?.ok) throw new Error(result?.error || 'Purchase Test rollback failed.');
      previewToken = '';
      rollbackPreview = null;
      state = await request('wardenpurchaseteststate');
      setNotice('PURCHASE TEST SESSION ROLLED BACK', 'ok');
    } catch (error) {
      previewToken = '';
      rollbackPreview = null;
      try { state = await request('wardenpurchaseteststate'); } catch (_) {}
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  function bindWorkspace() {
    document.addEventListener('click', event => {
      const button = event.target.closest('.wc-workspace-btn[data-workspace]');
      if (!button) return;
      setTimeout(() => {
        syncVisibility();
        if (button.dataset.workspace === 'admin' && session()) loadState();
      }, 0);
    }, true);
  }

  installStyles();
  installPanel();
  bindWorkspace();
  window.HubWardenPurchaseTestAdmin = Object.freeze({build:BUILD, refresh:loadState});
})();
