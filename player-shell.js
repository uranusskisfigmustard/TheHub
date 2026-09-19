(() => {
  'use strict';

  const config = window.HubPlayerRoutes;
  const shellRoot = document.getElementById('playerShell');

  function fail(message) {
    if (shellRoot) shellRoot.innerHTML = '<div class="hub-shell-fatal">PLAYER SHELL ERROR<br><br>' + String(message) + '</div>';
    document.documentElement.dataset.playerShellBoot = 'failed';
  }

  if (!config || !Array.isArray(config.groups) || !shellRoot) {
    fail('Player route configuration or shell mount is unavailable.');
    return;
  }

  const pageMap = new Map();
  const groupMap = new Map();

  for (const group of config.groups) {
    if (!group || !group.id || !group.label || !Array.isArray(group.pages) || !group.pages.length) {
      fail('Invalid player navigation group configuration.');
      return;
    }
    groupMap.set(group.id, group);
    for (const page of group.pages) {
      if (!page || !page.id || !page.label || !page.href || pageMap.has(page.id)) {
        fail('Invalid or duplicate player page route.');
        return;
      }
      pageMap.set(page.id, { ...page, groupId: group.id });
    }
  }

  const pageId = String(document.body.dataset.page || '').trim();
  const activePage = pageMap.get(pageId);
  if (!activePage) {
    fail('Unknown player page: ' + (pageId || '(missing data-page)'));
    return;
  }
  const activeGroup = groupMap.get(activePage.groupId);
  const badgeState = new Map();

  function makeLink(label, href, className, isActive, pageIdValue, groupIdValue) {
    const link = document.createElement('a');
    link.className = className + (isActive ? ' active' : '');
    link.href = href;
    link.textContent = label;
    if (pageIdValue) link.dataset.pageId = pageIdValue;
    if (groupIdValue) link.dataset.groupId = groupIdValue;
    if (isActive) link.setAttribute('aria-current', 'page');
    return link;
  }

  function renderBadge(link, pageIdValue) {
    const state = badgeState.get(pageIdValue);
    let badge = link.querySelector('.player-nav-badge');
    if (!state || state.count === null || state.count === undefined || Number.isNaN(Number(state.count))) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'player-nav-badge';
      link.appendChild(badge);
    }
    badge.textContent = String(state.count);
    badge.classList.toggle('active-contract', Boolean(state.active));
  }

  function renderShell() {
    const header = document.createElement('header');
    header.className = 'hub-shell';

    const top = document.createElement('div');
    top.className = 'hub-shell-top';

    const identity = document.createElement('div');
    identity.className = 'hub-shell-identity';
    identity.innerHTML = '<div class="hub-shell-title">THE HUB // PLAYER CONSOLE</div>' +
      '<div class="hub-shell-subtitle">' + activePage.summary + '</div>';
    top.appendChild(identity);

    const primary = document.createElement('nav');
    primary.className = 'hub-primary-nav';
    primary.setAttribute('aria-label', 'Player console sections');

    for (const group of config.groups) {
      const defaultPage = pageMap.get(group.defaultPage) || pageMap.get(group.pages[0].id);
      const link = makeLink(group.label, defaultPage.href, 'hub-primary-link', group.id === activeGroup.id, defaultPage.id, group.id);
      renderBadge(link, defaultPage.id);
      primary.appendChild(link);
    }

    const divider = document.createElement('div');
    divider.className = 'hub-nav-divider';
    divider.setAttribute('aria-hidden', 'true');

    header.append(top, primary, divider);

    if (activeGroup.pages.length > 1) {
      const secondary = document.createElement('nav');
      secondary.className = 'hub-secondary-nav';
      secondary.setAttribute('aria-label', activeGroup.label + ' destinations');
      for (const page of activeGroup.pages) {
        const link = makeLink(page.label, page.href, 'hub-secondary-link', page.id === activePage.id, page.id, activeGroup.id);
        renderBadge(link, page.id);
        secondary.appendChild(link);
      }
      header.appendChild(secondary);
    }

    const status = document.createElement('div');
    status.className = 'hub-shell-status';
    status.innerHTML = '<span>' + activePage.label + ' // CURRENT</span><span>THE HUB</span>';
    header.appendChild(status);

    shellRoot.replaceChildren(header);
  }

  function refreshBadges() {
    for (const link of shellRoot.querySelectorAll('[data-page-id]')) renderBadge(link, link.dataset.pageId);
  }

  renderShell();
  document.documentElement.dataset.playerShellBoot = 'ok';

  window.HubPlayerShell = Object.freeze({
    build: config.build,
    activePage,
    activeGroup,
    setBadge(pageIdValue, count, options = {}) {
      if (!pageMap.has(pageIdValue)) return false;
      badgeState.set(pageIdValue, { count, active: Boolean(options.active) });
      refreshBadges();
      return true;
    },
    clearBadge(pageIdValue) {
      badgeState.delete(pageIdValue);
      refreshBadges();
    }
  });

  window.dispatchEvent(new CustomEvent('hub-player-shell-ready', {
    detail: { build: config.build, page: activePage, group: activeGroup }
  }));
})();
