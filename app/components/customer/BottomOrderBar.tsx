import type { ReactNode } from 'react';
import styles from '../../table/[code]/Customer.module.css';
import { Button } from '../ui/Button';

type BottomOrderBarProps = {
  itemCount: number;
  total: string;
  icon: ReactNode;
  onReview: () => void;
};

export function BottomOrderBar({ itemCount, total, icon, onReview }: BottomOrderBarProps) {
  return (
    <Button className={styles['customer-bottom-cart']} onClick={onReview}>
      <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
      <strong>{total}</strong>
      <b>{icon} Review</b>
    </Button>
  );
}
