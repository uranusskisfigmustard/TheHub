(()=>{
  'use strict';

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;
  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  const defs=[
    {id:'orePulse',label:'ORE PULSE',desc:'Repeating black-green signal packet; low, electrical, nonmusical',first:[5,11],gap:[10,19]},
    {id:'answer',label:'ANSWERING SIGNAL',desc:'Faint nonlocal reply; unstable apparent direction and delay',first:[12,22],gap:[17,31]},
    {id:'twitch',label:'ELECTRICAL TWITCH',desc:'Brief dead-monitor / dormant-electronics response',first:[8,16],gap:[14,34]}
  ];

  const S={ctx:null,master:null,compressor:null,noise:null,active:new Set(),timers:new Map(),eventStops:new Map(),volume:0.48};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const now=()=>S.ctx?S.ctx.currentTime:0;

  function getVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||0.48);
    return Math.max(0,Math.min(1,Number.isFinite(v)?v:0.48));
  }

  function makeNoise(seconds=4){
    const len=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(1,len,S.ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      brown=(brown+0.02*w)/1.02;
      d[i]=Math.max(-1,Math.min(1,w*0.5+brown*2));
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-20;
      S.compressor.knee.value=16;
      S.compressor.ratio.value=3;
      S.compressor.attack.value=0.008;
      S.compressor.release.value=0.3;
      S.volume=getVolume();
      S.master.gain.value=S.volume;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoise(5);
    }
    if(S.ctx.state==='suspended') S.ctx.resume();
    S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,0.03);
    return S.ctx;
  }

  function panNode(ctx,value){
    if(!ctx.createStereoPanner) return null;
    const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,value));return p;
  }

  function packetPulse(start,level=1,pan=0){
    const ctx=ensureAudio(),nodes=[];
    const p=panNode(ctx,pan),out=ctx.createGain();out.gain.value=level;
    if(p){out.connect(p).connect(S.master);}else out.connect(S.master);
    const times=[0,.27,.71,.91];
    const amps=[1,.62,.82,.38];
    times.forEach((dt,i)=>{
      const t=start+dt,dur=i===2?.22:.14;
      const low=ctx.createOscillator(),lg=ctx.createGain();
      low.type='sine';low.frequency.setValueAtTime(i===2?47:54,t);low.frequency.exponentialRampToValueAtTime(i===2?39:46,t+dur);
      lg.gain.setValueAtTime(.0001,t);lg.gain.exponentialRampToValueAtTime(.032*amps[i],t+.018);lg.gain.exponentialRampToValueAtTime(.0001,t+dur);
      low.connect(lg).connect(out);low.start(t);low.stop(t+dur+.02);nodes.push(low);
      const edge=ctx.createOscillator(),eg=ctx.createGain();edge.type='square';edge.frequency.value=i===2?412:618;
      eg.gain.setValueAtTime(.0001,t);eg.gain.exponentialRampToValueAtTime(.0042*amps[i],t+.006);eg.gain.exponentialRampToValueAtTime(.0001,t+.045);
      edge.connect(eg).connect(out);edge.start(t);edge.stop(t+.06);nodes.push(edge);
    });
    return ()=>{nodes.forEach(n=>{try{n.stop();}catch(_){}});try{out.disconnect();}catch(_){}};
  }

  function fireOrePulse(){
    const start=now()+.03;
    return packetPulse(start,1,rand(-.15,.15));
  }

  function fireAnswer(){
    const ctx=ensureAudio(),start=now()+rand(.08,.35),nodes=[];
    const out=ctx.createGain();out.gain.value=.65;
    const p=panNode(ctx,Math.random()<.5?rand(-.95,-.35):rand(.35,.95));
    if(p){out.connect(p).connect(S.master);}else out.connect(S.master);

    // Similar enough to feel related, wrong enough not to sound like an echo.
    const times=[0,.34,.62,1.08];
    const freqs=[43,43,51,36];
    times.forEach((dt,i)=>{
      const t=start+dt,dur=.18+(.06*i);
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freqs[i],t);o.frequency.linearRampToValueAtTime(freqs[i]+(i%2?4:-3),t+dur);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.019*(i===3?.7:1),t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g).connect(out);o.start(t);o.stop(t+dur+.03);nodes.push(o);

      const hi=ctx.createOscillator(),hg=ctx.createGain();hi.type='triangle';hi.frequency.value=930+(i*71);
      hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(.0018,t+.008);hg.gain.exponentialRampToValueAtTime(.0001,t+.07);
      hi.connect(hg).connect(out);hi.start(t);hi.stop(t+.08);nodes.push(hi);
    });

    // A faint tail with ambiguous stereo placement.
    const noise=ctx.createBufferSource();noise.buffer=S.noise;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=760;bp.Q.value=.6;
    const ng=ctx.createGain();ng.gain.setValueAtTime(.0001,start+.75);ng.gain.exponentialRampToValueAtTime(.0022,start+.9);ng.gain.exponentialRampToValueAtTime(.0001,start+2.2);
    noise.connect(bp).connect(ng).connect(out);noise.start(start+.72);noise.stop(start+2.25);nodes.push(noise);

    return ()=>{nodes.forEach(n=>{try{n.stop();}catch(_){}});try{out.disconnect();}catch(_){}};
  }

  function fireTwitch(){
    const ctx=ensureAudio(),start=now()+.02,nodes=[],count=1+Math.floor(Math.random()*3);
    for(let i=0;i<count;i++){
      const t=start+i*rand(.07,.2),dur=rand(.035,.075);
      const src=ctx.createBufferSource();src.buffer=S.noise;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1200;
      const g=ctx.createGain();g.gain.setValueAtTime(rand(.012,.024),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      src.connect(hp).connect(g).connect(S.master);src.start(t);src.stop(t+dur);nodes.push(src);

      const hum=ctx.createOscillator(),hg=ctx.createGain();hum.type='sine';hum.frequency.value=60;
      hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(.007,t+.012);hg.gain.exponentialRampToValueAtTime(.0001,t+.16);
      hum.connect(hg).connect(S.master);hum.start(t);hum.stop(t+.18);nodes.push(hum);
    }
    return ()=>nodes.forEach(n=>{try{n.stop();}catch(_){}});
  }

  const eventFns={orePulse:fireOrePulse,answer:fireAnswer,twitch:fireTwitch};

  function clearTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id);}
  function clearStops(id){const set=S.eventStops.get(id);if(set){set.forEach(fn=>{try{fn();}catch(_){}});set.clear();}}

  function schedule(def,first=false){
    clearTimer(def.id);if(!S.active.has(def.id))return;
    const r=first?def.first:def.gap;
    const timer=setTimeout(()=>{
      if(!S.active.has(def.id))return;
      const stop=eventFns[def.id]();
      if(!S.eventStops.has(def.id))S.eventStops.set(def.id,new Set());
      S.eventStops.get(def.id).add(stop);
      setTimeout(()=>S.eventStops.get(def.id)?.delete(stop),5000);
      schedule(def,false);
    },rand(r[0],r[1])*1000);
    S.timers.set(def.id,timer);
  }

  function setLayer(id,on){
    const def=defs.find(d=>d.id===id);if(!def)return;
    ensureAudio();
    if(on){if(S.active.has(id))return;S.active.add(id);schedule(def,true);}
    else{S.active.delete(id);clearTimer(id);clearStops(id);}
    render();
  }

  function trigger(id){
    const fn=eventFns[id];if(!fn)return;
    ensureAudio();const stop=fn();setTimeout(()=>{try{stop();}catch(_){ }},5000);
    const b=document.querySelector(`[data-signal-trigger="${id}"]`);if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),350);}
  }

  function startSignal(){defs.forEach(d=>setLayer(d.id,true));}
  function stopSignal(){defs.forEach(d=>setLayer(d.id,false));}

  function render(){
    document.querySelectorAll('[data-signal-layer]').forEach(btn=>{
      const id=btn.dataset.signalLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));
      const s=btn.querySelector('.wa-state');if(s)s.textContent=on?'ON':'OFF';
    });
    const live=document.getElementById('waSignalLive');if(live){const names=defs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'OFF';}
  }

  function bindMaster(){
    const slider=document.getElementById('waVolume');if(!slider)return;
    slider.addEventListener('input',()=>{if(S.ctx&&S.master)S.master.gain.setTargetAtTime(getVolume(),S.ctx.currentTime,.03);});
  }

  function build(){
    if(document.getElementById('waSignalStage'))return true;
    const dock=document.getElementById('wardenAudioDock');if(!dock)return false;
    const body=dock.querySelector('.wa-body');if(!body)return false;
    const section=document.createElement('div');section.id='waSignalStage';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:10px"><span>STAGE 2 // SIGNAL:</span> <b id="waSignalLive">OFF</b></div>
      <div class="wa-master-row" style="margin-top:8px">
        <button class="wa-btn wa-primary" id="waStartSignal" type="button">START SIGNAL</button>
        <button class="wa-btn wa-stop" id="waStopSignal" type="button">STOP SIGNAL</button>
      </div>
      <div class="wa-grid">${defs.map(d=>`<div class="wa-layer"><button class="wa-layer-toggle" type="button" data-signal-layer="${d.id}" aria-pressed="false"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">OFF</span></button><button class="wa-mini" type="button" data-signal-trigger="${d.id}">TRIGGER</button></div>`).join('')}</div>`;
    body.appendChild(section);

    section.querySelectorAll('[data-signal-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.signalLayer,!S.active.has(btn.dataset.signalLayer))));
    section.querySelectorAll('[data-signal-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.signalTrigger)));
    document.getElementById('waStartSignal').addEventListener('click',startSignal);
    document.getElementById('waStopSignal').addEventListener('click',stopSignal);
    bindMaster();render();
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
  window.WardenM17SignalAudio={setLayer,trigger,startSignal,stopSignal};
})();