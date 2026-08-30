import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

type CustomerHeroProps = {
  tableCode: string;
  itemCount: number;
  orderIcon: ReactNode;
  onOpenOrder: () => void;
  cafeName?: string;
  isOrderingOpen?: boolean;
};

export function CustomerHero({
  tableCode,
  itemCount,
  orderIcon,
  onOpenOrder,
  cafeName = 'Bloc Barat Cafe',
  isOrderingOpen = true,
}: CustomerHeroProps) {
  return (
    <header className="customer-hero">
      <div>
        <div className="customer-topline">
          <span className="customer-pill">Table {tableCode.toUpperCase()}</span>
          <span className="customer-open">{isOrderingOpen ? 'Open now' : 'Ordering paused'}</span>
        </div>
        <h1>{cafeName}</h1>
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
