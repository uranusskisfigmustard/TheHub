(()=>{
'use strict';

const K_G1='mothership_warden_group1_max_v1';
const K_G2='mothership_warden_group2_min_v1';
const K_X='mothership_warden_group_crossfade_v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const read=(key,fallback)=>{
  const n=Number(localStorage.getItem(key));
  return Number.isFinite(n)?n:fallback;
};

const state={
  group1Max:clamp(read(K_G1,1),0,1),
  group2Min:clamp(read(K_G2,.18),0,.95),
  crossfade:clamp(read(K_X,0),0,1),
  g1:1,
  g2:.18
};

function recompute(){
  const x=clamp(state.crossfade,0,1);
  state.g1=clamp(state.group1Max*(1-x),0,1);
  state.g2=clamp(state.group2Min+(.95-state.group2Min)*x,0,.95);
}

// Stability build: the mixer owns only state. It does not touch AudioContext,
// media prototypes, constructors, or shared buses. Each engine applies its own
// group multiplier through its existing refreshGroupVolume hook.
function refreshEngines(){
  try{window.WardenM17Audio&&window.WardenM17Audio.refreshGroupVolume&&window.WardenM17Audio.refreshGroupVolume();}catch(_){ }
  try{window.WardenM17SignalAudio&&window.WardenM17SignalAudio.refreshGroupVolume&&window.WardenM17SignalAudio.refreshGroupVolume();}catch(_){ }
}

function render(){
  const g1=document.getElementById('waGroup1Readout');
  const g2=document.getElementById('waGroup2Readout');
  const xr=document.getElementById('waCrossfadeReadout');
  if(g1)g1.textContent=Math.round(state.g1*100)+'%';
  if(g2)g2.textContent=Math.round(state.g2*100)+'%';
  if(xr)xr.textContent=Math.round(state.crossfade*100)+'%';
}

function apply(){
  recompute();
  refreshEngines();
  render();
}

function setGroup1Max(v){
  state.group1Max=clamp(Number(v)||0,0,1);
  localStorage.setItem(K_G1,String(state.group1Max));
  apply();
}
function setGroup2Min(v){
  state.group2Min=clamp(Number(v)||0,0,.95);
  localStorage.setItem(K_G2,String(state.group2Min));
  apply();
}
function setCrossfade(v){
  state.crossfade=clamp(Number(v)||0,0,1);
  localStorage.setItem(K_X,String(state.crossfade));
  apply();
}

function build(){
  if(document.getElementById('waGroupMixer'))return true;
  const dock=document.getElementById('wardenAudioDock');
  if(!dock)return false;
  const body=dock.querySelector('.wa-body');
  if(!body)return false;
  const section=document.createElement('div');
  section.id='waGroupMixer';
  section.innerHTML=`
    <div class="wa-live" style="margin-top:10px"><span>GROUP MIX:</span> <b>1 ↔ 2</b></div>
    <div class="wa-master-row" style="margin-top:8px;align-items:flex-end">
      <label class="wa-volume"><span>GROUP 1 MAX <b id="waGroup1Readout">${Math.round(state.g1*100)}%</b></span><input id="waGroup1Max" type="range" min="0" max="1" step="0.01" value="${state.group1Max}"></label>
      <label class="wa-volume"><span>GROUP 2 MIN <b id="waGroup2Readout">${Math.round(state.g2*100)}%</b></span><input id="waGroup2Min" type="range" min="0" max="0.95" step="0.01" value="${state.group2Min}"></label>
      <label class="wa-volume"><span>CROSSFADE <b id="waCrossfadeReadout">${Math.round(state.crossfade*100)}%</b></span><input id="waGroupCrossfade" type="range" min="0" max="1" step="0.01" value="${state.crossfade}"></label>
    </div>
    <small style="display:block;margin-top:6px;opacity:.72">0% = Group 1 at its selected MAX and Group 2 at its selected MIN. 100% = Group 1 silent and Group 2 at 95%. MASTER remains the overall output control.</small>`;
  body.insertBefore(section,body.children[1]||null);
  document.getElementById('waGroup1Max').addEventListener('input',e=>setGroup1Max(e.target.value));
  document.getElementById('waGroup2Min').addEventListener('input',e=>setGroup2Min(e.target.value));
  document.getElementById('waGroupCrossfade').addEventListener('input',e=>setCrossfade(e.target.value));
  apply();
  return true;
}

recompute();
let tries=0;
const wait=setInterval(()=>{
  tries++;
  if(build()||tries>120){clearInterval(wait);apply();}
},100);

window.WardenGroupMixer={state,setGroup1Max,setGroup2Min,setCrossfade,apply};
})();