import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;
let DashboardFooter;
let OrderWorkflowCard;
let LocaleProvider;
let status;

const order = {
    id: 1,
    table: 'A1',
    tableCode: 'A1',
    tone: 'teal',
    name: 'Guest',
    orderNumber: 'POS-1',
    meta: 'Order',
    status: 'New',
    statusTone: 'progress',
    time: '10:00',
    total: 'Rp 25.000',
    items: [
        ['Nasi', '2', 'Rp 20.000'],
        ['Teh', 'not-a-number', 'Rp 5.000'],
    ],
    type: 'dine_in',
};

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
    const [footerModule, workflowModule, localeModule, statusModule] =
        await Promise.all([
            vite.ssrLoadModule(
                '/resources/js/pos/admin/views/dashboard/DashboardFooter.tsx',
            ),
            vite.ssrLoadModule(
                '/resources/js/pos/admin/views/dashboard/OrderWorkflowCard.tsx',
            ),
            vite.ssrLoadModule('/resources/js/pos/admin/i18n-context.tsx'),
            vite.ssrLoadModule(
                '/resources/js/pos/admin/views/dashboard/order-status.ts',
            ),
        ]);
    DashboardFooter = footerModule.DashboardFooter;
    OrderWorkflowCard = workflowModule.OrderWorkflowCard;
    LocaleProvider = localeModule.LocaleProvider;
    status = statusModule;
});

after(async () => {
    await vite?.close();
});

void test('status helpers preserve current, legacy, quantity, and filter behavior', () => {
    assert.equal(status.resolveOrderStatus(order), 'pending');
    assert.equal(
        status.resolveOrderStatus({ ...order, status: 'In Progress' }),
        'preparing',
    );
    assert.equal(
        status.resolveOrderStatus({
            ...order,
            status: 'unknown',
            rawStatus: 'ready',
        }),
        'ready',
    );
    assert.equal(status.orderQuantity(order), 2);
    assert.equal(status.tableLabel(order, false), 'A1');
    assert.equal(
        status.tableLabel({ ...order, type: 'takeaway' }, true),
        'Bawa pulang',
    );

    const counts = status.statusOrder.map((orderStatus, index) => ({
        status: orderStatus,
        count: index + 1,
    }));
    assert.equal(status.filterOrderStatusCounts(counts, 'all').length, 8);
    assert.deepEqual(
        status
            .filterOrderStatusCounts(counts, 'finished')
            .map(({ status: orderStatus }) => orderStatus),
        ['paid', 'cancelled'],
    );
    assert.equal(status.filterOrderStatusCounts(counts, 'active').length, 6);
});

void test('workflow card preserves status bars and accessible labels', () => {
    const statusCounts = status.statusOrder.map((orderStatus, index) => ({
        status: orderStatus,
        count: index + 1,
    }));
    const html = render(OrderWorkflowCard, {
        hasSnapshot: true,
        isLive: true,
        statusCounts,
    });
    assert.equal((html.match(/class="od-bar-group"/g) ?? []).length, 8);
    assert.match(html, /Order workflow/);
    assert.match(html, /Inspect Pending: 1 order/);
    assert.match(html, /aria-pressed="false"/);
    assert.match(html, /all recorded/);
});

void test('footer preserves owner, cashier, and waiter role paths', () => {
    const common = {
        hasSnapshot: true,
        activeTableCount: 1,
        tableOrders: [{ ...order, rawStatus: 'ready' }],
        onChangeView: () => {},
    };
    const owner = render(DashboardFooter, { ...common, role: 'owner' });
    const cashier = render(DashboardFooter, { ...common, role: 'kasir' });
    const waiters = render(DashboardFooter, { ...common, role: 'waiters' });

    assert.equal((owner.match(/class="od-shortcut"/g) ?? []).length, 4);
    assert.equal((cashier.match(/class="od-shortcut"/g) ?? []).length, 3);
    assert.equal((waiters.match(/class="od-shortcut"/g) ?? []).length, 2);
    assert.match(owner, /Generate QR/);
    assert.doesNotMatch(cashier, /Generate QR/);
    assert.match(cashier, /Payment Queue/);
    assert.match(waiters, /Waiters Station/);
    assert.match(owner, /Ready to serve/);
});
