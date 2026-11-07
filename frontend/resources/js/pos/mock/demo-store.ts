import type {
    PosDashboard,
    PosMenuItem,
    PosOrder,
    PosOrderItem,
    PosOrderStatus,
    PosOrderType,
    PosReport,
    PosSettings,
    PosSnapshot,
    PosTable,
} from '@/lib/pos-types';
import { businessDateKey } from '@/lib/business-time';

/**
 * Tahap 3 frontend fixtures. No API request, database write, or storage access.
 * Replace this adapter with Inertia page props when backend contracts are ready.
 */
const menu: PosMenuItem[] = [
    {
        id: 1,
        categoryId: 1,
        category: 'Sarapan',
        name: 'Scrambled Eggs With Toast',
        description: 'Telur orak-arik lembut dengan roti panggang.',
        price: 49000,
        oldPrice: null,
        imageUrl:
            'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=520&q=80',
        isAvailable: true,
        isBestSeller: true,
        badge: 'Popular',
        soldToday: 23,
    },
    {
        id: 2,
        categoryId: 1,
        category: 'Sarapan',
        name: 'Greek Yogurt Parfait',
        description: 'Yogurt, granola, dan buah segar.',
        price: 42000,
        oldPrice: null,
        imageUrl:
            'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=520&q=80',
        isAvailable: true,
        isBestSeller: false,
        badge: null,
        soldToday: 19,
    },
    {
        id: 3,
        categoryId: 1,
        category: 'Sarapan',
        name: 'Vegetable Omelette',
        description: 'Omelet sayur dengan bumbu pilihan.',
        price: 45000,
        oldPrice: 50000,
        imageUrl:
            'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=520&q=80',
        isAvailable: true,
        isBestSeller: false,
        badge: 'Disc 10%',
        soldToday: 18,
    },
    {
        id: 4,
        categoryId: 2,
        category: 'Makanan',
        name: 'Smoked Salmon Bagel',
        description: 'Bagel dengan salmon asap dan krim keju.',
        price: 68000,
        oldPrice: null,
        imageUrl:
            'https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?auto=format&fit=crop&w=520&q=80',
        isAvailable: true,
        isBestSeller: true,
        badge: null,
        soldToday: 14,
    },
    {
        id: 5,
        categoryId: 2,
        category: 'Makanan',
        name: 'French Bread & Potato',
        description: 'Roti dengan kentang tumbuk lembut.',
        price: 45000,
        oldPrice: 52000,
        imageUrl:
            'https://images.unsplash.com/photo-1513442542250-854d436a73f2?auto=format&fit=crop&w=520&q=80',
        isAvailable: true,
        isBestSeller: false,
        badge: 'Promo',
        soldToday: 12,
    },
    {
        id: 6,
        categoryId: 3,
        category: 'Dessert',
        name: 'Belgian Waffles',
        description: 'Wafel hangat dan saus manis.',
        price: 53000,
        oldPrice: null,
        imageUrl:
            'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=520&q=80',
        isAvailable: true,
        isBestSeller: true,
        badge: 'Best Seller',
        soldToday: 27,
    },
];

