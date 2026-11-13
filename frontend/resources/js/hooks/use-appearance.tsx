import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

type AppearanceSnapshot = Pick<
    UseAppearanceReturn,
    'appearance' | 'resolvedAppearance'
>;

const PREFERENCE_KEY = 'appearance';
const BOARDUI_KEY = 'boardui:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const SERVER_SNAPSHOT: AppearanceSnapshot = {
    appearance: 'system',
    resolvedAppearance: 'light',
};

let snapshot: AppearanceSnapshot = SERVER_SNAPSHOT;
let initialized = false;
const subscribers = new Set<() => void>();
let detachBrowserListeners: (() => void) | null = null;

const isAppearance = (value: string | null): value is Appearance =>
    value === 'light' || value === 'dark' || value === 'system';

function readCookie(): Appearance | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${PREFERENCE_KEY}=`))
        ?.slice(PREFERENCE_KEY.length + 1);
    const saved = value ?? null;
    return isAppearance(saved) ? saved : null;
}

function readPreference(): Appearance {
    if (typeof window === 'undefined') return 'system';
    try {
        const saved = window.localStorage.getItem(PREFERENCE_KEY);
        if (isAppearance(saved)) return saved;
    } catch {
        // Cookie remains a supported fallback when storage is unavailable.
    }
    const cookie = readCookie();
    if (cookie) return cookie;
    try {
        const oldBoardUI = window.localStorage.getItem(BOARDUI_KEY);
        if (isAppearance(oldBoardUI)) return oldBoardUI;
    } catch {
        // Fall through to system preference.
    }
    return 'system';
}

function systemAppearance(): ResolvedAppearance {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function applyAppearance(appearance: Appearance): void {
    if (typeof document === 'undefined') return;
    const resolved = appearance === 'system' ? systemAppearance() : appearance;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
    const changed =
        snapshot.appearance !== appearance ||
        snapshot.resolvedAppearance !== resolved;
    if (changed) {
        snapshot = { appearance, resolvedAppearance: resolved };
        subscribers.forEach((notify) => notify());
    }
}

function writePreference(appearance: Appearance): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(PREFERENCE_KEY, appearance);
    } catch {
        // A private browsing context may disable localStorage.
    }
    if (typeof document !== 'undefined') {
        document.cookie = `${PREFERENCE_KEY}=${appearance};path=/;max-age=31536000;SameSite=Lax`;
    }
}

function writeBoardUIResolvedTheme(): void {
    if (typeof window === 'undefined') return;
    try {
        // The BoardUI registry only understands light/dark, not system.
        window.localStorage.setItem(BOARDUI_KEY, snapshot.resolvedAppearance);
    } catch {
        // The root theme works without browser storage.
    }
}

export function initializeTheme(): void {
    if (typeof window === 'undefined') return;
    const preference = readPreference();
    initialized = true;
    applyAppearance(preference);
    writePreference(preference);
    writeBoardUIResolvedTheme();
}

export function updateAppearance(mode: Appearance): void {
    if (typeof window === 'undefined' || !isAppearance(mode)) return;
    initialized = true;
    applyAppearance(mode);
    writePreference(mode);
    writeBoardUIResolvedTheme();
}

function subscribe(notify: () => void): () => void {
    subscribers.add(notify);
    if (subscribers.size === 1 && typeof window !== 'undefined') {
        const query = window.matchMedia?.(DARK_QUERY);
        const onSystemChange = () => {
            if (snapshot.appearance !== 'system') return;
            applyAppearance('system');
            writeBoardUIResolvedTheme();
        };
        const onStorage = (event: StorageEvent) => {
            if (
                event.key !== null &&
                event.key !== PREFERENCE_KEY &&
                event.key !== BOARDUI_KEY
            ) {
                return;
            }
            const preference = readPreference();
            applyAppearance(preference);
            writePreference(preference);
            writeBoardUIResolvedTheme();
        };
        query?.addEventListener('change', onSystemChange);
        window.addEventListener('storage', onStorage);
        detachBrowserListeners = () => {
            query?.removeEventListener('change', onSystemChange);
            window.removeEventListener('storage', onStorage);
        };
    }
    if (!initialized) initializeTheme();
    return () => {
        subscribers.delete(notify);
        if (subscribers.size === 0) {
            detachBrowserListeners?.();
            detachBrowserListeners = null;
        }
    };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useAppearance(): UseAppearanceReturn {
    const state = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );
    return { ...state, updateAppearance };
}
