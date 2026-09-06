'use client';

import { useMemo, useState } from 'react';

import { Search } from 'lucide-react';

import { AdminTitle, dishes as fallbackDishes, orders as fallbackOrders } from '..';
import { CartPanel } from './menu/CartPanel';
import { CommandBar } from './menu/CommandBar';
import { MenuFilterPanel } from './menu/MenuFilterPanel';
import { MenuGrid } from './menu/MenuGrid';

import type { AdminDish, AdminOrder, AdminTable } from '../runtime-data';
import type { PosSettings } from '@/lib/pos-types';

type CartLine = AdminDish & { cartQty: number; note?: string };

export function MenuView({
  dishes = fallbackDishes,
  orders = fallbackOrders,
  tables = [],
  settings,
  onCreateManualOrder,
  onGoToCashier,
  onGoToOrders,
}: {
  dishes?: AdminDish[];
  orders?: AdminOrder[];
  tables?: AdminTable[];
  settings?: PosSettings;
  onCreateManualOrder?: (payload: {
    tableCode?: string;
    customerName: string;
    type: 'dine_in' | 'takeaway';
    guests: number;
    notes?: string;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
  }) => Promise<{ id: number; orderNumber: string } | void> | { id: number; orderNumber: string } | void;
  onGoToCashier?: () => void;
  onGoToOrders?: () => void;
}) {
  const categories = useMemo(() => ['All Menu', ...Array.from(new Set(dishes.map((dish) => dish.category ?? 'Coffee')))], [dishes]);
  const firstTable = tables.find((table) => table.rawStatus === 'available') ?? tables[0];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? 'All Menu');
  const [query, setQuery] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [tableCode, setTableCode] = useState(firstTable?.code ?? 'A4');
  const [customerName, setCustomerName] = useState('Walk-in Guest');
  const [guests, setGuests] = useState(2);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [qrMode, setQrMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentOrder, setSentOrder] = useState<{ id: number; orderNumber: string; customerName: string; table: string; itemCount: number; total: number } | null>(null);

  const filteredDishes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === 'All Menu' || dish.category === activeCategory;
      const matchesQuery = !normalizedQuery || dish.name.toLowerCase().includes(normalizedQuery) || dish.desc.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery && dish.isAvailable !== false;
    });
  }, [activeCategory, dishes, query]);

  const cartLines = Object.values(cart);
  const itemCount = cartLines.reduce((total, line) => total + line.cartQty, 0);
  const subtotal = cartLines.reduce((total, line) => total + (line.rawPrice ?? 0) * line.cartQty, 0);
  const taxRate = settings?.tax.taxRate ?? 5;
  const serviceRate = settings?.tax.serviceRate ?? 0;
  const tax = Math.round(subtotal * (taxRate / 100));
  const serviceCharge = Math.round(subtotal * (serviceRate / 100));
  const total = subtotal + tax + serviceCharge;

  const updateCart = (dish: AdminDish, change: number) => {
    if (!dish.id) return;
    setSentOrder(null);
    setSendError('');
    setCart((current) => {
      const key = String(dish.id);
      const nextQty = (current[key]?.cartQty ?? 0) + change;
      if (nextQty <= 0) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: { ...dish, cartQty: nextQty } };
    });
  };

  const updateLineNote = (dishId: number | undefined, note: string) => {
    if (!dishId) return;
    setCart((current) => {
      const key = String(dishId);
      const line = current[key];
      if (!line) return current;
      return { ...current, [key]: { ...line, note } };
    });
  };

  const sendOrder = async () => {
    if (!cartLines.length || submitting) return;
    setSubmitting(true);
    setSendError('');
    try {
      const order = await onCreateManualOrder?.({
        tableCode: orderType === 'dine_in' ? tableCode : undefined,
        customerName,
        type: orderType,
        guests,
        items: cartLines.map((line) => ({ menuItemId: line.id ?? 0, quantity: line.cartQty, notes: line.note || undefined })),
      });
      if (order) {
        setSentOrder({
          ...order,
          customerName,
          table: orderType === 'dine_in' ? tableCode : 'Takeaway',
          itemCount,
          total,
        });
      }
      setCart({});
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send order');
    } finally {
      setSubmitting(false);
    }
  };

  const startNewTicket = () => {
    setSentOrder(null);
    setSendError('');
    setCustomerName('Walk-in Guest');
    setGuests(2);
  };

  return (
    <section className="app-view active">
      <header className="topbar pos-menu-topbar">
        <AdminTitle title="POS Counter" subtitle="Fast order entry for table service, QR orders, and cashier tickets." />
        <label className="admin-search-wrap menu-search">
          <input type="search" placeholder="Search menu item" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Search aria-hidden="true" />
        </label>
      </header>
      <CommandBar
        orderType={orderType}
        tableCode={tableCode}
        customerName={customerName}
        guests={guests}
        itemCount={itemCount}
        orders={orders}
        onChangeOrderType={setOrderType}
        qrMode={qrMode}
        onToggleQrMode={() => setQrMode((current) => !current)}
      />
      {qrMode ? (
        <section className="qr-order-panel">
          <div className="qr-order-panel-head">
            <div>
              <span>Incoming orders</span>
              <h2>QR Orders</h2>
              <p>Orders placed by customers from table QR menus.</p>
            </div>
            <button type="button" onClick={() => setQrMode(false)}>Back to Manual Order</button>
          </div>
          <div className="qr-order-list">
            {orders.filter((order) => order.source === 'qr').map((order) => (
              <article className="qr-order-card" key={order.id ?? order.orderNumber}>
                <div className={`table-pill ${order.tone}`}>{order.table}</div>
                <div className="qr-order-info">
                  <strong>{order.name}</strong>
                  <span>{order.tableCode ? `Table ${order.tableCode}` : 'Takeaway'} · {order.items.length} items · {order.time}</span>
                  <small>{order.items.slice(0, 2).map((item) => `${item[0]} x${item[1]}`).join(' · ')}</small>
                </div>
                <div className="qr-order-meta">
                  <b>{order.total}</b>
                  <span className={`mini-status ${order.statusTone}`}>{order.status}</span>
                </div>
              </article>
            ))}
            {!orders.some((order) => order.source === 'qr') && (
              <p className="empty-state">No QR orders are waiting right now.</p>
            )}
          </div>
        </section>
      ) : (
      <div className="menu-layout">
        <MenuFilterPanel
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          dishes={dishes}
          cartLines={cartLines}
          itemCount={itemCount}
          customerName={customerName}
          onChangeCustomerName={setCustomerName}
          orderType={orderType}
          tableCode={tableCode}
          onChangeTableCode={setTableCode}
          guests={guests}
          onAddGuest={() => setGuests((value) => value + 1)}
          onVoidTicket={() => setCart({})}
        />
        <MenuGrid dishes={filteredDishes} cart={cart} onUpdateCart={updateCart} />
        <CartPanel
          cartLines={cartLines}
          itemCount={itemCount}
          subtotal={subtotal}
          tax={tax}
          serviceCharge={serviceCharge}
          total={total}
          taxRate={taxRate}
          serviceRate={serviceRate}
          customerName={customerName}
          guests={guests}
          orderType={orderType}
          tableCode={tableCode}
          submitting={submitting}
          sendError={sendError}
          sentOrder={sentOrder}
          onSendOrder={sendOrder}
          onChangeLineNote={updateLineNote}
          onStartNewTicket={startNewTicket}
          onGoToOrders={onGoToOrders}
          onGoToCashier={onGoToCashier}
        />
      </div>
      )}
    </section>
  );
}
