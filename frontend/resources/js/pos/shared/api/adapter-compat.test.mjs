import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { createServer } from 'vite';

let vite;
let service;
let tables;
let menu;
let orders;
let cashier;

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;

const category = { id: 1, name: 'Makanan', sort_order: 0, is_active: true };
const catalogItem = {
    id: 7,
    categoryId: 1,
    category: 'Makanan',
    name: 'Nasi',
    description: 'Hangat',
    price: 25000,
    imageUrl: null,
    badge: null,
    isBestSeller: false,
};
const table = {
    id: 4,
    code: 'T04',
    name: 'Meja 04',
    area: 'Main Hall',
    seats: 4,
    status: 'available',
    current_order_id: null,
};
const menuItem = {
    id: 7,
    category_id: 1,
    category: { id: 1, name: 'Makanan' },
    name: 'Nasi',
    description: 'Hangat',
    price: '25000.00',
    old_price: null,
    image_url: null,
    is_available: true,
    is_best_seller: false,
    badge: null,
};
const savedOrder = {
    id: 21,
    orderNumber: 'POS-21',
    tableCode: 'T04',
    customerName: 'Nina',
    status: 'ready',
    type: 'dine_in',
    source: 'manual',
    guests: 2,
    subtotal: 25000,
    tax: 0,
    serviceCharge: 0,
    total: 25000,
    items: [
        {
            id: 99,
            menuItemId: 7,
            name: 'Nasi',
            quantity: 1,
            unitPrice: 25000,
            lineTotal: 25000,
        },
    ],
    createdAt: '2026-11-06T12:00:00Z',
    updatedAt: '2026-11-06T12:00:00Z',
};

before(async () => {
    vite = await createServer({
        root: process.cwd(),
        configFile: false,
        resolve: { alias: { '@': path.resolve('resources/js') } },
        server: { middlewareMode: true },
    });
    [service, tables, menu, orders, cashier] = await Promise.all([
        vite.ssrLoadModule(
            '/resources/js/pos/admin/shared/data/service-workspace.ts',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/owner-tables/server-tables.ts',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/owner-menu/server-menu.ts',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/orders/server-orders.ts',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/cashier/cashier-api.ts',
        ),
    ]);
});

void test('Orders keeps server pagination, DTO, and 409 error wording', async () => {
    globalThis.fetch = async (url) => {
        assert.match(url, /^\/pos\/orders\?/);
        return Response.json({ data: [savedOrder], last_page: 1 });
    };
    const result = await orders.getSavedOrders(true);
    assert.equal(result[0].orderNumber, 'POS-21');
    assert.equal(result[0].name, 'Nina');

    globalThis.fetch = async (_url, init) => {
        assert.equal(init.method, 'PATCH');
        assert.equal(init.headers['X-XSRF-TOKEN'], 'test+token');
        assert.deepEqual(JSON.parse(init.body), { status: 'preparing' });
        return Response.json(
            { message: 'Status sudah diganti.' },
            { status: 409 },
        );
    };
    await assert.rejects(
        orders.advanceSavedOrder(21, 'preparing'),
        (error) =>
            error instanceof orders.OrdersApiError &&
            error.status === 409 &&
            error.message === 'Status sudah diganti.',
    );
});

void test('Cashier queue and detail preserve payable order contract', async () => {
    globalThis.fetch = async (url) => {
        const target =
            typeof url === 'string'
                ? url
                : url instanceof URL
                  ? url.href
                  : url.url;
        if (target.startsWith('/pos/cashier/orders?'))
            return Response.json({
                data: [savedOrder],
                current_page: 1,
                last_page: 1,
                total: 1,
                stats: {
                    unpaidCount: 1,
                    waitingCount: 0,
                    paidCount: 0,
                    paidTotal: '0.00',
                    cashPaidCount: 0,
                    cashPaidTotal: '0.00',
                },
            });
        if (url === '/pos/cashier/orders/21') return Response.json(savedOrder);
        throw new Error('Unexpected cashier request.');
    };
    const queue = await cashier.cashierQueue('all', '', 1);
    assert.equal(queue.orders.length, 1);
    assert.equal(queue.orders[0].name, 'Nina');
    assert.equal(queue.stats.unpaidCount, 1);
    const detail = await cashier.cashierDetail(21);
    assert.equal(detail.orderNumber, 'POS-21');
});

void test('Cashier payment retains idempotency payload, no retries, and 409 recovery', async () => {
    let attempts = 0;
    globalThis.fetch = async (url, init) => {
        attempts++;
        assert.equal(url, '/pos/orders/21/cash-payment');
        assert.equal(init.method, 'POST');
        assert.equal(init.headers['X-XSRF-TOKEN'], 'test+token');
        assert.deepEqual(JSON.parse(init.body), {
            method: 'cash',
            received_amount: '30000.00',
            expected_total: '25000.00',
            idempotency_key: 'idem-test-21',
        });
        return Response.json({
            status: 'paid',
            payment: { status: 'paid', method: 'cash' },
            receiptUrl: '/pos/cashier/orders/21/receipt',
            idempotent: false,
        });
    };
    assert.deepEqual(
        await cashier.cashierPayCash(
            21,
            '30000.00',
            '25000.00',
            'idem-test-21',
        ),
        {
            receiptUrl: '/pos/cashier/orders/21/receipt',
            idempotent: false,
        },
    );
    assert.equal(attempts, 1);

    globalThis.fetch = async () => {
        attempts++;
        return Response.json(
            { message: 'Tagihan telah berubah.' },
            { status: 409 },
        );
    };
    await assert.rejects(
        cashier.cashierPayCash(21, '30000.00', '25000.00', 'idem-test-21'),
        (error) =>
            error instanceof cashier.CashierApiError &&
            error.status === 409 &&
            error.message === 'Tagihan telah berubah.',
    );
    assert.equal(attempts, 2);
});

