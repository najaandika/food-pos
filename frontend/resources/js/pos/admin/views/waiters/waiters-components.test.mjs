import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;
let AttentionRequests;
let ServiceQueue;
let TableGrid;
let LocaleProvider;
let model;

const makeOrder = (id, table, rawStatus) => ({
    id,
    table,
    tableCode: table,
    tone: 'teal',
    name: `Guest ${id}`,
    orderNumber: `POS-${id}`,
    meta: `Order ${id}`,
    status: rawStatus,
    statusTone: 'progress',
    time: `10:0${id}`,
    total: 'Rp 25.000',
    items: [['Nasi', '1', 'Rp 25.000']],
    rawStatus,
    type: 'dine_in',
});

const orders = [
    makeOrder(1, 'A1', 'ready'),
    makeOrder(2, 'A2', 'pending'),
    makeOrder(3, 'B1', 'waiting_payment'),
    makeOrder(4, 'B2', 'accepted'),
    makeOrder(5, 'C1', 'preparing'),
    makeOrder(6, 'C2', 'served'),
];

const tables = [
    {
        id: 1,
        code: 'A1',
        name: 'Window Table',
        area: 'Main Hall',
        status: 'Ready',
        rawStatus: 'ready',
        seats: 4,
        scans: 1,
        lastOrder: 'POS-1',
        tone: 'ready',
        currentOrderId: 1,
    },
    {
        id: 2,
        code: 'A2',
        name: 'Patio Table',
        area: 'Patio',
        status: 'Available',
        rawStatus: 'available',
        seats: 2,
        scans: 0,
        lastOrder: 'No active order',
        tone: 'available',
        currentOrderId: null,
    },
];

function render(Component, props) {
    return renderToStaticMarkup(
        React.createElement(
            LocaleProvider,
            null,
            React.createElement(Component, props),
        ),
    );
}

before(async () => {
    vite = await createServer({
        root: process.cwd(),
        configFile: false,
        resolve: { alias: { '@': path.resolve('resources/js') } },
        server: { middlewareMode: true },
    });
    const [attention, queue, grid, locale, waiterModel] = await Promise.all([
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/waiters/AttentionRequests.tsx',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/waiters/ServiceQueue.tsx',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/waiters/TableGrid.tsx',
        ),
        vite.ssrLoadModule('/resources/js/pos/admin/i18n-context.tsx'),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/waiters/waiter-model.ts',
        ),
    ]);
    AttentionRequests = attention.AttentionRequests;
    ServiceQueue = queue.ServiceQueue;
    TableGrid = grid.TableGrid;
    LocaleProvider = locale.LocaleProvider;
    model = waiterModel;
});

after(async () => {
    await vite?.close();
});

void test('waiter model preserves transitions, queue filters, and table linkage', () => {
    assert.deepEqual(model.nextWaiterAction.ready, {
        label: 'serve',
        status: 'served',
    });
    assert.equal(
        model.getServiceOrders([...orders, makeOrder(7, 'D1', 'paid')]).length,
        6,
    );
    assert.deepEqual(
        model.filterQueueOrders(orders, 'billing').map((order) => order.id),
        [3, 6],
    );
    assert.equal(model.filterQueueOrders(orders, 'inProgress').length, 3);
    assert.equal(model.activeOrderFor(tables[0], orders)?.id, 1);
    assert.equal(model.activeOrderFor(tables[1], orders), undefined);
});

void test('attention section preserves collapsed rows and accessible expansion state', () => {
    const attentions = [
        { key: '1', kind: 'call', code: 'A1', title: 'Call', time: 'Now' },
        { key: '2', kind: 'ready', code: 'A2', title: 'Ready', time: '10:00' },
        { key: '3', kind: 'bill', code: 'B1', title: 'Bill', time: '10:01' },
        { key: '4', kind: 'call', code: 'B2', title: 'Call', time: 'Now' },
    ];
    const html = render(AttentionRequests, {
        attentions,
        isSaving: false,
        onAttention: () => {},
    });
    assert.equal(
        (html.match(/waiters-attention-row/g) ?? []).length,
        attentions.length,
    );
    assert.match(html, /is-mobile-collapsed/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /Show all requests/);
});

void test('queue and table components preserve initial limits and labels', () => {
    const queue = render(ServiceQueue, {
        orders,
        isSaving: false,
        canUpdateStatus: true,
        onAdvance: () => {},
        onOpenOrder: () => {},
    });
    const grid = render(TableGrid, {
        tables,
        orders,
        onOpenTable: () => {},
    });

    assert.equal(
        (queue.match(/class="waiters-queue-card(?: |")/g) ?? []).length,
        5,
    );
    assert.match(queue, /Show 1 more orders/);
    assert.match(queue, /Filter service queue/);
    assert.equal((grid.match(/waiters-table-tile"/g) ?? []).length, 2);
    assert.match(grid, /A1, Window Table, Ready/);
    assert.match(grid, /Search tables or areas/);
});
