'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

import type { View } from './admin';
import type { AuthUser } from './admin/auth';
import type { PosOrderStatus, PosSnapshot } from '@/lib/pos-types';

type MenuFormPayload = {
  name: string;
  category: string;
  description: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  badge: string | null;
};

type TableFormPayload = {
  code: string;
  name: string;
  area: string;
  seats: number;
  status: 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_payment' | 'need_waiter' | 'inactive';
};

type StaffFormPayload = {
  name: string;
  email: string;
  role: 'owner' | 'kasir' | 'waiters';
  password?: string;
  isActive: boolean;
};

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
  const [snapshot, setSnapshot] = useState<PosSnapshot | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const refreshInFlightRef = useRef(false);
  const snapshotSignatureRef = useRef('');

  useEffect(() => {
    let isMounted = true;
    const authenticated = window.localStorage.getItem('bloc-pos-authenticated') === 'true';
    const storedUser = window.localStorage.getItem('bloc-pos-user');

    if (!authenticated || !storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
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

        const { user } = await response.json();
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

  const refreshSnapshot = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      const response = await fetch('/api/pos', { cache: 'no-store' });
      if (!response.ok) return;
      const nextSnapshot = await response.json();
      const nextSignature = JSON.stringify(nextSnapshot);
      if (nextSignature !== snapshotSignatureRef.current) {
        snapshotSignatureRef.current = nextSignature;
        setSnapshot(nextSnapshot);
      }
    } catch (error) {
      console.warn('Using fallback POS data because API data is unavailable.', error);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  const showNotice = (notice: ActionNotice) => {
    setActionNotice(notice);
    window.setTimeout(() => setActionNotice(null), 2800);
  };

  const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? 'Request failed');
    }
    return response.json() as Promise<T>;
  };

  const requestOk = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? 'Request failed');
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    void refreshSnapshot();
  }, [isAuthorized, refreshSnapshot]);

  useEffect(() => {
    if (!isAuthorized) return;

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshSnapshot();
      }
    };

    const intervalId = window.setInterval(syncWhenVisible, 5000);
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
    };
  }, [isAuthorized, refreshSnapshot]);

  const goToView = (nextView: View) => {
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
  };

  useEffect(() => {
    if (!currentUser || canAccessView(currentUser.role, view)) return;
    setView(getRoleHome(currentUser.role));
    setMobileSidebarOpen(false);
  }, [currentUser, view]);

  const handleLogout = () => {
    void fetch('/api/auth/logout', { method: 'POST' });
    window.localStorage.removeItem('bloc-pos-authenticated');
    window.localStorage.removeItem('bloc-pos-user');
    router.replace('/login');
  };

  const handleOrderStatus = async (orderId: number | undefined, status: PosOrderStatus) => {
    if (!orderId) return;
    try {
      await requestOk(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Order status updated.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to update order.' });
    }
  };

  const handlePayment = async (orderId: number | undefined, method: 'cash' | 'qris' | 'transfer' = 'cash') => {
    if (!orderId) return;
    try {
      await requestOk('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, method }),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Payment closed.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to close payment.' });
    }
  };

  const handleCreateManualOrder = async (payload: {
    tableCode?: string;
    customerName: string;
    type: 'dine_in' | 'takeaway';
    guests: number;
    notes?: string;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
  }) => {
    const order = await requestJson<{ id: number; orderNumber: string }>('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, source: 'manual' }),
    });
    await refreshSnapshot();
    showNotice({ tone: 'success', message: 'Order sent to kitchen.' });
    return order;
  };

  const handleAvailability = async (dishId: number | undefined, isAvailable: boolean | undefined) => {
    if (!dishId) return;
    try {
      await requestOk(`/api/menu-items/${dishId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !isAvailable }),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Menu availability updated.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to update menu.' });
    }
  };

  const handleCreateMenu = async (payload: MenuFormPayload) => {
    try {
      await requestOk('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Menu item created.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create menu.' });
    }
  };

  const handleUpdateMenu = async (dishId: number | undefined, payload: MenuFormPayload) => {
    if (!dishId) return;
    try {
      await requestOk(`/api/menu-items/${dishId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Menu item saved.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to save menu.' });
    }
  };

  const handleDeleteMenu = async (dishId: number | undefined) => {
    if (!dishId) return;
    try {
      await requestOk(`/api/menu-items/${dishId}`, { method: 'DELETE' });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Menu item removed.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to remove menu.' });
    }
  };

  const handleCreateTable = async (payload: TableFormPayload) => {
    try {
      await requestOk('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Table created.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create table.' });
    }
  };

  const handleUpdateTable = async (tableId: number | undefined, payload: TableFormPayload) => {
    if (!tableId) return;
    try {
      await requestOk(`/api/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Table saved.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to save table.' });
    }
  };

  const handleDeleteTable = async (tableId: number | undefined) => {
    if (!tableId) return;
    try {
      await requestOk(`/api/tables/${tableId}`, { method: 'DELETE' });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Table archived.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to archive table.' });
    }
  };

  const handleCreateStaff = async (payload: StaffFormPayload) => {
    try {
      await requestOk('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Staff created.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create staff.' });
    }
  };

  const handleUpdateStaff = async (staffId: number | undefined, payload: StaffFormPayload) => {
    if (!staffId) return;
    try {
      await requestOk(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Staff saved.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to save staff.' });
    }
  };

  const handleDisableStaff = async (staffId: number | undefined) => {
    if (!staffId) return;
    try {
      await requestOk(`/api/staff/${staffId}`, { method: 'DELETE' });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Staff disabled.' });
    } catch (error) {
      showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to disable staff.' });
    }
  };

  if (!isAuthorized || !currentUser) {
    return null;
  }

  const adminData = getAdminRuntimeData(snapshot);
  const activeView = canAccessView(currentUser.role, view) ? view : getRoleHome(currentUser.role);

  return (
    <>
      <div className={`page-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <button
          aria-label="Open sidebar menu"
          className="mobile-nav-toggle"
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu aria-hidden="true" />
        </button>
        <button
          aria-label="Close sidebar menu"
          className="mobile-sidebar-overlay"
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
        />
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

