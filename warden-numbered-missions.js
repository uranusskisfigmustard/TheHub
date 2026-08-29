(() => {
  'use strict';

  const MISSIONS = [
    {
      number: 'M1',
      title: 'Dead Air',
      status: 'CANON / PLAYED / COMPLETE',
      canonUrl: 'https://docs.google.com/document/d/1-vljSCSj6JEe7-yDzD90zQIH3RIrOhxYzoW1ZUwg_I0/edit',
      wardenUrl: ''
    },
    {
      number: 'M2',
      title: 'Witness Window',
      status: 'CANON v1.2 / NOT YET PLAYED',
      canonUrl: 'https://docs.google.com/document/d/1ifKMBwymozsStkZnsg6kfzfEwSYmicRfrFEtV0VZhBU/edit',
      wardenUrl: 'https://docs.google.com/document/d/1ztXF1mQ7BjYA0Gi7bHT_WxtXrctV9NUTg4eMvAmv17U/edit'
    },
    {
      number: 'M3',
      title: 'The Patient in Reserve',
      status: 'CANON v1.0 / NOT YET PLAYED',
      canonUrl: 'https://docs.google.com/document/d/1lBYOeuNpfdAWlNWnBKCCJqCj4izhlYMg6JML44fLw_Q/edit',
      wardenUrl: 'https://docs.google.com/document/d/1_uMVPLcLVN6EE7JF5t_claaRakK3K4ylWgSAgDRg74Q/edit'
    }
  ];

  const COMPLETE_RE = /\b(?:PLAYED\s*\/\s*COMPLETE|COMPLETE|COMPLETED)\b/i;
  const visibleMissions = () => MISSIONS.filter(mission => !COMPLETE_RE.test(mission.status));

  function installStyles() {
    if (document.getElementById('wcNumberedMissionStyles')) return;
    const style = document.createElement('style');
    style.id = 'wcNumberedMissionStyles';
    style.textContent = `
      #wcNumberedMissions{margin-top:15px}
      .wc-numbered-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px}
      .wc-numbered-head h2{margin:0!important}
      .wc-numbered-source{color:var(--muted);font-size:.68rem;text-align:right}
      .wc-numbered-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
      .wc-numbered-card{border:1px solid var(--line);background:var(--panel2);padding:13px;border-radius:4px;min-width:0}
      .wc-numbered-id{display:inline-block;border:1px solid var(--accent);color:var(--accent);padding:3px 7px;font-size:.72rem;font-weight:800;letter-spacing:.08em;margin-bottom:8px}
      .wc-numbered-title{font-size:1rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      .wc-numbered-status{margin-top:7px;color:#b6c7a8;font-size:.72rem;line-height:1.4}
      .wc-numbered-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      .wc-numbered-actions a{text-decoration:none}
      .wc-numbered-empty{padding:16px;border:1px dashed var(--line);color:var(--muted)}
      @media(max-width:760px){.wc-numbered-source{text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function missionCard(mission) {
    const card = document.createElement('article');
    card.className = 'wc-numbered-card';

    const id = document.createElement('div');
    id.className = 'wc-numbered-id';
    id.textContent = mission.number;

    const title = document.createElement('div');
    title.className = 'wc-numbered-title';
    title.textContent = mission.title;

    const status = document.createElement('div');
    status.className = 'wc-numbered-status';
    status.textContent = mission.status;

    const actions = document.createElement('div');
    actions.className = 'wc-numbered-actions';

    const canon = document.createElement('a');
    canon.className = 'btn mini';
    canon.href = mission.canonUrl;
    canon.target = '_blank';
    canon.rel = 'noopener noreferrer';
    canon.textContent = 'MISSION CANON';
    actions.appendChild(canon);

    if (mission.wardenUrl) {
      const warden = document.createElement('a');
      warden.className = 'btn mini primary';
      warden.href = mission.wardenUrl;
      warden.target = '_blank';
      warden.rel = 'noopener noreferrer';
      warden.textContent = 'WARDEN CORE';
      actions.appendChild(warden);
    }

    card.append(id, title, status, actions);
    return card;
  }

  function render() {
    const host = document.getElementById('wcNumberedMissionGrid');
    if (!host) return;
    host.innerHTML = '';
    const missions = visibleMissions();
    if (!missions.length) {
      const empty = document.createElement('div');
      empty.className = 'wc-numbered-empty';
      empty.textContent = 'NO UNCOMPLETED NUMBERED MISSIONS.';
      host.appendChild(empty);
      return;
    }
    missions.forEach(mission => host.appendChild(missionCard(mission)));
  }

  function installPanel() {
    if (document.getElementById('wcNumberedMissions')) {
      render();
      return;
    }
    const consoleRoot = document.getElementById('console');
    if (!consoleRoot) return;

    const panel = document.createElement('section');
    panel.id = 'wcNumberedMissions';
    panel.className = 'panel';
    panel.innerHTML = `
      <div class="wc-numbered-head">
        <div>
          <h2>Numbered Missions</h2>
          <div class="small">Current numbered campaign missions. Completed missions are omitted.</div>
        </div>
        <div class="wc-numbered-source">STATE SOURCE // PROGRESSION LEDGER → EARLY CAMPAIGN MATRIX</div>
      </div>
      <div id="wcNumberedMissionGrid" class="wc-numbered-grid"></div>
    `;

    const anchor = document.getElementById('consoleResult');
    if (anchor) anchor.insertAdjacentElement('afterend', panel);
    else consoleRoot.prepend(panel);
    render();
  }

  installStyles();
  installPanel();
})();
