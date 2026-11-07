import { useMemo, useState } from 'react';
import {
    RiBellLine,
    RiCheckboxCircleLine,
    RiGroupLine,
    RiShoppingBag3Line,
} from '@remixicon/react';
import { StatCards } from '../../../../../components/application/dashboard/stat-cards';
import { Chip } from '../../../../../components/base/badges/chip';
import { Button } from '../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
} from '../../../../../components/base/drawer/drawer';
import type { PosOrderStatus } from '../../../lib/pos-types';
import { AdminTitle } from '..';
import { useLocale } from '../i18n-context';
import type { AdminOrder, AdminTable } from '../runtime-data';
import { AttentionRequests } from './waiters/AttentionRequests';
import { ServiceQueue } from './waiters/ServiceQueue';
import { TableGrid } from './waiters/TableGrid';
import {
    activeOrderFor,
    getServiceOrders,
    nextWaiterAction,
    orderColor,
    orderKey,
    tableKey,
    tableStatusStyles,
    waiterActionLabels,
    type AttentionItem,
    type DetailTarget,
} from './waiters/waiter-model';

export function WaitersView({
    orders = [],
    tables = [],
    onUpdateStatus,
    onAcknowledgeCall,
    isSaving = false,
}: {
    orders?: AdminOrder[];
    tables?: AdminTable[];
    onUpdateStatus?: (
        orderId: number | undefined,
        status: PosOrderStatus,
    ) => Promise<void> | void;
    onAcknowledgeCall?: (tableId: number | undefined) => Promise<void> | void;
    isSaving?: boolean;
}) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const [detail, setDetail] = useState<DetailTarget>(null);
    const [localError, setLocalError] = useState('');
    const tableStatuses = tableStatusStyles(t);

    const serviceOrders = useMemo(() => getServiceOrders(orders), [orders]);
    const readyOrders = serviceOrders.filter(
        (order) => order.rawStatus === 'ready',
    );
    const customerCalls = tables.filter(
        (table) => table.rawStatus === 'need_waiter',
    );
    const occupiedTables = tables.filter(
        (table) =>
            table.rawStatus !== 'available' && table.rawStatus !== 'inactive',
    );
    const attentions: AttentionItem[] = [
        ...customerCalls.map((table) => ({
            key: 'call-' + tableKey(table),
            kind: 'call' as const,
            code: table.code,
            title: isId
                ? 'Pelanggan membutuhkan bantuan'
                : 'Customer needs assistance',
            time: t('common.now'),
            table,
        })),
        ...readyOrders.map((order) => ({
            key: 'ready-' + orderKey(order),
            kind: 'ready' as const,
            code: order.table,
            title: order.name + ' · ' + t('waiters.readyToServeOrder'),
            time: order.time,
            order,
        })),
        ...serviceOrders
            .filter((order) => order.rawStatus === 'waiting_payment')
            .map((order) => ({
                key: 'bill-' + orderKey(order),
                kind: 'bill' as const,
                code: order.table,
                title: order.name + ' · ' + t('waiters.requestedBill'),
                time: order.time,
                order,
            })),
    ];

    const focusTable =
        detail?.kind === 'table'
            ? tables.find((table) => tableKey(table) === detail.key)
            : undefined;
    const focusOrder =
        detail?.kind === 'order'
            ? orders.find((order) => orderKey(order) === detail.key)
            : focusTable
              ? activeOrderFor(focusTable, orders)
              : undefined;
    const focusAction = focusOrder?.rawStatus
        ? nextWaiterAction[focusOrder.rawStatus]
        : undefined;
    const actionCopy = waiterActionLabels(t);

    const advance = async (order: AdminOrder) => {
        const action = order.rawStatus
            ? nextWaiterAction[order.rawStatus]
            : undefined;
        if (!action || !onUpdateStatus || order.id == null || isSaving) return;
        setLocalError('');
        try {
            await onUpdateStatus(order.id, action.status);
            setDetail(null);
        } catch (reason) {
            setLocalError(
                reason instanceof Error
                    ? reason.message
                    : 'Gagal memperbarui pesanan.',
            );
        }
    };
    const acknowledgeCall = async (table: AdminTable) => {
        if (!onAcknowledgeCall || table.id == null || isSaving) return;
        setLocalError('');
        try {
            await onAcknowledgeCall(table.id);
            setDetail(null);
        } catch (reason) {
            setLocalError(
                reason instanceof Error
                    ? reason.message
                    : 'Gagal menangani panggilan meja.',
            );
        }
    };
    const onAttention = (item: AttentionItem) => {
        if (item.kind === 'call' && item.table && onAcknowledgeCall)
            void acknowledgeCall(item.table);
        else if (item.kind === 'ready' && item.order && onUpdateStatus)
            void advance(item.order);
        else if (item.order)
            setDetail({ kind: 'order', key: orderKey(item.order) });
        else if (item.table)
            setDetail({ kind: 'table', key: tableKey(item.table) });
    };

    return (
        <section className="app-view active waiters-workspace">
            {localError && (
                <div
                    role="alert"
                    className="waiters-action-error text-body-2-regular"
                >
                    {localError}
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setLocalError('')}
                    >
                        {t('common.close')}
                    </Button>
                </div>
            )}

            <header className="topbar waiters-page-header">
                <AdminTitle
                    title={t('waiters.title')}
                    subtitle={t('waiters.subtitle')}
                />
            </header>

            <StatCards
                className="waiters-boardui-stats"
                columns={4}
                stats={[
                    {
                        icon: RiGroupLine,
                        label: t('waiters.activeTables'),
                        value: String(occupiedTables.length),
                        deltaColor: 'neutral',
                    },
                    {
                        icon: RiCheckboxCircleLine,
                        label: t('waiters.readyToServe'),
                        value: String(readyOrders.length),
                        deltaColor: 'neutral',
                    },
                    {
                        icon: RiBellLine,
                        label: t('waiters.customerCalls'),
                        value: String(customerCalls.length),
                        deltaColor: 'neutral',
                    },
                    {
                        icon: RiShoppingBag3Line,
                        label: t('waiters.serviceQueue'),
                        value: String(serviceOrders.length),
                        deltaColor: 'neutral',
                    },
                ]}
            />

            <AttentionRequests
                attentions={attentions}
                isSaving={isSaving}
                onAttention={onAttention}
            />

            <div className="waiters-work-grid">
                <ServiceQueue
                    orders={serviceOrders}
                    isSaving={isSaving}
                    canUpdateStatus={Boolean(onUpdateStatus)}
                    onAdvance={(order) => void advance(order)}
                    onOpenOrder={(order) =>
                        setDetail({ kind: 'order', key: orderKey(order) })
                    }
                />

                <TableGrid
                    tables={tables}
                    orders={orders}
                    onOpenTable={(table) =>
                        setDetail({ kind: 'table', key: tableKey(table) })
                    }
                />
            </div>

            {detail && (focusTable || focusOrder) && (
                <Drawer
                    isOpen
                    placement="end"
                    size="md"
                    onOpenChange={(open) => {
                        if (!open) setDetail(null);
                    }}
                    aria-label={isId ? 'Detail layanan' : 'Service details'}
                >
                    <DrawerHeader
                        title={focusTable?.name ?? focusOrder?.name ?? ''}
                        description={
                            focusTable
                                ? isId
                                    ? 'Informasi dan status meja'
                                    : 'Table information and status'
                                : isId
                                  ? 'Informasi pesanan dan tindakan'
                                  : 'Order information and action'
                        }
                        closeLabel={t('common.close')}
                    />
                    <DrawerBody className="waiters-detail-body">
                        {focusTable && (
                            <div className="waiters-detail-fields text-caption-1-regular">
                                <div>
                                    <span>{t('common.table')}</span>
                                    <strong className="text-body-2-semibold">
                                        {focusTable.code}
                                    </strong>
                                </div>
                                <div>
                                    <span>Area</span>
                                    <strong className="text-body-2-semibold">
                                        {focusTable.area}
                                    </strong>
                                </div>
                                <div>
                                    <span>{t('waiters.seats')}</span>
                                    <strong className="text-body-2-semibold">
                                        {focusTable.seats}
                                    </strong>
                                </div>
                                <div>
                                    <span>
                                        {isId ? 'Status meja' : 'Table status'}
                                    </span>
                                    <Chip
                                        color={
                                            tableStatuses[
                                                focusTable.rawStatus ??
                                                    'available'
                                            ].color
                                        }
                                        variant="caption"
                                    >
                                        {
                                            tableStatuses[
                                                focusTable.rawStatus ??
                                                    'available'
                                            ].label
                                        }
                                    </Chip>
                                </div>
                            </div>
                        )}
                        {focusOrder ? (
                            <>
                                <div className="waiters-detail-fields text-caption-1-regular">
                                    <div>
                                        <span>
                                            {isId ? 'Pesanan' : 'Order'}
                                        </span>
                                        <strong className="text-body-2-semibold">
                                            {focusOrder.orderNumber ??
                                                '#' + (focusOrder.id ?? '—')}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>{t('common.table')}</span>
                                        <strong className="text-body-2-semibold">
                                            {focusOrder.table}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Status</span>
                                        <Chip
                                            variant="caption"
                                            color={orderColor(
                                                focusOrder.rawStatus,
                                            )}
                                        >
                                            {focusOrder.status}
                                        </Chip>
                                    </div>
                                    <div>
                                        <span>{isId ? 'Waktu' : 'Time'}</span>
                                        <strong className="text-body-2-semibold">
                                            {focusOrder.time}
                                        </strong>
                                    </div>
                                </div>
                                <div className="waiters-detail-items text-body-2-regular">
                                    <h3 className="text-body-semibold">
                                        {isId ? 'Item pesanan' : 'Order items'}
                                    </h3>
                                    {focusOrder.items?.length ? (
                                        focusOrder.items.map(
                                            ([name, qty], index) => (
                                                <div key={name + '-' + index}>
                                                    <span>{name}</span>
                                                    <strong className="text-body-2-semibold">
                                                        ×{qty}
                                                    </strong>
                                                </div>
                                            ),
                                        )
                                    ) : (
                                        <p>
                                            {isId
                                                ? 'Belum ada detail item.'
                                                : 'No item details available.'}
                                        </p>
                                    )}
                                </div>
                                {focusOrder.notes && (
                                    <p className="waiters-order-notes text-caption-1-regular">
                                        {focusOrder.notes}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="waiters-dialog-note text-caption-1-regular">
                                {isId
                                    ? 'Belum ada pesanan aktif yang terhubung ke meja ini.'
                                    : 'No active order is linked to this table.'}
                            </p>
                        )}
                    </DrawerBody>
                    <DrawerFooter>
                        {focusTable?.rawStatus === 'need_waiter' &&
                            onAcknowledgeCall &&
                            focusTable.id != null && (
                                <Button
                                    disabled={isSaving}
                                    onClick={() =>
                                        void acknowledgeCall(focusTable)
                                    }
                                >
                                    {isSaving
                                        ? isId
                                            ? 'Menyimpan…'
                                            : 'Saving…'
                                        : isId
                                          ? 'Tandai panggilan ditangani'
                                          : 'Mark call handled'}
                                </Button>
                            )}
                        {focusAction &&
                            onUpdateStatus &&
                            focusOrder?.id != null && (
                                <Button
                                    disabled={isSaving}
                                    onClick={() => void advance(focusOrder)}
                                >
                                    {actionCopy[focusAction.label]}
                                </Button>
                            )}
                        <Button
                            variant="secondary"
                            onClick={() => setDetail(null)}
                        >
                            {t('common.close')}
                        </Button>
                    </DrawerFooter>
                </Drawer>
            )}
        </section>
    );
}
