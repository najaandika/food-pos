import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/pos/admin/shell/official-sidebar';
import { ShellTopbar } from '@/pos/admin/shell/topbar';
import { viewHref } from '@/pos/admin/navigation';
import {
    canAccessView,
    getRoleHome,
    roleLabel,
    type AuthUser,
} from '@/pos/admin/auth';
import { LocaleProvider } from '@/pos/admin/i18n-context';
import { getAdminRuntimeData, type AdminOrder } from '@/pos/admin/runtime-data';
import { orderIdentity } from '@/pos/admin/views/orders/order-ui';
import {
    clearSharedQueries,
    setSharedQuerySession,
} from '@/pos/admin/views/shared-query-cache';
import { OwnerLiveDashboard } from '@/pos/admin/views/OwnerLiveDashboard';
import { OwnerMenuServer } from '@/pos/admin/views/owner-menu/OwnerMenuServer';
import { MenuServer } from '@/pos/admin/views/menu/MenuServer';
import { WaitersServer } from '@/pos/admin/views/WaitersServer';
import { OrdersServer } from '@/pos/admin/views/orders/OrdersServer';
import { CashierServer } from '@/pos/admin/views/orders/CashierServer';
import {
    DashboardView,
    OwnerStaffView,
    OwnerTablesView,
    ReportView,
    SettingsView,
} from '@/pos/admin/views';
import type { View } from '@/pos/admin/types';
import { computeDashboard, createDemoSnapshot } from '@/pos/mock/demo-store';
import type { PosSnapshot, UserRole } from '@/lib/pos-types';
import '@/pos/styles/pos.css';

function isRole(value: unknown): value is UserRole {
    return value === 'owner' || value === 'kasir' || value === 'waiters';
}

function viewFromUrl(role: UserRole, url: string): View {
    const requested = new URL(url, 'http://localhost').searchParams.get(
        'view',
    ) as View | null;
    return requested && canAccessView(role, requested)
        ? requested
        : getRoleHome(role);
}

function currentUrlView(role: UserRole): View {
    return viewFromUrl(
        role,
        typeof window === 'undefined' ? '/dashboard' : window.location.href,
    );
}

type PageUser = { id?: number; name?: string; email?: string; role?: unknown };
type PageAuth = { auth?: { user?: PageUser } };

