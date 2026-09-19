(() => {
  'use strict';

  const NAV_ITEMS = [
    { key:'contracts', label:'CONTRACTS', href:'./' },
    { key:'logs', label:'CONTRACT LOGS', href:'contracts.html' },
    { key:'classifieds', label:'CLASSIFIEDS', href:'./#classifieds' },
    { key:'statements', label:'STATEMENTS', href:'statements.html' },
    { key:'intersession', label:'BETWEEN SESSIONS', href:'between-sessions.html' },
    { key:'purchases', label:'PURCHASE BOARD', href:'purchases.html' },
    { key:'reference', label:'REFERENCE', href:'player-reference.html' }
  ];

  function installHeaderStyles(){
    if(document.getElementById('hubCanonicalHeaderStyles')) return;
    const style=document.createElement('style');
    style.id='hubCanonicalHeaderStyles';
    style.textContent=`
      .navrow{display:flex!important;gap:8px!important;margin-top:13px!important;flex-wrap:wrap!important;align-items:center!important}
      .navrow>.navbtn,.navrow>.btn{padding:8px 14px!important;letter-spacing:.08em!important;line-height:1.2!important;margin:0!important}
      @media(max-width:760px){.navrow>.navbtn,.navrow>.btn{padding:8px 10px!important}}
    `;
    document.head.appendChild(style);
  }

  function normalizedLabel(el){
    return String(el?.textContent||'').replace(/\d+/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  }

  function currentKey(){
    const path=location.pathname.toLowerCase();
    if(path.endsWith('/contracts.html')) return 'logs';
    if(path.endsWith('/statements.html')) return 'statements';
    if(path.endsWith('/between-sessions.html')) return 'intersession';
    if(path.endsWith('/purchases.html')) return 'purchases';
    if(path.endsWith('/player-reference.html')) return 'reference';
    return location.hash.toLowerCase()==='#classifieds'?'classifieds':'contracts';
  }

  function directItems(nav){ return [...nav.children].filter(el=>el.matches?.('.navbtn,.btn')); }
  function findItem(nav,label){ return directItems(nav).find(el=>normalizedLabel(el).startsWith(label))||null; }

  function createItem(nav,item){
    if(nav.querySelector(':scope > .navbtn')){
      const b=document.createElement('button');
      b.type='button';b.className='navbtn';b.textContent=item.label;
      b.addEventListener('click',()=>{location.href=item.href});
      return b;
    }
    const a=document.createElement('a');
    a.className='btn';a.href=item.href;a.textContent=item.label;
    return a;
  }

  function normalizeNavigation(){
    const nav=document.querySelector('.navrow');
    if(!nav) return false;
    const nodes=NAV_ITEMS.map(item=>{
      let node=findItem(nav,item.label);
      if(!node){ node=createItem(nav,item); nav.appendChild(node); }
      if(node.tagName==='A'&&node.getAttribute('href')!==item.href) node.setAttribute('href',item.href);
      return {item,node};
    });
    const current=directItems(nav).filter(node=>NAV_ITEMS.some(item=>normalizedLabel(node).startsWith(item.label)));
    const desired=nodes.map(x=>x.node);
    if(current.length!==desired.length||!desired.every((node,i)=>current[i]===node)) desired.forEach(node=>nav.appendChild(node));
    const active=currentKey();
    nodes.forEach(({item,node})=>{
      const on=item.key===active;
      node.classList.toggle('active',on);
      if(on) node.setAttribute('aria-current','page'); else node.removeAttribute('aria-current');
    });
    return true;
  }

  function installMobileFilters(){
    const controls=document.querySelector('.controls');
    if(!controls||document.getElementById('mobileFilterToggle')) return;
    const primary=document.getElementById('primaryFilter');
    const secondary=document.getElementById('secondaryFilter');
    const search=document.getElementById('search');
    if(!primary||!secondary||!search) return;
    const toggle=document.createElement('button');
    toggle.id='mobileFilterToggle';toggle.className='control mobile-filter-toggle';toggle.type='button';toggle.textContent='FILTERS';
    toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Show board filters');
    search.insertAdjacentElement('afterend',toggle);
    function setOpen(open){
      controls.classList.toggle('mobile-filters-open',open);
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?'Hide board filters':'Show board filters');
      toggle.textContent=open?'CLOSE':'FILTERS';
    }
    toggle.addEventListener('click',()=>setOpen(!controls.classList.contains('mobile-filters-open')));
    window.addEventListener('resize',()=>{if(window.innerWidth>760&&controls.classList.contains('mobile-filters-open'))setOpen(false)},{passive:true});
  }

  installHeaderStyles();
  normalizeNavigation();
  installMobileFilters();
  window.addEventListener('hashchange',normalizeNavigation);
  setTimeout(normalizeNavigation,250);
  setTimeout(normalizeNavigation,1000);
})();
