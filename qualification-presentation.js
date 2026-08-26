(() => {
  'use strict';

  const STYLE_ID = 'regulatedQualificationPresentationStyles';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .eligibility-badge.not-met {
        border-color:#c86655 !important;
        color:#ff8b80 !important;
        background:rgba(104,42,34,.22) !important;
      }
      article.card.regulated-not-met {
        border-color:#3a3f43 !important;
        box-shadow:0 10px 24px rgba(0,0,0,.20) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyPresentation() {
    document.querySelectorAll('article.card').forEach(card => {
      const regulated = Boolean(card.querySelector('.qual-box.regulated'));
      const badge = card.querySelector('.eligibility-badge');

      if (!regulated || !badge) {
        card.classList.remove('regulated-not-met');
        badge?.classList.remove('not-met');
        return;
      }

      const ready = card.classList.contains('crew-ready') || /CREW\s+QUALIFIED/i.test(badge.textContent || '');
      if (ready) {
        card.classList.remove('regulated-not-met');
        badge.classList.remove('not-met');
        return;
      }

      if (card.classList.contains('crew-action')) card.classList.remove('crew-action');
      if (!card.classList.contains('regulated-not-met')) card.classList.add('regulated-not-met');
      if (badge.classList.contains('action')) badge.classList.remove('action');
      if (!badge.classList.contains('not-met')) badge.classList.add('not-met');
      if (badge.textContent !== 'QUALIFICATIONS NOT MET') badge.textContent = 'QUALIFICATIONS NOT MET';
    });
  }

  function installObserver() {
    applyPresentation();
    const target = document.getElementById('cards') || document.body;
    const observer = new MutationObserver(applyPresentation);
    observer.observe(target, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:['class']
    });
  }

  installStyles();
  installObserver();
})();
