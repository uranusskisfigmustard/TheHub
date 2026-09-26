(()=>{
'use strict';

const SOURCE_URL='https://opengameart.org/sites/default/files/bilwe.mp3';
const SOURCE_PAGE='https://opengameart.org/content/bilwe';
const SOURCE_LABEL='Bilwe — cinameng / James Gargette — CC0';
const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

const S={active:false,timer:null,playing:new Set(),bound:false};
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function masterVolume(){
  const slider=document.getElementById('waVolume');
  const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
  return clamp(Number.isFinite(v)?v:.48,0,1);
}

function applyVolume(a,fade){
  const f=clamp(Number.isFinite(Number(fade))?Number(fade):1,0,1);
  a.dataset.oreFade=String(f);
  try{a.volume=clamp(masterVolume()*f*.86,0,1);}catch(_){ }
}

function retire(a){S.playing.delete(a);}
function stopAudio(a){
  if(!a)return;
  try{a.pause();}catch(_){ }
  retire(a);
}

function pulse(){
  const a=new Audio(SOURCE_URL);
  a.preload='auto';
  a.loop=false;
  a.crossOrigin='anonymous';
  S.playing.add(a);

  let raf=0,ended=false;
  const fadeIn=rand(650,900);
  const hold=rand(450,800);
  const fadeOut=rand(850,1200);
  const total=fadeIn+hold+fadeOut;
  let started=0;

  const cleanup=()=>{
    if(ended)return;
    ended=true;
    if(raf)cancelAnimationFrame(raf);
    stopAudio(a);
  };

  const animate=()=>{
    if(ended||a.paused)return;
    const t=performance.now()-started;
    let fade=0;
    if(t<fadeIn)fade=t/fadeIn;
    else if(t<fadeIn+hold)fade=1;
    else fade=1-((t-fadeIn-hold)/fadeOut);
    applyVolume(a,clamp(fade,0,1));
    if(t>=total){cleanup();return;}
    raf=requestAnimationFrame(animate);
  };

  const begin=()=>{
    try{
      const duration=Number(a.duration);
      const sampleLen=total/1000;
      if(Number.isFinite(duration)&&duration>sampleLen+.25){
        const maxStart=Math.max(0,duration-sampleLen-.1);
        a.currentTime=rand(0,maxStart);
      }
      a.playbackRate=rand(.97,1.03);
      applyVolume(a,0);
      started=performance.now();
      const p=a.play();
      if(p&&typeof p.then==='function')p.then(()=>{raf=requestAnimationFrame(animate);}).catch(cleanup);
      else raf=requestAnimationFrame(animate);
    }catch(_){cleanup();}
  };

  if(a.readyState>=1)begin();
  else a.addEventListener('loadedmetadata',begin,{once:true});
  a.addEventListener('error',cleanup,{once:true});
  setTimeout(cleanup,total+2500);
  return cleanup;
}

function clearTimer(){if(S.timer)clearTimeout(S.timer);S.timer=null;}
function schedule(first=false){
  clearTimer();
  if(!S.active)return;
  const delay=first?rand(2.5,5.0):rand(8.0,18.0);
  S.timer=setTimeout(()=>{
    if(!S.active)return;
    pulse();
    schedule(false);
  },delay*1000);
}

function setOre(on){
  on=!!on;
  if(on===S.active){render();return;}
  S.active=on;
  if(on)schedule(true);
  else{
    clearTimer();
    [...S.playing].forEach(stopAudio);
    S.playing.clear();
  }
  render();
}

function trigger(){
  pulse();
  if(S.active)schedule(false);
  const b=document.querySelector('[data-signal-trigger="orePulse"]');
  if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350);}
}

function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
function render(){
  const ore=document.querySelector('[data-signal-layer="orePulse"]');
  if(ore){
    ore.classList.toggle('active',S.active);
    ore.setAttribute('aria-pressed',String(S.active));
    setText(ore.querySelector('.wa-state'),S.active?'ON':'OFF');
    setText(ore.querySelector('b'),'ORE SIGNAL');
  }
  setText(document.getElementById('waOreSourceStatus'),'REMOTE // CC0 // AUTO-LOADED');
  setText(document.getElementById('waOreDesc'),'Soft mechanical drone sample — fades in/out; irregular 8–18 s recurrence.');
  const live=document.getElementById('waSignalLive');
  if(live){
    const api=window.WardenM17SignalAudio;
    const names=[];
    if(S.active)names.push('ORE SIGNAL');
    if(api&&api.isActive&&api.isActive('answer'))names.push('ANSWERING PULSE');
    setText(live,names.length?names.join(' + '):'OFF');
  }
}

function intercept(el,handler){
  if(!el)return;
  el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();handler();},true);
}

function patch(){
  const stage=document.getElementById('waSignalStage');
  const api=window.WardenM17SignalAudio;
  if(!stage||!api)return false;
  if(S.bound){render();return true;}
  S.bound=true;

  try{api.setLayer('orePulse',false);}catch(_){ }

  document.getElementById('waLoadOreFile')?.remove();
  document.getElementById('waClearOreFile')?.remove();
  document.getElementById('waOreFileInput')?.remove();

  const row=document.getElementById('waOreSourceStatus')?.parentElement;
  if(row&&!document.getElementById('waOreRemoteSource')){
    const source=document.createElement('button');
    source.className='wa-btn';
    source.id='waOreRemoteSource';
    source.type='button';
    source.textContent='OPEN ORE SOURCE';
    source.addEventListener('click',()=>window.open(SOURCE_PAGE,'_blank','noopener'));
    row.appendChild(source);
  }

  intercept(stage.querySelector('[data-signal-layer="orePulse"]'),()=>setOre(!S.active));
  intercept(stage.querySelector('[data-signal-trigger="orePulse"]'),trigger);
  intercept(document.getElementById('waStartSignal'),()=>{
    setOre(true);
    try{api.setLayer('answer',true);}catch(_){ }
    render();
  });
  intercept(document.getElementById('waStopSignal'),()=>{
    setOre(false);
    try{api.setLayer('answer',false);}catch(_){ }
    render();
  });

  const slider=document.getElementById('waVolume');
  if(slider)slider.addEventListener('input',()=>S.playing.forEach(a=>applyVolume(a,Number(a.dataset.oreFade||1))));

  const live=document.getElementById('waSignalLive');
  if(live){
    let pending=false;
    const obs=new MutationObserver(()=>{
      if(pending)return;
      pending=true;
      queueMicrotask(()=>{pending=false;render();});
    });
    obs.observe(live,{childList:true,characterData:true,subtree:true});
  }

  stage.dataset.oreSource=SOURCE_LABEL;
  render();
  return true;
}

window.addEventListener('beforeunload',()=>{clearTimer();[...S.playing].forEach(stopAudio);});
let tries=0;const timer=setInterval(()=>{tries++;if(patch()||tries>120)clearInterval(timer);},75);
})();