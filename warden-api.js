(() => {
  'use strict';

  const BUILD = '20260919-warden-api-1';
  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const POST_MESSAGE_SOURCE = 'mothership-contract-service-post';

  function request(action, params = {}, options = {}) {
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 30000;
    return new Promise((resolve, reject) => {
      const requestId = 'wardenReq_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const iframe = document.createElement('iframe');
      const form = document.createElement('form');
      const frameName = 'wardenReqFrame_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      let finished = false;

      iframe.name = frameName;
      iframe.hidden = true;
      iframe.setAttribute('aria-hidden', 'true');

      form.method = 'POST';
      form.action = API;
      form.target = frameName;
      form.hidden = true;
      form.acceptCharset = 'UTF-8';

      const fields = { action, requestId, ...params };
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = typeof value === 'string' ? value : JSON.stringify(value ?? '');
        form.appendChild(input);
      });

      const timer = setTimeout(() => finish(new Error('Warden service timed out.')), timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        form.remove();
        iframe.remove();
      }

      function finish(error, payload) {
        if (finished) return;
        finished = true;
        cleanup();
        error ? reject(error) : resolve(payload);
      }

      function onMessage(event) {
        const data = event.data;
        if (!data || data.source !== POST_MESSAGE_SOURCE || data.requestId !== requestId) return;
        finish(null, data.payload);
      }

      window.addEventListener('message', onMessage);
      iframe.addEventListener('error', () => finish(new Error('Warden service unavailable.')), { once: true });
      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    });
  }

  window.HubWardenApi = Object.freeze({ build: BUILD, endpoint: API, transport: 'POST COMPATIBILITY', request });
})();
