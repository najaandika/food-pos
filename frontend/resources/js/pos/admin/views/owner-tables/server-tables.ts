import type { AdminTable } from '../../runtime-data';
import {
    httpRequest,
    HttpRequestError,
    type HttpMethod,
} from '../../../shared/api/http-client';
import {
    invalidateSharedQueries,
    loadSharedQuery,
    peekSharedQuery,
} from '../../shared/data/shared-query-cache';

export type ServerTableDraft = {
    code: string;
    name: string;
    area: string;
    seats: number;
    status: string;
};

type ServerTable = {
    id: number;
    code: string;
    name: string;
    area: string;
    seats: number;
    status: string;
    scans_today?: number;
    current_order_id?: number | null;
};

type TablePage = {
    data: ServerTable[];
    current_page: number;
    last_page: number;
};

function requestMessage(status: number): string {
    if (status === 401 || status === 419)
        return 'Sesi login telah kedaluwarsa. Login kembali sebagai Owner.';
    if (status === 403)
        return 'Akses QR meja hanya tersedia untuk akun Owner yang aktif.';
    if (status === 404)
        return 'Meja tidak ditemukan di database. Muat ulang daftar meja.';
    if (status === 409)
        return 'Meja masih memiliki pesanan aktif. Selesaikan transaksi terlebih dahulu.';
    if (status === 422)
        return 'Data meja ditolak. Pastikan kode unik, nama terisi, dan status sesuai.';
    return 'Server tidak dapat memproses data meja. Periksa koneksi dan database Laravel.';
}

export function getSavedTables(force = false): Promise<AdminTable[]> {
    return loadSharedQuery(OWNER_TABLES_KEY, readSavedTables, {
        staleTimeMs: 12000,
        force,
    });
}

export class TableApiError extends HttpRequestError {
    constructor(message: string, status: number) {
        super(message, status);
        this.name = 'TableApiError';
    }
}

async function requestJson<T>(
    url: string,
    method: HttpMethod = 'GET',
    payload?: ServerTableDraft,
): Promise<T> {
    try {
        return await httpRequest<T>(url, {
            method,
            payload,
            messages: {
                network:
                    'Tidak dapat menghubungi Laravel. Pastikan server berjalan.',
                invalidResponse: 'Respons server tidak valid. Coba muat ulang.',
            },
            // Tables deliberately show a controlled status message, never a
            // raw server exception or validation payload.
            resolveError: (status) => requestMessage(status),
        });
    } catch (reason) {
        if (reason instanceof HttpRequestError)
            throw new TableApiError(reason.message, reason.status);
        throw reason;
    }
}

function toAdminTable(table: ServerTable): AdminTable {
    const status = table.status;
    return {
        id: table.id,
        code: table.code,
        name: table.name,
        area: table.area,
        seats: table.seats,
        status: status
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        rawStatus: status as AdminTable['rawStatus'],
        scans: table.scans_today ?? 0,
        currentOrderId: table.current_order_id ?? null,
        lastOrder: table.current_order_id
            ? 'Pesanan aktif #' + table.current_order_id
            : 'Belum ada pesanan aktif',
        tone:
            status === 'need_waiter'
                ? 'call'
                : status === 'waiting_payment'
                  ? 'payment'
                  : status,
    };
}

const OWNER_TABLES_KEY = 'owner:tables';

export function peekSavedTables(): AdminTable[] | undefined {
    return peekSharedQuery<AdminTable[]>(OWNER_TABLES_KEY);
}

async function readSavedTables(): Promise<AdminTable[]> {
    const result: ServerTable[] = [];
    for (let page = 1; page <= 20; page++) {
        const response = await requestJson<TablePage>(
            '/pos/tables?per_page=100&page=' + page,
        );
        if (
            !Array.isArray(response.data) ||
            !Number.isInteger(response.last_page) ||
            response.last_page < page
        )
            throw new TableApiError(
                'Daftar meja dari server tidak valid.',
                200,
            );
        result.push(...response.data);
        if (page >= response.last_page) return result.map(toAdminTable);
    }
    throw new TableApiError(
        'Daftar meja terlalu banyak. Hubungi administrator.',
        200,
    );
}

export async function saveSavedTable(
    payload: ServerTableDraft,
    id?: number,
): Promise<number> {
    const result = await requestJson<ServerTable>(
        id ? '/pos/tables/' + id : '/pos/tables',
        id ? 'PATCH' : 'POST',
        payload,
    );
    invalidateSharedQueries([OWNER_TABLES_KEY, 'service:tables']);
    return result.id;
}

export async function deleteSavedTable(id: number): Promise<void> {
    await requestJson('/pos/tables/' + id, 'DELETE');
    invalidateSharedQueries([OWNER_TABLES_KEY, 'service:tables']);
}

/**
 * Explicit Owner action: revokes the previous printed QR and customer link.
 * The new bearer token is never persisted in frontend snapshots or logs.
 */
export async function rotateSavedTableQrToken(id: number): Promise<void> {
    const result = await requestJson<{
        table_id?: number;
        qr_token?: string;
    }>('/pos/tables/' + id + '/rotate-qr-token', 'POST');
    if (
        result.table_id !== id ||
        !result.qr_token ||
        !/^[A-Za-z0-9]{64}$/.test(result.qr_token)
    ) {
        throw new TableApiError(
            'Token QR baru tidak valid. Muat ulang meja sebelum mencetak QR.',
            200,
        );
    }
}

export async function getCustomerTableUrl(table: AdminTable): Promise<string> {
    if (!table.id) {
        throw new TableApiError(
            'Meja ini belum tersimpan di database. Simpan meja terlebih dahulu.',
            0,
        );
    }
    const result = await requestJson<{ table_id?: number; qr_token?: string }>(
        '/pos/tables/' + table.id + '/qr-token',
    );
    if (
        result.table_id !== table.id ||
        !result.qr_token ||
        !/^[A-Za-z0-9]{64}$/.test(result.qr_token)
    ) {
        throw new TableApiError(
            'Token QR meja tidak valid. Coba muat ulang.',
            200,
        );
    }
    return (
        window.location.origin + '/table/' + encodeURIComponent(result.qr_token)
    );
}
