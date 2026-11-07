import { formatRupiah } from '../../../lib/format';
import {
    httpRequest,
    HttpRequestError,
    laravelValidationMessage,
    type HttpMethod,
} from '../../../shared/api/http-client';
import type { AdminDish } from '../../runtime-data';
import { invalidateSharedQueries } from '../shared-query-cache';

export type ServerMenuDraft = {
    name: string;
    category: string;
    description: string;
    price: number;
    oldPrice: number | null;
    imageUrl: string;
    isAvailable: boolean;
    isBestSeller: boolean;
    badge: string | null;
};

type ServerCategory = {
    id: number;
    name: string;
    sort_order: number;
    is_active: boolean;
};

type ServerMenuItem = {
    id: number;
    category_id: number;
    category: { id: number; name: string } | null;
    name: string;
    description: string | null;
    price: string;
    old_price: string | null;
    image_url: string | null;
    is_available: boolean;
    is_best_seller: boolean;
    badge: string | null;
    sold_today?: number | null;
};

type Paginated<T> = {
    data: T[];
    last_page: number;
};

type Payload = {
    category_id: number;
    name: string;
    description: string | null;
    price: string;
    old_price: string | null;
    image_url: string | null;
    is_available: boolean;
    is_best_seller: boolean;
    badge: string | null;
};

export class MenuApiError extends HttpRequestError {
    constructor(message: string, status: number) {
        super(message, status);
        this.name = 'MenuApiError';
    }
}

function errorMessage(status: number): string {
    if (status === 401 || status === 419)
        return 'Sesi login berakhir. Silakan login ulang sebagai Owner.';
    if (status === 403)
        return 'Pengelolaan menu hanya diizinkan untuk akun Owner yang aktif.';
    if (status === 404)
        return 'Menu atau kategori tidak ditemukan. Muat ulang daftar.';
    if (status === 409)
        return 'Menu sudah digunakan dalam transaksi. Nonaktifkan ketersediaannya sebagai gantinya.';
    if (status === 422)
        return 'Periksa nama, kategori, harga dan URL gambar yang dimasukkan.';
    return 'Tidak dapat memuat atau menyimpan menu. Periksa koneksi ke Laravel.';
}

async function requestJson<T>(
    url: string,
    method: HttpMethod = 'GET',
    payload?: Record<string, unknown>,
): Promise<T> {
    try {
        return await httpRequest<T>(url, {
            method,
            payload,
            messages: {
                network:
                    'Tidak dapat menghubungi Laravel. Pastikan server berjalan.',
                invalidResponse: 'Respons Laravel tidak valid.',
            },
            resolveError: (status, body) => {
                // Preserve the existing contract: only 422 shows field
                // validation, and only 409 exposes the server message.
                if (status === 422)
                    return (
                        laravelValidationMessage(body) ?? errorMessage(status)
                    );
                if (
                    status === 409 &&
                    body !== null &&
                    typeof body === 'object' &&
                    'message' in body &&
                    typeof body.message === 'string'
                )
                    return body.message;
                return errorMessage(status);
            },
        });
    } catch (reason) {
        if (reason instanceof HttpRequestError)
            throw new MenuApiError(reason.message, reason.status);
        throw reason;
    }
}

async function readAll<T>(
    resource: '/pos/menu-items' | '/pos/categories',
): Promise<T[]> {
    const result: T[] = [];

    // The backend accepts at most 100 records per page.
    for (let page = 1; page <= 50; page++) {
        const response = await requestJson<Paginated<T>>(
            `${resource}?per_page=100&page=${page}`,
        );
        if (
            !Array.isArray(response.data) ||
            !Number.isInteger(response.last_page)
        )
            throw new MenuApiError(
                'Format data menu dari Laravel tidak valid.',
                200,
            );
        result.push(...response.data);
        if (page >= response.last_page) return result;
    }

    throw new MenuApiError(
        'Daftar menu melebihi batas pemuatan. Hubungi administrator.',
        200,
    );
}

function toAdminDish(item: ServerMenuItem): AdminDish {
    const price = Number(item.price);
    const oldPrice = item.old_price === null ? null : Number(item.old_price);

    return {
        id: item.id,
        categoryId: item.category_id,
        category: item.category?.name ?? 'Tanpa kategori',
        name: item.name,
        desc: item.description ?? '',
        rawPrice: price,
        price: formatRupiah(price),
        rawOldPrice: oldPrice,
        oldPrice: oldPrice !== null ? formatRupiah(oldPrice) : undefined,
        image: item.image_url ?? '',
        isAvailable: item.is_available,
        isBestSeller: item.is_best_seller,
        badge: item.badge ?? (item.is_best_seller ? 'Best Seller' : null),
        badgeTone: item.badge?.toLowerCase().includes('disc')
            ? 'discount'
            : 'popular',
        soldToday: Number(item.sold_today ?? 0),
        qty: 0,
    };
}

export async function getSavedMenu(): Promise<{
    dishes: AdminDish[];
    categories: ServerCategory[];
}> {
    const [items, categories] = await Promise.all([
        readAll<ServerMenuItem>('/pos/menu-items'),
        readAll<ServerCategory>('/pos/categories'),
    ]);
    return {
        dishes: items.map(toAdminDish),
        categories: categories.sort(
            (a, b) => a.sort_order - b.sort_order || a.id - b.id,
        ),
    };
}

function toPayload(
    draft: ServerMenuDraft,
    categories: ServerCategory[],
): Payload {
    const category = categories.find((item) => item.name === draft.category);
    if (!category) {
        throw new MenuApiError(
            'Pilih kategori dari daftar kategori yang tersimpan di Laravel.',
            422,
        );
    }

    return {
        category_id: category.id,
        name: draft.name,
        description: draft.description || null,
        price: String(draft.price),
        old_price: draft.oldPrice === null ? null : String(draft.oldPrice),
        image_url: draft.imageUrl.trim() || null,
        is_available: draft.isAvailable,
        is_best_seller: draft.isBestSeller,
        badge: draft.badge,
    };
}

export async function saveSavedMenu(
    draft: ServerMenuDraft,
    categories: ServerCategory[],
    id?: number,
): Promise<number> {
    const payload = toPayload(draft, categories);
    const item = await requestJson<ServerMenuItem>(
        id ? '/pos/menu-items/' + id : '/pos/menu-items',
        id ? 'PATCH' : 'POST',
        payload,
    );
    invalidateSharedQueries('service:catalog');
    return item.id;
}

export async function setSavedMenuAvailability(
    id: number,
    available: boolean,
): Promise<void> {
    await requestJson('/pos/menu-items/' + id, 'PATCH', {
        is_available: available,
    });
    invalidateSharedQueries('service:catalog');
}

export async function deleteSavedMenu(id: number): Promise<void> {
    await requestJson('/pos/menu-items/' + id, 'DELETE');
    invalidateSharedQueries('service:catalog');
}
