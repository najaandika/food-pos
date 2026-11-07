import {
    RiCloseLine,
    RiHomeLine,
    RiMenuFoldLine,
    RiMenuUnfoldLine,
    RiMenu2Line,
} from '@remixicon/react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { cx } from '../../../../../utils/cx';
import { IconButton as BoardUIIconButton } from '../../../../../components/base/buttons/icon-button';
import { useLocale } from '../i18n-context';
import { canAccessView, roleLabel, type AuthUser } from '../auth';
import {
    getRoleBottomViews,
    getRoleNavGroups,
    isPlainNavigationClick,
    navIcons,
    navKeyMap,
    viewHref,
} from '../navigation';
import type { View } from '../types';
import { Avatar } from './boardui-avatar';
import { IconButton } from './boardui-icon-button';
import './nav-shell.css';

type AdminSidebarProps = {
    activeView: View;
    collapsed: boolean;
    drawerOpen: boolean;
    user: AuthUser;
    onToggleCollapsed: () => void;
    onChangeView: (view: View) => void;
    onCloseMobileDrawer: () => void;
};

type SidebarContentProps = Pick<
    AdminSidebarProps,
    'activeView' | 'user' | 'onChangeView'
> & {
    collapsed: boolean;
    drawer: boolean;
    onToggleCollapsed?: () => void;
    onClose?: () => void;
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (parts[0]?.slice(0, 2).toUpperCase() ?? 'FP');
}

function Brand({ collapsed }: { collapsed: boolean }) {
    return (
        <div className="pos-shell-brand" aria-label="Food POS">
            <span className="pos-shell-brand-expanded" aria-hidden={collapsed}>
                Food POS<span className="pos-shell-brand-dot">.</span>
            </span>
            <span className="pos-shell-brand-compact" aria-hidden={!collapsed}>
                F<span className="pos-shell-brand-dot">.</span>
            </span>
        </div>
    );
}

