import { Button } from '../ui/Button';
import { Stepper } from '../ui/Stepper';
import type { CustomerMenuItem } from './types';
import Image from 'next/image';
import styles from '../../table/[code]/Customer.module.css';

type MenuCardProps = {
  item: CustomerMenuItem;
  quantity: number;
  formattedPrice: string;
  onAdd: () => void;
  onRemove: () => void;
};

export function MenuCard({ item, quantity, formattedPrice, onAdd, onRemove }: MenuCardProps) {
  return (
    <article className={styles['customer-menu-item']}>
      <div className={styles['customer-menu-image']}>
        <Image src={item.image} alt={item.name} width={600} height={400} />
        {item.badge && <span className={styles['menu-badge']}>{item.badge}</span>}
      </div>
      <div>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <div className={styles['customer-item-meta']}>
          <span>{item.category}</span>
          <span>{item.id % 2 ? 'Ready soon' : 'Staff pick'}</span>
        </div>
        <div className={styles['menu-item-bottom']}>
          <strong>{formattedPrice}</strong>
          {quantity ? (
            <Stepper
              className={styles['menu-qty-pill']}
              label={item.name}
              value={quantity}
              onDecrement={onRemove}
              onIncrement={onAdd}
            />
          ) : (
            <Button onClick={onAdd}>Add</Button>
          )}
        </div>
      </div>
    </article>
  );
}
