(()=>{
'use strict';
// Contract-side v2 presentation enhancements remain disabled.
// This safe loader only adds responsive mobile layout assets.

if(!document.getElementById('hubMobileStyles')){
  const link=document.createElement('link');
  link.id='hubMobileStyles';
  link.rel='stylesheet';
  link.href='mobile.css?v=20260915m1';
  document.head.appendChild(link);
}

if(!document.getElementById('hubMobileUiScript')){
  const script=document.createElement('script');
  script.id='hubMobileUiScript';
  script.src='mobile-ui.js?v=20260915m1';
  document.head.appendChild(script);
}
})();
