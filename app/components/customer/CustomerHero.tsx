import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

type CustomerHeroProps = {
  tableCode: string;
  itemCount: number;
  orderIcon: ReactNode;
  onOpenOrder: () => void;
};

export function CustomerHero({ tableCode, itemCount, orderIcon, onOpenOrder }: CustomerHeroProps) {
  return (
    <header className="customer-hero">
      <div>
        <div className="customer-topline">
          <span className="customer-pill">Table {tableCode.toUpperCase()}</span>
          <span className="customer-open">Open now</span>
        </div>
        <h1>Bloc Barat Cafe</h1>
        <p>Scan, order, and relax. We bring everything to your table.</p>
        <div className="customer-hero-meta">
          <span>Avg serve 8 min</span>
          <span>No queue at cashier</span>
        </div>
      </div>
      <Button className="cart-fab" variant="secondary" onClick={onOpenOrder}>
        <span>{itemCount}</span>
        {orderIcon}
        Order
      </Button>
    </header>
  );
}
