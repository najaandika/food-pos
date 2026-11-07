import { RiTimeLine } from '@remixicon/react';
import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import { Button } from '../../../../../../components/base/buttons/button';
import { StatusDot } from '../../../../../../components/base/badges/status-dot';
import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';
import {
    countItems,
    nextOrderStatus,
    orderActionLabel,
    orderIdentity,
    orderNumber,
    orderSourceLabel,
} from './order-ui';
import { StatusChip } from './StatusChip';

export type OrderGroupKey =
    | 'queue'
    | 'kitchen'
    | 'ready'
    | 'payment'
    | 'history';

export type OrderColumn = {
    key: OrderGroupKey;
    label: string;
    hint: string;
    statuses: PosOrderStatus[];
    items: AdminOrder[];
};

type Props = {
    columns: OrderColumn[];
    role: UserRole;
    onSelect: (order: AdminOrder) => void;
    onMove: (order: AdminOrder) => void;
    canUpdate: boolean;
};

const groupColors: Record<OrderGroupKey, 'yellow' | 'indigo' | 'green'> = {
    queue: 'yellow',
    kitchen: 'indigo',
    ready: 'green',
    payment: 'yellow',
    history: 'indigo',
};

/** Four operational groups instead of six narrow status lanes. Every order
 * retains its granular server status and its role-controlled next action. */
export function OrdersBoard({
    columns,
    role,
    onSelect,
    onMove,
    canUpdate,
}: Props) {
    const { locale, t } = useLocale();
    const isId = locale === 'id';

    return (
        <div
            className="orders-kanban-track"
            aria-label={
                isId ? 'Papan antrean pesanan' : 'Order operations board'
            }
        >
            {columns.map(({ key, label, hint, items }) => (
                <section
                    className="orders-stage-column"
                    data-group={key}
                    key={key}
                    aria-labelledby={'orders-group-' + key}
                >
                    <header className="orders-stage-head">
                        <div className="orders-stage-copy">
                            <StatusDot color={groupColors[key]} />
                            <div>
                                <h2
                                    id={'orders-group-' + key}
                                    className="text-body-semibold"
                                >
                                    {label}
                                </h2>
                                <p className="text-caption-1-regular">{hint}</p>
                            </div>
                        </div>
                        <span
                            className="orders-stage-count text-caption-1-bold"
                            aria-label={
                                String(items.length) +
                                (isId ? ' pesanan' : ' orders')
                            }
                        >
                            {items.length}
                        </span>
                    </header>
                    <div className="orders-stage-stack">
                        {items.map((order) => {
                            const next = nextOrderStatus(role, order.rawStatus);
                            const canAdvance =
                                canUpdate && order.id != null && next !== null;
                            return (
                                <article
                                    className="orders-ticket"
                                    data-status={order.rawStatus ?? 'unknown'}
                                    key={orderIdentity(order)}
                                >
                                    <button
                                        type="button"
                                        className="orders-ticket-open"
                                        onClick={() => onSelect(order)}
                                        aria-label={
                                            (isId
                                                ? 'Detail pesanan '
                                                : 'Order details ') +
                                            orderNumber(order) +
                                            ', ' +
                                            order.name
                                        }
                                    >
                                        <div className="orders-ticket-top">
                                            <span
                                                className="orders-ticket-number text-body-semibold"
                                                title={orderNumber(order)}
                                            >
                                                {orderNumber(order)}
                                            </span>
                                            <StatusChip
                                                status={order.rawStatus}
                                                fallbackLabel={order.status}
                                            />
                                        </div>
                                        <div className="orders-ticket-person">
                                            <strong
                                                className="text-body-medium"
                                                title={order.name}
                                            >
                                                {order.name}
                                            </strong>
                                            <span
                                                className="orders-ticket-table text-caption-1-medium"
                                                title={order.table}
                                            >
                                                {order.table}
                                            </span>
                                        </div>
                                        <div className="orders-ticket-subline text-caption-1-regular">
                                            <span>
                                                <RiTimeLine aria-hidden="true" />
                                                {order.time}
                                            </span>
                                            <span>
                                                {countItems(order)}{' '}
                                                {isId ? 'item' : 'items'}
                                            </span>
                                            <span
                                                className="orders-ticket-source text-caption-1-medium"
                                                data-source={
                                                    order.source ?? 'unknown'
                                                }
                                                title={orderSourceLabel(
                                                    order.source,
                                                    t,
                                                )}
                                            >
                                                {order.source === 'qr'
                                                    ? 'QR'
                                                    : order.source === 'manual'
                                                      ? isId
                                                          ? 'Manual'
                                                          : 'Manual'
                                                      : orderSourceLabel(
                                                            order.source,
                                                            t,
                                                        )}
                                            </span>
                                        </div>
                                        {order.items.length > 0 && (
                                            <div className="orders-ticket-items">
                                                {order.items
                                                    .slice(0, 2)
                                                    .map(
                                                        (
                                                            [name, quantity],
                                                            index,
                                                        ) => (
                                                            <p
                                                                key={
                                                                    name + index
                                                                }
                                                            >
                                                                <span>
                                                                    {name}
                                                                </span>
                                                                <b>
                                                                    ×{quantity}
                                                                </b>
                                                            </p>
                                                        ),
                                                    )}
                                                {order.items.length > 2 && (
                                                    <small>
                                                        +
                                                        {order.items.length - 2}{' '}
                                                        {isId
                                                            ? 'jenis lainnya'
                                                            : 'more items'}
                                                    </small>
                                                )}
                                            </div>
                                        )}
                                        {order.notes?.trim() && (
                                            <p className="orders-ticket-note">
                                                <span className="orders-ticket-note-label text-caption-2-semibold">
                                                    {isId ? 'Catatan' : 'Note'}
                                                </span>
                                                <span className="orders-ticket-note-copy text-caption-1-regular">
                                                    {order.notes.trim()}
                                                </span>
                                            </p>
                                        )}
                                    </button>
                                    <div className="orders-ticket-footer">
                                        <strong className="text-body-semibold">
                                            {order.total}
                                        </strong>
                                        {canAdvance ? (
                                            <Button
                                                size="small"
                                                variant={
                                                    order.rawStatus ===
                                                        'pending' ||
                                                    order.rawStatus === 'ready'
                                                        ? 'primary'
                                                        : 'secondary'
                                                }
                                                className="orders-ticket-action"
                                                onClick={() => onMove(order)}
                                                aria-label={
                                                    orderActionLabel(
                                                        order.rawStatus as PosOrderStatus,
                                                        t,
                                                    ) +
                                                    ' ' +
                                                    orderNumber(order)
                                                }
                                            >
                                                {orderActionLabel(
                                                    order.rawStatus as PosOrderStatus,
                                                    t,
                                                )}
                                            </Button>
                                        ) : (
                                            <span className="orders-ticket-view-hint text-caption-2-medium">
                                                {isId
                                                    ? 'Lihat detail'
                                                    : 'View details'}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                        {items.length === 0 && (
                            <div className="orders-stage-empty">
                                <span aria-hidden="true">—</span>
                                <p>
                                    {isId
                                        ? 'Belum ada pesanan di tahap ini'
                                        : 'No orders in this stage'}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            ))}
        </div>
    );
}
