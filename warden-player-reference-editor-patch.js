(() => {
'use strict';

const PATCH_FLAG='__wcPlayerReferenceEditorPatch_20260918';
if(window[PATCH_FLAG]) return;
window[PATCH_FLAG]=true;

/*
 * The Player Reference editor uses JSONP <script> loads for the private
 * Warden service. A deployment transition or transient Apps Script response
 * can raise script.onerror even though the next request succeeds. Retry one
 * failed reference-service load before surfacing the editor's existing error.
 */
const head=document.head;
const nativeHeadAppend=head.append.bind(head);
head.append=function(...nodes){
  nodes.forEach(node=>{
    if(!node || String(node.tagName||'').toUpperCase()!=='SCRIPT') return;
    const src=String(node.src||'');
    if(!src.includes('script.google.com/macros/s/') || !src.includes('callback=__wcRef')) return;
    if(node.dataset.wcRefRetryWrapped==='1') return;

    const originalError=node.onerror;
    node.dataset.wcRefRetryWrapped='1';
    node.onerror=function(event){
      if(node.dataset.wcRefRetried==='1'){
        if(typeof originalError==='function') originalError.call(node,event);
        return;
      }
      node.dataset.wcRefRetried='1';

      const retry=document.createElement('script');
      retry.async=true;
      retry.src=src+(src.includes('?')?'&':'?')+'_wcRefRetry=1';
      retry.onload=()=>retry.remove();
      retry.onerror=retryEvent=>{
        retry.remove();
        if(typeof originalError==='function') originalError.call(node,retryEvent);
      };
      setTimeout(()=>nativeHeadAppend(retry),400);
    };
  });
  return nativeHeadAppend(...nodes);
};

const GRADE_TITLES={
  'Mobility Aid':'Grade 0 — Rehabilitation & Adaptation',
  'Conventional Prosthetic Limb':'Grade 1 — Conventional Prosthetics',
  'Myoelectric Multi-Grip Arm':'Grade 2 — Advanced Functional Prosthetics',
  'Bone-Anchored Limb Interface':'Grade 3 — Integrated Neuroprosthetics',
  'Loudmouth':'Grade 4 — Low-Grade Cybernetics'
};

function autoRows(textarea){
  const lines=String(textarea.value||'').split(/\r?\n/).length;
  textarea.rows=Math.max(2,Math.min(8,lines+1));
}

function directPreviewTable(item){
  return item.querySelector(':scope > .wc-ref-table-wrap > table.wc-ref-table');
}

function inferGradeTitle(item,table){
  const heading=item.querySelector(':scope > h4');
  const existing=String(heading?.textContent||'').trim();
  if(/^Grade\s+[0-4]\b/i.test(existing)) return existing;
  const first=String(table?.querySelector('tbody tr td')?.textContent||'').trim();
  return GRADE_TITLES[first]||'';
}

function makeGradeCollapsible(item,title){
  if(item.dataset.wcGradeCollapsible==='1') return;
  const heading=item.querySelector(':scope > h4');
  const details=document.createElement('details');
  details.className='wc-ref-grade-details';
  const summary=document.createElement('summary');
  summary.className='wc-ref-grade-summary';
  summary.textContent=title;
  details.appendChild(summary);
  [...item.children].forEach(child=>{
    if(child!==heading) details.appendChild(child);
  });
  if(heading) heading.remove();
  item.appendChild(details);
  item.dataset.wcGradeCollapsible='1';
}

function upgradeTableEditors(){
  document.querySelectorAll('.wc-ref-table-edit tbody td .wc-ref-editor-field').forEach(input=>{
    if(String(input.tagName||'').toUpperCase()!=='INPUT') return;
    if(input.dataset.wcRefMultilineSource==='1') return;

    input.dataset.wcRefMultilineSource='1';
    const textarea=document.createElement('textarea');
    textarea.className='wc-ref-editor-textarea wc-ref-table-cell-multiline';
    textarea.value=input.value;
    textarea.setAttribute('aria-label','Table cell');
    textarea.title='Enter inserts a new line. Blank lines are preserved.';
    autoRows(textarea);

    textarea.addEventListener('input',()=>{
      input.value=textarea.value;
      if(typeof input.oninput==='function') input.oninput();
      autoRows(textarea);
    });

    input.replaceWith(textarea);
  });

  document.querySelectorAll('.wc-ref-editor-item').forEach(item=>{
    if(item.dataset.wcGradeCollapsible==='1') return;
    const heading=item.querySelector(':scope > h4');
    const table=directPreviewTable(item);
    if(!table) return;

    const gradeTitle=inferGradeTitle(item,table);
    if(gradeTitle){
      if(heading){
        heading.hidden=false;
        heading.textContent=gradeTitle;
      }
      makeGradeCollapsible(item,gradeTitle);
      return;
    }

    /* Non-grade section-level tables intentionally have no item heading. */
    if(heading && heading.textContent.trim()==='Untitled Item') heading.hidden=true;
  });
}

function installStyles(){
  if(document.getElementById('wcRefMultilineTablePatchStyles')) return;
  const style=document.createElement('style');
  style.id='wcRefMultilineTablePatchStyles';
  style.textContent=`
    .wc-ref-table td{white-space:pre-wrap}
    .wc-ref-table-cell-multiline{
      min-width:160px;
      min-height:4.4em;
      resize:vertical;
      line-height:1.35;
      white-space:pre-wrap;
    }
    .wc-ref-grade-details{
      margin:0 0 10px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.015);
    }
    .wc-ref-grade-summary{
      cursor:pointer;
      list-style:none;
      padding:10px 12px;
      color:var(--text);
      font-size:.78rem;
      font-weight:800;
      letter-spacing:.035em;
    }
    .wc-ref-grade-summary::-webkit-details-marker{display:none}
    .wc-ref-grade-summary::before{
      content:'▸';
      display:inline-block;
      width:1.2em;
      color:var(--accent);
    }
    .wc-ref-grade-details[open]>.wc-ref-grade-summary::before{content:'▾'}
    .wc-ref-grade-details>.wc-ref-table-wrap,
    .wc-ref-grade-details>p{
      margin-left:10px;
      margin-right:10px;
      margin-bottom:10px;
    }
  `;
  document.head.appendChild(style);
}

function boot(){
  installStyles();
  upgradeTableEditors();
  const root=document.getElementById('playerReferencePreview')||document.body;
  new MutationObserver(upgradeTableEditors).observe(root,{childList:true,subtree:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