function SidebarContent({
    activeView,
    collapsed,
    drawer,
    user,
    onToggleCollapsed,
    onChangeView,
    onClose,
}: SidebarContentProps) {
    const { locale, setLocale, t } = useLocale();
    const roleBottomViews = getRoleBottomViews(user.role);
    const groups = getRoleNavGroups(user.role);

    return (
        <>
            <div className="pos-shell-sidebar-brand-row">
                <Brand collapsed={collapsed && !drawer} />
                {drawer ? (
                    <IconButton
                        icon={RiCloseLine}
                        aria-label="Tutup menu navigasi"
                        className="pos-shell-icon-action pos-shell-close"
                        onClick={onClose}
                    />
                ) : (
                    <IconButton
                        icon={collapsed ? RiMenuUnfoldLine : RiMenuFoldLine}
                        aria-label={
                            collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'
                        }
                        aria-expanded={!collapsed}
                        title={
                            collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'
                        }
                        className="pos-shell-icon-action pos-shell-toggle"
                        onClick={onToggleCollapsed}
                    />
                )}
            </div>

            <nav
                className="pos-shell-menu"
                aria-label={drawer ? 'Menu lainnya' : 'Navigasi utama Food POS'}
            >
                {groups.map((group) => {
                    const available = group.items.filter(
                        (view) =>
                            canAccessView(user.role, view) &&
                            (!drawer || !roleBottomViews.includes(view)),
                    );
                    if (available.length === 0) return null;

                    return (
                        <section
                            key={group.id}
                            className="pos-shell-menu-group"
                            aria-label={t(group.labelKey)}
                        >
                            <div
                                className="pos-shell-menu-heading"
                                aria-hidden="true"
                            >
                                {t(group.labelKey)}
                            </div>
                            <div className="pos-shell-menu-links">
                                {available.map((view) => {
                                    const Icon = navIcons[view];
                                    const label = t(navKeyMap[view]);
                                    const active = activeView === view;
                                    return (
                                        <a
                                            key={view}
                                            href={viewHref(view)}
                                            className={cx(
                                                'pos-shell-menu-link',
                                                active &&
                                                    'pos-shell-menu-link-active',
                                            )}
                                            data-nav-view={view}
                                            aria-label={label}
                                            aria-current={
                                                active ? 'page' : undefined
                                            }
                                            title={
                                                collapsed && !drawer
                                                    ? label
                                                    : undefined
                                            }
                                            onClick={(event) => {
                                                if (
                                                    !isPlainNavigationClick(
                                                        event,
                                                    )
                                                )
                                                    return;
                                                event.preventDefault();
                                                onChangeView(view);
                                            }}
                                        >
                                            <Icon
                                                className="pos-shell-menu-icon"
                                                aria-hidden="true"
                                            />
                                            <span className="pos-shell-menu-text">
                                                {label}
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
                {drawer &&
                    groups.every((group) =>
                        group.items.every((view) =>
                            roleBottomViews.includes(view),
                        ),
                    ) && (
                        <p className="pos-shell-drawer-empty">
                            Semua halaman tersedia di navigasi bawah.
                        </p>
                    )}
            </nav>

            <div className="pos-shell-sidebar-footer">
                <div
                    className="pos-shell-language-switch"
                    role="group"
                    aria-label="Bahasa tampilan"
                >
                    {(['id', 'en'] as const).map((language) => (
                        <button
                            type="button"
                            key={language}
                            className="pos-shell-language-option"
                            aria-pressed={locale === language}
                            aria-label={
                                language === 'id'
                                    ? 'Bahasa Indonesia'
                                    : 'English'
                            }
                            onClick={() => setLocale(language)}
                        >
                            {language.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="pos-shell-sidebar-user" title={user.name}>
                    <Avatar
                        initials={initials(user.name)}
                        size="md"
                        color="blue"
                        className="pos-shell-avatar"
                    />
                    <span className="pos-shell-sidebar-user-copy">
                        <strong>{user.name}</strong>
                        <span>{roleLabel(user.role)}</span>
                    </span>
                </div>
            </div>
        </>
    );
}

/**
 * Desktop rail and mobile overlay share one permission-filtered menu model.
 * React Aria Modal supplies focus trapping, Escape/outside close and focus
 * restoration for the mobile drawer without a second floating menu button.
 */
export function AdminSidebar({
    activeView,
    collapsed,
    drawerOpen,
    user,
    onToggleCollapsed,
    onChangeView,
    onCloseMobileDrawer,
}: AdminSidebarProps) {
    return (
        <>
            <aside
                className="pos-shell-sidebar"
                data-collapsed={collapsed}
                aria-label="Sidebar Food POS"
            >
                <SidebarContent
                    activeView={activeView}
                    collapsed={collapsed}
                    drawer={false}
                    user={user}
                    onToggleCollapsed={onToggleCollapsed}
                    onChangeView={onChangeView}
                />
            </aside>
            <ModalOverlay
                isOpen={drawerOpen}
                onOpenChange={(open) => {
                    if (!open) onCloseMobileDrawer();
                }}
                isDismissable
                className="pos-shell-drawer-overlay"
            >
                <Modal className="pos-shell-drawer-modal">
                    <Dialog
                        id="pos-mobile-drawer"
                        aria-label="Menu navigasi Food POS"
                        className="pos-shell-drawer-dialog"
                    >
                        <SidebarContent
                            activeView={activeView}
                            collapsed={false}
                            drawer
                            user={user}
                            onChangeView={onChangeView}
                            onClose={onCloseMobileDrawer}
                        />
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}

type ShellTopbarProps = {
    activeView: View;
    mobileDrawerOpen: boolean;
    onOpenMobileDrawer: () => void;
};

export function ShellTopbar({
    activeView,
    mobileDrawerOpen,
    onOpenMobileDrawer,
}: ShellTopbarProps) {
    const { t } = useLocale();

    return (
        <header className="pos-shell-topbar" aria-label="Bar navigasi Food POS">
            <div className="pos-shell-topbar-leading">
                <BoardUIIconButton
                    icon={RiMenu2Line}
                    size="medium"
                    className="pos-shell-mobile-menu-trigger"
                    aria-label="Buka menu navigasi"
                    aria-controls="pos-mobile-drawer"
                    aria-expanded={mobileDrawerOpen}
                    onClick={onOpenMobileDrawer}
                />
                <div className="pos-shell-breadcrumb">
                    <span className="pos-shell-breadcrumb-root">Food POS</span>
                    <span
                        className="pos-shell-breadcrumb-divider"
                        aria-hidden="true"
                    >
                        /
                    </span>
                    {activeView === 'dashboard' && (
                        <RiHomeLine
                            className="pos-shell-breadcrumb-home-icon"
                            aria-hidden="true"
                        />
                    )}
                    <span className="pos-shell-breadcrumb-current">
                        {t(navKeyMap[activeView])}
                    </span>
                </div>
            </div>
        </header>
    );
}
