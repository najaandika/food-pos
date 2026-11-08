import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {chromium} from 'file:///D:/mcp-tools/VerityMCP/node_modules/playwright/index.mjs';

const root=process.cwd();
const output=path.join(os.tmpdir(),'food-pos-r82-c-tables-after');
if(!fs.existsSync(path.join(output,'manifest.json')))throw Error('Missing finalized AFTER baseline');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const locked=[
'resources/js/pos/admin/views/OwnerTablesView.tsx',
'resources/js/pos/admin/views/OwnerTablesView.css',
'resources/js/pos/admin/views/owner-tables/OwnerTablesForm.tsx',
'resources/js/pos/admin/views/owner-tables/OwnerTablesList.tsx',
'resources/js/pos/admin/views/owner-tables/server-tables.ts',
'resources/js/pos/admin/styles/admin.css',
'resources/js/pos/admin/styles/responsive.css',
'resources/js/pos/admin/i18n.ts',
'resources/js/pos/admin/i18n-context.tsx',
'resources/js/pos/admin/views/owner-tables/after-r82/capture-after.mjs',
'resources/js/pos/admin/views/owner-tables/TablePrintStandee.tsx',
'resources/js/pos/admin/views/owner-tables/TableManualCopyDialog.tsx'
];
const initial=Object.fromEntries(locked.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
const required={
'resources/js/pos/admin/views/OwnerTablesView.tsx':'05547e4b848f3c9ac8e7678b62a74038bb26fdb6454f7f3443c0bf5e8f588a20',
'resources/js/pos/admin/views/OwnerTablesView.css':'76ee6ae09dd09dba2cb867c6dee7801863ad9ddca0e5ea7d142ae6aee811e447',
'resources/js/pos/admin/views/owner-tables/OwnerTablesForm.tsx':'a7d9274de56135d6dfbc8a8d92b542a351c6046ecc3ab5ca0c0648d5a51b3e50',
'resources/js/pos/admin/views/owner-tables/OwnerTablesList.tsx':'eb2f212b483cc1e1fff8bf3653d105a50d70ced80b28a74b984d888fe91431aa',
'resources/js/pos/admin/views/owner-tables/server-tables.ts':'e140bb51f52625e9f18a0bc9838cf1a657c9e770506eff290c3115665e976d67',
};
for(const [p,h] of Object.entries(required))if(initial[p]!==h)throw Error('Source SHA mismatch '+p);
const guard=()=>{for(const [p,h] of Object.entries(initial)){const actual=sha(fs.readFileSync(path.join(root,p)));if(h!==actual)throw Error('SOURCE DRIFT '+p)}};
const source=`import React from 'react';
import{createRoot}from 'react-dom/client';
import{LocaleProvider}from '@/pos/admin/i18n-context';
import{OwnerTablesView}from '@/pos/admin/views/OwnerTablesView';
import 'audit-app-css';import '@/pos/styles/pos.css';
const app=React.createElement(LocaleProvider,null,React.createElement('main',{className:'main-panel',style:{width:'100%',padding:16,boxSizing:'border-box',container:'admin-main / inline-size'}},React.createElement(OwnerTablesView,{serverMode:true})));
createRoot(document.getElementById('root')).render(app);`;
guard();
const built=await build({root,configFile:false,logLevel:'error',resolve:{alias:[{find:'audit-app-css',replacement:path.join(root,'resources/css/app.css')},{find:'@',replacement:path.join(root,'resources/js')}]},plugins:[react(),tailwind(),{name:'r82-c',resolveId:id=>id==='virtual:r82c'?'\0virtual:r82c':null,load:id=>id==='\0virtual:r82c'?source:null}],build:{write:false,rollupOptions:{input:'virtual:r82c',output:{entryFileNames:'app.js'}}}});
guard();
const outputs=Array.isArray(built)?built.flatMap(x=>x.output):built.output;
const cssAssets=outputs.filter(x=>x.fileName.endsWith('.css'));
const cssFingerprint=sha(cssAssets.map(x=>String(x.source)).join('\n'));
const assets=new Map(outputs.map(x=>[x.fileName,x.type==='chunk'?x.code:x.source]));
const links=cssAssets.map(x=>'<link rel="stylesheet" href="/'+x.fileName+'">').join('');
const serve=http.createServer((req,res)=>{const uri=(req.url||'/').split('?')[0].slice(1);if(!uri){res.setHeader('Content-Type','text/html');return res.end('<meta name="viewport" content="width=device-width,initial-scale=1">'+links+'<div id="root"></div><script type="module" src="/app.js"></script>')}const value=assets.get(uri);if(value===undefined){res.statusCode=404;return res.end('404')}res.setHeader('Content-Type',uri.endsWith('.css')?'text/css':'text/javascript');res.end(value)});
await new Promise(resolve=>serve.listen(9042,'127.0.0.1',resolve));
const tables=[
{id:11,code:'A1',name:'Indoor Window',area:'Indoor',seats:2,status:'available',scans_today:18,current_order_id:null},
{id:12,code:'A4',name:'Indoor Center',area:'Indoor',seats:4,status:'occupied',scans_today:42,current_order_id:925},
{id:13,code:'B2',name:'Bar Area',area:'Bar',seats:2,status:'preparing',scans_today:31,current_order_id:921},
{id:14,code:'B7',name:'Outdoor Bench',area:'Outdoor',seats:4,status:'need_waiter',scans_today:27,current_order_id:926},
{id:15,code:'C2',name:'Terrace',area:'Terrace',seats:3,status:'waiting_payment',scans_today:22,current_order_id:927},
{id:16,code:'O1',name:'Outdoor Surf Corner',area:'Outdoor',seats:4,status:'inactive',scans_today:9,current_order_id:null}
];

const widths=[1440,834,390,320],checks=[];let browser;
try {browser=await chromium.launch({headless:true});
for(const width of widths){
guard();
const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light',timezoneId:'Asia/Jakarta',locale:'en-US',permissions:[]});
await ctx.addInitScript(()=>{const RealDate=Date,now=RealDate.parse('2026-11-07T10:00:00+07:00');class FrozenDate extends RealDate{constructor(...v){super(...(v.length?v:[now]))}static now(){return now}}Object.setPrototypeOf(FrozenDate,RealDate);globalThis.Date=FrozenDate;localStorage.setItem('pos-locale','id');Object.defineProperty(navigator,'clipboard',{configurable:true,get:()=>undefined});document.execCommand=()=>false;window.print=()=>{window.__printCalls=(window.__printCalls||0)+1}});
const p=await ctx.newPage(),errs=[],consoleErrors=[],reqs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
await p.route('**/pos/tables**',async route=>{const request=route.request(),url=new URL(request.url());reqs.push({method:request.method(),path:url.pathname});if(request.method()!=='GET')throw Error('HTTP mutation forbidden');if(url.pathname.endsWith('/qr-token'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({table_id:Number(url.pathname.split('/')[3]),qr_token:'A'.repeat(64)})});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:tables,current_page:1,last_page:1})})});
await p.goto('http://127.0.0.1:9042/',{waitUntil:'domcontentloaded'});
await p.locator('.qr-table-card').first().waitFor();await p.evaluate(async()=>document.fonts.ready);await p.waitForTimeout(500);
const record={width,tests:{},requests:reqs,pageErrors:errs,consoleErrors};
function assert(v,m){if(!v)throw Error(width+': '+m)}
await p.locator('.tables-qr-preview-trigger:not(:disabled)').first().click();
await p.locator('.standee-modal-content').waitFor();await p.waitForTimeout(230);
record.tests.standeeMarkup=await p.evaluate(()=>{const content=document.querySelector('.standee-modal-content'),img=content?.querySelector('.standee-qr-frame img');return{hasDialogRole:content?.getAttribute('role')==='dialog',standeeId:!!content?.querySelector('#printable-table-standee'),imgAlt:img?.alt,imgWidth:img?.getAttribute('width'),imgHeight:img?.getAttribute('height'),imgData:!!img?.src.startsWith('data:image/png'),qrSrcHash:img?img.src.length:0}});
assert(record.tests.standeeMarkup.standeeId&&record.tests.standeeMarkup.imgData&&record.tests.standeeMarkup.imgWidth==='170','standee DOM QR');
await p.locator('.standee-modal-content .standee-header').click();record.tests.standeeInnerClickPreserved=await p.locator('.standee-modal-content').count()===1;assert(record.tests.standeeInnerClickPreserved,'inner print click propagation');
await p.locator('.standee-modal-content .standee-btn-primary').click();record.tests.printCallback=await p.evaluate(()=>window.__printCalls===1);assert(record.tests.printCallback,'print callback not called');
await p.keyboard.press('Escape');record.tests.standeeEscapeCloses=await p.locator('.standee-modal-content').count()===0;
record.tests.standeeExpectedEscape='not implemented in BEFORE; expected modal remains';
assert(!record.tests.standeeEscapeCloses,'new unintended Escape behavior');
await p.locator('.standee-modal-close').click();assert(await p.locator('.standee-modal-content').count()===0,'standee close');
record.tests.standeeClose=true;
await p.locator('.qr-card-actions .tables-p2-icon-action').nth(1).click();
const modal=p.locator('.tables-copy-dialog');await modal.waitFor();
const input=p.locator('#customer-qr-url');await input.focus();
record.tests.manualDom=await p.evaluate(()=>{const el=document.querySelector('.tables-copy-dialog'),input=document.querySelector('#customer-qr-url'),a=el?.querySelector('a');return{role:el?.getAttribute('role'),ariaModal:el?.getAttribute('aria-modal'),ariaLabel:el?.getAttribute('aria-label'),inputReadOnly:input?.readOnly,inputValueLength:input?.value.length,selectionStart:input?.selectionStart,selectionEnd:input?.selectionEnd,active:document.activeElement===input,anchorTarget:a?.target,anchorRel:a?.rel}});
assert(record.tests.manualDom.role==='dialog'&&record.tests.manualDom.ariaModal==='true'&&record.tests.manualDom.active&&record.tests.manualDom.inputReadOnly,'manual dialog focus/aria');
assert(record.tests.manualDom.selectionStart===0&&record.tests.manualDom.selectionEnd===record.tests.manualDom.inputValueLength,'manual select all');
await modal.locator('h3').click();record.tests.manualInnerClickPreserved=await modal.count()===1;assert(record.tests.manualInnerClickPreserved,'manual dialog inner propagation');
await p.keyboard.press('Escape');record.tests.manualEscapeCloses=await modal.count()===0;assert(!record.tests.manualEscapeCloses,'unintended manual Escape close; BEFORE lacks handler');
await modal.locator('.standee-btn-primary').click();await p.waitForTimeout(100);record.tests.retryFailureStaysOpen=await modal.count()===1;assert(record.tests.retryFailureStaysOpen,'failed retry should retain dialog');
await modal.locator('.standee-btn-secondary').first().click();record.tests.manualClose=await modal.count()===0;assert(record.tests.manualClose,'manual close');
await p.locator('.qr-card-actions .tables-p2-icon-action').nth(1).click();await modal.waitFor();
await p.evaluate(()=>{document.execCommand=()=>true});await modal.locator('.standee-btn-primary').click();await modal.waitFor({state:'detached'});record.tests.retrySuccessClose=true;
record.tests.retrySuccessToast=await p.locator('.admin-action-toast').innerText();assert(record.tests.retrySuccessToast.includes('berhasil'),'retry success toast');
record.tests.finalOverflow=await p.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));assert(record.tests.finalOverflow===0,'horizontal overflow');
assert(!errs.length,'JavaScript pageerror');assert(!reqs.some(x=>x.method!=='GET'),'unexpected HTTP mutation');
checks.push(record);console.log('R82_MODAL_CONTRACT',JSON.stringify({width,pass:true,tests:record.tests,requests:reqs.length,pageErrors:errs.length,consoleErrors:consoleErrors.length}));await ctx.close();
}}finally{await browser?.close();await new Promise(resolve=>serve.close(resolve))}
guard();const dest=path.join(output,'modal-interactions.json');fs.writeFileSync(dest,JSON.stringify({version:'r82-after-browser-modal-v1',createdAt:new Date().toISOString(),sourceFingerprint:sha(JSON.stringify(initial)),compiledCssFingerprint:cssFingerprint,checks},null,2),'utf8');console.log('R82_MODAL_DONE',JSON.stringify({count:checks.length,sha256:sha(fs.readFileSync(dest))}));
