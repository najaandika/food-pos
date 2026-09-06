'use client';

import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  ConciergeBell,
  CreditCard,
  LayoutDashboard,
  List,
  LogOut,
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
import { getRoleBottomViews } from './navigation';

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
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;
  const SettingsIcon = navIcons.settings;
  const canOpenSettings = canAccessView(user.role, 'settings');
  const roleBottomViews = getRoleBottomViews(user.role);

  const handleChangeView = (view: View) => {
    if (!canAccessView(user.role, view)) return;
    onChangeView(view);
  };

  return (
    <aside className={`sidebar sidebar-role-${user.role}`}>
      <div className="brand-wrap">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div className="brand-name">Bloc POS</div>
        </div>
        <button className="sidebar-toggle" type="button" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
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
            <span className="role-card-badge">{roleLabel(user.role)} Mode</span>
            <p>Akses cepat panggilan meja, antrean & status pesanan langsung dari navigasi bawah.</p>
          </div>
        )}
        {navGroups.map((group) => {
          const allowedItems = group.items.filter((item) => {
            if (!canAccessView(user.role, item.view)) return false;
            if (hidePrimaryBottomItems && roleBottomViews.includes(item.view)) return false;
            return true;
          });
          if (allowedItems.length === 0) return null;

          return (
            <div className={`nav-group nav-group-${group.label.toLowerCase()}`} key={group.label}>
              <div className="nav-label">{group.label}</div>
              {allowedItems.map((item) => (
                <NavButton
                  active={activeView === item.view}
                  icon={navIcons[item.view]}
                  label={item.label}
                  key={item.view}
                  onClick={() => handleChangeView(item.view)}
                />
              ))}
            </div>
          );
        })}
        {canOpenSettings && (!hidePrimaryBottomItems || !roleBottomViews.includes('settings')) && (
          <div className="nav-group nav-group-system">
            <div className="nav-label">System</div>
            <NavButton active={activeView === 'settings'} icon={SettingsIcon} label="Settings" onClick={() => handleChangeView('settings')} />
          </div>
        )}
      </nav>

      <div className="profile-box">
        <div className="profile-avatar">
          <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80" alt={user.name} width={96} height={96} />
          <span aria-hidden="true" />
        </div>
        <div className="profile-meta"><strong>{user.name}</strong><span>{roleLabel(user.role)}</span></div>
      </div>
      <button className="logout-btn" type="button" onClick={onLogout}><LogOut /><span>Logout</span></button>
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
