'use client';

import { Settings2, Utensils } from 'lucide-react';
import type { AdminDish } from '../../runtime-data';

type CartLine = AdminDish & { cartQty: number };

type Props = {
  dishes: AdminDish[];
  cart: Record<string, CartLine>;
  onUpdateCart: (dish: AdminDish, change: number) => void;
};

export function MenuGrid({ dishes, cart, onUpdateCart }: Props) {
  return (
    <section className="menu-board">
      <div className="menu-board-head pos-board-head">
        <div>
          <span>Service Lane</span>
          <strong>Popular items first</strong>
        </div>
        <div className="pos-lane-pills">
          <span>
            <Utensils aria-hidden="true" /> Kitchen open
          </span>
          <span>
            <Settings2 aria-hidden="true" /> Manual ticket
          </span>
        </div>
      </div>
      <div className="menu-grid">
        {dishes.map((dish, index) => (
          <article className="dish-card" key={dish.id ?? dish.name}>
            <img src={dish.image} alt={dish.name} />
            {dish.badge && <span className={`badge ${dish.badgeTone}`}>{dish.badge}</span>}
            <span className="prep-chip">{index % 2 === 0 ? 'Kitchen / 8m' : 'Bar / 3m'}</span>
            <h3>{dish.name}</h3>
            <p>{dish.desc}</p>
            <div className="dish-meta-line">
              <span>{dish.soldToday ?? 0} sold today</span>
              <b>{dish.isBestSeller ? 'Best' : 'Ready'}</b>
            </div>
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
