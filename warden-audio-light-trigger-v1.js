(()=>{
  'use strict';
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return;
  let ctx=null,master=null;

  function ensure(){
    if(!ctx){
      ctx=new AudioCtx();
      master=ctx.createGain();
      master.gain.value=.55;
      master.connect(ctx.destination);
    }
    if(ctx.state==='suspended')ctx.resume();
    return ctx;
  }

  function noiseBuffer(seconds=7){
    const c=ensure(),len=Math.floor(c.sampleRate*seconds),b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    return b;
  }

  function triggerHum(){
    const c=ensure(),start=c.currentTime+.02,dur=6.5,group=c.createGain();
    group.gain.setValueAtTime(.0001,start);
    group.gain.exponentialRampToValueAtTime(.9,start+.12);
    group.gain.setValueAtTime(.9,start+dur-.45);
    group.gain.exponentialRampToValueAtTime(.0001,start+dur);
    group.connect(master);

    const nodes=[];
    [[60,.003],[120,.0045],[240,.0015]].forEach(([f,v])=>{
      const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.value=v;o.connect(g).connect(group);o.start(start);o.stop(start+dur+.05);nodes.push(o);
    });

    const hiss=c.createBufferSource();hiss.buffer=noiseBuffer(dur+.2);
    const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1400;
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;
    const hg=c.createGain();hg.gain.value=.008;hiss.connect(hp).connect(lp).connect(hg).connect(group);hiss.start(start);hiss.stop(start+dur+.05);nodes.push(hiss);

    const whine=c.createBufferSource();whine.buffer=noiseBuffer(dur+.2);
    const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2850;bp.Q.value=9;
    const wg=c.createGain();wg.gain.value=.0055;whine.connect(bp).connect(wg).connect(group);whine.start(start);whine.stop(start+dur+.05);nodes.push(whine);

    setTimeout(()=>{nodes.forEach(n=>{try{n.stop()}catch(_){}});try{group.disconnect()}catch(_){ }},(dur+.3)*1000);
  }

  function install(){
    const toggle=document.querySelector('[data-audio-layer="light"]');
    if(!toggle)return false;
    const row=toggle.closest('.wa-layer');if(!row)return false;
    if(row.querySelector('[data-light-hum-trigger]'))return true;
    const btn=document.createElement('button');
    btn.className='wa-mini';btn.type='button';btn.textContent='TRIGGER';btn.setAttribute('data-light-hum-trigger','');
    btn.addEventListener('click',()=>{triggerHum();btn.classList.add('fired');setTimeout(()=>btn.classList.remove('fired'),350);});
    row.appendChild(btn);
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer);},100);
})();
