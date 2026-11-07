import type { PosOrder } from '@/lib/pos-types';
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

export type CashierFilter = 'all' | 'ready' | 'qr' | 'takeaway';
export type CashierStats = {
    unpaidCount: number;
    waitingCount: number;
    demoUnpaidCount?: number;
    demoWaitingCount?: number;
    paidCount: number;
    paidTotal: string;
    cashPaidCount: number;
    cashPaidTotal: string;
};
export type CashierQueueResult = {
    orders: AdminOrder[];
    stats: CashierStats;
    page: number;
    lastPage: number;
    total: number;
};

function queueKey(filter: CashierFilter, search: string, page: number): string {
    return 'cashier:queue:' + JSON.stringify([filter, search.trim(), page]);
}

export function peekCashierQueue(
    filter: CashierFilter = 'all',
    search = '',
    page = 1,
): CashierQueueResult | undefined {
    return peekSharedQuery<CashierQueueResult>(queueKey(filter, search, page));
}
export type ConfirmedCashierReceipt = PosOrder & {
    discount: string;
    payment: {
        id: number;
        status: 'paid';
        method: 'cash' | 'qris' | 'transfer';
        amount: string;
        cashReceived: string | null;
        cashChange: string | null;
        paidAt: string;
    };
};
type QueueResponse = {
    data: PosOrder[];
    current_page: number;
    last_page: number;
    total: number;
    stats: CashierStats;
};

export class CashierApiError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
        this.name = 'CashierApiError';
    }
}

async function request<T>(
    url: string,
    method: HttpMethod = 'GET',
    payload?: Record<string, string>,
    signal?: AbortSignal,
): Promise<T> {
    try {
        const result = await httpRequest<T>(url, {
            method,
            payload,
            signal,
            messages: {
                network:
                    'Koneksi Laravel terputus. Periksa jaringan lalu coba kembali.',
                invalidResponse: 'Respons Laravel tidak valid.',
            },
            resolveError: (status, body) => {
                const validation = laravelValidationMessage(body);
                if (validation) return validation;
                if (
                    status === 409 &&
                    body !== null &&
                    typeof body === 'object' &&
                    'message' in body &&
                    typeof body.message === 'string'
                )
                    return body.message;
                if (status === 401 || status === 419)
                    return 'Sesi login habis. Silakan masuk kembali.';
                if (status === 403)
                    return 'Anda tidak memiliki izin melakukan pembayaran.';
                if (status === 404)
                    return 'Pesanan atau struk tidak ditemukan.';
                if (status === 409)
                    return 'Data tagihan berubah atau sudah lunas. Periksa kembali rincian terbaru.';
                return 'Permintaan gagal. Coba lagi.';
            },
        });
        if (!result || typeof result !== 'object')
            throw new CashierApiError('Respons Laravel tidak valid.', 200);
        return result;
    } catch (reason) {
        if (reason instanceof HttpRequestError)
            throw new CashierApiError(reason.message, reason.status);
        throw reason;
    }
}

export async function cashierQueue(
    filter: CashierFilter,
    search: string,
    page: number,
    _signal?: AbortSignal,
    force = false,
): Promise<CashierQueueResult> {
    return loadSharedQuery(
        queueKey(filter, search, page),
        async () => {
            const params = new URLSearchParams({
                per_page: '25',
                filter,
                page: String(page),
            });
            if (search.trim()) params.set('search', search.trim());
            // Keep the underlying shared GET alive across StrictMode unmounts.
            // Caller AbortSignals only control whether a view applies the result.
            const result = await request<QueueResponse>(
                '/pos/cashier/orders?' + params,
            );
            if (!Array.isArray(result.data) || !result.stats) {
                throw new CashierApiError(
                    'Data antrian kasir tidak lengkap.',
                    200,
                );
            }
            return {
                orders: toAdminOrders(result.data),
                stats: result.stats,
                page: result.current_page,
                lastPage: result.last_page,
                total: result.total,
            };
        },
        { staleTimeMs: 5000, force },
    );
}

export async function cashierDetail(
    id: number,
    _signal?: AbortSignal,
): Promise<AdminOrder> {
    // Never serve a cached payable bill: request fresh on each selection,
    // deduplicating only an identical in-flight StrictMode GET.
    return loadSharedQuery(
        'cashier:detail:' + id,
        async () => {
            const order = await request<PosOrder>('/pos/cashier/orders/' + id);
            if (order.id !== id || !Array.isArray(order.items)) {
                throw new CashierApiError(
                    'Rincian tagihan dari server tidak sesuai.',
                    200,
                );
            }
            return toAdminOrders([order])[0];
        },
        { force: true, staleTimeMs: 0 },
    );
}

export async function cashierPayCash(
    orderId: number,
    received: string,
    expectedTotal: string,
    idempotencyKey: string,
): Promise<{ receiptUrl: string; idempotent: boolean }> {
    const result = await request<{
        status: string;
        payment: { status: string; method: string };
        receiptUrl: string;
        idempotent: boolean;
    }>('/pos/orders/' + orderId + '/cash-payment', 'POST', {
        method: 'cash',
        received_amount: received,
        expected_total: expectedTotal,
        idempotency_key: idempotencyKey,
    });
    if (
        result.status !== 'paid' ||
        result.payment?.status !== 'paid' ||
        result.payment.method !== 'cash'
    ) {
        throw new CashierApiError(
            'Pembayaran belum dikonfirmasi Laravel.',
            200,
        );
    }
    invalidateSharedQueries([
        'cashier:queue:',
        'cashier:detail:',
        'orders:all',
        'service:tables',
        'owner:tables',
        'report:',
    ]);
    return { receiptUrl: result.receiptUrl, idempotent: result.idempotent };
}

export async function cashierReceipt(
    orderId: number,
): Promise<ConfirmedCashierReceipt> {
    const receipt = await request<ConfirmedCashierReceipt>(
        '/pos/cashier/orders/' + orderId + '/receipt',
    );
    if (
        receipt.status !== 'paid' ||
        receipt.payment?.status !== 'paid' ||
        !receipt.payment?.paidAt
    ) {
        throw new CashierApiError(
            'Struk belum terverifikasi oleh Laravel.',
            200,
        );
    }
    return receipt;
}
