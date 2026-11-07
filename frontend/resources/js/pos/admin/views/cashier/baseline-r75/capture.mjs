/**
 * FOOD POS — R7.5B CASHIER VISUAL BASELINE FREEZE
 *
 * CREATE-ONLY: npm-independent browser capture of actual CashierServer,
 * CashierView, hooks, shared HTTP client, mocked Laravel endpoint payloads.
 * Chromium/React tooling is provided by the EXISTING Round 6 fixture.
 *
 * Usage (from frontend):
 *   node resources/js/pos/admin/views/cashier/baseline-r75/capture.mjs
 *   node resources/js/pos/admin/views/cashier/baseline-r75/capture.mjs --verify
 *
 * This is a BEFORE baseline for FUTURE responsive.css extraction. There is
 * intentionally no AFTER/CSS-edit logic. No shared production build.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import { build } from 'vite';
import {
    chromium,
    posOrder,
    posReceipt,
    queueBody,
    responseJson,
    startIsolatedCashierServer,
} from '../receipt-recovery-tests/browser-fixture.mjs';

const VERSION = 'r7.5b-cashier-baseline-1.0.0';
const FIXED_TIME = '2026-11-07T10:00:00.000Z';
const VIEWPORTS = [1440, 834, 390, 320];
const STATES = [
    'queue',
    'selected-detail',
    'tender-payment',
    'receipt-unavailable',
    'receipt-recovered',
    'queue-hover',
    'qris-disabled',
    'underpayment-disabled',
    'payment-keyboard-focus',
    'bill-preview-modal',
];
const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(dirname, '../../../../../../..');
const posRoot = path.join(frontend, 'resources/js/pos');
const evidenceRoot = path.join(os.tmpdir(), 'food-pos-r75-b-cashier');
const imagesRoot = path.join(evidenceRoot, 'png');
const metadataPath = path.join(evidenceRoot, 'manifest.json');
const manifestPath = path.join(dirname, 'manifest.json');
const verifyOnly = process.argv.includes('--verify');
const require = createRequire(path.join(frontend, 'package.json'));
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');

const SOURCE_PATHS = {
    cashierCss: 'admin/views/CashierView.css',
    cashierTsx: 'admin/views/CashierView.tsx',
    responsiveCss: 'admin/styles/responsive.css',
    adminCss: 'admin/styles/admin.css',
    queueCss: 'admin/views/cashier/styles/cashier-queue-layout.css',
    billCss: 'admin/views/cashier/styles/cashier-bill-detail.css',
    queueComponent: 'admin/views/cashier/components/CashierQueuePanel.tsx',
    tenderComponent: 'admin/views/cashier/components/CashierTenderForm.tsx',
    billComponent: 'admin/views/cashier/components/CashierBillPreviewModal.tsx',
    receiptComponent: 'admin/views/cashier/ConfirmedReceiptModal.tsx',
    cashierServer: 'admin/views/orders/CashierServer.tsx',
    cashierHook: 'admin/views/cashier/use-cashier-data.ts',
    cashierApi: 'admin/views/cashier/cashier-api.ts',
    queryCache: 'admin/views/shared-query-cache.ts',
    sharedHttp: 'shared/api/http-client.ts',
    browserFixture:
        'admin/views/cashier/receipt-recovery-tests/browser-fixture.mjs',
};

const REQUIRED = {
    cashierCss:
        'd5236f7a3936b52fcccadb0f9e2de87ba00176e18d74d5b7ffcc1bd0ce91111e',
    cashierTsx:
        '57d7e9369c43123e4867bbf34b65647a0969f92a2825a8074f0ed7a1b766fa69',
    responsiveCss:
        '8ec36a679550ce6488ffd0795ee2088361777168eb74cb32f43c553cff4eb940',
    adminCss:
        '02a3c6b64032800c04b785792e46feb6c0fb69a4ad98a238caed990e2f18aaaa',
    queueCss:
        '87b00c9c70ef934a887fb3ba0fda188caaaf7289381a57cd854c1cbb595d83a5',
    billCss: 'b664f7a112085d6d4dc2a48202eda6d38c1691e950dffc92704a10e62fe895e9',
};

const sourceSnapshot = () =>
    Object.fromEntries(
        Object.entries(SOURCE_PATHS).map(([key, relative]) => {
            const file = path.join(posRoot, relative);
            return [key, sha(fs.readFileSync(file))];
        }),
    );
const snapshotFingerprint = (snapshot) =>
    sha(
        JSON.stringify(
            Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)),
        ),
    );
function assertUnchanged(expected, scope) {
    const current = sourceSnapshot();
    assert.deepEqual(
        current,
        expected,
        'ABORT: production/fixture source SHA changed during ' + scope,
    );
    return current;
}
function assertRequired(snapshot) {
    for (const [name, digest] of Object.entries(REQUIRED)) {
        assert.equal(
            snapshot[name],
            digest,
            'Leader locked source mismatch ' + name,
        );
    }
}
function cssPathsFromManifest() {
    const manifest = JSON.parse(
        fs.readFileSync(
            path.resolve(frontend, '../backend/public/build/manifest.json'),
            'utf8',
        ),
    );
    const entries = [
        'resources/js/app.tsx',
        'resources/js/pages/dashboard.tsx',
    ];
    const assetNames = [
        ...new Set(entries.flatMap((entry) => manifest[entry]?.css ?? [])),
    ];
    assert.ok(assetNames.length > 0, 'No built CSS manifest assets');
    return assetNames.map((name) => ({
        path: name,
        bytes: fs.readFileSync(
            path.resolve(frontend, '../backend/public/build', name),
        ),
    }));
}
async function compileAdminCss() {
    // Vite only produces in-memory CSS output. Do not run vp build and
    // never touch backend/public/build or global Vite config/cache.
    const output = await build({
        root: frontend,
        configFile: false,
        publicDir: false,
        logLevel: 'error',
        plugins: [],
        build: {
            write: false,
            manifest: false,
            minify: true,
            cssMinify: true,
            assetsInlineLimit: 100000,
            rollupOptions: {
                input: path.join(posRoot, 'admin/styles/admin.css'),
            },
        },
    });
    const runs = Array.isArray(output) ? output : [output];
    const css = runs
        .flatMap((run) => run.output ?? [])
        .filter(
            (asset) =>
                asset.type === 'asset' && asset.fileName.endsWith('.css'),
        );
    assert.equal(css.length, 1, 'Expected one isolated CSS asset');
    return Buffer.from(css[0].source);
}
function safeText(value) {
    return String(value)
        .replaceAll('\n', ' ')
        .replaceAll('\r', ' ')
        .replaceAll('\t', ' ')
        .slice(0, 900);
}

async function mockBackend(page) {
    const counters = {
        post: 0,
        receiptGet: 0,
        queueGet: 0,
        detailGet: 0,
        other: 0,
    };
    const posts = [];
    let paid = false;
    await page.route('**/pos/**', async (route) => {
        const request = route.request();
        const p = new URL(request.url()).pathname;
        const method = request.method();
        if (method === 'GET' && p === '/pos/cashier/orders') {
            counters.queueGet++;
            await route.fulfill(
                responseJson(queueBody(paid ? [] : [posOrder(21)])),
            );
        } else if (method === 'GET' && p === '/pos/cashier/orders/21') {
            counters.detailGet++;
            await route.fulfill(responseJson(posOrder(21)));
        } else if (method === 'POST' && p === '/pos/orders/21/cash-payment') {
            counters.post++;
            posts.push(JSON.parse(request.postData() ?? '{}'));
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
            counters.receiptGet++;
            await route.fulfill(
                counters.receiptGet === 1
                    ? responseJson(
                          { message: 'Receipt temporarily unavailable' },
                          500,
                      )
                    : responseJson(posReceipt(21)),
            );
        } else {
            counters.other++;
            await route.fulfill(
                responseJson({ message: 'unexpected mock API route' }, 500),
            );
            throw Error('Unexpected mock route ' + method + ' ' + p);
        }
    });
    return {
        counters,
        posts,
        get paid() {
            return paid;
        },
    };
}
function viewportHeight(width) {
    return width <= 390 ? 844 : 900;
}

async function captureState({
    page,
    width,
    state,
    results,
    errors,
    expected,
    cssFingerprint,
    browserPass,
    cssHashes,
    network,
}) {
    // Ensure the hover/focus environment matches every replay. Hover is the
    // ONLY state where the queue row is deliberately hovered.
    if (state !== 'queue-hover') await page.mouse.move(0, 0);
    assertUnchanged(expected, 'before ' + width + '/' + state);
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    const domBefore = await page.evaluate(() => ({
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        htmlScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        queueRows: document.querySelectorAll('.cashier-order-row').length,
        dialogs: document.querySelectorAll('[role="dialog"]').length,
        paymentDisabled: Array.from(
            document.querySelectorAll('.cashier-actions button'),
            (button) => Boolean(button.disabled),
        ),
        activeElement: {
            tag: document.activeElement?.tagName ?? null,
            className:
                typeof document.activeElement?.className === 'string'
                    ? document.activeElement.className
                    : '',
            label:
                document.activeElement?.textContent?.trim().slice(0, 80) ?? '',
        },
        documentFontStatus: document.fonts.status,
    }));
    assert.equal(domBefore.viewportWidth, width);
    assert.equal(domBefore.viewportHeight, viewportHeight(width));
    assert.ok(
        Math.max(domBefore.htmlScrollWidth, domBefore.bodyScrollWidth) <=
            width + 1,
        'Horizontal overflow at ' + width + '/' + state,
    );
    assert.equal(domBefore.documentFontStatus, 'loaded');
    assert.deepEqual(errors, [], 'Browser errors at ' + width + '/' + state);
    const name = width + '-' + state + '.png';
    const pathname = path.join(imagesRoot, name);
    assert.ok(
        !fs.existsSync(pathname),
        'Refusing to overwrite existing baseline ' + name,
    );
    const png = await page.screenshot({
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        timeout: 20000,
    });
    const parsed = PNG.sync.read(png);
    assert.ok(
        parsed.width === width && parsed.height > 0,
        'Screenshot must decode as valid PNG with expected width',
    );
    const secondCheck = assertUnchanged(
        expected,
        'after ' + width + '/' + state,
    );
    const record = {
        id: width + '/' + state,
        order: results.length + 1,
        width,
        height: viewportHeight(width),
        state,
        filename: 'png/' + name,
        sha256: sha(png),
        bytes: png.byteLength,
        pngDimensions: [parsed.width, parsed.height],
        sourceShaBefore: snapshotFingerprint(expected),
        sourceShaAfter: snapshotFingerprint(secondCheck),
        sourceHashSubset: {
            cashierCss: expected.cashierCss,
            cashierTsx: expected.cashierTsx,
            responsiveCss: expected.responsiveCss,
            queueComponent: expected.queueComponent,
            tenderComponent: expected.tenderComponent,
            billComponent: expected.billComponent,
            browserFixture: expected.browserFixture,
        },
        cssFingerprint,
        cssSourceHashes: cssHashes,
        browserPass,
        dom: domBefore,
        counters: { ...network.counters },
        javascriptErrors: errors.length,
        horizontalOverflow: false,
        status: 'PASS',
    };
    // Never expose a screenshot as a successful baseline until both source
    // checks and PNG decode passed.
    fs.writeFileSync(pathname, png, { flag: 'wx' });
    results.push(record);
    console.log(
        'BASELINE_PNG',
        JSON.stringify({
            name,
            sha256: record.sha256,
            bytes: png.length,
            POST: record.counters.post,
            GETreceipt: record.counters.receiptGet,
            errorCount: record.javascriptErrors,
        }),
    );
}

async function performCapturePass({
    browser,
    serverUrl,
    cssBuffer,
    builtCss,
    expected,
    cssHashes,
    passName,
    writeBaseline,
    records,
}) {
    const checks = {
        widths: [],
        focus: 0,
        hover: 0,
        qrisDisabled: 0,
        underpayDisabled: 0,
        modalPreview: 0,
        receiptRecovery: 0,
        paymentPost: 0,
        unintendedPost: 0,
        errors: 0,
        overflow: 0,
        otherRoutes: 0,
    };
    const screenshotHashList = [];
    for (const width of VIEWPORTS) {
        assertUnchanged(expected, 'before browser session ' + width);
        const page = await browser.newPage({
            viewport: { width, height: viewportHeight(width) },
            deviceScaleFactor: 1,
            colorScheme: 'light',
            locale: 'id-ID',
            timezoneId: 'Asia/Jakarta',
            reducedMotion: 'reduce',
        });
        const errors = [];
        const fixtureResourceWarnings = [];
        page.on('pageerror', (err) => errors.push(safeText(err.message)));
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const message = safeText(msg.text());
            // The isolated mock host intentionally has no favicon/asset
            // endpoint. Browser network-resource errors are distinct from
            // JavaScript page exceptions; record them transparently.
            if (message.startsWith('Failed to load resource')) {
                fixtureResourceWarnings.push({
                    kind: 'fixture-resource',
                    message,
                    location: msg.location().url || null,
                });
            } else {
                errors.push('console: ' + message);
            }
        });
        page.on('response', (response) => {
            if (response.status() >= 400) {
                fixtureResourceWarnings.push({
                    kind: 'http',
                    status: response.status(),
                    url: response.url(),
                    resourceType: response.request().resourceType(),
                });
            }
        });
        await page.addInitScript((fixed) => {
            const RealDate = Date,
                when = RealDate.parse(fixed);
            class FrozenDate extends RealDate {
                constructor(...args) {
                    if (args.length) super(...args);
                    else super(when);
                }
                static now() {
                    return when;
                }
            }
            window.Date = FrozenDate;
        }, FIXED_TIME);
        const backend = await mockBackend(page);
        // Freeze the production CSS manifest asset bodies at preflight,
        // independent of concurrent build output or browser port.
        await page.route('**/qa-style-*.css', (route) => {
            const match = /\/qa-style-(\d+)\.css/.exec(
                new URL(route.request().url()).pathname,
            );
            assert.ok(match, 'Unexpected fixture CSS name');
            const index = Number(match[1]);
            assert.ok(builtCss[index], 'Missing fixture CSS ' + index);
            return route.fulfill({
                status: 200,
                contentType: 'text/css',
                body: builtCss[index].bytes,
            });
        });
        const take = async (state) => {
            if (writeBaseline) {
                await captureState({
                    page,
                    width,
                    state,
                    results: records,
                    errors,
                    expected,
                    cssFingerprint: sha(cssBuffer),
                    cssHashes,
                    browserPass: passName,
                    network: backend,
                });
            } else {
                assertUnchanged(
                    expected,
                    'replay-before ' + width + '/' + state,
                );
                if (state !== 'queue-hover') await page.mouse.move(0, 0);
                await page.evaluate(async () => {
                    await document.fonts.ready;
                });
                const png = await page.screenshot({
                    fullPage: true,
                    animations: 'disabled',
                    caret: 'hide',
                    scale: 'css',
                    timeout: 20000,
                });
                const old = records.find(
                    (item) => item.width === width && item.state === state,
                );
                assert.ok(
                    old,
                    'Missing baseline record for ' + width + '/' + state,
                );
                assert.equal(
                    sha(png),
                    old.sha256,
                    'REPLAY NOT DETERMINISTIC: ' + width + '/' + state,
                );
                assert.equal(
                    png.length,
                    old.bytes,
                    'Byte size difference at ' + width + '/' + state,
                );
                assert.deepEqual(errors, [], 'JavaScript errors during replay');
                assertUnchanged(
                    expected,
                    'replay-after ' + width + '/' + state,
                );
                screenshotHashList.push(old.sha256);
                console.log(
                    'REPLAY_IDENTICAL',
                    JSON.stringify({ width, state, sha256: old.sha256 }),
                );
            }
        };
        try {
            await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
            // The R6.5 fixture has existing built CSS plus isolated admin
            // compiled CSS. Avoid any shared vite/laravel dev server.
            await page.addStyleTag({ content: cssBuffer.toString('utf8') });
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
            assert.equal(backend.counters.post, 0);
            await take('queue');

            const row = page.locator('.cashier-order-row').first();
            await row.hover();
            assert.equal(
                await row.evaluate((el) => el.matches(':hover')),
                true,
            );
            checks.hover++;
            await take('queue-hover');
            await page.mouse.move(0, 0);

            if (width <= 834) {
                const tab = page
                    .locator('.cashier-mobile-segments')
                    .getByRole('button', {
                        name: /billDetail|Rincian tagihan/i,
                    });
                await tab.click();
            }
            const pay = page.getByRole('button', {
                name: /Catat lunas \(tunai\)/,
            });
            await pay.waitFor({ timeout: 18000 });
            await page.waitForFunction(
                () =>
                    [...document.querySelectorAll('button')].some(
                        (el) =>
                            el.textContent?.includes('Catat lunas (tunai)') &&
                            !el.disabled,
                    ),
                null,
                { timeout: 18000 },
            );
            await take('selected-detail');

            const presets = page.locator('.cash-preset-grid button');
            assert.ok((await presets.count()) > 1);
            await presets.nth(1).click();
            await take('tender-payment');

            const methods = page.locator('.payment-methods button');
            await methods.nth(1).click();
            assert.equal(await pay.isDisabled(), true);
            checks.qrisDisabled++;
            await take('qris-disabled');
            await methods.first().click();

            const custom = page.locator('.cashier-cash-input');
            await custom.fill('10000');
            assert.equal(await pay.isDisabled(), true);
            checks.underpayDisabled++;
            await take('underpayment-disabled');
            await custom.fill('50000');
            assert.equal(await pay.isEnabled(), true);

            await pay.focus();
            assert.equal(
                await pay.evaluate((el) => document.activeElement === el),
                true,
            );
            checks.focus++;
            await take('payment-keyboard-focus');

            const previewTrigger = page.getByRole('button', {
                name: 'cashier.printBill',
            });
            await previewTrigger.focus();
            assert.equal(
                await previewTrigger.evaluate(
                    (el) => document.activeElement === el,
                ),
                true,
            );
            await page.keyboard.press('Enter');
            const preview = page.locator('.cashier-receipt-dialog');
            await preview.waitFor({ timeout: 15000 });
            assert.match(
                await preview.innerText(),
                /BELUM TERVERIFIKASI · BUKAN BUKTI BAYAR/,
            );
            checks.modalPreview++;
            await take('bill-preview-modal');
            await preview
                .getByRole('button', { name: 'common.close' })
                .first()
                .click();
            await preview.waitFor({ state: 'hidden', timeout: 15000 });
            assert.equal(
                backend.counters.post,
                0,
                'No payment POST before intentional settlement',
            );
            checks.unintendedPost += backend.counters.post;

            // One intentional test payment; receipt GET initially mocked 500.
            await pay.click();
            const retry = page.getByRole('button', {
                name: 'Muat ulang struk',
            });
            await retry.waitFor({ timeout: 15000 });
            assert.equal(backend.counters.post, 1);
            assert.equal(backend.counters.receiptGet, 1);
            assert.ok(
                backend.counters.queueGet >= 2,
                'Queue synced after confirmation',
            );
            assert.ok(
                backend.posts[0]?.idempotency_key,
                'Idempotency key preserved',
            );
            const status = page
                .getByRole('status')
                .filter({ hasText: 'Pembayaran pesanan #21 sudah tercatat.' });
            assert.equal(await status.isVisible(), true);
            assert.match(await status.innerText(), /Struk belum tersedia/);
            assert.equal(await retry.isEnabled(), true);
            checks.paymentPost++;
            await take('receipt-unavailable');

            await retry.focus();
            await page.keyboard.press('Enter');
            await page
                .getByRole('dialog', { name: 'Struk pembayaran lunas' })
                .waitFor({ timeout: 15000 });
            assert.equal(
                backend.counters.post,
                1,
                'Receipt recovery MUST NOT retry POST',
            );
            assert.equal(
                backend.counters.receiptGet,
                2,
                'GET only receipt recovery',
            );
            checks.receiptRecovery++;
            await take('receipt-recovered');
            assert.equal(backend.counters.other, 0);
            assert.equal(errors.length, 0, 'No browser errors at ' + width);
            console.log(
                'FIXTURE_RESOURCE_WARNINGS',
                JSON.stringify({ width, entries: fixtureResourceWarnings }),
            );
            if (!checks.resourceWarnings) checks.resourceWarnings = {};
            checks.resourceWarnings[width] = fixtureResourceWarnings;
            checks.widths.push(width);
        } finally {
            await page.close();
        }
        assertUnchanged(expected, 'after browser session ' + width);
    }
    checks.errors = 0;
    return { checks, screenshotHashList };
}

