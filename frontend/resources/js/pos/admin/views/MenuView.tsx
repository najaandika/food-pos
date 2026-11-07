import { useEffect, useMemo, useState } from 'react';

import { RiShoppingBag3Line as ShoppingBag } from '@remixicon/react';
import { SearchField } from '../../../../../components/base/search-field/search-field';
import { Button } from '../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerHeader,
} from '../../../../../components/base/drawer/drawer';

import {
    AdminTitle,
    dishes as fallbackDishes,
    orders as fallbackOrders,
} from '..';
import { CartPanel } from './menu/CartPanel';
import { CommandBar } from './menu/CommandBar';
import { MenuFilterPanel } from './menu/MenuFilterPanel';
import { MenuGrid } from './menu/MenuGrid';

import type { AdminDish, AdminOrder, AdminTable } from '../runtime-data';
import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../i18n-context';

type CartLine = AdminDish & { cartQty: number; note?: string };

export function MenuView({
    dishes = fallbackDishes,
    orders = fallbackOrders,
    tables = [],
    settings,
    pricingFromLaravel = false,
    onCreateManualOrder,
    onGoToCashier,
    onGoToOrders,
}: {
    dishes?: AdminDish[];
    orders?: AdminOrder[];
    tables?: AdminTable[];
    settings?: PosSettings;
    pricingFromLaravel?: boolean;
    onCreateManualOrder?: (payload: {
        tableCode?: string;
        customerName: string;
        type: 'dine_in' | 'takeaway';
        guests: number;
        notes?: string;
        items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
    }) =>
        | Promise<{ id: number; orderNumber: string; total?: number } | void>
        | { id: number; orderNumber: string; total?: number }
        | void;
    onGoToCashier?: () => void;
    onGoToOrders?: () => void;
}) {
    const { t } = useLocale();
    const categories = useMemo(
        () => [
            'All Menu',
            ...Array.from(
                new Set(dishes.map((dish) => dish.category ?? 'Coffee')),
            ),
        ],
        [dishes],
    );
    const firstTable = tables.find(
        (table) => table.rawStatus === 'available' && !table.currentOrderId,
    );
    const [activeCategory, setActiveCategory] = useState(
        categories[0] ?? 'All Menu',
    );
    const [query, setQuery] = useState('');
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>(
        'dine_in',
    );
    const [tableCode, setTableCode] = useState(firstTable?.code ?? '');
    const [customerName, setCustomerName] = useState(t('menu.walkInGuest'));
    const [guests, setGuests] = useState(2);
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [qrMode, setQrMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sendError, setSendError] = useState('');
    const [sentOrder, setSentOrder] = useState<{
        id: number;
        orderNumber: string;
        customerName: string;
        table: string;
        itemCount: number;
        total: number;
    } | null>(null);

    const availableTables = tables.filter(
        (table) => table.rawStatus === 'available' && !table.currentOrderId,
    );

    useEffect(() => {
        // Table data arrives asynchronously and refreshes during service.
        setTableCode((current) =>
            tables.some(
                (table) =>
                    table.code === current &&
                    table.rawStatus === 'available' &&
                    !table.currentOrderId,
            )
                ? current
                : (tables.find(
                      (table) =>
                          table.rawStatus === 'available' &&
                          !table.currentOrderId,
                  )?.code ?? ''),
        );
    }, [tables]);

    useEffect(() => {
        const selected = availableTables.find((table) => table.code === tableCode);
        if (selected) {
            setGuests((current) => Math.max(1, Math.min(current, selected.seats)));
        }
    }, [tableCode, tables]);

    const filteredDishes = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return dishes.filter((dish) => {
            const matchesCategory =
                activeCategory === 'All Menu' ||
                dish.category === activeCategory;
            const matchesQuery =
                !normalizedQuery ||
                dish.name.toLowerCase().includes(normalizedQuery) ||
                dish.desc.toLowerCase().includes(normalizedQuery);
            return (
                matchesCategory && matchesQuery && dish.isAvailable !== false
            );
        });
    }, [activeCategory, dishes, query]);

    // Incoming QR lane only shows operational orders, not 35 days of paid
    // history from the seeder. The full history remains in Orders/Reports.
    const incomingQrOrders = orders.filter(
        (order) =>
            order.source === 'qr' &&
            order.rawStatus != null &&
            !['paid', 'cancelled'].includes(order.rawStatus),
    );
    // Refresh prices/details from Laravel when Owner edits the live catalog,
    // while preserving the cashier's quantities and per-item notes.
    const cartLines = Object.values(cart).map((line) => {
        const latest = dishes.find((dish) => dish.id === line.id);
        return latest
            ? { ...line, ...latest, cartQty: line.cartQty, note: line.note }
            : line;
    });
    const itemCount = cartLines.reduce(
        (total, line) => total + line.cartQty,
        0,
    );
    const subtotal = cartLines.reduce(
        (total, line) => total + (line.rawPrice ?? 0) * line.cartQty,
        0,
    );
    // Pricing must match the confirmed Laravel/QR policy (no tax/service
    // until the Settings backend has a persisted pricing policy).
    const taxRate = pricingFromLaravel ? 0 : (settings?.tax.taxRate ?? 5);
    const serviceRate = pricingFromLaravel
        ? 0
        : (settings?.tax.serviceRate ?? 0);
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
            return {
                ...current,
                [key]: { ...current[key], ...dish, cartQty: nextQty },
            };
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
        const normalizedName = customerName.trim();
        if (normalizedName.length < 2) {
            setSendError('Nama pelanggan minimal 2 karakter.');
            return;
        }
        const selectedTable = availableTables.find(
            (table) => table.code === tableCode,
        );
        if (
            orderType === 'dine_in' &&
            selectedTable &&
            guests > selectedTable.seats
        ) {
            setSendError('Jumlah tamu melebihi kapasitas meja.');
            return;
        }
        if (
            orderType === 'dine_in' &&
            !tables.some(
                (table) =>
                    table.code === tableCode &&
                    table.rawStatus === 'available' &&
                    !table.currentOrderId,
            )
        ) {
            setSendError(
                'Pilih meja yang masih tersedia sebelum mengirim pesanan.',
            );
            return;
        }
        setSubmitting(true);
        setSendError('');
        try {
            const order = await onCreateManualOrder?.({
                tableCode: orderType === 'dine_in' ? tableCode : undefined,
                customerName: normalizedName,
                type: orderType,
                guests,
                items: cartLines.map((line) => ({
                    menuItemId: line.id ?? 0,
                    quantity: line.cartQty,
                    notes: line.note || undefined,
                })),
            });
            if (order) {
                setSentOrder({
                    ...order,
                    customerName: normalizedName,
                    table: orderType === 'dine_in' ? tableCode : 'Takeaway',
                    itemCount,
                    total: order.total ?? total,
                });
                setCart({});
            }
        } catch (error) {
            setSendError(
                error instanceof Error ? error.message : 'Failed to send order',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const startNewTicket = () => {
        setSentOrder(null);
        setSendError('');
        setCustomerName(t('menu.walkInGuest'));
        setGuests(2);
    };

    const changeTable = (code: string) => {
        setTableCode(code);
        const table = availableTables.find((item) => item.code === code);
        if (table) setGuests((current) => Math.min(current, table.seats));
        setSendError('');
    };

    const renderCartPanel = () => (
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
            availableTables={availableTables}
            onChangeCustomerName={(value) => {
                setCustomerName(value);
                setSendError('');
            }}
            onChangeTableCode={changeTable}
            onChangeGuests={(value) => {
                setGuests(Math.max(1, Math.min(99, value)));
                setSendError('');
            }}
            onVoidTicket={voidTicket}
            submitting={submitting}
            sendError={sendError}
            sentOrder={sentOrder}
            onSendOrder={sendOrder}
            onChangeLineNote={updateLineNote}
            onStartNewTicket={startNewTicket}
            onGoToOrders={onGoToOrders}
            onGoToCashier={onGoToCashier}
        />
    );

    const voidTicket = () => {
        if (!cartLines.length || submitting) return;
        if (!window.confirm('Kosongkan semua item dari keranjang ini?')) return;
        setCart({});
        setSentOrder(null);
        setSendError('');
    };

    return (
        <section className="app-view active pos-menu-page">
            <header className="topbar pos-menu-topbar">
                <AdminTitle
                    title={t('menu.title')}
                    subtitle={t('menu.subtitle')}
                />
                <SearchField
                    className="menu-search menu-p2-search"
                    fieldClassName="menu-p2-search-field"
                    shape="rounded"
                    aria-label={t('menu.searchPlaceholder')}
                    placeholder={t('menu.searchPlaceholder')}
                    clearLabel="Bersihkan pencarian"
                    value={query}
                    onChange={setQuery}
                />
            </header>
            <CommandBar
                orderType={orderType}
                tableCode={tableCode}
                customerName={customerName}
                guests={guests}
                itemCount={itemCount}
                orders={orders}
                onChangeOrderType={(type) => {
                    setOrderType(type);
                    setQrMode(false);
                }}
                qrMode={qrMode}
                onToggleQrMode={() => {
                    setCartDrawerOpen(false);
                    setQrMode((current) => !current);
                }}
            />
            {qrMode ? (
                <section className="qr-order-panel">
                    <div className="qr-order-panel-head">
                        <div>
                            <span>{t('menu.incomingOrders')}</span>
                            <h2>{t('menu.qrOrders')}</h2>
                            <p>{t('menu.qrOrdersDesc')}</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => setQrMode(false)}
                        >
                            {t('menu.backToManualOrder')}
                        </Button>
                    </div>
                    <div className="qr-order-list">
                        {incomingQrOrders.map((order) => (
                            <article
                                className="qr-order-card"
                                key={order.id ?? order.orderNumber}
                            >
                                <div className={`table-pill ${order.tone}`}>
                                    {order.table}
                                </div>
                                <div className="qr-order-info">
                                    <strong>{order.name}</strong>
                                    <span>
                                        {order.tableCode
                                            ? `${t('common.table')} ${order.tableCode}`
                                            : t('menu.takeaway')}{' '}
                                        · {order.items.length}{' '}
                                        {t('common.items')} · {order.time}
                                    </span>
                                    <small>
                                        {order.items
                                            .slice(0, 2)
                                            .map(
                                                (item) =>
                                                    `${item[0]} x${item[1]}`,
                                            )
                                            .join(' · ')}
                                    </small>
                                </div>
                                <div className="qr-order-meta">
                                    <b>{order.total}</b>
                                    <span
                                        className={`mini-status ${order.statusTone}`}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                            </article>
                        ))}
                        {incomingQrOrders.length === 0 && (
                            <p className="empty-state">
                                {t('menu.noQrOrders')}
                            </p>
                        )}
                    </div>
                </section>
            ) : (
                <>
                    <div className="menu-layout">
                        <div className="menu-catalog">
                            <MenuFilterPanel
                                categories={categories}
                                activeCategory={activeCategory}
                                onSelectCategory={setActiveCategory}
                                dishes={dishes}
                                cartLines={cartLines}
                                itemCount={itemCount}
                            />
                            <MenuGrid
                                dishes={filteredDishes}
                                cart={cart}
                                onUpdateCart={updateCart}
                            />
                        </div>
                        <div className="menu-cart-shell">
                            {renderCartPanel()}
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        size="medium"
                        className={`menu-mobile-cart-bar${cartDrawerOpen ? ' is-hidden' : ''}`}
                        onClick={() => setCartDrawerOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={cartDrawerOpen}
                    >
                        <ShoppingBag aria-hidden="true" />
                        <span>Keranjang ({itemCount} item)</span>
                        <strong>
                            {total.toLocaleString('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                maximumFractionDigits: 0,
                            })}
                        </strong>
                    </Button>
                    <Drawer
                        placement="end"
                        size="lg"
                        isOpen={cartDrawerOpen}
                        onOpenChange={setCartDrawerOpen}
                        className="pos-menu-page menu-p2-cart-dialog"
                        aria-label="Keranjang pesanan"
                    >
                        <DrawerHeader
                            title="Keranjang pesanan"
                            closeLabel="Tutup keranjang"
                            className="menu-p2-drawer-heading"
                        />
                        <DrawerBody className="menu-p2-cart-drawer-body">
                            {renderCartPanel()}
                        </DrawerBody>
                    </Drawer>
                </>
            )}
        </section>
    );
}
