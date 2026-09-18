(() => {
'use strict';

const LOCAL_KEY='mothership_hub_player_reference_working_v1';
const SEED_VERSION='20260918a';
const GROUPS=['Survival & Core Play','Recovery & Advancement','Jobs & Downtime','Housing & Money','Prosthetics & Cybernetics'];

const p=text=>({type:'paragraph',text});
const t=(headers,rows)=>({type:'table',headers,rows});

const data=[{
  key:'player-reference',
  title:'Player Reference',
  description:'',
  sections:[
    {
      status:'CURRENT',
      title:'Survival & Core Play',
      items:[
        {title:'Resolve',blocks:[p('Each session: <strong>1 Resolve</strong>. Spend it to reroll one of your rolls; unused Resolve expires at session end.')]},
        {title:'Social Exchanges',blocks:[p('No social Checks. Lies need no Check. NPCs react to what is said, what they know, evidence, and later discoveries.')]},
        {title:'Impenetrable Wounds',blocks:[p('Damage does not carry over past a Wound.')]},
        {title:'Heroic Action on Going Down',blocks:[p('Before your hidden Death Save is revealed, take one final action to delay a threat or help another character. If possible, it succeeds without a roll. Then your PC is no longer active.')]}
      ]
    },
    {
      status:'CURRENT',
      title:'Recovery & Advancement',
      items:[
        {title:'Injury Recovery',blocks:[
          p('Health recovery does not remove injuries. With treatment and downtime: <strong>Broken → Healing → Recovered.</strong>'),
          p('- <strong>Broken:</strong> Penalty through the first full session.'),
          p('- <strong>Healing:</strong> No penalty. Critical Failure while strenuously loading the injury → Broken.'),
          p('- <strong>Recovered:</strong> After one full Healing session without regression, the Wound and penalty end.'),
          p('Severe injuries, complications, or specialist procedures may differ.')
        ]},
        {title:'Rapid Skill Learning',blocks:[
          t(['Skill Level','Training Time','Material Cost'],[
            ['Trained','3 sessions','10,000cr'],
            ['Expert','5 sessions','50,000cr'],
            ['Master','10 sessions','200,000cr']
          ]),
          p('- One Skill at a time.'),
          p('- Prerequisites apply.'),
          p('- Training continues during play.')
        ]},
        {title:'One-Time Advancement',blocks:[p("After PC's <strong>first session:</strong> <strong>+10 to one Stat or Save.</strong> Once per character.")]}
      ]
    },
    {
      status:'CURRENT',
      title:'Jobs & Downtime',
      items:[
        {title:'Requirement Levels',blocks:[
          p('- <strong>PREFERRED</strong> — Related experience/Skills, reputation, sponsorship, or equivalent standing may qualify.'),
          p('- <strong>REQUIRED</strong> — Team must cover the listed professional qualification; qualified partner/subcontractor may satisfy it if allowed.'),
          p('- <strong>REGULATED</strong> — Responsible role requires the listed license, certification, credential, or temporary authorization; Skill alone is insufficient.'),
          p('- <strong>+1 Stress</strong> — Adds +1 Stress.')
        ]},
        {title:'Qualifications & Access',blocks:[
          p('- <strong>Skills</strong> — What you know.'),
          p('- <strong>Professional qualifications</strong> — Recognized work standing; grants no Skills.'),
          p('- <strong>Licenses & credentials</strong> — Formal regulated-work/authority permission; separate from Skills/qualifications.'),
          p('- <strong>Assignment authorization</strong> — Temporary permission for a specific site/system/vessel/custody role/action.')
        ]},
        {title:'Downtime',blocks:[p('Downtime: work, train, recover, investigate, serve factions, maintain equipment, or pursue projects. Projects unpaid unless stated. <strong>Hub employment:</strong> 50% of normal Skill-derived monthly salary. Mission pay separate; living costs weekly.')]},
        {title:'Overtime & Weekend Work',blocks:[
          t(['Work','Time','Pay','Load'],[
            ['Weekday OT','≤4h','4h = 1 daily wage','+1'],
            ['Weekend shift','8h','2 daily wages','+2'],
            ['Extension','≤4h','4× hourly wage','+1']
          ]),
          p('<strong>12-hour weekend day: 4 daily wages total.</strong>')
        ]},
        {title:'Extra-Work Load',blocks:[
          t(['Load','Consequence'],[
            ['0–1','None'],
            ['2–3','+1 Stress'],
            ['4–5','+1 Stress and Rest Save <strong>[-]</strong>'],
            ['6+','+2 Stress and Rest Save <strong>[-]</strong>']
          ]),
          p('One full <strong>nonworking day</strong> before the next mission removes Rest Save <strong>[-]</strong>; Stress remains.')
        ]}
      ]
    },
    {
      status:'CURRENT',
      title:'Housing & Money',
      items:[
        {title:'Housing & Rest',blocks:[t(['Tier','Housing','Rent','Rest','Move-In'],[
          ['0','Unsafe / Disrupted','150cr/PC','<strong>[-]</strong>; recovery −1, min 1',''],
          ['1','Barracks','225cr/PC','<strong>[-]</strong>; normal recovery',''],
          ['2','Dormitories','300cr/PC','Normal',''],
          ['3','Apartment','400cr/PC','<strong>[+]</strong>; recovery min 2','3,500cr'],
          ['4','Penthouse','500cr/PC','<strong>[+]</strong>; recovery +1, min 2','5,000cr']
        ])]},
        {title:'Rest Limits',blocks:[p('Downtime rest requires a Rest Save. Rest quality affects Stress recovery only; it does not replace Shore Leave, treatment, Health recovery, or Wound treatment.')]},
        {title:'Recovery Debt',blocks:[
          t(['Recovery-debt balance','Mandatory withholding','Interest'],[
            ['Above 12,000cr','40%','1% every four weeks'],
            ['6,001–12,000cr','25%','None'],
            ['6,000cr or less','10%','None']
          ]),
          p('<strong>Payments:</strong> principal first, then accrued interest. <strong>Additional Payments:</strong> no penalty.')
        ]},
        {title:'Cash Advances & Purchases',blocks:[p('Purchases use Personal Balance. <strong>Cash Advance:</strong> add the same amount to recovery debt and Personal Balance. <strong>Classifieds:</strong> cash-on-hand unless stated.')]}
      ]
    },
    {
      status:'CURRENT',
      title:'Prosthetics & Cybernetics',
      items:[
        {title:'Grade Overview',blocks:[t(['Grade','Category','Cyberware Slots','Function'],[
          ['0','Rehabilitation & Adaptation','0','Non-implant support.'],
          ['1','Conventional Prosthetic','0','Restores routine function.'],
          ['2','Advanced Functional Prosthetic','0','Improved function within human limits.'],
          ['3','Integrated Neuroprosthetic','0','Near-natural control, implantation, or sensory feedback.'],
          ['4','Low-Grade Cybernetic','1','Narrow or limited enhanced capability.'],
          ['5+','Restricted / Specialist Cybernetic','Unknown','Restricted.']
        ])]},
        {title:'Slots, Prices & Installation',blocks:[
          p('<strong>Slots:</strong> Grades 0–3 = 0; Grade 4 as listed.'),
          p('Prices exclude care, surgery, rehab, licensing, components, and provider fees.'),
          p('Grade 0–3 restorative limb surgery/fitting: <strong>20% of hardware</strong> unless quoted otherwise.')
        ]},
        {title:'Grade 0 — Rehabilitation & Adaptation',blocks:[t(['Item','Price','Function'],[
          ['Mobility Aid','50–250cr','Cane, crutch, walker, frame, or similar aid.'],
          ['Powered Mobility Chair','750cr','Powered mobility with limited cargo.'],
          ['Adaptive Tool Harness','150cr','Operates one ordinary tool without using a hand.'],
          ['Workplace Adaptation Kit','300cr','Adapts a work area for an impairment.']
        ])]},
        {title:'Grade 1 — Conventional Prosthetics',blocks:[t(['Item','Price','Function'],[
          ['Conventional Prosthetic Limb','2,000cr','Routine limb function; recorded limitation.'],
          ['Passive Prosthetic Hand','1,000cr','Appearance, bracing, carrying, stabilization; no independent manipulation.'],
          ['Mechanical Work Arm','2,000cr','Body-powered work grip; no fine touch.'],
          ['Prosthetic Organ','20,000cr','Replaces organ function; no enhancement.']
        ])]},
        {title:'Grade 2 — Advanced Functional Prosthetics',blocks:[t(['Item','Price','Function'],[
          ['Myoelectric Multi-Grip Arm','8,000cr','Near-normal powered grip/tool use.'],
          ['Microprocessor Leg','10,000cr','Improved gait/stability/movement.'],
          ['Smart Socket Upgrade','2,500cr','Improves fit for extended use.'],
          ['Specialized Attachment','500–1,500cr','Task-specific: climbing hand, magnetic foot, running blade, or precision gripper.'],
          ['Powered Sensory Prosthesis','12,000cr','Ordinary sight/hearing; no enhanced modes.']
        ])]},
        {title:'Grade 3 — Integrated Neuroprosthetics',blocks:[t(['Item','Price','Function'],[
          ['Bone-Anchored Limb Interface','20,000cr','Implanted mount; no socket limits; compatible quick-change limbs.'],
          ['Neural Control Interface','35,000cr','Near-natural control; no Strength/Speed increase.'],
          ['Limited Sensory Feedback','25,000cr','Pressure/position awareness.'],
          ['Integrated Sensory Replacement','50,000cr','Near-natural sight/hearing; no external battery.'],
          ['Credential Implant','250cr','Cryptographic identity/permission key.'],
          ['Emergency Vascular Port','2,500cr','Sterile vascular access for treatment, medication, sampling, or monitoring.'],
          ['Occupational Joint Reinforcement','4,000cr per joint','Restores work motion impaired by joint damage.'],
          ['Occupational Exposure Monitor','1,000cr','Radiation/toxin/oxygen/pressure/temperature monitor.'],
          ['Fine-Motor Stabilizer','8,000cr','Restores fine control impaired by tremor, nerve damage, medication, or vibration.']
        ])]},
        {title:'Grade 4 — Low-Grade Cybernetics',blocks:[
          t(['Item','Price','Slots','Function'],[
            ['Loudmouth','500cr','1','Amplified voice through industrial noise/large spaces.'],
            ['Terminal Jack','750cr','1','Physical link to compatible computers/machinery; no credential/security bypass.'],
            ['Fangs','2,000cr','1','Concealed retractable close-combat weapon; may draw scrutiny.'],
            ['Huntershot','4,500cr','1','Delivers one compatible drug dose hands-free.'],
            ['Integrated Tool Mount','8,000cr','1','One compact tool; deploy/retract with its Action.'],
            ['Enhanced Optical Module','15,000cr','1','Choose: low-light, magnification, recording, or thermal.'],
            ['Selective Auditory Gate','15,000cr','1','Protects from routine industrial noise; prioritizes one configured signal.'],
            ['Powered Grip Module','18,000cr','1','Advantage to hold/crush/resist disarmament; no Strength/melee-damage bonus.'],
            ['Vestibular Stabilizer','20,000cr','1','Prevents routine motion sickness and gravity/movement disorientation.'],
            ['OGRE','24,000cr','1','Integrated HUD and data overlay.'],
            ['Emergency Disconnect','35,000cr','N/A Add-on','Once/mission, sever an active neural connection. Task fails; connection-only consequences are avoided.'],
            ['Isolation Buffer','40,000cr','N/A Add-on','Requires Pilot Jack. Once/mission, abrupt disconnection causes no Stress/interface Save.'],
            ['Pilot Jack Core','50,000cr','1','Includes one control package. Advantage for directly assisted precision operation; no credential/security/Skill/compatibility bypass.'],
            ['Tri-Mode Optics','75,000cr','1','Choose three: low-light, thermal, magnification, or recording. Advantage does not stack.']
          ]),
          p('<strong>Pilot Jack Control Packages</strong>'),
          t(['Package','Additional Price'],[
            ['Surface Vehicle','5,000cr'],
            ['Atmospheric Flight','10,000cr'],
            ['Industrial Control','10,000cr'],
            ['Spacecraft Helm','20,000cr'],
            ['Ship Sensors / Navigation','25,000cr'],
            ['Ship Engineering','30,000cr'],
            ['Ship Gunnery','35,000cr']
          ])
        ]},
        {title:'Grade 5+',blocks:[p('<strong>Grade 5+:</strong> restricted; specific systems may be revealed in play.')]}
      ]
    }
  ]
}];

function approvedShape(value){
  const d=Array.isArray(value?.data)?value.data:null;
  if(!d||d.length!==1) return false;
  if(String(d[0]?.title||'')!=='Player Reference') return false;
  const titles=Array.isArray(d[0]?.sections)?d[0].sections.map(s=>String(s?.title||'')):[];
  return GROUPS.length===titles.length&&GROUPS.every((g,i)=>titles[i]===g);
}

function seed(){
  let existing=null;
  try{existing=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null')}catch(_){existing=null}
  if(approvedShape(existing)) return;
  try{localStorage.setItem(LOCAL_KEY,JSON.stringify({version:2,seedVersion:SEED_VERSION,savedAt:new Date().toISOString(),data}))}catch(_){}
}

function protectEditor(){
  document.querySelectorAll('.wc-ref-editor-tabs').forEach(tabs=>{tabs.hidden=tabs.children.length<=1});
  const reset=document.getElementById('wcRefResetLocal');
  if(reset&&reset.dataset.groupingSeedWrapped!=='1'){
    reset.dataset.groupingSeedWrapped='1';
    reset.onclick=()=>{
      if(!confirm('Discard browser changes and restore the approved grouped working draft? This does not alter Drive.')) return;
      try{localStorage.setItem(LOCAL_KEY,JSON.stringify({version:2,seedVersion:SEED_VERSION,savedAt:new Date().toISOString(),data}))}catch(_){}
      location.reload();
    };
  }
}

seed();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',protectEditor,{once:true});
protectEditor();
new MutationObserver(protectEditor).observe(document.documentElement,{childList:true,subtree:true});
})();
