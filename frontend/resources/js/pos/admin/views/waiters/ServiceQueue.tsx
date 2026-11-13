import { useState } from 'react';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { Chip } from '../../../../../../components/base/badges/chip';
import { StatusChip } from '../orders/StatusChip';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import { cx } from '../../../../../../utils/cx';
import { useLocale } from '../../i18n-context';
import type { AdminOrder } from '../../runtime-data';
import { displayOrderReference } from '../../presentation-labels';
import {
    filterQueueOrders,
    nextWaiterAction,
    orderKey,
    waiterActionLabels,
    type QueueFilter,
} from './waiter-model';

type ServiceQueueProps = {
    orders: AdminOrder[];
    isSaving: boolean;
    canUpdateStatus: boolean;
    onAdvance: (order: AdminOrder) => void;
    onOpenOrder: (order: AdminOrder) => void;
};

export function ServiceQueue({
    orders,
    isSaving,
    canUpdateStatus,
    onAdvance,
    onOpenOrder,
}: ServiceQueueProps) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
    const [queueLimit, setQueueLimit] = useState(5);
    const visibleOrders = filterQueueOrders(orders, queueFilter);
    const actionCopy = waiterActionLabels(t);
    const queueOptions: Array<{ key: QueueFilter; label: string }> = [
        { key: 'all', label: t('orders.all') },
        { key: 'ready', label: t('dashboard.ready') },
        { key: 'inProgress', label: t('dashboard.preparing') },
        { key: 'billing', label: t('orders.billing') },
    ];

    return (
        <aside
            className="waiters-boardui-panel waiters-queue"
            aria-labelledby="waiters-queue-heading"
        >
            <div className="waiters-section-head text-body-2-regular">
                <div>
                    <p className="waiters-section-label text-caption-2-semibold">
                        {isId ? 'ALUR PESANAN' : 'ORDER WORKFLOW'}
                    </p>
                    <h2
                        id="waiters-queue-heading"
                        className="text-title-3-semibold"
                    >
                        {t('waiters.serviceQueue')}
                    </h2>
                    <p>{t('waiters.serviceQueueDesc')}</p>
                </div>
                <Chip color="blue" variant="caption">
                    {orders.length}
                </Chip>
            </div>
            <div className="waiters-filter-scroll">
                <SegmentedControl
                    className="waiters-boardui-segments"
                    aria-label={
                        isId ? 'Filter antrean layanan' : 'Filter service queue'
                    }
                    selectedKeys={new Set([queueFilter])}
                    onSelectionChange={(keys) => {
                        const next = Array.from(keys)[0];
                        if (
                            next === 'all' ||
                            next === 'ready' ||
                            next === 'inProgress' ||
                            next === 'billing'
                        ) {
                            setQueueFilter(next);
                            setQueueLimit(5);
                        }
                    }}
                >
                    {queueOptions.map((item) => (
                        <SegmentedControlItem id={item.key} key={item.key}>
                            {item.label}
                        </SegmentedControlItem>
                    ))}
                </SegmentedControl>
            </div>
            <div className="waiters-queue-list">
                {visibleOrders.slice(0, queueLimit).map((order) => {
                    const action = order.rawStatus
                        ? nextWaiterAction[order.rawStatus]
                        : undefined;
                    const canAdvance =
                        !!action && canUpdateStatus && order.id != null;
                    return (
                        <article
                            className={cx(
                                'waiters-queue-card',
                                order.rawStatus === 'ready' && 'is-priority',
                            )}
                            key={orderKey(order)}
                        >
                            <div className="waiters-queue-card-top">
                                <span className="waiters-queue-table text-body-semibold">
                                    {order.table}
                                </span>
                                <StatusChip
                                    status={order.rawStatus}
                                    fallbackLabel={order.status}
                                    variant="caption"
                                />
                            </div>
                            <div className="waiters-queue-person text-body-2-regular">
                                <strong className="text-body-semibold">
                                    {order.name}
                                </strong>
                                <p>
                                    {order.orderNumber
                                        ? displayOrderReference(
                                              order.orderNumber,
                                          )
                                        : order.meta}{' '}
                                    · {order.time}
                                </p>
                            </div>
                            <div className="waiters-queue-card-actions">
                                {canAdvance && (
                                    <Button
                                        size="small"
                                        disabled={isSaving}
                                        onClick={() => onAdvance(order)}
                                    >
                                        {actionCopy[action.label]}
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    variant="secondary"
                                    onClick={() => onOpenOrder(order)}
                                >
                                    {t('common.details')}
                                </Button>
                            </div>
                        </article>
                    );
                })}
                {!visibleOrders.length && (
                    <div className="waiters-boardui-empty text-body-2-regular">
                        <RiCheckboxCircleLine aria-hidden="true" />
                        <p>{t('waiters.noActions')}</p>
                    </div>
                )}
                {visibleOrders.length > queueLimit && (
                    <Button
                        variant="secondary"
                        size="small"
                        className="waiters-queue-more"
                        onClick={() => setQueueLimit((current) => current + 5)}
                    >
                        {isId
                            ? 'Tampilkan ' +
                              Math.min(5, visibleOrders.length - queueLimit) +
                              ' pesanan lagi'
                            : 'Show ' +
                              Math.min(5, visibleOrders.length - queueLimit) +
                              ' more orders'}
                    </Button>
                )}
            </div>
        </aside>
    );
}
