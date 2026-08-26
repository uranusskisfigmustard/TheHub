(() => {
  'use strict';

  const STYLE_ID = 'qualificationPresentationStyles';
  const QUALIFIED_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4L12 2.8Z" stroke="currentColor" stroke-width="1.7"/><path d="m8.2 12.1 2.5 2.5 5.1-5.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      article.card.crew-ready,
      article.card.crew-action,
      article.card.regulated-not-met {
        border-color:#3a3f43 !important;
        box-shadow:0 10px 24px rgba(0,0,0,.20) !important;
      }

      #highlightLabel { display:none !important; }

      .qual-box.crew-qualified {
        border-color:#4f6a46 !important;
        background:rgba(39,58,36,.38) !important;
      }
      .qual-box.crew-qualified .qual-head,
      .qual-box.crew-qualified .qual-icon {
        color:#bdd2aa !important;
      }

      .eligibility-badge.not-met {
        border-color:#c86655 !important;
        color:#ff8b80 !important;
        background:rgba(104,42,34,.22) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function rememberBaseIcon(icon) {
    if (!icon || icon.__baseQualificationIcon !== undefined) return;
    icon.__baseQualificationIcon = icon.innerHTML;
  }

  function restoreBaseIcon(icon) {
    if (!icon) return;
    rememberBaseIcon(icon);
    if (!icon.classList.contains('crew-qualified-icon')) return;
    icon.innerHTML = icon.__baseQualificationIcon || '';
    icon.classList.remove('crew-qualified-icon');
  }

  function setQualifiedIcon(icon) {
    if (!icon) return;
    rememberBaseIcon(icon);
    if (icon.classList.contains('crew-qualified-icon')) return;
    icon.innerHTML = QUALIFIED_ICON;
    icon.classList.add('crew-qualified-icon');
  }

  function applyPresentation() {
    document.querySelectorAll('article.card').forEach(card => {
      const badge = card.querySelector('.eligibility-badge');
      const qualBox = card.querySelector('.qual-box');
      const icon = qualBox?.querySelector('.qual-icon');
      const regulated = Boolean(card.querySelector('.qual-box.regulated'));
      const ready = Boolean(badge) && (
        card.classList.contains('crew-ready') ||
        /CREW\s+QUALIFIED/i.test(badge.textContent || '')
      );

      if (ready) {
        card.classList.remove('regulated-not-met');
        badge.classList.remove('not-met');
        qualBox?.classList.add('crew-qualified');
        setQualifiedIcon(icon);
        return;
      }

      qualBox?.classList.remove('crew-qualified');
      restoreBaseIcon(icon);
      card.classList.remove('regulated-not-met');
      badge?.classList.remove('not-met');

      if (regulated && badge) {
        card.classList.remove('crew-action');
        card.classList.add('regulated-not-met');
        badge.classList.remove('action');
        badge.classList.add('not-met');
        if (badge.textContent !== 'QUALIFICATIONS NOT MET') {
          badge.textContent = 'QUALIFICATIONS NOT MET';
        }
      }
    });
  }

  function installObserver() {
    const target = document.getElementById('cards');
    if (!target) return;
    applyPresentation();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        applyPresentation();
      });
    });

    observer.observe(target, { childList:true, subtree:true });
  }

  installStyles();
  installObserver();
})();
