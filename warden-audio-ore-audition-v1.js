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

  function playAnswerBed(mix=.18,rate=.70,hold=5900,fade=2400){
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

  function makeSoftNoiseBuffer(ac,duration){
    const frames=Math.ceil(ac.sampleRate*duration);
    const b=ac.createBuffer(1,frames,ac.sampleRate);
    const d=b.getChannelData(0);
    let slow=0,mid=0;
    for(let i=0;i<frames;i++){
      const w=Math.random()*2-1;
      slow=.996*slow+.004*w;
      mid=.965*mid+.035*w;
      d[i]=w*.12+mid*.42+slow*.46;
    }
    let peak=0;
    for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(d[i]));
    const scale=peak>0?.88/peak:1;
    for(let i=0;i<frames;i++)d[i]*=scale;
    return b;
  }

  function playSoftAquaphone(mode='soft'){
    const ac=audioContext();
    if(!ac)return ()=>{};

    const now=ac.currentTime+.015;
    const dur=mode==='deep'?10.4:9.2;
    const source=ac.createBufferSource();
    source.buffer=makeSoftNoiseBuffer(ac,dur+.4);

    const hp=ac.createBiquadFilter();
    hp.type='highpass';
    hp.frequency.value=mode==='deep'?52:68;
    hp.Q.value=.55;

    const lp=ac.createBiquadFilter();
    lp.type='lowpass';
    lp.frequency.value=mode==='deep'?1650:2250;
    lp.Q.value=.48;

    const body=ac.createGain();
    const wet=ac.createGain();
    const output=ac.createGain();

    source.connect(hp);hp.connect(lp);lp.connect(body);

    // Slow, soft swell. No discrete hits, glints, or granular bursts.
    output.gain.setValueAtTime(.0001,now);
    output.gain.exponentialRampToValueAtTime(masterVolume()*(mode==='deep'?.64:.58),now+1.35);
    output.gain.linearRampToValueAtTime(masterVolume()*(mode==='deep'?.70:.64),now+3.1);
    output.gain.setValueAtTime(masterVolume()*(mode==='deep'?.66:.60),now+(dur-3.0));
    output.gain.exponentialRampToValueAtTime(.0001,now+dur);

    const nodes=[source,hp,lp,body,wet,output];
    const baseBands=mode==='deep'
      ? [
          {f:112,q:3.0,g:.44},{f:177,q:3.5,g:.62},{f:281,q:4.0,g:.69},
          {f:443,q:4.5,g:.55},{f:707,q:5.2,g:.34},{f:1117,q:5.8,g:.18}
        ]
      : [
          {f:146,q:3.0,g:.36},{f:233,q:3.6,g:.56},{f:371,q:4.2,g:.66},
          {f:593,q:4.8,g:.58},{f:941,q:5.4,g:.38},{f:1493,q:6.0,g:.20}
        ];

    baseBands.forEach((b,i)=>{
      const filter=ac.createBiquadFilter();
      filter.type='bandpass';
      const f0=b.f*rand(.988,1.012);
      filter.frequency.setValueAtTime(f0,now);
      filter.frequency.linearRampToValueAtTime(f0*rand(.985,1.015),now+dur);
      filter.Q.value=b.q;

      const gain=ac.createGain();
      gain.gain.value=b.g*rand(.92,1.08);

      if(ac.createStereoPanner){
        const pan=ac.createStereoPanner();
        pan.pan.setValueAtTime(rand(-.28,.28),now);
        pan.pan.linearRampToValueAtTime(rand(-.28,.28),now+dur);
        body.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(wet);
        nodes.push(filter,gain,pan);
      }else{
        body.connect(filter);filter.connect(gain);gain.connect(wet);
        nodes.push(filter,gain);
      }
    });

    // Broad, low mineral body so the sound does not collapse into a glass chime.
    const broad=ac.createBiquadFilter();
    broad.type='bandpass';
    broad.frequency.value=mode==='deep'?190:255;
    broad.Q.value=.72;
    const broadGain=ac.createGain();
    broadGain.gain.value=mode==='deep'?.34:.26;
    body.connect(broad);broad.connect(broadGain);broadGain.connect(wet);
    nodes.push(broad,broadGain);

    // Soft diffusion: very short low-feedback delay, filtered so it reads as depth, not echo.
    const delay=ac.createDelay(.5);
    delay.delayTime.value=mode==='deep'?.165:.135;
    const feedback=ac.createGain();
    feedback.gain.value=.14;
    const feedbackLP=ac.createBiquadFilter();
    feedbackLP.type='lowpass';
    feedbackLP.frequency.value=mode==='deep'?1100:1500;
    wet.connect(output);
    wet.connect(delay);delay.connect(feedbackLP);feedbackLP.connect(feedback);feedback.connect(delay);delay.connect(output);
    nodes.push(delay,feedback,feedbackLP);

    output.connect(ac.destination);

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

  function trigger(id){
    stopAll();

    if(id==='soft'){
      playSoftAquaphone('soft');
    }else if(id==='deep'){
      playSoftAquaphone('deep');
    }else if(id==='body'){
      playSoftAquaphone('soft');
      playAnswerBed(.16,.70,6100,2500);
    }else if(id==='answer'){
      playAnswerBed(.78,.72,4700,1900);
    }

    const b=document.querySelector(`[data-ore-audition="${id}"]`);
    if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),400);}
  }

  const candidates=[
    {id:'soft',label:'A // SOFT AQUAPHONE',desc:'Primary test. Slow glass/mineral swell with softened edges, dark inharmonic resonance, and no discrete chimes.'},
    {id:'deep',label:'B // DARK AQUAPHONE',desc:'Lower and darker version of A. More body, less upper glass, longer decay.'},
    {id:'body',label:'C // AQUAPHONE + DISTANT BODY',desc:'A with the proven ANSWERING PULSE buried very quietly underneath for scale; continuous, not chopped.'},
    {id:'answer',label:'D // ANSWERING PULSE REFERENCE',desc:'Unchanged recorded reply for direct comparison.'}
  ];

  function build(){
    if(document.getElementById('waOreAudition'))return true;
    const stage=document.getElementById('waSignalStage');
    if(!stage)return false;

    const section=document.createElement('div');
    section.id='waOreAudition';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:14px"><span>TEMP // ORE SOURCE AUDITION:</span> <b>SOFT CRYSTALLINE / MINERAL</b></div>
      <small style="display:block;margin:6px 0 10px;opacity:.75">No embeds. All tests use the normal soundboard TRIGGER controls. B from the prior build is retired.</small>
      <div class="wa-grid">
        ${candidates.map(c=>`<div class="wa-layer"><div class="wa-layer-toggle" style="cursor:default"><span><b>${c.label}</b><small>${c.desc}</small></span><span class="wa-state">TEST</span></div><button class="wa-mini" type="button" data-ore-audition="${c.id}">TRIGGER</button></div>`).join('')}
      </div>
      <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-stop" id="waStopOreAudition" type="button">STOP AUDITION</button></div>`;

    stage.insertAdjacentElement('afterend',section);
    section.querySelectorAll('[data-ore-audition]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.oreAudition)));
    document.getElementById('waStopOreAudition').addEventListener('click',stopAll);
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
  window.WardenOreAudition={trigger,stopAll};
})();