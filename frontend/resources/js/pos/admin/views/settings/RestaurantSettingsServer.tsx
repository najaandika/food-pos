import { useEffect, useState } from 'react';
import { Button } from '../../../../../../components/base/buttons/button';
import type { PosSettings } from '@/lib/pos-types';
import {
    loadRestaurantSettings,
    saveRestaurantSettings,
} from '../../owner-management-api';
import { useLocale } from '../../i18n-context';
import { SettingsView } from './SettingsView';

export function RestaurantSettingsServer() {
    const { locale } = useLocale();
    const [settings, setSettings] = useState<PosSettings | null>(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setError('');

        void loadRestaurantSettings(controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) setSettings(data);
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Tidak dapat memuat pengaturan restoran.',
                    );
                }
            });

        return () => controller.abort();
    }, [retry]);

    if (error || settings === null) {
        return (
            <section className="app-view active p-6" aria-live="polite">
                <h1 className="text-title-1-semibold">
                    {locale === 'id'
                        ? 'Pengaturan Restoran'
                        : 'Restaurant Settings'}
                </h1>
                <p
                    className="text-body-regular text-text-secondary mt-3"
                    role={error ? 'alert' : 'status'}
                >
                    {error ||
                        (locale === 'id'
                            ? 'Memuat pengaturan dari Laravel…'
                            : 'Loading settings from Laravel…')}
                </p>
                {error && (
                    <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => {
                            setSettings(null);
                            setRetry((current) => current + 1);
                        }}
                    >
                        {locale === 'id' ? 'Coba lagi' : 'Try again'}
                    </Button>
                )}
            </section>
        );
    }

    return (
        <SettingsView
            persisted
            initialSettings={settings}
            onSaved={async (next) => {
                const saved = await saveRestaurantSettings(next);
                setSettings(saved);
            }}
        />
    );
}
