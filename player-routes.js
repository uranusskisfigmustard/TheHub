(() => {
  'use strict';

  const BUILD = '20260919-boardprod1';
  const groups = [
    {
      id: 'board', label: 'BOARD', defaultPage: 'contracts', pages: [
        { id: 'contracts', label: 'CONTRACTS', href: './', summary: 'Formal Mission Board work and contract opportunities.' },
        { id: 'classifieds', label: 'CLASSIFIEDS', href: 'classifieds.html', summary: 'Informal opportunities, jobs, rumors, requests, notices, and other non-Mission-Board leads.' }
      ]
    },
    {
      id: 'crew', label: 'CREW', defaultPage: 'contract-logs', pages: [
        { id: 'contract-logs', label: 'CONTRACT LOGS', href: 'contracts.html', summary: 'Crew contract history and active/completed work records.' },
        { id: 'between-sessions', label: 'BETWEEN SESSIONS', href: 'between-sessions.html', summary: 'Crew activity and choices made between missions.' }
      ]
    },
    {
      id: 'accounts', label: 'ACCOUNTS', defaultPage: 'statements', pages: [
        { id: 'statements', label: 'STATEMENTS', href: 'statements.html', summary: 'Financial statements, balances, charges, payments, and transaction history.' },
        { id: 'purchases', label: 'PURCHASE BOARD', href: 'purchases.html', summary: 'Player marketplace, qualification-gated purchases, and financing presentation.' }
      ]
    },
    {
      id: 'reference', label: 'REFERENCE', defaultPage: 'reference', pages: [
        { id: 'reference', label: 'PLAYER REFERENCE', href: 'player-reference.html', summary: 'Player-known rules and immediately relevant campaign reference material.' }
      ]
    }
  ];

  window.HubPlayerRoutes = Object.freeze({ build: BUILD, groups: Object.freeze(groups) });
})();
