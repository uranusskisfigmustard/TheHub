(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const periodKey = period => {
    const matches = String(period?.dates || period?.dateLabel || '').match(/(\d{4})-(\d{3})/g) || [];
    const last = matches[matches.length - 1] || '';
    const [year, day] = last.split('-').map(Number);
    return Number.isFinite(year) && Number.isFinite(day) ? year * 1000 + day : 0;
  };

  function render(root, periods = window.BETWEEN_SESSION_PERIODS || {}) {
    if (!root) throw new Error('Between Sessions root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const orderedPeriods = Object.entries(periods).sort((a, b) => periodKey(b[1]) - periodKey(a[1]));
    const selector = root.querySelector('[data-between-selector]');
    const view = root.querySelector('[data-between-view]');
    const who = root.querySelector('[data-between-who]');
    const prue = root.querySelector('[data-between-character="prue"]');
    const john = root.querySelector('[data-between-character="john"]');

    if (!selector || !view || !who || !prue || !john) {
      throw new Error('Between Sessions page controls are incomplete.');
    }

    let selectedPeriod = orderedPeriods[0]?.[0] || null;
    let selectedCharacter = 'prue';

    function renderSelector() {
      selector.innerHTML = '<div class="selector-label">INTERSESSION PERIODS</div>' + orderedPeriods.map(([id, period]) => `
        <button class="selector-btn ${id === selectedPeriod ? 'active' : ''}" type="button" data-period="${esc(id)}" aria-current="${id === selectedPeriod ? 'true' : 'false'}">
          <span class="selector-period">${esc(period.label)}</span>
          <span class="selector-dates">${esc(period.dateLabel)}</span>
        </button>
      `).join('');
    }

    function renderView() {
      const period = selectedPeriod ? periods[selectedPeriod] : null;
      const record = period?.characters?.[selectedCharacter];

      prue.classList.toggle('active', selectedCharacter === 'prue');
      john.classList.toggle('active', selectedCharacter === 'john');
      prue.setAttribute('aria-pressed', selectedCharacter === 'prue' ? 'true' : 'false');
      john.setAttribute('aria-pressed', selectedCharacter === 'john' ? 'true' : 'false');

      if (!record) {
        who.textContent = '';
        view.innerHTML = '<div class="empty">NO INTERSESSION RECORD FOR THIS CHARACTER.</div>';
        return;
      }

      who.textContent = record.name.toUpperCase();
      view.innerHTML = `
        <section class="period">
          <div class="period-head">
            <div class="period-title">${esc(record.name)} // ${esc(period.interval)}</div>
            <div class="period-dates">${esc(period.dates)}</div>
          </div>
          ${record.scenes.map(scene => `
            <article class="scene">
              <h2>${esc(scene.title)}</h2>
              ${scene.paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}
            </article>
          `).join('')}
        </section>
      `;
    }

    selector.addEventListener('click', event => {
      const button = event.target.closest('[data-period]');
      if (!button || !periods[button.dataset.period]) return;
      selectedPeriod = button.dataset.period;
      renderSelector();
      renderView();
    });

    prue.addEventListener('click', () => {
      selectedCharacter = 'prue';
      renderView();
    });

    john.addEventListener('click', () => {
      selectedCharacter = 'john';
      renderView();
    });

    renderSelector();
    renderView();
    root.dataset.rendered = 'true';
  }

  window.HubBetweenSessionsContent = Object.freeze({ render });
})();
