/**
 * FOOD POS — Agent B R3.2 Phase 2C
 * Run from frontend: node resources/js/pos/admin/views/cashier/receipt-recovery-playwright.mjs
 *
 * Uses actual CashierServer, CashierView, ConfirmedReceiptModal,
 * useCashierData, cashier-api, shared query cache and HTTP transport.
 * Laravel endpoints are fulfilled by Playwright only; never accesses DB.
 * Each case is a new tab in an isolated single-port fixture server.
 */
import assert from 'node:assert/strict';
import {
    chromium,
    posOrder,
    posReceipt,
    queueBody,
    responseJson,
    startIsolatedCashierServer,
} from './receipt-recovery-tests/browser-fixture.mjs';

const VIEWPORTS = [1440, 834, 390, 320];
const heightFor = (width) => (width <= 390 ? 844 : 900);
const payLabel = /Catat lunas \(tunai\)/;
const retryLabel = /Muat ulang struk/;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check, limitMs = 6000, label = 'condition') {
    const until = Date.now() + limitMs;
    while (Date.now() < until) {
        if (await check()) return;
        await sleep(20);
    }
    throw Error('Timed out waiting for ' + label);
}

function routeMock(
    page,
    { postStatus = 200, receiptFailures = 0, orderId = 21 } = {},
) {
    const count = { post: 0, receipt: 0, queue: 0, detail: 0 };
    const posts = [];
    let paid = false;

    page.route('**/pos/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname === '/pos/cashier/orders' && method === 'GET') {
            count.queue++;
            await route.fulfill(
                responseJson(queueBody(paid ? [] : [posOrder(orderId)])),
            );
            return;
        }
        if (pathname === '/pos/cashier/orders/' + orderId && method === 'GET') {
            count.detail++;
            await route.fulfill(responseJson(posOrder(orderId)));
            return;
        }
        if (
            pathname === '/pos/orders/' + orderId + '/cash-payment' &&
            method === 'POST'
        ) {
            count.post++;
            const payload = JSON.parse(request.postData() ?? '{}');
            posts.push(payload);
            if (postStatus === 409) {
                await route.fulfill(
                    responseJson(
                        { message: 'Tagihan sudah lunas atau berubah' },
                        409,
                    ),
                );
                return;
            }
            if (postStatus === 422) {
                await route.fulfill(
                    responseJson(
                        {
                            message: 'Data tidak valid',
                            errors: {
                                received_amount: ['Uang diterima tidak valid'],
                            },
                        },
                        422,
                    ),
                );
                return;
            }
            if (postStatus !== 200) {
                await route.fulfill(
                    responseJson({ message: 'Settlement gagal' }, postStatus),
                );
                return;
            }
            paid = true;
            await route.fulfill(
                responseJson({
                    status: 'paid',
                    payment: { status: 'paid', method: 'cash' },
                    receiptUrl: '/pos/cashier/orders/' + orderId + '/receipt',
                    idempotent: false,
                }),
            );
            return;
        }
        if (
            pathname === '/pos/cashier/orders/' + orderId + '/receipt' &&
            method === 'GET'
        ) {
            count.receipt++;
            if (count.receipt <= receiptFailures) {
                await route.fulfill(
                    responseJson(
                        { message: 'Receipt temporarily unavailable' },
                        500,
                    ),
                );
            } else {
                await route.fulfill(responseJson(posReceipt(orderId)));
            }
            return;
        }
        throw Error('Unexpected POS request ' + method + ' ' + pathname);
    });
    return {
        count,
        posts,
        get paid() {
            return paid;
        },
    };
}

async function assertResponsive(page, width, stage) {
    const result = await page.evaluate(() => ({
        vw: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
    }));
    assert.ok(
        Math.max(result.html, result.body) <= result.vw + 1,
        'Horizontal overflow ' +
            width +
            'px at ' +
            stage +
            ': ' +
            JSON.stringify(result),
    );
}

