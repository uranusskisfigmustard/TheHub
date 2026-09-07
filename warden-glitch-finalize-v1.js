(() => {
'use strict';

const POLICY={
  global:{eventsPerFiveMinutes:[2,4],normalMinimumSpacingSeconds:[30,45],quietPeriodSeconds:[120,180],irregularTiming:true},
  effects:[
    {key:'minor',label:'MINOR FRAMEBUFFER TEAR',weight:18,cooldown:[90,150]},
    {key:'partial',label:'PARTIAL REFRESH',weight:15,cooldown:[120,180]},
    {key:'smear',label:'REFRESH SMEAR',weight:13,cooldown:[120,180]},
    {key:'lineDrop',label:'CLUSTERED MULTI-LINE DROPOUT',weight:11,cooldown:[120,210]},
    {key:'frozen',label:'FROZEN STRIP',weight:8,cooldown:[150,240]},
    {key:'after',label:'PHOSPHOR AFTERIMAGE',weight:10,cooldown:[180,300]},
    {key:'noise',label:'DIGITAL NOISE BURST — NATURAL',weight:9,cooldown:[210,360]},
    {key:'desync',label:'HORIZONTAL LINE DESYNC',weight:7,cooldown:[210,360]},
    {key:'scan',label:'SCANLINE BURST',weight:5,cooldown:[300,480]},
    {key:'roll',label:'ROLLING INTERFERENCE BAND',weight:4,cooldown:[240,420]}
  ]
};
window.HUB_GLITCH_POLICY_V1=Object.freeze(POLICY);

let active=[];
function clearCustom(){while(active.length){try{active.pop().remove()}catch(_){}}}
function clusteredMultiLineDropout(){
  clearCustom();
  const layer=document.createElement('div');
  layer.setAttribute('aria-hidden','true');
  layer.style.cssText='position:fixed;inset:0;z-index:2147483720;pointer-events:none;user-select:none;';
  const base=18+Math.random()*64;
  const offsets=[-3.4,-2.5,-1.7,-.8,0,.9,1.8,2.7,3.6];
  const count=4+Math.floor(Math.random()*3);
  offsets.sort(()=>Math.random()-.5).slice(0,count).sort((a,b)=>a-b).forEach((off,i)=>{
    const line=document.createElement('i');
    const width=76+Math.random()*24;
    const left=Math.random()*(100-width);
    line.style.cssText=`position:absolute;display:block;left:${left}vw;width:${width}vw;top:${Math.max(4,Math.min(96,base+off))}vh;height:${1+Math.floor(Math.random()*2)}px;background:#050607;opacity:.92;animation:wggClusterLine ${360+Math.floor(Math.random()*180)}ms steps(6,end) ${i*13}ms both;`;
    layer.appendChild(line);
  });
  document.body.appendChild(layer);active.push(layer);
  setTimeout(()=>{try{layer.remove()}catch(_){};active=active.filter(x=>x!==layer)},650);
}

function installStyle(){
  if(document.getElementById('wardenGlitchFinalizeV1Style'))return;
  const s=document.createElement('style');s.id='wardenGlitchFinalizeV1Style';s.textContent=`
    @keyframes wggClusterLine{0%,100%{opacity:0;transform:translateX(0)}10%{opacity:.98}28%{opacity:.58;transform:translateX(2px)}42%{opacity:.95;transform:translateX(-1px)}63%{opacity:.35}78%{opacity:.88;transform:translateX(1px)}90%{opacity:.25}}
    #wardenGlitchCurationV2 details.wgg-details{border:0;padding:0;margin:0}
    #wardenGlitchCurationV2 summary.wgg-summary{cursor:pointer;list-style:none;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 0 4px}
    #wardenGlitchCurationV2 summary.wgg-summary::-webkit-details-marker{display:none}
    #wardenGlitchCurationV2 summary.wgg-summary::before{content:'▸ ';color:var(--accent)}
    #wardenGlitchCurationV2 details[open] summary.wgg-summary::before{content:'▾ '}
    #wardenGlitchCurationV2 .wgg-policy{margin:9px 0 12px;padding:9px 10px;border-left:2px solid var(--line);color:var(--muted);font-size:.7rem;line-height:1.45}
    #wardenGlitchCurationV2 .wgg-frequency{margin-top:7px;color:var(--accent);font-size:.66rem;letter-spacing:.02em}
  `;document.head.appendChild(s)
}

function finalizePanel(){
  const panel=document.getElementById('wardenGlitchCurationV2');
  if(!panel||panel.dataset.finalized==='1')return !!panel;
  panel.dataset.finalized='1';

  const flyback=panel.querySelector('[data-key="flyback"]');
  if(flyback)flyback.closest('.wgv2-card')?.remove();

  const lineDrop=panel.querySelector('[data-key="lineDrop"]');
  if(lineDrop){
    lineDrop.textContent='CLUSTERED MULTI-LINE DROPOUT';
    const desc=lineDrop.closest('.wgv2-card')?.querySelector('.wgv2-desc');
    if(desc)desc.textContent='Several nearby horizontal rows fail together, with small gaps between them so the cluster reads clearly without becoming one solid band.';
  }

  panel.querySelectorAll('.wgv2-card').forEach(card=>{
    const btn=card.querySelector('[data-key]');if(!btn)return;
    const spec=POLICY.effects.find(x=>x.key===btn.dataset.key);if(!spec)return;
    const note=document.createElement('div');note.className='wgg-frequency';
    note.textContent=`AUTO WEIGHT ${spec.weight}% // COOLDOWN ${spec.cooldown[0]}–${spec.cooldown[1]} SEC`;
    card.appendChild(note);
  });

  const title=panel.querySelector('h2');if(title)title.remove();
  const note=panel.querySelector('.wgv2-note');
  if(note)note.textContent='Ten approved effects. Automatic use is intentionally sparse and irregular; this panel is retained only for Warden-side testing.';

  const details=document.createElement('details');details.className='wgg-details';
  const summary=document.createElement('summary');summary.className='wgg-summary';summary.textContent='Glitch Preview — Approved Effects';
  const body=document.createElement('div');body.className='wgg-body';
  while(panel.firstChild)body.appendChild(panel.firstChild);
  const policy=document.createElement('div');policy.className='wgg-policy';policy.textContent='AUTOMATIC POLICY // 2–4 events per 5 minutes // normally at least 30–45 seconds apart // occasional 2–3 minute quiet periods // weighted selection // individual effect cooldowns // no manual-only event pool.';
  body.insertBefore(policy,body.firstChild?.nextSibling||body.firstChild);
  details.append(summary,body);panel.appendChild(details);
  return true;
}

installStyle();
// Capture the visible V2 button before its delegation reaches the older single-line implementation.
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#wardenGlitchCurationV2 [data-key="lineDrop"]');
  if(b){e.preventDefault();e.stopImmediatePropagation();clusteredMultiLineDropout();return}
  if(e.target.closest?.('#wardenGlitchCurationV2 [data-reset]'))clearCustom();
},true);

if(!finalizePanel()){
  let tries=0;const id=setInterval(()=>{tries++;if(finalizePanel()||tries>60)clearInterval(id)},200);
}
})();