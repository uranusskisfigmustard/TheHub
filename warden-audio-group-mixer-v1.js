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

// IMPORTANT: do not replace window.Audio and do not redefine media.volume.
// START M-17 creates several HTMLAudioElement loops at once; constructor/property
// interception caused the AK freeze. We leave browser media objects completely native.
const media={g1:new Set(),g2:new Set()};
const info=new WeakMap();
const nativePlay=HTMLMediaElement.prototype.play;

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

function registerMedia(a){
  if(!a||info.has(a))return;
  const group=classify(a.currentSrc||a.src);
  const base=clamp(Number(a.volume)||0,0,1);
  const rec={group,base,lastApplied:null};
  info.set(a,rec);
  media[group].add(a);
  const forget=()=>media[group].delete(a);
  a.addEventListener('ended',forget,{once:true});
  a.addEventListener('error',forget,{once:true});
  applyMediaOne(a,false);
}

// Register normal media when it actually begins playback. This observes native Audio;
// it does not construct, clone, proxy, or restart anything.
HTMLMediaElement.prototype.play=function(...args){
  registerMedia(this);
  return nativePlay.apply(this,args);
};

function recompute(){
  const x=clamp(state.crossfade,0,1);
  state.g1=clamp(state.group1Max*(1-x),0,1);
  state.g2=clamp(state.group2Min+(.95-state.group2Min)*x,0,.95);
}

function applyMediaOne(a,refreshBase=false){
  const rec=info.get(a);
  if(!rec)return;
  try{
    const current=clamp(Number(a.volume)||0,0,1);
    // On MASTER changes, the owning engine writes a fresh ungrouped level first.
    // Capture that as the new base, then reapply only the group multiplier.
    if(refreshBase || (rec.lastApplied!==null && Math.abs(current-rec.lastApplied)>.025)){
      rec.base=current;
    }
    const target=clamp(rec.base*groupGain(rec.group),0,1);
    if(Math.abs(current-target)>.001)a.volume=target;
    rec.lastApplied=target;
  }catch(_){ }
}

function applyMedia(refreshBase=false){
  ['g1','g2'].forEach(group=>{
    media[group].forEach(a=>applyMediaOne(a,refreshBase));
  });
}

function applyWebAudio(){
  const core=window.WardenAudioCore;
  if(!core)return;
  try{
    const upper=core.upperInput;
    const t=upper.context.currentTime;
    upper.gain.cancelScheduledValues(t);
    upper.gain.setTargetAtTime(state.g1,t,.08);
  }catch(_){ }
  try{
    const clean=core.cleanInput;
    const t=clean.context.currentTime;
    clean.gain.cancelScheduledValues(t);
    clean.gain.setTargetAtTime(state.g2,t,.08);
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
  applyMedia(false);
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

function bindMaster(){
  const slider=document.getElementById('waVolume');
  if(!slider||slider.dataset.groupMixerBound)return;
  slider.dataset.groupMixerBound='1';
  slider.addEventListener('input',()=>{
    // Let Group 1/2 engines calculate their normal MASTER-relative volumes first.
    // Then record those native values as the new source bases and reapply grouping.
    setTimeout(()=>applyMedia(true),0);
  });
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
  bindMaster();
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