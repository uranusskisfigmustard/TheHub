(() => {
  'use strict';
  const feed = document.getElementById('newsFeed');
  const filters = document.getElementById('newsFilters');
  const status = document.getElementById('newsReception');
  const explainer = document.getElementById('newsExplainer');
  if (!feed || !filters || !status || !explainer) return;
  const descriptions = {
    latest: 'The Hub has no single news authority. Sources may be incomplete, mistaken, or disputed.',
    local: 'District notices, public statements, worksite reports, and station news.',
    outside: 'Interstellar reports are physically delivered aboard ships. Their original dates may be far earlier than receipt.',
    discussion: 'Recorded public conversations and eyewitness accounts. These are not verified official findings.'
  };
  let records = [];
  let currentView = 'latest';
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined && value !== null) el.textContent = String(value);
    return el;
  };
  const validStamp = value => /^2237-\d{3}$/.test(String(value || ''));
  const makeMeta = (post) => {
    const lines = ['POSTED ' + post.date];
    if (post.originDate) lines.push('ORIGINAL ' + post.originDate);
    if (post.receivedDate) lines.push('RECEIVED ' + post.receivedDate);
    return lines.join('  /  ');
  };
  function makePost(post) {
    const card = node('article', 'news-card');
    card.id = 'post-' + post.id;
    const header = node('header');
    header.append(node('span', 'news-type', post.typeLabel), node('span', 'news-meta', makeMeta(post)));
    card.append(header, node('h2', '', post.title));
    card.append(node('p', 'news-source', 'SOURCE: ' + post.source));
    card.append(node('p', 'news-summary', post.summary));
    const details = node('details');
    const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;
    details.append(node('summary', '', 'READ REPORT' + (commentCount ? '  /  ' + commentCount + ' COMMENT' + (commentCount === 1 ? '' : 'S') : '')));
    const body = node('div', 'news-body');
    post.body.forEach(p => body.append(node('p', '', p)));
    details.append(body);
    if (commentCount) {
      const section = node('section', 'news-comments');
      section.append(node('h3', '', 'PUBLIC DISCUSSION  /  READ ONLY'));
      for (const comment of post.comments) {
        const item = node('div', 'news-comment');
        const who = node('strong', '', comment.by);
        const when = node('span', '', comment.date || post.date);
        item.append(who, when, node('p', '', comment.text));
        section.append(item);
      }
      details.append(section);
    }
    card.append(details);
    return card;
  }
  function render() {
    for (const button of filters.querySelectorAll('button[data-view]')) {
      button.setAttribute('aria-pressed', String(button.dataset.view === currentView));
    }
    explainer.textContent = descriptions[currentView];
    const chosen = records.filter(p => currentView === 'latest' ||
      (currentView === 'local' && p.category === 'local') ||
      (currentView === 'outside' && p.category === 'outside') ||
      (currentView === 'discussion' && (p.category === 'discussion' || (p.comments || []).length > 0)));
    feed.replaceChildren();
    if (!chosen.length) {
      feed.append(node('p', 'news-empty', currentView === 'outside'
        ? 'No outside dispatches have been selected for this public feed. This does not mean no off-Hub reports exist.'
        : 'No published entries in this section.'));
    } else chosen.forEach(p => feed.append(makePost(p)));
    feed.setAttribute('aria-busy', 'false');
  }
  filters.addEventListener('click', e => {
    const button = e.target.closest('button[data-view]');
    if (!button || !filters.contains(button) || !descriptions[button.dataset.view]) return;
    currentView = button.dataset.view;
    render();
  });
  async function load() {
    try {
      const response = await fetch('./data/hub-news.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Public feed unavailable (' + response.status + ').');
      const payload = await response.json();
      if (payload.schemaVersion !== 1 || !Array.isArray(payload.posts) || !validStamp(payload.asOf)) {
        throw new Error('Public feed format is not valid.');
      }
      const ids = new Set();
      records = payload.posts.filter(post => {
        const okay = post && post.visibility === 'PUBLIC' && /^[a-z0-9-]{2,80}$/.test(post.id || '')
          && !ids.has(post.id) && validStamp(post.date)
          && ['local','outside','discussion'].includes(post.category)
          && typeof post.title === 'string' && typeof post.source === 'string' && typeof post.summary === 'string'
          && typeof post.typeLabel === 'string' && Array.isArray(post.body)
          && post.body.every(p => typeof p === 'string')
          && (post.comments === undefined || (Array.isArray(post.comments)
            && post.comments.every(c => c && typeof c.by === 'string' && typeof c.text === 'string')));
        if (okay) ids.add(post.id);
        return okay;
      });
      records.sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
      status.textContent = 'LOCAL ARCHIVE // THROUGH ' + payload.asOf;
      render();
      const hash = location.hash.slice(1);
      if (/^post-[a-z0-9-]+$/.test(hash)) {
        const target = document.getElementById(hash);
        if (target) { target.querySelector('details')?.setAttribute('open', ''); target.scrollIntoView({block:'start'}); }
      }
    } catch (err) {
      status.textContent = 'PUBLIC FEED UNAVAILABLE';
      feed.replaceChildren(node('div', 'news-empty news-error', 'The public archive could not be loaded. Try again later.'));
      feed.setAttribute('aria-busy', 'false');
      console.error('Hub News:', err);
    }
  }
  load();
})();
