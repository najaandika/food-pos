/**
 * Session-scoped, in-memory stale-while-revalidate cache for POS GET data.
 *
 * - A cached snapshot is immediately available on view remount.
 * - Concurrent calls (including React StrictMode's effect replay) share one GET.
 * - Stale snapshots stay available while a new GET refreshes them.
 * - A mutation invalidates matching keys and prevents an older in-flight GET
 *   from overwriting the post-mutation response.
 * - No browser storage, service-worker or persistent caching of private data.
 *   HTTP requests can continue to use cache: 'no-store'.
 */
type QueryEntry<T> = {
    value?: T;
    updatedAt: number;
    generation: number;
    pending?: Promise<T>;
};

const entries = new Map<string, QueryEntry<unknown>>();
const MAX_ENTRIES = 80;
let sessionMarker: string | undefined;
// Every authentication boundary invalidates responses started in an older
// session, even if a later login uses the same user ID.
let sessionEpoch = 0;

/**
 * Laravel can re-encrypt the XSRF-TOKEN cookie on every response even though
 * the authenticated session is unchanged. Never use the cookie ciphertext as
 * an identity: it would clear the cache after virtually every GET.
 * The dashboard supplies the authenticated user ID before rendering views.
 */
export function setSharedQuerySession(userId: number): void {
    if (typeof window === 'undefined') return;
    const next = String(userId);
    if (sessionMarker !== next) {
        entries.clear();
        sessionMarker = next;
        sessionEpoch++;
    }
}

export function clearSharedQueries(): void {
    entries.clear();
    sessionEpoch++;
}

export function peekSharedQuery<T>(key: string): T | undefined {
    // Never share process-global SSR values across authenticated requests.
    if (typeof window === 'undefined') return undefined;
    const entry = entries.get(key);
    // A mutation invalidation is different from ordinary TTL staleness:
    // never show a knowingly obsolete paid/status/table snapshot as current.
    return entry?.updatedAt ? (entry.value as T | undefined) : undefined;
}

export function invalidateSharedQueries(prefixes: string | string[]): void {
    if (typeof window === 'undefined') return;
    const list = Array.isArray(prefixes) ? prefixes : [prefixes];
    for (const [key, entry] of entries) {
        if (!list.some((prefix) => key.startsWith(prefix))) continue;
        entry.updatedAt = 0;
        // A slow pre-mutation GET must never overwrite the refreshed result.
        entry.generation++;
        // Keep an active promise shared. Its generation-aware read loop
        // performs one post-mutation refetch for every waiting consumer.
    }
}

export function loadSharedQuery<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { staleTimeMs?: number; force?: boolean } = {},
): Promise<T> {
    if (typeof window === 'undefined') return fetcher();
    const staleTimeMs = options.staleTimeMs ?? 10000;
    let entry = entries.get(key) as QueryEntry<T> | undefined;
    if (!entry) {
        // Entries are bounded; prefer discarding old, inactive snapshots.
        if (entries.size >= MAX_ENTRIES) {
            const oldest = [...entries.entries()]
                .filter(([, item]) => !item.pending)
                .sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
            if (oldest) entries.delete(oldest[0]);
        }
        entry = { updatedAt: 0, generation: 0 };
        entries.set(key, entry);
    }

    if (entry.pending) return entry.pending;
    if (
        !options.force &&
        entry.value !== undefined &&
        entry.updatedAt > 0 &&
        Date.now() - entry.updatedAt < staleTimeMs
    ) {
        return Promise.resolve(entry.value);
    }

    const current = entry;
    const requestEpoch = sessionEpoch;
    const assertCurrentSession = () => {
        if (requestEpoch !== sessionEpoch) {
            const error = new Error('Request belongs to an expired session.');
            error.name = 'AbortError';
            throw error;
        }
    };
    const pending = Promise.resolve()
        .then(async () => {
            assertCurrentSession();
            let generation = current.generation;
            let value: T;
            try {
                value = await fetcher();
            } catch (error) {
                assertCurrentSession();
                throw error;
            }
            assertCurrentSession();
            // A mutation invalidated the in-flight snapshot. Fetch again
            // without recursively awaiting this same pending promise.
            while (
                entries.get(key) === current &&
                current.generation !== generation
            ) {
                generation = current.generation;
                try {
                    value = await fetcher();
                } catch (error) {
                    assertCurrentSession();
                    throw error;
                }
                assertCurrentSession();
            }
            if (entries.get(key) !== current) return value;
            current.value = value;
            current.updatedAt = Date.now();
            return value;
        })
        .catch((error: unknown) => {
            // A late 401/419 from user A must not clear user B's cache, and
            // no old-session result/error may reach the active consumer.
            assertCurrentSession();
            const status =
                error && typeof error === 'object' && 'status' in error
                    ? (error as { status: unknown }).status
                    : undefined;
            if (status === 401 || status === 419) clearSharedQueries();
            throw error;
        })
        .finally(() => {
            if (current.pending === pending) current.pending = undefined;
        });
    current.pending = pending;
    return pending;
}