beforeEach(() => {
    globalThis.document = { cookie: 'XSRF-TOKEN=test%2Btoken' };
});

after(async () => {
    globalThis.fetch = originalFetch;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    await vite?.close();
});

void test('Service Workspace preserves catalog and table DTO mapping', async () => {
    const requested = [];
    globalThis.fetch = async (url, init) => {
        requested.push({ url, init });
        if (url === '/pos/service-catalog')
            return Response.json({ data: [catalogItem] });
        if (url === '/pos/service-tables')
            return Response.json({ data: [table] });
        throw new Error(
            'Unexpected GET: ' +
                (typeof url === 'string'
                    ? url
                    : url instanceof URL
                      ? url.href
                      : url.url),
        );
    };
    const dishes = await service.getServiceCatalog();
    const restaurantTables = await service.getServiceTables();
    assert.equal(dishes[0].name, 'Nasi');
    assert.equal(dishes[0].rawPrice, 25000);
    assert.equal(restaurantTables[0].code, 'T04');
    assert.equal(restaurantTables[0].currentOrderId, null);
    assert.equal(requested.length, 2);
    assert.equal(requested[0].init.credentials, 'same-origin');
});

void test('Service manual POST keeps payload and uncertain-write recovery message', async () => {
    let calls = 0;
    globalThis.fetch = async (_url, options) => {
        calls++;
        assert.equal(options.headers['X-XSRF-TOKEN'], 'test+token');
        assert.equal(options.method, 'POST');
        assert.equal(JSON.parse(options.body).customer_name, 'Nina');
        throw new TypeError('Lost response');
    };
    await assert.rejects(
        service.postManualOrder({
            customerName: ' Nina ',
            type: 'takeaway',
            guests: 1,
            items: [{ menuItemId: 7, quantity: 1 }],
        }),
        (error) =>
            error instanceof service.ServiceApiError &&
            error.status === 0 &&
            error.message.includes('Pesanan mungkin sudah tersimpan'),
    );
    assert.equal(calls, 1);
});

void test('Owner Tables preserves paginated DTO and controlled errors', async () => {
    globalThis.fetch = async (url) => {
        assert.match(url, /^\/pos\/tables\?/);
        return Response.json({
            data: [{ ...table, scans_today: 2 }],
            current_page: 1,
            last_page: 1,
        });
    };
    assert.equal((await tables.getSavedTables())[0].scans, 2);

    globalThis.fetch = async () =>
        Response.json({ message: 'Sensitive exception' }, { status: 403 });
    await assert.rejects(
        tables.getSavedTables(true),
        (error) =>
            error instanceof tables.TableApiError &&
            error.status === 403 &&
            error.message ===
                'Akses QR meja hanya tersedia untuk akun Owner yang aktif.',
    );
});

void test('Owner Tables DELETE handles 204 and sends Laravel CSRF', async () => {
    globalThis.fetch = async (url, init) => {
        assert.equal(url, '/pos/tables/4');
        assert.equal(init.method, 'DELETE');
        assert.equal(init.headers['X-XSRF-TOKEN'], 'test+token');
        return new Response(null, { status: 204 });
    };
    assert.equal(await tables.deleteSavedTable(4), undefined);
});

void test('Owner Menu preserves category/item DTO mapping and input messages', async () => {
    globalThis.fetch = async (url) => {
        const target =
            typeof url === 'string'
                ? url
                : url instanceof URL
                  ? url.href
                  : url.url;
        if (target.startsWith('/pos/menu-items?'))
            return Response.json({ data: [menuItem], last_page: 1 });
        if (target.startsWith('/pos/categories?'))
            return Response.json({ data: [category], last_page: 1 });
        throw new Error('Unexpected URL: ' + target);
    };
    const result = await menu.getSavedMenu();
    assert.equal(result.dishes[0].rawPrice, 25000);
    assert.equal(result.categories[0].name, 'Makanan');

    const draft = {
        name: 'Nasi',
        category: 'Makanan',
        description: 'Hangat',
        price: 25000,
        oldPrice: null,
        imageUrl: '',
        isAvailable: true,
        isBestSeller: false,
        badge: null,
    };
    globalThis.fetch = async () =>
        Response.json(
            { message: 'Input invalid', errors: { price: ['Harga ditolak.'] } },
            { status: 422 },
        );
    await assert.rejects(
        menu.saveSavedMenu(draft, [category]),
        (error) =>
            error instanceof menu.MenuApiError &&
            error.status === 422 &&
            error.message === 'Harga ditolak.',
    );

    globalThis.fetch = async () =>
        Response.json({ message: 'Menu sedang dipakai.' }, { status: 409 });
    await assert.rejects(
        menu.saveSavedMenu(draft, [category]),
        (error) =>
            error instanceof menu.MenuApiError &&
            error.status === 409 &&
            error.message === 'Menu sedang dipakai.',
    );
});
