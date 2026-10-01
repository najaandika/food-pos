'use client';

import type { CSSProperties } from 'react';
import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

type Props = {
  columns: Array<{ title: string; hint: string; items: AdminOrder[] }>;
  role: UserRole;
  selectedOrder: AdminOrder | undefined;
  onSelect: (id: number | undefined) => void;
  onMove: (order: AdminOrder) => void;
  roleNextStatus: Record<UserRole, Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>>>;
};

export function OrdersBoard({ columns, role, selectedOrder, onSelect, onMove, roleNextStatus }: Props) {
  const { t } = useLocale();

  const getStatusLabel = (status: PosOrderStatus) => {
    const key = `status.${status}`;
    const val = t(key);
    return val !== key ? val : status;
  };

  const getActionLabel = (actionLabel?: string) => {
    if (!actionLabel) return t('orders.update');
    if (actionLabel === 'Accept') return t('orders.accept');
    if (actionLabel === 'Kitchen') return t('orders.kitchen');
    if (actionLabel === 'Ready') return t('orders.ready');
    if (actionLabel === 'Serve') return t('orders.serve');
    if (actionLabel === 'Send Bill') return t('orders.sendBill');
    return actionLabel;
  };

  const statusStage: Record<PosOrderStatus, { label: string; tone: string }> = {
    pending: { label: t('orders.new'), tone: 'new' },
    accepted: { label: t('status.accepted'), tone: 'kitchen' },
    preparing: { label: t('orders.kitchen'), tone: 'kitchen' },
    ready: { label: t('orders.ready'), tone: 'ready' },
    served: { label: t('orders.served'), tone: 'served' },
    waiting_payment: { label: t('orders.billing'), tone: 'billing' },
    paid: { label: t('status.paid'), tone: 'paid' },
    cancelled: { label: t('status.cancelled'), tone: 'cancelled' },
  };

  const formatSource = (source?: AdminOrder['source']) => {
    return source === 'manual' ? t('orders.manualOrder') : t('orders.qrTableOrdering');
  };

  return (
    <section className="orders-kanban" style={{ '--order-columns': columns.length } as CSSProperties}>
      {columns.map((column) => (
        <div className="kanban-column" key={column.title}>
          <div className="kanban-head">
            <div>
              <h2>{column.title}</h2>
              <p>{column.hint}</p>
            </div>
            <span>{column.items.length}</span>
          </div>
          <div className="kanban-list">
            {column.items.map((order) => {
              const action = order.rawStatus ? roleNextStatus[role][order.rawStatus] : undefined;
              const stage = order.rawStatus ? statusStage[order.rawStatus] : undefined;
              return (
                <article
                  className={`kanban-card ${order.id === selectedOrder?.id ? 'highlight' : ''}`}
                  key={order.id ?? `${column.title}-${order.name}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(order.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    onSelect(order.id);
                  }}
                >
                  <div className="kanban-card-top">
                    <span className={`table-pill ${order.tone}`}>{order.table}</span>
                    <div>
                      <strong>{order.name}</strong>
                      <small>{order.meta}</small>
                    </div>
                  </div>
                  {stage && <span className={`workflow-chip ${stage.tone}`}>{stage.label}</span>}
                  <div className="kanban-meta">
                    <span>{formatSource(order.source)}</span>
                    <b>{order.time}</b>
                  </div>
                  <div className="kanban-items">
                    {order.items.slice(0, 2).map(([name, qty], index) => (
                      <p key={`${order.id ?? order.orderNumber}-${name}-${index}`}>
                        <span>{name}</span>
                        <b>x{qty}</b>
                      </p>
                    ))}
                    {order.items.length > 2 && <em>+{order.items.length - 2} {t('orders.moreItems')}</em>}
                  </div>
                  <div className="kanban-card-bottom">
                    <strong>{order.total}</strong>
                    <button
                      type="button"
                      disabled={!action}
                      onClick={(event) => {
                        event.stopPropagation();
                        onMove(order);
                      }}
                    >
                      {action ? getActionLabel(action.label) : (order.rawStatus ? getStatusLabel(order.rawStatus) : t('orders.update'))}
                    </button>
                  </div>
                </article>
              );
            })}
            {column.items.length === 0 && (
              <div className="kanban-empty">
                <strong>{t('orders.noTickets')}</strong>
                <span>{t('orders.autoAppear')}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
