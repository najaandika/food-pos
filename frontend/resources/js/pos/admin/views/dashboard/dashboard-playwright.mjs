import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { chromium } from 'file:///D:/mcp-tools/VerityMCP/node_modules/playwright/index.mjs';

const mode = process.argv.includes('--baseline') ? 'baseline' : 'compare';
const previewFile = '__r51_dashboard_preview__.html';
const snapshotDirectory = path.join(os.tmpdir(), 'food-pos-r51-dashboard');
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
import {DashboardView} from './resources/js/pos/admin/views/DashboardView.tsx';
import './resources/css/app.css';
import './resources/js/pos/styles/pos.css';
const role=new URLSearchParams(location.search).get('role')||'owner';
const statuses=['pending','accepted','preparing','ready','served','waiting_payment','paid','cancelled'];
const orders=statuses.map((status,index)=>({id:index+1,table:'A'+(index+1),tableCode:'A'+(index+1),tone:'teal',name:'Guest '+(index+1),orderNumber:'POS-'+(index+1),meta:'Order',status,statusTone:'progress',time:'10:0'+index,total:'Rp 25.000',items:[['Nasi',String(index+1),'Rp 25.000']],rawStatus:status,type:'dine_in',source:'manual'}));
const dashboard={revenueToday:2500000,activeOrders:6,qrOrders:4,needAction:3,waitingPayment:1,paidToday:7};
const dishes=Array.from({length:5},(_,index)=>({id:index+1,name:'Dish '+(index+1),desc:'Menu',price:'Rp 25.000',qty:1,image:'',soldToday:10-index}));
const counts=Object.fromEntries(statuses.map((status,index)=>[status,index+1]));
const liveInfo={statusCounts:counts,totalOrders:36,ordersToday:18,recentLimit:8,activeTableCount:5,activeTableOrders:orders.slice(0,5),priorityOrders:[orders[0],orders[3],orders[5]],refreshing:false,onRefresh:()=>window.__refreshes++,historyRevision:0};
window.__views=[];window.__opened=[];window.__refreshes=0;
createRoot(document.getElementById('root')).render(React.createElement(LocaleProvider,null,React.createElement(DashboardView,{role,dashboard,dishes,orders,onChangeView:view=>window.__views.push(view),onOpenOrder:order=>window.__opened.push(order.orderNumber),liveInfo})));
</script></body></html>`;

const historyPayload = {
    source: 'database',
    timezone: 'Asia/Jakarta',
    from: '2026-10-09',
    to: '2026-11-07',
    days: 30,
    totals: { revenue: 2500000, payments: 7, orders: 36 },
    dailyRevenue: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        amount: index * 10000,
        payments: index % 4,
    })),
    orderActivity: Array.from({ length: 84 }, (_, index) => ({
        weekday: index % 7,
        hour: 9 + (index % 12),
        count: index % 5,
    })),
    maxActivity: 4,
};

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
        server: { host: '127.0.0.1', port: 5217, strictPort: true },
    });
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/dashboard/history', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(historyPayload),
        }),
    );

    for (const [name, width, height] of viewports) {
        await page.setViewportSize({ width, height });
        await page.goto(`http://127.0.0.1:5217/${previewFile}?role=owner`, {
            waitUntil: 'networkidle',
            timeout: 60000,
        });
        await page
            .locator('.od-bar-group')
            .first()
            .waitFor({ state: 'attached', timeout: 30000 });
        await page
            .locator('.od-history-grid')
            .waitFor({ state: 'attached', timeout: 30000 });
        await page.waitForTimeout(300);
        const metrics = await page.evaluate(() => ({
            overflow: Math.max(
                0,
                document.documentElement.scrollWidth - window.innerWidth,
            ),
            bars: document.querySelectorAll('.od-bar-group').length,
            shortcuts: document.querySelectorAll('.od-shortcut').length,
            priorityButtons:
                document.querySelectorAll('.od-priority-tile').length,
            history: document.querySelectorAll('.od-history-grid').length,
        }));
        assert.deepEqual(metrics, {
            overflow: 0,
            bars: 8,
            shortcuts: 4,
            priorityButtons: 3,
            history: 1,
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
    await page.goto(`http://127.0.0.1:5217/${previewFile}?role=owner`, {
        waitUntil: 'networkidle',
    });
    const firstBar = page.locator('.od-bar-track').first();
    await firstBar.focus();
    await page.keyboard.press('Enter');
    assert.equal(await firstBar.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await firstBar.getAttribute('aria-pressed'), 'true');
    await page.getByText('Active', { exact: true }).click();
    assert.equal(await page.locator('.od-bar-group').count(), 6);
    await page.locator('.od-priority-tile').first().focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.__opened), ['POS-1']);
    await page
        .getByRole('button', { name: 'Refresh', exact: true })
        .first()
        .click();
    assert.equal(await page.evaluate(() => window.__refreshes), 1);
    await page.locator('.od-shortcut').first().focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.__views), ['menu']);

    for (const [role, shortcuts] of [
        ['kasir', 3],
        ['waiters', 2],
    ]) {
        await page.goto(`http://127.0.0.1:5217/${previewFile}?role=${role}`, {
            waitUntil: 'networkidle',
        });
        assert.equal(await page.locator('.od-shortcut').count(), shortcuts);
        assert.equal(await page.locator('.od-history-grid').count(), 0);
    }
    assert.deepEqual(pageErrors, []);
    console.log(`role paths, keyboard, callbacks, JS errors: pass`);
} finally {
    await browser?.close();
    await server?.close();
    await fs.rm(previewFile, { force: true });
}