async function setupEnvironment() {
    const before = sourceSnapshot();
    assertRequired(before);
    const beforeFp = snapshotFingerprint(before);
    const built = cssPathsFromManifest();
    const builtHashes = Object.fromEntries(
        built.map((item, index) => [
            'qa-style-' + index + '.css',
            {
                manifestAsset: item.path,
                bytes: item.bytes.length,
                sha256: sha(item.bytes),
            },
        ]),
    );
    const css = await compileAdminCss();
    const postCompilation = assertUnchanged(
        before,
        'after isolated Vite compilation',
    );
    assert.equal(snapshotFingerprint(postCompilation), beforeFp);
    const fingerprint = sha(css);
    return { before, beforeFp, built, builtHashes, css, fingerprint };
}

async function verifyManifest() {
    assert.ok(fs.existsSync(manifestPath), 'R7.5B manifest absent');
    assert.ok(fs.existsSync(metadataPath), 'R7.5B metadata absent');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const temp = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    assert.deepEqual(manifest, temp, 'Owned and temp manifests diverged');
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.status, 'PASS');
    assert.equal(manifest.screenshots.length, 40);
    assert.deepEqual(manifest.viewports, VIEWPORTS);
    assert.deepEqual(manifest.states, STATES);
    assert.equal(manifest.harnessVersion, VERSION);
    const current = sourceSnapshot();
    assertRequired(current);
    assert.deepEqual(current, manifest.sourceHashesBeforeCapture);
    assert.deepEqual(current, manifest.sourceHashesAfterCapture);
    const css = await compileAdminCss();
    assert.equal(sha(css), manifest.css.isolatedViteAdmin.sha256);
    for (const row of manifest.screenshots) {
        const file = path.join(evidenceRoot, row.filename);
        const bytes = fs.readFileSync(file);
        assert.equal(
            sha(bytes),
            row.sha256,
            'PNG fingerprint drift ' + row.filename,
        );
        const png = PNG.sync.read(bytes);
        assert.deepEqual([png.width, png.height], row.pngDimensions);
        assert.equal(row.sourceShaBefore, manifest.sourceFingerprint);
        assert.equal(row.sourceShaAfter, manifest.sourceFingerprint);
        assert.equal(row.cssFingerprint, manifest.css.isolatedViteAdmin.sha256);
        assert.equal(row.horizontalOverflow, false);
        assert.equal(row.javascriptErrors, 0);
    }
    console.log(
        'R75B_VERIFY_PASS',
        JSON.stringify({
            count: manifest.screenshots.length,
            sourceFingerprint: manifest.sourceFingerprint,
            css: manifest.css.isolatedViteAdmin.sha256,
            replayCount: manifest.replay.sameHashCount,
            manifestSha256: sha(fs.readFileSync(manifestPath)),
        }),
    );
}

