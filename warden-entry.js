(() => {
  'use strict';

  const BUILD = '20260919-warden-entry-preview-1';
  const LEGACY_MODULES = Object.freeze([
    'warden-v1-3.js',
    'warden-v1-4.js',
    'warden-v1-5.js',
    'warden-v1-6.js',
    'warden-v1-7.js',
    'warden-v1-8.js',
    'warden-v1-9.js',
    'warden-v2-0.js',
    'warden-v2-1.js',
    'warden-v2-2.js',
    'warden-v2-3.js',
    'warden-v2-6.js',
    'warden-evidence-labels.js',
    'warden-layout-v1.js',
    'warden-layout-v2.js',
    'warden-layout-v2-1.js',
    'warden-layout-v3.js',
    'warden-numbered-missions.js',
    'warden-classified-requests.js',
    'warden-reject-v1.js',
    'warden-participants-v1.js',
    'warden-player-reference-preview.js',
    'warden-player-reference-grouping-seed.js',
    'warden-player-reference-richtext-styles.js',
    'warden-player-reference-richtext.js',
    'warden-player-reference-editor-patch.js',
    'warden-contract-submissions-v1.js',
    'warden-between-session-v1.js',
    'warden-header-nav-v1.js'
  ]);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.wardenEntry = BUILD;
      script.addEventListener('load', () => resolve(src), { once: true });
      script.addEventListener('error', () => reject(new Error('Warden module failed to load: ' + src)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function boot(options = {}) {
    const basePath = String(options.basePath || './');
    const cacheKey = String(options.cacheKey || BUILD);
    const beforeEach = typeof options.beforeEach === 'function' ? options.beforeEach : null;
    const afterEach = typeof options.afterEach === 'function' ? options.afterEach : null;

    for (let index = 0; index < LEGACY_MODULES.length; index += 1) {
      const file = LEGACY_MODULES[index];
      beforeEach?.({ index, file, total: LEGACY_MODULES.length });
      const separator = file.includes('?') ? '&' : '?';
      await loadScript(basePath + file + separator + 'v=' + encodeURIComponent(cacheKey));
      afterEach?.({ index, file, total: LEGACY_MODULES.length });
    }

    return { build: BUILD, modulesLoaded: LEGACY_MODULES.length };
  }

  window.HubWardenEntry = Object.freeze({
    build: BUILD,
    legacyModules: LEGACY_MODULES,
    boot
  });
})();
