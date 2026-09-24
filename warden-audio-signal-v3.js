(()=>{
'use strict';

const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
const ANSWER_SAMPLE='https://opengameart.org/sites/default/files/monster_roar.wav';
const VALID_IDS=new Set(['orePulse','answer']);
const S={active:new Set(),timers:new Map(),playing:new Map(),synthStops:new Map(),started:new Map(),ctx:null,oreFileUrl:null,oreFileName:null};
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

function masterVolume(){
  const slider=document.getElementById('waVolume');
  const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
  return clamp(Number.isFinite(v)?v:.48,0,1);
}
function group2Gain(){
  const m=window.WardenGroupMixer,v=m&&m.state?Number(m.state.g2):1;
  return clamp(Number.isFinite(v)?v:1,0,.95);
}
function crossfadeDepth(){
  const m=window.WardenGroupMixer,v=m&&m.state?Number(m.state.crossfade):0;
  return clamp(Number.isFinite(v)?v:0,0,1);
}
function progress(id){
  const started=S.started.get(id)||performance.now();
  return clamp((performance.now()-started)/90000,0,1);
}
function answerEscalation(){return clamp(crossfadeDepth()*.85+progress('answer')*.15,0,1);}
function gapFor(id){
  if(id==='orePulse'){
    const p=progress(id);
    return(1-p)*rand(7.0,12.5)+p*rand(3.4,5.1);
  }
  const d=answerEscalation();
  return rand(lerp(9.5,4.8,d),lerp(14.0,7.2,d));
}
function firstDelay(id){
  if(id==='orePulse')return rand(2.0,4.2);
  const d=answerEscalation();
  return rand(lerp(5.5,3.0,d),lerp(8.0,4.5,d));
}

function audioContext(){
  try{
    if(!S.ctx){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;S.ctx=new Ctx();}
    if(S.ctx.state==='suspended')S.ctx.resume().catch(()=>{});
    return S.ctx;
  }catch(_){return null;}
}
function makeLowNoiseBuffer(ctx,duration){
  const frames=Math.ceil(ctx.sampleRate*duration),b=ctx.createBuffer(1,frames,ctx.sampleRate),d=b.getChannelData(0);let x=0,drift=0;
  for(let i=0;i<frames;i++){const white=Math.random()*2-1;drift=.994*drift+.006*white;x=.976*x+.024*white;d[i]=x*.72+drift*.42;}
  let peak=0;for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(d[i]));const scale=peak>0?.92/peak:1;for(let i=0;i<frames;i++)d[i]*=scale;return b;
}
function registerSynthStop(id,stop){if(!S.synthStops.has(id))S.synthStops.set(id,new Set());S.synthStops.get(id).add(stop);}
function unregisterSynthStop(id,stop){const set=S.synthStops.get(id);if(set)set.delete(stop);}

function applyMediaVolume(a){const mix=Number(a.dataset.waMix||1),fade=Number(a.dataset.waFade||1);a.volume=clamp(masterVolume()*mix*fade*group2Gain(),0,1);}
function refreshGroupVolume(){S.playing.forEach(set=>set.forEach(a=>{try{applyMediaVolume(a);}catch(_){ }}));}
function retireMedia(id,a){const set=S.playing.get(id);if(set)set.delete(a);}
function stopMedia(id,a){if(!a)return;try{a.pause();a.currentTime=0;}catch(_){ }retireMedia(id,a);}
function fadeMedia(id,a,holdMs,fadeMs){const hold=setTimeout(()=>{const start=performance.now();const tick=()=>{if(a.paused){retireMedia(id,a);return;}const p=clamp((performance.now()-start)/fadeMs,0,1);a.dataset.waFade=String(1-p);applyMediaVolume(a);if(p<1)requestAnimationFrame(tick);else stopMedia(id,a);};requestAnimationFrame(tick);},holdMs);a.dataset.waHoldTimer=String(hold);}
function trackMedia(id,a){
  if(!S.playing.has(id))S.playing.set(id,new Set());S.playing.get(id).add(a);
  const cleanup=()=>retireMedia(id,a);a.addEventListener('ended',cleanup,{once:true});a.addEventListener('error',cleanup,{once:true});
  return cleanup;
}

function playLocalOre(manual=false){
  const a=new Audio(S.oreFileUrl);a.preload='auto';a.dataset.waFade='1';a.dataset.waMix=String(manual?1:.82);applyMediaVolume(a);trackMedia('orePulse',a);
  const p=a.play();if(p&&typeof p.catch==='function')p.catch(()=>retireMedia('orePulse',a));
  return()=>stopMedia('orePulse',a);
}

// Temporary fallback only when no local licensed ore file has been selected.
function playSynthOre(manual=false){
  const ctx=audioContext();if(!ctx)return()=>{};
  const now=ctx.currentTime+.01,dur=rand(2.4,3.0),source=ctx.createBufferSource();source.buffer=makeLowNoiseBuffer(ctx,dur+.25);
  const pre=ctx.createBiquadFilter();pre.type='lowpass';pre.frequency.value=185;pre.Q.value=.5;
  const bodyBus=ctx.createGain(),bodyEnv=ctx.createGain(),comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-29;comp.knee.value=18;comp.ratio.value=2.4;comp.attack.value=.025;comp.release.value=.48;
  const output=ctx.createGain(),p=progress('orePulse'),autoMix=.72+.18*p;output.gain.value=masterVolume()*(manual?1:autoMix)*group2Gain();
  source.connect(pre);pre.connect(bodyBus);
  const resonances=[{f:32,g:.12,q:2.4},{f:48,g:.62,q:4.4},{f:72,g:.92,q:4.1},{f:96,g:.70,q:3.7},{f:120,g:.28,q:2.7}],nodes=[source,pre,bodyBus,bodyEnv,comp,output];
  resonances.forEach(r=>{const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=r.f*rand(.992,1.008);filter.Q.value=r.q;const gain=ctx.createGain();gain.gain.value=r.g*rand(.94,1.06);bodyBus.connect(filter);filter.connect(gain);gain.connect(bodyEnv);nodes.push(filter,gain);});
  const chest=ctx.createBiquadFilter();chest.type='bandpass';chest.frequency.value=rand(54,62);chest.Q.value=1.15;const chestGain=ctx.createGain();chestGain.gain.value=.38;pre.connect(chest);chest.connect(chestGain);chestGain.connect(bodyEnv);nodes.push(chest,chestGain);
  const throat=ctx.createBiquadFilter();throat.type='bandpass';throat.frequency.value=rand(125,150);throat.Q.value=.72;const throatGain=ctx.createGain();
  throatGain.gain.setValueAtTime(.0001,now);throatGain.gain.linearRampToValueAtTime(.17,now+.09);throatGain.gain.exponentialRampToValueAtTime(.018,now+.48);throatGain.gain.setValueAtTime(.012,now+Math.max(.7,dur-.42));throatGain.gain.linearRampToValueAtTime(.07,now+Math.max(.8,dur-.24));throatGain.gain.exponentialRampToValueAtTime(.0001,now+dur);pre.connect(throat);throat.connect(throatGain);throatGain.connect(bodyEnv);nodes.push(throat,throatGain);
  bodyEnv.gain.setValueAtTime(.0001,now);bodyEnv.gain.exponentialRampToValueAtTime(.34,now+.11);bodyEnv.gain.linearRampToValueAtTime(.82,now+.34);bodyEnv.gain.linearRampToValueAtTime(1.0,now+.62);bodyEnv.gain.setValueAtTime(.98,now+Math.max(.75,dur-1.05));bodyEnv.gain.linearRampToValueAtTime(.62,now+Math.max(1.0,dur-.62));bodyEnv.gain.exponentialRampToValueAtTime(.0001,now+dur);
  bodyEnv.connect(comp);comp.connect(output);output.connect(ctx.destination);
  let stopped=false;const stop=()=>{if(stopped)return;stopped=true;try{source.stop();}catch(_){ }nodes.forEach(n=>{try{n.disconnect();}catch(_){ }});unregisterSynthStop('orePulse',stop);};
  registerSynthStop('orePulse',stop);source.onended=()=>stop();source.start(now);source.stop(now+dur+.04);return stop;
}
function playOre(manual=false){return S.oreFileUrl?playLocalOre(manual):playSynthOre(manual);}

function setPitchMode(a,rate){a.playbackRate=rate;try{a.preservesPitch=false;}catch(_){ }try{a.mozPreservesPitch=false;}catch(_){ }try{a.webkitPreservesPitch=false;}catch(_){ }}
function playAnswer(manual=false){
  const a=new Audio(ANSWER_SAMPLE);a.preload='auto';a.dataset.waFade='1';a.dataset.waMix=String(manual?.78:.54);setPitchMode(a,.72);applyMediaVolume(a);trackMedia('answer',a);
  const begin=()=>{const p=a.play();if(p&&typeof p.catch==='function')p.catch(()=>retireMedia('answer',a));fadeMedia('answer',a,manual?4700:5200,1900);};
  const delay=manual?0:rand(650,1500),startTimer=setTimeout(begin,delay);
  return()=>{clearTimeout(startTimer);const hold=Number(a.dataset.waHoldTimer||0);if(hold)clearTimeout(hold);stopMedia('answer',a);};
}
function playSound(id,manual=false){return id==='orePulse'?playOre(manual):playAnswer(manual);}
function clearTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id);}
function stopPlaying(id){const media=S.playing.get(id);if(media){[...media].forEach(a=>stopMedia(id,a));media.clear();}const synth=S.synthStops.get(id);if(synth){[...synth].forEach(stop=>stop());synth.clear();}}
function schedule(id,first=false){clearTimer(id);if(!S.active.has(id))return;const delay=first?firstDelay(id):gapFor(id);const timer=setTimeout(()=>{if(!S.active.has(id))return;playSound(id,false);schedule(id,false);},delay*1000);S.timers.set(id,timer);}
function onDepthChange(){refreshGroupVolume();if(S.active.has('answer'))schedule('answer',false);}
function setLayer(id,on){
  if(!VALID_IDS.has(id))return;on=!!on;
  if(on){if(S.active.has(id))return;if(id==='orePulse'&&!S.oreFileUrl)audioContext();S.active.add(id);S.started.set(id,performance.now());schedule(id,true);}
  else{S.active.delete(id);clearTimer(id);stopPlaying(id);S.started.delete(id);}
  render();
}
function trigger(id){
  if(!VALID_IDS.has(id))return;if(id==='orePulse'&&!S.oreFileUrl)audioContext();playSound(id,true);
  const b=document.querySelector(`[data-signal-trigger="${id}"]`);if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350);}
  if(S.active.has(id))schedule(id,false);
}
function isActive(id){return S.active.has(id);}
function startSignal(){setLayer('orePulse',true);setLayer('answer',true);}
function stopSignal(){setLayer('orePulse',false);setLayer('answer',false);}

