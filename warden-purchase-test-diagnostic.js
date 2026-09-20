(() => {
  'use strict';

  const BUILD = '20260920-warden-purchase-test-diagnostic-1';
  const STALE = /unknown (?:submission|contract)-service action/i;
  const MESSAGE = 'PURCHASE TEST BACKEND NOT DEPLOYED // The live Apps Script project does not contain the current Purchase Test router/module source. Sync 01_WebRouter.gs, 16_PlayerSubmissions.gs, 19_Player_Purchases.gs, and add 20_Warden_PurchaseTest.gs, then create a new Web App version.';

  function rewrite() {
    const host = document.getElementById('wardenPurchaseTestMessage');
    if (!host) return;
    const text = String(host.textContent || '');
    if (!STALE.test(text)) return;
    host.textContent = MESSAGE;
    host.className = 'notice bad';
  }

  const observer = new MutationObserver(rewrite);
  observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true});
  rewrite();

  window.HubWardenPurchaseTestDiagnostic = Object.freeze({build:BUILD, refresh:rewrite});
})();