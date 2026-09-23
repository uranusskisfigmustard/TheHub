(()=>{
  'use strict';

  // REAL RECORDED SOURCE — replaces the procedural ROCK / MATERIAL simulation.
  // Source: Freesound #567249, "Bricks/Stones/Rocks/Gravel Falling"
  // Creator: iwanPlays
  // Source page: https://freesound.org/people/iwanPlays/sounds/567249/
  // License: CC0 1.0 / public domain.
  // Stable raw mirror used for browser playback:
  // https://github.com/ShaleGame/ShaleGame/blob/main/Assets/Sounds/567249__iwanplays__bricksstonesrocksgravel-falling.wav
  const SAMPLE_URL='https://raw.githubusercontent.com/ShaleGame/ShaleGame/main/Assets/Sounds/567249__iwanplays__bricksstonesrocksgravel-falling.wav';
  const LABEL='ROCK / MATERIAL';
  const FIRST_MIN=7000, FIRST_MAX=16000;
  const GAP_MIN=22000, GAP_MAX=48000;

  let active=false;
  let timer=null;
  let installed=false;
  const playing=new Set();
  let baseSetLayer=null,baseTrigger=null,baseStartM17=null,baseStopAll=null;

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem('mothership_warden_audio_volume_v1')||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function stopPlaying(){
    playing.forEach(a=>{
      try{a.pause();a.currentTime=0;}catch(_){ }
    });
    playing.clear();
  }

  function playRecording(manual=false){
    const a=new Audio(SAMPLE_URL);
    a.preload='auto';
    a.volume=clamp(masterVolume()*.95,0,1);
    playing.add(a);
    const retire=()=>playing.delete(a);
    a.addEventListener('ended',retire,{once:true});
    a.addEventListener('error',retire,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(()=>retire());

    const btn=document.querySelector('[data-audio-trigger="rocks"]');
    if(manual&&btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);}
    return a;
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
      playRecording(false);
      scheduleNext(false);
    },delay);
  }

  function syncButton(){
    const btn=document.querySelector('[data-audio-layer="rocks"]');
    if(!btn)return;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
    const state=btn.querySelector('.wa-state');
    if(state)state.textContent=active?'ON':'OFF';
  }

  function syncLive(){
    const live=document.getElementById('waLive');
    if(!live)return;
    let parts=live.textContent.split(' + ').map(x=>x.trim()).filter(Boolean);
    parts=parts.filter(x=>x!==LABEL && x!=='SILENT');
    if(active)parts.push(LABEL);
    const next=parts.length?parts.join(' + '):'SILENT';
    if(live.textContent!==next)live.textContent=next;
  }

  function setRocks(on){
    on=!!on;
    if(active===on){syncButton();syncLive();return;}
    active=on;
    clearSchedule();
    if(on){
      // Preserve the existing intermittent behavior: enabling the layer arms it,
      // rather than firing immediately. Manual TRIGGER remains available.
      scheduleNext(true);
    }else{
      stopPlaying();
    }
    syncButton();
    syncLive();
  }

  function triggerRocks(){
    playRecording(true);
    // Reset the automatic clock to avoid an immediate duplicate after a manual beat.
    if(active)scheduleNext(false);
  }

  function startM17(){
    baseStartM17&&baseStartM17();
    // The wrapped START M-17 may have armed the old procedural rock layer.
    // Turn that one off, then arm the recorded replacement.
    try{baseSetLayer&&baseSetLayer('rocks',false);}catch(_){ }
    setRocks(true);
  }

  function stopAll(){
    baseStopAll&&baseStopAll();
    setRocks(false);
  }

  function replaceButton(oldBtn,listener){
    const fresh=oldBtn.cloneNode(true);
    oldBtn.replaceWith(fresh);
    fresh.addEventListener('click',listener);
    return fresh;
  }

  function install(){
    if(installed)return true;
    const api=window.WardenM17Audio;
    const rockToggle=document.querySelector('[data-audio-layer="rocks"]');
    const rockTrigger=document.querySelector('[data-audio-trigger="rocks"]');
    const startBtn=document.getElementById('waStartM17');
    const stopBtn=document.getElementById('waStopAll');
    if(!api||!rockToggle||!rockTrigger||!startBtn||!stopBtn)return false;

    baseSetLayer=api.setLayer.bind(api);
    baseTrigger=api.trigger.bind(api);
    baseStartM17=api.startM17.bind(api);
    baseStopAll=api.stopAll.bind(api);

    // Ensure the procedural ROCK / MATERIAL layer is not running before takeover.
    try{baseSetLayer('rocks',false);}catch(_){ }

    const desc=rockToggle.querySelector('small');
    if(desc)desc.textContent='Real rocks, stones, and gravel falling and rolling (CC0 recording)';

    replaceButton(rockToggle,()=>setRocks(!active));
    replaceButton(rockTrigger,triggerRocks);
    replaceButton(startBtn,startM17);
    replaceButton(stopBtn,stopAll);

    api.setLayer=(id,on)=>id==='rocks'?setRocks(on):baseSetLayer(id,on);
    api.trigger=id=>id==='rocks'?triggerRocks():baseTrigger(id);
    api.startM17=startM17;
    api.stopAll=stopAll;

    const live=document.getElementById('waLive');
    if(live){
      const obs=new MutationObserver(()=>queueMicrotask(syncLive));
      obs.observe(live,{childList:true,characterData:true,subtree:true});
    }

    const slider=document.getElementById('waVolume');
    if(slider){
      slider.addEventListener('input',()=>{
        const v=clamp(masterVolume()*.95,0,1);
        playing.forEach(a=>{try{a.volume=v;}catch(_){ }});
      });
    }

    installed=true;
    syncButton();
    syncLive();
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{
    tries++;
    if(install()||tries>120)clearInterval(wait);
  },75);
})();
