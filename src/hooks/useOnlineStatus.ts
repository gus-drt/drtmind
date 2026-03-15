import { useState, useEffect, useCallback, useRef } from 'react';
import { processQueue } from '@/lib/syncQueue';

/**
 * Monitors browser online/offline status and automatically
 * triggers sync queue processing when reconnecting.
 */
export function useOnlineStatus(userId: string | undefined) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ processed: number; failed: number } | null>(null);
  const processingRef = useRef(false);

  const triggerSync = useCallback(async () => {
    if (!userId || processingRef.current) return;
    processingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await processQueue(userId);
      setLastSyncResult(result);
      if (result.processed > 0) {
        console.log(`[Sync] Processed ${result.processed} ops, ${result.failed} failed`);
      }
    } catch (e) {
      console.error('[Sync] Queue processing error:', e);
    } finally {
      setIsSyncing(false);
      processingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Periodic sync every 30s when online
  useEffect(() => {
    if (!isOnline || !userId) return;

    const interval = setInterval(triggerSync, 30_000);
    return () => clearInterval(interval);
  }, [isOnline, userId, triggerSync]);

  // Initial sync on mount
  useEffect(() => {
    if (isOnline && userId) {
      triggerSync();
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, isSyncing, lastSyncResult, triggerSync };
}
