import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runInThisContext } from 'node:vm';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
    path.join(dirname, 'use-cashier-data.ts'),
    'utf8',
);
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
    },
}).outputText;

const savedWindow = globalThis.window;
const savedDocument = globalThis.document;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function result(id, total = id * 100, page = 1) {
    return {
        orders: [{ id }],
        stats: {
            unpaidCount: id,
            waitingCount: 0,
            paidCount: 0,
            paidTotal: '0.00',
            cashPaidCount: 0,
            cashPaidTotal: '0.00',
        },
        page,
        lastPage: 3,
        total,
    };
}

/**
 * Minimal deterministic React hook lifecycle simulator:
 * invokes useState/useRef/useEffect/useCallback with real hook ordering,
 * effect cleanup, and controlled Promise/timer completion. The production
 * hook and its imports are transpiled without changing any application file.
 */
function mountCashierHook({ cache = new Map(), responder } = {}) {
    const slots = [];
    let index = 0;
    let dirty = false;
    let output;
    let disposed = false;
    const effects = [];
    const calls = [];
    const timers = new Map();
    const intervals = new Map();
    const events = new Map();
    let nextTimer = 0;

    function useState(initial) {
        const position = index++;
        if (!(position in slots))
            slots[position] = {
                value: typeof initial === 'function' ? initial() : initial,
            };
        const setValue = (next) => {
            const state = slots[position];
            const nextValue =
                typeof next === 'function' ? next(state.value) : next;
            if (!Object.is(state.value, nextValue)) {
                state.value = nextValue;
                dirty = true;
            }
        };
        return [slots[position].value, setValue];
    }
    function useRef(value) {
        const position = index++;
        if (!(position in slots)) slots[position] = { current: value };
        return slots[position];
    }
    function depsChanged(oldDeps, deps) {
        return (
            !oldDeps ||
            !deps ||
            oldDeps.length !== deps.length ||
            deps.some((value, i) => !Object.is(value, oldDeps[i]))
        );
    }
    function useCallback(callback, deps) {
        const position = index++;
        if (!(position in slots) || depsChanged(slots[position].deps, deps)) {
            slots[position] = { value: callback, deps };
        }
        return slots[position].value;
    }
    function useEffect(callback, deps) {
        const position = index++;
        if (!(position in slots))
            slots[position] = { deps: undefined, cleanup: null };
        if (depsChanged(slots[position].deps, deps))
            effects.push({ position, callback, deps });
    }

    globalThis.document = { visibilityState: 'visible' };
    globalThis.window = {
        setTimeout(callback, ms) {
            const id = ++nextTimer;
            timers.set(id, { callback, ms });
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
        },
        setInterval(callback, ms) {
            const id = ++nextTimer;
            intervals.set(id, { callback, ms });
            return id;
        },
        clearInterval(id) {
            intervals.delete(id);
        },
        addEventListener(name, fn) {
            if (!events.has(name)) events.set(name, new Set());
            events.get(name).add(fn);
        },
        removeEventListener(name, fn) {
            events.get(name)?.delete(fn);
        },
    };

    const api = {
        peekCashierQueue(filter = 'all', search = '', page = 1) {
            return cache.get(JSON.stringify([filter, search.trim(), page]));
        },
        cashierQueue(filter, search, page, signal, force) {
            const key = JSON.stringify([filter, search.trim(), page]);
            const call = { filter, search, page, signal, force, key };
            calls.push(call);
            if (responder) return responder(call);
            return Promise.resolve(cache.get(key) ?? result(1));
        },
        cashierPayCash() {
            throw Error('pay() must not be called in Phase 2A');
        },
        cashierReceipt() {
            throw Error('receipt must not be called in Phase 2A');
        },
    };

    const module = { exports: {} };
    const evaluateModule = runInThisContext(
        '(function (require, module, exports) {\n' + compiled + '\n})',
    );
    evaluateModule(
        (name) => {
            if (name === 'react')
                return { useState, useRef, useEffect, useCallback };
            if (name === './cashier-api') return api;
            throw Error('Unexpected import: ' + name);
        },
        module,
        module.exports,
    );

    function render() {
        assert.ok(!disposed);
        index = 0;
        effects.length = 0;
        dirty = false;
        output = module.exports.useCashierData();
        for (const effect of effects) {
            const slot = slots[effect.position];
            if (slot.cleanup) slot.cleanup();
            slot.deps = effect.deps;
            slot.cleanup = effect.callback() || null;
        }
    }
    async function flush() {
        for (let i = 0; i < 24; i++) {
            await Promise.resolve();
            if (dirty) render();
            else {
                await Promise.resolve();
                if (!dirty) return output;
            }
        }
        throw Error('Hook did not settle after 24 render iterations');
    }
    render();
    function close() {
        disposed = true;
        for (const slot of slots)
            if (typeof slot?.cleanup === 'function') slot.cleanup();
        timers.clear();
        intervals.clear();
        events.clear();
        globalThis.window = savedWindow;
        globalThis.document = savedDocument;
    }

    return {
        get value() {
            return output;
        },
        calls,
        cache,
        flush,
        runTimers(ms) {
            for (const [id, entry] of timers) {
                if (entry.ms === ms) {
                    timers.delete(id);
                    entry.callback();
                }
            }
        },
        tickInterval(ms) {
            for (const t of intervals.values()) if (t.ms === ms) t.callback();
        },
        focus() {
            for (const fn of events.get('focus') ?? []) fn();
        },
        visibility(value) {
            globalThis.document.visibilityState = value;
        },
        close,
    };
}
after(() => {
    globalThis.window = savedWindow;
    globalThis.document = savedDocument;
});

