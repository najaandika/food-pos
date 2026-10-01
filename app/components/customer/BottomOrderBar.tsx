import type { ReactNode } from 'react';
import styles from '../../table/[code]/Customer.module.css';
import { Button } from '../ui/Button';

type BottomOrderBarProps = {
  itemCount: number;
  total: string;
  icon: ReactNode;
  onReview: () => void;
  itemCountLabel?: string;
  reviewLabel?: string;
};

export function BottomOrderBar({
  itemCount,
  total,
  icon,
  onReview,
  itemCountLabel = 'items',
  reviewLabel = 'Review',
}: BottomOrderBarProps) {
  return (
    <Button className={styles['customer-bottom-cart']} onClick={onReview}>
      <span>
        {itemCount} {itemCountLabel}
      </span>
      <strong>{total}</strong>
      <b>
        {icon} {reviewLabel}
      </b>
    </Button>
  );
}
