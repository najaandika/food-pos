import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminOrder } from '../../runtime-data';
import {
    getSavedOrders,
    peekSavedOrders,
    OrdersApiError,
} from './server-orders';

export type SavedOrdersState = {
    orders: AdminOrder[];
    isLoading: boolean;
    isSaving: boolean;
    error: string;
    actionError: string;
    clearActionError: () => void;
    reload: (force?: boolean) => Promise<void>;
    run: (action: () => Promise<void>) => Promise<void>;
};

function errorText(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Gagal terhubung ke server. Periksa koneksi lalu coba kembali.';
}

/**
 * Single source of truth for Orders and Cashier. New QR orders are picked up
 * when the screen is focused or on a 15s poll; edits never fake local data.
 */
export function useSavedOrders(): SavedOrdersState {
    const [orders, setOrders] = useState<AdminOrder[]>(
        () => peekSavedOrders() ?? [],
    );
    const [isLoading, setIsLoading] = useState(
        () => peekSavedOrders() === undefined,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const savingRef = useRef(false);
    const mounted = useRef(true);

    const read = useCallback(
        async (showLoader = false, force = false): Promise<void> => {
            if (showLoader && peekSavedOrders() === undefined)
                setIsLoading(true);
            try {
                const next = await getSavedOrders(force);
                if (mounted.current) {
                    setOrders(next);
                    setError('');
                }
            } catch (reason) {
                if (mounted.current) setError(errorText(reason));
                throw reason;
            } finally {
                if (mounted.current) setIsLoading(false);
            }
        },
        [],
    );

    const reload = useCallback(
        async (force = false): Promise<void> => {
            await read(true, force).catch(() => {
                // Keep last confirmed records visible after a transient outage.
            });
        },
        [read],
    );

    useEffect(() => {
        mounted.current = true;
        void read(true).catch(() => {});
        return () => {
            mounted.current = false;
        };
    }, [read]);

    useEffect(() => {
        let refreshing = false;
        const refreshQuietly = async () => {
            if (
                !mounted.current ||
                refreshing ||
                savingRef.current ||
                document.visibilityState === 'hidden'
            )
                return;

            refreshing = true;
            try {
                await read(false);
            } catch {
                // Error banner indicates stale state; never show local demo.
            } finally {
                refreshing = false;
            }
        };

        const interval = window.setInterval(() => void refreshQuietly(), 15000);
        const onFocus = () => void refreshQuietly();
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, [read]);

    const run = useCallback(
        async (action: () => Promise<void>) => {
            if (savingRef.current) {
                throw new OrdersApiError('Masih menyimpan aksi sebelumnya.', 0);
            }
            savingRef.current = true;
            setIsSaving(true);
            setActionError('');
            try {
                try {
                    await action();
                } catch (reason) {
                    if (mounted.current) setActionError(errorText(reason));
                    throw reason;
                }
                try {
                    // A confirmed mutation must not be reported as failed just
                    // because the follow-up GET temporarily lost connectivity.
                    await read(false, true);
                } catch {
                    // read() already leaves the last snapshot visible and
                    // announces that synchronization failed.
                }
            } finally {
                savingRef.current = false;
                if (mounted.current) setIsSaving(false);
            }
        },
        [read],
    );

    return {
        orders,
        isLoading,
        isSaving,
        error,
        actionError,
        clearActionError: () => setActionError(''),
        reload,
        run,
    };
}
