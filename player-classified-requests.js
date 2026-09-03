(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_board_session_v1';
  const EXPIRY_KEY = 'mothership_hub_board_session_expiry_v1';
  const MODAL_ID = 'classifiedRequestModal';
  let available = false;
  let characters = [];
  let current = null;
  let busy = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function jsonp(action, params = {}, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const cb = '__classifiedRequest_' + Date.now() + '_' + Math.floor(Math.random() * 1e7);
      const script = document.createElement('script');
      let timer = null;
      const done = (err, payload) => {
        if (timer) clearTimeout(timer);
        try { delete window[cb]; } catch (_) { window[cb] = undefined; }
        script.remove();
        err ? reject(err) : resolve(payload);
      };
      window[cb] = payload => done(null, payload);
      script.onerror = () => done(new Error('Classified request service unavailable.'));
      script.src = API + '?' + new URLSearchParams({action, callback:cb, ...params, _:Date.now()});
      timer = setTimeout(() => done(new Error('Classified request service timed out.')), timeoutMs);
      document.head.appendChild(script);
    });
  }

  function readSession() {
    try {
      const token = String(localStorage.getItem(SESSION_KEY) || '').trim();
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
      if (!token || !Number.isFinite(expiry) || expiry <= Date.now()) return null;
      return {token, expiry};
    } catch (_) { return null; }
  }

  function storeSession(payload) {
    const token = String(payload?.sessionToken || '').trim();
    const expiry = Number(payload?.expiresAtMs || 0);
    if (!token || !Number.isFinite(expiry) || expiry <= Date.now()) return false;
    try {
      localStorage.setItem(SESSION_KEY, token);
      localStorage.setItem(EXPIRY_KEY, String(expiry));
      return true;
    } catch (_) { return false; }
  }

  async function ensureSession(pin) {
    const existing = readSession();
    if (existing) return existing.token;
    const clean = String(pin || '').trim();
    if (!clean) throw new Error('Board access code required.');
    const auth = await jsonp('authenticate', {pin:clean});
    if (!auth?.ok || !auth?.authenticated || !storeSession(auth)) {
      throw new Error(auth?.message || auth?.error || 'Board authentication failed.');
    }
    return readSession()?.token || '';
  }

  function ensureStyles() {
    if (document.getElementById('classifiedRequestStyles')) return;
    const style = document.createElement('style');
    style.id = 'classifiedRequestStyles';
    style.textContent = `
      .classified-request-row{margin-top:13px;padding-top:11px;border-top:1px solid #303538;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
      .classified-request-btn{font:inherit;font-size:.72rem;font-weight:800;letter-spacing:.06em;border:1px solid #d4a84b;border-radius:3px;background:rgba(212,168,75,.10);color:#e7e4dc;padding:8px 10px;cursor:pointer}
      .classified-request-btn:hover{background:rgba(212,168,75,.18)}
      .classified-request-note{font-size:.7rem;color:#aaa79f}
      #${MODAL_ID}{position:fixed;inset:0;z-index:1450;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .cr-shell{width:min(560px,100%);background:#111315;border:1px solid #3a3f43;border-radius:5px;padding:21px;box-shadow:0 24px 60px rgba(0,0,0,.55)}
      #${MODAL_ID} .cr-head{display:flex;justify-content:space-between;gap:12px;align-items:start}
      #${MODAL_ID} h2{margin:0;font-size:1.05rem;letter-spacing:.07em;text-transform:uppercase}
      #${MODAL_ID} .cr-price{color:#d4a84b;font-weight:800;margin-top:5px}
      #${MODAL_ID} .cr-label{display:block;color:#aaa79f;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;margin:16px 0 6px}
      #${MODAL_ID} select,#${MODAL_ID} input{width:100%;font:inherit;color:#e7e4dc;background:#202428;border:1px solid #3a3f43;border-radius:3px;padding:10px}
      #${MODAL_ID} .cr-actions{display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}
      #${MODAL_ID} button{font:inherit;font-weight:800;letter-spacing:.05em;border:1px solid #3a3f43;border-radius:3px;background:#202428;color:#e7e4dc;padding:9px 12px;cursor:pointer}
      #${MODAL_ID} button.primary{border-color:#d4a84b;background:rgba(212,168,75,.11)}
      #${MODAL_ID} button:disabled{opacity:.45;cursor:not-allowed}
      #${MODAL_ID} .cr-result{margin-top:13px;padding:10px;border:1px solid #3a3f43;background:#15181a;white-space:pre-line}
      #${MODAL_ID} .cr-result.bad{border-color:#c86655}.cr-hidden{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="cr-shell" role="dialog" aria-modal="true" aria-label="Request classified item">
        <div class="cr-head"><div><div style="color:#aaa79f;font-size:.7rem;letter-spacing:.08em">CLASSIFIED PURCHASE REQUEST</div><h2 id="crTitle"></h2><div id="crPrice" class="cr-price"></div></div><button id="crClose" type="button">×</button></div>
        <label class="cr-label" for="crCharacter">REQUESTING CHARACTER</label>
        <select id="crCharacter"></select>
        <div id="crPinWrap"><label class="cr-label" for="crPin">BOARD ACCESS CODE</label><input id="crPin" type="password" autocomplete="off" placeholder="Enter terminal code"></div>
        <div id="crResult" class="cr-result cr-hidden"></div>
        <div class="cr-actions"><button id="crCancel" type="button">CANCEL</button><button id="crSubmit" class="primary" type="button">SEND REQUEST</button></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#crClose')?.addEventListener('click', closeModal);
    modal.querySelector('#crCancel')?.addEventListener('click', closeModal);
    modal.querySelector('#crSubmit')?.addEventListener('click', submitRequest);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    return modal;
  }

  function openModal(item, card) {
    current = {item, card};
    const modal = ensureModal();
    modal.querySelector('#crTitle').textContent = item.title;
    modal.querySelector('#crPrice').textContent = item.price;
    const sel = modal.querySelector('#crCharacter');
    sel.innerHTML = characters.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
    const session = readSession();
    modal.querySelector('#crPinWrap').classList.toggle('cr-hidden', Boolean(session));
    modal.querySelector('#crPin').value = '';
    const result = modal.querySelector('#crResult');
    result.textContent = '';
    result.className = 'cr-result cr-hidden';
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (busy) return;
    document.getElementById(MODAL_ID)?.classList.add('hidden');
    document.body.classList.remove('modal-open');
    current = null;
  }

  function setBusy(on) {
    busy = on;
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.querySelector('#crSubmit').disabled = on;
    modal.querySelector('#crCancel').disabled = on;
    modal.querySelector('#crClose').disabled = on;
    modal.querySelector('#crCharacter').disabled = on;
    modal.querySelector('#crPin').disabled = on;
    modal.querySelector('#crSubmit').textContent = on ? 'SENDING…' : 'SEND REQUEST';
  }

  function showResult(message, bad = false) {
    const el = document.querySelector('#' + MODAL_ID + ' #crResult');
    if (!el) return;
    el.textContent = message;
    el.className = 'cr-result' + (bad ? ' bad' : '');
  }

  async function submitRequest() {
    if (!current || busy) return;
    const modal = ensureModal();
    const character = String(modal.querySelector('#crCharacter')?.value || '').trim();
    const pin = String(modal.querySelector('#crPin')?.value || '').trim();
    if (!character) { showResult('Select the requesting character.', true); return; }
    setBusy(true);
    try {
      const session = await ensureSession(pin);
      const r = await jsonp('classifiedrequest', {
        session,
        character,
        title:current.item.title,
        price:current.item.price,
        category:current.item.category
      });
      if (!r?.ok) throw new Error(r?.error || r?.message || 'Request could not be recorded.');
      showResult('REQUEST SENT // AWAITING WARDEN DECISION');
      const card = current.card;
      card?.querySelector('.classified-request-btn')?.setAttribute('disabled','disabled');
      const note = card?.querySelector('.classified-request-note');
      if (note) note.textContent = 'REQUEST SENT // PENDING';
      setTimeout(() => {
        if (card?.isConnected) card.remove();
        closeModal();
      }, 900);
    } catch (err) {
      showResult(String(err?.message || err), true);
    } finally {
      setBusy(false);
    }
  }

  function itemFromCard(card) {
    return {
      title:String(card.querySelector('.title')?.textContent || '').trim(),
      price:String(card.querySelector('.price')?.textContent || '').trim(),
      category:String(card.querySelector('.type')?.textContent || '').trim(),
      description:String(card.querySelector('.description')?.textContent || '').trim()
    };
  }

  function enhanceCards() {
    if (!available) return;
    const tab = document.getElementById('classifiedsTab');
    if (!tab || !tab.classList.contains('active')) return;
    document.querySelectorAll('.classified-card').forEach(card => {
      if (card.dataset.classifiedRequestEnhanced === '1') return;
      const item = itemFromCard(card);
      if (!item.title || /^(WANTED|ISO)\s*[—-]/i.test(item.title)) {
        card.dataset.classifiedRequestEnhanced = '1';
        return;
      }
      const row = document.createElement('div');
      row.className = 'classified-request-row';
      row.innerHTML = `<button type="button" class="classified-request-btn">REQUEST ITEM</button>`;
      row.querySelector('button')?.addEventListener('click', () => openModal(item, card));
      card.appendChild(row);
      card.dataset.classifiedRequestEnhanced = '1';
    });
  }

  async function probe() {
    try {
      const r = await jsonp('classifiedrequestsetup', {}, 6000);
      if (!r?.ok || !Array.isArray(r.characters) || !r.characters.length) return;
      available = true;
      characters = r.characters.map(String).filter(Boolean);
      ensureModal();
      enhanceCards();
    } catch (_) {
      // Backend route not deployed yet: remain completely dormant.
    }
  }

  const observer = new MutationObserver(() => enhanceCards());
  const install = () => {
    const cards = document.getElementById('cards');
    if (cards) observer.observe(cards, {childList:true, subtree:true});
    document.getElementById('classifiedsTab')?.addEventListener('click', () => setTimeout(enhanceCards, 0));
    probe();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
