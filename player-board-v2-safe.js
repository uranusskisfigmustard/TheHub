(()=>{
'use strict';
// TEMPORARILY DISABLED: contract-side v2 local presentation enhancements caused browser non-responsiveness.
// Stable player-facing baseline remains in player-shell-v1.js and player-board-v1.js.
// Shared responsive behavior is loaded centrally by player-shell-v1.js.

if(!document.getElementById('betweenSessionWorkflowScript')){
  const s=document.createElement('script');
  s.id='betweenSessionWorkflowScript';
  s.src='between-session-workflow-v1.js?v=20260915d';
  s.defer=true;
  document.head.appendChild(s);
}
})();
