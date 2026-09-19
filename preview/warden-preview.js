(() => {
  'use strict';

  const BUILD = '20260919-warden-preview-1';
  const shellRoot = document.getElementById('wardenPreviewShell');
  const contentRoot = document.getElementById('wardenPreviewContent');
  const diagnostic = document.getElementById('wardenPreviewDiagnostic');

  const workspaceCopy = Object.freeze({
    dashboard: ['Dashboard', 'Structural home for current Warden operating context.', ['Live overview', 'Current context', 'System status']],
    contracts: ['Contracts', 'Structural home for contract administration and closeout.', ['Active contracts', 'Closeout workflow', 'Audit trail']],
    session: ['Session', 'Structural home for session close and between-session administration.', ['Session close', 'Between-session work', 'Continuity handoff']],
    npcs: ['NPCs', 'Structural home for Warden-facing NPC records.', ['NPC index', 'Current state', 'Continuity notes']],
    factions: ['Factions', 'Structural home for Warden-facing faction records.', ['Faction index', 'Access state', 'Current obligations']],
    progression: ['Progression', 'Structural home for campaign progression administration.', ['Character progression', 'Finances and access', 'Campaign state']],
    reference: ['Player Reference', 'Structural home for Warden administration of the Player Reference.', ['Reference draft', 'Review controls', 'Player-facing publication']],
    admin: ['Admin', 'Structural home for administrative and audit tools.', ['Audit tools', 'Service state', 'Administrative controls']]
  });

  function renderWorkspace(workspace) {
    const data = workspaceCopy[workspace.id] || [workspace.label, workspace.summary, ['Workspace']];
    contentRoot.innerHTML = `
      <h1>${data[0]}</h1>
      <p>${data[1]}</p>
      <div class="warden-preview-grid">
        ${data[2].map(item => `<div class="warden-preview-card"><strong>${item.toUpperCase()}</strong><span>Placeholder only. No campaign records or state-changing controls are loaded in this public preview.</span></div>`).join('')}
      </div>
    `;
    diagnostic.textContent = `${BUILD}\nACTIVE WORKSPACE // ${workspace.id.toUpperCase()}\nREAD-ONLY // NO BACKEND // NO PRODUCTION STORAGE`;
  }

  if (!window.HubWardenShell || typeof window.HubWardenShell.createShell !== 'function') {
    diagnostic.textContent = BUILD + '\nBOOT FAILED // WARDEN SHELL MODULE UNAVAILABLE';
    return;
  }

  const shell = window.HubWardenShell.createShell(shellRoot, { initialWorkspace: 'dashboard' });
  renderWorkspace(shell.workspace);
  window.addEventListener('hub-warden-workspace-change', event => {
    if (event.detail?.workspace) renderWorkspace(event.detail.workspace);
  });

  document.documentElement.dataset.wardenPreviewBoot = 'ok';
})();
