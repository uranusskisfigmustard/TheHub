(() => {
  'use strict';

  const config = window.HubPlayerPreviewRoutes;
  const shellRoot = document.getElementById('previewShell');

  function fail(message) {
    if (shellRoot) {
      shellRoot.innerHTML = '<div class="hub-preview-fatal">PREVIEW SHELL ERROR<br><br>' + String(message) + '</div>';
    }
    document.documentElement.dataset.previewBoot = 'failed';
  }

  if (!config || !Array.isArray(config.groups)) {
    fail('Route configuration is unavailable.');
    return;
  }

  const pageMap = new Map();
  const groupMap = new Map();

  for (const group of config.groups) {
    if (!group || !group.id || !group.label || !Array.isArray(group.pages) || !group.pages.length) {
      fail('Invalid navigation group configuration.');
      return;
    }
    if (groupMap.has(group.id)) {
      fail('Duplicate navigation group: ' + group.id);
      return;
    }
    groupMap.set(group.id, group);

    for (const page of group.pages) {
      if (!page || !page.id || !page.label || !page.previewHref) {
        fail('Invalid page route in group ' + group.id + '.');
        return;
      }
      if (pageMap.has(page.id)) {
        fail('Duplicate page route: ' + page.id);
        return;
      }
      pageMap.set(page.id, { ...page, groupId: group.id });
    }
  }

  const requestedPage = new URLSearchParams(location.search).get('page') || 'contracts';
  const activePage = pageMap.get(requestedPage);

  if (!activePage) {
    fail('Unknown preview page: ' + requestedPage);
    return;
  }

  const activeGroup = groupMap.get(activePage.groupId);
  document.body.dataset.page = activePage.id;
  document.body.dataset.previewMode = 'read-only';
  document.title = 'The Hub — Preview — ' + activePage.label;

  function makeLink(label, href, className, isActive) {
    const link = document.createElement('a');
    link.className = className + (isActive ? ' active' : '');
    link.href = href;
    link.textContent = label;
    if (isActive) link.setAttribute('aria-current', 'page');
    return link;
  }

  function renderShell() {
    const header = document.createElement('header');
    header.className = 'hub-shell';

    const top = document.createElement('div');
    top.className = 'hub-shell-top';

    const identity = document.createElement('div');
    identity.className = 'hub-shell-identity';
    identity.innerHTML = '<div class="hub-shell-title">THE HUB // PLAYER CONSOLE</div>' +
      '<div class="hub-shell-subtitle">STRUCTURAL PREVIEW — NO LIVE ACTIONS</div>';

    const flags = document.createElement('div');
    flags.className = 'hub-shell-flags';
    flags.innerHTML = '<span class="hub-preview-flag">READ ONLY</span>' +
      '<span class="hub-preview-build">' + config.build + '</span>';

    top.append(identity, flags);

    const primary = document.createElement('nav');
    primary.className = 'hub-primary-nav';
    primary.setAttribute('aria-label', 'Player console sections');

    for (const group of config.groups) {
      const defaultPage = pageMap.get(group.defaultPage) || pageMap.get(group.pages[0].id);
      const link = makeLink(group.label, defaultPage.previewHref, 'hub-primary-link', group.id === activeGroup.id);
      primary.appendChild(link);
    }

    header.append(top, primary);

    if (activeGroup.pages.length > 1) {
      const secondary = document.createElement('nav');
      secondary.className = 'hub-secondary-nav';
      secondary.setAttribute('aria-label', activeGroup.label + ' destinations');
      for (const page of activeGroup.pages) {
        secondary.appendChild(makeLink(page.label, page.previewHref, 'hub-secondary-link', page.id === activePage.id));
      }
      header.appendChild(secondary);
    }

    const status = document.createElement('div');
    status.className = 'hub-shell-status';
    status.innerHTML = '<span>PREVIEW ROUTE: ' + activePage.id.toUpperCase() + '</span><span id="previewHeartbeat">BOOT CHECK…</span>';
    header.appendChild(status);

    shellRoot.replaceChildren(header);
  }

  renderShell();

  window.HubPlayerPreview = Object.freeze({
    build: config.build,
    mode: 'read-only',
    activePage,
    activeGroup,
    storageKey: config.storageKey
  });

  window.dispatchEvent(new CustomEvent('hub-preview-ready', {
    detail: {
      build: config.build,
      mode: 'read-only',
      page: activePage,
      group: activeGroup
    }
  }));

  setTimeout(() => {
    const heartbeat = document.getElementById('previewHeartbeat');
    if (heartbeat) heartbeat.textContent = 'BOOT OK';
    document.documentElement.dataset.previewBoot = 'ok';
  }, 80);
})();