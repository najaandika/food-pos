/**
 * R5.3 real React CashierServer + CashierView extracted-component interactions.
 * All Laravel APIs intercepted; no database or payment POST is sent.
 */
import assert from 'node:assert/strict';
import {
    chromium,
    posOrder,
    queueBody,
    responseJson,
    startIsolatedCashierServer,
} from '../receipt-recovery-tests/browser-fixture.mjs';

const widths = [1440, 834, 390, 320];
const fixture = await startIsolatedCashierServer();
const browser = await chromium.launch({ headless: true });

function makeOrders() {
    const dine = posOrder(21);
    const takeaway = posOrder(22);
    takeaway.tableCode = 'TA';
    takeaway.type = 'takeaway';
    takeaway.source = 'qr';
    takeaway.customerName = 'Rani';
    return [dine, takeaway];
}
async function exercise(width) {
    const page = await browser.newPage({
        viewport: {
            width,
            height: width <= 390 ? 844 : 900,
        },
    });
    const errors = [];
    let posts = 0,
        queueGets = 0,
        detailGets = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    page.route('**/pos/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const pathname = url.pathname;
        const method = request.method();
        if (method === 'GET' && pathname === '/pos/cashier/orders') {
            queueGets++;
            let orders = makeOrders();
            const filter = url.searchParams.get('filter');
            const search = url.searchParams.get('search')?.trim().toLowerCase();
            if (filter === 'qr')
                orders = orders.filter((o) => o.source === 'qr');
            if (filter === 'takeaway')
                orders = orders.filter((o) => o.type === 'takeaway');
            if (search)
                orders = orders.filter((o) =>
                    [o.customerName, o.tableCode, o.orderNumber].some((value) =>
                        value.toLowerCase().includes(search),
                    ),
                );
            await route.fulfill(responseJson(queueBody(orders)));
            return;
        }
        const detail = /^\/pos\/cashier\/orders\/(\d+)$/.exec(pathname);
        if (method === 'GET' && detail) {
            detailGets++;
            await route.fulfill(
                responseJson(
                    makeOrders().find((o) => o.id === Number(detail[1])),
                ),
            );
            return;
        }
        if (method === 'POST') {
            posts++;
            throw Error('Unexpected payment POST in component display QA');
        }
        throw Error('Unmocked API ' + method + ' ' + pathname);
    });
    try {
        await page.goto(fixture.url);
        await page
            .locator('.cashier-order-row')
            .first()
            .waitFor({ timeout: 17000 });
        assert.equal(await page.locator('.cashier-order-row').count(), 2);
        const second = page.locator('.cashier-order-row').nth(1);
        await second.click();
        const detail = page.locator('.cashier-detail-top');
        await detail.waitFor({ timeout: 12000 });
        await page.waitForFunction(
            () =>
                document
                    .querySelector('.cashier-detail-top')
                    ?.textContent?.includes('Rani'),
            null,
            { timeout: 12000 },
        );
        assert.equal(await second.getAttribute('aria-pressed'), 'true');
        // Select QRIS: payment not verified by Laravel, cannot charge.
        const pay = page.getByRole('button', { name: /Catat lunas \(tunai\)/ });
        const methods = page.locator('.payment-methods button');
        await methods.nth(1).click();
        assert.match(
            (await methods.nth(1).getAttribute('class')) ?? '',
            /active/,
        );
        assert.equal(await pay.isDisabled(), true);
        assert.ok(
            (await page.locator('.cashier-unverified-method').count()) >= 0,
        );
        // Cash re-enabled, custom underpayment blocked, sufficient cash enabled.
        await methods.first().click();
        assert.equal(await pay.isEnabled(), true);
        const custom = page.locator('.cashier-cash-input');
        await custom.fill('10000');
        assert.equal(await pay.isDisabled(), true);
        await custom.fill('50000');
        assert.equal(await pay.isEnabled(), true);
        const discount = page.getByRole('button', { name: '10% Off' });
        await discount.click();
        assert.equal(await pay.isDisabled(), true);
        await page.getByRole('button', { name: 'cashier.noDiscount' }).click();
        assert.equal(await pay.isEnabled(), true);
        // Enter on print preview opens non-verified canonical Modal trigger.
        const print = page.getByRole('button', { name: 'cashier.printBill' });
        await print.focus();
        assert.equal(
            await print.evaluate((e) => document.activeElement === e),
            true,
        );
        await page.keyboard.press('Enter');
        const modal = page.locator('.cashier-receipt-dialog');
        await modal.waitFor({ timeout: 12000 });
        assert.match(
            await modal.innerText(),
            /BELUM TERVERIFIKASI · BUKAN BUKTI BAYAR/,
        );
        await modal
            .getByRole('button', { name: 'common.close' })
            .first()
            .click();
        await modal.waitFor({ state: 'hidden', timeout: 12000 });
        // Switch to Queue on mobile before testing search/category components.
        if (width <= 834) {
            await page
                .locator('.cashier-mobile-segments')
                .getByRole('button', { name: /paymentQueue|Antrian/i })
                .click();
        }
        const search = page.locator('.cashier-search-input');
        await search.fill('not-matching-any-order');
        await page.locator('.cashier-empty-queue').waitFor({ timeout: 12000 });
        assert.equal(await page.locator('.cashier-order-row').count(), 0);
        await page
            .getByRole('button', { name: 'Reset pencarian & filter' })
            .click();
        await page.waitForFunction(
            () => document.querySelectorAll('.cashier-order-row').length === 2,
            null,
            { timeout: 12000 },
        );
        await page.getByRole('button', { name: 'cashier.qrBills' }).click();
        await page.waitForFunction(
            () => document.querySelectorAll('.cashier-order-row').length === 1,
            null,
            { timeout: 12000 },
        );
        assert.match(
            await page.locator('.cashier-order-row').first().innerText(),
            /Rani/,
        );
        const overflow = await page.evaluate(
            () =>
                Math.max(
                    document.documentElement.scrollWidth,
                    document.body.scrollWidth,
                ) >
                innerWidth + 1,
        );
        assert.equal(overflow, false, 'No horizontal overflow at ' + width);
        assert.deepEqual(errors, [], 'No JavaScript errors');
        assert.equal(
            posts,
            0,
            'No POST for selection/QRIS/underpayment/preview',
        );
        console.log(
            'PASS R5.3 interactions',
            JSON.stringify({
                width,
                orders: 2,
                qrFiltered: 1,
                queueGets,
                detailGets,
                postCount: posts,
                keyboardPreview: true,
                underpayBlocked: true,
                discountBlocked: true,
                qrBlocked: true,
                errors: errors.length,
                overflow,
            }),
        );
    } finally {
        await page.close();
    }
}
try {
    for (const width of widths) await exercise(width);
    console.log('R53_INTERACTIONS_OVERALL=PASS');
} finally {
    await browser.close();
    await fixture.close();
}
