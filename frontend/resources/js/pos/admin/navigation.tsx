import {
    RiBankCardLine,
    RiBarChartBoxLine,
    RiFileList3Line,
    RiHomeLine,
    RiListCheck3,
    RiListSettingsLine,
    RiMore2Line,
    RiQrCodeLine,
    RiRestaurant2Line,
    RiSettings4Line,
    RiTeamLine,
    type RemixiconComponentType,
} from '@remixicon/react';
import { dashboard } from '@/routes';
import type { UserRole } from '@/lib/pos-types';
import type { AuthUser } from './auth';
import { canAccessView } from './auth';
import { useLocale } from './i18n-context';
import type { View } from './types';

export const navIcons: Record<View, RemixiconComponentType> = {
    dashboard: RiHomeLine,
    report: RiBarChartBoxLine,
    menu: RiRestaurant2Line,
    orders: RiFileList3Line,
    cashier: RiBankCardLine,
    waiters: RiListCheck3,
    'owner-menu': RiListSettingsLine,
    'owner-tables': RiQrCodeLine,
    'owner-staff': RiTeamLine,
    settings: RiSettings4Line,
};

export const navKeyMap: Record<View, string> = {
    dashboard: 'nav.home',
    report: 'nav.report',
    menu: 'nav.menu',
    orders: 'nav.orders',
    cashier: 'nav.cashier',
    waiters: 'nav.waiters',
    'owner-menu': 'nav.manageMenu',
    'owner-tables': 'nav.tablesQr',
    'owner-staff': 'nav.staff',
    settings: 'nav.settings',
};

export type NavigationGroup = {
    labelKey: string;
    id: string;
    items: View[];
};

/**
 * The presentation order is role-specific. Only whitelisted destinations from
 * canAccessView() survive; this UI filter supplements, never replaces, Laravel
 * authorization. Views live under the existing Inertia /dashboard route.
 */
export function getRoleNavGroups(role: UserRole): NavigationGroup[] {
    const layout: NavigationGroup[] =
        role === 'owner'
            ? [
                  {
                      id: 'main',
                      labelKey: 'nav.main',
                      items: ['dashboard', 'report'],
                  },
                  {
                      id: 'operations',
                      labelKey: 'nav.operations',
                      items: ['orders', 'cashier', 'waiters', 'menu'],
                  },
                  {
                      id: 'owner',
                      labelKey: 'nav.owner',
                      items: ['owner-menu', 'owner-tables', 'owner-staff'],
                  },
                  {
                      id: 'system',
                      labelKey: 'nav.system',
                      items: ['settings'],
                  },
              ]
            : role === 'kasir'
              ? [
                    {
                        id: 'operations',
                        labelKey: 'nav.operations',
                        items: ['cashier', 'orders', 'menu'],
                    },
                    {
                        id: 'main',
                        labelKey: 'nav.main',
                        items: ['dashboard'],
                    },
                ]
              : [
                    {
                        id: 'operations',
                        labelKey: 'nav.operations',
                        items: ['waiters', 'orders'],
                    },
                ];

    return layout
        .map((group) => ({
            ...group,
            items: group.items.filter((view) => canAccessView(role, view)),
        }))
        .filter((group) => group.items.length > 0);
}

export function getRoleBottomViews(role: UserRole): View[] {
    if (role === 'kasir') return ['cashier', 'orders', 'menu'];
    if (role === 'waiters') return ['waiters', 'orders'];
    return ['dashboard', 'orders', 'cashier'];
}

export function getRoleDrawerViews(role: UserRole): View[] {
    const quick = new Set(getRoleBottomViews(role));
    return getRoleNavGroups(role)
        .flatMap((group) => group.items)
        .filter((view) => !quick.has(view));
}

export function viewHref(view: View): string {
    return `${dashboard().url}?view=${encodeURIComponent(view)}`;
}

export function isPlainNavigationClick(
    event: React.MouseEvent<HTMLAnchorElement>,
): boolean {
    return (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
    );
}

type MobileBottomNavProps = {
    activeView: View;
    user: AuthUser;
    drawerOpen: boolean;
    onChangeView: (view: View) => void;
    onOpenDrawer: () => void;
};

export function MobileBottomNav({
    activeView,
    user,
    drawerOpen,
    onChangeView,
    onOpenDrawer,
}: MobileBottomNavProps) {
    const { t } = useLocale();
    const destinations = getRoleBottomViews(user.role).filter((view) =>
        canAccessView(user.role, view),
    );
    const showMore = getRoleDrawerViews(user.role).length > 0;
    const inMore = !destinations.includes(activeView);

    return (
        <nav className="pos-shell-bottom-nav" aria-label="Navigasi cepat">
            {destinations.map((view) => {
                const Icon = navIcons[view];
                const label = t(navKeyMap[view]);
                return (
                    <a
                        key={view}
                        href={viewHref(view)}
                        data-nav-view={view}
                        className="pos-shell-bottom-item"
                        aria-label={label}
                        aria-current={activeView === view ? 'page' : undefined}
                        onClick={(event) => {
                            if (!isPlainNavigationClick(event)) return;
                            event.preventDefault();
                            onChangeView(view);
                        }}
                    >
                        <Icon
                            aria-hidden="true"
                            className="pos-shell-bottom-icon"
                        />
                        <span>{label}</span>
                    </a>
                );
            })}
            {showMore && (
                <button
                    type="button"
                    className="pos-shell-bottom-item"
                    aria-label="Buka menu lainnya"
                    aria-controls="pos-mobile-drawer"
                    aria-expanded={drawerOpen}
                    aria-current={inMore && !drawerOpen ? 'page' : undefined}
                    onClick={onOpenDrawer}
                >
                    <RiMore2Line
                        aria-hidden="true"
                        className="pos-shell-bottom-icon"
                    />
                    <span>{t('nav.more')}</span>
                </button>
            )}
        </nav>
    );
}