void test('manual/focus refresh forces once; changing filter, search and page afterward respects warm cache', async () => {
    const cache = new Map([
        [JSON.stringify(['all', '', 1]), result(10)],
        [JSON.stringify(['ready', '', 1]), result(20)],
        [JSON.stringify(['ready', 'kopi', 1]), result(30)],
        [JSON.stringify(['ready', 'kopi', 2]), result(40, 4000, 2)],
    ]);
    const hook = mountCashierHook({ cache });
    try {
        await hook.flush();
        assert.equal(hook.calls[0].force, false);
        hook.value.reload();
        await hook.flush();
        assert.equal(
            hook.calls.at(-1).force,
            true,
            'explicit refresh must force',
        );
        hook.value.changeFilter('ready');
        await hook.flush();
        assert.equal(
            hook.calls.at(-1).force,
            false,
            'warm filter must respect TTL',
        );
        assert.equal(hook.value.orders[0].id, 20);
        hook.value.changeSearch('kopi');
        await hook.flush();
        hook.runTimers(260);
        await hook.flush();
        assert.equal(
            hook.calls.at(-1).force,
            false,
            'search after refresh must respect TTL',
        );
        assert.equal(hook.value.orders[0].id, 30);
        hook.value.setPage(2);
        await hook.flush();
        assert.equal(
            hook.calls.at(-1).force,
            false,
            'page navigation must respect TTL',
        );
        assert.equal(hook.value.orders[0].id, 40);
        hook.focus();
        await hook.flush();
        assert.equal(
            hook.calls.at(-1).force,
            true,
            'focus refresh must force current query',
        );
        const beforeHidden = hook.calls.length;
        hook.visibility('hidden');
        hook.tickInterval(15000);
        await hook.flush();
        assert.equal(
            hook.calls.length,
            beforeHidden,
            'hidden tab must not poll',
        );
        hook.visibility('visible');
        hook.tickInterval(15000);
        await hook.flush();
        assert.equal(
            hook.calls.at(-1).force,
            true,
            'visible interval must force',
        );
    } finally {
        hook.close();
    }
});

