(()=>{
'use strict';

const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
const ANSWER_SAMPLE='https://opengameart.org/sites/default/files/monster_roar.wav';
const RATE=.72; // Match the working ANSWERING PULSE reference. Constant within every spatial path.
const active=new Set();
const rafs=new Set();
const timers=new Set();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const masterVolume=()=>{
  const s=document.getElementById('waVolume');
  const v=s?Number(s.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
  return clamp(Number.isFinite(v)?v:.48,0,1);
};

function makeAudio(mix=1){
  const a=new Audio(ANSWER_SAMPLE);
  a.preload='auto';
  a.playbackRate=RATE;
  try{a.preservesPitch=false;}catch(_){}
  try{a.mozPreservesPitch=false;}catch(_){}
  try{a.webkitPreservesPitch=false;}catch(_){}
  a.dataset.spatialMix=String(mix);
  a.volume=clamp(masterVolume()*mix,0,1);
  active.add(a);
  const cleanup=()=>active.delete(a);
  a.addEventListener('ended',cleanup,{once:true});
  a.addEventListener('error',cleanup,{once:true});
  return a;
}

function stopAudio(a){
  if(!a)return;
  try{a.pause();a.currentTime=0;}catch(_){}
  active.delete(a);
}

function stopAll(){
  [...active].forEach(stopAudio);
  rafs.forEach(id=>cancelAnimationFrame(id));
  rafs.clear();
  timers.forEach(id=>clearTimeout(id));
  timers.clear();
}

function playNow(a){
  const p=a.play();
  if(p&&typeof p.catch==='function')p.catch(()=>active.delete(a));
}

function playDelayed(a,delayMs){
  const t=setTimeout(()=>{timers.delete(t);playNow(a);},delayMs);
  timers.add(t);
}

function rampMix(a,from,to,durationMs,delayMs=0){
  a.dataset.spatialMix=String(from);
  a.volume=clamp(masterVolume()*from,0,1);
  const start=performance.now()+delayMs;
  const tick=now=>{
    if(a.paused&&!a.ended&&now>start+150)return;
    if(now<start){const id=requestAnimationFrame(tick);rafs.add(id);return;}
    const p=clamp((now-start)/durationMs,0,1);
    const mix=from+(to-from)*p;
    a.dataset.spatialMix=String(mix);
    a.volume=clamp(masterVolume()*mix,0,1);
    if(p<1){const id=requestAnimationFrame(tick);rafs.add(id);}
  };
  const id=requestAnimationFrame(tick);rafs.add(id);
}

// A small cluster of delayed copies gives distance/reverberant smear without DSP or time-stretching.
function makeFarCluster(baseMix=1){
  return [
    {a:makeAudio(.16*baseMix),delay:90,mix:.16*baseMix},
    {a:makeAudio(.10*baseMix),delay:210,mix:.10*baseMix},
    {a:makeAudio(.055*baseMix),delay:390,mix:.055*baseMix}
  ];
}

function farToNear(){
  stopAll();
  const near=makeAudio(.10);
  const far=makeFarCluster(1.0);
  playNow(near);
  far.forEach(x=>playDelayed(x.a,x.delay));
  rampMix(near,.10,.82,6500,0);
  far.forEach((x,i)=>rampMix(x.a,x.mix,x.mix*.16,6200,150+i*90));
}

function nearToFar(){
  stopAll();
  const near=makeAudio(.82);
  const far=makeFarCluster(.22);
  playNow(near);
  far.forEach(x=>playDelayed(x.a,x.delay));
  rampMix(near,.82,.11,6500,0);
  far.forEach((x,i)=>rampMix(x.a,x.mix,x.mix*4.2,6200,150+i*90));
}

function doubleDistance(){
  stopAll();
  const near=makeAudio(.76);
  playNow(near);

  // The same event appears again from much farther away, not a new voice.
  const delay=2350;
  const farPrimary=makeAudio(.24);
  playDelayed(farPrimary,delay);
  const echoes=[
    {a:makeAudio(.105),delay:delay+125},
    {a:makeAudio(.060),delay:delay+285},
    {a:makeAudio(.032),delay:delay+510}
  ];
  echoes.forEach(x=>playDelayed(x.a,x.delay));
}

function reference(){
  stopAll();
  const a=makeAudio(.78);
  playNow(a);
}

function trigger(id){
  if(id==='farNear')farToNear();
  else if(id==='nearFar')nearToFar();
  else if(id==='double')doubleDistance();
  else if(id==='reference')reference();
  const b=document.querySelector(`[data-spatial-trigger="${id}"]`);
  if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),400);}
}

function bindMaster(){
  const s=document.getElementById('waVolume');
  if(!s)return;
  s.addEventListener('input',()=>{
    active.forEach(a=>{
      const mix=Number(a.dataset.spatialMix||1);
      try{a.volume=clamp(masterVolume()*mix,0,1);}catch(_){}
    });
  });
}

const defs=[
  {id:'farNear',label:'FAR → NEAR',desc:'Same ANSWERING PULSE moves from distant/reverberant to close/dry over ~6.5 seconds.'},
  {id:'nearFar',label:'NEAR → FAR',desc:'Same pulse begins close and heavy, then recedes into delayed distant copies.'},
  {id:'double',label:'DOUBLE DISTANCE',desc:'One nearby pulse, then the exact same event appears again ~2.35 seconds later from much farther away.'},
  {id:'reference',label:'ANSWERING PULSE REFERENCE',desc:'Working unprocessed spatial reference at the established 0.72x rate.'}
];

function build(){
  if(document.getElementById('waSpatialStage'))return true;
  const anchor=document.getElementById('waOreAudition')||document.getElementById('waSignalStage');
  if(!anchor)return false;
  const section=document.createElement('div');
  section.id='waSpatialStage';
  section.innerHTML=`
    <div class="wa-live" style="margin-top:14px"><span>TEMP // SPATIAL AUDITION:</span> <b>ANSWERING PULSE</b></div>
    <small style="display:block;margin:6px 0 10px;opacity:.75">No pitch transition or time-stretching. Distance is created only with level, delayed copies, and smooth crossfades.</small>
    <div class="wa-grid">
      ${defs.map(d=>`<div class="wa-layer"><div class="wa-layer-toggle" style="cursor:default"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">TEST</span></div><button class="wa-mini" type="button" data-spatial-trigger="${d.id}">TRIGGER</button></div>`).join('')}
    </div>
    <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-stop" id="waStopSpatial" type="button">STOP SPATIAL</button></div>`;
  anchor.insertAdjacentElement('afterend',section);
  section.querySelectorAll('[data-spatial-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.spatialTrigger)));
  document.getElementById('waStopSpatial').addEventListener('click',stopAll);
  bindMaster();
  return true;
}

let tries=0;
const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
window.WardenSpatialAudio={trigger,stopAll,farToNear,nearToFar,doubleDistance};
})();