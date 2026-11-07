export type TableStatusValue =
    | 'available'
    | 'occupied'
    | 'preparing'
    | 'ready'
    | 'waiting_payment'
    | 'need_waiter'
    | 'inactive';

const labels: Record<TableStatusValue, { en: string; id: string }> = {
    available: { en: 'Available', id: 'Tersedia' },
    occupied: { en: 'Occupied', id: 'Terisi' },
    preparing: { en: 'Preparing', id: 'Disiapkan' },
    ready: { en: 'Ready', id: 'Siap' },
    waiting_payment: { en: 'Waiting Payment', id: 'Menunggu Pembayaran' },
    need_waiter: { en: 'Need Waiter', id: 'Butuh Pelayan' },
    inactive: { en: 'Inactive', id: 'Nonaktif' },
};

export function getTableStatusLabel(status: string, locale: 'en' | 'id') {
    return (
        labels[status as TableStatusValue]?.[locale] ??
        status.replaceAll('_', ' ')
    );
}

export function getTableStatusDotColor(
    status: string,
): 'green' | 'yellow' | 'indigo' {
    if (status === 'available') return 'green';
    if (
        status === 'occupied' ||
        status === 'preparing' ||
        status === 'ready' ||
        status === 'need_waiter' ||
        status === 'waiting_payment'
    )
        return 'yellow';
    return 'indigo';
}
