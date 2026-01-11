import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { processQueue, SyncResult } from '../lib/syncManager';
import { loadQueue, getQueueLength } from '../lib/syncQueue';
import { getCache, CacheKeys } from '../lib/storage';

interface OfflineContextType {
  // Connectivity state
  isOnline: boolean; // true = online, false = offline (null internally means unknown, exposed as false)
  isInitialized: boolean;

  // Sync state
  pendingOperations: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;

  // Actions
  syncNow: () => Promise<SyncResult | null>;
  refreshPendingCount: () => void;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Start with null (unknown) state - will be set once NetInfo initializes
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncInProgress = useRef(false);

  // Refresh pending operations count
  const refreshPendingCount = useCallback(() => {
    setPendingOperations(getQueueLength());
  }, []);

  // Sync queued operations
  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (syncInProgress.current || isOnline !== true) {
      console.log('[OfflineContext] Sync skipped - already syncing or offline/unknown');
      return null;
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      console.log('[OfflineContext] Starting sync...');
      const result = await processQueue();

      setLastSyncTime(new Date());
      setLastSyncResult(result);
      setPendingOperations(getQueueLength());

      console.log(
        `[OfflineContext] Sync complete: ${result.processed} processed, ${result.failed} failed`
      );

      return result;
    } catch (error) {
      console.error('[OfflineContext] Error during sync:', error);
      return null;
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [isOnline]);

  // Initialize and listen for network changes
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function initialize() {
      // Load queue from storage into memory
      await loadQueue();

      // Load last sync time from storage
      const storedLastSync = await getCache<string>(CacheKeys.lastSyncTime);
      if (storedLastSync) {
        setLastSyncTime(new Date(storedLastSync));
      }

      // Initial pending count (now in-memory queue is loaded)
      setPendingOperations(getQueueLength());

      // Subscribe to network state changes
      unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        const online = state.isConnected && state.isInternetReachable !== false;

        setIsOnline((prevIsOnline) => {
          // Previous was offline (false) or unknown (null)
          const wasOffline = prevIsOnline !== true;

          console.log(
            `[OfflineContext] Network state changed: ${online ? 'online' : 'offline'} (was: ${prevIsOnline})`
          );

          // Auto-sync when coming back online (from offline state, not from unknown)
          if (online && prevIsOnline === false && !syncInProgress.current) {
            console.log('[OfflineContext] Back online - triggering auto-sync');
            syncNow();
          }

          return online ?? false;
        });

        setIsInitialized(true);
      });

      // Periodically update pending count (every 2 seconds)
      interval = setInterval(() => {
        setPendingOperations(getQueueLength());
      }, 2000);
    }

    initialize();

    return () => {
      if (unsubscribe) unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        // Coerce null (unknown) to false - treat unknown as offline for safety
        isOnline: isOnline === true,
        isInitialized,
        pendingOperations,
        isSyncing,
        lastSyncTime,
        lastSyncResult,
        syncNow,
        refreshPendingCount,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Hook to access offline context
 */
export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

/**
 * Hook to check if app is online (simpler version)
 */
export function useIsOnline(): boolean {
  const { isOnline, isInitialized } = useOffline();
  // Return true if not yet initialized (optimistic)
  return isInitialized ? isOnline : true;
}
