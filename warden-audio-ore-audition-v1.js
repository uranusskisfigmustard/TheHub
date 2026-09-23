(()=>{
  'use strict';

  const BODY='https://opengameart.org/sites/default/files/NenadSimic%20-%20Muffled%20Distant%20Explosion.wav';
  const active=new Set();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function masterVolume(){
    const slider=document.getElementById('waVolume');
    const v=slider?Number(slider.value):Number(localStorage.getItem('mothership_warden_audio_volume_v1')||.48);
    return clamp(Number.isFinite(v)?v:.48,0,1);
  }

  function stopAudio(a){
    if(!a)return;
    try{a.pause();a.currentTime=0;}catch(_){ }
    active.delete(a);
  }

  function stopAll(){[...active].forEach(stopAudio);}

  function playBody(){
    stopAll();
    const a=new Audio(BODY);
    a.preload='auto';
    a.volume=clamp(masterVolume()*.92,0,1);
    a.playbackRate=.84;
    try{a.preservesPitch=false;}catch(_){ }
    try{a.mozPreservesPitch=false;}catch(_){ }
    try{a.webkitPreservesPitch=false;}catch(_){ }
    active.add(a);
    const cleanup=()=>active.delete(a);
    a.addEventListener('ended',cleanup,{once:true});
    a.addEventListener('error',cleanup,{once:true});
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(cleanup);
    setTimeout(()=>stopAudio(a),6200);
  }

  function sourceCard(label,desc,id){
    return `
      <div class="wa-layer" style="display:block;padding:10px">
        <div style="margin-bottom:8px"><b>${label}</b><small style="display:block;margin-top:3px">${desc}</small></div>
        <iframe frameborder="0" scrolling="no" loading="lazy" src="https://freesound.org/embed/sound/iframe/${id}/simple/medium/" style="width:100%;max-width:481px;height:86px;border:0" title="${label}"></iframe>
      </div>`;
  }

  function build(){
    if(document.getElementById('waOreAudition'))return true;
    const stage=document.getElementById('waSignalStage');
    if(!stage)return false;

    const section=document.createElement('div');
    section.id='waOreAudition';
    section.innerHTML=`
      <div class="wa-live" style="margin-top:14px"><span>TEMP // ORE SOURCE AUDITION:</span> <b>NON-MAMMAL SOURCES</b></div>
      <div class="wa-grid">
        ${sourceCard('A // ALLIGATOR GROWLS 02','Real CC0 alligator growls/bellow; 9.9 s. Primary reptilian candidate.',527844)}
        ${sourceCard('B // VINTAGE ALLIGATOR GROWL','CC0 low alligator grumble with reverb; 37 s archival source.',437933)}
        ${sourceCard('C // DEEP FROG CROAK','Single CC0 deep frog croak; useful as a short organic texture.',536759)}
        <div class="wa-layer">
          <div class="wa-layer-toggle" style="cursor:default"><span><b>D // LOW LOG-DRUM BODY</b><small>Physical resonance reference only; possible reinforcement layer beneath a biological source.</small></span><span class="wa-state">TEST</span></div>
          <button class="wa-mini" id="waOreBodyTrigger" type="button">TRIGGER</button>
        </div>
      </div>
      <div class="wa-master-row" style="margin-top:8px"><button class="wa-btn wa-stop" id="waStopOreAudition" type="button">STOP LOCAL AUDITION</button></div>
      <small style="display:block;margin-top:6px;opacity:.7">Freesound players control their own playback. STOP LOCAL AUDITION only stops the log-drum reference.</small>`;

    stage.insertAdjacentElement('afterend',section);
    document.getElementById('waOreBodyTrigger').addEventListener('click',playBody);
    document.getElementById('waStopOreAudition').addEventListener('click',stopAll);
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{tries++;if(build()||tries>100)clearInterval(wait);},100);
  window.WardenOreAudition={playBody,stopAll};
})();