(() => {
  'use strict';

  const BUILD = '20260922-contract-session-play-1';
  let scheduled = false;

  function installStyles() {
    if (document.getElementById('contractSessionPlayStyles')) return;
    const style = document.createElement('style');
    style.id = 'contractSessionPlayStyles';
    style.textContent = `
      .contract-session-play {
        margin-top: 14px;
        padding: 12px 0 0;
        border-top: 1px solid #303538;
        color: #d5d0c4;
        font-size: .82rem;
        line-height: 1.45;
      }
      .contract-session-play strong {
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  function isBetweenSession(card) {
    return Boolean(card.querySelector('.between-session-state, .between-session-help'));
  }

  function updateCard(card) {
    if (isBetweenSession(card)) {
      card.querySelector('.contract-session-play')?.remove();
      return;
    }

    card.querySelector('.contract-submission')?.remove();

    if (!card.querySelector('.contract-session-play')) {
      const notice = document.createElement('section');
      notice.className = 'contract-session-play';
      notice.setAttribute('aria-label', 'Session play notice');
      notice.innerHTML = '<strong>This will be played during session.</strong>';
      card.appendChild(notice);
    }
  }

  function run() {
    installStyles();
    document.querySelectorAll('#contractLogsRoot .contract-log-card.active').forEach(updateCard);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      run();
    }, 0);
  }

  installStyles();
  run();

  const root = document.getElementById('contractLogsRoot');
  if (root) {
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hub-player-contracts-updated', schedule);
  setTimeout(schedule, 250);
  setTimeout(schedule, 1000);

  window.HubContractSessionPlay = Object.freeze({ build: BUILD, refresh: schedule });
})();
