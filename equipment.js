(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const status = byId('equipmentStatus');
  const search = byId('equipmentSearch');
  const category = byId('equipmentCategory');
  const rows = byId('equipmentRows');
  const retry = byId('equipmentRetry');
  let inventory = null;
  const credit = value => value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }) + 'cr';

  function validate(data) {
    if (!data || data.resaleRate !== 0.5 || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated || '') || !Array.isArray(data.items) || !data.items.length) throw new Error('Invalid inventory data.');
    const names = new Set();
    for (const item of data.items) {
      if (!item || typeof item.item !== 'string' || !item.item.trim() || names.has(item.item) || !Number.isInteger(item.quantity) || item.quantity < 0 || !Number.isFinite(item.marketPrice) || item.marketPrice < 0 || typeof item.category !== 'string' || typeof item.notes !== 'string' || typeof item.unit !== 'string') throw new Error('Invalid inventory item.');
      names.add(item.item);
    }
    return data;
  }

  function render() {
    if (!inventory) return;
    const needle = search.value.trim().toLowerCase();
    const visible = inventory.items.filter(item => item.quantity > 0 && (!category.value || item.category === category.value) && (!needle || [item.item, item.category, item.notes].join(' ').toLowerCase().includes(needle)));
    const fragment = document.createDocumentFragment();
    for (const item of visible) {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      const title = document.createElement('strong');
      title.textContent = item.item;
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Details';
      const note = document.createElement('p');
      note.textContent = item.notes;
      details.append(summary, note);
      name.append(title, details);
      row.append(name);
      const market = item.quantity * item.marketPrice;
      for (const value of [String(item.quantity), credit(item.marketPrice), credit(market), credit(market * inventory.resaleRate)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      fragment.append(row);
    }
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'equipment-empty';
      cell.textContent = 'No equipment matches these filters.';
      row.append(cell);
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
    status.textContent = visible.length + ' item types shown. Summary totals cover the full shared pool.';
  }

  async function load() {
    retry.hidden = true;
    status.dataset.error = 'false';
    status.textContent = 'Loading shared equipment…';
    try {
      const response = await fetch('data/shared-equipment.json?v=20261021-equipment1', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Inventory unavailable.');
      inventory = validate(await response.json());
      const total = inventory.items.reduce((sum, item) => sum + item.quantity * item.marketPrice, 0);
      const units = inventory.items.reduce((sum, item) => sum + item.quantity, 0);
      const root = byId('equipmentSummary');
      root.replaceChildren();
      for (const [label, value] of [['Total market value', credit(total)], ['Resale at 50%', credit(total * inventory.resaleRate)], ['Counted units', String(units)]]) {
        const card = document.createElement('article');
        const heading = document.createElement('span');
        heading.textContent = label;
        const number = document.createElement('strong');
        number.textContent = value;
        card.append(heading, number);
        root.append(card);
      }
      root.hidden = false;
      category.replaceChildren(new Option('All categories', ''));
      for (const name of [...new Set(inventory.items.map(item => item.category))].sort()) category.add(new Option(name, name));
      byId('equipmentUpdated').textContent = 'Inventory updated ' + inventory.updated;
      byId('equipmentControls').hidden = false;
      byId('equipmentTableWrap').hidden = false;
      render();
    } catch (_) {
      inventory = null;
      for (const id of ['equipmentSummary', 'equipmentControls', 'equipmentTableWrap']) byId(id).hidden = true;
      status.dataset.error = 'true';
      status.textContent = 'Shared equipment could not be loaded. Please try again.';
      retry.hidden = false;
    }
  }
  search.addEventListener('input', render);
  category.addEventListener('change', render);
  retry.addEventListener('click', load);
  load();
})();
