'use client';

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

const workflowSteps: Array<{ label: string; statuses: PosOrderStatus[] }> = [
  { label: 'Accept', statuses: ['pending'] },
  { label: 'Kitchen', statuses: ['accepted', 'preparing'] },
  { label: 'Ready', statuses: ['ready'] },
  { label: 'Serve', statuses: ['served'] },
  { label: 'Bill', statuses: ['waiting_payment', 'paid'] },
];

function formatSource(source?: AdminOrder['source']) {
  return source === 'manual' ? 'Manual Order' : 'QR Table Ordering';
}

type Props = {
  selectedOrder: AdminOrder | undefined;
  role: UserRole;
  onMove: (order: AdminOrder) => void;
  roleNextStatus: Record<UserRole, Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>>>;
};

export function OrderDetail({ selectedOrder, role, onMove, roleNextStatus }: Props) {
  return (
    <aside className="order-detail-panel">
      <div className="cashier-detail-top">
        <div>
          <span className="mini-status ready">Selected Order</span>
          <h2>{selectedOrder?.name ?? 'No order selected'}</h2>
          <p>
            {selectedOrder?.meta} - {selectedOrder?.time}
          </p>
        </div>
        <span className={`table-pill ${selectedOrder?.tone ?? 'teal'}`}>{selectedOrder?.table ?? '-'}</span>
      </div>
      {selectedOrder?.rawStatus && (
        <div className="workflow-progress" aria-label="Order workflow">
          {workflowSteps.map((step) => {
            const currentIndex = workflowSteps.findIndex((item) => item.statuses.includes(selectedOrder.rawStatus as PosOrderStatus));
            const stepIndex = workflowSteps.findIndex((item) => item.label === step.label);
            return (
              <span className={stepIndex <= currentIndex ? 'active' : ''} key={step.label}>
                <b>{stepIndex + 1}</b>
                {step.label}
              </span>
            );
          })}
        </div>
      )}
      <div className="order-source-box">
        <span>Source</span>
        <strong>{formatSource(selectedOrder?.source)}</strong>
        <p>{selectedOrder?.notes ?? 'No customer note for this order.'}</p>
      </div>
      <div className="cashier-items">
        {(selectedOrder?.items ?? []).map(([name, qty, price], index) => (
          <div key={`${selectedOrder?.id ?? selectedOrder?.orderNumber}-${name}-${index}`}>
            <span>{name}</span>
            <b>x{qty}</b>
            <strong>{price}</strong>
          </div>
        ))}
      </div>
      <div className="cashier-actions">
        <button type="button">Print</button>
        <button
          type="button"
          disabled={!selectedOrder?.rawStatus || !roleNextStatus[role][selectedOrder.rawStatus]}
          onClick={() => selectedOrder && onMove(selectedOrder)}
        >
          {selectedOrder?.rawStatus ? (roleNextStatus[role][selectedOrder.rawStatus]?.label ?? statusLabels[selectedOrder.rawStatus]) : 'Update'}
        </button>
      </div>
    </aside>
  );
}
