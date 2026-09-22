(()=>{
  'use strict';
  function addAudioLink(){
    if(document.getElementById('wardenAudioPageLink')) return true;
    const target=document.querySelector('header .actions')||document.querySelector('header .top')||document.querySelector('.boot-top');
    if(!target) return false;
    const a=document.createElement('a');
    a.id='wardenAudioPageLink';
    a.href='warden-audio.html';
    a.textContent='AUDIO';
    a.className='btn';
    a.style.textDecoration='none';
    a.style.display='inline-flex';
    a.style.alignItems='center';
    a.style.justifyContent='center';
    target.appendChild(a);
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(addAudioLink()||tries>120)clearInterval(timer);},100);
})();
