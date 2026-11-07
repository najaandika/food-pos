import { enTranslations } from './i18n/locales/en';
import { idTranslations } from './i18n/locales/id';

export type Locale = 'en' | 'id';

const translations: Record<Locale, Record<string, string>> = {
    en: enTranslations,
    id: idTranslations,
};

export function t(key: string, locale: Locale): string {
    return translations[locale][key] ?? translations.en[key] ?? key;
}

export { translations };
