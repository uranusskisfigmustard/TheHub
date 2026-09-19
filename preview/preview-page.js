(() => {
  'use strict';

  const previewMain = document.getElementById('previewMain');
  const placeholder = document.getElementById('previewPlaceholder');
  const referencePage = document.getElementById('playerReferencePage');
  const referenceRoot = document.getElementById('referenceRoot');
  const betweenSessionsPage = document.getElementById('betweenSessionsPage');
  const title = document.getElementById('previewPageTitle');
  const summary = document.getElementById('previewPageSummary');
  const route = document.getElementById('previewProductionRoute');
  const pageId = document.getElementById('previewPageId');
  const group = document.getElementById('previewGroup');
  const diagnostics = document.getElementById('previewDiagnostics');

  function collapseReferenceGroups() {
    referenceRoot.querySelectorAll(':scope > details.ref-group').forEach(item => { item.open = false; });
  }

  function render(detail) {
    if (!detail || !detail.page || !detail.group) return;

    const isReference = detail.page.id === 'reference';
    const isBetweenSessions = detail.page.id === 'between-sessions';
    const isMigratedPage = isReference || isBetweenSessions;

    placeholder.hidden = isMigratedPage;
    referencePage.hidden = !isReference;
    betweenSessionsPage.hidden = !isBetweenSessions;
    previewMain.classList.toggle('reference-mode', isReference);
    previewMain.classList.toggle('between-sessions-mode', isBetweenSessions);

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

    title.textContent = detail.page.label;
    summary.textContent = detail.page.summary;
    route.textContent = detail.page.productionHref;
    pageId.textContent = detail.page.id;
    group.textContent = detail.group.label;
    diagnostics.textContent = 'Shell rendered once from explicit route state. No production API call, mutation observer, polling loop, or production storage write is active.';
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
