'use client';

import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

type Props = {
  selectedOrder: AdminOrder | undefined;
  role: UserRole;
  onMove: (order: AdminOrder) => void;
  roleNextStatus: Record<UserRole, Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>>>;
};

export function OrderDetail({ selectedOrder, role, onMove, roleNextStatus }: Props) {
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

  const workflowSteps: Array<{ label: string; statuses: PosOrderStatus[] }> = [
    { label: t('orders.accept'), statuses: ['pending'] },
    { label: t('orders.kitchen'), statuses: ['accepted', 'preparing'] },
    { label: t('orders.ready'), statuses: ['ready'] },
    { label: t('orders.serve'), statuses: ['served'] },
    { label: t('orders.billing'), statuses: ['waiting_payment', 'paid'] },
  ];

  const formatSource = (source?: AdminOrder['source']) => {
    return source === 'manual' ? t('orders.manualOrder') : t('orders.qrTableOrdering');
  };

  return (
    <aside className="order-detail-panel">
      <div className="cashier-detail-top">
        <div>
          <span className="mini-status ready">{t('orders.selectedOrder')}</span>
          <h2>{selectedOrder?.name ?? t('orders.noOrderSelected')}</h2>
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
        <span>{t('orders.source')}</span>
        <strong>{formatSource(selectedOrder?.source)}</strong>
        <p>{selectedOrder?.notes ?? t('orders.noCustomerNote')}</p>
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
        <button type="button">{t('common.print')}</button>
        <button
          type="button"
          disabled={!selectedOrder?.rawStatus || !roleNextStatus[role][selectedOrder.rawStatus]}
          onClick={() => selectedOrder && onMove(selectedOrder)}
        >
          {selectedOrder?.rawStatus ? (roleNextStatus[role][selectedOrder.rawStatus] ? getActionLabel(roleNextStatus[role][selectedOrder.rawStatus]?.label) : getStatusLabel(selectedOrder.rawStatus)) : t('orders.update')}
        </button>
      </div>
    </aside>
  );
}
