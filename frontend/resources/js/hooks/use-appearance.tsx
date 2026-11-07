export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const enforceLightMode = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem('appearance', 'light');
    localStorage.setItem('boardui:theme', 'light');
    setCookie('appearance', 'light');
    enforceLightMode();
}

export function useAppearance(): UseAppearanceReturn {
    const updateAppearance = (): void => {
        localStorage.setItem('appearance', 'light');
        localStorage.setItem('boardui:theme', 'light');
        setCookie('appearance', 'light');
        enforceLightMode();
    };

    return {
        appearance: 'light',
        resolvedAppearance: 'light',
        updateAppearance,
    } as const;
}
