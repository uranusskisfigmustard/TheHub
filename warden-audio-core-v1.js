(()=>{
  'use strict';
  if(window.WardenAudioCore)return;
  const NativeCtx=window.AudioContext||window.webkitAudioContext;
  if(!NativeCtx)return;

  let nativeCtx=null;
  let upperInput=null,cleanInput=null,dry=null,wet=null,out=null;
  let delayA=null,delayB=null,filterA=null,filterB=null,feedbackA=null,feedbackB=null;
  let stretching=false;
  const proxies=new Map();

  function ensureCore(){
    if(nativeCtx)return nativeCtx;
    nativeCtx=new NativeCtx();
    const nativeDestination=nativeCtx.destination;

    upperInput=nativeCtx.createGain();
    cleanInput=nativeCtx.createGain();
    dry=nativeCtx.createGain();dry.gain.value=1;
    wet=nativeCtx.createGain();wet.gain.value=.0001;
    out=nativeCtx.createDynamicsCompressor();
    out.threshold.value=-16;out.knee.value=20;out.ratio.value=3;out.attack.value=.008;out.release.value=.38;

    delayA=nativeCtx.createDelay(2.5);delayA.delayTime.value=.075;
    delayB=nativeCtx.createDelay(3.5);delayB.delayTime.value=.13;
    filterA=nativeCtx.createBiquadFilter();filterA.type='lowpass';filterA.frequency.value=1700;filterA.Q.value=.25;
    filterB=nativeCtx.createBiquadFilter();filterB.type='lowpass';filterB.frequency.value=950;filterB.Q.value=.3;
    feedbackA=nativeCtx.createGain();feedbackA.gain.value=.14;
    feedbackB=nativeCtx.createGain();feedbackB.gain.value=.11;

    // Familiar M-17 audio: eligible for DEPTH STRETCH.
    upperInput.connect(dry).connect(out);
    upperInput.connect(delayA).connect(filterA).connect(wet).connect(out);
    upperInput.connect(delayB).connect(filterB).connect(wet);
    delayA.connect(feedbackA).connect(delayA);
    delayB.connect(feedbackB).connect(delayB);

    // DISLOCATION and everything below it: bypasses DEPTH STRETCH.
    cleanInput.connect(out);
    out.connect(nativeDestination);
    return nativeCtx;
  }

  function proxyFor(scope){
    ensureCore();
    const normalized=scope==='upper'?'upper':'clean';
    if(proxies.has(normalized))return proxies.get(normalized);
    const destination=normalized==='upper'?upperInput:cleanInput;
    const proxy=new Proxy(nativeCtx,{
      get(target,prop){
        if(prop==='destination')return destination;
        const value=Reflect.get(target,prop,target);
        return typeof value==='function'?value.bind(target):value;
      }
    });
    proxies.set(normalized,proxy);
    return proxy;
  }

  function makeScopedConstructor(scope){
    function ScopedAudioContext(){return proxyFor(scope);}
    ScopedAudioContext.prototype=NativeCtx.prototype;
    try{Object.setPrototypeOf(ScopedAudioContext,NativeCtx);}catch(_){ }
    return ScopedAudioContext;
  }

  function bindScope(scope){
    const ctor=makeScopedConstructor(scope);
    window.AudioContext=ctor;
    if(window.webkitAudioContext)window.webkitAudioContext=ctor;
    return ctor;
  }

  function resume(){
    ensureCore();
    if(nativeCtx.state==='suspended')nativeCtx.resume();
    return nativeCtx;
  }

  function triggerStretch(strength=1){
    resume();
    const t=nativeCtx.currentTime;
    const intensity=Math.max(.45,Math.min(1.25,Number(strength)||1));
    const rise=1.2+Math.random()*.9;
    const hold=.65+Math.random()*1.35;
    const release=1.8+Math.random()*1.4;
    const end=t+rise+hold+release;
    stretching=true;

    [dry.gain,wet.gain,delayA.delayTime,delayB.delayTime,filterA.frequency,filterB.frequency,feedbackA.gain,feedbackB.gain].forEach(p=>p.cancelScheduledValues(t));

    dry.gain.setValueAtTime(dry.gain.value,t);
    dry.gain.linearRampToValueAtTime(Math.max(.42,.68-.12*intensity),t+rise);
    dry.gain.setValueAtTime(Math.max(.42,.68-.12*intensity),t+rise+hold);
    dry.gain.linearRampToValueAtTime(1,end);

    wet.gain.setValueAtTime(Math.max(.0001,wet.gain.value),t);
    wet.gain.exponentialRampToValueAtTime(.20+.12*intensity,t+rise);
    wet.gain.setValueAtTime(.20+.12*intensity,t+rise+hold);
    wet.gain.exponentialRampToValueAtTime(.0001,end);

    delayA.delayTime.setValueAtTime(delayA.delayTime.value,t);
    delayA.delayTime.linearRampToValueAtTime(.62+.28*intensity,t+rise);
    delayA.delayTime.linearRampToValueAtTime(1.12+.34*intensity,t+rise+hold);
    delayA.delayTime.linearRampToValueAtTime(.075,end);

    delayB.delayTime.setValueAtTime(delayB.delayTime.value,t);
    delayB.delayTime.linearRampToValueAtTime(1.05+.36*intensity,t+rise);
    delayB.delayTime.linearRampToValueAtTime(1.82+.42*intensity,t+rise+hold);
    delayB.delayTime.linearRampToValueAtTime(.13,end);

    filterA.frequency.setValueAtTime(filterA.frequency.value,t);
    filterA.frequency.exponentialRampToValueAtTime(620,t+rise+hold);
    filterA.frequency.exponentialRampToValueAtTime(1700,end);
    filterB.frequency.setValueAtTime(filterB.frequency.value,t);
    filterB.frequency.exponentialRampToValueAtTime(310,t+rise+hold);
    filterB.frequency.exponentialRampToValueAtTime(950,end);

    feedbackA.gain.setValueAtTime(feedbackA.gain.value,t);feedbackA.gain.linearRampToValueAtTime(.25,t+rise);feedbackA.gain.linearRampToValueAtTime(.14,end);
    feedbackB.gain.setValueAtTime(feedbackB.gain.value,t);feedbackB.gain.linearRampToValueAtTime(.20,t+rise);feedbackB.gain.linearRampToValueAtTime(.11,end);

    setTimeout(()=>{stretching=false;},Math.ceil((end-t)*1000)+100);
    return end-t;
  }

  window.WardenAudioCore={
    bindScope,
    get upperInput(){resume();return upperInput;},
    get cleanInput(){resume();return cleanInput;},
    get stretching(){return stretching;},
    triggerStretch
  };

  // Safe default for anything not explicitly scoped by the page.
  bindScope('clean');
})();