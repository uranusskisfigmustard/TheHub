(()=>{
  'use strict';

  // REAL RECORDED SOURCE SET — replaces the procedural METAL / CHUTE simulation.
  // Source pack: Kenney Impact Sounds — heavy metal impacts.
  // Author: Kenney.nl
  // License: CC0 1.0 / public domain.
  // License record / raw mirrors preserved in Tabletop Club:
  // https://github.com/drwhut/tabletop-club/blob/a4fb379b0f4af1f066bf378bd652d8be90d64e32/game/LICENSES.tres
  const ROOT='https://raw.githubusercontent.com/drwhut/tabletop-club/a4fb379b0f4af1f066bf378bd652d8be90d64e32/game/Sounds/MetalHeavy/';
  const SAMPLES=[0,1,2,3,4].map(n=>ROOT+`impactMetal_heavy_00${n}.ogg`);
  const LABEL='METAL / CHUTE';
  const FIRST_MIN=10000, FIRST_MAX=24000;
  const GAP_MIN=22000, GAP_MAX=52000;

  let active=false;
  let timer=null;
  let installed=false;
  const playing=new Set();
  const secondaryTimers=new Set();
  let baseSetLayer=null,baseTrigger=null,baseStartM17=null,baseStopAll=null;
  let statusObserver=null;

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const pick=()=>SAMPLES[Math.floor(Math.random()*SAMPLES.length)];

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem('mothership_warden_audio_volume_v1')||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function setAudioVolume(a){
    const mix=Number(a.dataset.waMix||1);
    a.volume=clamp(masterVolume()*mix,0,1);
  }

  function playOne(url,mix=1){
    const a=new Audio(url);
    a.preload='auto';
    a.dataset.waMix=String(mix);
    setAudioVolume(a);
    playing.add(a);
    const retire=()=>playing.delete(a);
    a.addEventListener('ended',retire,{once:true});
    a.addEventListener('error',retire,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(retire);
    return a;
  }

  function stopPlaying(){
    secondaryTimers.forEach(t=>clearTimeout(t));
    secondaryTimers.clear();
    playing.forEach(a=>{
      try{a.pause();a.currentTime=0;}catch(_){ }
    });
    playing.clear();
  }

  function playChuteEvent(manual=false){
    const first=pick();
    playOne(first,.96);

    // Most events are one substantial steel strike. Some get a quieter follow-up
    // to suggest material bouncing/settling farther down the chute.
    if(Math.random()<.58){
      const delay=rand(130,360);
      const t=setTimeout(()=>{
        secondaryTimers.delete(t);
        if(!active && !manual)return;
        let second=pick();
        if(second===first) second=SAMPLES[(SAMPLES.indexOf(first)+1+Math.floor(Math.random()*4))%SAMPLES.length];
        playOne(second,rand(.32,.48));
      },delay);
      secondaryTimers.add(t);
    }

    const btn=document.querySelector('[data-audio-trigger="metal"]');
    if(manual&&btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);}
  }

  function clearSchedule(){
    if(timer)clearTimeout(timer);
    timer=null;
  }

  function scheduleNext(first=false){
    clearSchedule();
    if(!active)return;
    const delay=first?rand(FIRST_MIN,FIRST_MAX):rand(GAP_MIN,GAP_MAX);
    timer=setTimeout(()=>{
      if(!active)return;
      playChuteEvent(false);
      scheduleNext(false);
    },delay);
  }

  function syncButton(){
    const btn=document.querySelector('[data-audio-layer="metal"]');
    if(!btn)return;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
    const state=btn.querySelector('.wa-state');
    if(state)state.textContent=active?'ON':'OFF';
  }

  function setMetal(on){
    on=!!on;
    if(active===on){syncButton();return;}
    active=on;
    clearSchedule();
    if(on){
      // Preserve existing behavior: enabling arms the intermittent layer.
      scheduleNext(true);
    }else{
      stopPlaying();
    }
    syncButton();
  }

  function triggerMetal(){
    playChuteEvent(true);
    if(active)scheduleNext(false);
  }

  function startM17(){
    baseStartM17&&baseStartM17();
    // START M-17 may briefly arm the old procedural layer. Disable it and
    // substitute the recorded one without changing the other wrapped layers.
    try{baseSetLayer&&baseSetLayer('metal',false);}catch(_){ }
    setMetal(true);
  }

  function stopAll(){
    baseStopAll&&baseStopAll();
    setMetal(false);
  }

  function replaceButton(oldBtn,listener){
    const fresh=oldBtn.cloneNode(true);
    oldBtn.replaceWith(fresh);
    fresh.addEventListener('click',listener);
    return fresh;
  }

  // Earlier recorded-layer patches each watched the ACTIVE text independently.
  // Replace that text node once here to detach those old observers, then use one
  // authoritative status renderer driven by the actual toggle buttons. This
  // prevents observer-order feedback loops when several recorded layers are ON.
  function installStatusAuthority(){
    const oldLive=document.getElementById('waLive');
    const dock=document.getElementById('wardenAudioDock');
    if(!oldLive||!dock)return;
    const live=oldLive.cloneNode(true);
    oldLive.replaceWith(live);

    const sync=()=>{
      const names=[];
      dock.querySelectorAll('[data-audio-layer]').forEach(btn=>{
        if(btn.getAttribute('aria-pressed')!=='true')return;
        const label=btn.querySelector('b');
        if(label&&label.textContent.trim())names.push(label.textContent.trim());
      });
      const next=names.length?names.join(' + '):'SILENT';
      if(live.textContent!==next)live.textContent=next;
    };

    if(statusObserver)statusObserver.disconnect();
    statusObserver=new MutationObserver(()=>queueMicrotask(sync));
    statusObserver.observe(dock,{subtree:true,attributes:true,attributeFilter:['aria-pressed'],childList:true,characterData:true});
    sync();
  }

  function install(){
    if(installed)return true;
    const api=window.WardenM17Audio;
    const metalToggle=document.querySelector('[data-audio-layer="metal"]');
    const metalTrigger=document.querySelector('[data-audio-trigger="metal"]');
    const startBtn=document.getElementById('waStartM17');
    const stopBtn=document.getElementById('waStopAll');
    if(!api||!metalToggle||!metalTrigger||!startBtn||!stopBtn)return false;

    baseSetLayer=api.setLayer.bind(api);
    baseTrigger=api.trigger.bind(api);
    baseStartM17=api.startM17.bind(api);
    baseStopAll=api.stopAll.bind(api);

    try{baseSetLayer('metal',false);}catch(_){ }

    const desc=metalToggle.querySelector('small');
    if(desc)desc.textContent='Real heavy steel impacts with occasional secondary chute settling (CC0 recordings)';

    replaceButton(metalToggle,()=>setMetal(!active));
    replaceButton(metalTrigger,triggerMetal);
    replaceButton(startBtn,startM17);
    replaceButton(stopBtn,stopAll);

    api.setLayer=(id,on)=>id==='metal'?setMetal(on):baseSetLayer(id,on);
    api.trigger=id=>id==='metal'?triggerMetal():baseTrigger(id);
    api.startM17=startM17;
    api.stopAll=stopAll;

    const slider=document.getElementById('waVolume');
    if(slider){
      slider.addEventListener('input',()=>playing.forEach(a=>{try{setAudioVolume(a);}catch(_){ }}));
    }

    installed=true;
    syncButton();
    installStatusAuthority();
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{
    tries++;
    if(install()||tries>120)clearInterval(wait);
  },75);
})();
