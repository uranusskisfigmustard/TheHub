(() => {
  'use strict';

  const previewMain = document.getElementById('previewMain');
  const placeholder = document.getElementById('previewPlaceholder');
  const referencePage = document.getElementById('playerReferencePage');
  const referenceRoot = document.getElementById('referenceRoot');
  const title = document.getElementById('previewPageTitle');
  const summary = document.getElementById('previewPageSummary');
  const route = document.getElementById('previewProductionRoute');
  const pageId = document.getElementById('previewPageId');
  const group = document.getElementById('previewGroup');
  const diagnostics = document.getElementById('previewDiagnostics');

  function render(detail) {
    if (!detail || !detail.page || !detail.group) return;

    const isReference = detail.page.id === 'reference';
    placeholder.hidden = isReference;
    referencePage.hidden = !isReference;
    previewMain.classList.toggle('reference-mode', isReference);

    if (isReference) {
      if (window.HubPlayerReferenceContent) {
        window.HubPlayerReferenceContent.render(referenceRoot);
      }
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