async function preparePay(page, url, width) {
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (width <= 834) {
        // The real responsive CashierView defaults to Queue on narrow screens.
        // Navigate through its actual Detail segmented tab before settling.
        const detail = page
            .locator('.cashier-mobile-segments')
            .getByRole('button', { name: /billDetail|Rincian tagihan/i });
        await detail.waitFor({ timeout: 17000 });
        if (await detail.isVisible()) await detail.click();
    }
    const pay = page.getByRole('button', { name: payLabel });
    await pay.waitFor({ timeout: 17000 });
    await page.waitForFunction(
        () => {
            const element = Array.from(
                document.querySelectorAll('button'),
            ).find((b) => b.textContent?.includes('Catat lunas (tunai)'));
            return element && !element.disabled;
        },
        null,
        { timeout: 17000 },
    );
    await assertResponsive(page, width, 'initial');
    return { pay, failures };
}

async function confirmedUnavailable(browser, url, width) {
    const page = await browser.newPage({
        viewport: { width, height: heightFor(width) },
    });
    const mocks = routeMock(page, { receiptFailures: 2 });
    try {
        const { pay, failures } = await preparePay(page, url, width);
        const initialQueue = mocks.count.queue;
        await pay.click();
        const retry = page.getByRole('button', { name: retryLabel });
        await retry.waitFor({ timeout: 14000 });
        const status = page.getByRole('status').filter({
            hasText: 'Pembayaran pesanan #21 sudah tercatat.',
        });
        assert.equal(
            await status.isVisible(),
            true,
            'confirmed notice must be shown',
        );
        assert.match(await status.innerText(), /Struk belum tersedia/i);
        assert.doesNotMatch(
            await status.innerText(),
            /Pembayaran gagal|Gagal mencatat pembayaran/i,
        );
        assert.equal(
            mocks.count.post,
            1,
            'confirmed settlement exactly one POST',
        );
        assert.equal(mocks.count.receipt, 1, 'first receipt GET failed');
        assert.ok(
            mocks.count.queue > initialQueue,
            'cashier queue must revalidate after confirmed POST',
        );
        assert.equal(mocks.paid, true);
        assert.ok(
            mocks.posts[0]?.idempotency_key,
            'real API must preserve the Laravel idempotency_key',
        );
        assert.equal(mocks.posts[0].method, 'cash');
        // Once confirmed, order no longer appears payable in the queue.
        assert.equal(
            await page.evaluate(() =>
                [...document.querySelectorAll('button')]
                    .filter((button) =>
                        button.textContent?.includes('Catat lunas (tunai)'),
                    )
                    .every((button) => button.disabled),
            ),
            true,
            'paid order cannot be paid again',
        );
        assert.equal(await retry.isEnabled(), true);
        assert.equal(await retry.evaluate((el) => el.tagName), 'BUTTON');
        assert.ok((await retry.evaluate((el) => el.tabIndex)) >= 0);
        await assertResponsive(page, width, 'first 500 notice');

        // Keyboard-only GET retry, intentionally fail a second time.
        await retry.focus();
        assert.equal(
            await retry.evaluate((el) => document.activeElement === el),
            true,
        );
        await page.keyboard.press('Enter');
        await waitUntil(
            () => mocks.count.receipt === 2,
            6000,
            'keyboard receipt GET retry',
        );
        await retry.waitFor({ state: 'visible' });
        await waitUntil(
            async () => retry.isEnabled(),
            6000,
            're-enabled retry after second 500',
        );
        assert.match(await status.innerText(), /Struk belum tersedia/i);
        assert.equal(mocks.count.post, 1, 'failed GET retry must never POST');
        await assertResponsive(page, width, 'second 500 notice');

        // Keyboard-only GET recovery succeeds and opens actual receipt view.
        await retry.focus();
        await page.keyboard.press('Enter');
        await page
            .getByRole('dialog', { name: 'Struk pembayaran lunas' })
            .waitFor({ timeout: 14000 });
        assert.equal(
            mocks.count.receipt,
            3,
            'two failed GETs then one successful GET',
        );
        assert.equal(
            mocks.count.post,
            1,
            'successful receipt retry must never POST',
        );
        assert.equal(
            await status.count(),
            0,
            'recovered receipt notice must disappear',
        );
        assert.match(
            await page
                .getByRole('dialog', { name: 'Struk pembayaran lunas' })
                .innerText(),
            /Struk pembayaran lunas|LUNAS/i,
        );
        await assertResponsive(page, width, 'receipt modal');
        assert.deepEqual(failures, [], 'no JS page errors');
        console.log(
            'PASS confirmed-recovery',
            JSON.stringify({
                width,
                POST: mocks.count.post,
                GETreceipt: mocks.count.receipt,
                GETqueue: mocks.count.queue,
                GETbill: mocks.count.detail,
                pageErrors: failures.length,
            }),
        );
    } finally {
        await page.close();
    }
}