const demoTables: PosTable[] = [
    {
        id: 1,
        code: 'A1',
        name: 'Window Seat',
        area: 'Indoor',
        seats: 2,
        status: 'available',
        qrToken: 'demo-a1',
        scansToday: 18,
        currentOrderId: null,
    },
    {
        id: 2,
        code: 'A4',
        name: 'Main Dining',
        area: 'Indoor',
        seats: 4,
        status: 'ready',
        qrToken: 'demo-a4',
        scansToday: 42,
        currentOrderId: 925,
    },
    {
        id: 3,
        code: 'B2',
        name: 'Bar Area',
        area: 'Indoor',
        seats: 2,
        status: 'waiting_payment',
        qrToken: 'demo-b2',
        scansToday: 31,
        currentOrderId: 924,
    },
    {
        id: 4,
        code: 'B7',
        name: 'Garden View',
        area: 'Outdoor',
        seats: 4,
        status: 'need_waiter',
        qrToken: 'demo-b7',
        scansToday: 16,
        currentOrderId: 923,
    },
    {
        id: 5,
        code: 'C1',
        name: 'Terrace',
        area: 'Outdoor',
        seats: 4,
        status: 'preparing',
        qrToken: 'demo-c1',
        scansToday: 12,
        currentOrderId: 922,
    },
    {
        id: 6,
        code: 'C2',
        name: 'Corner Table',
        area: 'Indoor',
        seats: 2,
        status: 'occupied',
        qrToken: 'demo-c2',
        scansToday: 23,
        currentOrderId: 921,
    },
    {
        id: 7,
        code: 'D3',
        name: 'Family Table',
        area: 'Indoor',
        seats: 6,
        status: 'available',
        qrToken: 'demo-d3',
        scansToday: 8,
        currentOrderId: null,
    },
];

export const demoSettings: PosSettings = {
    profile: {
        cafeName: 'Food POS',
        phone: '0812-0000-0000',
        address: 'Jl. Contoh No. 1, Indonesia',
    },
    tax: { taxRate: 10, serviceRate: 0, currency: 'IDR' },
    payments: { cash: true, qris: true, transfer: true },
    qrOptions: {
        guestOrdering: true,
        customerName: true,
        callWaiter: true,
        autoAcceptQr: false,
    },
    hours: [
        {
            label: 'Monday - Thursday',
            open: '09:00',
            close: '22:00',
            isOpen: true,
        },
        { label: 'Friday', open: '09:00', close: '23:00', isOpen: true },
        {
            label: 'Saturday - Sunday',
            open: '08:00',
            close: '23:00',
            isOpen: true,
        },
    ],
};

