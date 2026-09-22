(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;

  const layerDefs=[
    {id:'room',label:'ROOM BED',mode:'continuous',desc:'Ventilation + low industrial room tone'},
    {id:'machinery',label:'HEAVY MACHINERY',mode:'continuous',desc:'Motors, loaded bearings, low mechanical thrum'},
    {id:'light',label:'FLUORESCENT HUM',mode:'continuous',desc:'Steady fluorescent ballast hum with thin electrical whine'},
    {id:'rocks',label:'ROCK / MATERIAL',mode:'intermittent',desc:'Audible granular scrape, tumble, and dense material settling',first:[7,16],gap:[22,48]},
    {id:'metal',label:'METAL / CHUTE',mode:'intermittent',desc:'Broadband chute clank, shell impact, and settling steel',first:[10,24],gap:[22,52]},
    {id:'relays',label:'CONTROL RELAYS',mode:'intermittent',desc:'Dry mechanical relay clicks and brief contact chatter',first:[7,15],gap:[14,35]}
  ];

  const S={ctx:null,master:null,compressor:null,noise:null,active:new Set(),continuous:new Map(),timers:new Map(),eventStops:new Map(),volume:Math.max(0,Math.min(1,Number(localStorage.getItem(STORAGE_VOLUME)||0.48)))};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const now=()=>S.ctx?S.ctx.currentTime:0;

  function makeNoiseBuffer(seconds=12){
    const length=Math.max(1,Math.floor(S.ctx.sampleRate*seconds));
    const b=S.ctx.createBuffer(1,length,S.ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<length;i++){
      const white=Math.random()*2-1;
      brown=(brown+0.018*white)/1.018;
      d[i]=Math.max(-1,Math.min(1,white*.62+brown*2.25));
    }
    return b;
  }

  function ensureAudio(){
    if(!S.ctx){
      S.ctx=new AudioCtx();
      S.master=S.ctx.createGain();S.master.gain.value=S.volume;
      S.compressor=S.ctx.createDynamicsCompressor();
      S.compressor.threshold.value=-18;S.compressor.knee.value=18;S.compressor.ratio.value=4;S.compressor.attack.value=.01;S.compressor.release.value=.35;
      S.master.connect(S.compressor).connect(S.ctx.destination);
      S.noise=makeNoiseBuffer(12);
    }
    if(S.ctx.state==='suspended')S.ctx.resume();
    return S.ctx;
  }

  function connectPan(ctx,node,pan,target){
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));node.connect(p).connect(target);return p;}
    node.connect(target);return null;
  }

  function startRoom(){
    const ctx=ensureAudio(),group=ctx.createGain();group.gain.value=.72;group.connect(S.master);
    const src=ctx.createBufferSource();src.buffer=S.noise;src.loop=true;
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=85;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1750;
    const ng=ctx.createGain();ng.gain.value=.052;src.connect(hp).connect(lp).connect(ng).connect(group);src.start();
    const oscs=[];
    [[34.5,.022],[41.2,.014],[69,.006],[179,.0025],[241,.0017]].forEach(([f,v])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start();oscs.push(o);});
    const mains=ctx.createOscillator(),mg=ctx.createGain();mains.type='sine';mains.frequency.value=60;mg.gain.value=.0018;mains.connect(mg).connect(group);mains.start();oscs.push(mains);
    return()=>{try{src.stop()}catch(_){ }oscs.forEach(o=>{try{o.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
  }

  function startMachinery(){
    const ctx=ensureAudio(),group=ctx.createGain();group.gain.value=1;group.connect(S.master);
    const oscs=[];
    [[27,.025,'sine'],[53.5,.012,'triangle'],[86,.006,'sawtooth'],[113,.0035,'triangle']].forEach(([f,v,type])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start();oscs.push(o);});
    const noise=ctx.createBufferSource();noise.buffer=S.noise;noise.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=430;bp.Q.value=.65;const ng=ctx.createGain();ng.gain.value=.012;noise.connect(bp).connect(ng).connect(group);noise.start();
    return()=>{try{noise.stop()}catch(_){ }oscs.forEach(o=>{try{o.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
  }

  function startLightHum(){
    const ctx=ensureAudio(),group=ctx.createGain();group.gain.value=.78;group.connect(S.master),nodes=[];
    [[60,.0026],[120,.0042],[240,.0015]].forEach(([f,v])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start();nodes.push(o);});
    const hiss=ctx.createBufferSource();hiss.buffer=S.noise;hiss.loop=true;
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1350;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;
    const hg=ctx.createGain();hg.gain.value=.0068;hiss.connect(hp).connect(lp).connect(hg).connect(group);hiss.start();nodes.push(hiss);
    const whineNoise=ctx.createBufferSource();whineNoise.buffer=S.noise;whineNoise.loop=true;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2850;bp.Q.value=8.5;
    const wg=ctx.createGain();wg.gain.value=.0048;whineNoise.connect(bp).connect(wg).connect(group);whineNoise.start();nodes.push(whineNoise);
    return()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
  }

  function fireRocks(){
    const ctx=ensureAudio(),start=now()+.02,total=rand(2.4,4.8),nodes=[],group=ctx.createGain();group.gain.value=1.15;group.connect(S.master);
    const pan=rand(-.7,.7);
    const scrape=ctx.createBufferSource();scrape.buffer=S.noise;
    const shp=ctx.createBiquadFilter();shp.type='highpass';shp.frequency.value=220;
    const slp=ctx.createBiquadFilter();slp.type='lowpass';slp.frequency.value=1850;
    const sg=ctx.createGain();sg.gain.setValueAtTime(.0001,start);sg.gain.exponentialRampToValueAtTime(.035,start+.18);sg.gain.setValueAtTime(.026,start+Math.max(.22,total-.65));sg.gain.exponentialRampToValueAtTime(.0001,start+total);
    scrape.connect(shp).connect(slp).connect(sg);connectPan(ctx,sg,pan,group);scrape.start(start);scrape.stop(start+total+.03);nodes.push(scrape);
    const grains=12+Math.floor(Math.random()*14);
    for(let i=0;i<grains;i++){
      const t=start+rand(.12,total-.12),dur=rand(.035,.13),src=ctx.createBufferSource();src.buffer=S.noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=rand(350,1650);bp.Q.value=rand(.5,1.6);
      const g=ctx.createGain();g.gain.setValueAtTime(rand(.018,.048),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      src.connect(bp).connect(g);connectPan(ctx,g,Math.max(-1,Math.min(1,pan+rand(-.28,.28))),group);src.start(t);src.stop(t+dur+.02);nodes.push(src);
    }
    const body=ctx.createBufferSource();body.buffer=S.noise;
    const blp=ctx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=115;
    const bg=ctx.createGain();bg.gain.setValueAtTime(.0001,start);bg.gain.exponentialRampToValueAtTime(.06,start+.28);bg.gain.exponentialRampToValueAtTime(.0001,start+total);
    body.connect(blp).connect(bg).connect(group);body.start(start);body.stop(start+total+.03);nodes.push(body);
    return()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){}};
  }

  function fireMetal(){
    const ctx=ensureAudio(),nodes=[],count=Math.random()<.32?2:1;
    for(let k=0;k<count;k++){
      const t=now()+.025+k*rand(.18,.42),pan=rand(-.75,.75);
      const hit=ctx.createBufferSource();hit.buffer=S.noise;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=180;
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4200;
      const hg=ctx.createGain();hg.gain.setValueAtTime(rand(.07,.13),t);hg.gain.exponentialRampToValueAtTime(.0001,t+rand(.07,.13));
      hit.connect(hp).connect(lp).connect(hg);connectPan(ctx,hg,pan,S.master);hit.start(t);hit.stop(t+.16);nodes.push(hit);
      [rand(420,720),rand(900,1450),rand(1800,2600)].forEach((freq,i)=>{
        const tail=ctx.createBufferSource();tail.buffer=S.noise;
        const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=rand(4,9);
        const tg=ctx.createGain(),dur=rand(.32,.8)*(1-i*.12);tg.gain.setValueAtTime(rand(.015,.032)/(i+1),t+.015);tg.gain.exponentialRampToValueAtTime(.0001,t+dur);
        tail.connect(bp).connect(tg);connectPan(ctx,tg,Math.max(-1,Math.min(1,pan+rand(-.12,.12))),S.master);tail.start(t+.01);tail.stop(t+dur+.03);nodes.push(tail);
      });
      const thud=ctx.createBufferSource();thud.buffer=S.noise;const tlp=ctx.createBiquadFilter();tlp.type='lowpass';tlp.frequency.value=165;const tgp=ctx.createGain();tgp.gain.setValueAtTime(.055,t);tgp.gain.exponentialRampToValueAtTime(.0001,t+.34);thud.connect(tlp).connect(tgp).connect(S.master);thud.start(t);thud.stop(t+.36);nodes.push(thud);
    }
    return()=>nodes.forEach(n=>{try{n.stop()}catch(_){}});
  }

  function fireRelays(){
    const ctx=ensureAudio(),nodes=[],count=1+Math.floor(Math.random()*4),base=now()+.02,pan=rand(-.35,.45);
    for(let i=0;i<count;i++){
      const t=base+i*rand(.055,.16);
      const snap=ctx.createBufferSource();snap.buffer=S.noise;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=950;
      const sg=ctx.createGain();sg.gain.setValueAtTime(rand(.025,.055),t);sg.gain.exponentialRampToValueAtTime(.0001,t+rand(.018,.035));
      snap.connect(hp).connect(sg);connectPan(ctx,sg,pan+rand(-.08,.08),S.master);snap.start(t);snap.stop(t+.045);nodes.push(snap);
      const body=ctx.createBufferSource();body.buffer=S.noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=rand(280,520);bp.Q.value=1.2;
      const bg=ctx.createGain();bg.gain.setValueAtTime(rand(.015,.03),t);bg.gain.exponentialRampToValueAtTime(.0001,t+.07);
      body.connect(bp).connect(bg);connectPan(ctx,bg,pan,S.master);body.start(t);body.stop(t+.08);nodes.push(body);
    }
    return()=>nodes.forEach(n=>{try{n.stop()}catch(_){}});
  }

  const eventFns={rocks:fireRocks,metal:fireMetal,relays:fireRelays};
  function clearLayerTimer(id){const t=S.timers.get(id);if(t)clearTimeout(t);S.timers.delete(id)}
  function clearEventStops(id){const set=S.eventStops.get(id);if(set){set.forEach(fn=>{try{fn()}catch(_){}});set.clear()}}
  function scheduleNext(def,isFirst=false){
    clearLayerTimer(def.id);if(!S.active.has(def.id)||def.mode!=='intermittent')return;
    const range=isFirst?def.first:def.gap;
    const timer=setTimeout(()=>{if(!S.active.has(def.id))return;const stop=eventFns[def.id]();if(!S.eventStops.has(def.id))S.eventStops.set(def.id,new Set());S.eventStops.get(def.id).add(stop);setTimeout(()=>S.eventStops.get(def.id)?.delete(stop),12000);scheduleNext(def,false)},rand(range[0],range[1])*1000);
    S.timers.set(def.id,timer);
  }
  function setLayer(id,on){
    const def=layerDefs.find(x=>x.id===id);if(!def)return;ensureAudio();
    if(on){
      if(S.active.has(id))return;S.active.add(id);
      if(def.mode==='continuous'){
        const stop=id==='room'?startRoom():id==='machinery'?startMachinery():startLightHum();S.continuous.set(id,stop);
      }else scheduleNext(def,true);
    }else{
      S.active.delete(id);clearLayerTimer(id);clearEventStops(id);const stop=S.continuous.get(id);if(stop){try{stop()}catch(_){ }S.continuous.delete(id)}
    }
    renderState();
  }
  function trigger(id){const fn=eventFns[id];if(!fn)return;ensureAudio();const stop=fn();setTimeout(()=>{try{stop()}catch(_){ }},12000);const btn=document.querySelector(`[data-audio-trigger="${id}"]`);if(btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350)}}
  function stopAll(){layerDefs.forEach(d=>setLayer(d.id,false))}
  function startM17(){layerDefs.forEach(d=>setLayer(d.id,true))}
  function renderState(){
    document.querySelectorAll('[data-audio-layer]').forEach(btn=>{const id=btn.dataset.audioLayer,on=S.active.has(id);btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));const state=btn.querySelector('.wa-state');if(state)state.textContent=on?'ON':'OFF'});
    const live=document.getElementById('waLive');if(live){const names=layerDefs.filter(d=>S.active.has(d.id)).map(d=>d.label);live.textContent=names.length?names.join(' + '):'SILENT'}
  }
  function buildUI(){
    if(document.getElementById('wardenAudioDock'))return;
    const dock=document.createElement('aside');dock.id='wardenAudioDock';dock.setAttribute('aria-label','Warden audio soundboard');
    dock.innerHTML=`<div class="wa-head"><div><div class="wa-kicker">LIVE TABLE AUDIO</div><strong>M-17 SOUNDBOARD</strong></div><div class="wa-head-actions"><button class="wa-mini" id="waCollapse" type="button" aria-label="Collapse audio panel">—</button></div></div><div class="wa-body"><div class="wa-master-row"><button class="wa-btn wa-primary" id="waStartM17" type="button">START M-17</button><button class="wa-btn wa-stop" id="waStopAll" type="button">STOP ALL</button><label class="wa-volume"><span>MASTER</span><input id="waVolume" type="range" min="0" max="1" step="0.01" value="${S.volume}"></label></div><div class="wa-live"><span>ACTIVE:</span> <b id="waLive">SILENT</b></div><div class="wa-grid">${layerDefs.map(d=>`<div class="wa-layer"><button class="wa-layer-toggle" type="button" data-audio-layer="${d.id}" aria-pressed="false"><span><b>${d.label}</b><small>${d.desc}</small></span><span class="wa-state">OFF</span></button>${d.mode==='intermittent'?`<button class="wa-trigger" type="button" data-audio-trigger="${d.id}">TRIGGER</button>`:''}</div>`).join('')}</div><div class="wa-note">Independent layers. Continuous beds stay on until switched off; intermittent layers fire irregularly while enabled.</div></div>`;
    document.body.appendChild(dock);
    dock.querySelectorAll('[data-audio-layer]').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.audioLayer,!S.active.has(btn.dataset.audioLayer))));
    dock.querySelectorAll('[data-audio-trigger]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.audioTrigger)));
    document.getElementById('waStartM17').addEventListener('click',startM17);document.getElementById('waStopAll').addEventListener('click',stopAll);
    document.getElementById('waCollapse').addEventListener('click',()=>dock.classList.toggle('collapsed'));
    document.getElementById('waVolume').addEventListener('input',e=>{S.volume=Number(e.target.value);localStorage.setItem(STORAGE_VOLUME,String(S.volume));if(S.master)S.master.gain.setTargetAtTime(S.volume,S.ctx.currentTime,.03)});
    renderState();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildUI);else buildUI();
  window.WardenM17Audio={setLayer,trigger,startM17,stopAll};
})();