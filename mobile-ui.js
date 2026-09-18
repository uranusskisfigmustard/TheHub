(() => {
  'use strict';

  function normalizeReferenceAddOnSlots() {
    if (!/player-reference\.html$/i.test(location.pathname)) return;
    document.querySelectorAll('.ref-table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) return;
      const item = String(cells[0].textContent || '').trim();
      if (item === 'Emergency Disconnect' || item === 'Isolation Buffer') {
        cells[2].textContent = 'N/A Add-on';
      }
    });
  }

  normalizeReferenceAddOnSlots();

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
    if (window.innerWidth > 760 && controls.classList.contains('mobile-filters-open')) {
      setOpen(false);
    }
  }, { passive:true });
})();
