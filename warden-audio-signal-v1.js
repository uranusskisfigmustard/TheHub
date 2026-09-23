(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  // ANSWERING PULSE source remains the approved recorded creature reply.
  // OpenGameArt — "CC0 Deep Monster Roar" by trazzz123 — CC0 1.0.
  const ANSWER_SAMPLE='https://opengameart.org/sites/default/files/monster_roar.wav';

  const defs=[
    {id:'orePulse',label:'ORE PULSE',desc:'Cassowary-spectrum modeled boom — low bodily pulse with no field-recording noise'},
    {id:'answer',label:'ANSWERING PULSE',desc:'Distant recorded deep-creature reply — slower, larger, and nonlocal'}
  ];

  const S={
    active:new Set(),
    timers:new Map(),
    playing:new Map(),
    synthStops:new Map(),
    started:new Map(),
    ctx:null
  };

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function progress(id){
    const started=S.started.get(id)||performance.now();
    return clamp((performance.now()-started)/90000,0,1);
  }

  function gapFor(id){
    const p=progress(id);
    if(id==='orePulse') return (1-p)*rand(7.0,12.5)+p*rand(3.4,5.1);
    return (1-p)*rand(10.5,17.0)+p*rand(5.4,8.2);
  }

  function audioContext(){
    try{
      if(!S.ctx){
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx)return null;
        S.ctx=new Ctx();
      }
      if(S.ctx.state==='suspended')S.ctx.resume().catch(()=>{});
      return S.ctx;
    }catch(_){return null;}
  }

  function makeLowNoiseBuffer(ctx,duration){
    const frames=Math.ceil(ctx.sampleRate*duration);
    const b=ctx.createBuffer(1,frames,ctx.sampleRate);
    const d=b.getChannelData(0);
    let x=0;
    for(let i=0;i<frames;i++){
      const white=Math.random()*2-1;
      x=.965*x+.035*white;
      d[i]=x;
    }
    let peak=0;
    for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(d[i]));
    const scale=peak>0?.92/peak:1;
    for(let i=0;i<frames;i++)d[i]*=scale;
    return b;
  }

  function registerSynthStop(id,stop){
    if(!S.synthStops.has(id))S.synthStops.set(id,new Set());
    S.synthStops.get(id).add(stop);
  }

  function unregisterSynthStop(id,stop){
    const set=S.synthStops.get(id);
    if(set)set.delete(stop);
  }

  // Measured cassowary reference:
  // Southern cassowary boom extends to ~32 Hz and individual pulses are ~0.8 s.
  // Dwarf cassowary shows strong low harmonics near 25/50/75/100 Hz, with a rough
  // 100-200 Hz roar-like component at call boundaries. This model adapts that anatomy
  // to small speakers by keeping a faint 32 Hz foundation while making 64/96/128 Hz
  // the audible body. Resonances are excited by low, irregular noise rather than clean
  // oscillators so the result behaves more like a vibrating throat/chest than a synth chord.
  function playOre(manual=false){
    const ctx=audioContext();
    if(!ctx)return ()=>{};

    const now=ctx.currentTime+.01;
    const dur=rand(.78,.92);
    const source=ctx.createBufferSource();
    source.buffer=makeLowNoiseBuffer(ctx,dur+.12);

    const pre=ctx.createBiquadFilter();
    pre.type='lowpass';
    pre.frequency.value=230;
    pre.Q.value=.55;

    const bodyBus=ctx.createGain();
    const bodyEnv=ctx.createGain();
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-26;
    comp.knee.value=15;
    comp.ratio.value=2.1;
    comp.attack.value=.012;
    comp.release.value=.22;

    const output=ctx.createGain();
    const p=progress('orePulse');
    const autoMix=.68+.22*p;
    output.gain.value=masterVolume()*(manual?1:autoMix);

    source.connect(pre);
    pre.connect(bodyBus);

    const resonances=[
      {f:32,g:.16,q:2.0},
      {f:64,g:.58,q:3.2},
      {f:96,g:.72,q:3.0},
      {f:128,g:.38,q:2.5}
    ];

    const nodes=[source,pre,bodyBus,bodyEnv,comp,output];
    resonances.forEach(r=>{
      const filter=ctx.createBiquadFilter();
      filter.type='bandpass';
      filter.frequency.value=r.f*rand(.987,1.013);
      filter.Q.value=r.q;
      const gain=ctx.createGain();
      gain.gain.value=r.g*rand(.92,1.08);
      bodyBus.connect(filter);
      filter.connect(gain);
      gain.connect(bodyEnv);
      nodes.push(filter,gain);
    });

    // Brief rough throat component, analogous to the measured 100-200 Hz roar-like edge.
    const throat=ctx.createBiquadFilter();
    throat.type='bandpass';
    throat.frequency.value=rand(138,164);
    throat.Q.value=.85;
    const throatGain=ctx.createGain();
    throatGain.gain.setValueAtTime(0,now);
    throatGain.gain.linearRampToValueAtTime(.34,now+.035);
    throatGain.gain.exponentialRampToValueAtTime(.035,now+.25);
    throatGain.gain.setValueAtTime(.0001,now+.34);
    pre.connect(throat);
    throat.connect(throatGain);
    throatGain.connect(bodyEnv);
    nodes.push(throat,throatGain);

    // Cassowary-like pulse envelope: fast inflation, bodily plateau, soft collapse.
    bodyEnv.gain.setValueAtTime(.0001,now);
    bodyEnv.gain.exponentialRampToValueAtTime(.82,now+.045);
    bodyEnv.gain.linearRampToValueAtTime(1.0,now+.14);
    bodyEnv.gain.setValueAtTime(.94,now+Math.max(.18,dur-.28));
    bodyEnv.gain.exponentialRampToValueAtTime(.0001,now+dur);

    bodyEnv.connect(comp);
    comp.connect(output);
    output.connect(ctx.destination);

    let stopped=false;
    const stop=()=>{
      if(stopped)return;
      stopped=true;
      try{source.stop();}catch(_){ }
      nodes.forEach(n=>{try{n.disconnect();}catch(_){ }});
      unregisterSynthStop('orePulse',stop);
    };
    registerSynthStop('orePulse',stop);

    source.onended=()=>stop();
    source.start(now);
    source.stop(now+dur+.03);
    return stop;
  }

  function setPitchMode(a,rate){
    a.playbackRate=rate;
    try{a.preservesPitch=false;}catch(_){ }
    try{a.mozPreservesPitch=false;}catch(_){ }
    try{a.webkitPreservesPitch=false;}catch(_){ }
  }

  function applyMediaVolume(a){
    const mix=Number(a.dataset.waMix||1);
    const fade=Number(a.dataset.waFade||1);
    a.volume=clamp(masterVolume()*mix*fade,0,1);
  }

  function retireMedia(id,a){
    const set=S.playing.get(id);
    if(set)set.delete(a);
  }

  function stopMedia(id,a){
    if(!a)return;
    try{a.pause();a.currentTime=0;}catch(_){ }
    retireMedia(id,a);
  }

  function fadeMedia(id,a,holdMs,fadeMs){
    const hold=setTimeout(()=>{
      const start=performance.now();
      const tick=()=>{
        if(a.paused){retireMedia(id,a);return;}
        const p=clamp((performance.now()-start)/fadeMs,0,1);
        a.dataset.waFade=String(1-p);
        applyMediaVolume(a);
        if(p<1)requestAnimationFrame(tick);else stopMedia(id,a);
      };
      requestAnimationFrame(tick);
    },holdMs);
    a.dataset.waHoldTimer=String(hold);
  }

  function playAnswer(manual=false){
    const a=new Audio(ANSWER_SAMPLE);
    a.preload='auto';
    a.dataset.waFade='1';
    a.dataset.waMix=String(manual?.78:.54);
    setPitchMode(a,.72);
    applyMediaVolume(a);

    if(!S.playing.has('answer'))S.playing.set('answer',new Set());
    S.playing.get('answer').add(a);

    const cleanup=()=>retireMedia('answer',a);
    a.addEventListener('ended',cleanup,{once:true});
    a.addEventListener('error',cleanup,{once:true});

    const begin=()=>{
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(cleanup);
      fadeMedia('answer',a,manual?4700:5200,1900);
    };
    const delay=manual?0:rand(650,1500);
    const startTimer=setTimeout(begin,delay);

    return ()=>{
      clearTimeout(startTimer);
      const hold=Number(a.dataset.waHoldTimer||0);
      if(hold)clearTimeout(hold);
      stopMedia('answer',a);
    };
  }

  function playSound(id,manual=false){
    return id==='orePulse'?playOre(manual):playAnswer(manual);
  }

  function clearTimer(id){
    const t=S.timers.get(id);
    if(t)clearTimeout(t);
    S.timers.delete(id);
  }

  function stopPlaying(id){
    const media=S.playing.get(id);
    if(media){[...media].forEach(a=>stopMedia(id,a));media.clear();}
    const synth=S.synthStops.get(id);
    if(synth){[...synth].forEach(stop=>stop());synth.clear();}
  }

  function schedule(id,first=false){
    clearTimer(id);
    if(!S.active.has(id))return;
    const delay=first?(id==='answer'?rand(4.5,7.5):rand(2.0,4.2)):gapFor(id);
    const timer=setTimeout(()=>{
      if(!S.active.has(id))return;
      playSound(id,false);
      schedule(id,false);
    },delay*1000);
    S.timers.set(id,timer);
  }

  function setLayer(id,on){
    if(!defs.some(d=>d.id===id))return;
    on=!!on;
    if(on){
      if(S.active.has(id))return;
      if(id==='orePulse')audioContext();
      S.active.add(id);
      S.started.set(id,performance.now());
      schedule(id,true);
    }else{
      S.active.delete(id);
      clearTimer(id);
      stopPlaying(id);
      S.started.delete(id);
    }
    render();
  }

  function trigger(id){
    if(!defs.some(d=>d.id===id))return;
    if(id==='orePulse')audioContext();
    playSound(id,true);
    const b=document.querySelector(`[data-signal-trigger="${id}"]`);
    if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350);}
    if(S.active.has(id))schedule(id,false);
  }

  function startSignal(){setLayer('orePulse',true);setLayer('answer',true);}
  function stopSignal(){defs.forEach(d=>setLayer(d.id,false));}

  function render(){
    document.querySelectorAll('[data-signal-layer]').forEach(btn=>{
      const id=btn.dataset.signalLayer,on=S.active.has(id);
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-pressed',String(on));
      const s=btn.querySelector('.wa-state');if(s)s.textContent=on?'ON':'OFF';
    });
    const live=document.getElementById('waSignalLive');
    if(live){
      const names=defs.filter(d=>S.active.has(d.id)).map(d=>d.label);
      live.textContent=names.length?names.join(' + '):'OFF';
    }
  }

  function bindMaster(){
    const slider=document.getElementById('waVolume');
    if(!slider)return;
    slider.addEventListener('input',()=>{
      S.playing.forEach(set=>set.forEach(a=>{try{applyMediaVolume(a);}catch(_){ }}));
    });
  }

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
    document.getElementById('waStartSignal').addEventListener('click',startSignal);
    document.getElementById('waStopSignal').addEventListener('click',stopSignal);
    bindMaster();render();return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
  window.WardenM17SignalAudio={setLayer,trigger,startSignal,stopSignal};
})();