(() => {
  'use strict';

  const BUILD = '20260920-warden-purchase-test-admin-1';
  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_warden_session_v1';
  const $ = id => document.getElementById(id);
  let state = null;
  let previewToken = '';
  let rollbackPreview = null;
  let busy = false;
  let noticeMessage = '';
  let noticeKind = '';

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
    return (Number(value || 0)).toLocaleString(undefined, {maximumFractionDigits:2}) + 'cr';
  }

  function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      const callback = '__purchaseTestAdmin_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Purchase Test service timed out.')), 30000);
      let finished = false;
      function finish(error, payload) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        script.remove();
        error ? reject(error) : resolve(payload);
      }
      window[callback] = payload => finish(null, payload);
      script.onerror = () => finish(new Error('Could not reach the Warden service.'));
      script.src = API + '?' + new URLSearchParams({action, callback, session:session(), ...params});
      document.head.appendChild(script);
    });
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

  function render() {
    const panel = installPanel();
    if (!panel) return;
    const active = Boolean(state?.active);
    const blocked = Boolean(state?.blocked);
    const s = state?.session || null;
    const last = state?.lastResult || null;
    const status = blocked ? 'ROLLBACK BLOCKED' : active ? 'TEST SESSION ACTIVE' : 'INACTIVE';
    const statusClass = blocked ? 'pt-bad' : active ? 'pt-ok' : '';
    const previewHtml = rollbackPreview ? `<div class="pt-preview ${rollbackPreview.integrityOk ? 'pt-ok' : 'pt-bad'}"><strong>ROLLBACK PREVIEW</strong><br>Finance rows: ${esc(rollbackPreview.financeRows)}<br>Equipment rows: ${esc(rollbackPreview.equipmentRows)}<br>${rollbackPreview.integrityOk ? 'INTEGRITY CHECK // PASS' : 'INTEGRITY CHECK // FAILED<br>' + esc((rollbackPreview.issues || []).join(' '))}</div>` : '';

    panel.innerHTML = `
      <h2>Purchase Board Test Session</h2>
      <div class="small">Run real Purchase Board transactions against the live progression logic, then remove only the tracked test purchases. A full Progression Ledger backup is retained as emergency protection.</div>
      <div class="pt-grid">
        <div class="pt-cell ${statusClass}"><span>Status</span><strong>${esc(status)}</strong></div>
        <div class="pt-cell"><span>Session</span><strong>${esc(s?.id || '—')}</strong></div>
        <div class="pt-cell"><span>Test Purchases</span><strong>${esc(s?.transactionCount ?? 0)}</strong></div>
        <div class="pt-cell"><span>Financed</span><strong>${esc(s ? `${s.financedCount || 0} / ${money(s.financedTotal)}` : '—')}</strong></div>
        <div class="pt-cell"><span>Last Activity</span><strong>${esc(when(s?.lastActivityAt))}</strong></div>
        <div class="pt-cell"><span>Auto-Rollback</span><strong>${esc(active ? when(s?.expiresAt) : '60 MIN INACTIVITY')}</strong></div>
        <div class="pt-cell"><span>Last Activity Source</span><strong>${esc(s?.lastActivitySource || '—')}</strong></div>
        <div class="pt-cell"><span>Emergency Backup</span><strong>${esc(s?.backupFileId || (last?.backupTrashed ? 'CLEANED AFTER ROLLBACK' : '—'))}</strong></div>
      </div>
      ${blocked ? `<div class="notice bad">ROLLBACK BLOCKED // ${esc(s?.rollbackError || 'Tracked test rows no longer match the recorded receipts.')}<br><br>Further test purchases are blocked. The emergency ledger backup has been retained.</div>` : ''}
      ${!active && !blocked && last ? `<div class="notice ok">LAST TEST ROLLBACK // ${esc(last.transactionCount || 0)} purchase(s) // ${esc(last.financeRowsRemoved || 0)} finance row(s) // ${esc(last.equipmentRowsRemoved || 0)} Equipment row(s) // ${esc(last.automatic ? 'AUTO' : 'MANUAL')}</div>` : ''}
      <div class="pt-actions">
        <button id="wardenPurchaseTestStart" class="btn primary" type="button" ${active || blocked || busy ? 'disabled' : ''}>START TEST SESSION</button>
        <button id="wardenPurchaseTestTouch" class="btn" type="button" ${!active || busy ? 'disabled' : ''}>RESET 60-MIN TIMER</button>
        <button id="wardenPurchaseTestPreview" class="btn" type="button" ${!active || busy ? 'disabled' : ''}>PREVIEW ROLLBACK</button>
        <button id="wardenPurchaseTestRollback" class="btn danger" type="button" ${!previewToken || !rollbackPreview?.integrityOk || blocked || busy ? 'disabled' : ''}>ROLL BACK TEST SESSION</button>
        <button id="wardenPurchaseTestRefresh" class="btn" type="button" ${busy ? 'disabled' : ''}>REFRESH STATE</button>
      </div>
      <div class="pt-note">Inactivity is server-side Purchase Board / Admin activity. Keeping a browser tab open does not keep the test alive. No polling or watcher is used.</div>
      <div id="wardenPurchaseTestPreviewBox">${previewHtml}</div>
      <div id="wardenPurchaseTestMessage" class="notice${noticeKind ? ' ' + esc(noticeKind) : ''}${noticeMessage ? '' : ' hidden'}">${esc(noticeMessage)}</div>
    `;

    $('wardenPurchaseTestStart')?.addEventListener('click', startTest);
    $('wardenPurchaseTestTouch')?.addEventListener('click', resetTimer);
    $('wardenPurchaseTestPreview')?.addEventListener('click', previewRollback);
    $('wardenPurchaseTestRollback')?.addEventListener('click', rollbackTest);
    $('wardenPurchaseTestRefresh')?.addEventListener('click', () => loadState(false));
    syncVisibility();
  }

  async function loadState(touch = true) {
    if (!session() || busy) return;
    busy = true;
    try {
      const result = await jsonp(touch ? 'wardenpurchaseteststate' : 'wardenpurchaseteststate');
      if (!result?.ok) throw new Error(result?.error || 'Purchase Test state unavailable.');
      state = result;
      previewToken = '';
      rollbackPreview = null;
      render();
    } catch (error) {
      render();
      setNotice(String(error?.message || error), 'bad');
    } finally {
      busy = false;
      render();
    }
  }

  async function startTest() {
    if (busy || state?.active || state?.blocked || !session()) return;
    if (!confirm('Start a Purchase Board test session?\n\nA Progression Ledger backup will be created. Purchases made while the test is active will be tracked and automatically rolled back after 60 minutes of inactivity.')) return;
    busy = true; previewToken = ''; rollbackPreview = null; setNotice('', ''); render();
    try {
      const result = await jsonp('wardenpurchaseteststart');
      if (!result?.ok) throw new Error(result?.error || 'Could not start Purchase Test session.');
      state = result;
      render();
      setNotice('PURCHASE TEST SESSION ACTIVE // AUTO-ROLLBACK AFTER 60 MINUTES OF INACTIVITY', 'ok');
    } catch (error) {
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  async function resetTimer() {
    if (busy || !state?.active || !session()) return;
    busy = true; previewToken = ''; rollbackPreview = null; setNotice('', ''); render();
    try {
      const result = await jsonp('wardenpurchasetesttouch');
      if (!result?.ok) throw new Error(result?.error || 'Could not reset Purchase Test timer.');
      state = result;
      render();
      setNotice('INACTIVITY TIMER RESET // 60 MINUTES', 'ok');
    } catch (error) {
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  async function previewRollback() {
    if (busy || !state?.active || !session()) return;
    busy = true; previewToken = ''; rollbackPreview = null; setNotice('', ''); render();
    try {
      const result = await jsonp('wardenpurchasetestpreview');
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
      const result = await jsonp('wardenpurchasetestrollback', {stateToken:previewToken});
      if (!result?.ok) throw new Error(result?.error || 'Purchase Test rollback failed.');
      previewToken = '';
      rollbackPreview = null;
      state = await jsonp('wardenpurchaseteststate');
      render();
      setNotice('PURCHASE TEST SESSION ROLLED BACK', 'ok');
    } catch (error) {
      previewToken = '';
      rollbackPreview = null;
      try { state = await jsonp('wardenpurchaseteststate'); } catch (_) {}
      render();
      setNotice(String(error?.message || error), 'bad');
    } finally { busy = false; render(); }
  }

  function bindWorkspace() {
    document.addEventListener('click', event => {
      const button = event.target.closest('.wc-workspace-btn[data-workspace]');
      if (!button) return;
      setTimeout(() => {
        syncVisibility();
        if (button.dataset.workspace === 'admin' && session()) loadState(true);
      }, 0);
    }, true);
  }

  installStyles();
  installPanel();
  bindWorkspace();
  window.HubWardenPurchaseTestAdmin = Object.freeze({ build:BUILD, refresh:loadState });
})();
