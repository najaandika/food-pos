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
const output=path.join(os.tmpdir(),'food-pos-r82-c-tables-before');
if(!fs.existsSync(path.join(output,'manifest.json')))throw Error('Primary baseline missing');
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
'resources/js/pos/admin/views/owner-tables/baseline-r82/capture.mjs',
'resources/js/pos/admin/views/owner-tables/baseline-r82/edge-states.mjs'
];
const initial=Object.fromEntries(locked.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
const required={
'resources/js/pos/admin/views/OwnerTablesView.tsx':'ea6c0c35c64fbae7271bfabd38b23412b997a6a1030a8671b4878d91de4caa94',
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
await new Promise(resolve=>serve.listen(9032,'127.0.0.1',resolve));
const tables=[
{id:11,code:'A1',name:'Indoor Window',area:'Indoor',seats:2,status:'available',scans_today:18,current_order_id:null},
{id:12,code:'A4',name:'Indoor Center',area:'Indoor',seats:4,status:'occupied',scans_today:42,current_order_id:925},
{id:13,code:'B2',name:'Bar Area',area:'Bar',seats:2,status:'preparing',scans_today:31,current_order_id:921},
{id:14,code:'B7',name:'Outdoor Bench',area:'Outdoor',seats:4,status:'need_waiter',scans_today:27,current_order_id:926},
{id:15,code:'C2',name:'Terrace',area:'Terrace',seats:3,status:'waiting_payment',scans_today:22,current_order_id:927},
{id:16,code:'O1',name:'Outdoor Surf Corner',area:'Outdoor',seats:4,status:'inactive',scans_today:9,current_order_id:null}
];

const widths=[1440,834,390,320],states=['loading','error'];const screenshots=[],checks=[];let browser;
try{browser=await chromium.launch({headless:true});
for(const width of widths){for(const state of states){
guard();
const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light',locale:'en-US',timezoneId:'Asia/Jakarta'});
await context.addInitScript(()=>{const Base=Date;const now=Base.parse('2026-11-07T10:00:00+07:00');class Fixed extends Base{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}Object.setPrototypeOf(Fixed,Base);globalThis.Date=Fixed;localStorage.setItem('pos-locale','id')});
const page=await context.newPage(),errors=[],consoleErrors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text())});
let release=null;
await page.route('**/pos/tables**',async route=>{const r=route.request();requests.push({method:r.method(),path:new URL(r.url()).pathname});if(r.method()!=='GET')throw Error('Unexpected mutation');if(state==='loading')await new Promise(resolve=>{release=resolve});return route.fulfill({status:state==='error'?503:200,contentType:'application/json',body:state==='error'?'{"message":"fixture down"}':JSON.stringify({data:tables,current_page:1,last_page:1})})});
await page.goto('http://127.0.0.1:9032/',{waitUntil:'domcontentloaded'});
const fb=page.locator('.tables-api-feedback');
await fb.waitFor({timeout:15000});if(state==='error'){await page.locator('.tables-api-feedback[role=alert]').waitFor({timeout:15000})}else await page.locator('.tables-api-feedback[role=status]').waitFor({timeout:15000});
await page.evaluate(async()=>document.fonts.ready);await page.waitForTimeout(350);
const disabled=await page.locator('.tables-p1-add-button:disabled').count();
const feedback=await fb.innerText(),overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
guard();const filename=width+'-server-'+state+'.png';const image=await page.screenshot({animations:'disabled'});fs.writeFileSync(path.join(output,filename),image);
guard();const record={width,height:900,state:'server-'+state,filename,sha256:sha(image),bytes:image.length,dimensions:{width:image.readUInt32BE(16),height:image.readUInt32BE(20)},capturedAt:new Date().toISOString(),sourceFingerprint:sha(JSON.stringify(initial)),cssFingerprint,metrics:{overflow,disabled,feedbackRole:state==='error'?'alert':'status'},pageErrors:[...errors],consoleErrors:[...consoleErrors],requests:[...requests],metadata:{loadingOrError:true,feedback,releasePending:state==='loading'}};
screenshots.push(record);checks.push({width,state,disabled,overflow,errors,consoleErrors,requests});
console.log('R82_EDGE_CAPTURE',JSON.stringify({width,state,overflow,disabled,errors:errors.length}));
if(release)release();await context.close();
}}}finally{await browser?.close();await new Promise(resolve=>serve.close(resolve))}
guard();const m={version:'R8.2C-edge-v1',sourceHashes:initial,sourceFingerprint:sha(JSON.stringify(initial)),compiledCss:{sha256:cssFingerprint,assets:cssAssets.map(x=>({file:x.fileName,sha256:sha(String(x.source))}))},environment:{viewportHeight:900,locale:'id',timezone:'Asia/Jakarta',fixedClock:'2026-11-07T10:00:00+07:00',mockEndpoint:true},screenshots,checks,createdAt:new Date().toISOString()};
fs.writeFileSync(path.join(output,'edge-manifest.json'),JSON.stringify(m,null,2),'utf8');
console.log('R82_EDGE_DONE',JSON.stringify({screenshots:screenshots.length,manifestSha256:sha(fs.readFileSync(path.join(output,'edge-manifest.json')))}));
