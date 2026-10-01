'use client';

import {
  ChartColumn,
  ConciergeBell,
  CreditCard,
  LayoutDashboard,
  List,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  UserRoundPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { navGroups, type View } from '.';
import { canAccessView, roleLabel, type AuthUser } from './auth';
import { getRoleBottomViews, navKeyMap } from './navigation';
import { useLocale } from './i18n-context';

type AdminSidebarProps = {
  activeView: View;
  collapsed: boolean;
  user: AuthUser;
  onToggleCollapsed: () => void;
  onChangeView: (view: View) => void;
  onLogout: () => void;
  onCloseMobileDrawer?: () => void;
  hidePrimaryBottomItems?: boolean;
};

const navIcons: Record<View, LucideIcon> = {
  dashboard: LayoutDashboard,
  report: ChartColumn,
  menu: List,
  orders: ReceiptText,
  cashier: CreditCard,
  waiters: ConciergeBell,
  'owner-menu': SlidersHorizontal,
  'owner-tables': QrCode,
  'owner-staff': UserRoundPlus,
  settings: Settings,
};

export function AdminSidebar({
  activeView,
  collapsed,
  user,
  onToggleCollapsed,
  onChangeView,
  onLogout,
  onCloseMobileDrawer,
  hidePrimaryBottomItems = false,
}: AdminSidebarProps) {
  const { locale, setLocale, t } = useLocale();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const SettingsIcon = navIcons.settings;
  const canOpenSettings = canAccessView(user.role, 'settings');
  const roleBottomViews = getRoleBottomViews(user.role);

  const handleChangeView = (view: View) => {
    if (!canAccessView(user.role, view)) return;
    onChangeView(view);
  };

  const groupLabelKey: Record<string, string> = {
    Main: 'nav.main',
    Operations: 'nav.operations',
    Owner: 'nav.owner',
    System: 'nav.system',
  };

  return (
    <aside className={`sidebar sidebar-role-${user.role}`}>
      <div className="brand-wrap">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>P</span></div>
          <div className="brand-name">POS</div>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ToggleIcon />
        </button>
        {onCloseMobileDrawer && (
          <button className="mobile-drawer-close" type="button" onClick={onCloseMobileDrawer} aria-label="Close menu">
            <X />
          </button>
        )}
      </div>

      <nav className="nav" aria-label="Sidebar navigation">
        {hidePrimaryBottomItems && (user.role === 'waiters' || user.role === 'kasir') && (
          <div className="drawer-role-card">
            <span className="role-card-badge">{roleLabel(user.role)} {locale === 'id' ? 'Mode' : 'Mode'}</span>
            <p>{locale === 'id' ? 'Akses cepat panggilan meja, antrean & status pesanan langsung dari navigasi bawah.' : 'Quick access to table calls, queues & order status directly from bottom navigation.'}</p>
          </div>
        )}
        {navGroups.map((group) => {
          const allowedItems = group.items.filter((item) => {
            if (!canAccessView(user.role, item.view)) return false;
            if (hidePrimaryBottomItems && roleBottomViews.includes(item.view)) return false;
            return true;
          });
          if (allowedItems.length === 0) return null;

          const key = groupLabelKey[group.label];
          const label = key ? t(key) : group.label;

          return (
            <div className={`nav-group nav-group-${group.label.toLowerCase()}`} key={group.label}>
              <div className="nav-label">{label}</div>
              {allowedItems.map((item) => (
                <NavButton
                  active={activeView === item.view}
                  icon={navIcons[item.view]}
                  label={t(navKeyMap[item.view] ?? item.label)}
                  key={item.view}
                  onClick={() => handleChangeView(item.view)}
                />
              ))}
            </div>
          );
        })}
        {canOpenSettings && (!hidePrimaryBottomItems || !roleBottomViews.includes('settings')) && (
          <div className="nav-group nav-group-system">
            <div className="nav-label">{t('nav.system')}</div>
            <NavButton active={activeView === 'settings'} icon={SettingsIcon} label={t('nav.settings')} onClick={() => handleChangeView('settings')} />
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="language-toggle" role="group" aria-label="Language selector">
          <button
            type="button"
            className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
            onClick={() => setLocale('en')}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-btn ${locale === 'id' ? 'active' : ''}`}
            onClick={() => setLocale('id')}
            aria-label="Ganti ke Bahasa Indonesia"
          >
            ID
          </button>
        </div>
        <div className="profile-box">
          <div className="profile-avatar">
            <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80" alt={user.name} width={96} height={96} />
            <span aria-hidden="true" />
          </div>
          <div className="profile-meta"><strong>{user.name}</strong><span>{roleLabel(user.role)}</span></div>
        </div>
        <button className="logout-btn" type="button" onClick={onLogout}><LogOut /><span>{t('common.logout')}</span></button>
      </div>
    </aside>
  );
}

type NavButtonProps = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function NavButton({ active, icon: NavIcon, label, onClick }: NavButtonProps) {
  return (
    <button
      aria-label={label}
      className={`nav-item ${active ? 'active' : ''}`}
      data-tooltip={label}
      type="button"
      onClick={onClick}
    >
      <NavIcon />
      <span>{label}</span>
    </button>
  );
}
