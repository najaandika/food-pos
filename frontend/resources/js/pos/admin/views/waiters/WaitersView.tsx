import { useMemo, useState } from 'react';
import {
    RiBellLine,
    RiCheckboxCircleLine,
    RiGroupLine,
    RiShoppingBag3Line,
} from '@remixicon/react';
import { StatCards } from '../../../../../../components/application/dashboard/stat-cards';
import { Button } from '../../../../../../components/base/buttons/button';
import type { PosOrderStatus } from '../../../../lib/pos-types';
import { AdminTitle } from '../..';
import { useLocale } from '../../i18n-context';
import type { AdminOrder, AdminTable } from '../../runtime-data';
import { AttentionRequests } from './AttentionRequests';
import { ServiceQueue } from './ServiceQueue';
import { TableGrid } from './TableGrid';
import { WaiterDetailDrawer } from './WaiterDetailDrawer';
import { deriveWaiterBoard, resolveWaiterFocus } from './waiters-view-data';
import {
    getServiceOrders,
    nextWaiterAction,
    orderKey,
    tableKey,
    tableStatusStyles,
    waiterActionLabels,
    type AttentionItem,
    type DetailTarget,
} from './waiter-model';

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
    const { readyOrders, customerCalls, occupiedTables, attentions } =
        deriveWaiterBoard(serviceOrders, tables, isId, t);

    const { focusTable, focusOrder } = resolveWaiterFocus(
        detail,
        tables,
        orders,
    );
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
                <WaiterDetailDrawer
                    focusTable={focusTable}
                    focusOrder={focusOrder}
                    focusAction={focusAction}
                    tableStatuses={tableStatuses}
                    actionCopy={actionCopy}
                    isId={isId}
                    isSaving={isSaving}
                    onUpdateStatus={onUpdateStatus}
                    onAcknowledgeCall={onAcknowledgeCall}
                    advance={advance}
                    acknowledgeCall={acknowledgeCall}
                    onClose={() => setDetail(null)}
                    t={t}
                />
            )}
        </section>
    );
}
