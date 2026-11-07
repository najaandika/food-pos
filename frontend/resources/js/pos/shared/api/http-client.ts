/**
 * Same-origin Laravel JSON transport for POS feature adapters.
 *
 * Domain adapters own payload validation, cache invalidation and user-facing
 * business errors. The transport owns headers, CSRF, response parsing and
 * network failures. Mutations are never automatically retried.
 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type HttpMessages = {
    network?: string;
    invalidResponse?: string;
    fallback?: string;
    status?: Partial<Record<number, string>>;
};

export type HttpRequestOptions = {
    method?: HttpMethod;
    payload?: unknown;
    signal?: AbortSignal;
    messages?: HttpMessages;
    /**
     * Optional in-flight mutation guard. Only pass a key when a concurrent
     * repeat of the *same intent* must be rejected, never for ordinary GETs.
     * Server-side transactions/idempotency remain mandatory.
     */
    mutationKey?: string;
    /** Allows an adapter to preserve its existing error-message contract. */
    resolveError?: (status: number, body: unknown) => string | undefined;
};

export class HttpRequestError extends Error {
    public readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'HttpRequestError';
        this.status = status;
    }
}

const DEFAULT_STATUS_MESSAGES: Readonly<Partial<Record<number, string>>> = {
    401: 'Sesi login berakhir. Silakan login kembali.',
    403: 'Akun tidak diizinkan mengakses operasi ini.',
    404: 'Data tidak ditemukan. Muat ulang daftar.',
    409: 'Data berubah di server. Periksa kembali sebelum melanjutkan.',
    419: 'Sesi login berakhir. Silakan login kembali.',
    422: 'Data tidak valid. Periksa input.',
    500: 'Server Laravel gagal memproses permintaan.',
    502: 'Server Laravel belum dapat dihubungi.',
    503: 'Server Laravel sedang tidak tersedia.',
};

const activeMutations = new Set<string>();

function xsrfToken(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const encoded = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);
    if (!encoded) return undefined;
    try {
        return decodeURIComponent(encoded);
    } catch {
        return encoded;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Laravel's first form validation message, when one exists. */
export function laravelValidationMessage(body: unknown): string | undefined {
    const errors = isRecord(body) && isRecord(body.errors) ? body.errors : null;
    return errors
        ? Object.values(errors)
              .filter(Array.isArray)
              .flat()
              .find(
                  (message): message is string =>
                      typeof message === 'string' && message.length > 0,
              )
        : undefined;
}

function responseErrorMessage(
    status: number,
    body: unknown,
    messages: HttpMessages,
): string {
    const validation = laravelValidationMessage(body);
    const serverMessage =
        isRecord(body) && typeof body.message === 'string'
            ? body.message
            : undefined;
    return (
        validation ??
        serverMessage ??
        messages.status?.[status] ??
        messages.fallback ??
        DEFAULT_STATUS_MESSAGES[status] ??
        'Permintaan ke Laravel gagal. Coba kembali.'
    );
}

export async function httpRequest<T>(
    path: string,
    options: HttpRequestOptions = {},
): Promise<T> {
    // The XSRF header is a session secret. Never permit an absolute or
    // protocol-relative destination to receive it, even by mistake.
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        throw new HttpRequestError(
            'HTTP client POS hanya menerima endpoint Laravel same-origin.',
            0,
        );
    }

    const {
        method = 'GET',
        payload,
        signal,
        messages = {},
        mutationKey,
        resolveError,
    } = options;
    const guardedKey = method !== 'GET' ? mutationKey : undefined;
    if (guardedKey && activeMutations.has(guardedKey)) {
        throw new HttpRequestError('Tindakan yang sama masih diproses.', 409);
    }
    if (guardedKey) activeMutations.add(guardedKey);

    try {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        if (payload !== undefined) headers['Content-Type'] = 'application/json';
        if (method !== 'GET') {
            const token = xsrfToken();
            if (token) headers['X-XSRF-TOKEN'] = token;
        }

        let response: Response;
        try {
            response = await fetch(path, {
                method,
                headers,
                credentials: 'same-origin',
                cache: 'no-store',
                signal,
                ...(payload !== undefined
                    ? { body: JSON.stringify(payload) }
                    : {}),
            });
        } catch (error) {
            // Caller-initiated aborts are not connectivity failures.
            if (signal?.aborted) throw error;
            throw new HttpRequestError(
                messages.network ??
                    'Tidak dapat menghubungi server Laravel. Periksa koneksi.',
                0,
            );
        }

        if (response.status === 204 && response.ok) return undefined as T;

        let body: unknown;
        try {
            body = await response.json();
        } catch (error) {
            if (signal?.aborted) throw error;
            if (!response.ok) {
                throw new HttpRequestError(
                    resolveError?.(response.status, null) ??
                        responseErrorMessage(response.status, null, messages),
                    response.status,
                );
            }
            throw new HttpRequestError(
                messages.invalidResponse ?? 'Respons Laravel tidak valid.',
                response.status,
            );
        }

        if (!response.ok) {
            throw new HttpRequestError(
                resolveError?.(response.status, body) ??
                    responseErrorMessage(response.status, body, messages),
                response.status,
            );
        }

        return body as T;
    } finally {
        if (guardedKey) activeMutations.delete(guardedKey);
    }
}
