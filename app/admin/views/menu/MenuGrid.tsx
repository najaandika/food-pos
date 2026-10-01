'use client';

import Image from 'next/image';
import type { AdminDish } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

type CartLine = AdminDish & { cartQty: number };

type Props = {
  dishes: AdminDish[];
  cart: Record<string, CartLine>;
  onUpdateCart: (dish: AdminDish, change: number) => void;
};

export function MenuGrid({ dishes, cart, onUpdateCart }: Props) {
  const { t } = useLocale();

  return (
    <section className="menu-board">
      <div className="menu-board-head">
        <div>
          <span>{t('menu.serviceLane')}</span>
          <strong>{t('menu.popularFirst')}</strong>
        </div>
      </div>
      <div className="menu-grid">
        {dishes.map((dish) => (
          <article className="dish-card" key={dish.id ?? dish.name}>
            <Image src={dish.image} alt={dish.name} width={600} height={400} />
            {dish.badge && <span className={`badge ${dish.badgeTone}`}>{dish.badge}</span>}
            <h3>{dish.name}</h3>
            <p>{dish.desc}</p>
            <div className="dish-action-line">
              <strong>{dish.price}</strong>
              {dish.oldPrice && <span className="old-price">{dish.oldPrice}</span>}
              <span className="qty">
                <button type="button" onClick={() => onUpdateCart(dish, -1)}>
                  -
                </button>
                <b>{cart[String(dish.id)]?.cartQty ?? 0}</b>
                <button type="button" onClick={() => onUpdateCart(dish, 1)}>
                  +
                </button>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