if (verifyOnly) {
    await verifyManifest();
} else {
    assert.ok(
        !fs.existsSync(manifestPath),
        'R7.5B manifest already exists; refusing to overwrite frozen baseline',
    );
    assert.ok(
        !fs.existsSync(metadataPath),
        'R7.5B temp metadata already exists; refusing overwrite',
    );
    if (fs.existsSync(imagesRoot))
        assert.equal(
            fs.readdirSync(imagesRoot).length,
            0,
            'R7.5B PNG folder has partial screenshots; refusing to overwrite',
        );
    // Freeze source and compile CSS before interacting with the browser.
    const env = await setupEnvironment();
    fs.mkdirSync(imagesRoot, { recursive: true });
    const cssFolder = path.join(evidenceRoot, 'css');
    fs.mkdirSync(cssFolder, { recursive: true });
    const writeOrVerifyExisting = (file, bytes) => {
        if (fs.existsSync(file)) {
            assert.equal(
                sha(fs.readFileSync(file)),
                sha(bytes),
                'Aborted-run CSS asset drift; refusing overwrite ' + file,
            );
        } else fs.writeFileSync(file, bytes, { flag: 'wx' });
    };
    writeOrVerifyExisting(path.join(cssFolder, 'isolated-admin.css'), env.css);
    for (let i = 0; i < env.built.length; i++) {
        writeOrVerifyExisting(
            path.join(cssFolder, 'qa-style-' + i + '.css'),
            env.built[i].bytes,
        );
    }
    const server = await startIsolatedCashierServer();
    assertUnchanged(env.before, 'after browser fixture bundle build');
    const browser = await chromium.launch({ headless: true });
    const screenshots = [];
    let passOne, passTwo;
    try {
        passOne = await performCapturePass({
            browser,
            serverUrl: server.url,
            cssBuffer: env.css,
            builtCss: env.built,
            expected: env.before,
            cssHashes: env.builtHashes,
            passName: 'baseline',
            writeBaseline: true,
            records: screenshots,
        });
        assert.equal(screenshots.length, 40, 'Need all 40 distinct PNGs');
        passTwo = await performCapturePass({
            browser,
            serverUrl: server.url,
            cssBuffer: env.css,
            builtCss: env.built,
            expected: env.before,
            cssHashes: env.builtHashes,
            passName: 'replay',
            writeBaseline: false,
            records: screenshots,
        });
        assert.equal(passTwo.screenshotHashList.length, 40);
    } finally {
        await browser.close();
        await server.close();
    }
    const after = assertUnchanged(env.before, 'after all 80 browser captures');
    const result = {
        schemaVersion: 1,
        kind: 'BEFORE_ONLY_CASHIER_VISUAL_BASELINE',
        status: 'PASS',
        harnessVersion: VERSION,
        createdAt: new Date().toISOString(),
        fixedDateTime: FIXED_TIME,
        branch: 'laravel-inertia-rewrite',
        sourceFilePaths: SOURCE_PATHS,
        sourceHashesBeforeCapture: env.before,
        sourceHashesAfterCapture: after,
        sourceFingerprint: env.beforeFp,
        sourceCheckProtocol:
            'hash all 16 files before/after Vite, each screenshot, each viewport, after replay; abort on drift',
        css: {
            isolatedViteAdmin: {
                sha256: env.fingerprint,
                bytes: env.css.byteLength,
                tempPath: path.join(cssFolder, 'isolated-admin.css'),
                buildMethod:
                    'vite.build({configFile:false,write:false,publicDir:false,rollupOptions:{input:admin/styles/admin.css}})',
            },
            frozenProductionFixtureAssets: env.builtHashes,
            loadOrder:
                'Frozen manifest CSS as link tags; in-memory compiled admin CSS injected after page load',
        },
        environment: {
            node: process.version,
            platform: process.platform,
            vite: require('vite/package.json').version,
            react: require('react/package.json').version,
            browser: 'Playwright Chromium',
            chromiumVersion: browser.version(),
            viewportHeight: '900px for 1440/834, 844px for 390/320',
            pixelRatio: 1,
            locale: 'id-ID',
            timezone: 'Asia/Jakarta',
            prefersReducedMotion: true,
            freezeDateNowAndNewDate: FIXED_TIME,
            screenshotAnimations: 'disabled',
            mouse: '(0,0) except queue-hover',
            fontWait: 'document.fonts.ready',
            serverPort: 'isolated ephemeral TCP port 0',
            fixture:
                'Actual CashierServer/CashierView/cashier hook, real cashier-api, shared cache/HTTP; fixture-native BoardUI primitive/locale/DTO mocks',
            network:
                'All POS Laravel endpoints intercepted in Playwright; 1 intentional POST per viewport; all receipt retry GET-only',
            canonicalBoardUI: false,
            realLaravel: false,
            realDatabase: false,
            realPrinter: false,
            productionBuildWasRun: false,
        },
        viewports: VIEWPORTS,
        states: STATES,
        screenshots,
        browserChecks: passOne.checks,
        replay: {
            status: 'PASS',
            runs: 2,
            sameHashCount: passTwo.screenshotHashList.length,
            screenshotSha256MatchingEveryState: true,
            browserChecks: passTwo.checks,
        },
        evidenceRoot,
        limitations: [
            'Mocked Laravel JSON/API, no real authentication or CSRF',
            'Lightweight BoardUI primitives and locale controls in existing fixture; not canonical BoardUI focus trap proof',
            'CSS from frozen production manifest links plus isolated in-memory Vite admin CSS',
            'Playwright Chromium only; does not validate thermal printer hardware or database concurrency',
            'Baseline BEFORE only; no responsive.css extraction or AFTER screenshot comparison',
        ],
    };
    assert.equal(screenshots.length, 40);
    assert.deepEqual(passOne.checks.widths, VIEWPORTS);
    assert.equal(passOne.checks.unintendedPost, 0);
    assert.equal(passOne.checks.receiptRecovery, 4);
    assert.equal(passOne.checks.qrisDisabled, 4);
    assert.equal(passOne.checks.underpayDisabled, 4);
    assert.equal(passOne.checks.focus, 4);
    assert.equal(passOne.checks.hover, 4);
    assert.equal(passOne.checks.modalPreview, 4);
    assert.equal(passOne.checks.paymentPost, 4);
    // Persist only once, AFTER deterministic 2-pass validation.
    fs.writeFileSync(metadataPath, JSON.stringify(result, null, 2) + '\n', {
        flag: 'wx',
    });
    fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2) + '\n', {
        flag: 'wx',
    });
    console.log(
        'R75B_BASELINE_FREEZE_PASS',
        JSON.stringify({
            images: screenshots.length,
            viewports: VIEWPORTS,
            statesPerViewport: STATES.length,
            replayMatched: passTwo.screenshotHashList.length,
            sourceFingerprint: env.beforeFp,
            compiledCss: env.fingerprint,
            evidenceRoot,
            manifestPath,
            manifestSha256: sha(fs.readFileSync(manifestPath)),
        }),
    );
}
