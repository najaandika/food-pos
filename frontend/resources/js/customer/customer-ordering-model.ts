import type { CustomerCartItem, CustomerMenuItem } from './components/types';

export type QrCatalog = {
    table: {
        code: string;
        name: string;
        area: string | null;
        seats: number;
        status: string;
    };
    can_order: boolean;
    categories: Array<{
        id: number;
        name: string;
        items: Array<{
            id: number;
            name: string;
            description: string | null;
            price: string;
            image_url: string | null;
            is_best_seller: boolean;
            badge: string | null;
        }>;
    }>;
};

export function mapCatalogItems(
    categories: QrCatalog['categories'],
): CustomerMenuItem[] {
    return categories.flatMap((entry) =>
        entry.items.map((item) => ({
            id: item.id,
            name: item.name,
            category: entry.name,
            description: item.description ?? '',
            price: Number(item.price),
            image: item.image_url,
            badge:
                item.badge ?? (item.is_best_seller ? 'Best Seller' : undefined),
            available: true,
        })),
    );
}

export function filterCatalogItems(
    menuItems: CustomerMenuItem[],
    category: string,
    query: string,
): CustomerMenuItem[] {
    const search = query.trim().toLowerCase();
    return menuItems.filter(
        (item) =>
            item.category === category &&
            (!search ||
                [item.name, item.description, item.category].some((part) =>
                    part.toLowerCase().includes(search),
                )),
    );
}

export function getCartSummary(cart: CustomerCartItem[]): {
    itemCount: number;
    subtotal: number;
    estimatedTotal: number;
} {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
    );
    return { itemCount, subtotal, estimatedTotal: subtotal };
}

export function addCartItem(
    current: CustomerCartItem[],
    item: CustomerMenuItem,
): CustomerCartItem[] {
    const selected = current.find((entry) => entry.id === item.id);
    if (selected) {
        return current.map((entry) =>
            entry.id === item.id
                ? { ...entry, quantity: Math.min(20, entry.quantity + 1) }
                : entry,
        );
    }
    if (current.length >= 30) return current;
    return [...current, { ...item, quantity: 1, note: '' }];
}

export function changeCartQuantity(
    current: CustomerCartItem[],
    id: number,
    change: number,
): CustomerCartItem[] {
    return current
        .map((item) =>
            item.id === id
                ? { ...item, quantity: Math.min(20, item.quantity + change) }
                : item,
        )
        .filter((item) => item.quantity > 0);
}

export function changeCartNote(
    current: CustomerCartItem[],
    id: number,
    note: string,
): CustomerCartItem[] {
    return current.map((item) => (item.id === id ? { ...item, note } : item));
}

export type CheckoutPayload = {
    customer_name: string;
    guests: number;
    notes: string | null;
    items: Array<{
        menu_item_id: number;
        quantity: number;
        notes: string | null;
    }>;
};

export function canSubmitOrder(
    submitting: boolean,
    canOrder: boolean,
    cart: CustomerCartItem[],
    customerName: string,
    guests: number,
    seats: number,
): boolean {
    if (submitting || !canOrder || cart.length === 0 || !customerName.trim())
        return false;
    if (!Number.isInteger(guests) || guests < 1 || guests > seats) return false;
    return true;
}

export function createCheckoutPayload(
    customerName: string,
    guestCount: number,
    orderNote: string,
    cart: CustomerCartItem[],
): CheckoutPayload {
    return {
        customer_name: customerName.trim(),
        guests: guestCount,
        notes: orderNote.trim() || null,
        items: cart.map((item) => ({
            menu_item_id: item.id,
            quantity: item.quantity,
            notes: item.note.trim() || null,
        })),
    };
}

export function chooseCatalogCategory(
    categories: QrCatalog['categories'],
    previous: string,
): string {
    return categories.some((entry) => entry.name === previous)
        ? previous
        : (categories[0]?.name ?? '');
}
