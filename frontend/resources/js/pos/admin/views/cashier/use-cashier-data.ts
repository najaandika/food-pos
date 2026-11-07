import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminOrder } from '../../runtime-data';
import {
    cashierPayCash,
    cashierQueue,
    cashierReceipt,
    peekCashierQueue,
    type CashierFilter,
    type CashierQueueResult,
    type CashierStats,
    type ConfirmedCashierReceipt,
} from './cashier-api';

// A confirmed Laravel settlement is independent of receipt GET availability.
// Only the POST may establish this status. Retrying a receipt is GET-only.
export type CashierPaymentOutcome =
    | {
          status: 'confirmed';
          receiptStatus: 'available';
          orderId: number;
          receipt: ConfirmedCashierReceipt;
      }
    | {
          status: 'confirmed';
          receiptStatus: 'unavailable';
          orderId: number;
          receipt: null;
          receiptError: string;
      };

export function useCashierData() {
    const [filter, setFilter] = useState<CashierFilter>('all');
    const [search, setSearch] = useState('');
    const [settledSearch, setSettledSearch] = useState('');
    const [page, setPage] = useState(1);
    const queryKey = JSON.stringify([filter, settledSearch, page]);
    const activeQueryRef = useRef(queryKey);
    activeQueryRef.current = queryKey;
    const requestGenerationRef = useRef(0);
    const forceNextRefreshRef = useRef(false);
    // Store all related queue fields together. Never pair orders from one
    // filter/search/page with the stats or pagination from another.
    const [queueSnapshot, setQueueSnapshot] = useState<{
        key: string;
        data: CashierQueueResult | null;
    }>(() => ({
        key: JSON.stringify(['all', '', 1]),
        data: peekCashierQueue() ?? null,
    }));
    const currentQueue =
        queueSnapshot.key === queryKey
            ? queueSnapshot.data
            : peekCashierQueue(filter, settledSearch, page);
    const orders: AdminOrder[] = currentQueue?.orders ?? [];
    const stats: CashierStats | null = currentQueue?.stats ?? null;
    const lastPage = currentQueue?.lastPage ?? 1;
    const total = currentQueue?.total ?? 0;
    const [revision, setRevision] = useState(0);
    const [fetchState, setFetchState] = useState(() => ({
        key: JSON.stringify(['all', '', 1]),
        loading: peekCashierQueue() === undefined,
    }));
    const isLoading =
        fetchState.key === queryKey ? fetchState.loading : !currentQueue;
    const [isSaving, setIsSaving] = useState(false);
    const [requestError, setRequestError] = useState<{
        key: string;
        message: string;
    } | null>(null);
    const error = requestError?.key === queryKey ? requestError.message : '';
    const busyRef = useRef(false);
    const confirmedOrderIdsRef = useRef(new Set<number>());
    const [confirmedOrderIds, setConfirmedOrderIds] = useState<number[]>([]);
    const reload = useCallback(() => {
        // Force only this refresh, not every later filter/search/page change.
        forceNextRefreshRef.current = true;
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setSettledSearch(search.trim()),
            260,
        );
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const controller = new AbortController();
        const generation = ++requestGenerationRef.current;
        const isCurrent = () =>
            !controller.signal.aborted &&
            requestGenerationRef.current === generation &&
            activeQueryRef.current === queryKey;
        const cached = peekCashierQueue(filter, settledSearch, page);
        const force = forceNextRefreshRef.current;
        forceNextRefreshRef.current = false;
        setQueueSnapshot({ key: queryKey, data: cached ?? null });
        setFetchState({ key: queryKey, loading: !cached });
        setRequestError(null);
        void (async () => {
            try {
                const response = await cashierQueue(
                    filter,
                    settledSearch,
                    page,
                    controller.signal,
                    force,
                );
                if (isCurrent()) {
                    setQueueSnapshot({ key: queryKey, data: response });
                    setPage(response.page);
                    setRequestError(null);
                }
            } catch (reason) {
                if (isCurrent()) {
                    setRequestError({
                        key: queryKey,
                        message:
                            reason instanceof Error
                                ? reason.message
                                : 'Antrian kasir gagal dimuat.',
                    });
                    // Do not treat the previous queue's stats or pagination as
                    // valid when a GET fails, even if a cached row was visible.
                    setQueueSnapshot({ key: queryKey, data: null });
                }
            } finally {
                if (isCurrent()) {
                    setFetchState({ key: queryKey, loading: false });
                }
            }
        })();
        return () => {
            controller.abort();
            requestGenerationRef.current++;
        };
    }, [filter, settledSearch, page, revision]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible' && !busyRef.current) {
                reload();
            }
        }, 15000);
        const onFocus = () => {
            if (document.visibilityState === 'visible' && !busyRef.current) {
                reload();
            }
        };
        window.addEventListener('focus', onFocus);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [reload]);

    const changeSearch = useCallback((value: string) => {
        setSearch(value);
        setPage(1);
    }, []);
    const changeFilter = useCallback((value: CashierFilter) => {
        setFilter(value);
        setPage(1);
    }, []);

    const pay = useCallback(
        async (
            id: number,
            received: string,
            expectedTotal: string,
            idempotencyKey: string,
        ): Promise<CashierPaymentOutcome> => {
            if (busyRef.current)
                throw new Error(
                    'Pembayaran sedang diproses, jangan kirim ulang.',
                );
            if (confirmedOrderIdsRef.current.has(id))
                throw new Error(
                    'Pembayaran pesanan ini sudah tercatat di Laravel. Jangan bayar ulang; muat ulang struk saja.',
                );
            busyRef.current = true;
            setIsSaving(true);
            try {
                await cashierPayCash(
                    id,
                    received,
                    expectedTotal,
                    idempotencyKey,
                );
                // POST returned a validated paid confirmation. Lock the order
                // immediately, even if the subsequent independent GET fails.
                confirmedOrderIdsRef.current.add(id);
                setConfirmedOrderIds((current) =>
                    current.includes(id) ? current : [...current, id],
                );
                // Do not wait for receipt availability to revalidate the queue.
                reload();
                try {
                    const receipt = await cashierReceipt(id);
                    return {
                        status: 'confirmed',
                        receiptStatus: 'available',
                        orderId: id,
                        receipt,
                    };
                } catch (reason) {
                    return {
                        status: 'confirmed',
                        receiptStatus: 'unavailable',
                        orderId: id,
                        receipt: null,
                        receiptError:
                            reason instanceof Error
                                ? reason.message
                                : 'Struk belum dapat dimuat dari Laravel.',
                    };
                }
            } finally {
                busyRef.current = false;
                setIsSaving(false);
            }
        },
        [reload],
    );

    const retryReceipt = useCallback(
        (id: number): Promise<ConfirmedCashierReceipt> => cashierReceipt(id),
        [],
    );

    return {
        orders,
        stats,
        filter,
        search,
        page,
        lastPage,
        total,
        isLoading,
        isSaving,
        confirmedOrderIds,
        error,
        reload,
        pay,
        retryReceipt,
        changeSearch,
        changeFilter,
        setPage,
    };
}
