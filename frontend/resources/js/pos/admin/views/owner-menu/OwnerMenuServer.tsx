import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../../../../components/base/buttons/button';
import { Spinner } from '../../../../../../components/base/spinner/spinner';
import { OwnerMenuView } from '../OwnerMenuView';
import {
    deleteSavedMenu,
    getSavedMenu,
    MenuApiError,
    saveSavedMenu,
    setSavedMenuAvailability,
    type ServerMenuDraft,
} from './server-menu';

type SavedCatalog = Awaited<ReturnType<typeof getSavedMenu>>;

function showError(error: unknown): string {
    return error instanceof MenuApiError
        ? error.message
        : 'Terjadi kesalahan saat mengelola menu. Coba lagi.';
}

/** Isolated live-DB owner catalog. Other POS workspaces remain untouched. */
export function OwnerMenuServer() {
    const [catalog, setCatalog] = useState<SavedCatalog | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const busyRef = useRef(false);

    const load = useCallback(async () => {
        const next = await getSavedMenu();
        setCatalog(next);
    }, []);

    const retry = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            await load();
        } catch (reason) {
            setError(showError(reason));
        } finally {
            setLoading(false);
        }
    }, [load]);

    useEffect(() => {
        void retry();
    }, [retry]);

    const mutate = async <T,>(
        action: () => Promise<T>,
        message: string,
    ): Promise<T> => {
        if (busyRef.current)
            throw new MenuApiError('Perubahan sebelumnya masih disimpan.', 0);
        busyRef.current = true;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const result = await action();
            await load();
            setNotice(message);
            return result;
        } catch (reason) {
            setError(showError(reason));
            throw reason;
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    };

    if (loading && !catalog) {
        return (
            <section
                className="app-view active owner-menu-server-state"
                role="status"
            >
                <Spinner size="md" aria-label="Memuat katalog menu" />
                Memuat katalog menu dari Laravel…
            </section>
        );
    }

    if (!catalog) {
        return (
            <section
                className="app-view active owner-menu-server-state"
                role="alert"
            >
                <p>{error || 'Katalog menu belum dapat dimuat.'}</p>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => void retry()}
                >
                    Coba lagi
                </Button>
            </section>
        );
    }

    const categories = catalog.categories.map((category) => category.name);
    const toggleAvailability = async (
        id: number | undefined,
        isAvailable: boolean | undefined,
    ): Promise<void> => {
        if (id === undefined) return;
        try {
            await mutate(
                () => setSavedMenuAvailability(id, !isAvailable),
                'Ketersediaan menu berhasil diperbarui di database.',
            );
        } catch {
            // Error is displayed in the page alert; this action has no form.
        }
    };

    return (
        <OwnerMenuView
            dishes={catalog.dishes}
            serverCategories={categories}
            serverBusy={busy}
            serverError={error}
            serverNotice={notice}
            onRetry={() => void retry()}
            onCreateMenu={(payload: ServerMenuDraft) =>
                mutate(
                    () => saveSavedMenu(payload, catalog.categories),
                    'Menu baru berhasil disimpan ke database.',
                )
            }
            onUpdateMenu={(id, payload) => {
                if (id === undefined) return Promise.resolve();
                return mutate(
                    () => saveSavedMenu(payload, catalog.categories, id),
                    'Perubahan menu berhasil disimpan ke database.',
                ).then(() => undefined);
            }}
            onDeleteMenu={(id) => {
                if (id === undefined) return Promise.resolve();
                return mutate(
                    () => deleteSavedMenu(id),
                    'Menu berhasil dihapus dari database.',
                );
            }}
            onToggleAvailability={toggleAvailability}
        />
    );
}
