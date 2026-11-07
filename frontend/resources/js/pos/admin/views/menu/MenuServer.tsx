import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../../../../components/base/buttons/button';
import { Spinner } from '../../../../../../components/base/spinner/spinner';
import type { AdminDish, AdminOrder, AdminTable } from '../../runtime-data';
import { MenuView } from '../MenuView';
import {
    getServiceCatalog,
    getServiceTables,
    peekServiceCatalog,
    peekServiceTables,
    postManualOrder,
    type ManualOrderDraft,
} from '../service-workspace';
import { getSavedOrders, peekSavedOrders } from '../orders/server-orders';

export function MenuServer({
    onGoToCashier,
    onGoToOrders,
}: {
    onGoToCashier?: () => void;
    onGoToOrders?: () => void;
}) {
    const [dishes, setDishes] = useState<AdminDish[] | null>(
        () => peekServiceCatalog() ?? null,
    );
    const [tables, setTables] = useState<AdminTable[]>(
        () => peekServiceTables() ?? [],
    );
    const [orders, setOrders] = useState<AdminOrder[]>(
        () => peekSavedOrders() ?? [],
    );
    const [loading, setLoading] = useState(
        () => peekServiceCatalog() === undefined,
    );
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const sendingRef = useRef(false);

    const reload = useCallback(async (force = false) => {
        // Catalog and tables are independently useful. A slow order-history
        // fetch must not block product selection and table assignment.
        const results = await Promise.allSettled([
            getServiceCatalog(force).then((menu) => {
                setDishes(menu);
                // Product selection need not wait for all historical orders.
                setLoading(false);
                return menu;
            }),
            getServiceTables(force),
            getSavedOrders(force),
        ] as const);
        if (results[1].status === 'fulfilled') setTables(results[1].value);
        if (results[2].status === 'fulfilled') setOrders(results[2].value);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        setError('');
    }, []);

    const retry = useCallback(async (force = false) => {
        if (!peekServiceCatalog()) setLoading(true);
        try {
            await reload(force);
        } catch (reason) {
            setError(
                reason instanceof Error ? reason.message : 'Gagal memuat Menu.',
            );
        } finally {
            setLoading(false);
        }
    }, [reload]);

    useEffect(() => {
        void retry();
    }, [retry]);

    useEffect(() => {
        if (!dishes) return;
        let active = true;
        let busy = false;
        const refresh = async () => {
            if (
                !active ||
                busy ||
                sendingRef.current ||
                document.visibilityState === 'hidden'
            )
                return;
            busy = true;
            try {
                await reload();
            } catch (reason) {
                if (active)
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Sinkronisasi gagal.',
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
    }, [dishes !== null, reload]);

    const create = async (payload: ManualOrderDraft) => {
        if (sendingRef.current)
            throw new Error('Pesanan sebelumnya masih dikirim.');
        sendingRef.current = true;
        setNotice('');
        try {
            const receipt = await postManualOrder(payload);
            // A successful write remains successful even if refresh fails:
            // never make the cashier send the same order twice.
            try {
                await reload(true);
            } catch {
                setError(
                    'Pesanan sudah tersimpan, tetapi daftar belum tersinkron. Klik Muat ulang.',
                );
            }
            setNotice('Pesanan manual berhasil disimpan di Laravel.');
            return receipt;
        } finally {
            sendingRef.current = false;
        }
    };

    if (!dishes && loading) {
        return (
            <section
                className="app-view active text-body-2-regular text-text-secondary flex min-h-64 items-center justify-center gap-3"
                role="status"
            >
                <Spinner size="md" aria-label="Memuat menu dari Laravel" />
                Memuat menu dan meja dari Laravel…
            </section>
        );
    }

    if (!dishes) {
        return (
            <section
                className="app-view active text-body-2-regular text-text-primary flex min-h-64 flex-wrap items-center justify-center gap-3"
                role="alert"
            >
                <span>{error || 'Gagal memuat katalog.'}</span>
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
            {(error || notice) && (
                <div
                    className="border-border-button-default bg-background-secondary-default text-body-2-regular text-text-primary mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    role={error ? 'alert' : 'status'}
                >
                    <span>{error || notice}</span>
                    {error && (
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
            <MenuView
                dishes={dishes}
                orders={orders}
                tables={tables}
                pricingFromLaravel
                onCreateManualOrder={create}
                onGoToCashier={onGoToCashier}
                onGoToOrders={onGoToOrders}
            />
        </>
    );
}
