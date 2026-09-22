(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const STATE = { feed:null, current:null, mode:'close', applying:false };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function normalizeStatus(value) {
    return String(value || '').trim().toUpperCase();
  }

  function installStyles() {
    if ($('wardenCloseoutPrefillStyles')) return;
    const style = document.createElement('style');
    style.id = 'wardenCloseoutPrefillStyles';
    style.textContent = `
      #closeoutReferenceBox{grid-column:1/-1;border:1px solid var(--line);background:var(--panel2);padding:12px;margin:2px 0 4px}
      #closeoutReferenceBox .closeout-ref-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin-top:8px}
      #closeoutReferenceBox .closeout-ref-item{min-width:0}
      #closeoutReferenceBox .closeout-ref-value{white-space:pre-wrap;overflow-wrap:anywhere}
      #closeoutReferenceBox .closeout-success{grid-column:1/-1;margin-top:2px;padding-top:8px;border-top:1px solid #303538}
      @media(max-width:720px){#closeoutReferenceBox .closeout-ref-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installReferenceBox() {
    if ($('closeoutReferenceBox')) return;
    const payout = $('payoutResolutionBox');
    const gross = $('gross');
    const anchor = payout || gross?.parentElement;
    if (!anchor) return;
    const box = document.createElement('div');
    box.id = 'closeoutReferenceBox';
    box.innerHTML = '<div class="label">CLOSEOUT REFERENCE</div><div id="closeoutReferenceBody" class="small">Known contract terms will appear here.</div>';
    anchor.insertAdjacentElement('beforebegin', box);
  }

  function successfulCloseoutText(snapshot) {
    const text = String(snapshot || '').replace(/\r/g, '');
    if (!text) return '';
    const match = text.match(/SUCCESSFUL CLOSEOUT\s*-\s*([\s\S]*?)(?:\n\s*[A-Z][A-Z /&-]{2,}\s*-|$)/i);
    if (!match) return '';
    return String(match[1] || '').replace(/\s+/g, ' ').trim();
  }

  function draftSummary(c, status) {
    const state = String(status || 'Completed').trim();
    const title = String(c?.title || 'Contract').trim();
    const employer = String(c?.employer || '').trim();
    const participants = Array.isArray(c?.participants) ? c.participants.filter(Boolean) : [];
    let out = `${state} — ${title}`;
    if (employer) out += ` for ${employer}`;
    out += '.';
    if (participants.length) out += ` Closeout recorded for ${participants.join(' and ')}.`;
    return out;
  }

  function renderReference(c) {
    const body = $('closeoutReferenceBody');
    if (!body) return;
    if (!c) {
      body.textContent = 'Known contract terms will appear here.';
      return;
    }
    const participants = Array.isArray(c.participants) ? c.participants.join('; ') : '';
    const closeout = successfulCloseoutText(c.acceptanceBriefSnapshot);
    const terms = String(c.basePay || '').trim();
    const contractor = c.qualifiedContractorConfirmed
      ? (String(c.contractorName || '').trim() || 'Confirmed at acceptance — identity/compensation must be recorded')
      : 'None confirmed at acceptance';
    body.innerHTML = `<div class="closeout-ref-grid">
      <div class="closeout-ref-item"><div class="label">CONTRACT TERMS</div><div class="closeout-ref-value">${esc(terms || 'Not recorded')}</div></div>
      <div class="closeout-ref-item"><div class="label">PARTICIPANTS</div><div class="closeout-ref-value">${esc(participants || 'Not recorded')}</div></div>
      <div class="closeout-ref-item"><div class="label">CONTRACTOR / SPECIALIST</div><div class="closeout-ref-value">${esc(contractor)}</div></div>
      <div class="closeout-ref-item"><div class="label">ACCEPTED</div><div class="closeout-ref-value">${esc(c.acceptedDate || '')}</div></div>
      ${closeout ? `<div class="closeout-success"><div class="label">SUCCESSFUL CLOSEOUT</div><div class="closeout-ref-value">${esc(closeout)}</div></div>` : ''}
    </div>`;
  }

  function setAutofillSummary(c) {
    const summary = $('summary');
    const status = $('status');
    if (!summary || !status || STATE.mode !== 'close') return;
    const next = draftSummary(c, status.value);
    const last = String(summary.dataset.wardenAutoSummary || '');
    const untouched = !summary.value.trim() || summary.value === last;
    if (untouched) {
      summary.value = next;
      summary.dataset.wardenAutoSummary = next;
      summary.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function applyKnownDefaults(c) {
    if (!c || STATE.mode !== 'close') return;
    const defaults = c.closeoutDefaults || {};
    const closed = $('closed');
    if (closed && defaults.closedDate) closed.value = String(defaults.closedDate);

    const contractor = $('contractor');
    const contractorName = $('contractorName');
    if (contractor) {
      const amount = Number(defaults.contractorCompensation ?? c.contractorCompensation ?? 0);
      if (Number.isFinite(amount) && amount >= 0) contractor.value = String(amount);
    }
    if (contractorName) {
      const name = String(defaults.contractorName ?? c.contractorName ?? '').trim();
      contractorName.value = name;
    }

    setAutofillSummary(c);
  }

  function desiredDecision(component, status) {
    const defaults = Array.isArray(component?.defaultWhenStatus)
      ? component.defaultWhenStatus.map(normalizeStatus).filter(Boolean)
      : [];
    if (!defaults.length) return '';
    return defaults.includes(normalizeStatus(status)) ? 'EARNED' : 'NOT_EARNED';
  }

  function applyPayoutDefaults(c) {
    if (!c || STATE.mode !== 'close') return;
    const status = $('status')?.value || 'Completed';
    const components = Array.isArray(c.payoutComponents) ? c.payoutComponents : [];
    const byId = Object.fromEntries(components.map(x => [String(x?.id || '').toUpperCase(), x]));
    STATE.applying = true;
    try {
      document.querySelectorAll('.paycomp').forEach(row => {
        const id = String(row.dataset.payoutId || '').toUpperCase();
        const select = row.querySelector('.payoutDecision');
        if (!select || select.dataset.wardenManual === '1') return;
        const next = desiredDecision(byId[id], status);
        if (!next || select.value === next) return;
        select.value = next;
        select.dataset.wardenAuto = '1';
        select.dispatchEvent(new Event('change', {bubbles:true}));
      });
    } finally {
      STATE.applying = false;
    }
  }

  function bindModalControls() {
    const status = $('status');
    if (status && !status.dataset.wardenPrefillBound) {
      status.dataset.wardenPrefillBound = '1';
      status.addEventListener('change', () => {
        if (!STATE.current || STATE.mode !== 'close') return;
        setAutofillSummary(STATE.current);
        applyPayoutDefaults(STATE.current);
      });
    }
    const summary = $('summary');
    if (summary && !summary.dataset.wardenPrefillBound) {
      summary.dataset.wardenPrefillBound = '1';
      summary.addEventListener('input', e => {
        if (!e.isTrusted) return;
        summary.dataset.wardenAutoSummary = '';
      });
    }
    document.querySelectorAll('.payoutDecision').forEach(select => {
      if (select.dataset.wardenPrefillBound) return;
      select.dataset.wardenPrefillBound = '1';
      select.addEventListener('change', e => {
        if (!STATE.applying && e.isTrusted) select.dataset.wardenManual = '1';
      });
    });
  }

  function applyModal(c, mode) {
    STATE.current = c || null;
    STATE.mode = mode || 'close';
    installReferenceBox();
    renderReference(c);
    bindModalControls();
    if (STATE.mode === 'close') {
      applyKnownDefaults(c);
      applyPayoutDefaults(c);
      bindModalControls();
    }
  }

  function patchScript(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    let url, api;
    try { url = new URL(script.src, location.href); api = new URL(API); } catch (_) { return; }
    if (url.origin !== api.origin || url.pathname !== api.pathname) return;
    const action = String(url.searchParams.get('action') || '').toLowerCase();
    const callbackName = url.searchParams.get('callback');
    if (!callbackName) return;
    const original = window[callbackName];
    if (typeof original !== 'function' || original.__wardenCloseoutPrefillWrapped) return;
    const wrapped = payload => {
      if (action === 'wardenfeed' && payload?.ok) STATE.feed = payload;
      original(payload);
    };
    wrapped.__wardenCloseoutPrefillWrapped = true;
    window[callbackName] = wrapped;
  }

  function installInterceptor() {
    const prev = Node.prototype.appendChild;
    if (prev.__wardenCloseoutPrefillPatched) return;
    function patched(node) { patchScript(node); return prev.call(this, node); }
    patched.__wardenCloseoutPrefillPatched = true;
    Node.prototype.appendChild = patched;
  }

  function watchClicks() {
    document.addEventListener('click', e => {
      const resolve = e.target.closest('[data-r]');
      if (resolve) {
        const idx = Number(resolve.dataset.r);
        const c = STATE.feed?.active?.[idx] || null;
        setTimeout(() => applyModal(c, 'close'), 20);
        return;
      }
      const amend = e.target.closest('[data-amend]');
      if (amend) {
        const idx = Number(amend.dataset.amend);
        const c = STATE.feed?.history?.[idx] || null;
        setTimeout(() => applyModal(c, 'amend'), 20);
        return;
      }
      if (e.target.closest('#x,#cancel,#lock,#playerPage')) {
        STATE.current = null;
        STATE.mode = 'close';
      }
    }, true);
  }

  installStyles();
  installReferenceBox();
  installInterceptor();
  watchClicks();
})();
