import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const dirname = path.dirname(fileURLToPath(import.meta.url));
const compiled = ts.transpileModule(
    fs.readFileSync(path.join(dirname, 'use-cashier-data.ts'), 'utf8'),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    },
).outputText;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((accept, deny) => {
        resolve = accept;
        reject = deny;
    });
    return { promise, resolve, reject };
}

function receipt(id) {
    return {
        id,
        status: 'paid',
        orderNumber: 'POS-' + id,
        payment: {
            id: id * 10,
            status: 'paid',
            method: 'cash',
            paidAt: '2026-11-07T00:00:00Z',
        },
    };
}

/** Runs the actual compiled hook with deterministic React stubs and API spies.
 * The payment contract is exercised without a browser, database or POST.
 */
function harness({ payImpl, receiptImpl } = {}) {
    const calls = { post: [], get: [], refresh: 0 };
    let pointer = 0;
    const slots = [];
    const mockReact = {
        useState(initial) {
            const index = pointer++;
            if (!(index in slots))
                slots[index] =
                    typeof initial === 'function' ? initial() : initial;
            return [
                slots[index],
                (value) => {
                    const previous = slots[index];
                    slots[index] =
                        typeof value === 'function' ? value(previous) : value;
                    if (
                        typeof previous === 'number' &&
                        typeof value === 'function' &&
                        slots[index] === previous + 1
                    ) {
                        calls.refresh++;
                    }
                },
            ];
        },
        useRef(value) {
            const index = pointer++;
            if (!(index in slots)) slots[index] = { current: value };
            return slots[index];
        },
        useCallback(fn) {
            pointer++;
            return fn;
        },
        useEffect() {
            pointer++;
        },
    };
    const api = {
        peekCashierQueue() {
            return undefined;
        },
        cashierQueue() {
            throw Error('Unexpected queue GET in payment unit test');
        },
        async cashierPayCash(...args) {
            calls.post.push(args);
            if (payImpl) return payImpl(...args);
            return { receiptUrl: '/receipt', idempotent: false };
        },
        async cashierReceipt(id) {
            calls.get.push(id);
            if (receiptImpl) return receiptImpl(id, calls.get.length);
            return receipt(id);
        },
    };
    const context = { exports: {} };
    const load = runInThisContext(
        '(function (require, module, exports) {\n' + compiled + '\n})',
    );
    load(
        (name) => {
            if (name === 'react') return mockReact;
            if (name === './cashier-api') return api;
            throw Error('Unexpected import ' + name);
        },
        context,
        context.exports,
    );
    const hook = context.exports.useCashierData();
    return { hook, calls };
}

void test('POST confirmed + receipt GET 500 produces confirmed/unavailable, refreshes queue and GET-only recovery', async () => {
    const error = Object.assign(new Error('Struk tidak tersedia (500)'), {
        status: 500,
    });
    const { hook, calls } = harness({
        receiptImpl: async (id, count) => {
            if (count === 1) throw error;
            return receipt(id);
        },
    });
    const result = await hook.pay(21, '25000.00', '25000.00', 'fixed-key-21');
    assert.deepEqual(
        {
            status: result.status,
            receiptStatus: result.receiptStatus,
            orderId: result.orderId,
        },
        { status: 'confirmed', receiptStatus: 'unavailable', orderId: 21 },
    );
    assert.equal(result.receipt, null);
    assert.match(result.receiptError, /Struk tidak tersedia/);
    assert.equal(calls.post.length, 1);
    assert.equal(calls.get.length, 1);
    assert.equal(
        calls.refresh,
        1,
        'queue must refresh after confirmed POST even when receipt GET fails',
    );
    await assert.rejects(
        hook.pay(21, '25000.00', '25000.00', 'fixed-key-21'),
        /sudah tercatat/i,
    );
    assert.equal(
        calls.post.length,
        1,
        'second settlement must be blocked for confirmed order',
    );
    const recovered = await hook.retryReceipt(21);
    assert.deepEqual(recovered, receipt(21));
    assert.equal(calls.post.length, 1, 'receipt retry must never POST');
    assert.deepEqual(calls.get, [21, 21]);
});

void test('ordinary payment success returns confirmed/available and never issues extra receipt GET', async () => {
    const { hook, calls } = harness();
    const outcome = await hook.pay(22, '50000.00', '30000.00', 'stable-22');
    assert.equal(outcome.status, 'confirmed');
    assert.equal(outcome.receiptStatus, 'available');
    assert.equal(outcome.receipt.orderNumber, 'POS-22');
    assert.deepEqual(calls.post[0], [22, '50000.00', '30000.00', 'stable-22']);
    assert.deepEqual(calls.get, [22]);
    assert.equal(calls.refresh, 1);
});

for (const status of [500, 409, 422]) {
    void test(
        'POST failure HTTP ' +
            status +
            ' remains unconfirmed and must not fetch receipt',
        async () => {
            const reason = Object.assign(new Error('POST rejected ' + status), {
                status,
            });
            const { hook, calls } = harness({
                payImpl: async () => {
                    throw reason;
                },
            });
            await assert.rejects(
                hook.pay(23, '50000.00', '30000.00', 'same-key-23'),
                (error) => error === reason,
            );
            assert.equal(calls.post.length, 1);
            assert.equal(calls.get.length, 0);
            assert.equal(calls.refresh, 0);
        },
    );
}

void test('double-submit while POST is pending is blocked; successful attempt is not sent twice', async () => {
    const pending = deferred();
    const { hook, calls } = harness({ payImpl: () => pending.promise });
    const first = hook.pay(24, '50000.00', '30000.00', 'idempotency-24');
    await assert.rejects(
        hook.pay(24, '50000.00', '30000.00', 'idempotency-24'),
        /sedang diproses/i,
    );
    assert.equal(calls.post.length, 1);
    pending.resolve({ receiptUrl: '/receipt', idempotent: false });
    const result = await first;
    assert.equal(result.status, 'confirmed');
    assert.equal(calls.post.length, 1);
});

void test('network error retrieving receipt is distinct from POST failure', async () => {
    const { hook, calls } = harness({
        receiptImpl: async () => {
            throw new Error('Network offline');
        },
    });
    const confirmed = await hook.pay(
        25,
        '100000.00',
        '90000.00',
        'idempotency-25',
    );
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.receiptStatus, 'unavailable');
    assert.match(confirmed.receiptError, /Network offline/);
    assert.equal(calls.post.length, 1);
});
