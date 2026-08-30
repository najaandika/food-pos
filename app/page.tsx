'use client';

import './styles/admin-bundle.css';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Menu } from 'lucide-react';

import { AdminSidebar } from './admin/shell';
import {
  CashierView,
  DashboardView,
  MenuView,
  OrdersView,
  OwnerMenuView,
  OwnerStaffView,
  OwnerTablesView,
  ReportView,
  SettingsView,
  WaitersView,
} from './admin/views';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getAdminRuntimeData } from './admin/runtime-data';
import { canAccessView, getRoleHome, isAuthUser } from './admin/auth';
import { useAdminActions } from './hooks/useAdminActions';
import { useSnapshot } from './hooks/useSnapshot';

import type { View } from './admin';
import type { AuthUser } from './admin/auth';

type ActionNotice = {
  tone: 'success' | 'error';
  message: string;
};

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);

  const { snapshot, refreshSnapshot } = useSnapshot(isAuthorized);

  const showNotice = useCallback((notice: ActionNotice) => {
    setActionNotice(notice);
    window.setTimeout(() => setActionNotice(null), 2800);
  }, []);

  const {
    handleOrderStatus,
    handlePayment,
    handleCreateManualOrder,
    handleAvailability,
    handleCreateMenu,
    handleUpdateMenu,
    handleDeleteMenu,
    handleCreateTable,
    handleUpdateTable,
    handleDeleteTable,
    handleCreateStaff,
    handleUpdateStaff,
    handleDisableStaff,
  } = useAdminActions(refreshSnapshot, showNotice);

  useEffect(() => {
    let isMounted = true;
    const authenticated = window.localStorage.getItem('bloc-pos-authenticated') === 'true';
    const storedUser = window.localStorage.getItem('bloc-pos-user');

    if (!authenticated || !storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser) as unknown;
      if (!isAuthUser(user)) {
        router.replace('/login');
        return;
      }

      setCurrentUser(user);
      setView(getRoleHome(user.role));
    } catch {
      router.replace('/login');
      return;
    }

    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unauthorized');

        const { user } = (await response.json()) as { user: unknown };
        if (!isAuthUser(user)) throw new Error('Invalid session');

        if (!isMounted) return;
        window.localStorage.setItem('bloc-pos-authenticated', 'true');
        window.localStorage.setItem('bloc-pos-user', JSON.stringify(user));
        setCurrentUser(user);
        setView(getRoleHome(user.role));
        setIsAuthorized(true);
      } catch {
        window.localStorage.removeItem('bloc-pos-authenticated');
        window.localStorage.removeItem('bloc-pos-user');
        router.replace('/login');
      }
    };

    void validateSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const goToView = useCallback(
    (nextView: View) => {
      if (!currentUser) return;
      if (!canAccessView(currentUser.role, nextView)) {
        const homeView = getRoleHome(currentUser.role);
        setView(homeView);
        setMobileSidebarOpen(false);
        showNotice({ tone: 'error', message: 'Your role cannot access that page.' });
        return;
      }
      setView(nextView);
      setMobileSidebarOpen(false);
    },
    [currentUser, showNotice],
  );

  useEffect(() => {
    if (!currentUser || canAccessView(currentUser.role, view)) return;
    setView(getRoleHome(currentUser.role));
    setMobileSidebarOpen(false);
  }, [currentUser, view]);

  const handleLogout = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST' });
    window.localStorage.removeItem('bloc-pos-authenticated');
    window.localStorage.removeItem('bloc-pos-user');
    router.replace('/login');
  }, [router]);

  if (!isAuthorized || !currentUser) {
    return null;
  }

  const adminData = getAdminRuntimeData(snapshot);
  const activeView = canAccessView(currentUser.role, view) ? view : getRoleHome(currentUser.role);

  return (
    <>
      <div className={`page-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <button aria-label="Open sidebar menu" className="mobile-nav-toggle" type="button" onClick={() => setMobileSidebarOpen(true)}>
          <Menu aria-hidden="true" />
        </button>
        <button aria-label="Close sidebar menu" className="mobile-sidebar-overlay" type="button" onClick={() => setMobileSidebarOpen(false)} />
        <AdminSidebar
          activeView={activeView}
          collapsed={sidebarCollapsed}
          user={currentUser}
          onChangeView={goToView}
          onLogout={handleLogout}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />

        <main className="main-panel">
          <ErrorBoundary>
            {activeView === 'dashboard' && <DashboardView role={currentUser.role} dashboard={adminData.dashboard} dishes={adminData.dishes} orders={adminData.orders} onChangeView={goToView} />}
            {activeView === 'orders' && <OrdersView role={currentUser.role} orders={adminData.orders} onUpdateStatus={handleOrderStatus} />}
            {activeView === 'cashier' && <CashierView orders={adminData.orders} settings={adminData.settings} onMarkPaid={handlePayment} />}
            {activeView === 'waiters' && <WaitersView orders={adminData.orders} tables={adminData.tables} onUpdateStatus={handleOrderStatus} />}
            {activeView === 'owner-menu' && (
              <OwnerMenuView
                dishes={adminData.dishes}
                onCreateMenu={handleCreateMenu}
                onDeleteMenu={handleDeleteMenu}
                onToggleAvailability={handleAvailability}
                onUpdateMenu={handleUpdateMenu}
              />
            )}
            {activeView === 'owner-tables' && (
              <OwnerTablesView
                tables={adminData.tables}
                onCreateTable={handleCreateTable}
                onDeleteTable={handleDeleteTable}
                onUpdateTable={handleUpdateTable}
              />
            )}
            {activeView === 'owner-staff' && (
              <OwnerStaffView
                staff={adminData.staff}
                onCreateStaff={handleCreateStaff}
                onDisableStaff={handleDisableStaff}
                onUpdateStaff={handleUpdateStaff}
              />
            )}
            {activeView === 'settings' && <SettingsView initialSettings={adminData.settings} onSaved={refreshSnapshot} />}
            {activeView === 'menu' && (
              <MenuView
                dishes={adminData.dishes}
                orders={adminData.orders}
                tables={adminData.tables}
                settings={adminData.settings}
                onCreateManualOrder={handleCreateManualOrder}
                onGoToCashier={() => goToView('cashier')}
                onGoToOrders={() => goToView('orders')}
              />
            )}
            {activeView === 'report' && <ReportView dashboard={adminData.dashboard} />}
          </ErrorBoundary>
        </main>
      </div>
      {actionNotice && <div className={`admin-action-toast ${actionNotice.tone}`} role="status">{actionNotice.message}</div>}
    </>
  );
}
