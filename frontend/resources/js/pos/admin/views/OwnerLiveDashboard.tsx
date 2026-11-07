'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    RiDatabase2Line,
    RiFileList3Line,
    RiRefreshLine,
    RiTimeLine,
} from '@remixicon/react';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from '../../../../../components/base/modal/modal';
import { Button } from '../../../../../components/base/buttons/button';
import type {
    PosDashboard,
    PosMenuItem,
    PosOrder,
    PosOrderStatus,
} from '../../../lib/pos-types';
import { httpRequest } from '../../shared/api/http-client';
import { toAdminDishes, toAdminOrders, type AdminOrder } from '../runtime-data';
import { useLocale } from '../i18n-context';
import type { View } from '../types';
import { DashboardView } from './DashboardView';
import './OwnerLiveDashboard.css';

type OverviewResponse = {
    source: 'database';
    timezone: 'Asia/Jakarta';
    date: string;
    generatedAt: string;
    dashboard: PosDashboard;
    statusCounts: Record<PosOrderStatus, number>;
    totalOrders: number;
    ordersToday: number;
    recentLimit: number;
    recentOrders: PosOrder[];
    priorityOrders: PosOrder[];
    activeTableCount: number;
    activeTableOrders: PosOrder[];
    topDishes: PosMenuItem[];
};

const REQUIRED_STATUSES: PosOrderStatus[] = [
    'pending',
    'accepted',
    'preparing',
    'ready',
    'served',
    'waiting_payment',
    'paid',
    'cancelled',
];

function isOverviewResponse(value: unknown): value is OverviewResponse {
    if (!value || typeof value !== 'object') return false;
    const v = value as Partial<OverviewResponse>;
    return (
        v.source === 'database' &&
        v.timezone === 'Asia/Jakarta' &&
        typeof v.generatedAt === 'string' &&
        typeof v.date === 'string' &&
        v.dashboard !== null &&
        typeof v.dashboard === 'object' &&
        typeof v.dashboard.revenueToday === 'number' &&
        typeof v.dashboard.activeOrders === 'number' &&
        typeof v.dashboard.qrOrders === 'number' &&
        typeof v.dashboard.needAction === 'number' &&
        v.statusCounts !== null &&
        typeof v.statusCounts === 'object' &&
        REQUIRED_STATUSES.every(
            (status) =>
                typeof v.statusCounts?.[status] === 'number' &&
                Number.isFinite(v.statusCounts[status]),
        ) &&
        Number.isFinite(v.totalOrders) &&
        Number.isFinite(v.ordersToday) &&
        Number.isFinite(v.recentLimit) &&
        Number.isFinite(v.activeTableCount) &&
        Array.isArray(v.recentOrders) &&
        Array.isArray(v.priorityOrders) &&
        Array.isArray(v.activeTableOrders) &&
        Array.isArray(v.topDishes)
    );
}

export async function requestOwnerOverview(
    signal?: AbortSignal,
): Promise<OverviewResponse> {
    const value = await httpRequest<unknown>('/dashboard/overview', { signal });
    if (!isOverviewResponse(value)) {
        throw new Error('Invalid overview response');
    }
    return value;
}

function toJakartaOrders(items: PosOrder[], locale: 'id' | 'en'): AdminOrder[] {
    const time = new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
    });
    return toAdminOrders(items).map((order, index) => ({
        ...order,
        time: time.format(new Date(items[index].createdAt)),
    }));
}

