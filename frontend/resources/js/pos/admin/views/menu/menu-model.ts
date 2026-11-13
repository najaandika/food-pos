import type { PosSettings } from '@/lib/pos-types';
import type { AdminDish, AdminOrder, AdminTable } from '../../runtime-data';

export type MenuOrderType = 'dine_in' | 'takeaway';
export type CartLine = AdminDish & { cartQty: number; note?: string };
export type MenuCart = Record<string, CartLine>;

export type SentMenuOrder = {
    id: number;
    orderNumber: string;
    customerName: string;
    table: string;
    itemCount: number;
    total: number;
} | null;

export type ManualOrderPayload = {
    tableCode?: string;
    customerName: string;
    type: MenuOrderType;
    guests: number;
    notes?: string;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
};

export function getMenuCategories(dishes: AdminDish[]): string[] {
    return [
        'All Menu',
        ...Array.from(new Set(dishes.map((dish) => dish.category ?? 'Coffee'))),
    ];
}

export function getAvailableTables(tables: AdminTable[]): AdminTable[] {
    return tables.filter(
        (table) => table.rawStatus === 'available' && !table.currentOrderId,
    );
}

export function filterMenuDishes(
    dishes: AdminDish[],
    activeCategory: string,
    query: string,
): AdminDish[] {
    const normalizedQuery = query.trim().toLowerCase();
    return dishes.filter((dish) => {
        const matchesCategory =
            activeCategory === 'All Menu' || dish.category === activeCategory;
        const matchesQuery =
            !normalizedQuery ||
            dish.name.toLowerCase().includes(normalizedQuery) ||
            dish.desc.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesQuery && dish.isAvailable !== false;
    });
}

export function getIncomingQrOrders(orders: AdminOrder[]): AdminOrder[] {
    return orders.filter(
        (order) =>
            order.source === 'qr' &&
            order.rawStatus != null &&
            !['paid', 'cancelled'].includes(order.rawStatus),
    );
}

export function reconcileCartLines(
    cart: MenuCart,
    dishes: AdminDish[],
): CartLine[] {
    return Object.values(cart).map((line) => {
        const latest = dishes.find((dish) => dish.id === line.id);
        return latest
            ? { ...line, ...latest, cartQty: line.cartQty, note: line.note }
            : line;
    });
}

export function getCartSummary(
    cartLines: CartLine[],
    settings: PosSettings | undefined,
    pricingFromLaravel: boolean,
) {
    const itemCount = cartLines.reduce(
        (total, line) => total + line.cartQty,
        0,
    );
    const subtotal = cartLines.reduce(
        (total, line) => total + (line.rawPrice ?? 0) * line.cartQty,
        0,
    );
    // Laravel pricing already includes its own policy; never add local fees.
    const taxRate = pricingFromLaravel ? 0 : (settings?.tax.taxRate ?? 5);
    const serviceRate = pricingFromLaravel
        ? 0
        : (settings?.tax.serviceRate ?? 0);
    const tax = Math.round(subtotal * (taxRate / 100));
    const serviceCharge = Math.round(subtotal * (serviceRate / 100));
    return {
        itemCount,
        subtotal,
        taxRate,
        serviceRate,
        tax,
        serviceCharge,
        total: subtotal + tax + serviceCharge,
    };
}

export function updateMenuCartQuantity(
    current: MenuCart,
    dish: AdminDish,
    change: number,
): MenuCart {
    if (!dish.id) return current;
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
}

export function updateMenuCartNote(
    current: MenuCart,
    dishId: number | undefined,
    note: string,
): MenuCart {
    if (!dishId) return current;
    const key = String(dishId);
    const line = current[key];
    if (!line) return current;
    return { ...current, [key]: { ...line, note } };
}

export function getTicketValidationError({
    customerName,
    orderType,
    tableCode,
    guests,
    availableTables,
    tables,
}: {
    customerName: string;
    orderType: MenuOrderType;
    tableCode: string;
    guests: number;
    availableTables: AdminTable[];
    tables: AdminTable[];
}): string | null {
    if (customerName.trim().length < 2) {
        return 'Nama pelanggan minimal 2 karakter.';
    }
    const selectedTable = availableTables.find(
        (table) => table.code === tableCode,
    );
    if (
        orderType === 'dine_in' &&
        selectedTable &&
        guests > selectedTable.seats
    ) {
        return 'Jumlah tamu melebihi kapasitas meja.';
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
        return 'Pilih meja yang masih tersedia sebelum mengirim pesanan.';
    }
    return null;
}

export function createManualOrderPayload({
    orderType,
    tableCode,
    customerName,
    guests,
    cartLines,
}: {
    orderType: MenuOrderType;
    tableCode: string;
    customerName: string;
    guests: number;
    cartLines: CartLine[];
}): ManualOrderPayload {
    return {
        tableCode: orderType === 'dine_in' ? tableCode : undefined,
        customerName: customerName.trim(),
        type: orderType,
        guests,
        items: cartLines.map((line) => ({
            menuItemId: line.id ?? 0,
            quantity: line.cartQty,
            notes: line.note || undefined,
        })),
    };
}

export function getMaxCartGuests(
    orderType: MenuOrderType,
    selectedTable: AdminTable | undefined,
): number {
    return orderType === 'dine_in'
        ? Math.min(99, Math.max(1, selectedTable?.seats ?? 99))
        : 99;
}
