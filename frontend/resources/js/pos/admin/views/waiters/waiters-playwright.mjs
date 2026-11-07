import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { chromium } from 'file:///D:/mcp-tools/VerityMCP/node_modules/playwright/index.mjs';

const mode = process.argv.includes('--baseline') ? 'baseline' : 'compare';
const previewFile = '__r52_waiters_preview__.html';
const snapshotDirectory = path.join(os.tmpdir(), 'food-pos-r52-waiters');
const viewports = [
    ['desktop', 1440, 900],
    ['tablet', 834, 1112],
    ['mobile', 390, 844],
    ['narrow', 320, 720],
];

const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div>
<script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import {LocaleProvider} from './resources/js/pos/admin/i18n-context.tsx';
import {WaitersView} from './resources/js/pos/admin/views/WaitersView.tsx';
import './resources/css/app.css';
import './resources/js/pos/styles/pos.css';
const query=new URLSearchParams(location.search);if(query.get('locale'))localStorage.setItem('pos-locale',query.get('locale'));
const makeOrder=(id,table,status)=>({id,table,tableCode:table,tone:'teal',name:'Guest '+id,orderNumber:'POS-'+id,meta:'Order '+id,status:status.replaceAll('_',' '),statusTone:'progress',time:'10:0'+id,total:'Rp 25.000',items:[['Nasi',String(id),'Rp 25.000']],rawStatus:status,type:'dine_in',source:'manual',notes:id===1?'No spice':null});
const orders=[makeOrder(1,'A1','ready'),makeOrder(2,'A2','pending'),makeOrder(3,'B1','waiting_payment'),makeOrder(4,'B2','accepted'),makeOrder(5,'C1','preparing'),makeOrder(6,'C2','served')];
const tables=[
 {id:1,code:'A1',name:'Window Table',area:'Main Hall',status:'Need waiter',rawStatus:'need_waiter',seats:4,scans:1,lastOrder:'POS-1',tone:'call',currentOrderId:1},
 {id:2,code:'A2',name:'Family Table',area:'Main Hall',status:'Preparing',rawStatus:'preparing',seats:6,scans:2,lastOrder:'POS-2',tone:'preparing',currentOrderId:2},
 {id:3,code:'A3',name:'Patio Table',area:'Patio',status:'Available',rawStatus:'available',seats:2,scans:0,lastOrder:'No active order',tone:'available',currentOrderId:null},
 {id:4,code:'B1',name:'Corner Table',area:'Patio',status:'Waiting payment',rawStatus:'waiting_payment',seats:4,scans:1,lastOrder:'POS-3',tone:'payment',currentOrderId:3}
];
window.__updates=[];window.__acknowledged=[];
createRoot(document.getElementById('root')).render(React.createElement(LocaleProvider,null,React.createElement(WaitersView,{orders,tables,onUpdateStatus:async(id,status)=>window.__updates.push([id,status]),onAcknowledgeCall:async(id)=>window.__acknowledged.push(id),isSaving:false})));
</script></body></html>`;

let server;
let browser;
try {
    await fs.mkdir(snapshotDirectory, { recursive: true });
    await fs.writeFile(previewFile, html, 'utf8');
    server = await createServer({
        root: process.cwd(),
        configFile: false,
        plugins: [react(), tailwind()],
        resolve: { alias: { '@': path.resolve('resources/js') } },
        server: { host: '127.0.0.1', port: 5227, strictPort: true },
    });
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    for (const [name, width, height] of viewports) {
        await page.setViewportSize({ width, height });
        await page.goto(`http://127.0.0.1:5227/${previewFile}`, {
            waitUntil: 'networkidle',
            timeout: 60000,
        });
        await page
            .locator('.waiters-table-tile')
            .first()
            .waitFor({ state: 'attached', timeout: 30000 });
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({
            overflow: Math.max(
                0,
                document.documentElement.scrollWidth - innerWidth,
            ),
            attentions: document.querySelectorAll('.waiters-attention-row')
                .length,
            queue: document.querySelectorAll('.waiters-queue-card').length,
            tables: document.querySelectorAll('.waiters-table-tile').length,
        }));
        assert.deepEqual(metrics, {
            overflow: 0,
            attentions: 3,
            queue: 5,
            tables: 4,
        });
        const screenshot = await page.screenshot({
            fullPage: true,
            animations: 'disabled',
        });
        const snapshotPath = path.join(snapshotDirectory, `${name}.png`);
        if (mode === 'baseline') {
            await fs.writeFile(snapshotPath, screenshot);
        } else {
            assert.deepEqual(
                screenshot,
                await fs.readFile(snapshotPath),
                `${name} screenshot changed`,
            );
        }
        console.log(`${name} ${JSON.stringify(metrics)} pixels=${mode}`);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:5227/${previewFile}`, {
        waitUntil: 'networkidle',
    });
    await page.locator('.waiters-attention-row.tone-call button').click();
    assert.deepEqual(await page.evaluate(() => window.__acknowledged), [1]);
    await page
        .locator('.waiters-queue-card.is-priority button')
        .first()
        .click();
    assert.deepEqual(await page.evaluate(() => window.__updates), [
        [1, 'served'],
    ]);

    const table = page.locator('.waiters-table-tile').nth(1);
    await table.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ timeout: 10000 });
    assert.equal(await dialog.getAttribute('aria-label'), 'Service details');
    await dialog.getByRole('button', { name: 'Close' }).first().focus();
    assert.equal(
        await dialog.evaluate((element) =>
            element.contains(document.activeElement),
        ),
        true,
    );
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });
    assert.equal(
        await table.evaluate((element) => element === document.activeElement),
        true,
    );

    await page.goto(`http://127.0.0.1:5227/${previewFile}?locale=id`, {
        waitUntil: 'networkidle',
    });
    await page.getByText('Permintaan Pelanggan', { exact: true }).waitFor();
    assert.equal(await page.locator('.waiters-table-tile').count(), 4);
    assert.deepEqual(pageErrors, []);
    console.log('actions, Drawer keyboard/Escape/focus, i18n, JS errors: pass');
} finally {
    await browser?.close();
    await server?.close();
    await fs.rm(previewFile, { force: true });
}