void test('late response from query A cannot overwrite newer B orders, stats or pagination', async () => {
    const pending = [];
    const hook = mountCashierHook({
        responder(call) {
            const request = deferred();
            pending.push({ ...call, request });
            return request.promise;
        },
    });
    try {
        await hook.flush();
        assert.equal(pending.length, 1);
        hook.value.changeFilter('ready');
        await hook.flush();
        assert.equal(pending.length, 2);
        pending[1].request.resolve(result(22, 2222));
        await hook.flush();
        assert.equal(hook.value.orders[0].id, 22);
        assert.equal(hook.value.stats.unpaidCount, 22);
        assert.equal(hook.value.total, 2222);
        pending[0].request.resolve(result(11, 1111));
        await hook.flush();
        assert.equal(hook.value.orders[0].id, 22);
        assert.equal(hook.value.stats.unpaidCount, 22);
        assert.equal(hook.value.total, 2222);
        assert.equal(hook.value.page, 1);
    } finally {
        hook.close();
    }
});

void test('switch to uncached query hides previous orders, stats and pagination even before GET completes', async () => {
    const loading = deferred();
    const cache = new Map([[JSON.stringify(['all', '', 1]), result(7, 777)]]);
    const hook = mountCashierHook({
        cache,
        responder(call) {
            if (call.filter === 'ready') return loading.promise;
            return Promise.resolve(cache.get(call.key));
        },
    });
    try {
        await hook.flush();
        assert.equal(hook.value.orders[0].id, 7);
        hook.value.changeFilter('ready');
        await hook.flush();
        assert.deepEqual(hook.value.orders, []);
        assert.equal(hook.value.stats, null);
        assert.equal(hook.value.total, 0);
        assert.equal(hook.value.lastPage, 1);
        assert.equal(hook.value.isLoading, true);
        loading.resolve(result(9, 999));
        await hook.flush();
        assert.equal(hook.value.stats.unpaidCount, 9);
        assert.equal(hook.value.total, 999);
    } finally {
        hook.close();
    }
});

void test('failed GET clears current queue statistics and pagination, not just orders', async () => {
    let fail = false;
    const hook = mountCashierHook({
        responder: async () => {
            if (fail) throw Error('Laravel offline');
            return result(5, 555);
        },
    });
    try {
        await hook.flush();
        assert.equal(hook.value.total, 555);
        fail = true;
        hook.value.reload();
        await hook.flush();
        assert.deepEqual(hook.value.orders, []);
        assert.equal(hook.value.stats, null);
        assert.equal(hook.value.total, 0);
        assert.equal(hook.value.lastPage, 1);
        assert.equal(hook.value.error, 'Laravel offline');
        assert.equal(hook.value.isLoading, false);
    } finally {
        hook.close();
    }
});

void test('old page response/error cannot replace the newest page snapshot', async () => {
    const pending = [];
    const hook = mountCashierHook({
        responder(call) {
            const request = deferred();
            pending.push({ ...call, request });
            return request.promise;
        },
    });
    try {
        await hook.flush();
        hook.value.setPage(2);
        await hook.flush();
        assert.equal(pending[1].page, 2);
        pending[1].request.resolve(result(82, 8200, 2));
        await hook.flush();
        assert.equal(hook.value.page, 2);
        assert.equal(hook.value.orders[0].id, 82);
        assert.equal(hook.value.stats.unpaidCount, 82);
        pending[0].request.reject(new Error('old page failed'));
        await hook.flush();
        assert.equal(hook.value.page, 2);
        assert.equal(hook.value.orders[0].id, 82);
        assert.equal(hook.value.stats.unpaidCount, 82);
        assert.equal(hook.value.total, 8200);
        assert.equal(hook.value.error, '');
    } finally {
        hook.close();
    }
});

void test.todo(
    'R3.2 Phase 2B proposal: payment POST succeeds but receipt GET fails; confirm paid, refresh queue, never repeat POST',
);
