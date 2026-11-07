import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {chromium} from 'file:///D:/mcp-tools/VerityMCP/node_modules/playwright/index.mjs';
const root=process.cwd(),out=path.join(os.tmpdir(),'food-pos-r75-c-crosspage');
if(fs.existsSync(out)){throw new Error('R7.5C output directory already exists: '+out)}
fs.mkdirSync(out,{recursive:true});
const sourceNames=[
'resources/js/pos/admin/styles/responsive.css',
'resources/js/pos/admin/views/CashierView.css',
'resources/js/pos/admin/views/OrdersView.css',
'resources/js/pos/admin/styles/admin.css',
'resources/js/pos/admin/views/DashboardView.tsx',
'resources/js/pos/admin/views/OrdersView.tsx',
'resources/js/pos/admin/views/WaitersView.tsx',
'resources/js/pos/admin/views/orders/OrdersBoard.tsx',
'resources/js/pos/admin/views/orders/OrdersList.tsx',
'resources/js/pos/admin/views/orders/OrderDetail.tsx',
'resources/js/pos/admin/views/orders/styles/legacy-orders.css',
'resources/js/pos/admin/views/orders/styles/orders-workspace-board.css',
'resources/js/pos/admin/views/orders/styles/orders-list.css',
'resources/js/pos/admin/views/orders/styles/orders-detail-drawer.css',
'resources/js/pos/admin/views/cashier/styles/cashier-queue-layout.css',
'resources/js/pos/admin/views/cashier/styles/cashier-bill-detail.css',
'resources/css/app.css',
'resources/js/pos/styles/pos.css',
'resources/js/pos/admin/views/dashboard/dashboard-playwright.mjs',
'resources/js/pos/admin/views/waiters/waiters-playwright.mjs',
'resources/js/pos/admin/views/responsive-audit/round75/crosspage-freeze.mjs'
];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const hashFiles=()=>Object.fromEntries(sourceNames.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
const before=hashFiles();
const expected={
'resources/js/pos/admin/styles/responsive.css':'8ec36a679550ce6488ffd0795ee2088361777168eb74cb32f43c553cff4eb940',
'resources/js/pos/admin/views/CashierView.css':'d5236f7a3936b52fcccadb0f9e2de87ba00176e18d74d5b7ffcc1bd0ce91111e',
'resources/js/pos/admin/views/OrdersView.css':'1eeaf06306e105140b20b15397395ab39ae3f50a12462dbb0d58605fb0fef63f',
'resources/js/pos/admin/styles/admin.css':'02a3c6b64032800c04b785792e46feb6c0fb69a4ad98a238caed990e2f18aaaa'
};
for(const [p,h] of Object.entries(expected))if(before[p]!==h)throw new Error('CHECKPOINT HASH MISMATCH '+p+' '+before[p]);
function guard(){const now=hashFiles();for(const [p,h] of Object.entries(before))if(now[p]!==h)throw new Error('SOURCE DRIFT! '+p+' before='+h+' now='+now[p]);return sha(Buffer.from(JSON.stringify(now)))}
const scriptForFixture=async name=>{
const f=await fsp.readFile(path.join(root,'resources/js/pos/admin/views',name,name+'-playwright.mjs'),'utf8');
const html=f.match(/const html = `([\s\S]*?)`;/)?.[1];
if(!html)throw new Error('fixture html missing '+name);
return html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]
.replaceAll("'./resources/js/pos/admin/i18n-context.tsx'","'@/pos/admin/i18n-context'")
.replaceAll("'./resources/js/pos/admin/views/DashboardView.tsx'","'@/pos/admin/views/DashboardView'")
.replaceAll("'./resources/js/pos/admin/views/WaitersView.tsx'","'@/pos/admin/views/WaitersView'")
.replaceAll("'./resources/css/app.css'","'audit-app-css'")
.replaceAll("'./resources/js/pos/styles/pos.css'","'@/pos/styles/pos.css'");
};
const ordersSource="import React from 'react';import{createRoot}from'react-dom/client';import{LocaleProvider}from '@/pos/admin/i18n-context';import{OrdersView}from '@/pos/admin/views/OrdersView';import 'qa-css';import '@/pos/styles/pos.css';const orders=[{id:1,table:'T01',tone:'pending',name:'Pesanan Satu',orderNumber:'ORD001',meta:'Dine in',status:'Menunggu',statusTone:'pending',time:'10:30',total:'Rp 45.000',rawTotal:45000,items:[['Nasi Goreng','1','45000']],rawStatus:'pending',source:'qr',type:'dine_in',tableCode:'T01',guests:2},{id:2,table:'T02',tone:'preparing',name:'Pesanan Dua',orderNumber:'ORD002',meta:'Dine in',status:'Diproses',statusTone:'preparing',time:'10:35',total:'Rp 52.000',rawTotal:52000,items:[['Mie Goreng','2','26000']],rawStatus:'preparing',source:'manual',type:'dine_in',tableCode:'T02',guests:3},{id:3,table:'T03',tone:'ready',name:'Pesanan Tiga',orderNumber:'ORD003',meta:'Takeaway',status:'Siap',statusTone:'ready',time:'10:40',total:'Rp 25.000',rawTotal:25000,items:[['Teh','1','25000']],rawStatus:'ready',source:'qr',type:'takeaway',tableCode:'T03',guests:1},{id:4,table:'T04',tone:'paid',name:'Pesanan Empat',orderNumber:'ORD004',meta:'Dine in',status:'Lunas',statusTone:'paid',time:'10:45',total:'Rp 60.000',rawTotal:60000,items:[['Ayam','1','60000']],rawStatus:'paid',source:'manual',type:'dine_in',tableCode:'T04',guests:2}];const view=React.createElement(OrdersView,{role:'owner',orders,onUpdateStatus:()=>{}});const main=React.createElement('main',{className:'main-panel',style:{width:'100%',padding:16,boxSizing:'border-box',container:'admin-main / inline-size'}},view);createRoot(document.getElementById('root')).render(React.createElement(LocaleProvider,null,React.createElement('div',{className:'page-shell pos-shell-layout'},main)));";
const widths=[1440,834,390,320];
const screenshots=[],checks=[],compiled={};
const actualTimestamp=new Date().toISOString();
let browser;
try{
browser=await chromium.launch({headless:true});
for(const pageName of ['dashboard','orders','waiters']){
guard();
const source=pageName==='orders'?ordersSource:await scriptForFixture(pageName);
const result=await build({root,configFile:false,logLevel:'error',
resolve:{alias:[{find:'qa-css',replacement:path.join(root,'resources/css/app.css')},{find:'audit-app-css',replacement:path.join(root,'resources/css/app.css')},{find:'@',replacement:path.join(root,'resources/js')}]},
plugins:[react(),tailwind(),{name:'r75-c-entry',resolveId:x=>x==='virtual:r75c'?'\0virtual:r75c':null,load:x=>x==='\0virtual:r75c'?source:null}],
build:{write:false,rollupOptions:{input:'virtual:r75c',output:{entryFileNames:'app.js'}}}});
guard();
const outputs=Array.isArray(result)?result.flatMap(x=>x.output):result.output;
const cssItems=outputs.filter(x=>x.fileName.endsWith('.css'));
compiled[pageName]={sha256:sha(cssItems.map(x=>String(x.source)).join('\n')),assets:cssItems.map(x=>({name:x.fileName,sha256:sha(String(x.source)),size:String(x.source).length})),method:'Vite build({write:false}) + React + Tailwind; in-memory deterministic mock'};
const assets=new Map(outputs.map(x=>[x.fileName,x.type==='chunk'?x.code:x.source]));
const css=cssItems.map(x=>'<link rel="stylesheet" href="/'+x.fileName+'">').join('');
const server=http.createServer((req,res)=>{const f=(req.url||'/').split('?')[0].slice(1);if(!f){res.setHeader('Content-Type','text/html');return res.end('<meta name="viewport" content="width=device-width,initial-scale=1">'+css+'<div id="root"></div><script type="module" src="/app.js"></script>')}const body=assets.get(f);if(body===undefined){res.statusCode=404;return res.end('404')}res.setHeader('Content-Type',f.endsWith('.css')?'text/css':'text/javascript');res.end(body)});
await new Promise(resolve=>server.listen(9017,'127.0.0.1',resolve));
try{
for(const width of widths){
guard();
const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',locale:'en-US',timezoneId:'Asia/Jakarta',colorScheme:'light',deviceScaleFactor:1});
const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text())});
await page.addInitScript(()=>{const RealDate=Date;const fixed=RealDate.parse('2026-11-07T10:00:00+07:00');class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}Object.setPrototypeOf(FixedDate,RealDate);globalThis.Date=FixedDate;localStorage.setItem('pos-locale','id');});
await page.goto('http://127.0.0.1:9017/',{waitUntil:'domcontentloaded',timeout:30000});
const selector=pageName==='dashboard'?'.od-priority-tile':pageName==='orders'?'.orders-workspace':'.waiters-table-tile';
await page.locator(selector).first().waitFor({timeout:30000});
await page.evaluate(async()=>{await document.fonts.ready;});await page.waitForTimeout(350);
await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement instanceof HTMLElement&&document.activeElement.blur());
async function metrics(){return page.evaluate(()=>({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),scrollWidth:document.documentElement.scrollWidth,buttons:document.querySelectorAll('button').length,disabledButtons:document.querySelectorAll('button:disabled').length,bodyWidth:document.body.getBoundingClientRect().width,activeTag:document.activeElement?.tagName??null}))}
async function capture(state){guard();await page.mouse.move(0,0);await page.waitForTimeout(100);const pathName=pageName+'-'+width+'-'+state+'.png';const file=path.join(out,pathName);const data=await page.screenshot({animations:'disabled',fullPage:false});await fsp.writeFile(file,data);guard();const d={page:pageName,width,height:900,state,file:pathName,bytes:data.length,sha256:sha(data),capturedAt:new Date().toISOString(),sourceFingerprint:sha(Buffer.from(JSON.stringify(before))),cssFingerprint:compiled[pageName].sha256,metrics:await metrics(),errors:[...errors],consoleErrors:[...consoleErrors]};screenshots.push(d);console.log('CAPTURE',JSON.stringify({page:d.page,width:d.width,state:d.state,sha:d.sha256.slice(0,16),overflow:d.metrics.overflow,errors:errors.length}));}
const entry={page:pageName,width,tests:{},errors,consoleErrors,initial:await metrics()};
await capture(pageName==='orders'?'board':'main');
const focusTarget=pageName==='dashboard'?page.locator('.od-priority-tile').first():pageName==='orders'?page.locator('.orders-ticket-open').first():page.locator('.waiters-table-tile').first();
if(await focusTarget.count()){await focusTarget.focus();entry.tests.focus=await focusTarget.evaluate(e=>document.activeElement===e);await focusTarget.hover({force:true});await page.waitForTimeout(180);entry.tests.hover=await focusTarget.evaluate(e=>({color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));}
const realDisabled=page.locator('button:disabled');entry.tests.realDisabledCount=await realDisabled.count();entry.tests.realDisabledStatus=entry.tests.realDisabledCount?'observed':'PENDING — no genuine disabled button in this fixture state';if(entry.tests.realDisabledCount)entry.tests.realDisabled=await realDisabled.first().evaluate(e=>({disabled:e.disabled,cursor:getComputedStyle(e).cursor,opacity:getComputedStyle(e).opacity}));
entry.tests.navigation=await page.locator('.mobile-nav-toggle,.sidebar,.mobile-sidebar-overlay').count()? 'present in fixture':'PENDING — page-only fixture lacks real navigation shell';
if(pageName==='orders'){
entry.tests.boardCards=await page.locator('.orders-ticket').count();await focusTarget.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor({timeout:10000});await page.waitForTimeout(650);entry.tests.drawerOpen=true;entry.tests.drawerFocus=await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'));await capture('drawer');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached',timeout:10000});entry.tests.escape=true;const listToggle=page.locator('.orders-view-switch button').nth(1);await listToggle.click();await page.waitForTimeout(200);entry.tests.listRows=await page.locator('.orders-list-surface [role=row],.orders-data-table [role=row],.orders-data-table tbody tr').count();await capture('list');
}else if(pageName==='waiters'){
entry.tests.queueCards=await page.locator('.waiters-queue-card').count();entry.tests.tableTiles=await page.locator('.waiters-table-tile').count();await focusTarget.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor({timeout:10000});await page.waitForTimeout(650);entry.tests.drawerOpen=true;entry.tests.drawerFocus=await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'));await capture('drawer');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached',timeout:10000});entry.tests.escape=true;entry.tests.focusRestored=await focusTarget.evaluate(e=>document.activeElement===e);
}
entry.final=await metrics();checks.push(entry);
if(entry.final.overflow||errors.length)throw new Error('Viewport failed '+pageName+' '+width+' '+JSON.stringify(entry));
await page.close();
}
}finally{await new Promise(resolve=>server.close(resolve))}
}
}finally{await browser?.close()}
guard();
const manifest={version:'R7.5C-1',createdAt:actualTimestamp,completedAt:new Date().toISOString(),workspace:'D:\\projects\\pos',branch:'laravel-inertia-rewrite',sourceHashes:before,sourceFingerprint:sha(Buffer.from(JSON.stringify(before))),compiledCss:compiled,viewportHeights:900,deviceScaleFactor:1,locale:'id',timezone:'Asia/Jakarta',fixedDate:'2026-11-07T10:00:00+07:00',reducedMotion:true,animationCapture:'disabled',fontReady:true,pointerLocation:[0,0],mockData:true,screenshots,checks};
await fsp.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
console.log('R75_DONE',JSON.stringify({screenshots:screenshots.length,checks:checks.length,compiled,output:out,manifestSha256:sha(fs.readFileSync(path.join(out,'manifest.json')))}));
