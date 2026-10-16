(() => {
  'use strict';

  const results = document.getElementById('contactsResults');
  const status = document.getElementById('contactsStatus');
  const search = document.getElementById('contactsSearch');
  const perspective = document.getElementById('contactsPerspective');
  const certainty = document.getElementById('contactsCertainty');
  const reset = document.getElementById('contactsReset');
  const typeButtons = [...document.querySelectorAll('[data-contact-type]')];
  if (!results || !status || !search || !perspective || !certainty || !reset) return;

  const labels = { known: 'Known', reported: 'Reported', suspected: 'Crew theory', unconfirmed: 'Unconfirmed' };
  const names = { john: 'John', prue: 'Prue', violet: 'Violet' };
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
      ids.add(entry.id);
      for (const note of entry.notes) {
        if (!note || !Object.hasOwn(labels, note.kind) || typeof note.text !== 'string' || !note.text ||
            typeof note.source !== 'string' || !note.source || !Array.isArray(note.by) || !note.by.length ||
            note.by.some(id => !Object.hasOwn(names, id))) throw new Error('Invalid note');
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
    article.appendChild(element('div', 'contact-kind', entry.type === 'person' ? 'Person' : 'Faction / group'));
    const heading = element('h2');
    heading.id = entry.id + '-title';
    const permalink = element('a', '', entry.name);
    permalink.href = '#' + entry.id;
    heading.appendChild(permalink);
    article.append(heading, element('p', 'contact-role', entry.role));
    if (entry.affiliations.length) {
      const connections = element('div', 'contact-connections');
      connections.setAttribute('aria-label', 'Connections');
      for (const id of entry.affiliations) {
        const link = element('a', '', entryMap.get(id).name);
        link.href = '#' + id;
        link.dataset.contactLink = id;
        connections.appendChild(link);
      }
      article.appendChild(connections);
    }
    const list = element('ul', 'contact-notes');
    for (const note of notes) {
      const item = element('li', 'contact-note');
      item.dataset.noteKind = note.kind;
      item.append(element('span', 'contact-note-kind', labels[note.kind]), element('p', '', note.text),
        element('small', '', note.by.map(id => names[id]).join(' & ') + ' · ' + note.source));
      list.appendChild(item);
    }
    article.appendChild(list);
    return article;
  }

  function render() {
    if (!loaded) return;
    const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    const visible = entries.map(entry => ({ entry, notes: notesFor(entry) })).filter(({ entry, notes }) => {
      if (!notes.length || (activeType !== 'all' && entry.type !== activeType)) return false;
      const haystack = normalize([entry.name, entry.role, ...entry.affiliations.map(id => entryMap.get(id).name),
        ...notes.flatMap(note => [note.text, note.source, ...note.by.map(id => names[id])])].join(' '));
      return words.every(word => haystack.includes(word));
    }).sort((a, b) => a.entry.name.localeCompare(b.entry.name, 'en', { sensitivity: 'base' }));
    results.replaceChildren(...visible.map(({ entry, notes }) => card(entry, notes)));
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
    if (!loaded || !location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!entryMap.has(id)) return;
    if (!document.getElementById(id)) clearFilters();
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }

  async function load() {
    loaded = false;
    results.replaceChildren();
    status.textContent = 'Loading crew notes…';
    try {
      // This is a deliberately curated public file. Never fall back to Warden NPC/faction APIs.
      const response = await fetch('data/player-contacts.json?v=20261016-contacts1', { cache: 'no-cache' });
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
  results.addEventListener('click', event => {
    const link = event.target.closest('a[data-contact-link]');
    if (!link) return;
    clearFilters();
    if (location.hash === '#' + link.dataset.contactLink) showHash();
  });
  window.addEventListener('hashchange', showHash);
  load();
})();
