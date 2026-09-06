'use client';

import { Copy, Pencil, Search } from 'lucide-react';
import Image from 'next/image';
import type { AdminDish } from '../../runtime-data';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';

type Props = {
  dishes: AdminDish[];
  visibleDishes: AdminDish[];
  menuStats: Array<{ label: string; value: string; hint: string }>;
  filterTabs: string[];
  activeCategory: string;
  query: string;
  selectedId: number | undefined;
  isCreating: boolean;
  selectedDish: AdminDish | undefined;
  onChangeCategory: (category: string) => void;
  onChangeQuery: (query: string) => void;
  onStartEdit: (dish: AdminDish) => void;
  onDuplicate: (dish: AdminDish) => void;
  onToggleAvailability?: (dishId: number | undefined, isAvailable: boolean | undefined) => void;
};

export function OwnerMenuList({
  dishes,
  visibleDishes,
  menuStats,
  filterTabs,
  activeCategory,
  query,
  selectedId,
  isCreating,
  selectedDish,
  onChangeCategory,
  onChangeQuery,
  onStartEdit,
  onDuplicate,
  onToggleAvailability,
}: Props) {
  return (
    <section className="owner-menu-main">
      <div className="owner-menu-summary">
        {menuStats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </article>
        ))}
      </div>

      <div className="owner-menu-toolbar">
        <label className="admin-search-wrap">
          <input type="search" placeholder="Search menu item" value={query} onChange={(event) => onChangeQuery(event.target.value)} />
          <Search aria-hidden="true" />
        </label>
        <div className="owner-filter-tabs">
          {filterTabs.map((category) => (
            <button
              className={activeCategory === category ? 'active' : ''}
              type="button"
              key={category}
              onClick={() => onChangeCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="owner-menu-table">
        <div className="owner-menu-table-head">
          <span>Menu</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span>Flag</span>
          <span />
        </div>
        {visibleDishes.map((dish) => (
          <article className={`owner-menu-row ${dish.id === selectedDish?.id && !isCreating ? 'selected' : ''}`} key={dish.id ?? dish.name}>
            <button className="owner-menu-product" type="button" onClick={() => onStartEdit(dish)}>
              <Image src={dish.image || FALLBACK_IMAGE} alt={dish.name} width={96} height={96} />
              <div>
                <strong>{dish.name}</strong>
                <small>{dish.desc}</small>
                <em>{dish.soldToday ?? 0} sold today</em>
              </div>
            </button>
            <span>{dish.category ?? 'Coffee'}</span>
            <strong>{dish.price}</strong>
            <button
              className={`availability-toggle ${dish.isAvailable === false ? 'off' : ''}`}
              type="button"
              onClick={() => onToggleAvailability?.(dish.id, dish.isAvailable)}
            >
              <i />
              {dish.isAvailable === false ? 'Hidden' : 'Available'}
            </button>
            <span className={`owner-flag ${dish.badge ? 'active' : ''}`}>{dish.badge ?? 'Regular'}</span>
            <div className="owner-menu-actions">
              <button type="button" aria-label={`Edit ${dish.name}`} onClick={() => onStartEdit(dish)}>
                <Pencil aria-hidden="true" />
              </button>
              <button type="button" aria-label={`Duplicate ${dish.name}`} onClick={() => void onDuplicate(dish)}>
                <Copy aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
