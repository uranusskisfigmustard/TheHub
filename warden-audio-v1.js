(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;

  const layerDefs=[
    {id:'room',label:'ROOM BED',mode:'continuous',desc:'Industrial ventilation / large fan only'},
    {id:'machinery',label:'HEAVY MACHINERY',mode:'continuous',desc:'Stacked factory machine tone + heavy mechanical cycle'},
    {id:'light',label:'FLUORESCENT FLICKER',mode:'intermittent',desc:'Failing tube restrikes, starter clicks, and short ballast buzzes',first:[3,9],gap:[14,32]},
    {id:'rocks',label:'ROCK / MATERIAL',mode:'intermittent',desc:'Audible granular scrape, tumble, and dense material settling',first:[7,16],gap:[22,48]},
    {id:'metal',label:'METAL / CHUTE',mode:'intermittent',desc:'Broadband chute clank, shell impact, and settling steel',first:[10,24],gap:[22,52]},
    {id:'relays',label:'CONTROL RELAYS',mode:'intermittent',desc:'Dry mechanical relay clicks and brief contact chatter',first:[7,15],gap:[14,35]}
  ];

  const ROOM_LOOPS=[
    {url:'https://cdn.freesound.org/previews/272/272265_4965320-hq.mp3',gain:.78,source:'Freesound #272265 — Big Factory Fan Ambience — IanStarGem — CC0 1.0'}
  ];
  const MACHINERY_LOOPS=[
    {url:'https://cdn.freesound.org/previews/434/434507_1134415-hq.mp3',gain:1.0,source:'Freesound #434507 — industrial_machine_tone — Kostrava — CC0 1.0'},
    {url:'https://cdn.freesound.org/previews/580/580633_2282212-hq.mp3',gain:.62,source:'Freesound #580633 — Machine Steampunk Factory — szegvari — CC0 1.0'}
  ];

  const S={ctx:null,master:null,compressor:null,noise:null,active:new Set(),continuous:new Map(),timers:new Map(),eventStops:new Map(),mediaLoops:new Set(),volume:Math.max(0,Math.min(1,Number(localStorage.getItem(STORAGE_VOLUME)||0.48)))};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const now=()=>S.ctx?S.ctx.currentTime:0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const group1Gain=()=>{
    const m=window.WardenGroupMixer;
    const v=m&&m.state?Number(m.state.g1):1;
    return clamp(Number.isFinite(v)?v:1,0,1);
  };

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

  function setMediaVolume(track){
    const mix=Number(track.dataset.waMix||1);
    track.volume=clamp(S.volume*mix*group1Gain(),0,1);
  }
  function refreshGroupVolume(){S.mediaLoops.forEach(setMediaVolume);}

  function startRecordedStack(defs){
    ensureAudio();
    const tracks=[];
    defs.forEach(def=>{
      const a=new Audio(def.url);
      a.preload='auto';
      a.loop=true;
      a.dataset.waMix=String(def.gain);
      a.dataset.waSource=def.source;
      setMediaVolume(a);
      S.mediaLoops.add(a);
      tracks.push(a);
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(()=>{S.mediaLoops.delete(a);});
    });
    return()=>{
      tracks.forEach(a=>{
        try{a.pause();a.currentTime=0;}catch(_){ }
        S.mediaLoops.delete(a);
      });
    };
  }

  function startRoom(){return startRecordedStack(ROOM_LOOPS)}
  function startMachinery(){return startRecordedStack(MACHINERY_LOOPS)}

  function fireFluorescentFlicker(){
    const ctx=ensureAudio(),nodes=[],group=ctx.createGain();group.gain.value=.95;group.connect(S.master);
    const base=now()+.025;
    const flashes=2+Math.floor(Math.random()*5);
    let cursor=base;
    function click(t,strong=false){
      const src=ctx.createBufferSource();src.buffer=S.noise;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=strong?1500:2200;
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6200;
      const g=ctx.createGain();g.gain.setValueAtTime(strong?.080:.050,t);g.gain.exponentialRampToValueAtTime(.0001,t+(strong?.025:.018));
      src.connect(hp).connect(lp).connect(g).connect(group);src.start(t);src.stop(t+.04);nodes.push(src);
    }
    function sputter(t,dur,strong=false){
      const src=ctx.createBufferSource();src.buffer=S.noise;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=420;
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3600;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=strong?1250:1750;bp.Q.value=.75;
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(strong?.042:.027,t+.012);g.gain.setValueAtTime(strong?.032:.020,t+Math.max(.018,dur*.48));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      src.connect(hp).connect(lp).connect(bp).connect(g).connect(group);src.start(t);src.stop(t+dur+.03);nodes.push(src);
    }
    function ballastBuzz(t,dur,strong=false){
      const buzz=ctx.createOscillator();buzz.type='triangle';buzz.frequency.value=120+rand(-2.5,2.5);
      const harmonic=ctx.createOscillator();harmonic.type='sine';harmonic.frequency.value=240+rand(-4,4);
      const bg=ctx.createGain(),hg=ctx.createGain();
      bg.gain.setValueAtTime(.0001,t);bg.gain.exponentialRampToValueAtTime(strong?.025:.014,t+.025);bg.gain.setValueAtTime(strong?.021:.011,t+Math.max(.04,dur-.06));bg.gain.exponentialRampToValueAtTime(.0001,t+dur);
      hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(strong?.010:.006,t+.018);hg.gain.exponentialRampToValueAtTime(.0001,t+dur*.9);
      buzz.connect(bg).connect(group);harmonic.connect(hg).connect(group);buzz.start(t);harmonic.start(t);buzz.stop(t+dur+.03);harmonic.stop(t+dur+.03);nodes.push(buzz,harmonic);
    }
    click(cursor,true);
    for(let i=0;i<flashes;i++){
      cursor+=rand(.055,.22);
      const dur=rand(.045,.18),strong=i===flashes-1||Math.random()<.28;
      sputter(cursor,dur,strong);
      if(Math.random()<.82)ballastBuzz(cursor,dur+rand(.025,.11),strong);
      if(Math.random()<.65)click(cursor+dur+rand(.015,.07),false);
    }
    if(Math.random()<.62){
      cursor+=rand(.18,.55);click(cursor,true);const hold=rand(.28,.8);sputter(cursor+.02,hold,true);ballastBuzz(cursor+.02,hold,true);
    }
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

  const eventFns={light:fireFluorescentFlicker,rocks:fireRocks,metal:fireMetal,relays:fireRelays};
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
      if(def.mode==='continuous'){const stop=id==='room'?startRoom():startMachinery();S.continuous.set(id,stop);}else scheduleNext(def,true);
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
    document.getElementById('waVolume').addEventListener('input',e=>{
      S.volume=Number(e.target.value);
      localStorage.setItem(STORAGE_VOLUME,String(S.volume));
      if(S.master)S.master.gain.setTargetAtTime(S.volume,S.ctx.currentTime,.03);
      S.mediaLoops.forEach(setMediaVolume);
    });
    renderState();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildUI);else buildUI();
  window.WardenM17Audio={setLayer,trigger,startM17,stopAll,refreshGroupVolume};
})();