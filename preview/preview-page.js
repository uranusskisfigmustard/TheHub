(() => {
  'use strict';

  const previewMain = document.getElementById('previewMain');
  const placeholder = document.getElementById('previewPlaceholder');
  const referencePage = document.getElementById('playerReferencePage');
  const referenceRoot = document.getElementById('referenceRoot');
  const betweenSessionsPage = document.getElementById('betweenSessionsPage');
  const statementsPage = document.getElementById('statementsPage');
  const purchasesPage = document.getElementById('purchasesPage');
  const purchaseRoot = document.getElementById('purchaseRoot');
  const contractLogsPage = document.getElementById('contractLogsPage');
  const contractLogsRoot = document.getElementById('contractLogsRoot');
  const title = document.getElementById('previewPageTitle');
  const summary = document.getElementById('previewPageSummary');
  const route = document.getElementById('previewProductionRoute');
  const pageId = document.getElementById('previewPageId');
  const group = document.getElementById('previewGroup');
  const diagnostics = document.getElementById('previewDiagnostics');

  const HUB_API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const STATEMENTS_SNAPSHOT = 'https://raw.githubusercontent.com/uranusskisfigmustard/TheHub/main/data/player-statements.json';

  function collapseReferenceGroups() {
    referenceRoot.querySelectorAll(':scope > details.ref-group').forEach(item => { item.open = false; });
  }

  function render(detail) {
    if (!detail || !detail.page || !detail.group) return;

    const isReference = detail.page.id === 'reference';
    const isBetweenSessions = detail.page.id === 'between-sessions';
    const isStatements = detail.page.id === 'statements';
    const isPurchases = detail.page.id === 'purchases';
    const isContractLogs = detail.page.id === 'contract-logs';
    const isMigratedPage = isReference || isBetweenSessions || isStatements || isPurchases || isContractLogs;

    placeholder.hidden = isMigratedPage;
    referencePage.hidden = !isReference;
    betweenSessionsPage.hidden = !isBetweenSessions;
    statementsPage.hidden = !isStatements;
    purchasesPage.hidden = !isPurchases;
    contractLogsPage.hidden = !isContractLogs;
    previewMain.classList.toggle('reference-mode', isReference);
    previewMain.classList.toggle('between-sessions-mode', isBetweenSessions);
    previewMain.classList.toggle('statements-mode', isStatements);
    previewMain.classList.toggle('purchases-mode', isPurchases);
    previewMain.classList.toggle('contract-logs-mode', isContractLogs);

    if (isReference) {
      if (!window.HubPlayerReferenceContent || typeof window.HubPlayerReferenceContent.render !== 'function') {
        throw new Error('Player Reference preview module failed to load.');
      }
      window.HubPlayerReferenceContent.render(referenceRoot);
      collapseReferenceGroups();
      return;
    }

    if (isBetweenSessions) {
      if (!window.HubBetweenSessionsContent || typeof window.HubBetweenSessionsContent.render !== 'function') {
        throw new Error('Between Sessions preview module failed to load.');
      }
      if (!window.BETWEEN_SESSION_PERIODS) {
        throw new Error('Between Sessions canonical data failed to load.');
      }
      window.HubBetweenSessionsContent.render(betweenSessionsPage, window.BETWEEN_SESSION_PERIODS);
      return;
    }

    if (isStatements) {
      if (!window.HubStatementsContent || typeof window.HubStatementsContent.render !== 'function') {
        throw new Error('Statements preview module failed to load.');
      }
      window.HubStatementsContent.render(statementsPage, {
        api: HUB_API,
        snapshotUrl: STATEMENTS_SNAPSHOT,
        cacheKey: 'hub-preview:statement-export-v3',
        legacyCacheKeys: ['hub-preview:statement-export-v1', 'hub-preview:statement-export-v2']
      });
      return;
    }

    if (isPurchases) {
      if (!window.HubPurchasesPreview || typeof window.HubPurchasesPreview.render !== 'function') {
        throw new Error('Purchase Board preview module failed to load.');
      }
      window.HubPurchasesPreview.render(purchaseRoot, {
        api: HUB_API,
        sessionKey: 'hub-preview:board-session-v1',
        sessionExpiryKey: 'hub-preview:board-session-expiry-v1'
      });
      return;
    }

    if (isContractLogs) {
      if (!window.HubContractLogsPreview || typeof window.HubContractLogsPreview.render !== 'function') {
        throw new Error('Contract Logs preview module failed to load.');
      }
      window.HubContractLogsPreview.render(contractLogsRoot, {
        api: HUB_API,
        cacheKey: 'hub-preview:contractfeed-v1',
        cacheTimeKey: 'hub-preview:contractfeed-v1:time'
      });
      return;
    }

    title.textContent = detail.page.label;
    summary.textContent = detail.page.summary;
    route.textContent = detail.page.productionHref;
    pageId.textContent = detail.page.id;
    group.textContent = detail.group.label;
    diagnostics.textContent = 'Shell rendered once from explicit route state. No production mutation, navigation observer, polling loop, or production storage write is active.';
  }

  window.addEventListener('hub-preview-ready', event => render(event.detail));

  if (window.HubPlayerPreview) {
    render({
      page: window.HubPlayerPreview.activePage,
      group: window.HubPlayerPreview.activeGroup
    });
  }

  window.addEventListener('error', event => {
    if (diagnostics && !placeholder.hidden) {
      diagnostics.textContent = 'PREVIEW ERROR: ' + (event.message || 'Unknown script error');
      diagnostics.dataset.state = 'error';
    }
  });

  window.addEventListener('unhandledrejection', event => {
    if (diagnostics && !placeholder.hidden) {
      diagnostics.textContent = 'PREVIEW PROMISE ERROR: ' + String(event.reason || 'Unknown rejection');
      diagnostics.dataset.state = 'error';
    }
  });
})();
