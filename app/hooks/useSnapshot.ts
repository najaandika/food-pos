'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PosSnapshot } from '@/lib/pos-types';

export function useSnapshot(isAuthorized: boolean) {
  const [snapshot, setSnapshot] = useState<PosSnapshot | null>(null);
  const refreshInFlightRef = useRef(false);
  const snapshotSignatureRef = useRef('');

  const refreshSnapshot = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      const response = await fetch('/api/pos', { cache: 'no-store' });
      if (!response.ok) return;
      const nextSnapshot = (await response.json()) as PosSnapshot;
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

  return { snapshot, refreshSnapshot };
}
