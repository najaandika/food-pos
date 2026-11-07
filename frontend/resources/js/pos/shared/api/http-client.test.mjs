import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { httpRequest, HttpRequestError } from './http-client.ts';

const savedFetch = globalThis.fetch;
const savedDocument = globalThis.document;

beforeEach(() => {
    globalThis.document = { cookie: 'XSRF-TOKEN=a%2Bb%3D%3D; another=x' };
});

void test('cross-origin destinations never receive the XSRF session header', async () => {
    let requests = 0;
    globalThis.fetch = async () => {
        requests++;
        return Response.json({ ok: true });
    };
    for (const path of [
        'https://external.example/orders',
        '//external.example/orders',
        'pos/orders',
    ]) {
        await assert.rejects(
            httpRequest(path, { method: 'POST', payload: { amount: '25000' } }),
            (error) => error instanceof HttpRequestError && error.status === 0,
        );
    }
    assert.equal(requests, 0);
});

after(() => {
    globalThis.fetch = savedFetch;
    if (savedDocument === undefined) {
        delete globalThis.document;
    } else {
        globalThis.document = savedDocument;
    }
});

void test('GET uses same-origin Laravel headers without a CSRF mutation header', async () => {
    let actual;
    globalThis.fetch = async (...args) => {
        actual = args;
        return Response.json({ data: [{ id: 1 }] });
    };

    assert.deepEqual(await httpRequest('/pos/service-catalog'), {
        data: [{ id: 1 }],
    });
    assert.equal(actual[0], '/pos/service-catalog');
    assert.equal(actual[1].method, 'GET');
    assert.equal(actual[1].credentials, 'same-origin');
    assert.equal(actual[1].cache, 'no-store');
    assert.equal(actual[1].headers.Accept, 'application/json');
    assert.equal(actual[1].headers['X-Requested-With'], 'XMLHttpRequest');
    assert.equal(actual[1].headers['X-XSRF-TOKEN'], undefined);
});

void test('POST preserves JSON payload and decoded CSRF cookie', async () => {
    let actual;
    globalThis.fetch = async (...args) => {
        actual = args;
        return Response.json({ id: 20, orderNumber: 'POS-20' });
    };

    await httpRequest('/pos/manual-orders', {
        method: 'POST',
        payload: { customer_name: 'Nina', items: [{ menu_item_id: 3 }] },
    });
    assert.equal(actual[1].headers['X-XSRF-TOKEN'], 'a+b==');
    assert.equal(actual[1].headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(actual[1].body), {
        customer_name: 'Nina',
        items: [{ menu_item_id: 3 }],
    });
});

void test('Laravel validation errors take priority over fallback error messages', async () => {
    globalThis.fetch = async () =>
        Response.json(
            {
                message: 'Unprocessable Entity',
                errors: { table_code: ['Kode meja tidak valid.'] },
            },
            { status: 422 },
        );
    await assert.rejects(
        httpRequest('/pos/manual-orders', {
            method: 'POST',
            messages: { status: { 422: 'Periksa input.' } },
        }),
        (error) =>
            error instanceof HttpRequestError &&
            error.status === 422 &&
            error.message === 'Kode meja tidak valid.',
    );
});

void test('HTTP errors expose status and can preserve adapter-specific messages', async () => {
    for (const status of [401, 403, 404, 409, 419, 422, 503]) {
        globalThis.fetch = async () => new Response('', { status });
        await assert.rejects(
            httpRequest('/pos/tables', {
                messages: { status: { [status]: `Pesan ${status}` } },
            }),
            (error) =>
                error instanceof HttpRequestError &&
                error.status === status &&
                error.message === `Pesan ${status}`,
        );
    }
});

void test('successful empty 204 response returns undefined', async () => {
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(
        await httpRequest('/pos/tables/1', { method: 'DELETE' }),
        undefined,
    );
});

void test('malformed success response is reported without retrying', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        return new Response('<html>Oops</html>', { status: 200 });
    };
    await assert.rejects(
        httpRequest('/pos/orders', {
            messages: { invalidResponse: 'Respons tidak valid.' },
        }),
        (error) =>
            error instanceof HttpRequestError &&
            error.status === 200 &&
            error.message === 'Respons tidak valid.',
    );
    assert.equal(calls, 1);
});

void test('caller AbortSignal errors remain distinguishable from network failures', async () => {
    const controller = new AbortController();
    globalThis.fetch = async (_url, options) => {
        options.signal?.throwIfAborted();
        controller.abort();
        options.signal?.throwIfAborted();
    };
    await assert.rejects(
        httpRequest('/pos/orders', { signal: controller.signal }),
        (error) => error.name === 'AbortError',
    );
});

void test('network loss during POST is not automatically retried', async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
        attempts++;
        throw new TypeError('Failed to fetch');
    };
    await assert.rejects(
        httpRequest('/pos/manual-orders', {
            method: 'POST',
            payload: {},
            messages: { network: 'Jaringan terputus.' },
        }),
        (error) =>
            error instanceof HttpRequestError &&
            error.status === 0 &&
            error.message === 'Jaringan terputus.',
    );
    assert.equal(attempts, 1);
});

void test('optional mutation guard rejects only concurrent duplicate intent', async () => {
    let resolveFirst;
    let requests = 0;
    globalThis.fetch = () => {
        requests++;
        return new Promise((resolve) => {
            resolveFirst = resolve;
        });
    };
    const options = {
        method: 'PATCH',
        mutationKey: 'table:25:ack',
        payload: {},
    };
    const first = httpRequest('/pos/service-tables/25/acknowledge', options);
    await assert.rejects(
        httpRequest('/pos/service-tables/25/acknowledge', options),
        (error) => error instanceof HttpRequestError && error.status === 409,
    );
    assert.equal(requests, 1);
    resolveFirst(Response.json({ ok: true }));
    assert.deepEqual(await first, { ok: true });
    globalThis.fetch = async () => Response.json({ ok: true });
    assert.deepEqual(
        await httpRequest('/pos/service-tables/25/acknowledge', options),
        { ok: true },
    );
});
