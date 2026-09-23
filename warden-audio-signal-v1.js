(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  // ORE PULSE source:
  // Xeno-canto XC132934 — Southern Cassowary — recorded by Marc Anderson.
  // Source page: https://xeno-canto.org/132934
  // Audio is referenced from Xeno-canto rather than bundled into this repository.
  const ORE_SAMPLE='https://www.xeno-canto.org/sounds/uploaded/EHGWCIGILC/XC132934-cassowary.mp3';

  // ANSWERING PULSE source:
  // OpenGameArt — "CC0 Deep Monster Roar" by trazzz123 — CC0 1.0.
  const ANSWER_SAMPLE='https://opengameart.org/sites/default/files/monster_roar.wav';

  const defs=[
    {id:'orePulse',label:'ORE PULSE',desc:'Cleaned real Southern Cassowary boom — low, bodily beacon pulse'},
    {id:'answer',label:'ANSWERING PULSE',desc:'Distant recorded deep-creature reply — slower, larger, and nonlocal'}
  ];

  const S={active:new Set(),timers:new Map(),playing:new Map(),started:new Map()};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  // Cassowary cleanup v2. The first pass still exposed too much of the field recording.
  // This version deliberately narrows the useful band to the cassowary's low boom:
  // 32 Hz high-pass, harmonic support near 72/118 Hz, and two 190 Hz low-passes.
  // A light compressor restores body after the steeper filtering. If cross-origin Web
  // Audio filtering fails, playback falls back to the raw recording rather than silence.
  const F={ctx:null,nodes:new Map(),disabled:false};

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

  function setPitchMode(a,rate){
    a.playbackRate=rate;
    try{a.preservesPitch=false;}catch(_){ }
    try{a.mozPreservesPitch=false;}catch(_){ }
    try{a.webkitPreservesPitch=false;}catch(_){ }
  }

  function applyVolume(a){
    const mix=Number(a.dataset.waMix||1);
    const fade=Number(a.dataset.waFade||1);
    a.volume=clamp(masterVolume()*mix*fade,0,1);
  }

  function primeOreFilter(){
    if(F.disabled)return null;
    try{
      if(!F.ctx){
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx){F.disabled=true;return null;}
        F.ctx=new Ctx();
      }
      if(F.ctx.state==='suspended')F.ctx.resume().catch(()=>{});
      return F.ctx;
    }catch(_){F.disabled=true;return null;}
  }

  function wireOreFilter(a){
    const ctx=primeOreFilter();
    if(!ctx)return false;
    try{
      const src=ctx.createMediaElementSource(a);

      const hp=ctx.createBiquadFilter();
      hp.type='highpass';hp.frequency.value=32;hp.Q.value=.72;

      const boom1=ctx.createBiquadFilter();
      boom1.type='peaking';boom1.frequency.value=72;boom1.Q.value=1.15;boom1.gain.value=4.2;

      const boom2=ctx.createBiquadFilter();
      boom2.type='peaking';boom2.frequency.value=118;boom2.Q.value=1.0;boom2.gain.value=2.8;

      const lp1=ctx.createBiquadFilter();
      lp1.type='lowpass';lp1.frequency.value=190;lp1.Q.value=.72;
      const lp2=ctx.createBiquadFilter();
      lp2.type='lowpass';lp2.frequency.value=190;lp2.Q.value=.72;

      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-27;
      comp.knee.value=12;
      comp.ratio.value=2.4;
      comp.attack.value=.008;
      comp.release.value=.18;

      const makeup=ctx.createGain();
      makeup.gain.value=1.25;

      src.connect(hp);
      hp.connect(boom1);
      boom1.connect(boom2);
      boom2.connect(lp1);
      lp1.connect(lp2);
      lp2.connect(comp);
      comp.connect(makeup);
      makeup.connect(ctx.destination);
      F.nodes.set(a,[src,hp,boom1,boom2,lp1,lp2,comp,makeup]);
      return true;
    }catch(_){
      F.disabled=true;
      return false;
    }
  }

  function releaseFilter(a){
    const nodes=F.nodes.get(a);
    if(nodes){nodes.forEach(n=>{try{n.disconnect();}catch(_){ }});F.nodes.delete(a);}
  }

  function retire(id,a){
    const set=S.playing.get(id);
    if(set)set.delete(a);
    releaseFilter(a);
  }

  function stopTrack(id,a){
    if(!a)return;
    try{a.pause();a.currentTime=0;}catch(_){ }
    retire(id,a);
  }

  function fadeTrack(id,a,holdMs,fadeMs){
    const hold=setTimeout(()=>{
      const start=performance.now();
      const tick=()=>{
        if(a.paused){retire(id,a);return;}
        const p=clamp((performance.now()-start)/fadeMs,0,1);
        a.dataset.waFade=String(1-p);
        applyVolume(a);
        if(p<1)requestAnimationFrame(tick);else stopTrack(id,a);
      };
      requestAnimationFrame(tick);
    },holdMs);
    a.dataset.waHoldTimer=String(hold);
  }

  function playOreRawFallback(manual=false){
    const a=new Audio(ORE_SAMPLE);
    a.preload='auto';
    a.dataset.waFade='1';
    a.dataset.waMix=String(manual?1.0:.76);
    setPitchMode(a,1.0);
    applyVolume(a);
    if(!S.playing.has('orePulse'))S.playing.set('orePulse',new Set());
    S.playing.get('orePulse').add(a);
    const cleanup=()=>retire('orePulse',a);
    a.addEventListener('ended',cleanup,{once:true});
    a.addEventListener('error',cleanup,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(cleanup);
    fadeTrack('orePulse',a,manual?3600:2500,650);
  }

  function playRecorded(id,manual=false){
    const isAnswer=id==='answer';
    const a=new Audio();
    if(!isAnswer&&!F.disabled)a.crossOrigin='anonymous';
    a.src=isAnswer?ANSWER_SAMPLE:ORE_SAMPLE;
    a.preload='auto';
    a.dataset.waFade='1';
    a.dataset.waMix=String(isAnswer?(manual?.78:.54):(manual?1.0:.76));

    // Keep the cassowary at natural pitch. The reply remains slowed so it reads as
    // something much larger and farther away.
    setPitchMode(a,isAnswer?.72:1.0);
    applyVolume(a);

    if(!S.playing.has(id))S.playing.set(id,new Set());
    S.playing.get(id).add(a);

    let fallbackUsed=false;
    const cleanup=()=>retire(id,a);
    a.addEventListener('ended',cleanup,{once:true});
    a.addEventListener('error',()=>{
      cleanup();
      if(!isAnswer&&!fallbackUsed){
        fallbackUsed=true;
        F.disabled=true;
        playOreRawFallback(manual);
      }
    },{once:true});

    const begin=()=>{
      if(!isAnswer&&!F.disabled)wireOreFilter(a);
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(()=>{
        cleanup();
        if(!isAnswer&&!fallbackUsed){fallbackUsed=true;F.disabled=true;playOreRawFallback(manual);}
      });
      if(isAnswer)fadeTrack(id,a,manual?4700:5200,1900);
      else fadeTrack(id,a,manual?3600:2500,650);
    };

    // Automatic answer is delayed so it reads as response, not simultaneous sound design.
    const delay=(!manual&&isAnswer)?rand(650,1500):0;
    const startTimer=setTimeout(begin,delay);

    const stop=()=>{
      clearTimeout(startTimer);
      const hold=Number(a.dataset.waHoldTimer||0);
      if(hold)clearTimeout(hold);
      stopTrack(id,a);
    };
    return stop;
  }

  function clearTimer(id){
    const t=S.timers.get(id);
    if(t)clearTimeout(t);
    S.timers.delete(id);
  }

  function stopPlaying(id){
    const set=S.playing.get(id);
    if(!set)return;
    [...set].forEach(a=>stopTrack(id,a));
    set.clear();
  }

  function schedule(id,first=false){
    clearTimer(id);
    if(!S.active.has(id))return;
    const delay=first?(id==='answer'?rand(4.5,7.5):rand(2.0,4.2)):gapFor(id);
    const timer=setTimeout(()=>{
      if(!S.active.has(id))return;
      playRecorded(id,false);
      schedule(id,false);
    },delay*1000);
    S.timers.set(id,timer);
  }

  function setLayer(id,on){
    if(!defs.some(d=>d.id===id))return;
    on=!!on;
    if(on){
      if(S.active.has(id))return;
      if(id==='orePulse')primeOreFilter();
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
    if(id==='orePulse')primeOreFilter();
    playRecorded(id,true);
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
    if(live){const names=defs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'OFF';}
  }

  function bindMaster(){
    const slider=document.getElementById('waVolume');
    if(!slider)return;
    slider.addEventListener('input',()=>{
      S.playing.forEach(set=>set.forEach(a=>{try{applyVolume(a);}catch(_){ }}));
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