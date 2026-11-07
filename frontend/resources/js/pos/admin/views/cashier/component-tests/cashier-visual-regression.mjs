/**
 * R5.3 screenshot parity runner.
 * Execute --baseline before source edit, --compare after source edit.
 * Screenshots: queue/detail/tender/receipt-unavailable/receipt-recovered,
 * each at 1440, 834, 390, 320 widths. Freeze baseline CSS in task temp dir
 * to avoid concurrent Agent C build making visual comparison misleading.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
    chromium,
    posOrder,
    posReceipt,
    queueBody,
    responseJson,
    startIsolatedCashierServer,
} from '../receipt-recovery-tests/browser-fixture.mjs';

const baseline = process.argv.includes('--baseline');
if (baseline === process.argv.includes('--compare')) {
    throw Error('Specify exactly --baseline or --compare');
}
const dir = path.join(os.tmpdir(), 'food-pos-r53-cashier');
const images = path.join(dir, baseline ? 'baseline' : 'after');
const cssDir = path.join(dir, 'css');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
fs.mkdirSync(images, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });
if (!baseline)
    assert.ok(
        fs.existsSync(path.join(dir, 'baseline.json')),
        'Baseline absent. Run --baseline before refactor.',
    );

function pixelDifference(oldImage, newImage) {
    const a = PNG.sync.read(oldImage),
        b = PNG.sync.read(newImage);
    if (a.width !== b.width || a.height !== b.height) {
        return {
            diffPixels: null,
            dimensionsOld: [a.width, a.height],
            dimensionsNew: [b.width, b.height],
        };
    }
    let diff = 0;
    for (let i = 0; i < a.data.length; i += 4) {
        if (
            a.data[i] !== b.data[i] ||
            a.data[i + 1] !== b.data[i + 1] ||
            a.data[i + 2] !== b.data[i + 2] ||
            a.data[i + 3] !== b.data[i + 3]
        )
            diff++;
    }
    return { diffPixels: diff, totalPixels: a.width * a.height };
}

async function snapshot(page, w, state, errors, rows) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(160);
    const dom = await page.evaluate(() => ({
        htmlWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        orders: document.querySelectorAll('.cashier-order-row').length,
        paymentDisabled: [
            ...document.querySelectorAll('.cashier-actions button'),
        ].map((el) => el.disabled),
        receipts: document.querySelectorAll('[role=dialog]').length,
    }));
    assert.ok(
        Math.max(dom.htmlWidth, dom.bodyWidth) <= w + 1,
        'overflow at ' + w + '/' + state + ': ' + JSON.stringify(dom),
    );
    assert.deepEqual(errors, [], 'JS errors at ' + w + '/' + state);
    const name = w + '-' + state + '.png';
    const file = path.join(images, name);
    const screenshot = await page.screenshot({
        path: file,
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        timeout: 20000,
    });
    const item = {
        width: w,
        state,
        sha256: hash(screenshot),
        bytes: screenshot.length,
        ...dom,
    };
    if (!baseline) {
        const old = fs.readFileSync(path.join(dir, 'baseline', name));
        item.bytesIdentical = old.equals(screenshot);
        item.pixelDiff = pixelDifference(old, screenshot);
    }
    rows.push(item);
    console.log(
        baseline ? 'BASELINE' : 'COMPARE',
        JSON.stringify({
            width: w,
            state,
            exact: item.bytesIdentical,
            pixelDiff: item.pixelDiff,
            jsErrors: errors.length,
            overflow: false,
        }),
    );
}
async function styles(page) {
    await page.route('**/qa-style-*.css', async (route) => {
        const name = new URL(route.request().url()).pathname.split('/').pop();
        const file = path.join(cssDir, name);
        if (baseline) {
            const bytes = await (await route.fetch()).body();
            fs.writeFileSync(file, bytes);
            await route.fulfill({
                status: 200,
                contentType: 'text/css',
                body: bytes,
            });
        } else {
            assert.ok(
                fs.existsSync(file),
                'Missing frozen baseline CSS ' + name,
            );
            await route.fulfill({
                status: 200,
                contentType: 'text/css',
                body: fs.readFileSync(file),
            });
        }
    });
}
function api(page) {
    let paid = false,
        posts = 0,
        receipts = 0,
        queues = 0;
    page.route('**/pos/**', async (route) => {
        const request = route.request();
        const p = new URL(request.url()).pathname;
        const method = request.method();
        if (method === 'GET' && p === '/pos/cashier/orders') {
            queues++;
            await route.fulfill(
                responseJson(queueBody(paid ? [] : [posOrder(21)])),
            );
        } else if (method === 'GET' && p === '/pos/cashier/orders/21') {
            await route.fulfill(responseJson(posOrder(21)));
        } else if (method === 'POST' && p === '/pos/orders/21/cash-payment') {
            posts++;
            paid = true;
            await route.fulfill(
                responseJson({
                    status: 'paid',
                    payment: { status: 'paid', method: 'cash' },
                    receiptUrl: '/pos/cashier/orders/21/receipt',
                    idempotent: false,
                }),
            );
        } else if (method === 'GET' && p === '/pos/cashier/orders/21/receipt') {
            receipts++;
            await route.fulfill(
                receipts === 1
                    ? responseJson({ message: 'Receipt offline' }, 500)
                    : responseJson(posReceipt(21)),
            );
        } else throw Error('Unexpected QA request: ' + method + ' ' + p);
    });
    return {
        get posts() {
            return posts;
        },
        get receipts() {
            return receipts;
        },
        get queues() {
            return queues;
        },
    };
}
const server = await startIsolatedCashierServer();
const browser = await chromium.launch({ headless: true });
const rows = [];
try {
    for (const width of [1440, 834, 390, 320]) {
        const page = await browser.newPage({
            viewport: { width, height: width <= 390 ? 844 : 900 },
            deviceScaleFactor: 1,
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const calls = api(page);
        try {
            await styles(page);
            await page.goto(server.url);
            await page
                .locator('.cashier-workspace')
                .waitFor({ timeout: 18000 });
            await page.waitForFunction(
                () =>
                    document.querySelectorAll('.cashier-order-row').length ===
                    1,
                null,
                { timeout: 18000 },
            );
            await snapshot(page, width, 'queue', errors, rows);
            if (width <= 834) {
                await page
                    .locator('.cashier-mobile-segments')
                    .getByRole('button', {
                        name: /billDetail|Rincian tagihan/i,
                    })
                    .click();
            }
            const pay = page.getByRole('button', {
                name: /Catat lunas \(tunai\)/,
            });
            await pay.waitFor({ timeout: 18000 });
            await page.waitForFunction(
                () =>
                    [...document.querySelectorAll('button')].some(
                        (e) =>
                            e.textContent?.includes('Catat lunas (tunai)') &&
                            !e.disabled,
                    ),
                null,
                { timeout: 18000 },
            );
            await snapshot(page, width, 'detail', errors, rows);
            const presets = page.locator('.cash-preset-grid button');
            assert.ok((await presets.count()) > 1);
            await presets.nth(1).click();
            await snapshot(page, width, 'tender', errors, rows);
            await pay.click();
            const retry = page.getByRole('button', {
                name: 'Muat ulang struk',
            });
            await retry.waitFor({ timeout: 18000 });
            assert.equal(calls.posts, 1);
            assert.equal(calls.receipts, 1);
            await snapshot(page, width, 'receipt-unavailable', errors, rows);
            await retry.click();
            await page
                .getByRole('dialog', { name: 'Struk pembayaran lunas' })
                .waitFor({ timeout: 18000 });
            assert.equal(calls.posts, 1);
            assert.equal(calls.receipts, 2);
            await snapshot(page, width, 'receipt-recovered', errors, rows);
        } finally {
            await page.close();
        }
    }
    const frontend = path.resolve(import.meta.dirname, '../../../../../../..');
    const sourcePath = path.join(
        frontend,
        'resources/js/pos/admin/views/CashierView.tsx',
    );
    const meta = {
        sourceSha256: hash(fs.readFileSync(sourcePath)),
        styles: Object.fromEntries(
            fs
                .readdirSync(cssDir)
                .map((name) => [
                    name,
                    hash(fs.readFileSync(path.join(cssDir, name))),
                ]),
        ),
        rows,
    };
    fs.writeFileSync(
        path.join(dir, baseline ? 'baseline.json' : 'comparison.json'),
        JSON.stringify(meta, null, 2),
    );
    if (baseline)
        console.log(
            'R53_BASELINE_PASS',
            JSON.stringify({
                images: rows.length,
                sourceSha256: meta.sourceSha256,
                cssFiles: Object.keys(meta.styles).length,
            }),
        );
    else
        console.log(
            'R53_COMPARE_PASS',
            JSON.stringify({
                images: rows.length,
                identical: rows.filter((r) => r.pixelDiff.diffPixels === 0)
                    .length,
                differences: rows
                    .filter((r) => r.pixelDiff.diffPixels !== 0)
                    .map((r) => ({
                        width: r.width,
                        state: r.state,
                        ...r.pixelDiff,
                    })),
            }),
        );
} finally {
    await browser.close();
    await server.close();
}
