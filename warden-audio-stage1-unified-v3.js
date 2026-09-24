(()=>{
'use strict';

const LIGHT_URL='https://raw.githubusercontent.com/yerdaulet-damir/liminal/main/client/public/audio/hum.mp3';
const ROCK_URL='https://raw.githubusercontent.com/ShaleGame/ShaleGame/main/Assets/Sounds/567249__iwanplays__bricksstonesrocksgravel-falling.wav';
const LIGHT_LABEL='FLUORESCENT FLICKER';
const ROCK_LABEL='ROCK / MATERIAL';
const BASE_IDS=['room','machinery','relays'];

let installed=false;
let lightActive=false;
let rocksActive=false;
let lightTimer=null;
let rocksTimer=null;
const lightPlaying=new Set();
const rockPlaying=new Set();
let baseSetLayer=null;
let baseTrigger=null;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);

function masterVolume(){
  const slider=document.getElementById('waVolume');
  const v=slider?Number(slider.value):Number(localStorage.getItem('mothership_warden_audio_volume_v1')||.48);
  return clamp(Number.isFinite(v)?v:.48,0,1);
}
function group1Gain(){
  const m=window.WardenGroupMixer,v=m&&m.state?Number(m.state.g1):1;
  return clamp(Number.isFinite(v)?v:1,0,1);
}
function setRecordedVolume(a,mix){if(a)try{a.volume=clamp(masterVolume()*mix*group1Gain(),0,1);}catch(_){ }}
function refreshGroupVolume(){
  lightPlaying.forEach(a=>setRecordedVolume(a,.92));
  rockPlaying.forEach(a=>setRecordedVolume(a,.95));
  try{window.WardenM17AudioBaseRefresh&&window.WardenM17AudioBaseRefresh();}catch(_){ }
}
function playRecorded(url,mix,set,manualSelector){
  const a=new Audio(url);a.preload='auto';setRecordedVolume(a,mix);set.add(a);
  const retire=()=>set.delete(a);a.addEventListener('ended',retire,{once:true});a.addEventListener('error',retire,{once:true});
  const p=a.play();if(p&&typeof p.catch==='function')p.catch(retire);
  if(manualSelector){const btn=document.querySelector(manualSelector);if(btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);}}
  return a;
}
function stopSet(set){set.forEach(a=>{try{a.pause();a.currentTime=0;}catch(_){ }});set.clear();}
function clearLightTimer(){if(lightTimer)clearTimeout(lightTimer);lightTimer=null;}
function clearRockTimer(){if(rocksTimer)clearTimeout(rocksTimer);rocksTimer=null;}
function scheduleLight(){clearLightTimer();if(!lightActive)return;lightTimer=setTimeout(()=>{if(!lightActive)return;playRecorded(LIGHT_URL,.92,lightPlaying,null);scheduleLight();},rand(300000,600000));}
function scheduleRocks(first=false){clearRockTimer();if(!rocksActive)return;rocksTimer=setTimeout(()=>{if(!rocksActive)return;playRecorded(ROCK_URL,.95,rockPlaying,null);scheduleRocks(false);},first?rand(7000,16000):rand(22000,48000));}

function syncOwnButtons(){
  const light=document.querySelector('[data-audio-layer="light"]');if(light){light.classList.toggle('active',lightActive);light.setAttribute('aria-pressed',String(lightActive));const s=light.querySelector('.wa-state');if(s)s.textContent=lightActive?'ON':'OFF';}
  const rocks=document.querySelector('[data-audio-layer="rocks"]');if(rocks){rocks.classList.toggle('active',rocksActive);rocks.setAttribute('aria-pressed',String(rocksActive));const s=rocks.querySelector('.wa-state');if(s)s.textContent=rocksActive?'ON':'OFF';}
}
function syncLive(){
  const live=document.getElementById('waLive');if(!live)return;
  const names=[];
  document.querySelectorAll('[data-audio-layer][aria-pressed="true"] b').forEach(b=>{const t=(b.textContent||'').trim();if(t&&!names.includes(t))names.push(t);});
  live.textContent=names.length?names.join(' + '):'SILENT';syncOwnButtons();
}

