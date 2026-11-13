import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import {
    RiArrowDownSLine,
    RiLogoutBoxRLine,
    RiMoonLine,
    RiSettings4Line,
    RiShieldUserLine,
    RiSunLine,
    RiUser3Line,
} from '@remixicon/react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import {
    DashboardSidebar,
    type DashboardNavItem,
} from '../../../../../components/application/dashboard/dashboard-sidebar';
import { Avatar } from '../../../../../components/base/avatar/avatar';
import {
    Dropdown,
    DropdownDivider,
    DropdownGroup,
    DropdownItem,
    DropdownPopover,
    DropdownTrigger,
} from '../../../../../components/base/dropdown/dropdown';
import { cx } from '../../../../../utils/cx';
import { useAppearance } from '../../../hooks/use-appearance';
import type { AuthUser } from '../auth';
import { canAccessView, roleLabel } from '../auth';
import { useLocale } from '../i18n-context';
import {
    getRoleNavGroups,
    isPlainNavigationClick,
    navIcons,
    navKeyMap,
    viewHref,
} from '../navigation';
import type { View } from '../types';
import { revealAppearanceFromControl } from './theme-reveal';
import './boardui-sidebar.css';
import './boardui-dashboard-surfaces.css';
import './styles/mobile-footer-parity.css';

export type AdminSidebarProps = {
    activeView: View | 'profile' | 'security';
    collapsed: boolean;
    drawerOpen: boolean;
    user: AuthUser;
    onToggleCollapsed: () => void;
    onChangeView: (view: View) => void;
    onCloseMobileDrawer: () => void;
    onLogout: () => void;
};

