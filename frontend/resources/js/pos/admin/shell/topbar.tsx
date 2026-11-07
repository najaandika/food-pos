import { RiMenu2Line } from '@remixicon/react';
import { IconButton } from '../../../../../components/base/buttons/icon-button';
import { useLocale } from '../i18n-context';
import { navIcons, navKeyMap } from '../navigation';
import type { View } from '../types';
import './nav-shell.css';

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
    const ActiveViewIcon = navIcons[activeView];
    const activeLabel = t(navKeyMap[activeView]);

    return (
        <header
            className="pos-shell-topbar border-separator-border flex min-w-0 items-center border-b"
            aria-label="Bar navigasi Food POS"
        >
            <div className="pos-shell-topbar-leading flex min-w-0 items-center gap-2.5">
                <IconButton
                    icon={RiMenu2Line}
                    size="medium"
                    className="pos-shell-mobile-menu-trigger"
                    aria-label="Buka menu navigasi"
                    aria-controls="pos-mobile-drawer"
                    aria-expanded={mobileDrawerOpen}
                    onClick={onOpenMobileDrawer}
                />
                <nav
                    className="pos-shell-breadcrumb text-body-medium flex min-w-0 items-center gap-2"
                    aria-label="Breadcrumb"
                >
                    <span className="pos-shell-breadcrumb-root text-text-tertiary whitespace-nowrap">
                        Food POS
                    </span>
                    <span
                        className="pos-shell-breadcrumb-divider text-text-tertiary"
                        aria-hidden="true"
                    >
                        /
                    </span>
                    <ActiveViewIcon
                        className="text-foreground-icon-secondary size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <span
                        className="pos-shell-breadcrumb-current text-text-primary truncate"
                        aria-current="page"
                    >
                        {activeLabel}
                    </span>
                </nav>
            </div>
        </header>
    );
}
