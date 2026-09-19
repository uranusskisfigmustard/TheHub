(() => {
  'use strict';

  const BUILD = '20260919-warden-reference-read-1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function decode(encoded) {
    const raw = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function renderBlock(block) {
    if (String(block?.type || '').toLowerCase() === 'table') {
      const headers = Array.isArray(block.headers) ? block.headers : [];
      const rows = Array.isArray(block.rows) ? block.rows : [];
      return `<div class="warden-table-wrap"><table class="warden-table"><thead><tr>${headers.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return `<div class="warden-small" style="margin:4px 0;color:#d5d0c4;white-space:pre-wrap;overflow-wrap:anywhere">${esc(block?.text || '')}</div>`;
  }

  function render(root, state) {
    const feed = state.reference;
    if (!feed?.ok || !feed.data) {
      root.innerHTML = '<div class="warden-empty">PLAYER REFERENCE DRAFT UNAVAILABLE</div>';
      return;
    }
    let categories;
    try { categories = decode(feed.data); }
    catch (error) {
      root.innerHTML = `<div class="warden-notice bad">Could not decode Player Reference working draft: ${esc(error?.message || error)}</div>`;
      return;
    }
    root.innerHTML = `
      <div class="warden-page-heading"><div><h1>Player Reference</h1><p>WARDEN-ONLY working draft. Reading this draft does not publish or change canon.</p></div><div class="warden-status-chip">SCHEMA ${esc(feed.referenceSchemaVersion || '—')} · ${categories.length} CATEGORIES</div></div>
      ${categories.map(category => `<section class="warden-section warden-reference-category">
        <h2>${esc(category.title)}</h2>
        ${category.description ? `<div class="warden-small">${esc(category.description)}</div>` : ''}
        ${(category.sections || []).map(section => `<details class="warden-details" ${section.status === 'CURRENT' ? 'open' : ''}><summary>${section.status === 'NEXT' ? 'NEXT // ' : ''}${esc(section.title)}</summary>
          ${(section.items || []).map(item => `<div style="margin-top:9px;padding:9px;border-left:2px solid #596064;background:#15181a">${String(item.title || '').replace(/\u200B/g, '').trim() ? `<strong style="display:block;margin-bottom:6px">${esc(item.title)}</strong>` : ''}${(item.blocks || []).map(renderBlock).join('')}</div>`).join('')}
        </details>`).join('')}
      </section>`).join('')}
    `;
  }

  window.HubWardenReference = Object.freeze({ build: BUILD, render });
})();
