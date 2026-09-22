(()=>{
  'use strict';

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;
  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  const defs=[
    {id:'orePulse',label:'ORE PULSE',desc:'Low irregular material pulse that gradually stabilizes in level and cadence'},
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
      d[i]=clamp(w*.48+brown*2.7,-1,1);
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-24;S.compressor.knee.value=18;S.compressor.ratio.value=3;S.compressor.attack.value=.018;S.compressor.release.value=.5;
      S.volume=getVolume();S.master.gain.value=S.volume;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoise(10);
    }
    if(S.ctx.state==='suspended')S.ctx.resume();
    S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.04);
    return S.ctx;
  }

  function progress(id){
    const started=S.started.get(id)||performance.now();
    return clamp((performance.now()-started)/90000,0,1); // ~90 sec to settle
  }

  function pulseShape(id){
    const p=progress(id);
    // Early: long / short, faint, irregular. Late: ~0.9s pulse every ~2.7s at stable level.
    const gap=(1-p)*rand(6.5,12.5)+p*rand(2.45,2.95);
    const dur=(1-p)*rand(.55,2.6)+p*rand(.78,1.05);
    const amp=(1-p)*rand(.010,.024)+p*rand(.050,.062);
    return {p,gap,dur,amp};
  }

  function makePulse(id,answer=false,manual=false){
    const ctx=ensureAudio(),shape=pulseShape(id),start=now()+.03+(answer?rand(.65,1.8):0),nodes=[];
    const group=ctx.createGain();group.gain.value=answer?.58:1;group.connect(S.master);

    // Low broadband body. No pitched oscillator: filtered brown/white noise only.
    const low=ctx.createBufferSource();low.buffer=S.noise;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=answer?105:92;lp.Q.value=.45;
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=28;
    const lg=ctx.createGain();
    const peak=shape.amp*(answer?.72:1);
    lg.gain.setValueAtTime(.0001,start);
    lg.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+Math.min(.35,shape.dur*.28));
    lg.gain.setValueAtTime(Math.max(.0002,peak*.82),start+Math.max(.2,shape.dur*.62));
    lg.gain.exponentialRampToValueAtTime(.0001,start+shape.dur);
    low.connect(hp).connect(lp).connect(lg);

    if(ctx.createStereoPanner){
      const pan=ctx.createStereoPanner();pan.pan.value=answer?(Math.random()<.5?rand(-.95,-.35):rand(.35,.95)):rand(-.12,.12);lg.connect(pan).connect(group);
    }else lg.connect(group);
    low.start(start);low.stop(start+shape.dur+.03);nodes.push(low);

    // A little dense mineral/body texture in the low-mid range, also noise based.
    const body=ctx.createBufferSource();body.buffer=S.noise;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=answer?175:145;bp.Q.value=.55;
    const bg=ctx.createGain();
    bg.gain.setValueAtTime(.0001,start);
    bg.gain.exponentialRampToValueAtTime(peak*(answer?.24:.32),start+Math.min(.28,shape.dur*.22));
    bg.gain.exponentialRampToValueAtTime(.0001,start+shape.dur*.92);
    body.connect(bp).connect(bg).connect(group);body.start(start);body.stop(start+shape.dur+.03);nodes.push(body);

    // A very faint dry pressure edge so each pulse has a physical onset, not a tone.
    const edge=ctx.createBufferSource();edge.buffer=S.noise;
    const ehp=ctx.createBiquadFilter();ehp.type='highpass';ehp.frequency.value=answer?520:420;
    const elp=ctx.createBiquadFilter();elp.type='lowpass';elp.frequency.value=answer?1100:900;
    const eg=ctx.createGain();eg.gain.setValueAtTime(peak*.12,start);eg.gain.exponentialRampToValueAtTime(.0001,start+Math.min(.16,shape.dur*.2));
    edge.connect(ehp).connect(elp).connect(eg).connect(group);edge.start(start);edge.stop(start+.18);nodes.push(edge);

    const stop=()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
    setTimeout(()=>{try{stop()}catch(_){ }},(shape.dur+2.2)*1000);
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
      // Give the first event breathing room so activation doesn't feel like a button beep.
      const firstDelay=id==='answer'?rand(3.5,7.0):rand(1.8,4.0);
      S.timers.set(id,setTimeout(()=>schedule(id),firstDelay*1000));
    }else{
      S.active.delete(id);clearTimer(id);clearStops(id);S.started.delete(id);
    }
    render();
  }

  function trigger(id){
    if(!defs.some(d=>d.id===id))return;ensureAudio();
    // Manual trigger uses the current progression if active; if inactive, use an early faint pulse.
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