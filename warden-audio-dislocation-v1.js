(()=>{
  'use strict';

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;
  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  const defs=[
    {id:'depth',label:'DEPTH STRETCH',mode:'continuous',desc:'Low smeared room wash; space feels farther away than it should'},
    {id:'grit',label:'SIDEWAYS GRIT',mode:'intermittent',desc:'Dry granular movement sliding laterally through the room',first:[7,16],gap:[18,38]},
    {id:'wrongEcho',label:'WRONG ECHO',mode:'intermittent',desc:'Industrial transient with a reversed/pre-echo acoustic order',first:[12,24],gap:[26,52]}
  ];

  const S={ctx:null,master:null,compressor:null,noise:null,active:new Set(),continuous:new Map(),timers:new Map(),eventStops:new Map(),volume:0.48};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const now=()=>S.ctx?S.ctx.currentTime:0;

  function getVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||0.48);
    return Math.max(0,Math.min(1,Number.isFinite(v)?v:0.48));
  }

  function makeNoise(seconds=10){
    const len=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(1,len,S.ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      brown=(brown+0.016*w)/1.016;
      d[i]=Math.max(-1,Math.min(1,w*0.56+brown*2.4));
    }
    return b;
  }

  function makeImpulse(seconds=4.5,decay=3.2){
    const len=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(2,len,S.ctx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const d=b.getChannelData(ch);
      for(let i=0;i<len;i++){
        const x=i/len;
        const env=Math.pow(1-x,decay);
        const sparse=(Math.random()<0.12?1:0.28);
        d[i]=(Math.random()*2-1)*env*sparse;
      }
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-22;
      S.compressor.knee.value=18;
      S.compressor.ratio.value=3;
      S.compressor.attack.value=.008;
      S.compressor.release.value=.42;
      S.volume=getVolume();
      S.master.gain.value=S.volume;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoise(10);
    }
    if(S.ctx.state==='suspended')S.ctx.resume();
    S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.03);
    return S.ctx;
  }

  function startDepth(){
    const ctx=ensureAudio(),group=ctx.createGain();
    group.gain.value=.72;group.connect(S.master);

    const dry=ctx.createBufferSource();dry.buffer=S.noise;dry.loop=true;
    const dryLP=ctx.createBiquadFilter();dryLP.type='lowpass';dryLP.frequency.value=720;dryLP.Q.value=.35;
    const dryHP=ctx.createBiquadFilter();dryHP.type='highpass';dryHP.frequency.value=55;
    const dryG=ctx.createGain();dryG.gain.value=.010;
    dry.connect(dryHP).connect(dryLP).connect(dryG).connect(group);

    const wet=ctx.createBufferSource();wet.buffer=S.noise;wet.loop=true;
    const wetBP=ctx.createBiquadFilter();wetBP.type='bandpass';wetBP.frequency.value=310;wetBP.Q.value=.45;
    const conv=ctx.createConvolver();conv.buffer=makeImpulse(5.2,2.7);
    const wetG=ctx.createGain();wetG.gain.value=.016;
    const delayL=ctx.createDelay(1.2),delayR=ctx.createDelay(1.2);delayL.delayTime.value=.19;delayR.delayTime.value=.47;
    const split=ctx.createChannelSplitter(2),merge=ctx.createChannelMerger(2);
    wet.connect(wetBP).connect(conv).connect(wetG).connect(split);
    split.connect(delayL,0);split.connect(delayR,0);delayL.connect(merge,0,0);delayR.connect(merge,0,1);merge.connect(group);

    const low=ctx.createBufferSource();low.buffer=S.noise;low.loop=true;
    const lowLP=ctx.createBiquadFilter();lowLP.type='lowpass';lowLP.frequency.value=105;
    const lowG=ctx.createGain();lowG.gain.value=.012;
    low.connect(lowLP).connect(lowG).connect(group);

    dry.start();wet.start();low.start();
    return ()=>{[dry,wet,low].forEach(n=>{try{n.stop();}catch(_){}});try{group.disconnect();}catch(_){}};
  }

  function fireGrit(){
    const ctx=ensureAudio(),start=now()+.02,total=rand(2.0,4.2),nodes=[];
    const group=ctx.createGain();group.gain.value=.9;group.connect(S.master);
    const dir=Math.random()<.5?[-.95,.95]:[.95,-.95];
    const bursts=8+Math.floor(Math.random()*10);

    for(let i=0;i<bursts;i++){
      const t=start+(i/bursts)*total+rand(-.04,.05),dur=rand(.07,.22);
      const src=ctx.createBufferSource();src.buffer=S.noise;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=rand(650,1200);
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=rand(2400,4200);
      const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(rand(.010,.026),t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      if(ctx.createStereoPanner){
        const p=ctx.createStereoPanner();
        const pos=dir[0]+(dir[1]-dir[0])*(i/Math.max(1,bursts-1));
        p.pan.setValueAtTime(Math.max(-1,Math.min(1,pos+rand(-.12,.12))),t);
        src.connect(hp).connect(lp).connect(g).connect(p).connect(group);
      }else src.connect(hp).connect(lp).connect(g).connect(group);
      src.start(t);src.stop(t+dur+.02);nodes.push(src);
    }

    const body=ctx.createBufferSource();body.buffer=S.noise;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=rand(160,260);bp.Q.value=.7;
    const bg=ctx.createGain();bg.gain.setValueAtTime(.0001,start);bg.gain.exponentialRampToValueAtTime(.012,start+.25);bg.gain.exponentialRampToValueAtTime(.0001,start+total);
    body.connect(bp).connect(bg).connect(group);body.start(start);body.stop(start+total+.03);nodes.push(body);

    return ()=>{nodes.forEach(n=>{try{n.stop();}catch(_){}});try{group.disconnect();}catch(_){}};
  }

  function fireWrongEcho(){
    const ctx=ensureAudio(),start=now()+.03,nodes=[];
    const group=ctx.createGain();group.gain.value=.95;group.connect(S.master);

    // Pre-echo: broadband industrial swell arrives before the actual impact.
    const preDur=rand(.75,1.25),pre=ctx.createBufferSource();pre.buffer=S.noise;
    const preBP=ctx.createBiquadFilter();preBP.type='bandpass';preBP.frequency.value=rand(420,760);preBP.Q.value=.45;
    const preG=ctx.createGain();preG.gain.setValueAtTime(.0001,start);preG.gain.exponentialRampToValueAtTime(.018,start+preDur*.86);preG.gain.exponentialRampToValueAtTime(.004,start+preDur);
    if(ctx.createStereoPanner){const pp=ctx.createStereoPanner();pp.pan.value=rand(-.7,.7);pre.connect(preBP).connect(preG).connect(pp).connect(group);}else pre.connect(preBP).connect(preG).connect(group);
    pre.start(start);pre.stop(start+preDur+.03);nodes.push(pre);

    // Real impact: filtered noise thud, intentionally non-tonal.
    const hitT=start+preDur-.02,hit=ctx.createBufferSource();hit.buffer=S.noise;
    const hitLP=ctx.createBiquadFilter();hitLP.type='lowpass';hitLP.frequency.value=rand(260,420);
    const hitHP=ctx.createBiquadFilter();hitHP.type='highpass';hitHP.frequency.value=55;
    const hitG=ctx.createGain();hitG.gain.setValueAtTime(.055,hitT);hitG.gain.exponentialRampToValueAtTime(.0001,hitT+.42);
    hit.connect(hitHP).connect(hitLP).connect(hitG).connect(group);hit.start(hitT);hit.stop(hitT+.45);nodes.push(hit);

    // Two acoustic returns disagree on where / how far away the impact was.
    [rand(.18,.32),rand(.58,.92)].forEach((delay,i)=>{
      const echo=ctx.createBufferSource();echo.buffer=S.noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=i?330:520;bp.Q.value=.6;
      const eg=ctx.createGain(),et=hitT+delay;eg.gain.setValueAtTime(i?.012:.017,et);eg.gain.exponentialRampToValueAtTime(.0001,et+rand(.28,.55));
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=i?rand(-.95,-.35):rand(.35,.95);echo.connect(bp).connect(eg).connect(p).connect(group);}else echo.connect(bp).connect(eg).connect(group);
      echo.start(et);echo.stop(et+.6);nodes.push(echo);
    });

    return ()=>{nodes.forEach(n=>{try{n.stop();}catch(_){}});try{group.disconnect();}catch(_){}};
  }

  const eventFns={grit:fireGrit,wrongEcho:fireWrongEcho};

  function clearTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id);}
  function clearStops(id){const set=S.eventStops.get(id);if(set){set.forEach(fn=>{try{fn();}catch(_){}});set.clear();}}

  function schedule(def,first=false){
    clearTimer(def.id);if(!S.active.has(def.id)||def.mode!=='intermittent')return;
    const r=first?def.first:def.gap;
    const timer=setTimeout(()=>{
      if(!S.active.has(def.id))return;
      const stop=eventFns[def.id]();
      if(!S.eventStops.has(def.id))S.eventStops.set(def.id,new Set());
      S.eventStops.get(def.id).add(stop);
      setTimeout(()=>S.eventStops.get(def.id)?.delete(stop),7000);
      schedule(def,false);
    },rand(r[0],r[1])*1000);
    S.timers.set(def.id,timer);
  }

  function setLayer(id,on){
    const def=defs.find(d=>d.id===id);if(!def)return;ensureAudio();
    if(on){
      if(S.active.has(id))return;S.active.add(id);
      if(def.mode==='continuous')S.continuous.set(id,startDepth());
      else schedule(def,true);
    }else{
      S.active.delete(id);clearTimer(id);clearStops(id);
      const stop=S.continuous.get(id);if(stop){try{stop();}catch(_){ }S.continuous.delete(id);}
    }
    render();
  }

  function trigger(id){
    const fn=eventFns[id];if(!fn)return;ensureAudio();const stop=fn();setTimeout(()=>{try{stop();}catch(_){ }},7000);
    const b=document.querySelector(`[data-dislocation-trigger="${id}"]`);if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350);}
  }

  function startDislocation(){defs.forEach(d=>setLayer(d.id,true));}
  function stopDislocation(){defs.forEach(d=>setLayer(d.id,false));}

  function render(){
    document.querySelectorAll('[data-dislocation-layer]').forEach(btn=>{
      const id=btn.dataset.dislocationLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));
      const s=btn.querySelector('.wa-state');if(s)s.textContent=on?'ON':'OFF';
    });
    const live=document.getElementById('waDislocationLive');if(live){const names=defs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'OFF';}
  }

  function bindMaster(){
    const slider=document.getElementById('waVolume');if(!slider)return;
    slider.addEventListener('input',()=>{if(S.ctx&&S.master)S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.03);});
  }

  function build(){
    if(document.getElementById('waDislocationStage'))return true;
    const dock=document.getElementById('wardenAudioDock');if(!dock)return false;
    const body=dock.querySelector('.wa-body');if(!body)return false;
    const section=document.createElement('div');section.id='waDislocationStage';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:10px"><span>STAGE 3 // DISLOCATION:</span> <b id="waDislocationLive">OFF</b></div>
      <div class="wa-master-row" style="margin-top:8px">
        <button class="wa-btn wa-primary" id="waStartDislocation" type="button">START DISLOCATION</button>
        <button class="wa-btn wa-stop" id="waStopDislocation" type="button">STOP DISLOCATION</button>
      </div>
      <div class="wa-grid">${defs.map(d=>`<div class="wa-layer"><button class="wa-layer-toggle" type="button" data-dislocation-layer="${d.id}" aria-pressed="false"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">OFF</span></button>${d.mode==='intermittent'?`<button class="wa-mini" type="button" data-dislocation-trigger="${d.id}">TRIGGER</button>`:''}</div>`).join('')}</div>`;
    body.appendChild(section);

    section.querySelectorAll('[data-dislocation-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.dislocationLayer,!S.active.has(btn.dataset.dislocationLayer))));
    section.querySelectorAll('[data-dislocation-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.dislocationTrigger)));
    document.getElementById('waStartDislocation').addEventListener('click',startDislocation);
    document.getElementById('waStopDislocation').addEventListener('click',stopDislocation);
    bindMaster();render();
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
  window.WardenM17DislocationAudio={setLayer,trigger,startDislocation,stopDislocation};
})();