function exampleOrder(
    id: number,
    customerName: string,
    tableCode: string | null,
    status: PosOrderStatus,
    type: PosOrderType,
    source: 'manual' | 'qr',
    itemIds: number[],
    minutesAgo: number,
): PosOrder {
    const items: PosOrderItem[] = itemIds.map((itemId, index) => {
        const dish = menu.find((item) => item.id === itemId) ?? menu[0];
        const quantity = index === 0 ? 2 : 1;
        return {
            id: id * 10 + index,
            menuItemId: dish.id,
            name: dish.name,
            quantity,
            unitPrice: dish.price,
            lineTotal: dish.price * quantity,
            notes: null,
        };
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = Math.round(subtotal * 0.1);
    const createdAt = new Date(Date.now() - minutesAgo * 60000).toISOString();
    return {
        id,
        orderNumber: String(id),
        tableCode,
        customerName,
        type,
        status,
        source,
        guests: type === 'takeaway' ? 1 : 2,
        subtotal,
        tax,
        serviceCharge: 0,
        total: subtotal + tax,
        notes: null,
        createdAt,
        updatedAt: createdAt,
        items,
    };
}

export function computeDashboard(orders: PosOrder[]): PosDashboard {
    return {
        revenueToday: orders
            .filter((order) => order.status === 'paid')
            .reduce((sum, order) => sum + order.total, 0),
        paidToday: orders.filter((order) => order.status === 'paid').length,
        activeOrders: orders.filter(
            (order) => !['paid', 'cancelled'].includes(order.status),
        ).length,
        qrOrders: orders.filter((order) => order.source === 'qr').length,
        needAction: orders.filter((order) =>
            ['pending', 'ready'].includes(order.status),
        ).length,
        waitingPayment: orders.filter(
            (order) => order.status === 'waiting_payment',
        ).length,
    };
}

export function createDemoSnapshot(): PosSnapshot {
    const orders = [
        exampleOrder(
            925,
            'Ariel Hikmat',
            'A4',
            'ready',
            'dine_in',
            'qr',
            [1, 6],
            12,
        ),
        exampleOrder(
            924,
            'Denis Freeman',
            'B2',
            'waiting_payment',
            'dine_in',
            'qr',
            [4, 3],
            25,
        ),
        exampleOrder(
            923,
            'Morgan Cox',
            'B7',
            'preparing',
            'dine_in',
            'manual',
            [3, 6],
            31,
        ),
        exampleOrder(
            922,
            'Paul Rey',
            'C1',
            'pending',
            'dine_in',
            'qr',
            [5, 1],
            6,
        ),
        exampleOrder(
            921,
            'Maja Becker',
            'C2',
            'served',
            'dine_in',
            'manual',
            [4, 2],
            38,
        ),
        exampleOrder(
            920,
            'Erwan Richard',
            null,
            'paid',
            'takeaway',
            'manual',
            [1, 6],
            88,
        ),
        exampleOrder(
            919,
            'Anisa Putri',
            null,
            'accepted',
            'takeaway',
            'qr',
            [2, 3],
            19,
        ),
        exampleOrder(
            918,
            'Rizky Firmansyah',
            'A1',
            'paid',
            'dine_in',
            'qr',
            [5, 4],
            122,
        ),
    ];
    const now = new Date().toISOString();
    return {
        categories: [
            { id: 1, name: 'Sarapan', sortOrder: 1, isActive: true },
            { id: 2, name: 'Makanan', sortOrder: 2, isActive: true },
            { id: 3, name: 'Dessert', sortOrder: 3, isActive: true },
        ],
        menuItems: menu.map((item) => ({ ...item })),
        orders,
        tables: demoTables.map((table) => ({ ...table })),
        staff: [
            {
                id: 1,
                name: 'Dinda Putri',
                email: 'owner@example.test',
                role: 'owner',
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                name: 'Bima Santoso',
                email: 'kasir@example.test',
                role: 'kasir',
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 3,
                name: 'Rani Pratama',
                email: 'waiters@example.test',
                role: 'waiters',
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 4,
                name: 'Satria Wijaya',
                email: 'staff@example.test',
                role: 'waiters',
                isActive: false,
                createdAt: now,
                updatedAt: now,
            },
        ],
        dashboard: computeDashboard(orders),
        settings: structuredClone(demoSettings),
    };
}

export function createDemoReport(
    from: string,
    to: string,
    snapshot: PosSnapshot,
): PosReport {
    const currentOrders = snapshot.orders.filter((order) => {
        const date = businessDateKey(new Date(order.createdAt));
        return date >= from && date <= to;
    });
    const paidOrders = currentOrders.filter((order) => order.status === 'paid');
    const qr = currentOrders.filter((order) => order.source === 'qr').length;
    const dineIn = currentOrders.filter(
        (order) => order.type === 'dine_in',
    ).length;
    const takeaway = currentOrders.length - dineIn;
    return {
        range: { from, to },
        summary: {
            revenue: paidOrders.reduce((sum, order) => sum + order.total, 0),
            totalOrders: currentOrders.length,
            qrOrders: qr,
            menuSold: currentOrders.reduce(
                (sum, order) =>
                    sum + order.items.reduce((n, item) => n + item.quantity, 0),
                0,
            ),
            waitingPayment: currentOrders.filter(
                (order) => order.status === 'waiting_payment',
            ).length,
        },
        traffic: [{ label: businessDateKey(new Date()), qr, dineIn }],
        categorySales: [
            { name: 'Sarapan', quantity: 12, growth: 8 },
            { name: 'Makanan', quantity: 9, growth: 3 },
            { name: 'Dessert', quantity: 7, growth: 5 },
        ],
        serviceChannels: {
            qr,
            manual: currentOrders.length - qr,
            dineIn,
            takeaway,
        },
        recentOrders: currentOrders.slice(0, 5).map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            tableCode: order.tableCode,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
        })),
    };
}
