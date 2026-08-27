import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

type CustomerStatusProps = {
  tableCode: string;
  orderNumber: string;
  icon: ReactNode;
  onAddMore: () => void;
};

export function CustomerStatus({ tableCode, orderNumber, icon, onAddMore }: CustomerStatusProps) {
  return (
    <main className="customer-page">
      <section className="customer-status">
        <div className="customer-status-icon">{icon}</div>
        <span className="customer-pill">Table {tableCode.toUpperCase()}</span>
        <h1>Order received</h1>
        <p>Your order is waiting for staff confirmation. We will update the table as soon as it moves to kitchen.</p>
        <div className="status-card">
          <span>Order Number</span>
          <strong>{orderNumber}</strong>
          <small>Estimated confirmation 2-3 min</small>
        </div>
        <div className="status-steps">
          <div className="active"><b>1</b><span>Pending</span></div>
          <div><b>2</b><span>Preparing</span></div>
          <div><b>3</b><span>Ready</span></div>
          <div><b>4</b><span>Served</span></div>
        </div>
        <Button className="customer-primary" onClick={onAddMore}>Add more items</Button>
      </section>
    </main>
  );
}
