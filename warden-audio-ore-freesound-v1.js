(()=>{
'use strict';

const SOURCE_URL='https://freesound.org/people/LilMati/sounds/702805/';
const SOURCE_NAME='Futuristic Inspect Sound, UI, or In-Game Notification.wav';
const SOURCE_SHORT='LilMati // Freesound 702805';

function patch(){
  const stage=document.getElementById('waSignalStage');
  if(!stage)return false;

  const liveLabel=stage.querySelector('.wa-live span');
  if(liveLabel)liveLabel.textContent='GROUP 2 // ORE SIGNAL + RESPONSE:';

  const oreToggle=stage.querySelector('[data-signal-layer="orePulse"]');
  if(oreToggle){
    const title=oreToggle.querySelector('b');
    if(title)title.textContent='ORE SIGNAL';
  }

  const load=document.getElementById('waLoadOreFile');
  if(load)load.textContent='LOAD FUTURISTIC INSPECT WAV';

  const clear=document.getElementById('waClearOreFile');
  if(clear)clear.textContent='CLEAR ORE SIGNAL FILE';

  let sourceButton=document.getElementById('waOreFreesoundSource');
  if(!sourceButton&&load&&load.parentElement){
    sourceButton=document.createElement('button');
    sourceButton.className='wa-btn';
    sourceButton.id='waOreFreesoundSource';
    sourceButton.type='button';
    sourceButton.textContent='OPEN FREESOUND SOURCE';
    sourceButton.addEventListener('click',()=>window.open(SOURCE_URL,'_blank','noopener'));
    clear&&clear.insertAdjacentElement('afterend',sourceButton);
  }

  const status=document.getElementById('waOreSourceStatus');
  const desc=document.getElementById('waOreDesc');
  const input=document.getElementById('waOreFileInput');
  const refresh=()=>{
    const hasLocal=!!(status&&/^LOCAL:/.test(status.textContent||''));
    if(status&&!hasLocal)status.textContent='SOURCE: FREESOUND 702805 // LOAD WAV';
    if(desc)desc.textContent=hasLocal
      ?`${SOURCE_SHORT} — ${SOURCE_NAME}`
      :`${SOURCE_SHORT} — canonical ore cue. Load the downloaded WAV once for this page session.`;
  };
  refresh();

  if(input&&!input.dataset.freesound702805Bound){
    input.dataset.freesound702805Bound='1';
    input.addEventListener('change',()=>setTimeout(refresh,0));
  }
  if(clear&&!clear.dataset.freesound702805Bound){
    clear.dataset.freesound702805Bound='1';
    clear.addEventListener('click',()=>setTimeout(refresh,0));
  }

  const render=window.WardenM17SignalAudio&&window.WardenM17SignalAudio.render;
  if(render&&!window.WardenM17SignalAudio.__freesound702805Patched){
    window.WardenM17SignalAudio.__freesound702805Patched=true;
    window.WardenM17SignalAudio.render=()=>{render();setTimeout(refresh,0);};
  }

  return true;
}

let tries=0;
const timer=setInterval(()=>{tries++;if(patch()||tries>120)clearInterval(timer);},75);
})();