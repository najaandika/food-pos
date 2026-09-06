'use client';

import type { CSSProperties } from 'react';
import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import type { AdminOrder } from '../../runtime-data';

const statusLabels: Record<PosOrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  waiting_payment: 'Waiting Payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

const statusStage: Record<PosOrderStatus, { label: string; tone: string; helper: string }> = {
  pending: { label: 'New order', tone: 'new', helper: 'Needs staff confirmation' },
  accepted: { label: 'Accepted', tone: 'kitchen', helper: 'Send to kitchen or bar' },
  preparing: { label: 'In kitchen', tone: 'kitchen', helper: 'Preparing now' },
  ready: { label: 'Ready', tone: 'ready', helper: 'Serve to table' },
  served: { label: 'Served', tone: 'served', helper: 'Ask or send bill' },
  waiting_payment: { label: 'Billing', tone: 'billing', helper: 'Cashier action needed' },
  paid: { label: 'Paid', tone: 'paid', helper: 'Closed transaction' },
  cancelled: { label: 'Cancelled', tone: 'cancelled', helper: 'No action needed' },
};

function formatSource(source?: AdminOrder['source']) {
  return source === 'manual' ? 'Manual Order' : 'QR Table Ordering';
}

type Props = {
  columns: Array<{ title: string; hint: string; items: AdminOrder[] }>;
  role: UserRole;
  selectedOrder: AdminOrder | undefined;
  onSelect: (id: number | undefined) => void;
  onMove: (order: AdminOrder) => void;
  roleNextStatus: Record<UserRole, Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>>>;
};

export function OrdersBoard({ columns, role, selectedOrder, onSelect, onMove, roleNextStatus }: Props) {
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
                  onClick={() => onSelect(order.id)}
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
                    {order.items.length > 2 && <em>+{order.items.length - 2} more items</em>}
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
                      {action?.label ?? (order.rawStatus ? statusLabels[order.rawStatus] : 'Update')}
                    </button>
                  </div>
                </article>
              );
            })}
            {column.items.length === 0 && (
              <div className="kanban-empty">
                <strong>No {column.title.toLowerCase()} tickets</strong>
                <span>New orders will appear here automatically.</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
