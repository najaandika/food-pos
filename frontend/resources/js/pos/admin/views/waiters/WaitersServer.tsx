import { useCallback, useEffect, useRef, useState } from 'react';
import type { PosOrderStatus } from '@/lib/pos-types';
import { Button } from '../../../../../../components/base/buttons/button';
import { Spinner } from '../../../../../../components/base/spinner/spinner';
import type { AdminTable } from '../../runtime-data';
import { advanceSavedOrder } from '../orders/server-orders';
import { useSavedOrders } from '../orders/use-saved-orders';
import {
    acknowledgeServiceCall,
    getServiceTables,
    peekServiceTables,
} from '../../shared/data/service-workspace';
import { WaitersView } from './WaitersView';

export function WaitersServer() {
    const {
        orders,
        isLoading,
        error: ordersError,
        reload: reloadOrders,
    } = useSavedOrders();
    const [tables, setTables] = useState<AdminTable[] | null>(
        () => peekServiceTables() ?? null,
    );
    const [loadingTables, setLoadingTables] = useState(
        () => peekServiceTables() === undefined,
    );
    const [tablesError, setTablesError] = useState('');
    const [actionError, setActionError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);

    const reloadTables = useCallback(async (force = false) => {
        const next = await getServiceTables(force);
        setTables(next);
        setTablesError('');
    }, []);

    const retry = useCallback(
        async (force = false) => {
            if (peekServiceTables() === undefined) setLoadingTables(true);
            await Promise.all([
                reloadOrders(force),
                reloadTables(force).catch((reason) => {
                    setTablesError(
                        reason instanceof Error
                            ? reason.message
                            : 'Gagal memuat meja.',
                    );
                }),
            ]);
            setLoadingTables(false);
        },
        [reloadOrders, reloadTables],
    );

    useEffect(() => {
        void retry();
    }, [retry]);

    useEffect(() => {
        if (tables === null) return;
        let active = true;
        let busy = false;
        const refresh = async () => {
            if (
                !active ||
                busy ||
                savingRef.current ||
                document.visibilityState === 'hidden'
            )
                return;
            busy = true;
            try {
                await reloadTables();
            } catch (reason) {
                if (active)
                    setTablesError(
                        reason instanceof Error
                            ? reason.message
                            : 'Sinkronisasi meja gagal.',
                    );
            } finally {
                busy = false;
            }
        };
        const interval = window.setInterval(() => void refresh(), 15000);
        const onFocus = () => void refresh();
        window.addEventListener('focus', onFocus);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [tables !== null, reloadTables]);

    const perform = async (action: () => Promise<void>, message: string) => {
        if (savingRef.current)
            throw new Error('Tindakan sebelumnya masih disimpan.');
        savingRef.current = true;
        setSaving(true);
        setActionError('');
        setNotice('');
        try {
            await action();
        } catch (reason) {
            setActionError(
                reason instanceof Error
                    ? reason.message
                    : 'Gagal menyimpan ke Laravel.',
            );
            throw reason;
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
        // Do not report a persisted change as failed merely because the
        // subsequent read/poll is temporarily offline.
        await Promise.all([
            reloadOrders(true),
            reloadTables(true).catch((reason) => {
                setTablesError(
                    reason instanceof Error
                        ? reason.message
                        : 'Gagal menyinkronkan meja.',
                );
            }),
        ]);
        setNotice(message);
    };

    const updateStatus = (id: number | undefined, status: PosOrderStatus) =>
        id === undefined
            ? Promise.resolve()
            : perform(
                  () => advanceSavedOrder(id, status),
                  'Status pesanan berhasil disimpan di Laravel.',
              );

    const acknowledge = (id: number | undefined) =>
        id === undefined
            ? Promise.resolve()
            : perform(
                  () => acknowledgeServiceCall(id),
                  'Panggilan meja berhasil ditangani.',
              );

    if ((tables === null && loadingTables) || (tables === null && isLoading)) {
        return (
            <section
                className="app-view active text-body-2-regular text-text-secondary flex min-h-64 items-center justify-center gap-3"
                role="status"
            >
                <Spinner size="md" aria-label="Memuat layanan dari Laravel" />
                Memuat meja dan pesanan…
            </section>
        );
    }

    const err = actionError || tablesError || ordersError;
    if (!tables) {
        return (
            <section
                className="app-view active text-body-2-regular text-text-primary flex min-h-64 flex-wrap items-center justify-center gap-3"
                role="alert"
            >
                <span>{err || 'Tidak dapat memuat meja dari Laravel.'}</span>
                <Button
                    variant="secondary"
                    size="small"
                    onClick={() => void retry(true)}
                >
                    Coba lagi
                </Button>
            </section>
        );
    }

    return (
        <>
            {(err || notice) && (
                <div
                    className="border-border-button-default bg-background-secondary-default text-body-2-regular text-text-primary mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    role={err ? 'alert' : 'status'}
                >
                    <span>{err || notice}</span>
                    {err && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => void retry(true)}
                        >
                            Muat ulang
                        </Button>
                    )}
                </div>
            )}
            <WaitersView
                orders={orders}
                tables={tables}
                isSaving={saving}
                onUpdateStatus={updateStatus}
                onAcknowledgeCall={acknowledge}
            />
        </>
    );
}
