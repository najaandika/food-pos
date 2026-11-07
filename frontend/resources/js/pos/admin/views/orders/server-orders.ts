import type { PosOrder, PosOrderStatus } from '@/lib/pos-types';
import {
    httpRequest,
    HttpRequestError,
    laravelValidationMessage,
    type HttpMethod,
} from '../../../shared/api/http-client';
import { toAdminOrders, type AdminOrder } from '../../runtime-data';
import {
    invalidateSharedQueries,
    loadSharedQuery,
    peekSharedQuery,
} from '../shared-query-cache';

type Paginated<T> = { data: T[]; last_page: number };

type ServerOrder = PosOrder & {
    paymentMethod?: 'cash' | 'qris' | 'transfer' | null;
};

export class OrdersApiError extends HttpRequestError {
    constructor(message: string, status: number) {
        super(message, status);
        this.name = 'OrdersApiError';
    }
}

function messageForStatus(status: number): string {
    if (status === 401 || status === 419)
        return 'Sesi login berakhir. Login ulang untuk mengelola pesanan.';
    if (status === 403) return 'Akun tidak diizinkan menjalankan aksi ini.';
    if (status === 404) return 'Pesanan tidak ditemukan. Muat ulang daftar.';
    if (status === 409)
        return 'Status pesanan berubah atau pembayaran sudah tercatat. Muat ulang sebelum mencoba lagi.';
    if (status === 422)
        return 'Data pesanan ditolak. Periksa isian atau metode pembayaran.';
    return 'Tidak dapat terhubung ke server Laravel. Periksa koneksi dan coba lagi.';
}

async function orderRequest<T>(
    url: string,
    method: HttpMethod = 'GET',
    payload?: Record<string, string>,
): Promise<T> {
    try {
        return await httpRequest<T>(url, {
            method,
            payload,
            messages: {
                network: 'Tidak dapat menghubungi Laravel. Periksa koneksi.',
                invalidResponse: 'Respons server tidak valid.',
            },
            resolveError: (status, body) => {
                if (status === 422)
                    return (
                        laravelValidationMessage(body) ??
                        messageForStatus(status)
                    );
                if (
                    status === 409 &&
                    body !== null &&
                    typeof body === 'object' &&
                    'message' in body &&
                    typeof body.message === 'string'
                )
                    return body.message;
                return messageForStatus(status);
            },
        });
    } catch (reason) {
        if (reason instanceof HttpRequestError)
            throw new OrdersApiError(reason.message, reason.status);
        throw reason;
    }
}

const ORDERS_KEY = 'orders:all';

export function peekSavedOrders(): AdminOrder[] | undefined {
    return peekSharedQuery<AdminOrder[]>(ORDERS_KEY);
}

async function readOrdersPage(page: number): Promise<Paginated<ServerOrder>> {
    const response = await orderRequest<Paginated<ServerOrder>>(
        '/pos/orders?per_page=100&page=' + page,
    );
    if (
        !Array.isArray(response.data) ||
        !Number.isInteger(response.last_page) ||
        response.last_page < page
    ) {
        throw new OrdersApiError(
            'Daftar pesanan dari server tidak valid.',
            200,
        );
    }

    for (const order of response.data) {
        if (
            typeof order.id !== 'number' ||
            typeof order.orderNumber !== 'string' ||
            typeof order.status !== 'string' ||
            !Array.isArray(order.items)
        )
            throw new OrdersApiError(
                'Data pesanan dari Laravel tidak lengkap.',
                200,
            );
    }
    return response;
}

export function getSavedOrders(force = false): Promise<AdminOrder[]> {
    return loadSharedQuery(
        ORDERS_KEY,
        async () => {
            const first = await readOrdersPage(1);
            if (first.last_page > 100)
                throw new OrdersApiError(
                    'Terlalu banyak halaman pesanan untuk ditampilkan sekaligus.',
                    200,
                );

            const pages: ServerOrder[][] = [];
            pages.length = first.last_page;
            pages[0] = first.data;
            let nextPage = 2;

            // After the first page reveals last_page, fetch the remainder with
            // bounded concurrency. Avoid serial latency without overwhelming
            // php artisan serve or losing page order.
            const worker = async () => {
                while (nextPage <= first.last_page) {
                    const page = nextPage++;
                    const result = await readOrdersPage(page);
                    if (result.last_page !== first.last_page)
                        throw new OrdersApiError(
                            'Daftar pesanan berubah saat dimuat. Coba sinkronkan ulang.',
                            409,
                        );
                    pages[page - 1] = result.data;
                }
            };
            await Promise.all(
                Array.from(
                    { length: Math.min(3, first.last_page - 1) },
                    worker,
                ),
            );
            const orders = pages.flat();
            return toAdminOrders(orders).map((item, index) => ({
                ...item,
                paymentMethod: orders[index].paymentMethod ?? undefined,
            }));
        },
        { staleTimeMs: 12000, force },
    );
}

export async function advanceSavedOrder(
    id: number,
    status: PosOrderStatus,
): Promise<void> {
    await orderRequest('/pos/orders/' + id + '/status', 'PATCH', { status });
    invalidateSharedQueries([
        ORDERS_KEY,
        'service:tables',
        'owner:tables',
        'cashier:queue:',
        'report:',
    ]);
}

export async function recordSavedCashPayment(
    id: number,
    method: 'cash',
    receivedAmount: number,
    expectedTotal: number,
): Promise<void> {
    await orderRequest('/pos/orders/' + id + '/cash-payment', 'POST', {
        method,
        received_amount: receivedAmount.toFixed(2),
        expected_total: expectedTotal.toFixed(2),
    });
    invalidateSharedQueries([
        ORDERS_KEY,
        'service:tables',
        'owner:tables',
        'cashier:queue:',
        'report:',
    ]);
}