export function OwnerLiveDashboard({
    onChangeView,
}: {
    onChangeView: (view: View) => void;
}) {
    const { locale } = useLocale();
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);
    const [payload, setPayload] = useState<OverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [historyRevision, setHistoryRevision] = useState(0);
    const lastRefreshAt = useRef(Date.now());
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);

        requestOwnerOverview(controller.signal)
            .then((value) => {
                if (controller.signal.aborted) return;
                setPayload(value);
                setSelectedOrder(null);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [revision]);

    // Keep live KPI/status/order snapshots fresh like Orders and Waiters.
    // A quiet 30s poll does not remount historical charts; manual Refresh
    // updates both overview and 30-day analytics together.
    useEffect(() => {
        const refreshWhenActive = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastRefreshAt.current < 10000) return;
            lastRefreshAt.current = now;
            setRevision((current) => current + 1);
        };
        const interval = window.setInterval(refreshWhenActive, 30000);
        window.addEventListener('focus', refreshWhenActive);
        document.addEventListener('visibilitychange', refreshWhenActive);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshWhenActive);
            document.removeEventListener('visibilitychange', refreshWhenActive);
        };
    }, []);

    const refreshAll = () => {
        lastRefreshAt.current = Date.now();
        setRevision((current) => current + 1);
        setHistoryRevision((current) => current + 1);
    };

    const orders = useMemo(
        () => toJakartaOrders(payload?.recentOrders ?? [], locale),
        [payload, locale],
    );
    const priorityOrders = useMemo(
        () => toJakartaOrders(payload?.priorityOrders ?? [], locale),
        [payload, locale],
    );
    const activeTableOrders = useMemo(
        () => toJakartaOrders(payload?.activeTableOrders ?? [], locale),
        [payload, locale],
    );
    const dishes = useMemo(
        () => toAdminDishes(payload?.topDishes ?? []),
        [payload],
    );

    const updatedAt = payload
        ? new Intl.DateTimeFormat(isId ? 'id-ID' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(payload.generatedAt))
        : '';

    return (
        <>
            {error && !payload ? (
                <section className="od-live-error" role="alert">
                    <RiDatabase2Line aria-hidden="true" />
                    <div>
                        <h2>
                            {localized(
                                'Ringkasan database belum dapat dimuat',
                                'Could not load the database overview',
                            )}
                        </h2>
                        <p>
                            {localized(
                                'Periksa koneksi Laravel lalu coba lagi. Statistik lokal tidak ditampilkan sebagai pengganti.',
                                'Check the Laravel connection and try again. Local sample statistics are not used as a fallback.',
                            )}
                        </p>
                        <Button
                            size="small"
                            variant="secondary"
                            leadingIcon={RiRefreshLine}
                            onClick={refreshAll}
                        >
                            {localized('Coba lagi', 'Try again')}
                        </Button>
                    </div>
                </section>
            ) : !payload ? (
                <section
                    className="od-live-loading"
                    role="status"
                    aria-label={localized(
                        'Memuat dashboard',
                        'Loading dashboard',
                    )}
                >
                    <div className="od-live-loading-heading" />
                    <div className="od-live-loading-grid">
                        <div />
                        <div />
                    </div>
                    <div className="od-live-loading-grid">
                        <div />
                        <div />
                    </div>
                    <span>
                        {localized(
                            'Memuat pesanan, pembayaran, menu, dan meja dari Laravel…',
                            'Loading orders, payments, menu and tables from Laravel…',
                        )}
                    </span>
                </section>
            ) : (
                <>
                    <div
                        className="od-live-data-banner"
                        role="status"
                        aria-live="polite"
                    >
                        <span className="od-live-source">
                            <RiDatabase2Line aria-hidden="true" />
                            {localized('Data tersimpan', 'Recorded data')}
                        </span>
                        <span>
                            <RiTimeLine aria-hidden="true" />
                            {localized(
                                'Diperbarui ' + updatedAt + ' WIB',
                                'Updated ' + updatedAt + ' Jakarta time',
                            )}
                        </span>
                        {error && (
                            <span className="od-live-warning">
                                {localized(
                                    'Penyegaran gagal; masih menampilkan data terakhir.',
                                    'Refresh failed; showing last loaded data.',
                                )}
                            </span>
                        )}
                    </div>
                    <DashboardView
                        role="owner"
                        dashboard={payload.dashboard}
                        dishes={dishes}
                        orders={orders}
                        onChangeView={onChangeView}
                        onOpenOrder={setSelectedOrder}
                        liveInfo={{
                            statusCounts: payload.statusCounts,
                            totalOrders: payload.totalOrders,
                            ordersToday: payload.ordersToday,
                            recentLimit: payload.recentLimit,
                            activeTableCount: payload.activeTableCount,
                            activeTableOrders,
                            priorityOrders,
                            refreshing: loading,
                            historyRevision,
                            onRefresh: refreshAll,
                        }}
                    />
                </>
            )}

            <Modal
                isOpen={selectedOrder !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setSelectedOrder(null);
                }}
                size="lg"
                aria-label={localized('Detail pesanan', 'Order details')}
            >
                {({ close }) =>
                    selectedOrder ? (
                        <>
                            <ModalHeader
                                title={
                                    selectedOrder.orderNumber ||
                                    '#' + selectedOrder.id
                                }
                                icon={RiFileList3Line}
                                description={localized(
                                    'Detail pesanan tersimpan · hanya baca',
                                    'Recorded order details · read-only',
                                )}
                            />
                            <ModalBody>
                                <div className="od-live-order-details">
                                    <div className="od-live-order-meta">
                                        <div>
                                            <span>
                                                {localized(
                                                    'Pelanggan',
                                                    'Customer',
                                                )}
                                            </span>
                                            <strong>
                                                {selectedOrder.name}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                {localized('Meja', 'Table')}
                                            </span>
                                            <strong>
                                                {selectedOrder.tableCode ||
                                                    (selectedOrder.type ===
                                                    'takeaway'
                                                        ? localized(
                                                              'Bawa pulang',
                                                              'Takeaway',
                                                          )
                                                        : '—')}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                {localized('Status', 'Status')}
                                            </span>
                                            <strong>
                                                {selectedOrder.status}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                {localized('Dibuat', 'Created')}
                                            </span>
                                            <strong>
                                                {selectedOrder.time || '—'}
                                            </strong>
                                        </div>
                                    </div>
                                    <h3>
                                        {localized(
                                            'Rincian menu',
                                            'Line items',
                                        )}
                                    </h3>
                                    {selectedOrder.items.length ? (
                                        <ul>
                                            {selectedOrder.items.map(
                                                (item, index) => (
                                                    <li key={index}>
                                                        <span>
                                                            {item[0]} ×{' '}
                                                            {item[1]}
                                                        </span>
                                                        <strong>
                                                            {item[2]}
                                                        </strong>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    ) : (
                                        <p>
                                            {localized(
                                                'Belum ada item.',
                                                'No line items.',
                                            )}
                                        </p>
                                    )}
                                    <div className="od-live-order-total">
                                        <span>
                                            {localized('Total', 'Total')}
                                        </span>
                                        <strong>{selectedOrder.total}</strong>
                                    </div>
                                    {selectedOrder.notes && (
                                        <p>
                                            {localized('Catatan', 'Notes')}:{' '}
                                            {selectedOrder.notes}
                                        </p>
                                    )}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="secondary" onClick={close}>
                                    {localized('Tutup', 'Close')}
                                </Button>
                            </ModalFooter>
                        </>
                    ) : null
                }
            </Modal>
        </>
    );
}
