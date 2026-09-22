(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;

  const layerDefs=[
    {id:'room',label:'ROOM BED',mode:'continuous',desc:'Ventilation + low industrial room tone'},
    {id:'machinery',label:'HEAVY MACHINERY',mode:'continuous',desc:'Motors, loaded bearings, low mechanical thrum'},
    {id:'light',label:'LIGHT BUZZ',mode:'intermittent',desc:'Faulty fluorescent ballast; irregular buzz/flicker',first:[12,28],gap:[42,95]},
    {id:'rocks',label:'ROCK / MATERIAL',mode:'intermittent',desc:'Low material movement and distant dense rumbles',first:[8,20],gap:[25,62]},
    {id:'metal',label:'METAL / CHUTE',mode:'intermittent',desc:'Occasional settling, knocks, and chute movement',first:[14,32],gap:[24,58]},
    {id:'relays',label:'CONTROL RELAYS',mode:'intermittent',desc:'Sparse control-booth clicks and relay chatter',first:[8,20],gap:[16,42]}
  ];

  const S={
    ctx:null,master:null,compressor:null,noise:null,
    active:new Set(),continuous:new Map(),timers:new Map(),eventStops:new Map(),
    volume:Math.max(0,Math.min(1,Number(localStorage.getItem(STORAGE_VOLUME)||0.48)))
  };

  const rand=(a,b)=>a+Math.random()*(b-a);
  const now=()=>S.ctx?S.ctx.currentTime:0;

  function makeNoiseBuffer(seconds=8){
    const length=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(1,length,S.ctx.sampleRate);
    const d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<length;i++){
      const white=Math.random()*2-1;
      brown=(brown+0.018*white)/1.018;
      d[i]=Math.max(-1,Math.min(1,white*0.55+brown*2.2));
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();
      S.master.gain.value=S.volume;
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-18;
      S.compressor.knee.value=18;
      S.compressor.ratio.value=4;
      S.compressor.attack.value=0.01;
      S.compressor.release.value=0.35;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoiseBuffer(9);
    }
    if(S.ctx.state==='suspended') S.ctx.resume();
    return S.ctx;
  }

  function startRoom(){
    const ctx=ensureAudio();
    const group=ctx.createGain(); group.gain.value=1; group.connect(S.master);
    const src=ctx.createBufferSource(); src.buffer=S.noise; src.loop=true;
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=85;
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1750;
    const ng=ctx.createGain(); ng.gain.value=0.052;
    src.connect(hp).connect(lp).connect(ng).connect(group); src.start();
    const oscs=[];
    [[34.5,0.022,'sine'],[41.2,0.014,'sine'],[69,0.006,'sine'],[179,0.0025,'sine'],[241,0.0017,'sine']].forEach(([f,v,type])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start();oscs.push(o);
    });
    const mains=ctx.createOscillator(),mg=ctx.createGain(); mains.type='sine';mains.frequency.value=60;mg.gain.value=0.0018;mains.connect(mg).connect(group);mains.start();oscs.push(mains);
    return ()=>{try{src.stop();}catch(_){ } oscs.forEach(o=>{try{o.stop();}catch(_){}});try{group.disconnect();}catch(_){}};
  }

  function startMachinery(){
    const ctx=ensureAudio();
    const group=ctx.createGain(); group.gain.value=0.72; group.connect(S.master);
    const oscs=[];
    [[27,0.025,'sine'],[53.5,0.012,'triangle'],[86,0.006,'sawtooth'],[113,0.0035,'triangle']].forEach(([f,v,type])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start();oscs.push(o);
    });
    const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=0.035;lg.gain.value=0.16;lfo.connect(lg).connect(group.gain);lfo.start();oscs.push(lfo);
    const noise=ctx.createBufferSource();noise.buffer=S.noise;noise.loop=true;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=430;bp.Q.value=0.65;
    const ng=ctx.createGain();ng.gain.value=0.012;noise.connect(bp).connect(ng).connect(group);noise.start();
    return ()=>{try{noise.stop();}catch(_){ }oscs.forEach(o=>{try{o.stop();}catch(_){}});try{group.disconnect();}catch(_){}};
  }

  function fireLight(){
    const ctx=ensureAudio(),start=now(),dur=rand(4.5,11.5);
    const group=ctx.createGain();group.gain.setValueAtTime(0.0001,start);group.gain.exponentialRampToValueAtTime(0.8,start+0.08);group.gain.setValueAtTime(0.8,start+Math.max(.1,dur-.25));group.gain.exponentialRampToValueAtTime(0.0001,start+dur);group.connect(S.master);
    const nodes=[];
    [[60,.0055],[120,.004],[240,.0025],[720,.0012]].forEach(([f,v])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start(start);o.stop(start+dur+.05);nodes.push(o);});
    const noise=ctx.createBufferSource();noise.buffer=S.noise;noise.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=.35;const ng=ctx.createGain();ng.gain.value=.0045;noise.connect(bp).connect(ng).connect(group);noise.start(start);noise.stop(start+dur+.05);nodes.push(noise);
    let flickerTimer=null;
    const flicker=()=>{if(now()>start+dur-.3)return;const t=now(),drop=Math.random()<.34;group.gain.cancelScheduledValues(t);group.gain.setTargetAtTime(drop?rand(.05,.22):rand(.58,.92),t,.015);flickerTimer=setTimeout(flicker,rand(55,190));};
    flickerTimer=setTimeout(flicker,rand(500,1300));
    const stop=()=>{if(flickerTimer)clearTimeout(flickerTimer);nodes.forEach(n=>{try{n.stop();}catch(_){}});try{group.disconnect();}catch(_){}};
    setTimeout(stop,(dur+.2)*1000);return stop;
  }

  function fireRocks(){
    const ctx=ensureAudio(),start=now(),dur=rand(2.2,5.4);
    const noise=ctx.createBufferSource();noise.buffer=S.noise;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=rand(65,105);
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(rand(.045,.085),start+rand(.3,.75));g.gain.exponentialRampToValueAtTime(.0001,start+dur);
    const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;if(pan){pan.pan.value=rand(-.75,.75);noise.connect(lp).connect(g).connect(pan).connect(S.master);}else noise.connect(lp).connect(g).connect(S.master);
    noise.start(start);noise.stop(start+dur);
    const sub=ctx.createOscillator(),sg=ctx.createGain();sub.type='sine';sub.frequency.setValueAtTime(rand(38,52),start);sub.frequency.exponentialRampToValueAtTime(rand(26,36),start+dur);sg.gain.setValueAtTime(.0001,start);sg.gain.exponentialRampToValueAtTime(rand(.018,.038),start+.4);sg.gain.exponentialRampToValueAtTime(.0001,start+dur);sub.connect(sg).connect(S.master);sub.start(start);sub.stop(start+dur);
    return ()=>{try{noise.stop();sub.stop();}catch(_){}};
  }

  function fireMetal(){
    const ctx=ensureAudio(),count=Math.random()<.35?2:1;const stops=[];
    for(let k=0;k<count;k++){
      const delay=k*rand(.14,.45),start=now()+delay,dur=rand(.55,1.25),base=rand(95,180);
      const group=ctx.createGain();group.gain.setValueAtTime(.0001,start);group.gain.exponentialRampToValueAtTime(rand(.035,.07),start+.012);group.gain.exponentialRampToValueAtTime(.0001,start+dur);group.connect(S.master);
      [base,base*rand(1.75,2.25)].forEach((f,i)=>{const o=ctx.createOscillator();o.type=i?'triangle':'sine';o.frequency.value=f;o.connect(group);o.start(start);o.stop(start+dur);stops.push(o);});
      const click=ctx.createBufferSource();click.buffer=S.noise;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=650;const cg=ctx.createGain();cg.gain.setValueAtTime(.035,start);cg.gain.exponentialRampToValueAtTime(.0001,start+.05);click.connect(hp).connect(cg).connect(S.master);click.start(start);click.stop(start+.06);stops.push(click);
    }
    return ()=>stops.forEach(n=>{try{n.stop();}catch(_){}});
  }

  function fireRelays(){
    const ctx=ensureAudio(),count=1+Math.floor(Math.random()*3),stops=[];
    for(let i=0;i<count;i++){
      const start=now()+i*rand(.09,.24),dur=rand(.028,.065);
      const src=ctx.createBufferSource();src.buffer=S.noise;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=900;const g=ctx.createGain();g.gain.setValueAtTime(rand(.012,.025),start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);src.connect(hp).connect(g).connect(S.master);src.start(start);src.stop(start+dur);stops.push(src);
      const o=ctx.createOscillator(),og=ctx.createGain();o.type='square';o.frequency.value=rand(650,1150);og.gain.setValueAtTime(rand(.002,.005),start);og.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(og).connect(S.master);o.start(start);o.stop(start+dur);stops.push(o);
    }
    return ()=>stops.forEach(n=>{try{n.stop();}catch(_){}});
  }

  const eventFns={light:fireLight,rocks:fireRocks,metal:fireMetal,relays:fireRelays};

  function clearLayerTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id);}
  function clearEventStops(id){const set=S.eventStops.get(id);if(set){set.forEach(fn=>{try{fn();}catch(_){}});set.clear();}}

  function scheduleNext(def,isFirst=false){
    clearLayerTimer(def.id);if(!S.active.has(def.id))return;
    const range=isFirst?def.first:def.gap;
    const ms=rand(range[0],range[1])*1000;
    const timer=setTimeout(()=>{
      if(!S.active.has(def.id))return;
      const stop=eventFns[def.id]();
      if(!S.eventStops.has(def.id))S.eventStops.set(def.id,new Set());
      S.eventStops.get(def.id).add(stop);
      setTimeout(()=>S.eventStops.get(def.id)?.delete(stop),14000);
      scheduleNext(def,false);
    },ms);
    S.timers.set(def.id,timer);
  }

  function setLayer(id,on){
    const def=layerDefs.find(x=>x.id===id);if(!def)return;
    ensureAudio();
    if(on){
      if(S.active.has(id))return;S.active.add(id);
      if(def.mode==='continuous'){
        const stop=id==='room'?startRoom():startMachinery();S.continuous.set(id,stop);
      }else scheduleNext(def,true);
    }else{
      S.active.delete(id);clearLayerTimer(id);clearEventStops(id);
      const stop=S.continuous.get(id);if(stop){try{stop();}catch(_){ }S.continuous.delete(id);}
    }
    renderState();
  }

  function trigger(id){
    const fn=eventFns[id];if(!fn)return;ensureAudio();const stop=fn();setTimeout(()=>{try{stop();}catch(_){ }},14000);
    const btn=document.querySelector(`[data-audio-trigger="${id}"]`);if(btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);}
  }

  function stopAll(){layerDefs.forEach(d=>setLayer(d.id,false));}
  function startM17(){['room','machinery','light','rocks','metal','relays'].forEach(id=>setLayer(id,true));}

  function renderState(){
    document.querySelectorAll('[data-audio-layer]').forEach(btn=>{
      const id=btn.dataset.audioLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));
      const state=btn.querySelector('.wa-state');if(state)state.textContent=on?'ON':'OFF';
    });
    const live=document.getElementById('waLive');if(live){const names=layerDefs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'SILENT';}
  }

  function buildUI(){
    if(document.getElementById('wardenAudioDock'))return;
    const dock=document.createElement('aside');dock.id='wardenAudioDock';dock.setAttribute('aria-label','Warden audio soundboard');
    dock.innerHTML=`
      <div class="wa-head">
        <div><div class="wa-kicker">LIVE TABLE AUDIO</div><strong>M-17 SOUNDBOARD</strong></div>
        <div class="wa-head-actions"><button class="wa-mini" id="waCollapse" type="button" aria-label="Collapse audio panel">—</button></div>
      </div>
      <div class="wa-body">
        <div class="wa-master-row">
          <button class="wa-btn wa-primary" id="waStartM17" type="button">START M-17</button>
          <button class="wa-btn wa-stop" id="waStopAll" type="button">STOP ALL</button>
          <label class="wa-volume"><span>MASTER</span><input id="waVolume" type="range" min="0" max="1" step="0.01" value="${S.volume}"></label>
        </div>
        <div class="wa-live"><span>ACTIVE:</span> <b id="waLive">SILENT</b></div>
        <div class="wa-grid">${layerDefs.map(d=>`<div class="wa-layer"><button class="wa-layer-toggle" type="button" data-audio-layer="${d.id}" aria-pressed="false"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">OFF</span></button>${d.mode==='intermittent'?`<button class="wa-trigger" type="button" data-audio-trigger="${d.id}" title="Play one event now">TRIGGER</button>`:''}</div>`).join('')}</div>
        <div class="wa-note">Layers are independent. Intermittent layers fire at irregular intervals while ON; TRIGGER plays one immediately.</div>
      </div>`;
    document.body.appendChild(dock);

    dock.querySelector('#waCollapse').addEventListener('click',()=>{dock.classList.toggle('collapsed');dock.querySelector('#waCollapse').textContent=dock.classList.contains('collapsed')?'+':'—';});
    dock.querySelector('#waStartM17').addEventListener('click',startM17);
    dock.querySelector('#waStopAll').addEventListener('click',stopAll);
    dock.querySelectorAll('[data-audio-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.audioLayer,!S.active.has(btn.dataset.audioLayer))));
    dock.querySelectorAll('[data-audio-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.audioTrigger)));
    const volume=dock.querySelector('#waVolume');volume.addEventListener('input',()=>{S.volume=Number(volume.value);localStorage.setItem(STORAGE_VOLUME,String(S.volume));if(S.master)S.master.gain.setTargetAtTime(S.volume,now(),.04);});
    renderState();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildUI,{once:true});else buildUI();
})();
