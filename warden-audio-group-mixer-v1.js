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

// Track HTMLAudioElement volume as a source-level "base" volume, then apply the
// group multiplier beneath it. This lets the existing MASTER control and each
// sound's own mix level continue to work exactly as before.
const NativeAudio=window.Audio;
const volumeDesc=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'volume');
const media={g1:new Set(),g2:new Set()};

function classify(src){
  src=String(src||'');
  if(
    src.includes('272265_4965320') ||
    src.includes('393398_5416641') ||
    src.includes('434507_1134415') ||
    src.includes('580633_2282212') ||
    src.includes('/liminal/main/client/public/audio/hum.mp3') ||
    src.includes('567249__iwanplays__bricksstonesrocksgravel-falling')
  ) return 'g1';
  return 'g2';
}

function groupGain(group){return group==='g1'?state.g1:state.g2;}

function installVolumeProxy(a,group){
  if(!a||a.__waGroupMixerInstalled||!volumeDesc||!volumeDesc.get||!volumeDesc.set)return a;
  let base=clamp(Number(volumeDesc.get.call(a))||1,0,1);
  Object.defineProperty(a,'volume',{
    configurable:true,
    enumerable:true,
    get(){return base;},
    set(v){
      base=clamp(Number(v)||0,0,1);
      try{volumeDesc.set.call(a,clamp(base*groupGain(group),0,1));}catch(_){ }
    }
  });
  a.__waGroupMixerInstalled=true;
  a.__waGroupMixerGroup=group;
  a.__waGroupMixerBase=()=>base;
  media[group].add(a);
  const forget=()=>media[group].delete(a);
  a.addEventListener('ended',forget,{once:true});
  a.addEventListener('error',forget,{once:true});
  a.volume=base;
  return a;
}

function WrappedAudio(src){
  const a=new NativeAudio(src);
  return installVolumeProxy(a,classify(src));
}
try{
  WrappedAudio.prototype=NativeAudio.prototype;
  Object.setPrototypeOf(WrappedAudio,NativeAudio);
}catch(_){ }
window.Audio=WrappedAudio;

function recompute(){
  const x=clamp(state.crossfade,0,1);
  state.g1=clamp(state.group1Max*(1-x),0,1);
  state.g2=clamp(state.group2Min+(.95-state.group2Min)*x,0,.95);
}

function applyMedia(){
  ['g1','g2'].forEach(group=>{
    media[group].forEach(a=>{
      try{
        const base=typeof a.__waGroupMixerBase==='function'?a.__waGroupMixerBase():Number(a.volume)||0;
        volumeDesc.set.call(a,clamp(base*groupGain(group),0,1));
      }catch(_){ }
    });
  });
}

function applyWebAudio(){
  const core=window.WardenAudioCore;
  if(!core)return;
  try{
    const upper=core.upperInput;
    const t=upper.context.currentTime;
    upper.gain.cancelScheduledValues(t);
    upper.gain.setTargetAtTime(state.g1,t,.06);
  }catch(_){ }
  try{
    const clean=core.cleanInput;
    const t=clean.context.currentTime;
    clean.gain.cancelScheduledValues(t);
    clean.gain.setTargetAtTime(state.g2,t,.06);
  }catch(_){ }
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
  applyMedia();
  applyWebAudio();
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
    <small style="display:block;margin-top:6px;opacity:.72">0% crossfade = Group 1 at its MAX and Group 2 at its MIN. 100% = Group 1 silent and Group 2 at 95%. MASTER still controls overall loudness.</small>`;
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
  apply();
  if(build()||tries>120)clearInterval(wait);
},100);

window.WardenGroupMixer={
  state,
  setGroup1Max,
  setGroup2Min,
  setCrossfade,
  apply
};
})();