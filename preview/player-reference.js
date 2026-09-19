(() => {
  'use strict';

  const R = (text, bold = false) => ({ text, bold });
  const B = text => R(text, true);
  const C = (...runs) => ({ runs: runs.flat().map(x => typeof x === 'string' ? R(x) : x) });
  const P = (...runs) => ({ type: 'paragraph', ...C(...runs) });
  const BL = (...runs) => ({ type: 'bullet', ...C(...runs) });
  const T = (headers, rows) => ({
    type: 'table',
    headers: headers.map(x => typeof x === 'string' ? C(x) : x),
    rows: rows.map(row => row.map(x => typeof x === 'string' ? C(x) : x))
  });

  const DATA = [
    {
      title: 'Survival & Core Play',
      open: true,
      items: [
        { title: 'Resolve', blocks: [P('Each session: ', B('1 Resolve'), '. Spend it to reroll one of your rolls; unused Resolve expires at session end.')] },
        { title: 'Social Exchanges', blocks: [P('No social Checks. Lies need no Check. NPCs react to what is said, what they know, evidence, and later discoveries.')] },
        { title: 'Impenetrable Wounds', blocks: [P('Damage does not carry over past a Wound.')] },
        { title: 'Heroic Action on Going Down', blocks: [P('Before your hidden Death Save is revealed, take one final action to delay a threat or help another character. If possible, it succeeds without a roll. Then your PC is no longer active.')] }
      ]
    },
    {
      title: 'Recovery & Advancement',
      items: [
        {
          title: 'Injury Recovery',
          blocks: [
            P('Health recovery does not remove injuries. With treatment and downtime: ', B('Broken → Healing → Recovered.')),
            BL(B('Broken:'), ' Penalty through the first full session.'),
            BL(B('Healing:'), ' No penalty. Critical Failure while strenuously loading the injury → Broken.'),
            BL(B('Recovered:'), ' After one full Healing session without regression, the Wound and penalty end.'),
            P('Severe injuries, complications, or specialist procedures may differ.')
          ]
        },
        {
          title: 'Rapid Skill Learning',
          blocks: [
            T(['Skill Level', 'Training Time', 'Material Cost'], [
              ['Trained', '3 sessions', '10,000cr'],
              ['Expert', '5 sessions', '50,000cr'],
              ['Master', '10 sessions', '200,000cr']
            ]),
            BL('One Skill at a time.'),
            BL('Prerequisites apply.'),
            BL('Training continues during play.')
          ]
        },
        { title: 'One-Time Advancement', blocks: [P("After PC's ", B('first session:'), ' ', B('+10 to one Stat or Save.'), ' Once per character.')] }
      ]
    },
    {
      title: 'Jobs & Downtime',
      items: [
        {
          title: 'Requirement Levels',
          blocks: [
            BL(B('PREFERRED'), ' — Related experience/Skills, reputation, sponsorship, or equivalent standing may qualify.'),
            BL(B('REQUIRED'), ' — Team must cover the listed professional qualification; qualified partner/subcontractor may satisfy it if allowed.'),
            BL(B('REGULATED'), ' — Responsible role requires the listed license, certification, credential, or temporary authorization; Skill alone is insufficient.'),
            BL(B('+1 Stress'), ' — Adds +1 Stress.')
          ]
        },
        {
          title: 'Qualifications & Access',
          blocks: [
            BL(B('Skills'), ' — What you know.'),
            BL(B('Professional qualifications'), ' — Recognized work standing; grants no Skills.'),
            BL(B('Licenses & credentials'), ' — Formal regulated-work/authority permission; separate from Skills/qualifications.'),
            BL(B('Assignment authorization'), ' — Temporary permission for a specific site/system/vessel/custody role/action.')
          ]
        },
        { title: 'Downtime', blocks: [P('Downtime: work, train, recover, investigate, serve factions, maintain equipment, or pursue projects. Projects unpaid unless stated. ', B('Hub employment:'), ' 50% of normal Skill-derived monthly salary. Mission pay separate; living costs weekly.')] },
        {
          title: 'Overtime & Weekend Work',
          blocks: [
            T(['Work', 'Time', 'Pay', 'Load'], [
              ['Weekday OT', '≤4h', '4h = 1 daily wage', '+1'],
              ['Weekend shift', '8h', '2 daily wages', '+2'],
              ['Extension', '≤4h', '4× hourly wage', '+1']
            ]),
            BL(B('12-hour weekend day: 4 daily wages total.'))
          ]
        },
        {
          title: 'Extra-Work Load',
          blocks: [
            T(['Load', 'Consequence'], [
              ['0–1', 'None'],
              ['2–3', '+1 Stress'],
              ['4–5', C('+1 Stress and Rest Save ', B('[-]'))],
              ['6+', C('+2 Stress and Rest Save ', B('[-]'))]
            ]),
            BL('One full ', B('nonworking day'), ' before the next mission removes Rest Save ', B('[-]'), '; Stress remains.')
          ]
        }
      ]
    },
    {
      title: 'Housing & Money',
      items: [
        {
          title: 'Housing & Rest',
          blocks: [
            T(['Tier', 'Housing', 'Rent', 'Rest', 'Move-In'], [
              ['0', 'Unsafe / Disrupted', '150cr/PC', C(B('[-]'), '; recovery −1, min 1'), ''],
              ['1', 'Barracks', '225cr/PC', C(B('[-]'), '; normal recovery'), ''],
              ['2', 'Dormitories', '300cr/PC', 'Normal', ''],
              ['3', 'Apartment', '400cr/PC', C(B('[+]'), '; recovery min 2'), '3,500cr'],
              ['4', 'Penthouse', '500cr/PC', C(B('[+]'), '; recovery +1, min 2'), '5,000cr']
            ])
          ]
        },
        { title: 'Rest Limits', blocks: [P('Downtime rest requires a Rest Save. Rest quality affects Stress recovery only; it does not replace Shore Leave, treatment, Health recovery, or Wound treatment.')] },
        {
          title: 'Recovery Debt',
          blocks: [
            T(['Recovery-debt balance', 'Mandatory withholding', 'Interest'], [
              ['Above 12,000cr', '40%', '1% every four weeks'],
              ['6,001–12,000cr', '25%', 'None'],
              ['6,000cr or less', '10%', 'None']
            ]),
            P(B('Payments:'), ' principal first, then accrued interest. ', B('Additional Payments:'), ' no penalty.')
          ]
        },
        { title: 'Cash Advances & Purchases', blocks: [P('Purchases use Personal Balance. ', B('Cash Advance:'), ' add the same amount to recovery debt and Personal Balance. ', B('Classifieds:'), ' cash-on-hand unless stated.')] }
      ]
    },
    {
      title: 'Prosthetics & Cybernetics',
      items: [
        {
          title: 'Grade Overview',
          blocks: [
            T(['Grade', 'Category', 'Cyberware Slots', 'Function'], [
              ['0', 'Rehabilitation & Adaptation', '0', 'Non-implant support.'],
              ['1', 'Conventional Prosthetic', '0', 'Restores routine function.'],
              ['2', 'Advanced Functional Prosthetic', '0', 'Improved function within human limits.'],
              ['3', 'Integrated Neuroprosthetic', '0', 'Near-natural control, implantation, or sensory feedback.'],
              ['4', 'Low-Grade Cybernetic', '1', 'Narrow or limited enhanced capability.'],
              ['5+', 'Restricted / Specialist Cybernetic', 'Unknown', 'Restricted.']
            ])
          ]
        },
        {
          title: 'Slots, Prices & Installation',
          blocks: [
            BL(B('Slots:'), ' Grades 0–3 = 0; Grade 4 as listed.'),
            BL('Prices exclude care, surgery, rehab, licensing, components, and provider fees.'),
            BL('Grade 0–3 restorative limb surgery/fitting: ', B('20% of hardware'), ' unless quoted otherwise.')
          ]
        },
        {
          type: 'grade',
          title: 'Grade 0 — Rehabilitation & Adaptation',
          blocks: [
            T(['Item', 'Price', 'Function'], [
              ['Mobility Aid', '50–250cr', 'Cane, crutch, walker, frame, or similar aid.'],
              ['Powered Mobility Chair', '750cr', 'Powered mobility with limited cargo.'],
              ['Adaptive Tool Harness', '150cr', 'Operates one ordinary tool without using a hand.'],
              ['Workplace Adaptation Kit', '300cr', 'Adapts a work area for an impairment.']
            ])
          ]
        },
        {
          type: 'grade',
          title: 'Grade 1 — Conventional Prosthetics',
          blocks: [
            T(['Item', 'Price', 'Function'], [
              ['Conventional Prosthetic Limb', '2,000cr', 'Routine limb function; recorded limitation.'],
              ['Passive Prosthetic Hand', '1,000cr', 'Appearance, bracing, carrying, stabilization; no independent manipulation.'],
              ['Mechanical Work Arm', '2,000cr', 'Body-powered work grip; no fine touch.'],
              ['Prosthetic Organ', '20,000cr', 'Replaces organ function; no enhancement.']
            ])
          ]
        },
        {
          type: 'grade',
          title: 'Grade 2 — Advanced Functional Prosthetics',
          blocks: [
            T(['Item', 'Price', 'Function'], [
              ['Myoelectric Multi-Grip Arm', '8,000cr', 'Near-normal powered grip/tool use.'],
              ['Microprocessor Leg', '10,000cr', 'Improved gait/stability/movement.'],
              ['Smart Socket Upgrade', '2,500cr', 'Improves fit for extended use.'],
              ['Specialized Attachment', '500–1,500cr', 'Task-specific: climbing hand, magnetic foot, running blade, or precision gripper.'],
              ['Powered Sensory Prosthesis', '12,000cr', 'Ordinary sight/hearing; no enhanced modes.']
            ])
          ]
        },
        {
          type: 'grade',
          title: 'Grade 3 — Integrated Neuroprosthetics',
          blocks: [
            T(['Item', 'Price', 'Function'], [
              ['Bone-Anchored Limb Interface', '20,000cr', 'Implanted mount; no socket limits; compatible quick-change limbs.'],
              ['Neural Control Interface', '35,000cr', 'Near-natural control; no Strength/Speed increase.'],
              ['Limited Sensory Feedback', '25,000cr', 'Pressure/position awareness.'],
              ['Integrated Sensory Replacement', '50,000cr', 'Near-natural sight/hearing; no external battery.'],
              ['Credential Implant', '250cr', 'Cryptographic identity/permission key.'],
              ['Emergency Vascular Port', '2,500cr', 'Sterile vascular access for treatment, medication, sampling, or monitoring.'],
              ['Occupational Joint Reinforcement', '4,000cr per joint', 'Restores work motion impaired by joint damage.'],
              ['Occupational Exposure Monitor', '1,000cr', 'Radiation/toxin/oxygen/pressure/temperature monitor.'],
              ['Fine-Motor Stabilizer', '8,000cr', 'Restores fine control impaired by tremor, nerve damage, medication, or vibration.']
            ])
          ]
        },
        {
          type: 'grade',
          title: 'Grade 4 — Low-Grade Cybernetics',
          blocks: [
            T(['Item', 'Price', 'Slots', 'Function'], [
              ['Loudmouth', '500cr', '1', 'Amplified voice through industrial noise/large spaces.'],
              ['Terminal Jack', '750cr', '1', 'Physical link to compatible computers/machinery; no credential/security bypass.'],
              ['Fangs', '2,000cr', '1', 'Concealed retractable close-combat weapon; may draw scrutiny.'],
              ['Huntershot', '4,500cr', '1', 'Delivers one compatible drug dose hands-free.'],
              ['Integrated Tool Mount', '8,000cr', '1', 'One compact tool; deploy/retract with its Action.'],
              ['Enhanced Optical Module', '15,000cr', '1', 'Choose: low-light, magnification, recording, or thermal.'],
              ['Selective Auditory Gate', '15,000cr', '1', 'Protects from routine industrial noise; prioritizes one configured signal.'],
              ['Powered Grip Module', '18,000cr', '1', 'Advantage to hold/crush/resist disarmament; no Strength/melee-damage bonus.'],
              ['Vestibular Stabilizer', '20,000cr', '1', 'Prevents routine motion sickness and gravity/movement disorientation.'],
              ['OGRE', '24,000cr', '1', 'Integrated HUD and data overlay.'],
              ['Emergency Disconnect', '35,000cr', 'N/A Add-on', 'Once/mission, sever an active neural connection. Task fails; connection-only consequences are avoided.'],
              ['Isolation Buffer', '40,000cr', 'N/A Add-on', 'Requires Pilot Jack. Once/mission, abrupt disconnection causes no Stress/interface Save.'],
              ['Pilot Jack Core', '50,000cr', '1', 'Includes one control package. Advantage for directly assisted precision operation; no credential/security/Skill/compatibility bypass.'],
              ['Tri-Mode Optics', '75,000cr', '1', 'Choose three: low-light, thermal, magnification, or recording. Advantage does not stack.']
            ]),
            { type: 'subhead', text: 'Pilot Jack Control Packages' },
            T(['Package', 'Additional Price'], [
              ['Surface Vehicle', '5,000cr'],
              ['Atmospheric Flight', '10,000cr'],
              ['Industrial Control', '10,000cr'],
              ['Spacecraft Helm', '20,000cr'],
              ['Ship Sensors / Navigation', '25,000cr'],
              ['Ship Engineering', '30,000cr'],
              ['Ship Gunnery', '35,000cr']
            ])
          ]
        },
        { title: 'Grade 5+', blocks: [P(B('Grade 5+:'), ' restricted; specific systems may be revealed in play.')] }
      ]
    }
  ];

  function appendRuns(el, runs) {
    (runs || []).forEach(run => {
      const span = document.createElement('span');
      span.textContent = run.text;
      if (run.bold) span.className = 'ref-bold';
      el.appendChild(span);
    });
    return el;
  }

  function blockNode(block) {
    if (block.type === 'table') {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      const table = document.createElement('table');
      table.className = 'ref-table';
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      block.headers.forEach(cell => {
        const th = document.createElement('th');
        appendRuns(th, cell.runs);
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      block.rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement('td');
          appendRuns(td, cell.runs);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    if (block.type === 'subhead') {
      const h = document.createElement('div');
      h.className = 'grade-subhead';
      h.textContent = block.text;
      return h;
    }

    const node = document.createElement(block.type === 'bullet' ? 'div' : 'p');
    if (block.type === 'bullet') node.className = 'ref-bullet';
    appendRuns(node, block.runs);
    return node;
  }

  function renderItem(item) {
    if (item.type === 'grade') {
      const details = document.createElement('details');
      details.className = 'grade';
      const summary = document.createElement('summary');
      summary.textContent = item.title;
      details.appendChild(summary);
      const body = document.createElement('div');
      body.className = 'grade-body';
      item.blocks.forEach(block => body.appendChild(blockNode(block)));
      details.appendChild(body);
      return details;
    }

    const article = document.createElement('article');
    article.className = 'ref-item';
    const heading = document.createElement('h2');
    heading.textContent = item.title;
    article.appendChild(heading);
    item.blocks.forEach(block => article.appendChild(blockNode(block)));
    return article;
  }

  function render(root) {
    if (!root || root.dataset.rendered === 'true') return;
    const fragment = document.createDocumentFragment();
    DATA.forEach(group => {
      const details = document.createElement('details');
      details.className = 'ref-group';
      details.open = !!group.open;
      const summary = document.createElement('summary');
      summary.textContent = group.title;
      details.appendChild(summary);
      const body = document.createElement('div');
      body.className = 'ref-group-body';
      group.items.forEach(item => body.appendChild(renderItem(item)));
      details.appendChild(body);
      fragment.appendChild(details);
    });
    root.replaceChildren(fragment);
    root.dataset.rendered = 'true';
  }

  window.HubPlayerReferenceContent = Object.freeze({ render });
})();
