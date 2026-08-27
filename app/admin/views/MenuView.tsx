'use client';

import { Plus, Search, Settings2, Trash2, Utensils } from 'lucide-react';

import { AdminTitle, dishes as fallbackDishes, orders as fallbackOrders } from '..';
import type { AdminDish, AdminOrder } from '../runtime-data';

export function MenuView({ dishes = fallbackDishes, orders = fallbackOrders }: { dishes?: AdminDish[]; orders?: AdminOrder[] }) {
  const categoryStats = ['All Menu', 'Breakfast', 'Coffee', 'Food', 'Snack', 'Promo'];

  return (
    <section className="app-view active">
      <header className="topbar pos-menu-topbar">
        <AdminTitle title="POS Counter" subtitle="Fast order entry for table service, QR orders, and cashier tickets." />
        <label className="search-wrap menu-search"><input type="search" placeholder="Search menu item" /><Search aria-hidden="true" /></label>
      </header>
      <div className="pos-command-bar">
        <div className="pos-live-ticket">
          <span className="pos-table-chip">Table A4</span>
          <div>
            <small>Active Ticket</small>
            <strong>Ariel Hikmat</strong>
            <em>Dine In / 4 guests / Order #925</em>
          </div>
        </div>
        <div className="order-type-tabs" aria-label="Order type">
          <button className="active" type="button">Dine In</button>
          <button type="button">Takeaway</button>
          <button type="button">QR</button>
        </div>
        <div className="pos-counter-stats">
          <article><span>Queue</span><strong>7</strong></article>
          <article><span>Kitchen</span><strong>Open</strong></article>
          <article><span>Last sent</span><strong>2m</strong></article>
        </div>
      </div>
      <div className="menu-layout">
        <aside className="category-rail">
          <div className="category-head">
            <span>Menu Mode</span>
            <strong>Breakfast rush</strong>
          </div>
          <div className="category-list">
            {categoryStats.map((category, index) => (
              <button className={index === 1 ? 'active' : ''} type="button" key={category}>
                <strong>{category}</strong>
                <span>{index === 0 ? 124 : 8 + index} Items</span>
                <b>{index === 1 ? '9' : index === 4 ? '3' : '0'}</b>
              </button>
            ))}
          </div>
          <div className="pos-shortcuts">
            <button type="button"><Plus aria-hidden="true" /> Custom item</button>
            <button type="button"><Trash2 aria-hidden="true" /> Void ticket</button>
          </div>
        </aside>
        <section className="menu-board">
          <div className="menu-board-head pos-board-head">
            <div>
              <span>Service Lane</span>
              <strong>Popular items first</strong>
            </div>
            <div className="pos-lane-pills">
              <span><Utensils aria-hidden="true" /> Kitchen open</span>
              <span><Settings2 aria-hidden="true" /> 3 modifiers</span>
            </div>
          </div>
          <div className="menu-grid">
            {dishes.map((dish, index) => (
              <article className="dish-card" key={dish.name}>
                <img src={dish.image} alt={dish.name} />
                {dish.badge && <span className={`badge ${dish.badgeTone}`}>{dish.badge}</span>}
                <span className="prep-chip">{index % 2 === 0 ? 'Kitchen / 8m' : 'Bar / 3m'}</span>
                <h3>{dish.name}</h3>
                <p>{dish.desc}</p>
                <div className="dish-meta-line">
                  <span>{index % 3 === 0 ? 'Best with notes' : 'Ready stock'}</span>
                  <b>{index + 6} sold</b>
                </div>
                <div className="dish-action-line"><strong>{dish.price}</strong>{dish.oldPrice && <span className="old-price">{dish.oldPrice}</span>}<span className="qty"><button type="button">-</button><b>{dish.qty}</b><button type="button">+</button></span></div>
              </article>
            ))}
          </div>
        </section>
        <aside className="receipt-panel">
          <div className="receipt-top">
            <div className="receipt-customer">
              <div>
                <span>Current Ticket</span>
                <h3>Ariel Hikmat</h3>
                <small>Dine In / 4 guests</small>
              </div>
            </div>
            <div className="receipt-meta-chips">
              <span>Table A4</span>
              <span>Order #925</span>
            </div>
          </div>
          <p className="receipt-date">Sun, Aug 23, 2026 - 06:12 PM</p>
          <div className="ticket-readiness">
            <span><b></b> Kitchen queue 08m</span>
            <span><b></b> Pay after serve</span>
          </div>
          <div className="ticket-actions">
            <button type="button">Hold</button>
            <button type="button">Kitchen</button>
            <button type="button">Split</button>
          </div>
          <div className="receipt-order-scroll">
            <h3>Order Detail</h3>
            <div className="receipt-items">
              {(orders[0]?.items ?? []).map(([name, qty, price]) => <div className="receipt-item" key={name}><div><strong>{name}</strong><button>Notes</button></div><b>x{qty}</b><strong>{price}</strong></div>)}
            </div>
          </div>
          <div className="receipt-footer">
            <div className="receipt-total"><span>Items (5)</span><strong>$73.79</strong></div>
            <div className="receipt-total"><span>Tax (5%)</span><strong>$3.65</strong></div>
            <button className="proceed-btn" type="button"><strong>$87.34</strong><span>Send Order -&gt;</span></button>
          </div>
        </aside>
      </div>
    </section>
  );
}

