(() => {
  'use strict';

  const TERMINAL_ID = 'acceptTerminalBrief';
  const TERMINAL_OUTPUT_ID = 'acceptTerminalOutput';
  const TERMINAL_SKIP_ID = 'acceptTerminalShowAll';
  const LINE_DELAY_MS = 32;

  let generation = 0;
  let activeRun = null;

  function installStyles() {
    if (document.getElementById('acceptTerminalStyles')) return;
    const style = document.createElement('style');
    style.id = 'acceptTerminalStyles';
    style.textContent = `
      .accept-terminal {
        margin-top:16px;
        border:1px solid #4f5a46;
        background:#0c0f10;
        box-shadow:inset 0 0 0 1px rgba(143,167,122,.08);
        border-radius:3px;
        overflow:hidden;
      }
      .accept-terminal-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:9px 11px;
        border-bottom:1px solid #303538;
        color:#bdd2aa;
        font-size:.72rem;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .accept-terminal-skip {
        font:inherit;
        color:#aaa79f;
        background:transparent;
        border:1px solid #3a3f43;
        border-radius:3px;
        padding:5px 8px;
        cursor:pointer;
      }
      .accept-terminal-skip:hover { border-color:#d4a84b; color:#e7e4dc; }
      .accept-terminal-output {
        margin:0;
        min-height:160px;
        max-height:min(54vh,560px);
        overflow:auto;
        padding:14px;
        color:#e7e4dc;
        background:#0c0f10;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
        font:inherit;
        line-height:1.48;
        cursor:pointer;
      }
      .accept-terminal-cursor::after {
        content:'_';
        animation:acceptTerminalBlink 850ms steps(1,end) infinite;
      }
      @keyframes acceptTerminalBlink { 0%,48%{opacity:1} 49%,100%{opacity:0} }
      @media (prefers-reduced-motion: reduce) {
        .accept-terminal-cursor::after { animation:none; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTerminal() {
    let terminal = document.getElementById(TERMINAL_ID);
    if (terminal) return terminal;
    const result = document.getElementById('acceptResult');
    if (!result) return null;

    terminal = document.createElement('section');
    terminal.id = TERMINAL_ID;
    terminal.className = 'accept-terminal hidden';
    terminal.setAttribute('aria-live', 'polite');
    terminal.innerHTML = `
      <div class="accept-terminal-head">
        <span>Accepted Assignment // Secure Output</span>
        <button id="${TERMINAL_SKIP_ID}" class="accept-terminal-skip" type="button">SHOW ALL</button>
      </div>
      <pre id="${TERMINAL_OUTPUT_ID}" class="accept-terminal-output"></pre>
    `;
    result.insertAdjacentElement('afterend', terminal);
    terminal.querySelector('#' + TERMINAL_SKIP_ID)?.addEventListener('click', finishActiveRun);
    terminal.querySelector('#' + TERMINAL_OUTPUT_ID)?.addEventListener('click', finishActiveRun);
    return terminal;
  }

  function resetTerminal() {
    generation += 1;
    activeRun = null;
    const terminal = document.getElementById(TERMINAL_ID);
    const output = document.getElementById(TERMINAL_OUTPUT_ID);
    if (output) {
      output.textContent = '';
      output.classList.remove('accept-terminal-cursor');
    }
    terminal?.classList.add('hidden');
  }

  function normalizeBrief(payload) {
    if (!payload || payload.accepted !== true) return '';
    const brief = payload.brief;
    if (!brief || String(brief.format || '').trim().toUpperCase() !== 'TERMINAL_TEXT') return '';
    return String(brief.text || '').replace(/\r\n?/g, '\n').trim();
  }

  function finishActiveRun() {
    if (!activeRun) return;
    const { token, text, output } = activeRun;
    if (token !== generation) return;
    output.textContent = text;
    output.classList.remove('accept-terminal-cursor');
    output.scrollTop = output.scrollHeight;
    activeRun = null;
  }

  async function renderBrief(payload) {
    const text = normalizeBrief(payload);
    if (!text) return;

    const terminal = ensureTerminal();
    const output = document.getElementById(TERMINAL_OUTPUT_ID);
    if (!terminal || !output) return;

    generation += 1;
    const token = generation;
    terminal.classList.remove('hidden');
    output.textContent = '';
    output.classList.add('accept-terminal-cursor');
    document.getElementById('acceptReveal')?.classList.add('hidden');

    const result = document.getElementById('acceptResult');
    if (result) {
      result.textContent = 'CONTRACT ACCEPTED // LOADING SECURE BRIEF';
      result.className = 'accept-result ok';
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      output.textContent = text;
      output.classList.remove('accept-terminal-cursor');
      output.scrollTop = output.scrollHeight;
      if (result) {
        result.textContent = 'CONTRACT ACCEPTED';
        result.className = 'accept-result ok';
      }
      return;
    }

    const lines = text.split('\n');
    activeRun = { token, text, output };
    for (let i = 0; i < lines.length; i += 1) {
      if (token !== generation || !activeRun) return;
      output.textContent += (i ? '\n' : '') + lines[i];
      output.scrollTop = output.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, LINE_DELAY_MS));
    }

    if (token !== generation) return;
    output.classList.remove('accept-terminal-cursor');
    activeRun = null;
    if (result) {
      result.textContent = 'CONTRACT ACCEPTED';
      result.className = 'accept-result ok';
    }
  }

  function wrapAcceptanceJsonp(script) {
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    let url;
    try { url = new URL(script.src, location.href); } catch (_) { return; }
    if (url.searchParams.get('action') !== 'accept') return;

    const callbackName = url.searchParams.get('callback');
    if (!callbackName) return;
    const original = window[callbackName];
    if (typeof original !== 'function' || original.__ho1Wrapped) return;

    const wrapped = payload => {
      original(payload);
      if (normalizeBrief(payload)) setTimeout(() => renderBrief(payload), 0);
    };
    wrapped.__ho1Wrapped = true;
    window[callbackName] = wrapped;
  }

  function installJsonpInterceptor() {
    const originalAppendChild = Node.prototype.appendChild;
    if (originalAppendChild.__ho1TerminalWrapped) return;

    function patchedAppendChild(node) {
      wrapAcceptanceJsonp(node);
      return originalAppendChild.call(this, node);
    }
    patchedAppendChild.__ho1TerminalWrapped = true;
    Node.prototype.appendChild = patchedAppendChild;
  }

  function installResetHooks() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-accept-job]')) resetTerminal();
      if (event.target.closest('#acceptCancelBtn, #acceptModalClose')) resetTerminal();
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        resetTerminal();
        return;
      }
      if (activeRun && !event.ctrlKey && !event.metaKey && !event.altKey) finishActiveRun();
    });
  }

  function insertContractLogNav() {
    const nav = document.querySelector('.navrow');
    if (!nav) return;

    let button = document.getElementById('contractLogNav');
    if (!button) {
      button = document.createElement('button');
      button.id = 'contractLogNav';
      button.className = 'navbtn';
      button.type = 'button';
      button.textContent = 'CONTRACT LOGS';
      button.addEventListener('click', () => { location.href = 'contracts.html'; });
    }

    const classifieds = document.getElementById('classifiedsTab') || [...nav.querySelectorAll('.navbtn')].find(
      el => String(el.textContent || '').trim().toUpperCase() === 'CLASSIFIEDS'
    );
    nav.insertBefore(button, classifieds || null);
  }

  function insertWardenShortcut() {
    if (document.getElementById('wardenShortcut')) return;
    const link = document.createElement('a');
    link.id = 'wardenShortcut';
    link.href = 'warden.html';
    link.textContent = '//';
    link.setAttribute('aria-label', 'Console');
    link.style.cssText = 'position:fixed;right:10px;bottom:8px;z-index:2147483647;color:#8d8a82;opacity:.48;text-decoration:none;font-size:.68rem;line-height:1;padding:5px 4px;font-weight:700;';
    link.addEventListener('mouseenter', () => { link.style.opacity = '.78'; });
    link.addEventListener('mouseleave', () => { link.style.opacity = '.48'; });
    document.body.appendChild(link);
  }

  function applyBoardHash() {
    const hash = String(location.hash || '').trim().toLowerCase();
    if (hash === '#classifieds') document.getElementById('classifiedsTab')?.click();
    if (hash === '#contracts') document.getElementById('jobsTab')?.click();
  }

  installStyles();
  ensureTerminal();
  installJsonpInterceptor();
  installResetHooks();
  insertContractLogNav();
  insertWardenShortcut();
  window.addEventListener('hashchange', applyBoardHash);
  setTimeout(applyBoardHash, 0);
})();
