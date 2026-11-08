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
const output=path.join(os.tmpdir(),'food-pos-r82-c-tables-after','origin-controlled');
if(fs.existsSync(output))throw Error('Refuse to overwrite baseline folder '+output);
fs.mkdirSync(output,{recursive:true});
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
const widths=[1440,834,390,320],screenshots=[],checks=[],requestLog=[];
const createdAt=new Date().toISOString();
let browser;
try{
browser=await chromium.launch({headless:true});
for(const width of widths){
guard();
const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light',locale:'en-US',timezoneId:'Asia/Jakarta',permissions:[]});
await context.route('http://127.0.0.1:9032/**',async route=>{const url=route.request().url().replace(':9032',':9042');const response=await context.request.get(url);await route.fulfill({response})});
await context.addInitScript(()=>{const RealDate=Date;const fixed=RealDate.parse('2026-11-07T10:00:00+07:00');class FrozenDate extends RealDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}Object.setPrototypeOf(FrozenDate,RealDate);globalThis.Date=FrozenDate;localStorage.setItem('pos-locale','id');Object.defineProperty(navigator,'clipboard',{configurable:true,get:()=>undefined});document.execCommand=()=>false;window.print=()=>{window.__printCalls=(window.__printCalls||0)+1}});
const page=await context.newPage(),errors=[],consoleErrors=[],resources=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('requestfailed',req=>resources.push({url:req.url(),failure:req.failure()?.errorText}));
const network=[];
let mode='ok';
let resolveLoading;
await page.route('**/pos/tables**',async route=>{
const req=route.request(),url=new URL(req.url()),method=req.method();
network.push({method,path:url.pathname+url.search,at:new Date().toISOString()});
requestLog.push({width,method,path:url.pathname});
if(method!=='GET'){return route.fulfill({status:405,contentType:'application/json',body:'{"message":"mutation forbidden during baseline"}'})}
if(url.pathname.endsWith('/qr-token'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({table_id:Number(url.pathname.split('/')[3]),qr_token:'A'.repeat(64)})});
if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:'{"message":"fixture server down"}'});
if(mode==='loading')await new Promise(resolve=>{resolveLoading=resolve});
return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:tables,current_page:1,last_page:1})});
});
await page.goto('http://127.0.0.1:9032/',{waitUntil:'domcontentloaded'});
await page.locator('.qr-table-card').first().waitFor({timeout:25000});
await page.evaluate(async()=>document.fonts.ready);await page.waitForTimeout(650);await page.mouse.move(0,0);
const snapshots=[];
const measure=()=>page.evaluate(()=>({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),cards:document.querySelectorAll('.qr-table-card').length,dialogs:document.querySelectorAll('[role=dialog]').length,disabled:document.querySelectorAll('button:disabled').length,active:document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName}));
async function capture(state,metadata={}){guard();await page.mouse.move(0,0);await page.waitForTimeout(150);const filename=width+'-'+state+'.png';const bytes=await page.screenshot({animations:'disabled',fullPage:false});fs.writeFileSync(path.join(output,filename),bytes);guard();const m={width,height:900,state,filename,sha256:sha(bytes),bytes:bytes.length,dimensions:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)},capturedAt:new Date().toISOString(),sourceFingerprint:sha(JSON.stringify(initial)),cssFingerprint,metrics:await measure(),pageErrors:[...errors],consoleErrors:[...consoleErrors],requests:[...network],metadata};screenshots.push(m);snapshots.push(state);console.log('R82_ORIGIN_CONTROL_CAPTURE',JSON.stringify({width,state,overflow:m.metrics.overflow,errors:errors.length,disabled:m.metrics.disabled}));}
function assert(b,s){if(!b)throw Error('R82 '+width+': '+s)}
const results={width,tests:{},errors,consoleErrors,resources};
await capture('list-default',{count:await page.locator('.qr-table-card').count()});
const disabledReal=page.locator('.tables-qr-preview-trigger:disabled');results.tests.realDisabled=await disabledReal.count();assert(results.tests.realDisabled===1,'inactive QR genuine disabled');
results.tests.disabledComputed=await disabledReal.first().evaluate(e=>({disabled:e.disabled,cursor:getComputedStyle(e).cursor,opacity:getComputedStyle(e).opacity}));
const trigger=page.locator('.tables-qr-preview-trigger:not(:disabled)').first();await trigger.hover();results.tests.hover=await trigger.evaluate(e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderTopColor}));await trigger.focus();results.tests.focus=await trigger.evaluate(e=>document.activeElement===e);
await capture('qr-focus-hover',{focus:results.tests.focus,hover:results.tests.hover});
await page.locator('.tables-boardui-filters').getByText('Tidak Aktif',{exact:false}).first().click().catch(async()=>{await page.locator('.tables-boardui-filters').locator('button').last().click()});
await page.waitForTimeout(210);await capture('filtered-inactive',{cards:await page.locator('.qr-table-card').count()});
await page.locator('.tables-boardui-filters').locator('button').first().click();
await page.waitForTimeout(160);
await page.locator('.tables-p1-add-button').click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(650);results.tests.createFocus=await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'));await capture('drawer-create',{focusInside:results.tests.createFocus,disabledCount:await page.locator('button:disabled').count()});
await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});results.tests.createEscape=true;
await page.locator('.qr-card-top').first().click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(650);await capture('drawer-edit');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});results.tests.editEscape=true;
await page.locator('.tables-qr-preview-trigger:not(:disabled)').first().click();await page.locator('.standee-modal-content').waitFor({timeout:15000});await page.waitForTimeout(360);results.tests.qrValid=await page.locator('.standee-qr-frame img[src^="data:image/png"]').count()>0;await capture('print-standee',{qrValid:results.tests.qrValid});
await page.locator('.standee-modal-close').click();await page.locator('.standee-modal-content').waitFor({state:'detached'});
await page.locator('.qr-card-actions .tables-p2-icon-action').nth(1).click();await page.getByRole('dialog',{name:'Salin tautan pemesanan customer'}).waitFor();await page.waitForTimeout(150);results.tests.manualClipboard=await page.locator('#customer-qr-url').inputValue();await capture('clipboard-manual',{urlLength:results.tests.manualClipboard.length});await page.locator('.tables-copy-dialog .standee-btn-secondary').first().click();
await page.locator('.qr-card-top').first().click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Ganti kode QR'}).first().click();await page.waitForTimeout(250);await capture('confirm-rotate',{mutationsBefore:network.filter(x=>x.method!=='GET').length});await page.getByRole('button',{name:/batal|cancel/i}).last().click();results.tests.rotateCanceled=true;
await page.locator('.qr-card-top').first().click();await page.getByRole('dialog').waitFor();await page.locator('.tables-p2-delete').click();await page.waitForTimeout(250);await capture('confirm-delete',{mutationsBefore:network.filter(x=>x.method!=='GET').length});await page.getByRole('button',{name:/batal|cancel/i}).last().click();results.tests.deleteCanceled=true;
results.tests.mutations=network.filter(x=>x.method!=='GET');assert(results.tests.mutations.length===0,'unexpected mutation request');
results.tests.captureCount=snapshots.length;results.tests.snapshots=snapshots;results.tests.finalOverflow=(await measure()).overflow;assert(results.tests.finalOverflow===0,'horizontal overflow');assert(errors.length===0,'page JS error');
checks.push(results);await context.close();
}
}finally{await browser?.close();await new Promise(resolve=>serve.close(resolve))}
guard();
const manifest={version:'R8.2C-after-origin-control-v1',createdAt,completedAt:new Date().toISOString(),head:'7af6ab571a1f516e28f9313b1cd3efecd588ee23',branch:'laravel-inertia-rewrite',sourceHashes:initial,sourceFingerprint:sha(JSON.stringify(initial)),compiledCss:{sha256:cssFingerprint,assets:cssAssets.map(x=>({file:x.fileName,sha256:sha(String(x.source)),bytes:String(x.source).length}))},environment:{viewportHeight:900,deviceScaleFactor:1,locale:'id',browserLocale:'en-US',timezone:'Asia/Jakarta',fixedClock:'2026-11-07T10:00:00+07:00',animations:'disabled',fontReady:true,clipboard:'denied',mockEndpoint:true,port:9042},screenshots,checks,requests:requestLog};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
console.log('R82_ORIGIN_CONTROL_COMPLETE',JSON.stringify({screenshots:screenshots.length,checks:checks.length,cssFingerprint,manifestSha256:sha(fs.readFileSync(path.join(output,'manifest.json'))),output}));
