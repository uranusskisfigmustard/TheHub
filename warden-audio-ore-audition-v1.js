(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';
  const ANSWER_SAMPLE='https://opengameart.org/sites/default/files/monster_roar.wav';
  const activeMedia=new Set();
  const synthStops=new Set();
  let ctx=null;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function audioContext(){
    try{
      if(!ctx){
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx)return null;
        ctx=new Ctx();
      }
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      return ctx;
    }catch(_){return null;}
  }

  function stopMedia(a){
    if(!a)return;
    try{a.pause();a.currentTime=0;}catch(_){ }
    activeMedia.delete(a);
  }

  function stopAll(){
    [...activeMedia].forEach(stopMedia);
    [...synthStops].forEach(stop=>{try{stop();}catch(_){ }});
    synthStops.clear();
  }

  function setPitch(a,rate){
    a.playbackRate=rate;
    try{a.preservesPitch=false;}catch(_){ }
    try{a.mozPreservesPitch=false;}catch(_){ }
    try{a.webkitPreservesPitch=false;}catch(_){ }
  }

  function playAnswerBed(mix=.55,rate=.72,hold=5200,fade=1900){
    const a=new Audio(ANSWER_SAMPLE);
    a.preload='auto';
    setPitch(a,rate);
    a.volume=clamp(masterVolume()*mix,0,1);
    activeMedia.add(a);
    const cleanup=()=>activeMedia.delete(a);
    a.addEventListener('ended',cleanup,{once:true});
    a.addEventListener('error',cleanup,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(cleanup);

    const holdTimer=setTimeout(()=>{
      const start=performance.now();
      const startVol=a.volume;
      const tick=()=>{
        if(a.paused)return;
        const t=clamp((performance.now()-start)/fade,0,1);
        a.volume=startVol*(1-t);
        if(t<1)requestAnimationFrame(tick);else stopMedia(a);
      };
      requestAnimationFrame(tick);
    },hold);
    a.dataset.oreHold=String(holdTimer);
    return a;
  }

  function makeNoiseBuffer(ac,duration){
    const frames=Math.ceil(ac.sampleRate*duration);
    const b=ac.createBuffer(1,frames,ac.sampleRate);
    const d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<frames;i++){
      const w=Math.random()*2-1;
      brown=.985*brown+.015*w;
      d[i]=(w*.34+brown*.66);
    }
    return b;
  }

  function playMineralLayer(strength='body'){
    const ac=audioContext();
    if(!ac)return ()=>{};
    const now=ac.currentTime+.015;
    const dur=6.4;
    const source=ac.createBufferSource();
    source.buffer=makeNoiseBuffer(ac,dur+.3);

    const output=ac.createGain();
    output.gain.setValueAtTime(.0001,now);
    output.gain.exponentialRampToValueAtTime(masterVolume()*(strength==='body'?.30:.40),now+.45);
    output.gain.setValueAtTime(masterVolume()*(strength==='body'?.28:.36),now+4.7);
    output.gain.exponentialRampToValueAtTime(.0001,now+dur);
    output.connect(ac.destination);

    const nodes=[source,output];
    const bands=strength==='body'
      ? [
          {f:185,q:7,g:.50},{f:307,q:8,g:.58},{f:493,q:9,g:.46},
          {f:823,q:10,g:.31},{f:1319,q:12,g:.18}
        ]
      : [
          {f:233,q:8,g:.30},{f:389,q:9,g:.42},{f:617,q:11,g:.58},
          {f:997,q:13,g:.62},{f:1597,q:15,g:.46},{f:2477,q:17,g:.30}
        ];

    bands.forEach((b,i)=>{
      const filter=ac.createBiquadFilter();
      filter.type='bandpass';
      filter.frequency.value=b.f*rand(.975,1.025);
      filter.Q.value=b.q;
      const gain=ac.createGain();
      gain.gain.value=b.g*rand(.85,1.12);
      const pan=ac.createStereoPanner?ac.createStereoPanner():null;
      if(pan)pan.pan.value=rand(-.52,.52);
      source.connect(filter);
      filter.connect(gain);
      if(pan){gain.connect(pan);pan.connect(output);nodes.push(pan);}else gain.connect(output);
      nodes.push(filter,gain);
    });

    // Sparse irregular fracture glints: noise bursts, not pitched chimes.
    const glints=strength==='body'?4:7;
    for(let i=0;i<glints;i++){
      const filter=ac.createBiquadFilter();
      filter.type='bandpass';
      filter.frequency.value=rand(strength==='body'?700:950,strength==='body'?1900:3300);
      filter.Q.value=rand(10,22);
      const gain=ac.createGain();
      const t=now+rand(.35,5.1);
      gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(rand(.035,.09),t+.02);
      gain.gain.exponentialRampToValueAtTime(.0001,t+rand(.12,.38));
      source.connect(filter);filter.connect(gain);gain.connect(output);
      nodes.push(filter,gain);
    }

    let stopped=false;
    const stop=()=>{
      if(stopped)return;
      stopped=true;
      try{source.stop();}catch(_){ }
      nodes.forEach(n=>{try{n.disconnect();}catch(_){ }});
      synthStops.delete(stop);
    };
    synthStops.add(stop);
    source.onended=stop;
    source.start(now);
    source.stop(now+dur+.05);
    return stop;
  }

  function triggerModel(type){
    stopAll();
    if(type==='mineral'){
      playAnswerBed(.58,.72,5000,1900);
      playMineralLayer('body');
    }else{
      playAnswerBed(.40,.72,5000,1900);
      playMineralLayer('crystal');
    }
    const btn=document.querySelector(`[data-crystal-model="${type}"]`);
    if(btn){btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),400);}
  }

  function sourceCard(label,desc,id){
    return `
      <div class="wa-layer" style="display:block;padding:10px">
        <div style="margin-bottom:8px"><b>${label}</b><small style="display:block;margin-top:3px">${desc}</small></div>
        <iframe frameborder="0" scrolling="no" loading="lazy" src="https://freesound.org/embed/sound/iframe/${id}/simple/medium/" style="width:100%;max-width:481px;height:86px;border:0" title="${label}"></iframe>
      </div>`;
  }

  function modelCard(label,desc,type){
    return `<div class="wa-layer"><div class="wa-layer-toggle" style="cursor:default"><span><b>${label}</b><small>${desc}</small></span><span class="wa-state">MODEL</span></div><button class="wa-mini" type="button" data-crystal-model="${type}">TRIGGER</button></div>`;
  }

  function build(){
    if(document.getElementById('waOreAudition'))return true;
    const stage=document.getElementById('waSignalStage');
    if(!stage)return false;

    const section=document.createElement('div');
    section.id='waOreAudition';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:14px"><span>TEMP // ORE SOURCE AUDITION:</span> <b>CRYSTALLINE / MINERAL</b></div>
      <small style="display:block;margin:6px 0 10px;opacity:.75">New direction: preserve the proven ANSWERING PULSE scale/envelope, replace creature identity with glass/mineral resonance.</small>
      <div class="wa-grid">
        ${sourceCard('A // GLASS AQUAPHONE DRONE','CC0 bowed waterphone + resonant wine-glass source. Raw mineral/glass reference.',322990)}
        ${modelCard('B // MINERAL VOICE MODEL','Same recorded ANSWERING PULSE at 0.72x, quieter, with low inharmonic glass/mineral resonances layered above it.','mineral')}
        ${sourceCard('C // ATONAL CRYSTAL TEXTURE','CC0 granular crystal/glass texture. Raw upper-structure reference.',772279)}
        ${modelCard('D // CRYSTAL STRUCTURE MODEL','Same recorded ANSWERING PULSE reduced further; stronger sparse inharmonic crystalline structure above it.','crystal')}
        ${sourceCard('E // HAUNTING METALLIC DRONE','CC0 extreme-stretched bicycle-bell drone. Dark metallic/mineral reference.',854574)}
      </div>
      <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-stop" id="waStopOreAudition" type="button">STOP MODELS</button></div>
      <small style="display:block;margin-top:6px;opacity:.7">Freesound players control their own playback. STOP MODELS stops B/D only.</small>`;

    stage.insertAdjacentElement('afterend',section);
    section.querySelectorAll('[data-crystal-model]').forEach(btn=>btn.addEventListener('click',()=>triggerModel(btn.dataset.crystalModel)));
    document.getElementById('waStopOreAudition').addEventListener('click',stopAll);
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
  window.WardenOreAudition={triggerModel,stopAll};
})();