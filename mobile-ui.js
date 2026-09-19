(() => {
  'use strict';

  const NAV_ITEMS = [
    { key:'contracts', label:'CONTRACTS', href:'./' },
    { key:'logs', label:'CONTRACT LOGS', href:'contracts.html' },
    { key:'classifieds', label:'CLASSIFIEDS', href:'./#classifieds' },
    { key:'statements', label:'STATEMENTS', href:'statements.html' },
    { key:'intersession', label:'BETWEEN SESSIONS', href:'between-sessions.html' },
    { key:'purchases', label:'PURCHASE BOARD', href:'purchases.html' },
    { key:'reference', label:'REFERENCE', href:'player-reference.html' }
  ];

  function installHeaderStyles() {
    if (document.getElementById('hubCanonicalHeaderStyles')) return;
    const style = document.createElement('style');
    style.id = 'hubCanonicalHeaderStyles';
    style.textContent = `
      .navrow{display:flex!important;gap:8px!important;margin-top:13px!important;flex-wrap:wrap!important;align-items:center!important}
      .navrow>.navbtn,.navrow>.btn{padding:8px 14px!important;letter-spacing:.08em!important;line-height:1.2!important;margin:0!important}
      @media(max-width:760px){.navrow>.navbtn,.navrow>.btn{padding:8px 10px!important}}
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
    const usesButtons = Boolean(nav.querySelector('.navbtn'));
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

  function syncActive(nav, nodes) {
    const activeKey = currentKey();
    nodes.forEach(({ item, node }) => {
      const active = item.key === activeKey;
      node.classList.toggle('active', active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
  }

  function normalizeNavigation() {
    const nav = document.querySelector('.navrow');
    if (!nav) return false;

    const nodes = NAV_ITEMS.map(item => {
      let node = findItem(nav, item.label);
      if (!node) {
        node = createItem(nav, item);
        nav.appendChild(node);
      }
      if (node.tagName === 'A') node.setAttribute('href', item.href);
      return { item, node };
    });

    const desired = nodes.map(x => x.node);
    const recognized = directNavItems(nav).filter(node =>
      NAV_ITEMS.some(item => normalizedLabel(node).startsWith(item.label))
    );
    const ordered = recognized.length === desired.length && desired.every((node, i) => recognized[i] === node);
    if (!ordered) desired.forEach(node => nav.appendChild(node));

    syncActive(nav, nodes);
    return true;
  }

  function watchNavigation() {
    const nav = document.querySelector('.navrow');
    if (!nav || nav.dataset.canonicalNavWatch === '1') return;
    nav.dataset.canonicalNavWatch = '1';
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
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

    toggle.addEventListener('click', () => {
      setOpen(!controls.classList.contains('mobile-filters-open'));
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760 && controls.classList.contains('mobile-filters-open')) setOpen(false);
    }, { passive:true });
  }

  installHeaderStyles();
  normalizeNavigation();
  watchNavigation();
  installMobileFilters();
  window.addEventListener('hashchange', normalizeNavigation);
  setTimeout(() => { normalizeNavigation(); watchNavigation(); }, 250);
  setTimeout(normalizeNavigation, 1000);
})();