function setLight(on){on=!!on;if(lightActive===on){syncLive();return;}lightActive=on;clearLightTimer();if(on){playRecorded(LIGHT_URL,.92,lightPlaying,null);scheduleLight();}else stopSet(lightPlaying);syncLive();}
function setRocks(on){on=!!on;if(rocksActive===on){syncLive();return;}rocksActive=on;clearRockTimer();if(on)scheduleRocks(true);else stopSet(rockPlaying);syncLive();}
function triggerLight(){playRecorded(LIGHT_URL,.92,lightPlaying,'[data-audio-trigger="light"]');if(lightActive)scheduleLight();}
function triggerRocks(){playRecorded(ROCK_URL,.95,rockPlaying,'[data-audio-trigger="rocks"]');if(rocksActive)scheduleRocks(false);}

function setLayer(id,on){
  if(id==='light')return setLight(on);if(id==='rocks')return setRocks(on);if(id==='metal')return;
  const out=baseSetLayer&&baseSetLayer(id,on);syncLive();return out;
}
function trigger(id){
  if(id==='light')return triggerLight();if(id==='rocks')return triggerRocks();if(id==='metal')return;
  return baseTrigger&&baseTrigger(id);
}
function startM17(){BASE_IDS.forEach(id=>baseSetLayer&&baseSetLayer(id,true));setLight(true);setRocks(true);syncLive();}
function stopAll(){BASE_IDS.forEach(id=>{try{baseSetLayer&&baseSetLayer(id,false);}catch(_){ }});setLight(false);setRocks(false);syncLive();}
function replaceButton(oldBtn,listener){if(!oldBtn)return null;const fresh=oldBtn.cloneNode(true);oldBtn.replaceWith(fresh);fresh.addEventListener('click',listener);return fresh;}

function install(){
  if(installed)return true;
  const api=window.WardenM17Audio;
  const startBtn=document.getElementById('waStartM17'),stopBtn=document.getElementById('waStopAll');
  if(!api||!startBtn||!stopBtn)return false;

  baseSetLayer=api.setLayer.bind(api);baseTrigger=api.trigger.bind(api);
  window.WardenM17AudioBaseRefresh=api.refreshGroupVolume?api.refreshGroupVolume.bind(api):null;

  const body=document.querySelector('#wardenAudioDock .wa-body');const grid=body&&body.querySelector('.wa-grid');
  if(body&&!document.getElementById('waGroup1Header')){const header=document.createElement('div');header.id='waGroup1Header';header.className='wa-live';header.style.marginTop='8px';header.innerHTML='<span>GROUP 1 // M-17:</span> <b>ENVIRONMENT</b>';body.insertBefore(header,grid||null);}

  const metal=document.querySelector('[data-audio-layer="metal"]');if(metal){const row=metal.closest('.wa-layer');if(row)row.remove();}

  const light=document.querySelector('[data-audio-layer="light"]');if(light){const label=light.querySelector('b');if(label)label.textContent=LIGHT_LABEL;const desc=light.querySelector('small');if(desc)desc.textContent='Real failing fluorescent fixture recording — CC0; automatic every 5–10 minutes';replaceButton(light,()=>setLight(!lightActive));}
  replaceButton(document.querySelector('[data-audio-trigger="light"]'),triggerLight);

  const rocks=document.querySelector('[data-audio-layer="rocks"]');if(rocks){const label=rocks.querySelector('b');if(label)label.textContent=ROCK_LABEL;const desc=rocks.querySelector('small');if(desc)desc.textContent='Real rocks, stones, and gravel falling/rolling — CC0';replaceButton(rocks,()=>setRocks(!rocksActive));}
  replaceButton(document.querySelector('[data-audio-trigger="rocks"]'),triggerRocks);

  BASE_IDS.forEach(id=>{const oldBtn=document.querySelector(`[data-audio-layer="${id}"]`);if(!oldBtn)return;const fresh=replaceButton(oldBtn,()=>{const next=fresh.getAttribute('aria-pressed')!=='true';baseSetLayer&&baseSetLayer(id,next);syncLive();});});

  const startFresh=replaceButton(startBtn,startM17);if(startFresh)startFresh.textContent='START GROUP 1 / M-17';
  const stopFresh=replaceButton(stopBtn,stopAll);if(stopFresh)stopFresh.textContent='STOP GROUP 1';

  api.setLayer=setLayer;api.trigger=trigger;api.startM17=startM17;api.stopAll=stopAll;api.refreshGroupVolume=refreshGroupVolume;
  const slider=document.getElementById('waVolume');if(slider)slider.addEventListener('input',refreshGroupVolume);

  installed=true;syncLive();return true;
}

window.WardenM17Stage1={syncLive,refreshGroupVolume};
let tries=0;const wait=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(wait);},75);
})();