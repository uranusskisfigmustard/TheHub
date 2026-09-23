(()=>{
  'use strict';

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;
  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  const defs=[
    {id:'orePulse',label:'ORE PULSE',desc:'Irregular physical pressure pulse that gradually stabilizes in level and cadence'},
    {id:'answer',label:'ANSWERING PULSE',desc:'Softer delayed nonlocal response that gradually falls into the same cadence'}
  ];

  const S={ctx:null,master:null,compressor:null,noise:null,active:new Set(),timers:new Map(),stops:new Map(),started:new Map(),volume:.48};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>S.ctx?S.ctx.currentTime:0;

  function getVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function makeNoise(seconds=10){
    const len=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(1,len,S.ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      brown=(brown+.016*w)/1.016;
      d[i]=clamp(w*.58+brown*2.35,-1,1);
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-18;
      S.compressor.knee.value=16;
      S.compressor.ratio.value=2.5;
      S.compressor.attack.value=.012;
      S.compressor.release.value=.42;
      S.volume=getVolume();
      S.master.gain.value=S.volume;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoise(10);
    }
    if(S.ctx.state==='suspended')S.ctx.resume();
    S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.04);
    return S.ctx;
  }

  function progress(id){
    const started=S.started.get(id)||performance.now();
    return clamp((performance.now()-started)/90000,0,1);
  }

  function pulseShape(id){
    const p=progress(id);
    const gap=(1-p)*rand(6.5,12.5)+p*rand(2.45,2.95);
    const dur=(1-p)*rand(.72,1.65)+p*rand(.78,1.05);
    // Strong enough to survive laptop / television speakers; perceived weight is carried
    // by broadband low-mid energy rather than inaudible sub-bass.
    const amp=(1-p)*rand(.16,.22)+p*rand(.22,.28);
    return {p,gap,dur,amp};
  }

  function makePulse(id,answer=false,manual=false){
    const ctx=ensureAudio(),shape=pulseShape(id),start=now()+.03+(answer?rand(.55,1.15):0),nodes=[];
    const group=ctx.createGain();
    // Manual triggers are audition controls: both should be unmistakably audible.
    group.gain.value=answer?(manual?.86:.58):(manual?1.35:1.0);
    group.connect(S.master);

    const peak=shape.amp*(answer?.74:1);

    // Main physical body: broad low-mid noise, not a pitched oscillator.
    const body=ctx.createBufferSource();body.buffer=S.noise;
    const bhp=ctx.createBiquadFilter();bhp.type='highpass';bhp.frequency.value=answer?210:170;bhp.Q.value=.3;
    const blp=ctx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=answer?720:860;blp.Q.value=.25;
    const bg=ctx.createGain();
    bg.gain.setValueAtTime(.0001,start);
    bg.gain.exponentialRampToValueAtTime(peak,start+Math.min(.18,shape.dur*.2));
    bg.gain.setValueAtTime(peak*.66,start+Math.max(.22,shape.dur*.62));
    bg.gain.exponentialRampToValueAtTime(.0001,start+shape.dur);
    body.connect(bhp).connect(blp).connect(bg);
    if(ctx.createStereoPanner){
      const pan=ctx.createStereoPanner();
      pan.pan.value=answer?(Math.random()<.5?rand(-.85,-.28):rand(.28,.85)):rand(-.12,.12);
      bg.connect(pan).connect(group);
    }else bg.connect(group);
    body.start(start);body.stop(start+shape.dur+.04);nodes.push(body);

    // Low pressure reinforcement. Audible on decent speakers but not required for recognition.
    const low=ctx.createBufferSource();low.buffer=S.noise;
    const lhp=ctx.createBiquadFilter();lhp.type='highpass';lhp.frequency.value=45;
    const llp=ctx.createBiquadFilter();llp.type='lowpass';llp.frequency.value=answer?190:230;
    const lg=ctx.createGain();
    lg.gain.setValueAtTime(.0001,start);
    lg.gain.exponentialRampToValueAtTime(peak*.62,start+Math.min(.22,shape.dur*.24));
    lg.gain.exponentialRampToValueAtTime(.0001,start+shape.dur*.96);
    low.connect(lhp).connect(llp).connect(lg).connect(group);
    low.start(start);low.stop(start+shape.dur+.04);nodes.push(low);

    // Short rough onset gives the pulse a physical shove without becoming a click/beep.
    const edge=ctx.createBufferSource();edge.buffer=S.noise;
    const ehp=ctx.createBiquadFilter();ehp.type='highpass';ehp.frequency.value=answer?520:430;
    const elp=ctx.createBiquadFilter();elp.type='lowpass';elp.frequency.value=answer?1500:1750;
    const eg=ctx.createGain();
    eg.gain.setValueAtTime(peak*(answer?.42:.58),start);
    eg.gain.exponentialRampToValueAtTime(.0001,start+Math.min(.22,shape.dur*.25));
    edge.connect(ehp).connect(elp).connect(eg).connect(group);
    edge.start(start);edge.stop(start+.24);nodes.push(edge);

    // A second short irregular shove near the middle keeps this from reading as a single electronic envelope.
    if(!answer || Math.random()<.65){
      const shoveStart=start+Math.min(shape.dur*.48,rand(.28,.48));
      const shove=ctx.createBufferSource();shove.buffer=S.noise;
      const shp=ctx.createBiquadFilter();shp.type='highpass';shp.frequency.value=250;
      const slp=ctx.createBiquadFilter();slp.type='lowpass';slp.frequency.value=980;
      const sg=ctx.createGain();sg.gain.setValueAtTime(peak*(answer?.22:.34),shoveStart);sg.gain.exponentialRampToValueAtTime(.0001,shoveStart+.18);
      shove.connect(shp).connect(slp).connect(sg).connect(group);shove.start(shoveStart);shove.stop(shoveStart+.2);nodes.push(shove);
    }

    const stop=()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
    setTimeout(()=>{try{stop()}catch(_){ }},(shape.dur+2.0)*1000);
    return {stop,nextGap:manual?0:shape.gap};
  }

  function clearTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id)}
  function clearStops(id){const set=S.stops.get(id);if(set){set.forEach(fn=>{try{fn()}catch(_){}});set.clear()}}

  function schedule(id){
    clearTimer(id);if(!S.active.has(id))return;
    const answer=id==='answer',r=makePulse(id,answer,false);
    if(!S.stops.has(id))S.stops.set(id,new Set());S.stops.get(id).add(r.stop);
    setTimeout(()=>S.stops.get(id)?.delete(r.stop),5000);
    const timer=setTimeout(()=>schedule(id),r.nextGap*1000);
    S.timers.set(id,timer);
  }

  function setLayer(id,on){
    if(!defs.some(d=>d.id===id))return;ensureAudio();
    if(on){
      if(S.active.has(id))return;
      S.active.add(id);S.started.set(id,performance.now());
      const firstDelay=id==='answer'?rand(3.5,7.0):rand(1.8,4.0);
      S.timers.set(id,setTimeout(()=>schedule(id),firstDelay*1000));
    }else{
      S.active.delete(id);clearTimer(id);clearStops(id);S.started.delete(id);
    }
    render();
  }

  function trigger(id){
    if(!defs.some(d=>d.id===id))return;ensureAudio();
    if(!S.started.has(id))S.started.set(id,performance.now());
    const r=makePulse(id,id==='answer',true);setTimeout(()=>{try{r.stop()}catch(_){ }},5000);
    const b=document.querySelector(`[data-signal-trigger="${id}"]`);if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350)}
  }

  function startSignal(){setLayer('orePulse',true);setLayer('answer',true)}
  function stopSignal(){defs.forEach(d=>setLayer(d.id,false))}

  function render(){
    document.querySelectorAll('[data-signal-layer]').forEach(btn=>{const id=btn.dataset.signalLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));const s=btn.querySelector('.wa-state');if(s)s.textContent=on?'ON':'OFF'});
    const live=document.getElementById('waSignalLive');if(live){const names=defs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'OFF'}
  }

  function bindMaster(){const slider=document.getElementById('waVolume');if(!slider)return;slider.addEventListener('input',()=>{if(S.ctx&&S.master)S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.03)})}

  function build(){
    if(document.getElementById('waSignalStage'))return true;
    const dock=document.getElementById('wardenAudioDock');if(!dock)return false;
    const body=dock.querySelector('.wa-body');if(!body)return false;
    const section=document.createElement('div');section.id='waSignalStage';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:10px"><span>STAGE 2 // SIGNAL:</span> <b id="waSignalLive">OFF</b></div>
      <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-primary" id="waStartSignal" type="button">START SIGNAL</button><button class="wa-btn wa-stop" id="waStopSignal" type="button">STOP SIGNAL</button></div>
      <div class="wa-grid">${defs.map(d=>`<div class="wa-layer"><button class="wa-layer-toggle" type="button" data-signal-layer="${d.id}" aria-pressed="false"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">OFF</span></button><button class="wa-mini" type="button" data-signal-trigger="${d.id}">TRIGGER</button></div>`).join('')}</div>`;
    body.appendChild(section);
    section.querySelectorAll('[data-signal-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.signalLayer,!S.active.has(btn.dataset.signalLayer))));
    section.querySelectorAll('[data-signal-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.signalTrigger)));
    document.getElementById('waStartSignal').addEventListener('click',startSignal);document.getElementById('waStopSignal').addEventListener('click',stopSignal);bindMaster();render();return true;
  }

  let tries=0;const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait)},100);
  window.WardenM17SignalAudio={setLayer,trigger,startSignal,stopSignal};
})();