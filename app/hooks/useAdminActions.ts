'use client';

import { useCallback } from 'react';
import type { PosOrderStatus } from '@/lib/pos-types';
import { requestAdminJson, requestAdminOk } from '../lib/admin-api';

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

type ShowNotice = (notice: { tone: 'success' | 'error'; message: string }) => void;

export function useAdminActions(refreshSnapshot: () => Promise<void>, showNotice: ShowNotice) {
  const handleOrderStatus = useCallback(
    async (orderId: number | undefined, status: PosOrderStatus) => {
      if (!orderId) return;
      try {
        await requestAdminOk(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Order status updated.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to update order.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handlePayment = useCallback(
    async (orderId: number | undefined, method: 'cash' | 'qris' | 'transfer' = 'cash') => {
      if (!orderId) return;
      try {
        await requestAdminOk('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, method }),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Payment closed.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to close payment.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleCreateManualOrder = useCallback(
    async (payload: {
      tableCode?: string;
      customerName: string;
      type: 'dine_in' | 'takeaway';
      guests: number;
      notes?: string;
      items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
    }) => {
      const order = await requestAdminJson<{ id: number; orderNumber: string }>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'manual' }),
      });
      await refreshSnapshot();
      showNotice({ tone: 'success', message: 'Order sent to kitchen.' });
      return order;
    },
    [refreshSnapshot, showNotice],
  );

  const handleAvailability = useCallback(
    async (dishId: number | undefined, isAvailable: boolean | undefined) => {
      if (!dishId) return;
      try {
        await requestAdminOk(`/api/menu-items/${dishId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: !isAvailable }),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Menu availability updated.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to update menu.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleCreateMenu = useCallback(
    async (payload: MenuFormPayload) => {
      try {
        await requestAdminOk('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Menu item created.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create menu.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleUpdateMenu = useCallback(
    async (dishId: number | undefined, payload: MenuFormPayload) => {
      if (!dishId) return;
      try {
        await requestAdminOk(`/api/menu-items/${dishId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Menu item saved.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to save menu.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleDeleteMenu = useCallback(
    async (dishId: number | undefined) => {
      if (!dishId) return;
      try {
        const result = await requestAdminJson<{ ok: boolean; deleted: boolean; archived: boolean }>(
          `/api/menu-items/${dishId}`,
          { method: 'DELETE' },
        );
        await refreshSnapshot();
        if (result.archived) {
          showNotice({ tone: 'success', message: 'Menu item has order history and was archived (hidden) instead of deleted.' });
        } else {
          showNotice({ tone: 'success', message: 'Menu item removed.' });
        }
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to remove menu.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleCreateTable = useCallback(
    async (payload: TableFormPayload) => {
      try {
        await requestAdminOk('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Table created.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create table.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleUpdateTable = useCallback(
    async (tableId: number | undefined, payload: TableFormPayload) => {
      if (!tableId) return;
      try {
        await requestAdminOk(`/api/tables/${tableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Table saved.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to save table.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleDeleteTable = useCallback(
    async (tableId: number | undefined) => {
      if (!tableId) return;
      try {
        await requestAdminOk(`/api/tables/${tableId}`, { method: 'DELETE' });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Table archived.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to archive table.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleCreateStaff = useCallback(
    async (payload: StaffFormPayload) => {
      try {
        await requestAdminOk('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Staff created.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create staff.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleUpdateStaff = useCallback(
    async (staffId: number | undefined, payload: StaffFormPayload) => {
      if (!staffId) return;
      try {
        await requestAdminOk(`/api/staff/${staffId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Staff saved.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to save staff.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  const handleDisableStaff = useCallback(
    async (staffId: number | undefined) => {
      if (!staffId) return;
      try {
        await requestAdminOk(`/api/staff/${staffId}`, { method: 'DELETE' });
        await refreshSnapshot();
        showNotice({ tone: 'success', message: 'Staff disabled.' });
      } catch (error) {
        showNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to disable staff.' });
      }
    },
    [refreshSnapshot, showNotice],
  );

  return {
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
  };
}
