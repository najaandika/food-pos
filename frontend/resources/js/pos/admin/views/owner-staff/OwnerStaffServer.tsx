import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../../../components/base/buttons/button';
import type { PosStaff } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';
import { toAdminStaff } from '../../runtime-data';
import {
    createOwnerStaff,
    disableOwnerStaff,
    loadOwnerStaff,
    updateOwnerStaff,
} from '../../owner-management-api';
import { OwnerStaffView } from './OwnerStaffView';

export function OwnerStaffServer() {
    const { locale } = useLocale();
    const [staff, setStaff] = useState<PosStaff[] | null>(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setError('');

        void loadOwnerStaff(controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setStaff(result);
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Tidak dapat memuat staf.',
                    );
                }
            });

        return () => controller.abort();
    }, [retry]);

    const rows = useMemo(() => toAdminStaff(staff ?? []), [staff]);

    if (error || staff === null) {
        return (
            <section className="app-view active p-6" aria-live="polite">
                <h1 className="text-title-1-semibold">
                    {locale === 'id' ? 'Manajemen Staf' : 'Staff Management'}
                </h1>
                <p
                    className="text-body-regular text-text-secondary mt-3"
                    role={error ? 'alert' : 'status'}
                >
                    {error ||
                        (locale === 'id'
                            ? 'Memuat data staf dari Laravel…'
                            : 'Loading staff from Laravel…')}
                </p>
                {error && (
                    <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => {
                            setStaff(null);
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
        <OwnerStaffView
            staff={rows}
            persisted
            onCreateStaff={async (payload) => {
                const created = await createOwnerStaff(payload);
                setStaff((current) => [...(current ?? []), created]);
            }}
            onUpdateStaff={async (id, payload) => {
                if (id === undefined) throw new Error('Staf tidak ditemukan.');
                const updated = await updateOwnerStaff(id, payload);
                setStaff((current) =>
                    (current ?? []).map((person) =>
                        person.id === id ? updated : person,
                    ),
                );
            }}
            onDisableStaff={async (id) => {
                if (id === undefined) throw new Error('Staf tidak ditemukan.');
                const updated = await disableOwnerStaff(id);
                setStaff((current) =>
                    (current ?? []).map((person) =>
                        person.id === id ? updated : person,
                    ),
                );
            }}
        />
    );
}
