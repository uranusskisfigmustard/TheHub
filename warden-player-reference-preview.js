(() => {
'use strict';

const $ = id => document.getElementById(id);

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

const CATEGORIES = [
  {
    key:'campaign',
    title:'Campaign Rules',
    description:'Rules that follow the PCs wherever the campaign goes.',
    sections:[
      {
        status:'CURRENT',
        title:'Survival & Damage',
        items:[
          ['Impenetrable Wounds',[
            'Damage does not carry over after you receive a Wound.'
          ]],
          ['Resolve',[
            'At the start of each session, each PC gains 1 Resolve.',
            'Spend Resolve to reroll any roll you make.',
            'Unused Resolve is lost at the end of the session. Resolve does not accumulate.'
          ]],
          ['Heroic Action on Going Down',[
            'When a Death Save is made for your PC and the result is still hidden, you may take one final action before the Death Save is revealed.',
            'The action must delay or stall an immediate threat, or help or support another character.',
            'Resolve the action normally if meaningful uncertainty remains.',
            'The action cannot prevent, alter, reroll, or reveal the Death Save. It does not keep your PC active beyond this one action.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Roleplay Resolution',
        items:[
          ['Social Exchanges',[
            'Ordinary social exchanges are handled through conversation and established fiction, not a generic social Check.',
            'You may lie without making a Check.',
            'What an NPC accepts, doubts, remembers, or later discovers depends on what was said, what they know, available evidence, circumstances, and later events.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Recovery & Training',
        items:[
          ['Major Injury Recovery — Uncomplicated Fracture Baseline',[
            'An uncomplicated fracture does not disappear when Health is restored.',
            'After competent ordinary treatment, its listed mechanical penalty remains through one full subsequent session.',
            'If recovery stays uncomplicated, the penalty ends after the following downtime and the associated Wound clears at about four in-game weeks from the injury.',
            'During recovery, a Critical Failure on a strenuous action that directly loads the injured body part causes 1d5 Health and delays recovery by one downtime interval.',
            'Ordinary failure does not automatically reinjure you. More severe injuries, complications, and specialist procedures may use different recovery terms.',
            'Compatible permanent Skill training may continue during recovery.'
          ]],
          ['Rapid Skill Learning',[
            'Permanent Skill training is measured in completed sessions: Trained 3, Expert 5, Master 10.',
            'You may have one permanent Skill-training project active at a time.',
            'Prerequisite Skills and normal material requirements still apply.',
            'Training does not remove your character from play.'
          ]]
        ]
      }
    ]
  },
  {
    key:'inworld',
    title:'In-World Rules',
    description:'Systems the PCs encounter through work, money, housing, access, equipment, medicine, and ownership.',
    sections:[
      {
        status:'CURRENT',
        title:'Work & Mission Board',
        items:[
          ['Requirement Levels',[
            '<strong>OPEN</strong> — Ordinary access and assignment conditions are enough. Listed Skills are useful, not prerequisites.',
            '<strong>PREFERRED</strong> — The employer prefers the listed competence, but relevant experience, adjacent Skills, reputation, sponsorship, or equivalent standing may be accepted.',
            '<strong>REQUIRED</strong> — The contracted team must cover the stated professional qualification for the responsible work. If the contract allows it, a qualified partner or subcontractor may cover the requirement.',
            '<strong>REGULATED</strong> — The responsible role requires the stated formal license, certification, credential, or valid temporary authorization. A related Skill alone is not enough.'
          ]],
          ['Other Posting Terms',[
            '<strong>GOOD FIT</strong> — Skills likely to be useful on the job. This is guidance, not a requirement.',
            '<strong>PREFERRED SKILLS</strong> — Skills the employer would like the crew to have.',
            '<strong>REQUIRED SKILLS</strong> — Skills the posting actually requires.',
            '<strong>+1 Stress</strong> — The listed work carries the stated +1 Stress cost when this appears on the posting.'
          ]],
          ['Work Type',[
            '<strong>Routine Shift / Filler</strong> — Short, ordinary work with limited scope.',
            '<strong>Short Skilled Contract</strong> — A bounded job that calls for specific useful competence.',
            '<strong>Substantial Local Contract</strong> — A larger local job with multiple meaningful tasks or responsibilities.',
            '<strong>Hazardous / Specialist Local Mission</strong> — Local work involving significant hazard, specialist responsibility, or both.',
            '<strong>Urgent / Exceptional Response</strong> — Time-sensitive or exceptional work where delay or failure carries unusually serious consequences.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Qualifications & Access',
        items:[
          ['Professional Qualifications',[
            'Professional standing is not a Mothership Skill.',
            'A standing covers only its recognized endorsements or scopes. Holding the broader standing does not grant every endorsement under it.',
            'Standing does not automatically grant a license, weapons authority, detention authority, work-floor access, equipment release, cargo custody, shipboard authority, or another separately controlled privilege.'
          ]],
          ['Cross-District Work Eligibility',[
            'Cross-District Work Eligibility allows ordinary cross-district movement and named work where the receiving district or worksite permits it.',
            'It is not universal access.',
            'It does not automatically grant docks, operational vessels, controlled freight, armories, detention areas, outbound travel, or unrelated employer work floors.',
            'Identity, work eligibility, professional standing, licenses, assignment authority, and physical access are separate.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Housing & Rest',
        items:[
          ['Tier 0 — Unsafe or Disrupted Shelter',[
            'Disadvantage on the Rest Save.',
            'On a successful Save, reduce the rolled Stress recovery by 1, minimum 1.',
            'Meaningful rest may be impossible during active danger.'
          ]],
          ['Tier 1 — Barracks',[
            'Shared open-bay or bunk-room sleeping with limited storage and primarily shared daily facilities.',
            'Disadvantage on the Rest Save.',
            'Normal rolled Stress recovery on a successful Save.'
          ]],
          ['Tier 2 — Dorm-Style Secure Basic Quarters',[
            'Assigned individual or paired sleeping rooms inside a shared housing block, with shared daily facilities and common space.',
            'Normal Rest Save and normal Stress recovery.',
            'C-17 is currently Tier 2.'
          ]],
          ['Tier 3 — Comfortable Private Quarters',[
            'Self-contained apartment-scale housing with private food-prep space and a private toilet/washbasin. Some facilities may still be shared.',
            'Advantage on the Rest Save.',
            'Normal rolled Stress recovery, minimum 2.'
          ]],
          ['Tier 4 — High-Quality Restorative Quarters',[
            'Advantage on the Rest Save.',
            'Normal rolled Stress recovery +1, minimum 2.'
          ]],
          ['Rest Quality Limits',[
            'Rest Quality changes routine Stress recovery only.',
            'It does not replace Shore Leave, medical treatment, trauma recovery, Health recovery, or Wound treatment.',
            'Current C-17 support costs 300cr per PC per week.',
            'Other housing prices, vacancies, deposits, guarantees, and property terms depend on the actual property.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Money, Debt & Purchases',
        items:[
          ['Recovery Debt',[
            'Mandatory withholding is 40% while your recovery-debt balance is above 12,000cr.',
            'At 12,000cr or less, withholding falls to 25%. At 6,000cr or less, it falls to 10%.',
            'Recovery-debt interest is 1% per qualifying four-week interval while the qualifying balance remains above 12,000cr. Interest does not compound.',
            'Payments apply to principal first. Accrued interest is paid after principal reaches zero.',
            'You may make an Additional Payment at any time without penalty.',
            'Recovery debt, medical debt, fines, liens, equipment liability, and private loans are separate obligations.',
            'Recovery debt alone does not remove emergency care, public transit, ordinary civic access, job seeking, or the right to dispute an incorrect charge.'
          ]],
          ['Cash Advances & Purchases',[
            'Classifieds purchases are cash-on-hand unless the listing says otherwise.',
            'Seller financing or an automatic purchase shortfall is not assumed.',
            'A permitted Cash Advance is a separate transaction taken before a purchase.',
            'A Cash Advance increases recovery-debt principal and Personal Balance by the same amount. The purchase then spends that cash normally.',
            'Borrowing, purchase, repair, certification, installation, and legal authorization are separate events.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Downtime & Extra Work',
        items:[
          ['Downtime',[
            'Campaign time normally advances with real time between sessions unless the fiction changes it.',
            'Downtime can be spent on ordinary work, training, treatment, recovery, investigation, faction service, equipment work, or other projects.',
            'Time spent on a project normally cannot also be ordinary paid work unless that activity is itself paid.',
            'Ordinary Hub employment pays 50% of the normal Skill-derived monthly salary.',
            'Mission pay and ordinary wages are separate. Living costs are charged once per elapsed week, not once per income source.'
          ]],
          ['Overtime & Weekend Work',[
            '<strong>Weekday OT:</strong> up to 4 hours after a normal workday. A full 4-hour block pays one ordinary daily wage and adds +1 Extra-Work Load.',
            '<strong>Weekend shift:</strong> 8 hours at 2× the ordinary daily wage and adds +2 Extra-Work Load.',
            '<strong>Exceptional weekend extension:</strong> up to 4 additional hours at 4× the ordinary hourly wage and adds +1 Extra-Work Load. A full extension pays two ordinary daily wages; a full 12-hour weekend day pays four ordinary daily wages total.'
          ]],
          ['Extra-Work Load',[
            '<strong>0–1:</strong> No consequence.',
            '<strong>2–3:</strong> +1 Stress.',
            '<strong>4–5:</strong> +1 Stress and Disadvantage on the next Rest Save.',
            '<strong>6+:</strong> +2 Stress and Disadvantage on the next Rest Save.',
            'One full nonworking recovery day before the next mission removes the Rest Save Disadvantage, but not Stress already gained.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Reputation & Equipment',
        items:[
          ['Reputation Evidence',[
            'Reputation evidence is institution-specific.',
            'The tracked dimensions are Reliability, Safety, Worker Fairness, Discretion, and Legal / Commercial.',
            'Evidence states are Concern, Unproven, Demonstrated, Trusted, and Exceptional.',
            'These are evidence states, not universal roll bonuses.',
            'Good evidence can support eligibility, introductions, trust, or better terms. It does not automatically grant credentials, money, equipment, housing, or access.'
          ]],
          ['Equipment Access',[
            'Stock, permission to purchase, and permission to carry or use are separate.',
            'A Skill does not automatically grant a certification, license, work order, controlled-route access, district access, dock access, shipboard role, weapons permit, or equipment ownership.',
            'Routine living essentials are covered by living costs unless scarcity makes them consequential.',
            'Consumables are tracked when they are meaningfully used, lost, damaged, contaminated, or depleted.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Restorative Prosthetics — Grades 0–3',
        items:[
          ['Current Player-Facing Boundary',[
            'Grades 0–3 are restorative or adaptive systems.',
            'They use 0 cyberware slots and normally do not use the cybermod malfunction table when installed and maintained through legitimate care.',
            'Restorative prosthetics restore or approximate ordinary human capability rather than granting a broad bonus.',
            'Exact capabilities, surgery, rehabilitation, cost, and limitations are item-specific.',
            'Grade 4+ augmentation rules are not part of the current player reference.'
          ]]
        ]
      },
      {
        status:'CURRENT',
        title:'Productive Assets — Basic Rule',
        items:[
          ['Ownership & Productivity',[
            'Recovering, inspecting, or repairing something does not by itself make it yours.',
            'A Productive Asset normally needs lawful title or acquisition, rehabilitation or certification where required, and productive placement or an operator before it provides a durable benefit.',
            'An asset you own can still be incomplete, nonfunctional, uncertified, or nonproductive.'
          ]]
        ]
      },
      {
        status:'NEXT',
        title:'Productive Asset Operation & Disposition',
        items:[
          ['Publish when acquisition becomes an active choice or occurs',[
            'Rehabilitation or activation.',
            'Required inspection or certification.',
            'Operator or placement arrangements.',
            'Operating costs and responsibilities.',
            'Distributions, offsets, or other benefits once the asset is actually productive.',
            'Lawful sale, transfer, cannibalization, or liquidation.',
            'Asset-specific terms are disclosed when known. Hidden valuation formulas and internal economic bands remain Warden-only.'
          ]]
        ]
      },
      {
        status:'NEXT',
        title:'Grade 3 Prosthetic Treatment, Financing & Recovery',
        items:[
          ['Publish when Prudence begins seriously evaluating, financing, or scheduling the known Grade 3 restorative option',[
            'The exact prosthesis and what function it restores.',
            'Price and any disclosed financing or service-credit options.',
            'Provider and procedure requirements.',
            'Surgery and rehabilitation time.',
            'Temporary recovery restrictions.',
            'Interaction with existing treatment where applicable.',
            'Do not publish Grade 4+ augmentation rules merely because a Grade 3 restorative option is available.'
          ]]
        ]
      }
    ]
  }
];

function installStyles(){
  if($('wardenPlayerReferencePreviewStyles')) return;
  const s=document.createElement('style');
  s.id='wardenPlayerReferencePreviewStyles';
  s.textContent=`
    #playerReferencePreview{margin-top:0}
    .wc-ref-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:12px}
    .wc-ref-head h2{margin:0 0 4px!important}
    .wc-ref-kicker{color:var(--accent);font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .wc-ref-note{max-width:780px;color:var(--muted);font-size:.78rem}
    .wc-ref-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0 10px}
    .wc-ref-tab{border:1px solid var(--line);background:#15191c;color:var(--muted);padding:8px 11px;font:inherit;font-size:.72rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase}
    .wc-ref-tab:hover{border-color:var(--accent);color:var(--text)}
    .wc-ref-tab.active{border-color:var(--accent);background:rgba(212,168,75,.13);color:var(--text)}
    .wc-ref-category-note{margin:0 0 10px;color:var(--muted);font-size:.76rem}
    .wc-ref-category.hidden{display:none!important}
    .wc-ref-section{border:1px solid var(--line);background:var(--panel2);margin:0 0 8px}
    .wc-ref-toggle{width:100%;border:0;background:#171b1f;color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;text-align:left;font:inherit;cursor:pointer}
    .wc-ref-toggle:hover{background:#1d2226}
    .wc-ref-toggle-main{min-width:0;display:flex;align-items:center;gap:8px}
    .wc-ref-arrow{color:var(--accent);width:1em;flex:0 0 auto}
    .wc-ref-section-title{font-size:.8rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase}
    .wc-ref-status{flex:0 0 auto;border:1px solid var(--line);padding:2px 6px;border-radius:9px;color:var(--muted);font-size:.61rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .wc-ref-status.next{border-color:#607480;color:#b6c4cb}
    .wc-ref-body{padding:0 12px 11px}
    .wc-ref-section:not(.open) .wc-ref-body{display:none}
    .wc-ref-item{border-top:1px solid #303538;padding:9px 0}
    .wc-ref-item:first-child{border-top:0}
    .wc-ref-item:last-child{padding-bottom:0}
    .wc-ref-item h4{margin:0 0 5px;font-size:.8rem;color:#e7e4dc}
    .wc-ref-item p{margin:4px 0;color:#d0cdc5;font-size:.78rem;line-height:1.5}
    .wc-ref-item strong{color:var(--accent)}
    .wc-ref-next-divider{margin:16px 0 8px;padding:7px 9px;border-left:3px solid #607480;background:#15191c;color:#bcc6cc;font-size:.75rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .wc-ref-next-note{margin:0 0 8px;color:#aeb9bf;font-size:.72rem}
    @media(max-width:760px){
      .wc-ref-head{gap:8px}
      .wc-ref-tabs{display:grid;grid-template-columns:1fr 1fr}
      .wc-ref-tab{padding:9px 7px;font-size:.67rem}
      .wc-ref-toggle{padding:10px}
      .wc-ref-body{padding:0 10px 10px}
      .wc-ref-item p{font-size:.76rem}
    }
  `;
  document.head.appendChild(s);
}

function renderSection(section){
  const items=section.items.map(([title,paras]) =>
    `<div class="wc-ref-item"><h4>${esc(title)}</h4>${paras.map(p=>`<p>${p}</p>`).join('')}</div>`
  ).join('');
  return `<section class="wc-ref-section" data-ref-status="${section.status}">
    <button type="button" class="wc-ref-toggle" aria-expanded="false">
      <span class="wc-ref-toggle-main"><span class="wc-ref-arrow">▸</span><span class="wc-ref-section-title">${esc(section.title)}</span></span>
      <span class="wc-ref-status ${section.status==='NEXT'?'next':''}">${section.status==='NEXT'?'Next':'Current'}</span>
    </button>
    <div class="wc-ref-body">${items}</div>
  </section>`;
}

function renderCategory(category){
  const current=category.sections.filter(s=>s.status==='CURRENT').map(renderSection).join('');
  const next=category.sections.filter(s=>s.status==='NEXT');
  const nextBlock=next.length
    ? `<div class="wc-ref-next-divider">Next — Hold Until the Choice Becomes Active</div>
       <div class="wc-ref-next-note">These entries are queued for later player publication and are not part of the initial release.</div>
       ${next.map(renderSection).join('')}`
    : '';
  return `<div class="wc-ref-category ${category.key==='campaign'?'':'hidden'}" data-ref-category="${category.key}">
    <div class="wc-ref-category-note">${esc(category.description)}</div>
    ${current}${nextBlock}
  </div>`;
}

function bindSectionToggles(panel){
  panel.querySelectorAll('.wc-ref-toggle').forEach(btn=>btn.addEventListener('click',()=>{
    const section=btn.closest('.wc-ref-section');
    const open=!section.classList.contains('open');
    section.classList.toggle('open',open);
    btn.setAttribute('aria-expanded',open?'true':'false');
    const arrow=btn.querySelector('.wc-ref-arrow');
    if(arrow) arrow.textContent=open?'▾':'▸';
  }));
}

function selectCategory(panel,key){
  panel.querySelectorAll('[data-ref-category]').forEach(el=>
    el.classList.toggle('hidden',el.dataset.refCategory!==key)
  );
  panel.querySelectorAll('[data-ref-tab]').forEach(btn=>{
    const active=btn.dataset.refTab===key;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-selected',active?'true':'false');
  });
}

function installPanel(){
  if($('playerReferencePreview')) return;
  const consoleEl=$('console');
  if(!consoleEl) return;
  const panel=document.createElement('section');
  panel.id='playerReferencePreview';
  panel.className='panel wc-workspace-hidden';
  panel.dataset.workspaces='reference';
  panel.innerHTML=`
    <div class="wc-ref-head">
      <div>
        <div class="wc-ref-kicker">Warden-Only Approval Preview</div>
        <h2>Player Reference Preview</h2>
        <div class="wc-ref-note">Proposed player-facing wording. Nothing on this screen is exposed through the player console. Campaign Rules apply wherever the PCs are. In-World Rules cover systems the characters encounter through play.</div>
      </div>
    </div>
    <div class="wc-ref-tabs" role="tablist" aria-label="Player reference categories">
      ${CATEGORIES.map(c=>`<button type="button" class="wc-ref-tab ${c.key==='campaign'?'active':''}" data-ref-tab="${c.key}" role="tab" aria-selected="${c.key==='campaign'?'true':'false'}">${esc(c.title)}</button>`).join('')}
    </div>
    ${CATEGORIES.map(renderCategory).join('')}`;
  consoleEl.appendChild(panel);
  panel.querySelectorAll('[data-ref-tab]').forEach(btn=>
    btn.addEventListener('click',()=>selectCategory(panel,btn.dataset.refTab))
  );
  bindSectionToggles(panel);
}

function showReferenceWorkspace(){
  document.querySelectorAll('#console [data-workspaces]').forEach(el=>{
    const keys=String(el.dataset.workspaces||'').split(/\s+/);
    el.classList.toggle('wc-workspace-hidden',!keys.includes('reference'));
  });
  document.querySelectorAll('.wc-workspace-btn').forEach(b=>{
    const active=b.dataset.workspace==='reference';
    b.classList.toggle('active',active);
    b.setAttribute('aria-current',active?'page':'false');
  });
  const title=$('wardenWorkspaceTitle');
  if(title) title.textContent='Player Reference Preview';
  document.querySelector('main')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function installNav(){
  const nav=$('wardenWorkspaceNav');
  if(!nav || nav.querySelector('[data-workspace="reference"]')) return;
  const admin=nav.querySelector('[data-workspace="admin"]');
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='wc-workspace-btn';
  btn.dataset.workspace='reference';
  btn.textContent='Player Reference';
  btn.addEventListener('click',showReferenceWorkspace);
  if(admin) nav.insertBefore(btn,admin);
  else nav.appendChild(btn);
}

function syncVisibility(){
  const nav=$('wardenWorkspaceNav');
  if(!nav) return;
  const unlocked=!$('console')?.classList.contains('hidden');
  if(!unlocked && $('playerReferencePreview')){
    $('playerReferencePreview').classList.add('wc-workspace-hidden');
  }
}

function boot(){
  installStyles();
  installPanel();
  installNav();
  syncVisibility();
  let attempts=0;
  const timer=setInterval(()=>{
    installPanel();
    installNav();
    syncVisibility();
    if(++attempts>80) clearInterval(timer);
  },250);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
})();