(() => {
  'use strict';

  const BUILD = '20260919-purchases-preview-2';
  const POST_SOURCE = 'mothership-contract-service-post';
  const DEFAULT_SESSION_KEY = 'hub-preview:board-session-v1';
  const DEFAULT_EXPIRY_KEY = 'hub-preview:board-session-expiry-v1';

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const credit = value => Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2
  }) + 'cr';

  function render(root, options = {}) {
    if (!root) throw new Error('Purchase Board preview root is unavailable.');
    if (root.dataset.rendered === 'true') return;

    const api = String(options.api || '').trim();
    const sessionKey = String(options.sessionKey || DEFAULT_SESSION_KEY);
    const expiryKey = String(options.sessionExpiryKey || DEFAULT_EXPIRY_KEY);
    if (!api) throw new Error('Purchase Board API endpoint is unavailable.');

    let setup = null;
    let selectedCharacter = '';
    let sessionToken = '';
    let sessionExpiry = 0;
    let finance = null;
    let items = [];
    let selectedCategory = 'ALL';
    let searchText = '';
    let busy = false;

    root.innerHTML = `
      <div class="purchases-heading">
        <div class="preview-kicker">MIGRATED PAGE PREVIEW</div>
        <h1>Purchase Board</h1>
        <p class="purchases-sub">Hub marketplace inventory, qualification-gated access, and recovery-debt financing presentation.</p>
      </div>

      <div class="purchase-preview-warning">
        READ-ONLY PREVIEW // PURCHASE COMMIT IS DISABLED. This page may authenticate and read the current player-safe catalog, but it cannot post a purchase or change campaign state.
      </div>

      <section class="purchase-panel" aria-labelledby="purchaseCharacterTitle">
        <div class="purchase-section-head">
          <div>
            <div class="purchase-section-kicker">STEP 1</div>
            <h2 id="purchaseCharacterTitle">Select PC</h2>
          </div>
          <div class="purchase-transport" data-purchase-transport>TRANSPORT // CHECKING</div>
        </div>
        <div class="purchase-character-controls" data-purchase-characters></div>
      </section>

      <section class="purchase-panel purchase-auth-panel" data-purchase-auth hidden aria-labelledby="purchaseAuthTitle">
        <div class="purchase-section-kicker">BOARD ACCESS</div>
        <h2 id="purchaseAuthTitle">Authenticate</h2>
        <p>Use the normal Mission Board access code. Preview authentication is stored only under the <code>hub-preview:</code> namespace.</p>
        <form class="purchase-auth-form" data-purchase-auth-form>
          <label>
            <span>BOARD PIN</span>
            <input type="password" inputmode="numeric" autocomplete="off" data-purchase-pin aria-label="Board PIN">
          </label>
          <button type="submit" class="purchase-action-btn" data-purchase-auth-button>UNLOCK CATALOG</button>
        </form>
        <div class="purchase-inline-status" data-purchase-auth-status></div>
      </section>

      <section class="purchase-market" data-purchase-market hidden>
        <div class="purchase-market-head">
          <div>
            <div class="purchase-section-kicker">CURRENT BUYER / RECIPIENT</div>
            <h2 data-purchase-who>—</h2>
          </div>
          <button type="button" class="purchase-quiet-btn" data-purchase-refresh>REFRESH CATALOG</button>
        </div>

        <div class="purchase-finance-grid" data-purchase-finance></div>

        <div class="purchase-toolbar">
          <label class="purchase-search">
            <span>SEARCH</span>
            <input type="search" data-purchase-search placeholder="Item, provider, or function">
          </label>
          <div class="purchase-count" data-purchase-count>—</div>
        </div>

        <div class="purchase-categories" data-purchase-categories aria-label="Purchase categories"></div>
        <div class="purchase-items" data-purchase-items></div>
      </section>

      <div class="purchase-page-status" data-purchase-status>LOADING PURCHASE BOARD SETUP…</div>
    `;

    const el = selector => root.querySelector(selector);
    const characterControls = el('[data-purchase-characters]');
    const authPanel = el('[data-purchase-auth]');
    const authForm = el('[data-purchase-auth-form]');
    const pinInput = el('[data-purchase-pin]');
    const authButton = el('[data-purchase-auth-button]');
    const authStatus = el('[data-purchase-auth-status]');
    const market = el('[data-purchase-market]');
    const who = el('[data-purchase-who]');
    const financeRoot = el('[data-purchase-finance]');
    const search = el('[data-purchase-search]');
    const count = el('[data-purchase-count]');
    const categories = el('[data-purchase-categories]');
    const itemRoot = el('[data-purchase-items]');
    const refreshButton = el('[data-purchase-refresh]');
    const pageStatus = el('[data-purchase-status]');
    const transport = el('[data-purchase-transport]');

    function setStatus(message, state = '') {
      pageStatus.textContent = String(message || '');
      pageStatus.dataset.state = state;
    }

    function setBusy(value) {
      busy = Boolean(value);
      authButton.disabled = busy;
      refreshButton.disabled = busy;
      root.querySelectorAll('[data-purchase-character]').forEach(button => {
        button.disabled = busy;
      });
    }

    function setTransport(label) {
      transport.textContent = `TRANSPORT // ${String(label || '—').toUpperCase()}`;
    }

    function clearSession() {
      sessionToken = '';
      sessionExpiry = 0;
      try {
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(expiryKey);
      } catch (_) {}
    }

    function loadSession() {
      try {
        const token = String(localStorage.getItem(sessionKey) || '').trim();
        const expiry = Number(localStorage.getItem(expiryKey) || 0);
        if (token && expiry > Date.now() + 5000) {
          sessionToken = token;
          sessionExpiry = expiry;
          return true;
        }
      } catch (_) {}
      clearSession();
      return false;
    }

    function saveSession(payload) {
      const token = String(payload?.sessionToken || '').trim();
      const expiry = Number(payload?.expiresAtMs || 0);
      if (!token || !expiry) return false;
      sessionToken = token;
      sessionExpiry = expiry;
      try {
        localStorage.setItem(sessionKey, token);
        localStorage.setItem(expiryKey, String(expiry));
      } catch (_) {}
      return true;
    }

    function postRequest(action, params = {}, timeoutMs = 18000) {
      return new Promise((resolve, reject) => {
        const requestId = `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const frame = document.createElement('iframe');
        const form = document.createElement('form');
        const frameName = `purchasePost_${requestId.replace(/[^A-Za-z0-9_]/g, '_')}`;
        let settled = false;
        let timer = null;

        frame.name = frameName;
        frame.hidden = true;
        frame.setAttribute('aria-hidden', 'true');
        form.method = 'POST';
        form.action = api;
        form.target = frameName;
        form.hidden = true;

        Object.entries({ ...params, action, requestId }).forEach(([name, value]) => {
          if (value === undefined || value === null) return;
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        });

        const cleanup = () => {
          window.removeEventListener('message', onMessage);
          if (timer) clearTimeout(timer);
          form.remove();
          setTimeout(() => frame.remove(), 0);
        };

        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        };

        function onMessage(event) {
          const data = event?.data;
          if (!data || data.source !== POST_SOURCE || data.requestId !== requestId) return;
          finish(resolve, data.payload || {});
        }

        window.addEventListener('message', onMessage);
        document.body.appendChild(frame);
        document.body.appendChild(form);
        timer = setTimeout(() => finish(reject, new Error('POST compatibility transport timed out.')), timeoutMs);

        try {
          form.submit();
        } catch (error) {
          finish(reject, error);
        }
      });
    }

    function jsonpRequest(action, params = {}, timeoutMs = 15000) {
      return new Promise((resolve, reject) => {
        const callback = `__hubPurchasePreview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        let settled = false;
        let timer = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          script.remove();
          try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        };

        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        };

        window[callback] = payload => finish(resolve, payload || {});
        const queryParams = new URLSearchParams({
          ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
          action,
          callback,
          ts: String(Date.now())
        });
        script.src = `${api}?${queryParams}`;
        script.referrerPolicy = 'no-referrer';
        script.onerror = () => finish(reject, new Error('Legacy compatibility script blocked.'));
        document.body.appendChild(script);
        timer = setTimeout(() => finish(reject, new Error('Legacy compatibility request timed out.')), timeoutMs);
      });
    }

    async function request(action, params = {}) {
      const legacyAction = action === 'purchaseauthenticate' ? 'authenticate' : action;
      try {
        const payload = await postRequest(action, params);
        const unsupported = payload?.ok === false && /unknown submission-service action/i.test(String(payload?.error || ''));
        if (!unsupported) {
          setTransport('POST COMPATIBILITY');
          return payload;
        }
      } catch (_) {
        // Current production may still be on the legacy deployment until the audited backend is redeployed.
      }

      const payload = await jsonpRequest(legacyAction, params);
      setTransport('LEGACY JSONP');
      return payload;
    }

    function renderCharacters() {
      const characters = Array.isArray(setup?.characters) ? setup.characters : [];
      characterControls.innerHTML = characters.map(name => `
        <button type="button"
          class="purchase-character-btn${selectedCharacter === name ? ' active' : ''}"
          data-purchase-character="${esc(name)}"
          aria-pressed="${selectedCharacter === name ? 'true' : 'false'}">
          ${esc(name).toUpperCase()}
        </button>
      `).join('');
      characterControls.querySelectorAll('[data-purchase-character]').forEach(button => {
        button.addEventListener('click', () => selectCharacter(button.dataset.purchaseCharacter || ''));
      });
    }

    function renderFinance() {
      if (!finance) {
        financeRoot.innerHTML = '';
        return;
      }
      const cells = [
        ['PERSONAL BALANCE', finance.personalBalance],
        ['PRINCIPAL', finance.principalBalance],
        ['FINANCING AVAILABLE', finance.financingAvailable],
        ['PRINCIPAL CAP', finance.principalCap]
      ];
      financeRoot.innerHTML = cells.map(([label, value]) => `
        <div class="purchase-finance-cell">
          <span>${esc(label)}</span>
          <strong>${esc(credit(value))}</strong>
        </div>
      `).join('');
    }

    function categoryList() {
      const unique = new Set(
        items.map(item => String(item.category || '').trim()).filter(Boolean)
      );
      return ['ALL', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
    }

    function renderCategories() {
      categories.innerHTML = categoryList().map(category => `
        <button type="button"
          class="purchase-category-btn${selectedCategory === category ? ' active' : ''}"
          data-purchase-category="${esc(category)}">${esc(category)}</button>
      `).join('');
      categories.querySelectorAll('[data-purchase-category]').forEach(button => {
        button.addEventListener('click', () => {
          selectedCategory = button.dataset.purchaseCategory || 'ALL';
          renderCategories();
          renderItems();
        });
      });
    }

    function filteredItems() {
      const needle = String(searchText || '').trim().toLowerCase();
      return items.filter(item => {
        if (selectedCategory !== 'ALL' && String(item.category || '') !== selectedCategory) return false;
        if (!needle) return true;
        return [item.item, item.category, item.provider, item.mechanics, item.minimumAccess]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      }).sort((a, b) => String(a.item || '').localeCompare(String(b.item || '')));
    }

    function financingNote(item) {
      if (!item?.canPurchase || !finance) return '';
      const shortfall = Math.max(0, Math.round((Number(item.price || 0) - Number(finance.personalBalance || 0)) * 100) / 100);
      const room = Number(finance.financingAvailable || 0);
      if (shortfall <= 0.005) return 'PERSONAL BALANCE // SUFFICIENT';
      if (shortfall > room + 0.005) return `FINANCE BLOCK // ${credit(shortfall)} SHORTFALL EXCEEDS AVAILABLE ROOM`;
      return `FINANCING WOULD REQUIRE CONFIRMATION // ${credit(shortfall)} SHORTFALL`;
    }

    function badge(item) {
      if (!item.canPurchase) return '<span class="purchase-badge progress">ACCESS IN PROGRESS</span>';
      if (item.restricted) return '<span class="purchase-badge restricted">RESTRICTED // CLEARED</span>';
      return '<span class="purchase-badge">AVAILABLE</span>';
    }

    function renderItems() {
      const visible = filteredItems();
      count.textContent = `${visible.length} OF ${items.length} ITEMS`;
      if (!visible.length) {
        itemRoot.innerHTML = '<div class="purchase-empty">No items match the current filter.</div>';
        return;
      }

      itemRoot.innerHTML = visible.map(item => {
        const progress = !item.canPurchase;
        const accessBlock = progress ? `
          <div class="purchase-access-block">
            ${item.progressStanding ? `<div><span>QUALIFICATION ROUTE</span><strong>${esc(item.progressStanding)}</strong></div>` : ''}
            ${item.minimumAccess ? `<div><span>REMAINING ACCESS</span><strong>${esc(item.minimumAccess)}</strong></div>` : ''}
          </div>
        ` : '';
        const financeNote = financingNote(item);
        return `
          <article class="purchase-item${progress ? ' progress' : ''}${item.restricted ? ' restricted' : ''}">
            <div class="purchase-item-top">
              <div>
                <div class="purchase-item-category">${esc(item.category)}</div>
                <h3>${esc(item.item)}</h3>
              </div>
              <div class="purchase-price">${esc(item.priceLabel || credit(item.price))}</div>
            </div>
            <div class="purchase-item-badges">${badge(item)}</div>
            <p class="purchase-mechanics">${esc(item.mechanics)}</p>
            <div class="purchase-provider">PROVIDER // ${esc(item.provider || 'Hub merchant')}</div>
            ${accessBlock}
            ${financeNote ? `<div class="purchase-finance-note">${esc(financeNote)}</div>` : ''}
            <button type="button" class="purchase-disabled-btn" disabled>${progress ? 'LOCKED' : 'PREVIEW // PURCHASE DISABLED'}</button>
          </article>
        `;
      }).join('');
    }

    function showAuth(message = '') {
      authPanel.hidden = false;
      market.hidden = true;
      authStatus.textContent = message;
      if (!busy) setTimeout(() => pinInput.focus(), 0);
    }

    function showMarket() {
      authPanel.hidden = true;
      market.hidden = false;
      who.textContent = selectedCharacter || '—';
      renderFinance();
      renderCategories();
      renderItems();
    }

    const isAuthFailure = payload => /board authentication required|invalid board access code|session/i.test(String(payload?.error || ''));

    async function loadCatalog() {
      if (!selectedCharacter) {
        setStatus('SELECT A PC BEFORE SHOPPING');
        return;
      }
      if (!sessionToken || sessionExpiry <= Date.now() + 5000) {
        clearSession();
        showAuth('Board authentication is required before inventory is returned.');
        setStatus('BOARD ACCESS REQUIRED');
        return;
      }

      setBusy(true);
      setStatus(`LOADING ${selectedCharacter.toUpperCase()} CATALOG…`);
      try {
        const payload = await request('purchasecatalog', {
          session: sessionToken,
          character: selectedCharacter
        });
        if (!payload || payload.ok !== true) {
          if (isAuthFailure(payload)) {
            clearSession();
            showAuth('Session expired. Re-enter the Board PIN.');
            setStatus('BOARD ACCESS REQUIRED', 'error');
            return;
          }
          throw new Error(payload?.error || 'Purchase catalog unavailable.');
        }

        finance = payload.finance || null;
        items = Array.isArray(payload.items) ? payload.items : [];
        selectedCategory = 'ALL';
        searchText = '';
        search.value = '';
        showMarket();
        setStatus(`${selectedCharacter.toUpperCase()} // ${items.length} PLAYER-SAFE CATALOG ITEMS // READ-ONLY PREVIEW`, 'ok');
      } catch (error) {
        showAuth('Catalog transport unavailable in this browser or the POST compatibility backend has not yet been deployed.');
        setStatus(String(error?.message || error || 'Purchase catalog unavailable.'), 'error');
      } finally {
        setBusy(false);
      }
    }

    async function selectCharacter(name) {
      if (busy) return;
      selectedCharacter = String(name || '').trim();
      finance = null;
      items = [];
      renderCharacters();
      market.hidden = true;

      if (!selectedCharacter) {
        authPanel.hidden = true;
        setStatus('SELECT A PC BEFORE SHOPPING');
        return;
      }
      if (loadSession()) {
        await loadCatalog();
      } else {
        showAuth('Board authentication is required before inventory is returned.');
        setStatus(`${selectedCharacter.toUpperCase()} SELECTED // BOARD ACCESS REQUIRED`);
      }
    }

    async function authenticate(event) {
      event.preventDefault();
      if (busy || !selectedCharacter) return;
      const pin = String(pinInput.value || '').trim();
      if (!pin) {
        authStatus.textContent = 'Enter the Board PIN.';
        return;
      }

      setBusy(true);
      authStatus.textContent = 'AUTHENTICATING…';
      try {
        const payload = await request('purchaseauthenticate', { pin });
        if (!payload || payload.ok !== true || !payload.authenticated || !saveSession(payload)) {
          throw new Error(payload?.error || 'Board authentication failed.');
        }
        pinInput.value = '';
        authStatus.textContent = 'BOARD ACCESS // AUTHENTICATED';
        await loadCatalog();
      } catch (error) {
        authStatus.textContent = String(error?.message || error || 'Board authentication failed.');
        setStatus('BOARD AUTHENTICATION FAILED', 'error');
      } finally {
        setBusy(false);
      }
    }

    search.addEventListener('input', () => {
      searchText = search.value || '';
      renderItems();
    });
    refreshButton.addEventListener('click', () => {
      if (!busy) loadCatalog();
    });
    authForm.addEventListener('submit', authenticate);

    root.dataset.rendered = 'true';

    (async () => {
      setBusy(true);
      try {
        const payload = await request('purchasesetup');
        if (!payload || payload.ok !== true || payload.available === false) {
          throw new Error(payload?.error || 'Purchase Board setup unavailable.');
        }
        setup = payload;
        renderCharacters();
        loadSession();
        setStatus('SELECT A PC BEFORE SHOPPING');
      } catch (error) {
        characterControls.innerHTML = '<div class="purchase-empty">Purchase Board setup could not be loaded.</div>';
        setStatus(String(error?.message || error || 'Purchase Board unavailable.'), 'error');
      } finally {
        setBusy(false);
      }
    })();
  }

  window.HubPurchasesPreview = Object.freeze({ build: BUILD, render });
})();