async function failedSettlement(browser, url, width, statusCode) {
    const page = await browser.newPage({
        viewport: { width, height: heightFor(width) },
    });
    const mocks = routeMock(page, { postStatus: statusCode });
    try {
        const { pay, failures } = await preparePay(page, url, width);
        await pay.click();
        const alert = page.getByRole('alert').filter({
            hasText:
                statusCode === 409
                    ? 'Tagihan sudah lunas atau berubah'
                    : 'Uang diterima tidak valid',
        });
        await alert.waitFor({ timeout: 13000 });
        assert.equal(mocks.count.post, 1);
        assert.equal(
            mocks.count.receipt,
            0,
            'POST error cannot cause receipt GET',
        );
        assert.equal(
            mocks.paid,
            false,
            'POST rejected must remain unconfirmed',
        );
        assert.equal(
            await page.getByRole('button', { name: retryLabel }).count(),
            0,
            'GET-only receipt recovery must not show for failed POST',
        );
        assert.equal(
            await pay.isEnabled(),
            true,
            'failed POST must not lock the order as confirmed',
        );
        assert.deepEqual(failures, []);
        await assertResponsive(page, width, 'failed POST ' + statusCode);
        console.log(
            'PASS rejected-POST',
            JSON.stringify({
                width,
                status: statusCode,
                POST: mocks.count.post,
                GETreceipt: mocks.count.receipt,
                GETqueue: mocks.count.queue,
                pageErrors: failures.length,
            }),
        );
    } finally {
        await page.close();
    }
}

async function normalSuccess(browser, url) {
    const width = 1440;
    const page = await browser.newPage({
        viewport: { width, height: heightFor(width) },
    });
    const mocks = routeMock(page, { receiptFailures: 0 });
    try {
        const { pay, failures } = await preparePay(page, url, width);
        await pay.click();
        await page
            .getByRole('dialog', { name: 'Struk pembayaran lunas' })
            .waitFor({ timeout: 13000 });
        assert.equal(mocks.count.post, 1);
        assert.equal(mocks.count.receipt, 1);
        assert.deepEqual(failures, []);
        await assertResponsive(page, width, 'normal receipt');
        console.log(
            'PASS normal-success',
            JSON.stringify({
                width,
                POST: mocks.count.post,
                GETreceipt: mocks.count.receipt,
                GETqueue: mocks.count.queue,
                pageErrors: failures.length,
            }),
        );
    } finally {
        await page.close();
    }
}

const fixture = await startIsolatedCashierServer();
const browser = await chromium.launch({ headless: true });
try {
    console.log(
        'PHASE2C_FIXTURE',
        JSON.stringify({
            address: fixture.url,
            compiledCssFiles: fixture.cssCount,
            actualModules:
                'CashierServer/CashierView/ConfirmedReceiptModal/useCashierData/cashier-api/shared-cache/http-client',
        }),
    );
    for (const width of VIEWPORTS) {
        await confirmedUnavailable(browser, fixture.url, width);
        await failedSettlement(browser, fixture.url, width, 409);
        await failedSettlement(browser, fixture.url, width, 422);
    }
    await normalSuccess(browser, fixture.url);
    console.log('PHASE2C_OVERALL=PASS');
} finally {
    await browser.close();
    await fixture.close();
}
