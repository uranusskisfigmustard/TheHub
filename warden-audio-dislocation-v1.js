(()=>{
  'use strict';

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return;
  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  const defs=[
    {id:'depth',label:'DEPTH STRETCH',mode:'intermittent',desc:'Intermittently drags and smears the entire live mix as local acoustics stretch',first:[9,17],gap:[24,46]},
    {id:'grit',label:'SIDEWAYS GRIT',mode:'intermittent',desc:'Dry granular movement sliding laterally through the room',first:[7,16],gap:[18,38]},
    {id:'wrongEcho',label:'REVERSE ECHO',mode:'intermittent',desc:'Reverse metal clang or ore-crush acoustics swell in before the physical event',first:[12,24],gap:[26,52]}
  ];

  const S={ctx:null,master:null,compressor:null,noise:null,active:new Set(),timers:new Map(),eventStops:new Map(),volume:.48};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const now=()=>S.ctx?S.ctx.currentTime:0;

  function getVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
    return Math.max(0,Math.min(1,Number.isFinite(v)?v:.48));
  }

  function makeNoise(seconds=10){
    const len=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(1,len,S.ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      brown=(brown+.016*w)/1.016;
      d[i]=Math.max(-1,Math.min(1,w*.58+brown*2.3));
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();S.master.gain.value=getVolume();
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-22;S.compressor.knee.value=18;S.compressor.ratio.value=3;S.compressor.attack.value=.008;S.compressor.release.value=.42;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoise(10);
    }
    if(S.ctx.state==='suspended')S.ctx.resume();
    S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.03);
    return S.ctx;
  }

  function connectPan(node,pan,out){
    const ctx=ensureAudio();
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));node.connect(p).connect(out);return p;}
    node.connect(out);return null;
  }

  function fireDepth(){
    ensureAudio();
    const core=window.WardenAudioCore;
    if(core&&typeof core.triggerStretch==='function')core.triggerStretch(rand(.82,1.12));
    return()=>{};
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

    return()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
  }

  function reverseMetal(ctx,group,start,nodes){
    const preDur=rand(1.15,1.9),hitT=start+preDur,pan=rand(-.75,.75);
    [rand(360,620),rand(820,1300),rand(1700,2600)].forEach((freq,i)=>{
      const src=ctx.createBufferSource();src.buffer=S.noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=rand(4.5,9);
      const g=ctx.createGain();g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.006+(i===0?.006:.0025),start+preDur*.55);g.gain.exponentialRampToValueAtTime(.022/(i+1),hitT-.025);
      src.connect(bp).connect(g);connectPan(g,Math.max(-1,Math.min(1,pan+rand(-.12,.12))),group);src.start(start);src.stop(hitT+.02);nodes.push(src);
    });
    const air=ctx.createBufferSource();air.buffer=S.noise;
    const ahp=ctx.createBiquadFilter();ahp.type='highpass';ahp.frequency.value=700;
    const ag=ctx.createGain();ag.gain.setValueAtTime(.0001,start);ag.gain.exponentialRampToValueAtTime(.018,hitT-.02);
    air.connect(ahp).connect(ag);connectPan(ag,pan,group);air.start(start);air.stop(hitT+.02);nodes.push(air);

    const hit=ctx.createBufferSource();hit.buffer=S.noise;
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=150;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4300;
    const hg=ctx.createGain();hg.gain.setValueAtTime(.085,hitT);hg.gain.exponentialRampToValueAtTime(.0001,hitT+.11);
    hit.connect(hp).connect(lp).connect(hg);connectPan(hg,pan,group);hit.start(hitT);hit.stop(hitT+.13);nodes.push(hit);

    const shell=ctx.createBufferSource();shell.buffer=S.noise;
    const sbp=ctx.createBiquadFilter();sbp.type='bandpass';sbp.frequency.value=rand(480,760);sbp.Q.value=5.5;
    const sg=ctx.createGain();sg.gain.setValueAtTime(.024,hitT);sg.gain.exponentialRampToValueAtTime(.0001,hitT+rand(.45,.8));
    shell.connect(sbp).connect(sg);connectPan(sg,pan,group);shell.start(hitT);shell.stop(hitT+.85);nodes.push(shell);
    return hitT;
  }

  function reverseOre(ctx,group,start,nodes){
    const preDur=rand(1.8,3.0),hitT=start+preDur,pan=rand(-.65,.65);
    const scrape=ctx.createBufferSource();scrape.buffer=S.noise;
    const shp=ctx.createBiquadFilter();shp.type='highpass';shp.frequency.value=240;
    const slp=ctx.createBiquadFilter();slp.type='lowpass';slp.frequency.value=1800;
    const sg=ctx.createGain();sg.gain.setValueAtTime(.0001,start);sg.gain.exponentialRampToValueAtTime(.008,start+preDur*.35);sg.gain.exponentialRampToValueAtTime(.034,hitT-.03);
    scrape.connect(shp).connect(slp).connect(sg);connectPan(sg,pan,group);scrape.start(start);scrape.stop(hitT+.02);nodes.push(scrape);

    const grains=13+Math.floor(Math.random()*9);
    for(let i=0;i<grains;i++){
      const frac=(i+1)/grains;
      const t=start+preDur*Math.pow(frac,1.75),dur=rand(.025,.09),src=ctx.createBufferSource();src.buffer=S.noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=rand(420,1900);bp.Q.value=rand(.6,1.8);
      const g=ctx.createGain();g.gain.setValueAtTime(.006+.026*frac,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      src.connect(bp).connect(g);connectPan(g,Math.max(-1,Math.min(1,pan+rand(-.2,.2))),group);src.start(t);src.stop(t+dur+.02);nodes.push(src);
    }

    const low=ctx.createBufferSource();low.buffer=S.noise;
    const llp=ctx.createBiquadFilter();llp.type='lowpass';llp.frequency.value=125;
    const lg=ctx.createGain();lg.gain.setValueAtTime(.0001,start);lg.gain.exponentialRampToValueAtTime(.05,hitT-.03);
    low.connect(llp).connect(lg).connect(group);low.start(start);low.stop(hitT+.02);nodes.push(low);

    for(let i=0;i<4;i++){
      const t=hitT+i*rand(.035,.08),src=ctx.createBufferSource();src.buffer=S.noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=rand(260,1400);bp.Q.value=rand(.5,1.1);
      const g=ctx.createGain();g.gain.setValueAtTime(rand(.045,.075)/(i+1),t);g.gain.exponentialRampToValueAtTime(.0001,t+rand(.06,.14));
      src.connect(bp).connect(g);connectPan(g,pan+rand(-.12,.12),group);src.start(t);src.stop(t+.18);nodes.push(src);
    }
    return hitT;
  }

  function fireWrongEcho(){
    const ctx=ensureAudio(),start=now()+.04,nodes=[],group=ctx.createGain();group.gain.value=.96;group.connect(S.master);
    if(Math.random()<.5)reverseMetal(ctx,group,start,nodes);else reverseOre(ctx,group,start,nodes);
    return()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
  }

  const eventFns={depth:fireDepth,grit:fireGrit,wrongEcho:fireWrongEcho};
  function clearTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id)}
  function clearStops(id){const set=S.eventStops.get(id);if(set){set.forEach(fn=>{try{fn()}catch(_){}});set.clear()}}

  function schedule(def,first=false){
    clearTimer(def.id);if(!S.active.has(def.id))return;
    const r=first?def.first:def.gap;
    const timer=setTimeout(()=>{
      if(!S.active.has(def.id))return;
      const stop=eventFns[def.id]();
      if(!S.eventStops.has(def.id))S.eventStops.set(def.id,new Set());
      S.eventStops.get(def.id).add(stop);
      setTimeout(()=>S.eventStops.get(def.id)?.delete(stop),9000);
      schedule(def,false);
    },rand(r[0],r[1])*1000);
    S.timers.set(def.id,timer);
  }

  function setLayer(id,on){
    const def=defs.find(d=>d.id===id);if(!def)return;ensureAudio();
    if(on){if(S.active.has(id))return;S.active.add(id);schedule(def,true);}
    else{S.active.delete(id);clearTimer(id);clearStops(id);}
    render();
  }

  function trigger(id){
    const fn=eventFns[id];if(!fn)return;ensureAudio();const stop=fn();setTimeout(()=>{try{stop()}catch(_){ }},9000);
    const b=document.querySelector(`[data-dislocation-trigger="${id}"]`);if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350)}
  }

  function startDislocation(){defs.forEach(d=>setLayer(d.id,true))}
  function stopDislocation(){defs.forEach(d=>setLayer(d.id,false))}

  function render(){
    document.querySelectorAll('[data-dislocation-layer]').forEach(btn=>{const id=btn.dataset.dislocationLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));const s=btn.querySelector('.wa-state');if(s)s.textContent=on?'ON':'OFF'});
    const live=document.getElementById('waDislocationLive');if(live){const names=defs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'OFF'}
  }

  function bindMaster(){const slider=document.getElementById('waVolume');if(!slider)return;slider.addEventListener('input',()=>{if(S.ctx&&S.master)S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.03)})}

  function build(){
    if(document.getElementById('waDislocationStage'))return true;
    const dock=document.getElementById('wardenAudioDock');if(!dock)return false;
    const body=dock.querySelector('.wa-body');if(!body)return false;
    const section=document.createElement('div');section.id='waDislocationStage';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:10px"><span>STAGE 3 // DISLOCATION:</span> <b id="waDislocationLive">OFF</b></div>
      <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-primary" id="waStartDislocation" type="button">START DISLOCATION</button><button class="wa-btn wa-stop" id="waStopDislocation" type="button">STOP DISLOCATION</button></div>
      <div class="wa-grid">${defs.map(d=>`<div class="wa-layer"><button class="wa-layer-toggle" type="button" data-dislocation-layer="${d.id}" aria-pressed="false"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">OFF</span></button><button class="wa-mini" type="button" data-dislocation-trigger="${d.id}">TRIGGER</button></div>`).join('')}</div>`;
    body.appendChild(section);
    section.querySelectorAll('[data-dislocation-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.dislocationLayer,!S.active.has(btn.dataset.dislocationLayer))));
    section.querySelectorAll('[data-dislocation-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.dislocationTrigger)));
    document.getElementById('waStartDislocation').addEventListener('click',startDislocation);document.getElementById('waStopDislocation').addEventListener('click',stopDislocation);bindMaster();render();return true;
  }

  let tries=0;const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait)},100);
  window.WardenM17DislocationAudio={setLayer,trigger,startDislocation,stopDislocation};
})();
