(() => {
  'use strict';
  const feed = document.getElementById('newsFeed');
  const filters = document.getElementById('newsFilters');
  const status = document.getElementById('newsReception');
  const explainer = document.getElementById('newsExplainer');
  if (!feed || !filters || !status || !explainer) return;
  const descriptions = {
    latest: 'Things people are saying around the Hub. Not an official record, and not all of it is true.',
    local: 'Local complaints, questions, warnings and whatever else people feel like posting.',
    outside: 'Stuff from outside the system travels on ships. Check when it was written AND when it got here.',
    discussion: 'General chat, rumors, arguments and questions. Take it all with a grain of salt.'
  };
  let records = [];
  let currentView = 'latest';
  let campaignDate = null;
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined && value !== null) el.textContent = String(value);
    return el;
  };
  const validStamp = value => /^\d{4}-\d{3}$/.test(String(value || ''));
  // Defense in depth: malformed comments or accidental private editorial copy must never render.
  const privateAnnotation = /in[- ]character|warden[- ]only|internal warden|no new event established|consistent with existing|unverified hearsay|no public incident confirmed/i;
  const publicComment = c => c && typeof c.by === 'string' && c.by.trim()
    && typeof c.text === 'string' && c.text.trim() && validStamp(c.date)
    && !privateAnnotation.test(c.text) && !privateAnnotation.test(c.by)
    && Object.keys(c).every(key => ['by','date','text'].includes(key));
  // Calendar anchor: campaign date advances one day per real New York calendar day.
  // To fast-forward or correct campaign time, update anchorCampaignDate and
  // anchorRealDate together in data/campaign-date.json.
  const nyToday = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const get = type => Number(parts.find(p => p.type === type).value);
    return { year: get('year'), month: get('month'), day: get('day') };
  };
  const dayNumber = ({year,month,day}) => Math.floor(Date.UTC(year,month-1,day)/86400000);
  const parseRealDate = value => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value || '')) throw new Error('Invalid clock anchor date.');
    const [year,month,day] = value.split('-').map(Number);
    const d = new Date(Date.UTC(year,month-1,day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth()+1 !== month || d.getUTCDate() !== day)
      throw new Error('Invalid clock anchor date.');
    return {year,month,day};
  };
  const stampToDay = stamp => {
    if (!validStamp(stamp)) throw new Error('Invalid campaign anchor.');
    const [year,ordinal] = stamp.split('-').map(Number);
    const max = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    if (ordinal < 1 || ordinal > max) throw new Error('Invalid campaign ordinal.');
    return dayNumber({year,month:1,day:1}) + ordinal - 1;
  };
  const dayToStamp = absolute => {
    const date = new Date(absolute * 86400000);
    const year = date.getUTCFullYear();
    const ordinal = absolute - dayNumber({year,month:1,day:1}) + 1;
    return year + '-' + String(ordinal).padStart(3,'0');
  };
  const due = date => validStamp(date) && campaignDate && date <= campaignDate;
  const lastActivity = post => (post.comments || []).reduce((latest, item) => item.date > latest ? item.date : latest, post.date);
  const makeMeta = (post) => {
    const lines = ['POSTED ' + post.date];
    if (lastActivity(post) !== post.date) lines.push('LATEST REPLY ' + lastActivity(post));
    if (post.originDate) lines.push('ORIGINAL ' + post.originDate);
    if (post.receivedDate) lines.push('RECEIVED ' + post.receivedDate);
    return lines.join('  /  ');
  };
  function makePost(post) {
    const card = node('article', 'news-card');
    card.id = 'post-' + post.id;
    const header = node('header', 'news-thread-header');
    const author = post.source.includes(' ') ? post.source : '@' + post.source;
    header.append(node('span', 'news-author', author), node('span', 'news-meta', makeMeta(post)));
    card.append(header, node('span', 'news-type', post.typeLabel), node('h2', '', post.title));
    const body = node('div', 'news-body news-thread-body');
    body.append(node('p', 'news-summary', post.summary));
    post.body.forEach(p => body.append(node('p', '', p)));
    card.append(body);
    const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;
    if (commentCount) {
      const details = node('details', 'news-replies');
      details.append(node('summary', '', 'SHOW ' + commentCount + ' REPL' + (commentCount === 1 ? 'Y' : 'IES')));
      const section = node('section', 'news-comments');
      section.append(node('h3', '', 'REPLIES  /  READ ONLY'));
      for (const comment of post.comments) {
        const item = node('div', 'news-comment');
        const who = node('strong', '', comment.by.includes(' ') ? comment.by : '@' + comment.by);
        const when = node('span', '', comment.date || post.date);
        item.append(who, when, node('p', '', comment.text));
        section.append(item);
      }
      details.append(section);
      card.append(details);
    } else {
      card.append(node('p', 'news-no-replies', 'NO REPLIES YET  /  READ ONLY'));
    }
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
      (currentView === 'discussion' && p.category === 'discussion'));
    feed.replaceChildren();
    if (!chosen.length) {
      feed.append(node('p', 'news-empty', currentView === 'outside'
        ? "No off-Hub posts have reached this board yet. That does not mean there is no off-Hub news."
        : 'Nothing posted here yet.'));
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
      // The campaign clock is derived from canon, never the real-world date.
      // Fail closed if the clock cannot be read.
      const clockResponse = await fetch('./data/campaign-date.json', { cache: 'no-store' });
      if (!clockResponse.ok) throw new Error('Campaign clock unavailable.');
      const clock = await clockResponse.json();
      if (clock.schemaVersion !== 1 || !validStamp(clock.asOf)) throw new Error('Invalid campaign clock.');
      if (clock.anchorRealDate && clock.anchorCampaignDate) {
        const elapsed = dayNumber(nyToday()) - dayNumber(parseRealDate(clock.anchorRealDate));
        campaignDate = dayToStamp(stampToDay(clock.anchorCampaignDate) + elapsed);
      } else {
        campaignDate = clock.asOf; // Compatibility with older clock files.
      }
      const response = await fetch('./data/hub-news.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Public feed unavailable (' + response.status + ').');
      const payload = await response.json();
      if (payload.schemaVersion !== 1 || !Array.isArray(payload.posts) || !validStamp(payload.asOf)) {
        throw new Error('Public feed format is not valid.');
      }
      const ids = new Set();
      records = payload.posts.filter(post => {
        const okay = post && post.visibility === 'PUBLIC' && /^[a-z0-9-]{2,80}$/.test(post.id || '')
          && !ids.has(post.id) && due(post.date)
          && ['local','outside','discussion'].includes(post.category)
          && typeof post.title === 'string' && typeof post.source === 'string' && typeof post.summary === 'string'
          && typeof post.typeLabel === 'string' && Array.isArray(post.body)
          && post.body.every(p => typeof p === 'string')
          && (post.comments === undefined || (Array.isArray(post.comments)
            && post.comments.every(publicComment)));
        if (okay) ids.add(post.id);
        return okay;
      });
      records = records.map(post => ({...post, comments: (post.comments || []).filter(c => due(c.date) && c.date >= post.date)}));
      records.sort((a,b) => lastActivity(b).localeCompare(lastActivity(a)) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
      status.textContent = 'CAMPAIGN DATE  /  ' + campaignDate;
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
