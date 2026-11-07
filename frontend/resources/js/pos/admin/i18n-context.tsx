import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { t as translate, type Locale } from './i18n';

type LocaleContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
};

const STORAGE_KEY = 'pos-locale';

const LocaleContext = createContext<LocaleContextValue>({
    locale: 'en',
    setLocale: () => {},
    t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
            if (stored === 'en' || stored === 'id') setLocaleState(stored);
        } catch {
            // SSR or no localStorage
        }
    }, []);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Ignore
        }
    }, []);

    const t = useCallback((key: string) => translate(key, locale), [locale]);

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}
