'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { type View } from './admin';
import { getAdminRuntimeData } from './admin/runtime-data';
import { AdminSidebar, CreateOrderModal } from './admin/shell';
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
import type { PosOrderStatus, PosSnapshot } from '../lib/pos-types';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [guestTotal, setGuestTotal] = useState(4);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [snapshot, setSnapshot] = useState<PosSnapshot | null>(null);

  useEffect(() => {
    const authenticated = window.localStorage.getItem('bloc-pos-authenticated') === 'true';

    if (!authenticated) {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  const refreshSnapshot = async () => {
    try {
      const response = await fetch('/api/pos', { cache: 'no-store' });
      if (!response.ok) return;
      setSnapshot(await response.json());
    } catch (error) {
      console.warn('Using fallback POS data because API data is unavailable.', error);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    void refreshSnapshot();
  }, [isAuthorized]);

  const goToView = (nextView: View) => {
    setView(nextView);
    setModalOpen(false);
    setMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('bloc-pos-authenticated');
    router.replace('/login');
  };

  const handleOrderStatus = async (orderId: number | undefined, status: PosOrderStatus) => {
    if (!orderId) return;
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await refreshSnapshot();
  };

  const handlePayment = async (orderId: number | undefined) => {
    if (!orderId) return;
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, method: 'cash' }),
    });
    await refreshSnapshot();
  };

  const handleAvailability = async (dishId: number | undefined, isAvailable: boolean | undefined) => {
    if (!dishId) return;
    await fetch(`/api/menu-items/${dishId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !isAvailable }),
    });
    await refreshSnapshot();
  };

  if (!isAuthorized) {
    return null;
  }

  const adminData = getAdminRuntimeData(snapshot);

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
          activeView={view}
          collapsed={sidebarCollapsed}
          onChangeView={goToView}
          onLogout={handleLogout}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />

        <main className="main-panel">
          {view === 'dashboard' && <DashboardView dashboard={adminData.dashboard} dishes={adminData.dishes} orders={adminData.orders} onOpenModal={() => setModalOpen(true)} />}
          {view === 'orders' && <OrdersView orders={adminData.orders} onUpdateStatus={handleOrderStatus} />}
          {view === 'cashier' && <CashierView orders={adminData.orders} onMarkPaid={handlePayment} />}
          {view === 'waiters' && <WaitersView orders={adminData.orders} />}
          {view === 'owner-menu' && <OwnerMenuView dishes={adminData.dishes} onToggleAvailability={handleAvailability} />}
          {view === 'owner-tables' && <OwnerTablesView tables={adminData.tables} />}
          {view === 'owner-staff' && <OwnerStaffView />}
          {view === 'settings' && <SettingsView />}
          {view === 'menu' && <MenuView dishes={adminData.dishes} orders={adminData.orders} />}
          {view === 'report' && <ReportView dashboard={adminData.dashboard} />}
        </main>
      </div>

      {modalOpen && (
        <CreateOrderModal
          guestTotal={guestTotal}
          onChangeGuestTotal={setGuestTotal}
          onClose={() => setModalOpen(false)}
          onCreate={() => goToView('menu')}
        />
      )}
    </>
  );
}

