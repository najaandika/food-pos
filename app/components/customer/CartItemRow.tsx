import { Stepper } from '../ui/Stepper';
import type { CustomerCartItem } from './types';
import Image from 'next/image';
import styles from '../../table/[code]/Customer.module.css';

type CartItemRowProps = {
  item: CustomerCartItem;
  formattedPrice: string;
  onNoteChange: (note: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
};

export function CartItemRow({ item, formattedPrice, onNoteChange, onDecrement, onIncrement }: CartItemRowProps) {
  return (
    <article className={styles['cart-row']}>
      <Image src={item.image} alt={item.name} width={160} height={160} />
      <div>
        <h3>{item.name}</h3>
        <span>{formattedPrice}</span>
        <input value={item.note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Item note, e.g. less sugar" />
      </div>
      <Stepper
        className={styles['cart-qty']}
        label={item.name}
        value={item.quantity}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
      />
    </article>
  );
}