function avatarLetters(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return (parts[0][0] + parts.at(-1)![0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() ?? 'FP';
}

/** The same preference powers desktop, collapsed rail and mobile Drawer. */
function SidebarThemeSwitch({
    collapsed,
    embedded = false,
}: {
    collapsed: boolean;
    embedded?: boolean;
}) {
    const { locale } = useLocale();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isIndonesian = locale === 'id';
    const opposite = resolvedAppearance === 'dark' ? 'light' : 'dark';
    const labels = {
        light: isIndonesian ? 'Terang' : 'Light',
        dark: isIndonesian ? 'Gelap' : 'Dark',
    };
    const options = [
        { mode: 'light', icon: RiSunLine },
        { mode: 'dark', icon: RiMoonLine },
    ] as const;

    if (collapsed) {
        const Icon = opposite === 'dark' ? RiMoonLine : RiSunLine;
        return (
            <button
                type="button"
                className="pos-boardui-theme-collapsed-button"
                aria-label={labels[opposite]}
                title={labels[opposite]}
                onClick={(event) => {
                    void revealAppearanceFromControl(
                        opposite,
                        updateAppearance,
                        event.currentTarget,
                        event.clientX,
                        event.clientY,
                    );
                }}
            >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
            </button>
        );
    }

    return (
        <div
            className={cx(
                'pos-boardui-theme-switch',
                embedded && 'mb-0! self-center!',
            )}
            role="group"
            aria-label={isIndonesian ? 'Tema tampilan' : 'Display theme'}
        >
            {options.map(({ mode, icon: Icon }) => (
                <button
                    key={mode}
                    type="button"
                    className="pos-boardui-theme-option"
                    aria-label={labels[mode]}
                    aria-pressed={resolvedAppearance === mode}
                    title={labels[mode]}
                    onClick={(event) => {
                        void revealAppearanceFromControl(
                            mode,
                            updateAppearance,
                            event.currentTarget,
                            event.clientX,
                            event.clientY,
                        );
                    }}
                >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                </button>
            ))}
        </div>
    );
}

function Brand({ collapsed }: { collapsed: boolean }) {
    return (
        <span
            className="pos-boardui-brand text-title-3-semibold text-text-primary inline-flex min-w-0 items-center whitespace-nowrap"
            aria-label="Food POS"
        >
            {collapsed ? 'F' : 'Food POS'}
            <span className="pos-boardui-brand-dot">.</span>
        </span>
    );
}

/** Match BoardUI's fading/blurred sidebar labels when the rail collapses. */
function FooterCollapsible({
    collapsed,
    children,
}: {
    collapsed: boolean;
    children: ReactNode;
}) {
    return (
        <span
            aria-hidden={collapsed}
            className={cx(
                'flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out',
                collapsed
                    ? 'max-w-0 opacity-0 blur-[3px]'
                    : 'max-w-44 opacity-100 blur-0',
            )}
        >
            {children}
        </span>
    );
}

function Footer({
    collapsed,
    user,
    activeView,
    inDrawer = false,
    onLogout,
    onChangeView,
    onCloseMobileDrawer,
}: {
    collapsed: boolean;
    user: AuthUser;
    activeView: AdminSidebarProps['activeView'];
    inDrawer?: boolean;
    onLogout: () => void;
    onChangeView: (view: View) => void;
    onCloseMobileDrawer?: () => void;
}) {
    const { locale } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const canOpenSettings = canAccessView(user.role, 'settings');
    const initials = avatarLetters(user.name);
    const isIndonesian = locale === 'id';

    const selectAction = (action: () => void) => {
        setIsOpen(false);
        if (inDrawer) onCloseMobileDrawer?.();
        action();
    };

    return (
        <div className="pos-boardui-footer mt-auto flex min-w-0 flex-col gap-2">
            <div className="pos-boardui-utility-spacer" aria-hidden="true" />
            <SidebarThemeSwitch collapsed={collapsed} />
            {canOpenSettings && (
                <nav
                    className="pos-boardui-footer-utilities"
                    aria-label={
                        isIndonesian
                            ? 'Utilitas restoran'
                            : 'Restaurant utilities'
                    }
                >
                    <a
                        href={viewHref('settings')}
                        data-nav-view="settings"
                        aria-label={
                            isIndonesian
                                ? 'Pengaturan Restoran'
                                : 'Restaurant Settings'
                        }
                        aria-current={
                            activeView === 'settings' ? 'page' : undefined
                        }
                        title={
                            collapsed
                                ? isIndonesian
                                    ? 'Pengaturan Restoran'
                                    : 'Restaurant Settings'
                                : undefined
                        }
                        className={cx(
                            'pos-boardui-footer-settings flex items-center gap-2 overflow-hidden rounded-2lg p-2',
                            'transition-[width,background-color] duration-300 ease-in-out',
                            collapsed ? 'w-9' : 'w-full',
                            activeView === 'settings'
                                ? 'bg-linear-to-b from-accent-500 to-accent-600 shadow-nav-selected'
                                : 'hover:bg-background-secondary-hover',
                        )}
                        onClick={(event) => {
                            if (!isPlainNavigationClick(event)) return;
                            event.preventDefault();
                            selectAction(() => onChangeView('settings'));
                        }}
                    >
                        <RiSettings4Line
                            aria-hidden="true"
                            className={cx(
                                'size-5 shrink-0',
                                activeView === 'settings'
                                    ? 'text-white'
                                    : 'text-foreground-icon-secondary',
                            )}
                        />
                        <FooterCollapsible collapsed={collapsed}>
                            <span
                                className={cx(
                                    'text-body-medium whitespace-nowrap',
                                    activeView === 'settings'
                                        ? 'text-white'
                                        : 'text-text-secondary',
                                )}
                            >
                                {isIndonesian
                                    ? 'Pengaturan Restoran'
                                    : 'Restaurant Settings'}
                            </span>
                        </FooterCollapsible>
                    </a>
                </nav>
            )}
            <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
                <DropdownTrigger
                    aria-label={`${isIndonesian ? 'Buka menu akun' : 'Open account menu'}: ${user.name}`}
                    aria-expanded={isOpen}
                    className={cx(
                        'pos-boardui-footer-account text-text-primary flex min-w-0 cursor-pointer items-center overflow-hidden border-2',
                        'border-transparent outline-none transition-[width,background-color,border-color,padding] duration-300 ease-in-out',
                        'hover:border-border-button-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2',
                        isOpen && 'border-border-button-hover',
                        collapsed
                            ? 'size-9 justify-center gap-0 rounded-full bg-transparent p-0'
                            : 'w-full justify-between gap-2 rounded-xl bg-background-tertiary-default py-2 pe-3 ps-2.5',
                    )}
                >
                    <span
                        className={cx(
                            'flex min-w-0 flex-1 items-center',
                            collapsed ? 'gap-0' : 'gap-2',
                        )}
                    >
                        <Avatar
                            initials={initials}
                            size="md"
                            color="blue"
                            className="pos-boardui-user-avatar shrink-0"
                        />
                        <FooterCollapsible collapsed={collapsed}>
                            <span className="flex min-w-0 flex-col items-start justify-center">
                                <span className="text-body-medium text-text-primary max-w-36 truncate">
                                    {user.name}
                                </span>
                                <span className="text-body-regular text-text-secondary max-w-36 truncate">
                                    {user.email || roleLabel(user.role)}
                                </span>
                            </span>
                        </FooterCollapsible>
                    </span>
                    <FooterCollapsible collapsed={collapsed}>
                        <span className="bg-background-tertiary-hover flex size-4 shrink-0 items-center justify-center rounded-[3px]">
                            <RiArrowDownSLine
                                aria-hidden="true"
                                className={cx(
                                    'text-text-secondary size-4 transition-transform duration-200 ease',
                                    isOpen && 'rotate-180',
                                )}
                            />
                        </span>
                    </FooterCollapsible>
                </DropdownTrigger>

                {/* The Finance template floats right on desktop; the mobile
                    drawer keeps the popover above its bottom account trigger. */}
                <DropdownPopover
                    aria-label={isIndonesian ? 'Menu akun' : 'Account menu'}
                    placement={inDrawer ? 'top start' : 'right bottom'}
                    offset={8}
                    className="pos-boardui-account-popover z-[230]! max-h-[calc(100dvh-24px)] w-[265px]"
                    dialogClassName="gap-[7px]"
                >
                    <div className="flex w-full min-w-0 items-center gap-2 px-2 pt-1 pb-1">
                        <Avatar size="md" color="blue" initials={initials} />
                        <div className="flex min-w-0 flex-col items-start justify-center">
                            <span className="text-body-medium text-text-primary max-w-43 truncate">
                                {user.name}
                            </span>
                            <span className="text-body-regular text-text-secondary max-w-43 truncate">
                                {user.email || roleLabel(user.role)}
                            </span>
                        </div>
                    </div>

                    <DropdownDivider className="my-2.5" />
                    <DropdownGroup label={isIndonesian ? 'Akun' : 'Account'}>
                        <DropdownItem
                            selected={activeView === 'profile'}
                            onSelect={() => {
                                selectAction(() =>
                                    router.visit('/settings/profile'),
                                );
                            }}
                        >
                            <RiUser3Line
                                aria-hidden="true"
                                className="text-foreground-icon-secondary size-5 shrink-0"
                            />
                            <span className="text-body-medium text-text-primary truncate">
                                {isIndonesian
                                    ? 'Profil Akun'
                                    : 'Account profile'}
                            </span>
                        </DropdownItem>
                        <DropdownItem
                            selected={activeView === 'security'}
                            onSelect={() => {
                                selectAction(() =>
                                    router.visit('/settings/security'),
                                );
                            }}
                        >
                            <RiShieldUserLine
                                aria-hidden="true"
                                className="text-foreground-icon-secondary size-5 shrink-0"
                            />
                            <span className="text-body-medium text-text-primary truncate">
                                {isIndonesian
                                    ? 'Keamanan Akun'
                                    : 'Account security'}
                            </span>
                        </DropdownItem>
                    </DropdownGroup>

                    <div className="rounded-2lg flex min-w-0 items-center justify-between gap-2 px-2 py-1.5">
                        <span className="flex min-w-0 items-center gap-2">
                            <RiSunLine
                                aria-hidden="true"
                                className="text-foreground-icon-secondary size-5 shrink-0"
                            />
                            <span className="text-body-medium text-text-primary truncate">
                                {isIndonesian ? 'Tampilan' : 'Appearance'}
                            </span>
                        </span>
                        <SidebarThemeSwitch collapsed={false} embedded />
                    </div>

                    <DropdownDivider className="my-2.5" />
                    <DropdownGroup label={isIndonesian ? 'Sesi' : 'Session'}>
                        <DropdownItem
                            onSelect={() => {
                                selectAction(onLogout);
                            }}
                        >
                            <RiLogoutBoxRLine
                                aria-hidden="true"
                                className="text-foreground-icon-secondary size-5 shrink-0"
                            />
                            <span className="text-body-medium text-text-primary truncate">
                                {isIndonesian ? 'Keluar' : 'Log out'}
                            </span>
                        </DropdownItem>
                    </DropdownGroup>

                    <div className="flex w-full items-center justify-between px-2 pt-2 pb-1">
                        <span className="text-body-2-medium text-text-tertiary">
                            Food POS
                        </span>
                        <span className="bg-background-tertiary-default text-body-2-medium text-text-tertiary inline-flex items-center rounded-sm px-1 py-px">
                            {roleLabel(user.role)}
                        </span>
                    </div>
                </DropdownPopover>
            </Dropdown>
        </div>
    );
}

export function AdminSidebar({
    activeView,
    collapsed,
    drawerOpen,
    user,
    onToggleCollapsed,
    onChangeView,
    onCloseMobileDrawer,
    onLogout,
}: AdminSidebarProps) {
    const { t } = useLocale();

    // BoardUI Free switches to overlay navigation below lg (1024px).
    // If the viewport crosses into desktop while open, close the React Aria
    // modal to release its focus scope and document scroll lock.
    useEffect(() => {
        if (!drawerOpen) return;

        const desktop = window.matchMedia('(min-width: 1024px)');
        const closeOnDesktop = () => {
            if (desktop.matches) onCloseMobileDrawer();
        };
        closeOnDesktop();
        desktop.addEventListener('change', closeOnDesktop);
        return () => desktop.removeEventListener('change', closeOnDesktop);
    }, [drawerOpen, onCloseMobileDrawer]);

    const groups = useMemo(
        () =>
            getRoleNavGroups(user.role)
                .map((group) => ({
                    id: group.id,
                    label: t(group.labelKey),
                    items: group.items
                        .filter(
                            (view) =>
                                view !== 'settings' &&
                                canAccessView(user.role, view),
                        )
                        .map((view): DashboardNavItem => ({
                            key: view,
                            label: t(navKeyMap[view]),
                            icon: navIcons[view],
                            href: viewHref(view),
                        })),
                }))
                .filter((group) => group.items.length > 0),
        [user.role, t],
    );

    const navigateAllowed = (key: string) => {
        const target = key as View;
        if (!canAccessView(user.role, target)) return;
        onChangeView(target);
    };

    return (
        <>
            <div
                className="pos-boardui-sidebar-frame"
                data-collapsed={collapsed}
            >
                <DashboardSidebar
                    className="pos-boardui-dashboard-sidebar"
                    posMode
                    selected={activeView}
                    groups={groups}
                    items={groups.flatMap((group) => group.items)}
                    appHeader={<Brand collapsed={collapsed} />}
                    appFooter={
                        <Footer
                            collapsed={collapsed}
                            user={user}
                            activeView={activeView}
                            onLogout={onLogout}
                            onChangeView={onChangeView}
                        />
                    }
                    controlledCollapsed={collapsed}
                    onCollapsedChange={(next) => {
                        if (collapsed !== next) onToggleCollapsed();
                    }}
                    onNavigate={navigateAllowed}
                    showThemeToggle={false}
                />
            </div>

            <ModalOverlay
                isOpen={drawerOpen}
                onOpenChange={(open) => {
                    if (!open) onCloseMobileDrawer();
                }}
                isDismissable
                isKeyboardDismissDisabled={false}
                className="pos-boardui-drawer-overlay"
            >
                <Modal className="pos-boardui-drawer-modal">
                    <Dialog
                        id="pos-mobile-drawer"
                        aria-label="Menu navigasi Food POS"
                        className="pos-boardui-drawer-dialog"
                    >
                        <DashboardSidebar
                            className="pos-boardui-drawer-sidebar"
                            mobile
                            fluid
                            posMode
                            selected={activeView}
                            groups={groups}
                            items={groups.flatMap((group) => group.items)}
                            appHeader={<Brand collapsed={false} />}
                            appFooter={
                                <Footer
                                    collapsed={false}
                                    user={user}
                                    activeView={activeView}
                                    inDrawer
                                    onLogout={onLogout}
                                    onChangeView={onChangeView}
                                    onCloseMobileDrawer={onCloseMobileDrawer}
                                />
                            }
                            onClose={onCloseMobileDrawer}
                            onNavigate={navigateAllowed}
                            showThemeToggle={false}
                        />
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}
