(() => {
'use strict';
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#wardenGlitchCurationV1 [data-approved],#wardenGlitchCurationV1 [data-candidate]');
  if(!b||b.dataset.candidate==='reset')return;
  document.querySelector('#wardenGlitchPreview [data-wg="reset"]')?.click();
  document.querySelector('#wardenModernDisplayPreview [data-wmd="reset"]')?.click();
},true);
})();