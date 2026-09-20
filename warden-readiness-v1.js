(() => {
'use strict';

const READY_RE = /WARDEN CONSOLE READY/i;
const LOADING_RE = /LOADING WARDEN RECORDS|CONNECTING TO WARDEN/i;
const ERROR_RE = /WARDEN SERVICE ERROR/i;
let lastState = '';
let hasConnected = false;

const $ = id => document.getElementById(id);

function stateFromDom(){
  const consoleEl = $('console');
  const authEl = $('auth');
  const statusEl = $('status');
  const unlocked = Boolean(consoleEl && !consoleEl.classList.contains('hidden'));
  const authVisible = Boolean(authEl && !authEl.classList.contains('hidden'));
  const text = String(statusEl?.textContent || '');

  if(authVisible && !unlocked){
    hasConnected = false;
    return 'AUTH';
  }
  if(ERROR_RE.test(text)) return 'ERROR';
  if(READY_RE.test(text)){
    hasConnected = true;
    return 'READY';
  }
  if(unlocked && LOADING_RE.test(text)) return 'CONNECTING';
  if(unlocked && hasConnected) return 'READY';
  if(unlocked) return 'CONNECTING';
  return 'AUTH';
}

function ensureConnectionBadge(){
  const top = document.querySelector('header .top .actions');
  if(!top) return null;
  let badge = $('wcConnectionState');
  if(!badge){
    badge = document.createElement('span');
    badge.id = 'wcConnectionState';
    badge.className = 'wc-connection-state';
    badge.setAttribute('aria-live','polite');
    top.prepend(badge);
  }
  return badge;
}

function sync(){
  const state = stateFromDom();
  const body = document.body;
  const consoleEl = $('console');
  if(!body) return;

  body.classList.toggle('wc-backend-pending', state === 'CONNECTING');
  body.classList.toggle('wc-backend-error', state === 'ERROR');
  body.dataset.wardenConnection = state.toLowerCase();
  consoleEl?.setAttribute('aria-busy', state === 'CONNECTING' ? 'true' : 'false');

  const badge = ensureConnectionBadge();
  if(badge){
    badge.dataset.state = state.toLowerCase();
    badge.textContent = state === 'READY' ? 'BACKEND READY' : state === 'CONNECTING' ? 'CONNECTING' : state === 'ERROR' ? 'BACKEND ERROR' : 'LOCKED';
  }

  if(state !== lastState){
    lastState = state;
    try{performance.mark('warden-connection-' + state.toLowerCase())}catch(_){ }
  }
}

function observe(){
  const statusEl = $('status');
  const consoleEl = $('console');
  const authEl = $('auth');
  const observer = new MutationObserver(sync);
  if(statusEl) observer.observe(statusEl,{subtree:true,childList:true,characterData:true});
  if(consoleEl) observer.observe(consoleEl,{attributes:true,attributeFilter:['class']});
  if(authEl) observer.observe(authEl,{attributes:true,attributeFilter:['class']});
  sync();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',observe,{once:true});
else observe();
window.addEventListener('pageshow',sync);
})();
