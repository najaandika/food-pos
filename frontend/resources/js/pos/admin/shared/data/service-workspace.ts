import type { AdminDish, AdminTable } from '../../runtime-data';
import { formatRupiah } from '../../../lib/format';
import {
    httpRequest,
    HttpRequestError,
    type HttpMethod,
} from '../../../shared/api/http-client';
import {
    invalidateSharedQueries,
    loadSharedQuery,
    peekSharedQuery,
} from './shared-query-cache';

type ServerDish = {
    id: number;
    categoryId: number;
    category: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string | null;
    badge: string | null;
    isBestSeller: boolean;
};

type ServerTable = {
    id: number;
    code: string;
    name: string;
    area: string;
    seats: number;
    status: string;
    current_order_id: number | null;
};

export type ManualOrderDraft = {
    tableCode?: string;
    customerName: string;
    type: 'dine_in' | 'takeaway';
    guests: number;
    notes?: string;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
};

export type SavedOrderReceipt = {
    id: number;
    orderNumber: string;
    total: number;
};

export class ServiceApiError extends HttpRequestError {
    constructor(message: string, status: number) {
        super(message, status);
        this.name = 'ServiceApiError';
    }
}

async function request<T>(
    path: string,
    method: HttpMethod = 'GET',
    payload?: Record<string, unknown>,
): Promise<T> {
    try {
        return await httpRequest<T>(path, {
            method,
            payload,
            messages: {
                network:
                    'Tidak dapat menghubungi server Laravel. Periksa koneksi.',
                invalidResponse: 'Respons Laravel tidak valid.',
                fallback: 'Permintaan ke Laravel gagal. Coba kembali.',
                status: {
                    401: 'Sesi login berakhir. Silakan login kembali.',
                    403: 'Akun tidak diizinkan mengakses operasi ini.',
                    409: 'Meja atau status pesanan telah berubah. Muat ulang.',
                    419: 'Sesi login berakhir. Silakan login kembali.',
                    422: 'Data pesanan tidak valid. Periksa input.',
                },
            },
        });
    } catch (reason) {
        if (reason instanceof HttpRequestError) {
            throw new ServiceApiError(reason.message, reason.status);
        }
        throw reason;
    }
}

const SERVICE_CATALOG = 'service:catalog';
const SERVICE_TABLES = 'service:tables';

export function peekServiceCatalog(): AdminDish[] | undefined {
    return peekSharedQuery<AdminDish[]>(SERVICE_CATALOG);
}

export function peekServiceTables(): AdminTable[] | undefined {
    return peekSharedQuery<AdminTable[]>(SERVICE_TABLES);
}

export function getServiceCatalog(force = false): Promise<AdminDish[]> {
    return loadSharedQuery(
        SERVICE_CATALOG,
        async () => {
            const response = await request<{ data: ServerDish[] }>(
                '/pos/service-catalog',
            );
            if (!Array.isArray(response.data))
                throw new ServiceApiError(
                    'Katalog dari Laravel tidak valid.',
                    200,
                );
            return response.data.map((item) => ({
                id: item.id,
                categoryId: item.categoryId,
                category: item.category,
                name: item.name,
                desc: item.description,
                rawPrice: item.price,
                price: formatRupiah(item.price),
                image: item.imageUrl ?? '',
                isAvailable: true,
                isBestSeller: item.isBestSeller,
                badge:
                    item.badge ??
                    (item.isBestSeller ? 'Best Seller' : undefined),
                badgeTone: 'popular',
                qty: 0,
                soldToday: 0,
            }));
        },
        { staleTimeMs: 60000, force },
    );
}

export function getServiceTables(force = false): Promise<AdminTable[]> {
    return loadSharedQuery(
        SERVICE_TABLES,
        async () => {
            const response = await request<{ data: ServerTable[] }>(
                '/pos/service-tables',
            );
            if (!Array.isArray(response.data))
                throw new ServiceApiError(
                    'Data meja dari Laravel tidak valid.',
                    200,
                );
            return response.data.map((table) => ({
                id: table.id,
                code: table.code,
                name: table.name,
                area: table.area,
                seats: table.seats,
                status: table.status.replaceAll('_', ' '),
                rawStatus: table.status as AdminTable['rawStatus'],
                currentOrderId: table.current_order_id,
                lastOrder: table.current_order_id
                    ? 'Pesanan aktif #' + table.current_order_id
                    : 'Tidak ada pesanan aktif',
                scans: 0,
                tone:
                    table.status === 'need_waiter'
                        ? 'call'
                        : table.status === 'waiting_payment'
                          ? 'payment'
                          : table.status,
            }));
        },
        { staleTimeMs: 12000, force },
    );
}

export async function postManualOrder(
    draft: ManualOrderDraft,
): Promise<SavedOrderReceipt> {
    let order: SavedOrderReceipt;
    try {
        order = await request<SavedOrderReceipt>('/pos/manual-orders', 'POST', {
            type: draft.type,
            ...(draft.type === 'dine_in'
                ? { table_code: draft.tableCode ?? '' }
                : {}),
            customer_name: draft.customerName.trim(),
            guests: draft.guests,
            notes: draft.notes ?? null,
            items: draft.items.map((line) => ({
                menu_item_id: line.menuItemId,
                quantity: line.quantity,
                notes: line.notes ?? null,
            })),
        });
    } catch (reason) {
        // A lost POST response cannot prove the database write failed.
        // Avoid telling the cashier to resend and accidentally duplicate it.
        if (reason instanceof ServiceApiError && reason.status === 0)
            throw new ServiceApiError(
                'Koneksi terputus. Pesanan mungkin sudah tersimpan. Periksa Orders sebelum mengirim ulang.',
                0,
            );
        throw reason;
    }

    if (!Number.isInteger(order.id) || !order.orderNumber)
        throw new ServiceApiError(
            'Pesanan mungkin sudah tersimpan, tetapi konfirmasi server tidak valid. Periksa Orders sebelum mengirim ulang.',
            200,
        );
    invalidateSharedQueries([
        'orders:all',
        SERVICE_TABLES,
        'cashier:queue:',
        'report:',
        'owner:tables',
    ]);
    return order;
}

export async function acknowledgeServiceCall(id: number): Promise<void> {
    await request('/pos/service-tables/' + id + '/acknowledge', 'PATCH');
    invalidateSharedQueries([SERVICE_TABLES, 'owner:tables']);
}
