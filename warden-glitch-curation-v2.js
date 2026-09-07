(() => {
'use strict';
const PANEL_ID='wardenGlitchCurationV2',STYLE_ID='wardenGlitchCurationV2Styles';
const GROUPS={
  frequent:[
    ['approved','minor','MINOR FRAMEBUFFER TEAR','Best default fault: quick, localized, readable, and believable.'],
    ['approved','partial','PARTIAL REFRESH','Strong everyday failure: part of a region refreshes before the rest catches up.'],
    ['approved','smear','REFRESH SMEAR','Short-lived image trail; visible without interrupting reading.'],
    ['candidate','lineDrop','INTERMITTENT SINGLE-LINE DROPOUT','One to three horizontal rows disappear irregularly and return.'],
    ['approved','frozen','FROZEN STRIP','A horizontal region briefly holds an older frame; deliberately subtle.']
  ],
  occasional:[
    ['approved','after','PHOSPHOR AFTERIMAGE','Distinctive Mothership character without looking like overt glitch art.'],
    ['approved','noise','DIGITAL NOISE BURST — NATURAL','Clustered, time-varying interference with irregular streaks and dropout.'],
    ['candidate','desync','HORIZONTAL LINE DESYNC','Several scan rows shift independently and briefly warp a slice of the image.'],
    ['approved','scan','SCANLINE BURST','A dense interference band sweeps through part of the display.']
  ],
  rare:[
    ['approved','flyback','FLYBACK / RETRACE LINES','Strong CRT signature; best when uncommon enough to remain noticeable.'],
    ['candidate','reacquire','SIGNAL REACQUISITION','Image softens, shifts slightly, and then locks back into a stable picture.']
  ],
  removed:[
    ['candidate','ghost','LOCALIZED GHOST LAG','REMOVED for overlap with Phosphor Afterimage and Refresh Smear. Test-only comparison.'],
    ['candidate','roll','ROLLING INTERFERENCE BAND','REMOVED for overlap with Scanline Burst and Digital Noise Burst — Natural. Test-only comparison.'],
    ['candidate','stutter','MICRO-STUTTER REDRAW','REMOVED for overlap with Partial Refresh and Frozen Strip. Test-only comparison.']
  ]
};
function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    #wardenGlitchCurationV1{display:none!important}
    #${PANEL_ID}{position:relative}
    #${PANEL_ID} .wgv2-note{color:var(--muted);font-size:.78rem;margin:-4px 0 12px;max-width:950px}
    #${PANEL_ID} .wgv2-head{margin:17px 0 5px;color:var(--accent);font-size:.74rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
    #${PANEL_ID} .wgv2-rule{color:var(--muted);font-size:.7rem;margin-bottom:9px}
    #${PANEL_ID} .wgv2-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}
    #${PANEL_ID} .wgv2-card{border:1px solid var(--line);background:var(--panel2);padding:10px;min-width:0}
    #${PANEL_ID} .wgv2-card .btn{width:100%;text-align:left;padding:7px 9px;font-size:.72rem}
    #${PANEL_ID} .wgv2-desc{margin-top:6px;color:var(--muted);font-size:.69rem;line-height:1.35}
    #${PANEL_ID} .wgv2-removed .wgv2-card{opacity:.72;border-style:dashed}
    #${PANEL_ID} .wgv2-removed .btn{border-color:var(--muted)}
    #${PANEL_ID} .wgv2-reset{margin-top:11px;display:flex;justify-content:flex-end}
  `;document.head.appendChild(s)
}
function sourceButton(kind,key){
  const root=document.getElementById('wardenGlitchCurationV1');
  if(!root)return null;
  return root.querySelector(kind==='approved'?`[data-approved="${key}"]`:`[data-candidate="${key}"]`)
}
function fire(kind,key){
  const b=sourceButton(kind,key);if(b)b.click();
}
function card(item){
  const [kind,key,label,desc]=item;
  return `<div class="wgv2-card"><button class="btn primary" data-kind="${kind}" data-key="${key}">${label}</button><div class="wgv2-desc">${desc}</div></div>`
}
function install(){
  if(document.getElementById(PANEL_ID))return true;
  const consoleEl=document.getElementById('console'),old=document.getElementById('wardenGlitchCurationV1');
  if(!consoleEl||!old)return false;
  const p=document.createElement('section');p.id=PANEL_ID;p.className='panel';
  p.innerHTML=`
    <h2>Glitch Preview — Recommended Automatic Pool</h2>
    <div class="wgv2-note">WARDEN-ONLY evaluation panel. Eleven effects remain in the recommended automatic pool. Within each automatic group, effects are ordered left-to-right from most recommended to least recommended. Timing rules approved for eventual player use: irregular spacing, usually 2–4 events per 5 minutes, normally at least 30–45 seconds apart, occasional 2–3 minute quiet periods, and per-effect cooldowns to prevent obvious repetition.</div>
    <div class="wgv2-head">Frequent / Subtle</div>
    <div class="wgv2-rule">Primary automatic vocabulary. Target weighting: about 65% of glitch events.</div>
    <div class="wgv2-grid">${GROUPS.frequent.map(card).join('')}</div>
    <div class="wgv2-head">Occasional</div>
    <div class="wgv2-rule">Noticeable punctuation without dominating the interface. Target weighting: about 25%.</div>
    <div class="wgv2-grid">${GROUPS.occasional.map(card).join('')}</div>
    <div class="wgv2-head">Rare / Severe</div>
    <div class="wgv2-rule">Characterful failures that should remain uncommon. Target weighting: about 10%.</div>
    <div class="wgv2-grid">${GROUPS.rare.map(card).join('')}</div>
    <div class="wgv2-head">Removed — Test Only</div>
    <div class="wgv2-rule">Excluded from the recommended automatic pool because they overlap with stronger retained effects. Buttons remain only for direct Warden-side comparison.</div>
    <div class="wgv2-grid wgv2-removed">${GROUPS.removed.map(card).join('')}</div>
    <div class="wgv2-reset"><button class="btn danger mini" data-reset>RESET TEST EFFECTS</button></div>`;
  old.insertAdjacentElement('afterend',p);
  p.addEventListener('click',e=>{
    const b=e.target.closest('[data-kind][data-key]');
    if(b){fire(b.dataset.kind,b.dataset.key);return}
    if(e.target.closest('[data-reset]')){
      const r=sourceButton('candidate','reset')||sourceButton('approved','reset');
      if(r)r.click();
    }
  });
  return true
}
installStyles();
if(!install()){let tries=0;const id=setInterval(()=>{tries++;if(install()||tries>60)clearInterval(id)},200)}
})();