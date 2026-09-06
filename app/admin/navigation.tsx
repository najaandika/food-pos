'use client';

import {
  ChartColumn,
  ConciergeBell,
  CreditCard,
  LayoutDashboard,
  List,
  Menu,
  ReceiptText,
  SlidersHorizontal,
  UserRoundPlus,
  QrCode,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '../../lib/pos-types';
import type { AuthUser } from './auth';
import type { View } from './types';

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

const navLabels: Record<View, string> = {
  dashboard: 'Home',
  report: 'Report',
  menu: 'Menu',
  orders: 'Orders',
  cashier: 'Kasir',
  waiters: 'Waiters',
  'owner-menu': 'Manage Menu',
  'owner-tables': 'Tables & QR',
  'owner-staff': 'Staff',
  settings: 'Settings',
};

export function getRoleBottomViews(role: UserRole): View[] {
  if (role === 'kasir') return ['cashier', 'orders', 'menu'];
  if (role === 'waiters') return ['waiters', 'orders'];
  return ['dashboard', 'orders', 'cashier', 'waiters'];
}

type MobileBottomNavProps = {
  activeView: View;
  user: AuthUser;
  onChangeView: (view: View) => void;
  onOpenDrawer: () => void;
};

export function MobileBottomNav({ activeView, user, onChangeView, onOpenDrawer }: MobileBottomNavProps) {
  const navItems = getRoleBottomViews(user.role).map((view) => ({
    view,
    label: navLabels[view],
    icon: navIcons[view],
  }));

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile bottom navigation">
      {navItems.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          className={`mobile-bottom-item ${activeView === view ? 'active' : ''}`}
          onClick={() => onChangeView(view)}
        >
          <Icon className="mobile-bottom-icon" />
          <span className="mobile-bottom-label">{label}</span>
        </button>
      ))}
      <button type="button" className="mobile-bottom-item mobile-bottom-more" onClick={onOpenDrawer} aria-label="Open sidebar drawer menu">
        <Menu className="mobile-bottom-icon" />
        <span className="mobile-bottom-label">More</span>
      </button>
    </nav>
  );
}
