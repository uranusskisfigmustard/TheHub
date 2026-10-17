const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
process.chdir(path.resolve(__dirname,'..'));
class Element extends EventTarget {constructor(){super();this.value='';this.dataset={};this.readOnly=false;this.innerHTML='';this.textContent='';} }
const ids={};for(const id of ['wardenCloseoutPrefillStyles','closeoutReferenceBox','closeoutReferenceBody','closed','contractor','contractorName','gross','manualPayoutReason','summary','cstatus'])ids[id]=new Element();
let rows=[];const doc=new EventTarget();doc.getElementById=id=>ids[id];doc.querySelectorAll=s=>s==='.paycomp'?rows:s==='.payoutDecision'?rows.map(x=>x.select):[];
vm.runInNewContext(fs.readFileSync('warden-closeout-prefill-v1.js','utf8'),{document:doc,Event});
function open(c,mode='close'){ids.cstatus.value='Completed';ids.summary.value='';ids.gross.value='';ids.contractor.value='0';const e=new Event('warden:contract-open');e.detail={contract:c,mode,campaignDate:'2237-290'};doc.dispatchEvent(e)}
const c={title:'Fixed job',participants:['John','Prue','Violet'],basePay:'1,800cr +1 Stress',contractorName:'Luca',contractorCompensation:75};
open(c);assert.equal(ids.gross.value,'1800');assert.equal(ids.closed.value,'2237-290');assert.equal(ids.contractor.value,'75');assert.equal(ids.contractorName.value,'Luca');assert.match(ids.summary.value,/John and Prue and Violet/);
ids.cstatus.value='Failed';ids.cstatus.dispatchEvent(new Event('change'));assert.equal(ids.gross.value,'0');
ids.gross.value='900';ids.summary.value='User summary';ids.cstatus.value='Completed';ids.cstatus.dispatchEvent(new Event('change'));assert.equal(ids.gross.value,'900');assert.equal(ids.summary.value,'User summary');
open({title:'Conditional job',basePay:'1,000cr + 500cr if cargo recovered'});assert.equal(ids.gross.value,'');assert.equal(ids.contractorName.value,'');
rows=['BASE_PAY','BONUS'].map(id=>({dataset:{payoutId:id},select:new Element(),querySelector(){return this.select}}));rows.forEach(r=>r.select.value='UNREVIEWED');ids.gross.readOnly=true;
open({title:'Structured',payoutComponents:[{id:'BASE_PAY',amount:1800,defaultWhenStatus:['Completed']},{id:'BONUS',amount:200}]});assert.equal(rows[0].select.value,'EARNED');assert.equal(rows[1].select.value,'UNREVIEWED');
rows[0].select.dataset.wardenManual='1';rows[0].select.value='NOT_EARNED';ids.cstatus.dispatchEvent(new Event('change'));assert.equal(rows[0].select.value,'NOT_EARNED');
const e=new Event('warden:contract-open');e.detail={mode:'amend',contract:c,campaignDate:'2237-290'};ids.summary.value='Saved summary';ids.gross.value='1000';doc.dispatchEvent(e);assert.equal(ids.summary.value,'Saved summary');assert.equal(ids.gross.value,'1000');
// Contract open is dispatched only after the base form is initialized, and payout rendering is synchronous.
const base=fs.readFileSync('warden-base-v1.html','utf8');assert.ok(base.indexOf("new CustomEvent('warden:contract-open'")>base.indexOf("$('modal').classList.remove('hidden')"));
console.log('PASS: current date; fixed payout; three participants; contractor defaults; failed status; preserved edits; conditional pay left for review; structured status defaults; manual decision preserved; amendment preserved.');

const workflow=fs.readFileSync('warden-between-session-v1.js','utf8');
const ctx={localStorage:{getItem:()=>null},document:doc};
vm.runInNewContext(workflow.slice(0,workflow.indexOf("document.addEventListener('warden:contract-open'"))+"globalThis.acceptedRow=rowForContract;globalThis.kind=kindForRow;})();",ctx);
const accepted=ctx.acceptedRow({jobId:'J3',title:'Simple job',basePay:'500cr +1 Stress'});
assert.equal(accepted.Pay,'500cr +1 Stress');assert.equal(ctx.kind(accepted),'simple');
console.log('PASS: simple between-session job recognized from accepted contract with no player-page cache.');
