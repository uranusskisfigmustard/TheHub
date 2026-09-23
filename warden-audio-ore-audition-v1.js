(()=>{
  'use strict';

  const STORAGE_VOLUME='mothership_warden_audio_volume_v1';

  // TEMPORARY ORE SOURCE AUDITION BANK — manual only.
  // A: OpenGameArt "T-rex Calls" by CaveboyTup — CC0.
  //    Made from CC0 alligator, lion, and elk samples.
  //    https://opengameart.org/content/t-rex-calls
  const ANIMAL='https://opengameart.org/sites/default/files/t-rex_calls.mp3';

  // B: OpenGameArt "Silent beast growls(4)" by pauliuw — CC0.
  //    https://opengameart.org/content/silent-beast-growls4
  const GROWL='https://opengameart.org/sites/default/files/silent_beast_growl.mp3';

  // C: OpenGameArt "Muffled Distant Explosion" by NenadSimic — CC0.
  //    Low-pitched log drum hit with delayed natural reverberation.
  //    https://opengameart.org/content/muffled-distant-explosion
  const BODY='https://opengameart.org/sites/default/files/NenadSimic%20-%20Muffled%20Distant%20Explosion.wav';

  const candidates=[
    {id:'animal',label:'A // ANIMAL COMPOSITE',desc:'Alligator + lion + elk source; slowed slightly. Organic mass first.',source:ANIMAL,rate:.82,mix:1.0,hold:6200},
    {id:'growl',label:'B // BEAST GROWL',desc:'Simpler organic growl; slowed more heavily. Tests throat/body character.',source:GROWL,rate:.72,mix:1.0,hold:5200},
    {id:'body',label:'C // LOW LOG-DRUM BODY',desc:'Physical resonance only. Tests depth without creature identity.',source:BODY,rate:.84,mix:.92,hold:6200},
    {id:'hybrid',label:'D // ANIMAL + BODY',desc:'Animal composite with quieter log-drum resonance underneath.',hybrid:true}
  ];

  const active=new Set();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem(STORAGE_VOLUME)||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function setRate(a,rate){
    a.playbackRate=rate;
    try{a.preservesPitch=false;}catch(_){ }
    try{a.mozPreservesPitch=false;}catch(_){ }
    try{a.webkitPreservesPitch=false;}catch(_){ }
  }

  function stopAudio(a){
    if(!a)return;
    try{a.pause();a.currentTime=0;}catch(_){ }
    active.delete(a);
  }

  function stopAll(){
    [...active].forEach(stopAudio);
  }

  function playOne(source,rate,mix,holdMs,delayMs=0){
    const a=new Audio(source);
    a.preload='auto';
    a.volume=clamp(masterVolume()*mix,0,1);
    setRate(a,rate);
    active.add(a);

    let timer=null;
    const cleanup=()=>{
      if(timer)clearTimeout(timer);
      active.delete(a);
    };
    a.addEventListener('ended',cleanup,{once:true});
    a.addEventListener('error',cleanup,{once:true});

    const begin=()=>{
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(cleanup);
      timer=setTimeout(()=>stopAudio(a),holdMs);
    };
    if(delayMs>0)setTimeout(begin,delayMs);else begin();
    return a;
  }

  function trigger(id){
    stopAll();
    const c=candidates.find(x=>x.id===id);
    if(!c)return;

    if(c.hybrid){
      playOne(ANIMAL,.84,.82,6400,0);
      playOne(BODY,.72,.46,6400,55);
    }else{
      playOne(c.source,c.rate,c.mix,c.hold,0);
    }

    const b=document.querySelector(`[data-ore-audition="${id}"]`);
    if(b){b.classList.add('fired');setTimeout(()=>b.classList.remove('fired'),400);}
  }

  function bindMaster(){
    const slider=document.getElementById('waVolume');
    if(!slider)return;
    slider.addEventListener('input',()=>{
      // Preserve each candidate's relative mix approximately while auditioning.
      active.forEach(a=>{
        const currentMix=Number(a.dataset.oreAuditionMix||1);
        a.volume=clamp(masterVolume()*currentMix,0,1);
      });
    });
  }

  // Wrap playOne once so master-volume changes retain the intended mix.
  const originalPlayOne=playOne;
  playOne=function(source,rate,mix,holdMs,delayMs=0){
    const a=originalPlayOne(source,rate,mix,holdMs,delayMs);
    a.dataset.oreAuditionMix=String(mix);
    return a;
  };

  function build(){
    if(document.getElementById('waOreAudition'))return true;
    const stage=document.getElementById('waSignalStage');
    if(!stage)return false;

    const section=document.createElement('div');
    section.id='waOreAudition';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:14px"><span>TEMP // ORE SOURCE AUDITION:</span> <b>MANUAL ONLY</b></div>
      <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-stop" id="waStopOreAudition" type="button">STOP AUDITION</button></div>
      <div class="wa-grid">
        ${candidates.map(c=>`<div class="wa-layer"><div class="wa-layer-toggle" style="cursor:default"><span><b>${c.label}</b><small>${c.desc}</small></span><span class="wa-state">TEST</span></div><button class="wa-mini" type="button" data-ore-audition="${c.id}">TRIGGER</button></div>`).join('')}
      </div>`;

    stage.insertAdjacentElement('afterend',section);
    section.querySelectorAll('[data-ore-audition]').forEach(btn=>btn.addEventListener('click',()=>trigger(btn.dataset.oreAudition)));
    document.getElementById('waStopOreAudition').addEventListener('click',stopAll);
    bindMaster();
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);

  window.WardenOreAudition={trigger,stopAll};
})();