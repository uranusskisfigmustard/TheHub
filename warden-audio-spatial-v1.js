(()=>{
'use strict';

const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
const ANSWER_SAMPLE='https://opengameart.org/sites/default/files/monster_roar.wav';
const RATE=.72;
let current=null;
let rafId=0;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const masterVolume=()=>{
  const s=document.getElementById('waVolume');
  const v=s?Number(s.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
  return clamp(Number.isFinite(v)?v:.48,0,1);
};

function stopAll(){
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  if(current){
    try{current.pause();}catch(_){}
    current=null;
  }
}

function makeAudio(mix){
  const a=new Audio(ANSWER_SAMPLE);
  a.preload='auto';
  a.playbackRate=RATE;
  try{a.preservesPitch=false;}catch(_){}
  try{a.mozPreservesPitch=false;}catch(_){}
  try{a.webkitPreservesPitch=false;}catch(_){}
  a.dataset.spatialMix=String(mix);
  a.volume=clamp(masterVolume()*mix,0,1);
  a.addEventListener('ended',()=>{if(current===a)current=null;},{once:true});
  return a;
}

function playStatic(mix){
  stopAll();
  const a=makeAudio(mix);
  current=a;
  const p=a.play();
  if(p&&typeof p.catch==='function')p.catch(()=>{if(current===a)current=null;});
}

function playRamp(from,to,durationMs){
  stopAll();
  const a=makeAudio(from);
  current=a;
  const p=a.play();
  if(p&&typeof p.catch==='function')p.catch(()=>{if(current===a)current=null;});

  const start=performance.now();
  const tick=now=>{
    if(current!==a||a.paused||a.ended){rafId=0;return;}
    const t=clamp((now-start)/durationMs,0,1);
    // Smoothstep avoids abrupt rate changes in the volume envelope.
    const e=t*t*(3-2*t);
    const mix=from+(to-from)*e;
    a.dataset.spatialMix=String(mix);
    a.volume=clamp(masterVolume()*mix,0,1);
    if(t<1)rafId=requestAnimationFrame(tick);else rafId=0;
  };
  rafId=requestAnimationFrame(tick);
}

function trigger(id){
  if(id==='far')playStatic(.20);
  else if(id==='near')playStatic(.78);
  else if(id==='farNear')playRamp(.18,.78,7600);
  else if(id==='nearFar')playRamp(.78,.18,7600);
  else if(id==='reference')playStatic(.78);

  const b=document.querySelector(`[data-spatial-trigger="${id}"]`);
  if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),400);}
}

function bindMaster(){
  const s=document.getElementById('waVolume');
  if(!s)return;
  s.addEventListener('input',()=>{
    if(!current)return;
    const mix=Number(current.dataset.spatialMix||1);
    try{current.volume=clamp(masterVolume()*mix,0,1);}catch(_){}
  });
}

const defs=[
  {id:'far',label:'FAR // STATIC',desc:'Single continuous ANSWERING PULSE at low level. No copies, delay, echo, filters, or crossfade.'},
  {id:'near',label:'NEAR // STATIC',desc:'Single continuous ANSWERING PULSE at established close level. No processing beyond level.'},
  {id:'farNear',label:'FAR → NEAR // SINGLE STREAM',desc:'One uninterrupted playback. Only level changes slowly over ~7.6 seconds.'},
  {id:'nearFar',label:'NEAR → FAR // SINGLE STREAM',desc:'One uninterrupted playback. Only level changes slowly over ~7.6 seconds.'},
  {id:'reference',label:'ANSWERING PULSE REFERENCE',desc:'Established working source at the same 0.72x playback rate.'}
];

function build(){
  if(document.getElementById('waSpatialStage'))return true;
  const anchor=document.getElementById('waOreAudition')||document.getElementById('waSignalStage');
  if(!anchor)return false;
  const section=document.createElement('div');
  section.id='waSpatialStage';
  section.innerHTML=`
    <div class="wa-live" style="margin-top:14px"><span>TEMP // SPATIAL AUDITION:</span> <b>SINGLE STREAM</b></div>
    <small style="display:block;margin:6px 0 10px;opacity:.75">Compatibility pass: one audio element only. Echo, duplicate distance, filters, and multi-stream crossfades are removed until clean playback is confirmed.</small>
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
window.WardenSpatialAudio={trigger,stopAll};
})();