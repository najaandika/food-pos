import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import type { PosOrderStatus } from '../../../lib/pos-types';

type CustomerStatusProps = {
  tableCode: string;
  orderId: number | null;
  orderNumber: string;
  icon: ReactNode;
  onAddMore: () => void;
};

type PublicOrderStatus = {
  status: PosOrderStatus;
  itemCount: number;
  total: number;
};

const statusCopy: Record<PosOrderStatus, { title: string; body: string; activeStep: number }> = {
  pending: {
    title: 'Order received',
    body: 'Your order is waiting for staff confirmation. We will update this screen as soon as it moves to kitchen.',
    activeStep: 1,
  },
  accepted: {
    title: 'Order confirmed',
    body: 'Staff accepted your order. The kitchen will start preparing it shortly.',
    activeStep: 2,
  },
  preparing: {
    title: 'Preparing your order',
    body: 'Your order is being prepared. Please relax at your table while we handle it.',
    activeStep: 2,
  },
  ready: {
    title: 'Ready to serve',
    body: 'Your order is ready. A waiter will bring it to your table soon.',
    activeStep: 3,
  },
  served: {
    title: 'Order served',
    body: 'Enjoy your order. You can request the bill when you are ready.',
    activeStep: 4,
  },
  waiting_payment: {
    title: 'Bill requested',
    body: 'Your bill has been sent to the cashier. Please complete payment when ready.',
    activeStep: 5,
  },
  paid: {
    title: 'Payment complete',
    body: 'Thank you. Your order has been closed.',
    activeStep: 5,
  },
  cancelled: {
    title: 'Order cancelled',
    body: 'This order has been cancelled. Please contact staff if you need help.',
    activeStep: 1,
  },
};

const statusSteps = [
  { label: 'Pending' },
  { label: 'Kitchen' },
  { label: 'Ready' },
  { label: 'Served' },
  { label: 'Paid' },
];

export function CustomerStatus({ tableCode, orderId, orderNumber, icon, onAddMore }: CustomerStatusProps) {
  const [orderStatus, setOrderStatus] = useState<PublicOrderStatus | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let isActive = true;
    const loadStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
        if (!response.ok) return;
        const nextOrder = await response.json();
        if (isActive) setOrderStatus(nextOrder);
      } catch {
        // Keep the last visible state when a polling request drops.
      }
    };

    void loadStatus();
    const interval = window.setInterval(loadStatus, 5000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  const currentStatus = orderStatus?.status ?? 'pending';
  const copy = statusCopy[currentStatus];
  const activeStep = copy.activeStep;
  const canAddMore = !['waiting_payment', 'paid', 'cancelled'].includes(currentStatus);
  const helperText = useMemo(() => {
    if (!orderStatus) return 'Estimated confirmation 2-3 min';
    if (currentStatus === 'paid') return 'Closed by cashier';
    return `${orderStatus.itemCount} items in this order`;
  }, [currentStatus, orderStatus]);

  return (
    <main className="customer-page">
      <section className="customer-status">
        <div className="customer-status-icon">{icon}</div>
        <span className="customer-pill">Table {tableCode.toUpperCase()}</span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="status-card">
          <span>Order Number</span>
          <strong>{orderNumber}</strong>
          <small>{helperText}</small>
        </div>
        <div className="status-steps">
          {statusSteps.map((step, index) => (
            <div className={index + 1 <= activeStep ? 'active' : ''} key={step.label}>
              <b>{index + 1}</b>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
        {canAddMore && <Button className="customer-primary" onClick={onAddMore}>Add more items</Button>}
      </section>
    </main>
  );
}
