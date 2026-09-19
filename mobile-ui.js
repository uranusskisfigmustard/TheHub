(() => {
  'use strict';

  const NAV_ITEMS = [
    { key:'contracts', label:'CONTRACTS', href:'./', group:'board' },
    { key:'classifieds', label:'CLASSIFIEDS', href:'./#classifieds', group:'board' },
    { key:'logs', label:'CONTRACT LOGS', href:'contracts.html', group:'crew' },
    { key:'intersession', label:'BETWEEN SESSIONS', href:'between-sessions.html', group:'crew' },
    { key:'statements', label:'STATEMENTS', href:'statements.html', group:'accounts' },
    { key:'purchases', label:'PURCHASE BOARD', href:'purchases.html', group:'accounts' },
    { key:'reference', label:'REFERENCE', href:'player-reference.html', group:'reference' }
  ];

  const GROUPS = [
    { key:'board', label:'BOARD', defaultKey:'contracts' },
    { key:'crew', label:'CREW', defaultKey:'logs' },
    { key:'accounts', label:'ACCOUNTS', defaultKey:'statements' },
    { key:'reference', label:'REFERENCE', defaultKey:'reference' }
  ];

  let normalizing = false;
  let queued = false;

  function installHeaderStyles() {
    if (document.getElementById('hubCanonicalHeaderStyles')) return;
    const style = document.createElement('style');
    style.id = 'hubCanonicalHeaderStyles';
    style.textContent = `
      .navrow.hub-tiered-nav{display:block!important;margin-top:13px!important}
      .navrow.hub-tiered-nav>.hub-nav-source{display:none!important}
      .hub-tiered-primary,.hub-tiered-secondary{display:flex;align-items:center;gap:8px;min-width:0}
      .hub-tiered-primary{flex-wrap:wrap}
      .hub-tiered-secondary{margin-top:7px;flex-wrap:wrap}
      .hub-primary-link,.hub-secondary-link{appearance:none;border:1px solid var(--line,#3a3f42);border-radius:3px;background:#171b1f;color:var(--muted,#aaa79f);font:inherit;font-weight:800;text-transform:uppercase;text-decoration:none;cursor:pointer;white-space:nowrap;line-height:1.2}
      .hub-primary-link{padding:8px 14px;letter-spacing:.08em}
      .hub-secondary-link{padding:7px 11px;letter-spacing:.065em;font-size:.72rem}
      .hub-primary-link:hover,.hub-secondary-link:hover{border-color:var(--accent,#d4a84b);color:var(--text,#e7e4dc)}
      .hub-primary-link.active,.hub-secondary-link.active{border-color:var(--accent,#d4a84b);background:rgba(212,168,75,.13);color:var(--text,#e7e4dc)}
      .hub-secondary-link .player-nav-badge{pointer-events:none}
      @media(max-width:760px){
        .navrow.hub-tiered-nav{margin-top:8px!important}
        .hub-tiered-primary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;width:100%}
        .hub-primary-link{min-width:0;padding:8px 5px;font-size:.68rem;letter-spacing:.045em;text-align:center;overflow:hidden;text-overflow:ellipsis}
        .hub-tiered-secondary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;width:100%;margin-top:5px}
        .hub-tiered-secondary:empty{display:none}
        .hub-secondary-link{min-width:0;padding:7px 6px;font-size:.66rem;letter-spacing:.035em;text-align:center;white-space:normal}
      }
      @media(max-width:390px){
        .hub-primary-link{font-size:.64rem;padding-left:3px;padding-right:3px}
        .hub-secondary-link{font-size:.63rem}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizedLabel(el) {
    return String(el?.textContent || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function currentKey() {
    const path = location.pathname.toLowerCase();
    if (path.endsWith('/contracts.html')) return 'logs';
    if (path.endsWith('/statements.html')) return 'statements';
    if (path.endsWith('/between-sessions.html')) return 'intersession';
    if (path.endsWith('/purchases.html')) return 'purchases';
    if (path.endsWith('/player-reference.html')) return 'reference';
    return location.hash.toLowerCase() === '#classifieds' ? 'classifieds' : 'contracts';
  }

  function directNavItems(nav) {
    return [...nav.children].filter(el => el.matches?.('.navbtn,.btn'));
  }

  function findItem(nav, label) {
    return directNavItems(nav).find(el => normalizedLabel(el).startsWith(label)) || null;
  }

  function createItem(nav, item) {
    const usesButtons = Boolean(nav.querySelector(':scope > .navbtn'));
    if (usesButtons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'navbtn';
      button.textContent = item.label;
      button.addEventListener('click', () => { location.href = item.href; });
      return button;
    }
    const anchor = document.createElement('a');
    anchor.className = 'btn';
    anchor.href = item.href;
    anchor.textContent = item.label;
    return anchor;
  }

  function normalizeSources(nav) {
    return NAV_ITEMS.map(item => {
      let node = findItem(nav, item.label);
      if (!node) {
        node = createItem(nav, item);
        nav.appendChild(node);
      }
      if (node.tagName === 'A' && node.getAttribute('href') !== item.href) node.setAttribute('href', item.href);
      if (!node.classList.contains('hub-nav-source')) node.classList.add('hub-nav-source');
      node.dataset.hubNavKey = item.key;
      return { item, node };
    });
  }

  function groupForKey(key) {
    return NAV_ITEMS.find(item => item.key === key)?.group || 'board';
  }

  function createTierHosts(nav) {
    let primary = nav.querySelector(':scope > .hub-tiered-primary');
    let secondary = nav.querySelector(':scope > .hub-tiered-secondary');
    if (!primary) {
      primary = document.createElement('div');
      primary.className = 'hub-tiered-primary';
      primary.setAttribute('aria-label', 'Player console sections');
      nav.insertBefore(primary, nav.firstChild);
    }
    if (!secondary) {
      secondary = document.createElement('div');
      secondary.className = 'hub-tiered-secondary';
      secondary.setAttribute('aria-label', 'Player console pages');
      primary.insertAdjacentElement('afterend', secondary);
    }
    return { primary, secondary };
  }

  function renderPrimary(primary, activeGroup) {
    GROUPS.forEach(group => {
      let button = primary.querySelector(`[data-hub-group="${group.key}"]`);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'hub-primary-link';
        button.dataset.hubGroup = group.key;
        button.textContent = group.label;
        button.addEventListener('click', () => {
          if (group.key === groupForKey(currentKey())) return;
          const target = NAV_ITEMS.find(item => item.key === group.defaultKey);
          if (target) location.href = target.href;
        });
        primary.appendChild(button);
      }
      const active = group.key === activeGroup;
      if (button.classList.contains('active') !== active) button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function syncProxyBadge(proxy, source) {
    const sourceBadge = source?.querySelector('.player-nav-badge');
    let proxyBadge = proxy.querySelector('.player-nav-badge');
    if (!sourceBadge) {
      if (proxyBadge) proxyBadge.remove();
      return;
    }
    if (!proxyBadge) {
      proxyBadge = document.createElement('span');
      proxyBadge.className = 'player-nav-badge';
      proxy.appendChild(proxyBadge);
    }
    const text = sourceBadge.textContent || '';
    if (proxyBadge.textContent !== text) proxyBadge.textContent = text;
    const cls = sourceBadge.className;
    if (proxyBadge.className !== cls) proxyBadge.className = cls;
    proxyBadge.removeAttribute('id');
  }

  function renderSecondary(secondary, sources, activeKey, activeGroup) {
    const groupItems = NAV_ITEMS.filter(item => item.group === activeGroup && item.group !== 'reference');
    const wanted = new Set(groupItems.map(item => item.key));
    [...secondary.children].forEach(child => {
      if (!wanted.has(child.dataset.hubKey)) child.remove();
    });

    groupItems.forEach(item => {
      let link = secondary.querySelector(`[data-hub-key="${item.key}"]`);
      if (!link) {
        link = document.createElement('a');
        link.className = 'hub-secondary-link';
        link.dataset.hubKey = item.key;
        const span = document.createElement('span');
        span.className = 'hub-secondary-label';
        span.textContent = item.label;
        link.appendChild(span);
        secondary.appendChild(link);
      }
      if (link.getAttribute('href') !== item.href) link.setAttribute('href', item.href);
      const source = sources.find(x => x.item.key === item.key)?.node;
      syncProxyBadge(link, source);
      const active = item.key === activeKey;
      if (link.classList.contains('active') !== active) link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function normalizeNavigation() {
    if (normalizing) return false;
    const nav = document.querySelector('.navrow');
    if (!nav) return false;
    normalizing = true;
    try {
      installHeaderStyles();
      if (!nav.classList.contains('hub-tiered-nav')) nav.classList.add('hub-tiered-nav');
      const sources = normalizeSources(nav);
      const activeKey = currentKey();
      const activeGroup = groupForKey(activeKey);
      const { primary, secondary } = createTierHosts(nav);
      renderPrimary(primary, activeGroup);
      renderSecondary(secondary, sources, activeKey, activeGroup);
      return true;
    } finally {
      normalizing = false;
    }
  }

  function watchNavigation() {
    const nav = document.querySelector('.navrow');
    if (!nav || nav.dataset.canonicalNavWatch === '1') return;
    nav.dataset.canonicalNavWatch = '1';
    new MutationObserver(mutations => {
      const relevant = mutations.some(m => {
        const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        return !target?.closest?.('.hub-tiered-primary,.hub-tiered-secondary');
      });
      if (!relevant || queued || normalizing) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        normalizeNavigation();
      });
    }).observe(nav, { childList:true, subtree:true });
  }

  function installMobileFilters() {
    const controls = document.querySelector('.controls');
    if (!controls || document.getElementById('mobileFilterToggle')) return;
    const primary = document.getElementById('primaryFilter');
    const secondary = document.getElementById('secondaryFilter');
    const search = document.getElementById('search');
    if (!primary || !secondary || !search) return;

    const toggle = document.createElement('button');
    toggle.id = 'mobileFilterToggle';
    toggle.className = 'control mobile-filter-toggle';
    toggle.type = 'button';
    toggle.textContent = 'FILTERS';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Show board filters');
    search.insertAdjacentElement('afterend', toggle);

    function setOpen(open) {
      controls.classList.toggle('mobile-filters-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Hide board filters' : 'Show board filters');
      toggle.textContent = open ? 'CLOSE' : 'FILTERS';
    }

    toggle.addEventListener('click', () => setOpen(!controls.classList.contains('mobile-filters-open')));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760 && controls.classList.contains('mobile-filters-open')) setOpen(false);
    }, { passive:true });
  }

  installHeaderStyles();
  normalizeNavigation();
  watchNavigation();
  installMobileFilters();
  window.addEventListener('hashchange', normalizeNavigation);
  window.addEventListener('hub-player-contracts-updated', normalizeNavigation);
  setTimeout(() => { normalizeNavigation(); watchNavigation(); }, 250);
  setTimeout(normalizeNavigation, 1000);
})();