export default function Dashboard() {
    const { props, url } = usePage();
    const authUser = (props as PageAuth).auth?.user;
    const realRole = isRole(authUser?.role) ? authUser.role : null;
    // When no authenticated role is supplied, keep the existing Owner fallback.
    // An authenticated account with an unknown role remains restricted.
    const role = realRole ?? (!authUser?.id ? 'owner' : 'waiters');
    const user: AuthUser = {
        id: authUser?.id ?? 0,
        name: authUser?.name || 'Food POS',
        email: authUser?.email || '',
        role,
    };
    // Session identity is stable across Inertia view changes; encrypted XSRF
    // cookies are not. A different authenticated user clears private GET data.
    setSharedQuerySession(user.id);

    const [view, setView] = useState<View>(() => viewFromUrl(role, url));
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return (
                localStorage.getItem('food-pos-sidebar-collapsed') === 'true'
            );
        } catch {
            return false;
        }
    });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detailOrderKey, setDetailOrderKey] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    const [snapshot, setSnapshot] = useState<PosSnapshot>(createDemoSnapshot);
    const adminData = useMemo(() => getAdminRuntimeData(snapshot), [snapshot]);

    useEffect(() => {
        if (!canAccessView(role, view)) setView(getRoleHome(role));
    }, [role, view]);

    useEffect(() => {
        const synchronizeView = () => setView(currentUrlView(role));
        // Inertia history visits do not remount the dashboard when state is preserved.
        const unsubscribe = router.on('navigate', synchronizeView);
        window.addEventListener('popstate', synchronizeView);
        return () => {
            unsubscribe();
            window.removeEventListener('popstate', synchronizeView);
        };
    }, [role]);

    useEffect(() => {
        try {
            localStorage.setItem(
                'food-pos-sidebar-collapsed',
                String(collapsed),
            );
        } catch {
            // Persistence is optional (e.g. private browsers).
        }
    }, [collapsed]);

    useEffect(() => {
        if (!drawerOpen) return;
        const media = window.matchMedia('(min-width: 861px)');
        const closeOnDesktop = () => {
            if (media.matches) setDrawerOpen(false);
        };
        media.addEventListener('change', closeOnDesktop);
        return () => media.removeEventListener('change', closeOnDesktop);
    }, [drawerOpen]);

    const navigate = useCallback(
        (next: View, selectedOrder?: AdminOrder) => {
            if (!canAccessView(role, next)) return;
            setDetailOrderKey(
                next === 'orders' && selectedOrder
                    ? orderIdentity(selectedOrder)
                    : null,
            );
            setView(next);
            setDrawerOpen(false);
            setNotice('');
            if (next === view) return;

            // These workspaces share one Inertia page and already load their
            // own live data. Update history locally so menu changes do not
            // make a redundant Laravel request or trigger the global loader.
            router.push({
                url: viewHref(next),
                preserveState: true,
                preserveScroll: true,
            });
        },
        [role, view],
    );

    const changeSnapshot = useCallback(
        (change: (current: PosSnapshot) => PosSnapshot) => {
            setSnapshot((current) => {
                const next = change(current);
                return { ...next, dashboard: computeDashboard(next.orders) };
            });
        },
        [],
    );

    const onCreateStaff: NonNullable<
        Parameters<typeof OwnerStaffView>[0]['onCreateStaff']
    > = (payload) => {
        changeSnapshot((old) => {
            const id = Math.max(0, ...old.staff.map((staff) => staff.id)) + 1;
            const now = new Date().toISOString();
            return {
                ...old,
                staff: [
                    ...old.staff,
                    {
                        id,
                        name: payload.name,
                        email: payload.email,
                        role: payload.role,
                        isActive: payload.isActive,
                        createdAt: now,
                        updatedAt: now,
                    },
                ],
            };
        });
        setNotice(
            'Staf ditambahkan untuk sesi ini; kata sandi tidak disimpan.',
        );
    };

    const onUpdateStaff: NonNullable<
        Parameters<typeof OwnerStaffView>[0]['onUpdateStaff']
    > = (id, payload) => {
        if (id === undefined) return;
        changeSnapshot((old) => ({
            ...old,
            staff: old.staff.map((staff) =>
                staff.id === id
                    ? {
                          ...staff,
                          name: payload.name,
                          email: payload.email,
                          role: payload.role,
                          isActive: payload.isActive,
                      }
                    : staff,
            ),
        }));
        setNotice('Data staf diperbarui untuk sesi ini.');
    };

    const onLogout = () => {
        clearSharedQueries();
        router.post('/logout');
    };

    return (
        <LocaleProvider>
            <Head title={'Food POS - ' + roleLabel(role)} />
            <div
                className={
                    'page-shell pos-shell-layout' +
                    (collapsed ? ' sidebar-collapsed' : '') +
                    (drawerOpen ? ' mobile-sidebar-open' : '')
                }
            >
                <AdminSidebar
                    activeView={view}
                    collapsed={collapsed}
                    user={user}
                    drawerOpen={drawerOpen}
                    onToggleCollapsed={() =>
                        setCollapsed((current) => !current)
                    }
                    onChangeView={navigate}
                    onCloseMobileDrawer={() => setDrawerOpen(false)}
                    onLogout={onLogout}
                />
                <main
                    className="main-panel"
                    id="pos-main-content"
                    tabIndex={-1}
                >
                    <ShellTopbar
                        activeView={view}
                        mobileDrawerOpen={drawerOpen}
                        onOpenMobileDrawer={() => setDrawerOpen(true)}
                    />
                    {view === 'dashboard' &&
                        (role === 'owner' ? (
                            <OwnerLiveDashboard onChangeView={navigate} />
                        ) : (
                            <DashboardView
                                role={role}
                                dashboard={adminData.dashboard}
                                dishes={adminData.dishes}
                                orders={adminData.orders}
                                onChangeView={navigate}
                                onOpenOrder={(order) =>
                                    navigate('orders', order)
                                }
                            />
                        ))}
                    {view === 'report' && <ReportView />}
                    {view === 'menu' && (
                        <MenuServer
                            onGoToCashier={() => navigate('cashier')}
                            onGoToOrders={() => navigate('orders')}
                        />
                    )}
                    {view === 'orders' && (
                        <OrdersServer
                            role={role}
                            initialSelectedOrderKey={detailOrderKey}
                        />
                    )}
                    {view === 'cashier' && <CashierServer user={user} />}
                    {view === 'waiters' && <WaitersServer />}
                    {view === 'owner-menu' && <OwnerMenuServer />}
                    {view === 'owner-tables' && <OwnerTablesView serverMode />}
                    {view === 'owner-staff' && (
                        <OwnerStaffView
                            staff={adminData.staff}
                            onCreateStaff={onCreateStaff}
                            onUpdateStaff={onUpdateStaff}
                            onDisableStaff={(id) => {
                                changeSnapshot((old) => ({
                                    ...old,
                                    staff: old.staff.map((staff) =>
                                        staff.id === id
                                            ? { ...staff, isActive: false }
                                            : staff,
                                    ),
                                }));
                                setNotice('Staf dinonaktifkan untuk sesi ini.');
                            }}
                        />
                    )}
                    {view === 'settings' && (
                        <SettingsView
                            initialSettings={adminData.settings}
                            onSaved={(nextSettings) => {
                                changeSnapshot((old) => ({
                                    ...old,
                                    settings: nextSettings,
                                }));
                                setNotice(
                                    'Pengaturan diperbarui untuk sesi ini, belum tersimpan di server.',
                                );
                            }}
                        />
                    )}
                </main>
                {notice && (
                    <div className="admin-action-toast success" role="status">
                        {notice}
                        <button
                            type="button"
                            aria-label="Tutup pemberitahuan"
                            onClick={() => setNotice('')}
                            style={{ marginLeft: 10, color: 'inherit' }}
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>
        </LocaleProvider>
    );
}