function setLocalOreFile(file){
  if(!file)return;
  if(S.oreFileUrl){try{URL.revokeObjectURL(S.oreFileUrl);}catch(_){ }}
  stopPlaying('orePulse');
  S.oreFileUrl=URL.createObjectURL(file);S.oreFileName=file.name||'LOCAL AUDIO';
  renderOreSource();
  if(S.active.has('orePulse'))schedule('orePulse',true);
}
function clearLocalOreFile(){
  stopPlaying('orePulse');
  if(S.oreFileUrl){try{URL.revokeObjectURL(S.oreFileUrl);}catch(_){ }}
  S.oreFileUrl=null;S.oreFileName=null;renderOreSource();
  if(S.active.has('orePulse'))schedule('orePulse',true);
}
function renderOreSource(){
  const status=document.getElementById('waOreSourceStatus');
  if(status)status.textContent=S.oreFileUrl?`LOCAL: ${S.oreFileName}`:'FALLBACK: SYNTH ORE PULSE';
  const desc=document.getElementById('waOreDesc');
  if(desc)desc.textContent=S.oreFileUrl?'Using local licensed audio; file remains on this computer for this page session.':'Temporary synthesized fallback. Use LOAD LOCAL ORE FILE for the licensed SoundSnap download.';
}
function render(){
  document.querySelectorAll('[data-signal-layer]').forEach(btn=>{const id=btn.dataset.signalLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));const s=btn.querySelector('.wa-state');if(s)s.textContent=on?'ON':'OFF';});
  const live=document.getElementById('waSignalLive');if(live){const names=[];if(S.active.has('orePulse'))names.push('ORE PULSE');if(S.active.has('answer'))names.push('ANSWERING PULSE');live.textContent=names.length?names.join(' + '):'OFF';}
  renderOreSource();
}
function bindMaster(){const slider=document.getElementById('waVolume');if(slider)slider.addEventListener('input',refreshGroupVolume);}
function build(){
  if(document.getElementById('waSignalStage'))return true;
  const dock=document.getElementById('wardenAudioDock');if(!dock)return false;const body=dock.querySelector('.wa-body');if(!body)return false;
  const section=document.createElement('div');section.id='waSignalStage';section.innerHTML=`<div class="wa-live" style="margin-top:10px"><span>GROUP 2 // ORE SIGNAL + RESPONSE:</span> <b id="waSignalLive">OFF</b></div><div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-primary" id="waStartSignal" type="button">START GROUP 2</button><button class="wa-btn wa-stop" id="waStopSignal" type="button">STOP GROUP 2</button></div><div class="wa-master-row" style="margin-top:8px"><button class="wa-btn" id="waLoadOreFile" type="button">LOAD LOCAL ORE FILE</button><button class="wa-btn" id="waClearOreFile" type="button">CLEAR LOCAL FILE</button><input id="waOreFileInput" type="file" accept="audio/*" hidden><span id="waOreSourceStatus" style="font-size:12px;opacity:.75">FALLBACK: SYNTH ORE PULSE</span></div><div class="wa-grid"><div class="wa-layer"><button class="wa-layer-toggle" type="button" data-signal-layer="orePulse" aria-pressed="false"><span><b>ORE PULSE</b><small id="waOreDesc">Temporary synthesized fallback. Use LOAD LOCAL ORE FILE for the licensed SoundSnap download.</small></span><span class="wa-state">OFF</span></button><button class="wa-mini" type="button" data-signal-trigger="orePulse">TRIGGER</button></div><div class="wa-layer"><button class="wa-layer-toggle" type="button" data-signal-layer="answer" aria-pressed="false"><span><b>ANSWERING PULSE</b><small>Distant recorded response — Group 2 volume; cadence accelerates as CROSSFADE / DEPTH increases</small></span><span class="wa-state">OFF</span></button><button class="wa-mini" type="button" data-signal-trigger="answer">TRIGGER</button></div></div>`;
  body.appendChild(section);
  section.querySelectorAll('[data-signal-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.signalLayer,!S.active.has(btn.dataset.signalLayer))));
  section.querySelectorAll('[data-signal-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.signalTrigger)));
  document.getElementById('waStartSignal').addEventListener('click',startSignal);document.getElementById('waStopSignal').addEventListener('click',stopSignal);
  const input=document.getElementById('waOreFileInput');document.getElementById('waLoadOreFile').addEventListener('click',()=>input.click());input.addEventListener('change',()=>{const file=input.files&&input.files[0];if(file)setLocalOreFile(file);input.value='';});document.getElementById('waClearOreFile').addEventListener('click',clearLocalOreFile);
  bindMaster();render();return true;
}

window.addEventListener('beforeunload',()=>{if(S.oreFileUrl)try{URL.revokeObjectURL(S.oreFileUrl);}catch(_){ }});
let tries=0;const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
window.WardenM17SignalAudio={setLayer,trigger,startSignal,stopSignal,refreshGroupVolume,onDepthChange,isActive,render,setLocalOreFile,clearLocalOreFile};
})();