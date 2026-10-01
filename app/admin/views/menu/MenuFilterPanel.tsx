'use client';

import { Plus, Trash2 } from 'lucide-react';

import type { AdminDish } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

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
  const { t } = useLocale();

  return (
    <aside className="category-rail">
      <div className="category-head">
        <span>{t('menu.menuMode')}</span>
        <strong>{t('menu.manualOrder')}</strong>
      </div>
      <div className="category-list">
        {categories.map((category) => (
          <button
            className={activeCategory === category ? 'active' : ''}
            type="button"
            key={category}
            onClick={() => onSelectCategory(category)}
          >
            <strong>{category === 'All Menu' ? t('menu.allMenu') : category}</strong>
            <span>
              {category === 'All Menu' ? dishes.length : dishes.filter((dish) => dish.category === category).length} {t('common.items')}
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
          <Plus aria-hidden="true" /> {guests} {t('common.guests')}
        </button>
        <button type="button" onClick={onVoidTicket}>
          <Trash2 aria-hidden="true" /> {t('menu.voidTicket')}
        </button>
      </div>
    </aside>
  );
}
