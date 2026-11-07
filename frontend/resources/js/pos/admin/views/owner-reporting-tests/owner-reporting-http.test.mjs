import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let vite;
let overview;
let history;
let report;

const originalFetch = globalThis.fetch;

const statusCounts = {
    pending: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    waiting_payment: 0,
    paid: 0,
    cancelled: 0,
};

const overviewPayload = {
    source: 'database',
    timezone: 'Asia/Jakarta',
    date: '2026-11-07',
    generatedAt: '2026-11-07T10:00:00+07:00',
    dashboard: {
        revenueToday: 0,
        activeOrders: 0,
        qrOrders: 0,
        needAction: 0,
    },
    statusCounts,
    totalOrders: 0,
    ordersToday: 0,
    recentLimit: 10,
    recentOrders: [],
    priorityOrders: [],
    activeTableCount: 0,
    activeTableOrders: [],
    topDishes: [],
};

function historyPayload() {
    return {
        source: 'database',
        timezone: 'Asia/Jakarta',
        from: '2026-10-09',
        to: '2026-11-07',
        days: 30,
        totals: { revenue: 0, payments: 0, orders: 0 },
        dailyRevenue: Array.from({ length: 30 }, (_, index) => ({
            date: `2026-10-${String(index + 1).padStart(2, '0')}`,
            amount: 0,
            payments: 0,
        })),
        orderActivity: Array.from({ length: 84 }, (_, index) => ({
            weekday: index % 7,
            hour: index % 24,
            count: 0,
        })),
        maxActivity: 0,
    };
}

before(async () => {
    vite = await createServer({
        root: process.cwd(),
        configFile: false,
        resolve: { alias: { '@': path.resolve('resources/js') } },
        server: { middlewareMode: true },
    });
    [overview, history, report] = await Promise.all([
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/OwnerLiveDashboard.tsx',
        ),
        vite.ssrLoadModule(
            '/resources/js/pos/admin/views/OwnerHistoryPanels.tsx',
        ),
        vite.ssrLoadModule('/resources/js/pos/admin/views/ReportView.tsx'),
    ]);
});

after(async () => {
    globalThis.fetch = originalFetch;
    await vite?.close();
});

void test('overview GET uses shared transport and accepts its runtime contract', async () => {
    globalThis.fetch = async (url, init) => {
        assert.equal(url, '/dashboard/overview');
        assert.equal(init.method, 'GET');
        assert.equal(init.credentials, 'same-origin');
        assert.equal(init.cache, 'no-store');
        assert.equal(init.headers.Accept, 'application/json');
        assert.equal(init.headers['X-Requested-With'], 'XMLHttpRequest');
        return Response.json(overviewPayload);
    };

    assert.deepEqual(await overview.requestOwnerOverview(), overviewPayload);
});

void test('overview keeps API failures and caller aborts distinguishable', async () => {
    globalThis.fetch = async () =>
        Response.json({ message: 'Temporarily unavailable' }, { status: 503 });
    await assert.rejects(
        overview.requestOwnerOverview(),
        (error) => error.status === 503,
    );

    const controller = new AbortController();
    globalThis.fetch = async (_url, init) => {
        controller.abort();
        init.signal.throwIfAborted();
    };
    await assert.rejects(
        overview.requestOwnerOverview(controller.signal),
        (error) => error.name === 'AbortError',
    );
});

void test('overview rejects a successful response with an invalid DTO', async () => {
    globalThis.fetch = async () =>
        Response.json({ ...overviewPayload, topDishes: null });
    await assert.rejects(
        overview.requestOwnerOverview(),
        /Invalid overview response/,
    );
});

void test('history preserves the 30-day and 84-cell runtime validation', async () => {
    const valid = historyPayload();
    globalThis.fetch = async (url) => {
        assert.equal(url, '/dashboard/history');
        return Response.json(valid);
    };
    assert.deepEqual(await history.requestOwnerHistory(), valid);

    for (const invalid of [
        { ...valid, dailyRevenue: valid.dailyRevenue.slice(1) },
        { ...valid, orderActivity: valid.orderActivity.slice(1) },
    ]) {
        globalThis.fetch = async () => Response.json(invalid);
        await assert.rejects(
            history.requestOwnerHistory(),
            /Invalid history response/,
        );
    }
});

void test('report maps 422 range fields separately from other filters', async () => {
    globalThis.fetch = async () =>
        Response.json(
            { errors: { from: ['The from field is invalid.'] } },
            { status: 422 },
        );
    await assert.rejects(report.requestOwnerReport('page=1'), /invalid_range/);

    globalThis.fetch = async () =>
        Response.json(
            { errors: { status: ['The status is invalid.'] } },
            { status: 422 },
        );
    await assert.rejects(report.requestOwnerReport('page=1'), /invalid_filter/);
});

void test('report keeps isReportPayload validation after shared transport', async () => {
    globalThis.fetch = async (url) => {
        assert.equal(url, '/dashboard/report?page=1');
        return Response.json({ source: 'database' });
    };
    await assert.rejects(
        report.requestOwnerReport('page=1'),
        /invalid_response/,
    );
});
