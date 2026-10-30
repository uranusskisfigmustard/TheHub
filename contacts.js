(() => {
  'use strict';

  const results = document.getElementById('contactsResults');
  const detail = document.getElementById('contactsDetail');
  const directory = document.getElementById('contactsDirectory');
  let selectedId = '';
  const sectionOpen = { person: true, group: true };
  let visibleEntries = [];
  const status = document.getElementById('contactsStatus');
  const search = document.getElementById('contactsSearch');
  const perspective = document.getElementById('contactsPerspective');
  const certainty = document.getElementById('contactsCertainty');
  const reset = document.getElementById('contactsReset');
  const typeButtons = [...document.querySelectorAll('[data-contact-type]')];
  if (!results || !status || !search || !perspective || !certainty || !reset) return;

  const labels = { known: 'Known', reported: 'Reported', suspected: 'Crew theory', unconfirmed: 'Unconfirmed' };
  const names = { john: 'John', prue: 'Prue', cassidy: 'Cassidy' };
  let entries = [];
  let entryMap = new Map();
  let activeType = 'all';
  let loaded = false;
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function validate(data) {
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.entries)) throw new Error('Invalid directory');
    const ids = new Set();
    for (const entry of data.entries) {
      if (!entry || !/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id) ||
          !['person', 'group'].includes(entry.type) || typeof entry.name !== 'string' || !entry.name ||
          typeof entry.role !== 'string' || !Array.isArray(entry.affiliations) ||
          !Array.isArray(entry.notes) || !entry.notes.length) throw new Error('Invalid entry');
      if (entry.type === 'person' && entry.encountered !== true) throw new Error('Person lacks verified encounter');
      const assetPattern = entry.type === 'person' ? /^assets\/portraits\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/ : /^assets\/(portraits|logos)\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/;
      if (entry.portrait && !assetPattern.test(entry.portrait)) throw new Error('Invalid portrait');
      ids.add(entry.id);
      for (const note of entry.notes) {
        if (!note || !Object.hasOwn(labels, note.kind) || typeof note.text !== 'string' || !note.text ||
            typeof note.source !== 'string' || !note.source || !Array.isArray(note.by) || !note.by.length ||
            note.by.some(id => !Object.hasOwn(names, id)) ||
            (note.overview !== undefined && typeof note.overview !== 'boolean')) throw new Error('Invalid note');
      }
    }
    const groups = new Set(data.entries.filter(entry => entry.type === 'group').map(entry => entry.id));
    for (const entry of data.entries) {
      if (entry.affiliations.some(id => !groups.has(id))) throw new Error('Unknown connection');
    }
    return data.entries;
  }

  function setType(type) {
    activeType = type;
    for (const button of typeButtons) button.setAttribute('aria-pressed', String(button.dataset.contactType === type));
  }

  function notesFor(entry) {
    return entry.notes.filter(note => {
      const audience = perspective.value;
      return (certainty.value === 'all' || note.kind === certainty.value) &&
        (audience === 'all' || (audience === 'crew' ? Object.keys(names).every(id => note.by.includes(id)) : note.by.includes(audience)));
    });
  }

  function card(entry, notes) {
    const article = element('article', 'contact-card');
    article.id = entry.id;
    article.dataset.entryType = entry.type;
    article.setAttribute('aria-labelledby', entry.id + '-title');

    const header = element('div', 'contact-profile-heading');
    if (entry.portrait) header.appendChild(portrait(entry, false));
    const identity = element('div', 'contact-identity');
    header.appendChild(identity);
    article.appendChild(header);
    identity.appendChild(element('div', 'contact-kind', entry.type === 'person' ? 'Person' : 'Faction / group'));

    const heading = element('h2');
    heading.id = entry.id + '-title';
    const permalink = element('a', '', entry.name);
    permalink.href = '#' + entry.id;
    heading.appendChild(permalink);
    heading.tabIndex = -1;
    identity.append(heading, element('p', 'contact-role', entry.role));

    if (entry.affiliations.length) {
      const connections = element('div', 'contact-connections');
      connections.setAttribute('aria-label', 'Connections');
      for (const id of entry.affiliations) {
        const link = element('a', '', entryMap.get(id).name);
        link.href = '#' + id;
        link.dataset.contactLink = id;
        connections.appendChild(link);
      }
      identity.appendChild(connections);
    }

    // Work exclusively from the active audience/certainty-filtered notes.
    // An overview is never allowed to bypass character-specific knowledge.
    const overview = notes.find(note => note.overview) ||
      notes.find(note => note.kind === 'known') || notes[0];

    const overviewSection = element('section', 'contact-overview');
    const overviewHeading = element('h3', 'contact-section-heading',
      overview.kind === 'known' ? 'Overview' : 'Overview · ' + labels[overview.kind]);
    overviewSection.append(
      overviewHeading,
      element('p', 'contact-overview-text', overview.text)
    );
    article.appendChild(overviewSection);

    const remaining = notes.filter(note => note !== overview);
    const groups = element('div', 'contact-fact-sections');
    for (const kind of Object.keys(labels)) {
      const groupedNotes = remaining.filter(note => note.kind === kind);
      if (!groupedNotes.length) continue;
      const section = element('section', 'contact-fact-section');
      section.appendChild(element('h3', 'contact-section-heading', labels[kind]));
      const list = element('ul', 'contact-fact-list');
      for (const note of groupedNotes) {
        const item = element('li', 'contact-fact');
        item.dataset.noteKind = kind;
        item.appendChild(element('span', 'contact-fact-text', note.text));
        list.appendChild(item);
      }
      section.appendChild(list);
      groups.appendChild(section);
    }
    article.appendChild(groups);
    return article;
  }

  function portrait(entry, compact) {
    const frame = element('span', compact ? 'contact-avatar' : 'contact-portrait');
    if (entry.type === 'group') frame.classList.add('contact-logo-frame');
    frame.setAttribute('aria-hidden', 'true');
    const initials = element('span', 'contact-initials', entry.name.split(/\s+/).slice(0, 2).map(word => word[0]).join(''));
    initials.setAttribute('aria-hidden', 'true');
    frame.appendChild(initials);
    if (entry.portrait) {
      const img = element('img');
      img.alt = compact ? '' : 'Portrait of ' + entry.name;
      if (!compact) frame.removeAttribute('aria-hidden');
      const isGroupLogo = entry.type === 'group';
      img.loading = isGroupLogo ? 'eager' : 'lazy';
      img.decoding = isGroupLogo ? 'sync' : 'async';
      img.src = isGroupLogo ? entry.portrait + '?v=20261030-logo-final1' : entry.portrait;
      img.addEventListener('error', () => img.remove(), { once: true });
      frame.appendChild(img);
    }
    return frame;
  }

  function select(id, focus = false) {
    const item = visibleEntries.find(item => item.entry.id === id);
    if (!item) return;
    selectedId = id;
    detail.replaceChildren(card(item.entry, item.notes));
    for (const link of results.querySelectorAll('[data-profile]')) {
      if (link.dataset.profile === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    if (focus) {
      if (window.matchMedia?.('(max-width: 760px)').matches) directory.open = false;
      detail.querySelector('h2').focus({ preventScroll: true });
      detail.scrollIntoView({ block: 'nearest' });
    }
  }

  function render() {
    if (!loaded) return;
    for (const section of results.querySelectorAll('details[data-directory-type]')) {
      sectionOpen[section.dataset.directoryType] = section.open;
    }
    const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    const visible = entries.map(entry => ({ entry, notes: notesFor(entry) })).filter(({ entry, notes }) => {
      if (!notes.length || (activeType !== 'all' && entry.type !== activeType)) return false;
      const haystack = normalize([entry.name, entry.role, ...entry.affiliations.map(id => entryMap.get(id).name),
        ...notes.flatMap(note => [note.text, note.source, ...note.by.map(id => names[id])])].join(' '));
      return words.every(word => haystack.includes(word));
    }).sort((a, b) => a.entry.name.localeCompare(b.entry.name, 'en', { sensitivity: 'base' }));
    visibleEntries = visible;
    const sections = [];
    for (const [type, label] of [['person', 'People'], ['group', 'Organizations & groups']]) {
      const members = visible.filter(item => item.entry.type === type);
      if (!members.length) continue;
      const section = element('details', 'contact-index-section');
      section.dataset.directoryType = type;
      section.open = sectionOpen[type];
      const heading = element('summary', 'contact-index-heading', label + ' (' + members.length + ')');
      heading.id = 'directory-' + type;
      section.setAttribute('aria-labelledby', heading.id);
      section.appendChild(heading);
      const links = members.map(({ entry, notes }) => {
        const link = element('a', 'contact-index-row');
        link.href = '#' + entry.id;
        link.dataset.profile = entry.id;
        const copy = element('span', 'contact-index-copy');
        copy.append(element('strong', '', entry.name), element('span', '', entry.role),
          element('small', '', (entry.type === 'person' ? 'Person' : 'Group') + ' · ' + notes.length + ' notes'));
        link.append(portrait(entry, true), copy);
        return link;
      });
      section.append(...links);
      sections.push(section);
    }
    results.replaceChildren(...sections);
    document.getElementById('contactsCount').textContent = '(' + visible.length + ')';
    if (visible.length) select(visible.some(item => item.entry.id === selectedId) ? selectedId : visible[0].entry.id);
    else { detail.replaceChildren(); directory.open = true; }
    const people = visible.filter(item => item.entry.type === 'person').length;
    const groups = visible.length - people;
    status.textContent = `${visible.length} entries · ${people} ${people === 1 ? 'person' : 'people'} · ${groups} ${groups === 1 ? 'group' : 'groups'}`;
    if (!visible.length) {
      const empty = element('div', 'contacts-empty');
      empty.appendChild(element('p', '', 'No published notes match these filters. Try another name or clear the filters.'));
      results.appendChild(empty);
    }
  }

  function clearFilters() {
    search.value = '';
    perspective.value = 'all';
    certainty.value = 'all';
    setType('all');
    render();
  }

  function showHash() {
    if (!loaded) return;
    if (!location.hash) { if (visibleEntries.length) select(visibleEntries[0].entry.id); return; }
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!entryMap.has(id)) return;
    if (!visibleEntries.some(item => item.entry.id === id)) clearFilters();
    select(id);
    const section = results.querySelector('[data-profile="' + id + '"]')?.closest('details');
    if (section) section.open = true;
  }

  async function load() {
    loaded = false;
    results.replaceChildren();
    detail.replaceChildren();
    status.textContent = 'Loading crew notes…';
    try {
      // This is a deliberately curated public file. Never fall back to Warden NPC/faction APIs.
      const response = await fetch('data/player-contacts.json?v=20261030-logo-batch1', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Unavailable');
      entries = validate(await response.json());
      entryMap = new Map(entries.map(entry => [entry.id, entry]));
      loaded = true;
      render();
      showHash();
    } catch {
      status.textContent = 'Crew notes could not be loaded.';
      const error = element('div', 'contacts-empty contacts-error');
      error.appendChild(element('p', '', 'The notebook is unavailable. Try loading it again.'));
      const retry = element('button', '', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', load);
      error.appendChild(retry);
      results.replaceChildren(error);
    }
  }

  for (const button of typeButtons) button.addEventListener('click', () => { setType(button.dataset.contactType); render(); });
  search.addEventListener('input', render);
  perspective.addEventListener('change', render);
  certainty.addEventListener('change', render);
  reset.addEventListener('click', clearFilters);
  document.querySelector('.contacts-workspace').addEventListener('click', event => {
    const profile = event.target.closest('a[data-profile]');
    if (profile) {
      event.preventDefault();
      history.pushState(null, '', profile.getAttribute('href'));
      select(profile.dataset.profile, true);
      return;
    }
    const link = event.target.closest('a[data-contact-link]');
    if (!link) return;
    clearFilters();
    if (location.hash === '#' + link.dataset.contactLink) showHash();
  });
  window.addEventListener('hashchange', showHash);
  load();
})();
