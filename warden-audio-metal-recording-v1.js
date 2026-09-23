(()=>{
  'use strict';

  // REAL RECORDED SCRAP-METAL SOURCE — replaces the clean struck-metal set.
  // Infra Arcana derivative: sfx_door_break_gate.ogg
  // Primary source: Freesound #587443, "Scrap metal dropping / crashing"
  // Creator: SamsterBirdies — CC0 1.0.
  // Secondary source in the derivative: Freesound #449992, "whoosh_short_low.wav"
  // Creator: DJT4NN3R — CC0 1.0.
  // Infra Arcana changes: cut most sounds, mix, reverb.
  // Attribution/license record: ports/infra_arcana/infra_arcana/LICENSE-AUDIO.txt
  const SAMPLE_URL='https://raw.githubusercontent.com/PortsMaster/PortMaster-New/28383a4fca0553787c8a14c40af92425366136ca/ports/infra_arcana/infra_arcana/audio/sfx_door_break_gate.ogg';
  const LABEL='METAL / CHUTE';
  const FIRST_MIN=10000, FIRST_MAX=24000;
  const GAP_MIN=22000, GAP_MAX=52000;

  let active=false;
  let timer=null;
  let installed=false;
  const playing=new Set();
  let baseSetLayer=null,baseTrigger=null,baseStartM17=null,baseStopAll=null;
  let statusObserver=null;

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem('mothership_warden_audio_volume_v1')||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function setAudioVolume(a){
    const mix=Number(a.dataset.waMix||1);
    a.volume=clamp(masterVolume()*mix,0,1);
  }

  function playChuteEvent(manual=false){
    const a=new Audio(SAMPLE_URL);
    a.preload='auto';
    a.dataset.waMix='1';
    setAudioVolume(a);
    playing.add(a);
    const retire=()=>playing.delete(a);
    a.addEventListener('ended',retire,{once:true});
    a.addEventListener('error',retire,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(retire);

    const btn=document.querySelector('[data-audio-trigger="metal"]');
    if(manual&&btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);}
  }

  function stopPlaying(){
    playing.forEach(a=>{
      try{a.pause();a.currentTime=0;}catch(_){ }
    });
    playing.clear();
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
      // Arming the layer does not fire immediately; manual TRIGGER remains available.
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

  // One authoritative renderer for ACTIVE status. Replacing #waLive detaches
  // legacy per-layer observers and avoids observer feedback when layers stack.
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
    if(desc)desc.textContent='Bulk scrap metal dropping and crashing — heavy impact, scrape, and rattle (CC0 recording)';

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