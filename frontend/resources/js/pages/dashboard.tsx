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
import { displayStaffName } from '@/pos/admin/presentation-labels';
import { orderIdentity } from '@/pos/admin/views/orders/order-ui';
import {
    clearSharedQueries,
    setSharedQuerySession,
} from '@/pos/admin/shared/data/shared-query-cache';
import { OwnerLiveDashboard } from '@/pos/admin/views/dashboard/OwnerLiveDashboard';
import { OwnerStaffServer } from '@/pos/admin/views/owner-staff/OwnerStaffServer';
import { RestaurantSettingsServer } from '@/pos/admin/views/settings/RestaurantSettingsServer';
import { OwnerMenuServer } from '@/pos/admin/views/owner-menu/OwnerMenuServer';
import { MenuServer } from '@/pos/admin/views/menu/MenuServer';
import { WaitersServer } from '@/pos/admin/views/waiters/WaitersServer';
import { OrdersServer } from '@/pos/admin/views/orders/OrdersServer';
import { CashierServer } from '@/pos/admin/views/orders/CashierServer';
import { DashboardView, OwnerTablesView, ReportView } from '@/pos/admin/views';
import type { View } from '@/pos/admin/types';
import { computeDashboard } from '@/pos/mock/demo-store';
import type { PosSnapshot, UserRole } from '@/lib/pos-types';
import '@/pos/styles/pos.css';
import '@/pos/admin/shell/mobile-push-workspace.css';

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

/** A live page starts empty until server-backed data is available.
 * Sample staff, orders, and tables belong to test fixtures, not an account.
 */
function createInitialSnapshot(): PosSnapshot {
    return {
        categories: [],
        menuItems: [],
        orders: [],
        tables: [],
        staff: [],
        dashboard: computeDashboard([]),
        settings: {
            profile: { cafeName: 'Food POS', phone: '', address: '' },
            tax: { taxRate: 0, serviceRate: 0, currency: 'IDR' },
            payments: { cash: true, qris: false, transfer: false },
            qrOptions: {
                guestOrdering: false,
                customerName: true,
                callWaiter: false,
                autoAcceptQr: false,
            },
            hours: [
                {
                    label: 'Monday - Thursday',
                    open: '09:00',
                    close: '17:00',
                    isOpen: false,
                },
                {
                    label: 'Friday',
                    open: '09:00',
                    close: '17:00',
                    isOpen: false,
                },
                {
                    label: 'Saturday - Sunday',
                    open: '09:00',
                    close: '17:00',
                    isOpen: false,
                },
            ],
        },
    };
}

export default function Dashboard() {
    const { props, url } = usePage();
    const authUser = (props as PageAuth).auth?.user;
    const realRole = isRole(authUser?.role) ? authUser.role : null;
    // When no authenticated role is supplied, keep the existing Owner fallback.
    // An authenticated account with an unknown role remains restricted.
    const role = realRole ?? (!authUser?.id ? 'owner' : 'waiters');
    const user: AuthUser = {
        id: authUser?.id ?? 0,
        name: displayStaffName(authUser?.name || 'Food POS', authUser?.email),
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
    const adminData = useMemo(
        () => getAdminRuntimeData(createInitialSnapshot()),
        [],
    );

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
                    <div className="pos-boardui-main-column">
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
                        {view === 'owner-tables' && (
                            <OwnerTablesView serverMode />
                        )}
                        {view === 'owner-staff' && <OwnerStaffServer />}
                        {view === 'settings' && <RestaurantSettingsServer />}
                    </div>
                </main>
            </div>
        </LocaleProvider>
    );
}
