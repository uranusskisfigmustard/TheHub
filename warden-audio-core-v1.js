(()=>{
  'use strict';
  if(window.WardenAudioCore)return;
  const NativeCtx=window.AudioContext||window.webkitAudioContext;
  if(!NativeCtx)return;

  let nativeCtx=null;
  let upperInput=null,cleanInput=null,upperDry=null,out=null,granularBus=null;
  let recorder=null,silentSink=null;
  let stretching=false;
  let ringL=null,ringR=null,ringPos=0,ringFilled=0;
  const proxies=new Map();

  function ensureCore(){
    if(nativeCtx)return nativeCtx;
    nativeCtx=new NativeCtx();
    const nativeDestination=nativeCtx.destination;

    upperInput=nativeCtx.createGain();
    cleanInput=nativeCtx.createGain();
    upperDry=nativeCtx.createGain();upperDry.gain.value=1;
    granularBus=nativeCtx.createGain();granularBus.gain.value=1;
    out=nativeCtx.createDynamicsCompressor();
    out.threshold.value=-16;out.knee.value=20;out.ratio.value=3;out.attack.value=.008;out.release.value=.42;

    // Familiar M-17 audio: normal path plus rolling capture for DEPTH STRETCH.
    upperInput.connect(upperDry).connect(out);
    granularBus.connect(out);

    // Stage 3+ bypasses the familiar-audio stretch path entirely.
    cleanInput.connect(out);
    out.connect(nativeDestination);

    // Keep roughly ten seconds of the familiar mix in memory. ScriptProcessor is
    // intentionally used here because it remains broadly supported in Chromium and
    // lets this page remain GitHub-only without a separate worklet asset.
    const ringSeconds=10;
    const ringFrames=Math.max(1,Math.floor(nativeCtx.sampleRate*ringSeconds));
    ringL=new Float32Array(ringFrames);
    ringR=new Float32Array(ringFrames);
    recorder=nativeCtx.createScriptProcessor(4096,2,2);
    silentSink=nativeCtx.createGain();silentSink.gain.value=0;
    upperInput.connect(recorder);recorder.connect(silentSink).connect(nativeDestination);
    recorder.onaudioprocess=e=>{
      const input=e.inputBuffer;
      const left=input.numberOfChannels?input.getChannelData(0):null;
      const right=input.numberOfChannels>1?input.getChannelData(1):left;
      if(!left)return;
      for(let i=0;i<left.length;i++){
        ringL[ringPos]=left[i]||0;
        ringR[ringPos]=(right&&right[i])||left[i]||0;
        ringPos=(ringPos+1)%ringL.length;
        ringFilled=Math.min(ringFilled+1,ringL.length);
      }
    };
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

  function recentBuffer(seconds){
    resume();
    const wanted=Math.min(ringFilled,Math.floor(nativeCtx.sampleRate*seconds));
    if(wanted<Math.floor(nativeCtx.sampleRate*.35))return null;
    const b=nativeCtx.createBuffer(2,wanted,nativeCtx.sampleRate);
    const l=b.getChannelData(0),r=b.getChannelData(1);
    let start=(ringPos-wanted+ringL.length)%ringL.length;
    for(let i=0;i<wanted;i++){
      const idx=(start+i)%ringL.length;
      l[i]=ringL[idx];r[i]=ringR[idx];
    }
    return b;
  }

  function scheduleGrain(buffer,when,offset,duration,level,pan){
    const src=nativeCtx.createBufferSource();src.buffer=buffer;
    const g=nativeCtx.createGain();
    const attack=Math.min(.11,duration*.42);
    const release=Math.min(.13,duration*.48);
    g.gain.setValueAtTime(.0001,when);
    g.gain.linearRampToValueAtTime(level,when+attack);
    g.gain.setValueAtTime(level,Math.max(when+attack,when+duration-release));
    g.gain.linearRampToValueAtTime(.0001,when+duration);
    if(nativeCtx.createStereoPanner){
      const p=nativeCtx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));
      src.connect(g).connect(p).connect(granularBus);
    }else src.connect(g).connect(granularBus);
    src.start(when,Math.max(0,Math.min(buffer.duration-.02,offset)),Math.min(duration,buffer.duration-offset));
    try{src.stop(when+duration+.03);}catch(_){ }
    return src;
  }

  function triggerStretch(strength=1){
    resume();
    if(stretching)return 0;
    const intensity=Math.max(.5,Math.min(1.3,Number(strength)||1));
    const captureSeconds=1.55+.65*intensity;
    const buffer=recentBuffer(captureSeconds);
    if(!buffer)return 0;

    const t=nativeCtx.currentTime+.035;
    const stretchFactor=2.15+.75*intensity;
    const eventDuration=Math.min(7.4,buffer.duration*stretchFactor+1.2);
    const grainDur=.28+.08*intensity;
    const outHop=.105+.018*(1.3-intensity);
    const sourceHop=outHop/stretchFactor;
    const level=.22+.07*intensity;
    const sourceSpan=Math.max(.2,buffer.duration-grainDur-.02);
    const grainCount=Math.ceil(eventDuration/outHop)+2;
    stretching=true;

    // Let the stretched capture dominate without fully erasing the living room beneath it.
    upperDry.gain.cancelScheduledValues(t);
    upperDry.gain.setValueAtTime(upperDry.gain.value,t);
    upperDry.gain.linearRampToValueAtTime(.28,t+.55);
    upperDry.gain.setValueAtTime(.28,t+Math.max(.7,eventDuration-.8));
    upperDry.gain.linearRampToValueAtTime(1,t+eventDuration+.25);

    // The capture advances through source time much more slowly than wall-clock time.
    // Long overlapping grains and soft windows create the drawn-out waveform instead
    // of the repeated taps/chop of a conventional delay.
    for(let i=0;i<grainCount;i++){
      const when=t+i*outHop;
      const nominal=i*sourceHop;
      const offset=Math.min(sourceSpan,nominal)+(Math.random()-.5)*.012;
      const drift=(Math.random()-.5)*.16;
      scheduleGrain(buffer,when,Math.max(0,offset),grainDur,level*(.86+Math.random()*.18),drift);
    }

    // A second, quieter grain stream trails slightly behind to widen the space without
    // creating discrete echoes.
    for(let i=0;i<grainCount;i+=2){
      const when=t+.075+i*outHop;
      const nominal=i*sourceHop*.96;
      const offset=Math.min(sourceSpan,nominal)+(Math.random()-.5)*.016;
      scheduleGrain(buffer,when,Math.max(0,offset),grainDur*.92,level*.38,(Math.random()<.5?-1:1)*(.25+Math.random()*.25));
    }

    setTimeout(()=>{stretching=false;},Math.ceil((eventDuration+.4)*1000));
    return eventDuration;
  }

  window.WardenAudioCore={
    bindScope,
    get upperInput(){resume();return upperInput;},
    get cleanInput(){resume();return cleanInput;},
    get stretching(){return stretching;},
    triggerStretch
  };

  bindScope('clean');
})();