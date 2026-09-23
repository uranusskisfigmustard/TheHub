(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
  let blobUrl=null;
  let active=null;
  let prepPromise=null;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  async function prepareSoftBlob(){
    if(blobUrl)return blobUrl;
    if(prepPromise)return prepPromise;

    prepPromise=(async()=>{
      const token=window.__WARDEN_AUDIO_CACHE||Date.now().toString(36);
      const response=await fetch('warden-audio-ore-audition-v1.js?fresh='+encodeURIComponent(token),{cache:'no-store'});
      if(!response.ok)throw new Error('Could not load embedded A asset source');
      const text=await response.text();
      const m=text.match(/const\s+SOFT_SAMPLE='data:audio\/mpeg;base64,([^']+)'/);
      if(!m)throw new Error('Could not locate embedded A asset');

      const binary=atob(m[1]);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      const blob=new Blob([bytes],{type:'audio/mpeg'});
      blobUrl=URL.createObjectURL(blob);
      return blobUrl;
    })();

    try{return await prepPromise;}
    finally{prepPromise=null;}
  }

  function stop(){
    if(active){
      try{active.pause();active.currentTime=0;}catch(_){ }
      active=null;
    }
  }

  async function playSoft(){
    try{
      if(window.WardenOreAudition&&typeof window.WardenOreAudition.stopAll==='function'){
        window.WardenOreAudition.stopAll();
      }
      stop();
      const url=await prepareSoftBlob();
      const a=new Audio(url);
      a.preload='auto';
      a.volume=masterVolume();
      a.playbackRate=1.0;
      active=a;

      const cleanup=()=>{if(active===a)active=null;};
      a.addEventListener('ended',cleanup,{once:true});
      a.addEventListener('error',cleanup,{once:true});
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(err=>{
        cleanup();
        console.error('ORE A playback failed',err);
      });

      const b=document.querySelector('[data-ore-audition="soft"]');
      if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),400);}
    }catch(err){
      console.error('ORE A blob preparation failed',err);
      const b=document.querySelector('[data-ore-audition="soft"]');
      if(b){
        const old=b.textContent;
        b.textContent='LOAD ERROR';
        setTimeout(()=>{b.textContent=old;},1400);
      }
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest?e.target.closest('[data-ore-audition="soft"]'):null;
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    playSoft();
  },true);

  document.addEventListener('input',e=>{
    if(!active)return;
    if(e.target&&e.target.id==='waVolume')active.volume=masterVolume();
  });

  // Prepare the Blob as soon as the page is idle so the first click can start immediately.
  if('requestIdleCallback' in window)requestIdleCallback(()=>prepareSoftBlob().catch(()=>{}));
  else setTimeout(()=>prepareSoftBlob().catch(()=>{}),300);

  window.WardenOreDeliveryFix={playSoft,stop,prepareSoftBlob};
})();
