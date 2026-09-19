(() => {
  'use strict';

  const BUILD = '20260919-preview-1';
  const STORAGE_PREFIX = 'hub-preview:';

  const groups = [
    {
      id: 'board',
      label: 'BOARD',
      defaultPage: 'contracts',
      pages: [
        {
          id: 'contracts',
          label: 'CONTRACTS',
          previewHref: './?page=contracts',
          productionHref: '../',
          summary: 'Formal Mission Board work and contract opportunities.'
        },
        {
          id: 'classifieds',
          label: 'CLASSIFIEDS',
          previewHref: './?page=classifieds',
          productionHref: '../#classifieds',
          summary: 'Informal opportunities, jobs, rumors, requests, notices, and other non-Mission-Board leads.'
        }
      ]
    },
    {
      id: 'crew',
      label: 'CREW',
      defaultPage: 'contract-logs',
      pages: [
        {
          id: 'contract-logs',
          label: 'CONTRACT LOGS',
          previewHref: './?page=contract-logs',
          productionHref: '../contracts.html',
          summary: 'Crew contract history and active/completed work records.'
        },
        {
          id: 'between-sessions',
          label: 'BETWEEN SESSIONS',
          previewHref: './?page=between-sessions',
          productionHref: '../between-sessions.html',
          summary: 'Crew activity and choices made between missions.'
        }
      ]
    },
    {
      id: 'accounts',
      label: 'ACCOUNTS',
      defaultPage: 'statements',
      pages: [
        {
          id: 'statements',
          label: 'STATEMENTS',
          previewHref: './?page=statements',
          productionHref: '../statements.html',
          summary: 'Financial statements, balances, charges, payments, and transaction history.'
        },
        {
          id: 'purchases',
          label: 'PURCHASE BOARD',
          previewHref: './?page=purchases',
          productionHref: '../purchases.html',
          summary: 'Player marketplace, qualification-gated purchases, and financing presentation.'
        }
      ]
    },
    {
      id: 'reference',
      label: 'REFERENCE',
      defaultPage: 'reference',
      pages: [
        {
          id: 'reference',
          label: 'PLAYER REFERENCE',
          previewHref: './?page=reference',
          productionHref: '../player-reference.html',
          summary: 'Player-known rules and immediately relevant campaign reference material.'
        }
      ]
    }
  ];

  window.HubPlayerPreviewRoutes = Object.freeze({
    build: BUILD,
    storagePrefix: STORAGE_PREFIX,
    groups: Object.freeze(groups),
    storageKey(name) {
      return STORAGE_PREFIX + String(name || '');
    }
  });
})();