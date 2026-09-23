(()=>{
  'use strict';

  // Retirement shim: METAL / CHUTE was removed from the live soundboard.
  // The base Stage 1 file still knows the legacy id, so this shim disables it,
  // removes its UI row, and prevents START M-17 from re-arming it.
  let installed=false;

  function install(){
    if(installed)return true;
    const api=window.WardenM17Audio;
    const metalToggle=document.querySelector('[data-audio-layer="metal"]');
    if(!api||!metalToggle)return false;

    const baseSetLayer=api.setLayer.bind(api);
    const baseTrigger=api.trigger.bind(api);
    const baseStartM17=api.startM17.bind(api);

    try{baseSetLayer('metal',false);}catch(_){ }

    const row=metalToggle.closest('.wa-layer');
    if(row)row.remove();

    api.setLayer=(id,on)=>{
      if(id==='metal')return;
      return baseSetLayer(id,on);
    };
    api.trigger=id=>{
      if(id==='metal')return;
      return baseTrigger(id);
    };
    api.startM17=()=>{
      baseStartM17();
      try{baseSetLayer('metal',false);}catch(_){ }
    };

    installed=true;
    return true;
  }

  let tries=0;
  const wait=setInterval(()=>{
    tries++;
    if(install()||tries>120)clearInterval(wait);
  },75);
})();