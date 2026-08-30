'use client';

import { Plus, Trash2 } from 'lucide-react';

import type { AdminDish } from '../../runtime-data';

type CartLine = AdminDish & { cartQty: number };

type Props = {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  dishes: AdminDish[];
  cartLines: CartLine[];
  itemCount: number;
  customerName: string;
  onChangeCustomerName: (value: string) => void;
  orderType: 'dine_in' | 'takeaway';
  tableCode: string;
  onChangeTableCode: (value: string) => void;
  guests: number;
  onAddGuest: () => void;
  onVoidTicket: () => void;
};

export function MenuFilterPanel({
  categories,
  activeCategory,
  onSelectCategory,
  dishes,
  cartLines,
  itemCount,
  customerName,
  onChangeCustomerName,
  orderType,
  tableCode,
  onChangeTableCode,
  guests,
  onAddGuest,
  onVoidTicket,
}: Props) {
  return (
    <aside className="category-rail">
      <div className="category-head">
        <span>Menu Mode</span>
        <strong>Manual order</strong>
      </div>
      <div className="category-list">
        {categories.map((category) => (
          <button
            className={activeCategory === category ? 'active' : ''}
            type="button"
            key={category}
            onClick={() => onSelectCategory(category)}
          >
            <strong>{category}</strong>
            <span>
              {category === 'All Menu' ? dishes.length : dishes.filter((dish) => dish.category === category).length} Items
            </span>
            <b>
              {category === 'All Menu'
                ? itemCount
                : cartLines.filter((line) => line.category === category).reduce((total, line) => total + line.cartQty, 0)}
            </b>
          </button>
        ))}
      </div>
      <div className="pos-shortcuts">
        <input value={customerName} onChange={(event) => onChangeCustomerName(event.target.value)} aria-label="Customer name" />
        {orderType === 'dine_in' && (
          <input value={tableCode} onChange={(event) => onChangeTableCode(event.target.value.toUpperCase())} aria-label="Table code" />
        )}
        <button type="button" onClick={onAddGuest}>
          <Plus aria-hidden="true" /> {guests} guests
        </button>
        <button type="button" onClick={onVoidTicket}>
          <Trash2 aria-hidden="true" /> Void ticket
        </button>
      </div>
    </aside>
  );
}
