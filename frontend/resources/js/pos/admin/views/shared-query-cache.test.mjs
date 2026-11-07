import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import path from 'node:path';
import { createServer } from 'vite';

const previousWindow = globalThis.window;
let vite;
let cache;
let userSeed = 100;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function expired(error) {
    return error instanceof Error && error.name === 'AbortError';
}

before(async () => {
    vite = await createServer({
        root: process.cwd(),
        configFile: false,
        resolve: { alias: { '@': path.resolve('resources/js') } },
        server: { middlewareMode: true },
    });
    cache = await vite.ssrLoadModule(
        '/resources/js/pos/admin/views/shared-query-cache.ts',
    );
});

beforeEach(() => {
    globalThis.window = {};
    cache.setSharedQuerySession(userSeed++);
    cache.clearSharedQueries();
});

after(async () => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    await vite?.close();
});

void test('identical concurrent GET uses a single pending fetch and warm TTL', async () => {
    let calls = 0;
    const task = deferred();
    const fetcher = () => {
        calls++;
        return task.promise;
    };
    const first = cache.loadSharedQuery('orders:all', fetcher);
    const second = cache.loadSharedQuery('orders:all', fetcher);
    assert.strictEqual(first, second);
    await Promise.resolve();
    assert.equal(calls, 1);
    const value = { count: 9 };
    task.resolve(value);
    assert.strictEqual(await first, value);
    assert.strictEqual(await second, value);
    assert.strictEqual(cache.peekSharedQuery('orders:all'), value);
    assert.strictEqual(
        await cache.loadSharedQuery('orders:all', fetcher),
        value,
    );
    assert.equal(calls, 1, 'valid TTL must not issue another GET');
});

void test('invalidate pending GET refetches and discards pre-mutation snapshot', async () => {
    const requests = [];
    const fetcher = () => {
        const request = deferred();
        requests.push(request);
        return request.promise;
    };
    const pending = cache.loadSharedQuery('orders:all', fetcher);
    await Promise.resolve();
    assert.equal(requests.length, 1);
    cache.invalidateSharedQueries('orders:');
    assert.equal(cache.peekSharedQuery('orders:all'), undefined);
    requests[0].resolve({ status: 'preparing' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests.length, 2);
    assert.equal(cache.peekSharedQuery('orders:all'), undefined);
    requests[1].resolve({ status: 'ready' });
    assert.deepEqual(await pending, { status: 'ready' });
    assert.deepEqual(cache.peekSharedQuery('orders:all'), { status: 'ready' });
});

void test('A late success cannot be cached or surfaced after switching to B', async () => {
    cache.setSharedQuerySession(501);
    const requestA = deferred();
    const pendingA = cache.loadSharedQuery(
        'service:tables',
        () => requestA.promise,
    );
    const assertedA = assert.rejects(pendingA, expired);
    await Promise.resolve();
    cache.setSharedQuerySession(502);
    const valueB = { table: 'B' };
    assert.strictEqual(
        await cache.loadSharedQuery('service:tables', async () => valueB),
        valueB,
    );
    requestA.resolve({ table: 'A' });
    await assertedA;
    assert.strictEqual(cache.peekSharedQuery('service:tables'), valueB);
});

for (const status of [401, 419]) {
    void test(`late session A HTTP ${status} cannot clear session B snapshot`, async () => {
        cache.setSharedQuerySession(610);
        const requestA = deferred();
        const pendingA = cache.loadSharedQuery(
            'orders:all',
            () => requestA.promise,
        );
        const assertedA = assert.rejects(pendingA, expired);
        await Promise.resolve();
        cache.setSharedQuerySession(611);
        const valueB = { order: 'B' };
        await cache.loadSharedQuery('orders:all', async () => valueB);
        requestA.reject(
            Object.assign(new Error('expired session A'), { status }),
        );
        await assertedA;
        assert.strictEqual(cache.peekSharedQuery('orders:all'), valueB);
    });
}

void test('current session 401 clears its own cache', async () => {
    await cache.loadSharedQuery('service:catalog', async () => ['active']);
    await assert.rejects(
        cache.loadSharedQuery('cashier:queue', async () => {
            throw Object.assign(new Error('expired'), { status: 401 });
        }),
        (error) => error.status === 401,
    );
    assert.equal(cache.peekSharedQuery('service:catalog'), undefined);
});

void test('logout/clear rejects late results even if same user ID logs back in', async () => {
    cache.setSharedQuerySession(700);
    const request = deferred();
    const pending = cache.loadSharedQuery(
        'service:catalog',
        () => request.promise,
    );
    const asserted = assert.rejects(pending, expired);
    await Promise.resolve();
    cache.clearSharedQueries();
    cache.setSharedQuerySession(700);
    const newer = ['new-session'];
    await cache.loadSharedQuery('service:catalog', async () => newer);
    request.resolve(['old-session']);
    await asserted;
    assert.strictEqual(cache.peekSharedQuery('service:catalog'), newer);
});

void test('force refresh during pending joins the existing request deterministically', async () => {
    const request = deferred();
    let calls = 0;
    const fetcher = () => {
        calls++;
        return request.promise;
    };
    const first = cache.loadSharedQuery('cashier:queue:all', fetcher);
    const forced = cache.loadSharedQuery('cashier:queue:all', fetcher, {
        force: true,
    });
    assert.strictEqual(first, forced);
    await Promise.resolve();
    assert.equal(calls, 1);
    request.resolve({ orders: [1] });
    await Promise.all([first, forced]);
    assert.equal(calls, 1);
});

void test('SSR bypasses process-global private cache without browser window', async () => {
    delete globalThis.window;
    let calls = 0;
    const fetcher = async () => {
        calls++;
        return calls;
    };
    assert.equal(await cache.loadSharedQuery('service:catalog', fetcher), 1);
    assert.equal(await cache.loadSharedQuery('service:catalog', fetcher), 2);
    assert.equal(cache.peekSharedQuery('service:catalog'), undefined);
    globalThis.window = {};
});
