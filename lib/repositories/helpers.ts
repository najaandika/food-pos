import type { PosOrderStatus, PosTableStatus } from '../pos-types';

export const toNumber = (value: unknown) => Number(value ?? 0);
export const toId = (value: bigint | number) => Number(value);
export const toBigInt = (value: number) => BigInt(value);

export const activeStatuses: PosOrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment'];

export const tableStatusByOrderStatus: Partial<Record<PosOrderStatus, PosTableStatus>> = {
  pending: 'occupied',
  accepted: 'occupied',
  preparing: 'preparing',
  ready: 'ready',
  served: 'occupied',
  waiting_payment: 'waiting_payment',
};

export const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function parseReportDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function reportRange(from?: string | null, to?: string | null) {
  const end = todayStart();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const fromDate = parseReportDate(from ?? null, start);
  const toDate = parseReportDate(to ?? null, end);
  toDate.setHours(23, 59, 59, 999);

  return fromDate <= toDate ? { fromDate, toDate } : { fromDate: start, toDate: end };
}

export function normalizeOrderItems(items: Array<{ menuItemId: number; quantity: number; notes?: string }>) {
  return items
    .map((item) => ({
      menuItemId: Number(item.menuItemId),
      quantity: Math.max(0, Math.floor(Number(item.quantity ?? 0))),
      notes: item.notes?.trim() || undefined,
    }))
    .filter((item) => Number.isFinite(item.menuItemId) && item.menuItemId > 0 && item.quantity > 0);
}

export function clampRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

export function calculateOrderTotal(subtotal: number, settings: { tax: { taxRate: number; serviceRate: number } }) {
  const tax = Math.round(subtotal * (settings.tax.taxRate / 100));
  const serviceCharge = Math.round(subtotal * (settings.tax.serviceRate / 100));
  const total = subtotal + tax + serviceCharge;
  return { tax, serviceCharge, total };
}
