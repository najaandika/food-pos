import { useEffect, useMemo, useState } from 'react';

import { RiShoppingBag3Line as ShoppingBag } from '@remixicon/react';
import { SearchField } from '../../../../../../components/base/search-field/search-field';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerHeader,
} from '../../../../../../components/base/drawer/drawer';

import {
    AdminTitle,
    dishes as fallbackDishes,
    orders as fallbackOrders,
} from '../..';
import { CartPanel } from './CartPanel';
import { CommandBar } from './CommandBar';
import { MenuFilterPanel } from './MenuFilterPanel';
import { MenuGrid } from './MenuGrid';
import { IncomingQrOrdersPanel } from './IncomingQrOrdersPanel';
import {
    createManualOrderPayload,
    filterMenuDishes,
    getAvailableTables,
    getCartSummary,
    getIncomingQrOrders,
    getMenuCategories,
    getTicketValidationError,
    reconcileCartLines,
    updateMenuCartNote,
    updateMenuCartQuantity,
    type ManualOrderPayload,
    type MenuCart,
    type SentMenuOrder,
} from './menu-model';

import type { AdminDish, AdminOrder, AdminTable } from '../../runtime-data';
import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';

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
    onCreateManualOrder?: (
        payload: ManualOrderPayload,
    ) =>
        | Promise<{ id: number; orderNumber: string; total?: number } | void>
        | { id: number; orderNumber: string; total?: number }
        | void;
    onGoToCashier?: () => void;
    onGoToOrders?: () => void;
}) {
    const { t } = useLocale();
    const categories = useMemo(() => getMenuCategories(dishes), [dishes]);
    const availableTables = useMemo(() => getAvailableTables(tables), [tables]);
    const firstTable = availableTables[0];
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
    const [cart, setCart] = useState<MenuCart>({});
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [qrMode, setQrMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sendError, setSendError] = useState('');
    const [sentOrder, setSentOrder] = useState<SentMenuOrder>(null);

    useEffect(() => {
        // Tables arrive asynchronously and may become occupied during service.
        setTableCode((current) =>
            availableTables.some((table) => table.code === current)
                ? current
                : (availableTables[0]?.code ?? ''),
        );
    }, [availableTables]);

    useEffect(() => {
        const selected = availableTables.find(
            (table) => table.code === tableCode,
        );
        if (selected) {
            setGuests((current) =>
                Math.max(1, Math.min(current, selected.seats)),
            );
        }
    }, [tableCode, availableTables]);

    const filteredDishes = useMemo(
        () => filterMenuDishes(dishes, activeCategory, query),
        [activeCategory, dishes, query],
    );
    // Only operational QR orders belong in the incoming lane.
    const incomingQrOrders = getIncomingQrOrders(orders);
    // Reconcile live catalog prices without losing selected quantities or notes.
    const cartLines = reconcileCartLines(cart, dishes);
    const {
        itemCount,
        subtotal,
        taxRate,
        serviceRate,
        tax,
        serviceCharge,
        total,
    } = getCartSummary(cartLines, settings, pricingFromLaravel);

    const updateCart = (dish: AdminDish, change: number) => {
        if (!dish.id) return;
        setSentOrder(null);
        setSendError('');
        setCart((current) => updateMenuCartQuantity(current, dish, change));
    };

    const updateLineNote = (dishId: number | undefined, note: string) => {
        if (!dishId) return;
        setCart((current) => updateMenuCartNote(current, dishId, note));
    };

    const sendOrder = async () => {
        if (!cartLines.length || submitting) return;
        const normalizedName = customerName.trim();
        const validationError = getTicketValidationError({
            customerName,
            orderType,
            tableCode,
            guests,
            availableTables,
            tables,
        });
        if (validationError) {
            setSendError(validationError);
            return;
        }
        setSubmitting(true);
        setSendError('');
        try {
            const order = await onCreateManualOrder?.(
                createManualOrderPayload({
                    orderType,
                    tableCode,
                    customerName: normalizedName,
                    guests,
                    cartLines,
                }),
            );
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
                <IncomingQrOrdersPanel incomingQrOrders={incomingQrOrders} />
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
