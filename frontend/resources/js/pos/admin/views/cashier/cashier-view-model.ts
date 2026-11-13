import type { PosSettings } from '../../../../lib/pos-types';
import type { AdminOrder } from '../../runtime-data';

export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type CashierFilter = 'all' | 'ready' | 'qr' | 'takeaway';
export type DiscountOption = 'none' | '10' | '15' | '20' | 'v10k' | 'v20k';
export type CashPreset = 'pas' | 'exact' | number;

const payableStatuses = ['ready', 'served', 'waiting_payment'] as const;

export function getPayableOrders(orders: AdminOrder[]): AdminOrder[] {
    return orders.filter(
        (order) =>
            !order.rawStatus ||
            payableStatuses.includes(
                order.rawStatus as (typeof payableStatuses)[number],
            ),
    );
}

export function filterPaymentQueue(
    payableOrders: AdminOrder[],
    serverMode: boolean,
    query: string,
    activeFilter: CashierFilter,
): AdminOrder[] {
    if (serverMode) return payableOrders; // Server owns filtering and pagination.
    const normalizedQuery = query.trim().toLowerCase();
    return payableOrders.filter((order) => {
        const matchesFilter =
            activeFilter === 'all' ||
            (activeFilter === 'ready' &&
                ['ready', 'served'].includes(order.rawStatus ?? '')) ||
            (activeFilter === 'qr' && order.source === 'qr') ||
            (activeFilter === 'takeaway' && order.type === 'takeaway');
        return (
            matchesFilter &&
            (!normalizedQuery ||
                order.name.toLowerCase().includes(normalizedQuery) ||
                order.table.toLowerCase().includes(normalizedQuery) ||
                order.meta.toLowerCase().includes(normalizedQuery) ||
                (order.orderNumber ?? '')
                    .toLowerCase()
                    .includes(normalizedQuery))
        );
    });
}

export function getSelectedQueueOrder(
    paymentQueue: AdminOrder[],
    selectedId: number | undefined,
): AdminOrder | undefined {
    return (
        paymentQueue.find((order) => order.id === selectedId) ?? paymentQueue[0]
    );
}

export function calculateCashierAmounts(
    selectedOrder: AdminOrder | undefined,
    discount: DiscountOption,
    settings: PosSettings | undefined,
) {
    const rawSubtotal =
        selectedOrder?.rawSubtotal ?? selectedOrder?.rawTotal ?? 0;

    const discountAmount = (() => {
        if (discount === '10') return Math.round(rawSubtotal * 0.1);
        if (discount === '15') return Math.round(rawSubtotal * 0.15);
        if (discount === '20') return Math.round(rawSubtotal * 0.2);
        if (discount === 'v10k') return Math.min(10000, rawSubtotal);
        if (discount === 'v20k') return Math.min(20000, rawSubtotal);
        return 0;
    })();

    const subtotal = Math.max(0, rawSubtotal - discountAmount);
    const taxRate = settings?.tax.taxRate ?? 5;
    const serviceRate = settings?.tax.serviceRate ?? 0;
    const tax =
        discount === 'none' && selectedOrder?.rawTax != null
            ? selectedOrder.rawTax
            : Math.round(subtotal * (taxRate / 100));
    const serviceCharge =
        discount === 'none' && selectedOrder?.rawServiceCharge != null
            ? selectedOrder.rawServiceCharge
            : Math.round(subtotal * (serviceRate / 100));
    const total =
        discount === 'none' && selectedOrder?.rawTotal != null
            ? selectedOrder.rawTotal
            : subtotal + tax + serviceCharge;

    return {
        rawSubtotal,
        discountAmount,
        subtotal,
        taxRate,
        serviceRate,
        tax,
        serviceCharge,
        total,
    };
}

export function getCashReceived(
    total: number,
    method: PaymentMethod,
    cashPreset: CashPreset,
    customCashInput: string,
): number {
    const defaultMinCash = Math.ceil(total / 10000) * 10000;
    if (method !== 'cash') return total;
    if (cashPreset === 'pas') return total;
    if (typeof cashPreset === 'number') return cashPreset;
    if (cashPreset === 'exact') {
        const parsed = Number.parseInt(customCashInput.replace(/\D/g, ''), 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return defaultMinCash;
}

export function getCashPresetOptions(total: number): number[] {
    const round50k = Math.ceil((total + 1) / 50000) * 50000;
    const round100k = Math.ceil((total + 1) / 100000) * 100000;
    const round200k = Math.ceil((total + 1) / 200000) * 200000;
    const presets = Array.from(
        new Set([round50k, round100k, round200k]),
    ).filter((val) => val >= total);
    return presets;
}
