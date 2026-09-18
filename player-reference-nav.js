(()=>{'use strict';
function install(){
  const nav=document.querySelector('.navrow');
  if(!nav||[...nav.querySelectorAll('a,button')].some(x=>String(x.textContent||'').trim().toUpperCase()==='REFERENCE'))return false;
  const usesButtons=Boolean(nav.querySelector('.navbtn'));
  if(usesButtons){
    const b=document.createElement('button');b.type='button';b.className='navbtn';b.textContent='REFERENCE';b.addEventListener('click',()=>{location.href='player-reference.html'});nav.appendChild(b);
  }else{
    const a=document.createElement('a');a.className='btn';a.href='player-reference.html';a.textContent='REFERENCE';nav.appendChild(a);
  }
  return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
let tries=0,t=setInterval(()=>{tries++;if(install()||tries>30)clearInterval(t)},300);
})();