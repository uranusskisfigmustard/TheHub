(()=>{
  'use strict';

  // REAL RECORDED SOURCE — replaces the procedural fluorescent simulation.
  // Source: Freesound #777053, "Flickering Fluorescent Light with Background Hum"
  // Creator/source page: https://freesound.org/people/kentspublicdomain/sounds/777053/
  // License: CC0 1.0 / public domain.
  // This compact MP3 mirror preserves the same source/license provenance:
  // https://github.com/yerdaulet-damir/liminal/blob/main/assets-manifest.json
  const SAMPLE_URL='https://raw.githubusercontent.com/yerdaulet-damir/liminal/main/client/public/audio/hum.mp3';
  const LABEL='FLUORESCENT FLICKER';
  const NON_LIGHT_IDS=['room','machinery','rocks','metal','relays'];

  let active=false;
  let timer=null;
  let installed=false;
  const playing=new Set();
  let baseSetLayer=null,baseTrigger=null;

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
    a.volume=clamp(masterVolume()*.92,0,1);
    playing.add(a);
    const retire=()=>playing.delete(a);
    a.addEventListener('ended',retire,{once:true});
    a.addEventListener('error',retire,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(()=>retire());

    const btn=document.querySelector('[data-audio-trigger="light"]');
    if(manual&&btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);}
    return a;
  }

  function clearSchedule(){
    if(timer)clearTimeout(timer);
    timer=null;
  }

  function scheduleNext(){
    clearSchedule();
    if(!active)return;
    // The recording is ~9 sec. Leave enough dead air that the fixture reads as intermittent,
    // not as a looping ambience bed.
    timer=setTimeout(()=>{
      if(!active)return;
      playRecording(false);
      scheduleNext();
    },rand(18000,36000));
  }

  function syncButton(){
    const btn=document.querySelector('[data-audio-layer="light"]');
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
    parts=parts.filter(x=>x!==LABEL);
    if(active)parts.push(LABEL);
    const next=parts.length?parts.join(' + '):'SILENT';
    if(live.textContent!==next)live.textContent=next;
  }

  function setLight(on){
    on=!!on;
    if(active===on){syncButton();syncLive();return;}
    active=on;
    clearSchedule();
    if(on){
      // Immediate first playback comes directly from the user click / START M-17 gesture,
      // which also satisfies browser media-unlock rules. Later events are automatic.
      playRecording(false);
      scheduleNext();
    }else{
      stopPlaying();
    }
    syncButton();
    syncLive();
  }

  function triggerLight(){
    playRecording(true);
  }

  function startM17(){
    NON_LIGHT_IDS.forEach(id=>baseSetLayer&&baseSetLayer(id,true));
    setLight(true);
  }

  function stopAll(){
    NON_LIGHT_IDS.forEach(id=>baseSetLayer&&baseSetLayer(id,false));
    setLight(false);
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
    const lightToggle=document.querySelector('[data-audio-layer="light"]');
    const lightTrigger=document.querySelector('[data-audio-trigger="light"]');
    const startBtn=document.getElementById('waStartM17');
    const stopBtn=document.getElementById('waStopAll');
    if(!api||!lightToggle||!lightTrigger||!startBtn||!stopBtn)return false;

    baseSetLayer=api.setLayer.bind(api);
    baseTrigger=api.trigger.bind(api);

    // Ensure the old procedural light layer is not running before we take over its controls.
    try{baseSetLayer('light',false);}catch(_){ }

    const label=lightToggle.querySelector('b');
    const desc=lightToggle.querySelector('small');
    if(label)label.textContent=LABEL;
    if(desc)desc.textContent='Real failing fluorescent fixture recording — irregular flicker, hum, and restrike (CC0)';

    replaceButton(lightToggle,()=>setLight(!active));
    replaceButton(lightTrigger,triggerLight);
    replaceButton(startBtn,startM17);
    replaceButton(stopBtn,stopAll);

    // Keep the public API coherent for any later code that uses it.
    api.setLayer=(id,on)=>id==='light'?setLight(on):baseSetLayer(id,on);
    api.trigger=id=>id==='light'?triggerLight():baseTrigger(id);
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
        const v=clamp(masterVolume()*.92,0,1);
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
