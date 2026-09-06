import type { ReactNode } from 'react';
import styles from '../../table/[code]/Customer.module.css';
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
  cafeName = 'POS',
  isOrderingOpen = true,
}: CustomerHeroProps) {
  return (
    <header className={styles['customer-hero']}>
      <div>
        <div className={styles['customer-topline']}>
          <span className={styles['customer-pill']}>Table {tableCode.toUpperCase()}</span>
          <span className={styles['customer-open']}>{isOrderingOpen ? 'Open now' : 'Ordering paused'}</span>
        </div>
        <h1>{cafeName}</h1>
        <p>Scan, order, and relax. We bring everything to your table.</p>
        <div className={styles['customer-hero-meta']}>
          <span>Avg serve 8 min</span>
          <span>No queue at cashier</span>
        </div>
      </div>
      <Button className={styles['cart-fab']} variant="secondary" onClick={onOpenOrder}>
        <span>{itemCount}</span>
        {orderIcon}
        Order
      </Button>
    </header>
  );
}
