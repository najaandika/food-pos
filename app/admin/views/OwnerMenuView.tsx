'use client';

import { Copy, Pencil, Search } from 'lucide-react';

import { AdminTitle, dishes as fallbackDishes, MockSelect } from '..';
import type { AdminDish } from '../runtime-data';

export function OwnerMenuView({
  dishes = fallbackDishes,
  onToggleAvailability,
}: {
  dishes?: AdminDish[];
  onToggleAvailability?: (dishId: number | undefined, isAvailable: boolean | undefined) => void;
}) {
  const menuStats = [
    { label: 'Active Items', value: '118', hint: '6 hidden today' },
    { label: 'Best Sellers', value: '12', hint: 'Shown in QR menu' },
    { label: 'Out of Stock', value: '4', hint: 'Need restock' },
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Menu Management" subtitle="Manage menu availability, pricing, badges, and categories." />
        <button className="owner-primary-btn" type="button">Add New Menu</button>
      </header>

      <div className="owner-menu-layout">
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
            <label className="search-wrap"><input type="search" placeholder="Search menu item" /><Search aria-hidden="true" /></label>
            <div className="owner-filter-tabs">
              <button className="active" type="button">All</button>
              <button type="button">Coffee</button>
              <button type="button">Food</button>
              <button type="button">Snack</button>
              <button type="button">Promo</button>
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
            {dishes.map((dish, index) => (
              <article className="owner-menu-row" key={dish.name}>
                <div className="owner-menu-product">
                  <img src={dish.image} alt={dish.name} />
                  <div><strong>{dish.name}</strong><small>{dish.desc}</small><em>{dish.soldToday ?? 18 - index * 2} sold today</em></div>
                </div>
                <span>{dish.category ?? (index % 3 === 0 ? 'Coffee' : index % 3 === 1 ? 'Food' : 'Snack')}</span>
                <strong>{dish.price}</strong>
                <button className={`availability-toggle ${dish.isAvailable === false ? 'off' : ''}`} type="button" onClick={() => onToggleAvailability?.(dish.id, dish.isAvailable)}><i />{dish.isAvailable === false ? 'Hidden' : 'Available'}</button>
                <span className={`owner-flag ${dish.badge ? 'active' : ''}`}>{dish.badge ?? 'Regular'}</span>
                <div className="owner-menu-actions">
                  <button type="button" aria-label={`Edit ${dish.name}`}><Pencil aria-hidden="true" /></button>
                  <button type="button" aria-label={`Duplicate ${dish.name}`}><Copy aria-hidden="true" /></button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="menu-editor-panel">
          <div className="menu-editor-head">
            <span className="mini-status ready">Editing Item</span>
            <button type="button">Live Preview</button>
          </div>
          <div className="editor-preview">
            <img src={dishes[0].image} alt={dishes[0].name} />
            <span>Best Seller</span>
          </div>
          <div className="menu-editor-meta">
            <article><span>Visibility</span><strong>Customer QR</strong></article>
            <article><span>Sold Today</span><strong>18</strong></article>
          </div>
          <div className="editor-fields">
            <label><span>Menu Name</span><input defaultValue="Bloc Barat Latte" /></label>
            <div className="editor-field"><span>Category</span><MockSelect value="Coffee" options={['Coffee', 'Food', 'Snack', 'Signature']} /></div>
            <label><span>Price</span><input defaultValue="Rp 32.000" /></label>
            <label><span>Description</span><textarea defaultValue="Espresso, fresh milk, and smooth house syrup." rows={4} /></label>
          </div>
          <div className="editor-switches">
            <button className="active" type="button">Available</button>
            <button type="button">Best Seller</button>
            <button type="button">Promo</button>
          </div>
          <div className="editor-actions">
            <button type="button">Discard</button>
            <button type="button">Save Menu</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

