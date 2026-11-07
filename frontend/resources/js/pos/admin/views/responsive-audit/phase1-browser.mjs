import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { chromium } from 'file:///D:/mcp-tools/VerityMCP/node_modules/playwright/index.mjs';

const root = process.cwd();
const widthList = [1440, 834, 390, 320];
const dir = path.join(os.tmpdir(), 'food-pos-r66-phase1-agent-c-20261107');
await fs.mkdir(dir, { recursive: true });
const report = [];
for (const name of ['dashboard', 'waiters']) {
    const fixture = path.join(root, 'resources/js/pos/admin/views', name, name + '-playwright.mjs');
    const fixtureCode = await fs.readFile(fixture, 'utf8');
    const html = fixtureCode.match(/const html = `([\s\S]*?)`;/)?.[1];
    if (!html) throw new Error('Cannot read existing deterministic fixture: ' + name);
    let source = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
    if (!source) throw new Error('Cannot extract JSX renderer for ' + name);
    source = source
        .replaceAll("'./resources/js/pos/admin/i18n-context.tsx'", "'@/pos/admin/i18n-context'")
        .replaceAll("'./resources/js/pos/admin/views/DashboardView.tsx'", "'@/pos/admin/views/DashboardView'")
        .replaceAll("'./resources/js/pos/admin/views/WaitersView.tsx'", "'@/pos/admin/views/WaitersView'")
        .replaceAll("'./resources/css/app.css'", "'audit-app-css'")
        .replaceAll("'./resources/js/pos/styles/pos.css'", "'@/pos/styles/pos.css'");
    const result = await build({
        root, configFile: false, logLevel: 'error',
        resolve: { alias: [{ find: 'audit-app-css', replacement: path.join(root, 'resources/css/app.css') }, {find:'@',replacement:path.join(root,'resources/js')}] },
        plugins: [react(), tailwind(), {
            name: 'r66-audit-only-entry',
            resolveId(id) { return id === 'virtual:r66' ? '\0virtual:r66' : null; },
            load(id) { return id === '\0virtual:r66' ? source : null; },
        }],
        build: { write: false, rollupOptions: { input: 'virtual:r66', output: { entryFileNames: 'app.js' } } },
    });
    const outputs = Array.isArray(result) ? result.flatMap(x => x.output) : result.output;
    const assets = new Map(outputs.map(x => [x.fileName, x.type === 'chunk' ? x.code : x.source]));
    const css = outputs.filter(x => x.fileName.endsWith('.css')).map(x=>'<link rel="stylesheet" href="/'+x.fileName+'">').join('');
    const cssFingerprint = createHash('sha256').update(outputs.filter(x=>x.fileName.endsWith('.css')).map(x=>String(x.source)).join('\n')).digest('hex');
    const server = http.createServer((req,res)=>{
        const f=(req.url||'/').split('?')[0].slice(1);
        if(!f){res.setHeader('Content-Type','text/html');return res.end('<meta name="viewport" content="width=device-width,initial-scale=1">'+css+'<div id="root"></div><script type="module" src="/app.js"></script>');}
        const body=assets.get(f);
        if(body===undefined){res.statusCode=404;return res.end('404');}
        res.setHeader('Content-Type',f.endsWith('.css')?'text/css':'text/javascript');
        res.end(body);
    });
    await new Promise(resolve=>server.listen(9007,'127.0.0.1',resolve));
    let browser;
    try {
        browser=await chromium.launch({headless:true});
        for (const width of widthList) {
            const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            await page.goto('http://127.0.0.1:9007/',{waitUntil:'domcontentloaded',timeout:20000});
            const marker=name==='dashboard'?'.dashboard-workspace':'.waiters-workspace';
            await page.locator(marker).first().waitFor({timeout:30000}).catch(()=>{});
            await page.waitForTimeout(350);
            const before=await page.evaluate(()=>({
                overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
                scrollWidth:document.documentElement.scrollWidth,
                gridColumns:getComputedStyle(document.querySelector('.dashboard-layout,.waiters-layout')??document.querySelector('.main-panel')??document.body).gridTemplateColumns,
                buttons:document.querySelectorAll('button').length,
                orders:document.querySelectorAll('.waiters-queue-card').length,
                tables:document.querySelectorAll('.waiters-table-tile').length,
            }));
            await page.screenshot({path:path.join(dir,name+'-'+width+'-main.png'),animations:'disabled'});
            const button=page.locator('button:not(:disabled)').first();
            let focus=false,hover=null,disabled=null;
            if (await button.count()) {
                await button.focus();focus=await button.evaluate(e=>e===document.activeElement);
                await button.hover({force:true});await page.waitForTimeout(170);
                hover=await button.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
                await button.evaluate(e=>e.disabled=true);
                disabled=await button.evaluate(e=>({native:e.disabled,opacity:getComputedStyle(e).opacity,cursor:getComputedStyle(e).cursor}));
                await button.evaluate(e=>e.disabled=false);
            }
            let drawer=false,drawerFocus=false,escape=false;
            if(name==='waiters') {
                const tile=page.locator('.waiters-table-tile').first();
                if(await tile.count()){
                    await tile.click();
                    await page.waitForTimeout(350);
                    drawer=await page.getByRole('dialog').count()>0;
                    if(drawer){
                        drawerFocus=await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'));
                        await page.screenshot({path:path.join(dir,name+'-'+width+'-drawer.png'),animations:'disabled'});
                        await page.keyboard.press('Escape');
                        await page.getByRole('dialog').waitFor({state:'detached',timeout:10000});
                        escape=true;
                    }
                }
            }
            const outcome={name,width,...before,focus,hover,disabled,drawer,drawerFocus,escape,errors,cssFingerprint};
            report.push(outcome);
            console.log('R66_VISUAL',JSON.stringify(outcome));
            await page.close();
        }
    } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
}
await fs.writeFile(path.join(dir,'metadata.json'),JSON.stringify(report,null,2),'utf8');
console.log('R66_SUMMARY',JSON.stringify({folder:dir,rows:report.length,errors:report.reduce((a,x)=>a+x.errors.length,0),overflow:report.filter(x=>x.overflow>0).length,files:await fs.readdir(dir)}));
