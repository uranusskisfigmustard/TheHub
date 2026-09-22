(()=>{
  'use strict';

  function relabel(){
    const roomBtn=document.querySelector('[data-audio-layer="room"]');
    const machineryBtn=document.querySelector('[data-audio-layer="machinery"]');
    if(!roomBtn||!machineryBtn)return false;

    const roomLabel=roomBtn.querySelector('b');
    const roomDesc=roomBtn.querySelector('small');
    const machineryLabel=machineryBtn.querySelector('b');
    const machineryDesc=machineryBtn.querySelector('small');

    if(roomLabel)roomLabel.textContent='HEAVY MACHINERY';
    if(roomDesc)roomDesc.textContent='Ventilation, motors, loaded bearings, and audible industrial machinery wash';
    if(machineryLabel)machineryLabel.textContent='ROOM BED';
    if(machineryDesc)machineryDesc.textContent='Low industrial pressure, distant plant vibration, and background mechanical rumble';

    const live=document.getElementById('waLive');
    if(live&&!live.dataset.roleSwapBound){
      live.dataset.roleSwapBound='1';
      const rewrite=()=>{
        const parts=live.textContent.split(' + ').map(x=>x.trim()).filter(Boolean);
        const mapped=parts.map(x=>x==='ROOM BED'?'HEAVY MACHINERY':x==='HEAVY MACHINERY'?'ROOM BED':x);
        const next=mapped.join(' + ');
        if(next!==live.textContent)live.textContent=next;
      };
      const observer=new MutationObserver(rewrite);
      observer.observe(live,{childList:true,characterData:true,subtree:true});
      rewrite();
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(relabel()||tries>120)clearInterval(timer);
  },100);
})();
