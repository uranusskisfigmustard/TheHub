(() => {
  'use strict';

  const BUILD = '20260919-warden-routes-2';
  const groups = [
    {
      id: 'dashboard', label: 'DASHBOARD', defaultWorkspace: 'dashboard', workspaces: [
        { id: 'dashboard', label: 'DASHBOARD', summary: 'Current Warden overview and operating context.' }
      ]
    },
    {
      id: 'operations', label: 'OPERATIONS', defaultWorkspace: 'contracts', workspaces: [
        { id: 'contracts', label: 'CONTRACTS', summary: 'Contract administration, closeout, and related Warden actions.' },
        { id: 'session', label: 'SESSION', summary: 'Session close, between-session administration, and session state.' }
      ]
    },
    {
      id: 'world', label: 'WORLD', defaultWorkspace: 'npcs', workspaces: [
        { id: 'npcs', label: 'NPCS', summary: 'NPC records and Warden-facing continuity.' },
        { id: 'factions', label: 'FACTIONS', summary: 'Faction records and Warden-facing continuity.' }
      ]
    },
    {
      id: 'campaign', label: 'CAMPAIGN', defaultWorkspace: 'progression', workspaces: [
        { id: 'progression', label: 'PROGRESSION', summary: 'Campaign progression and character-facing state administration.' },
        { id: 'reference', label: 'PLAYER REFERENCE', summary: 'Warden administration of the Player Reference.' }
      ]
    },
    {
      id: 'admin', label: 'ADMIN', defaultWorkspace: 'audit', workspaces: [
        { id: 'audit', label: 'AUDIT TOOLS', summary: 'Audited transaction review, amendment, undo, and integrity checks.' },
        { id: 'admin', label: 'ADMIN', summary: 'Service state and administrative controls.' }
      ]
    }
  ];

  window.HubWardenRoutes = Object.freeze({ build: BUILD, groups: Object.freeze(groups) });
})();
