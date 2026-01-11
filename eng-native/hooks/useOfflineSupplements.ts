import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getCache, setCache, CacheKeys } from '../lib/storage';
import { addToQueue } from '../lib/syncQueue';
import { getTodaysSupplements } from '../services/supplementService';
import { TodaysSupplement } from '../types/supplements';
import { getLocalDateString } from '../utils/date';

// Cache structure for supplements data
interface CachedSupplementsData {
  supplements: TodaysSupplement[];
  date: string;
  cachedAt: string;
}

export function useOfflineSupplements() {
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  const [supplements, setSupplements] = useState<TodaysSupplement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch supplements data
  const fetchSupplementsData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cacheKey = CacheKeys.todaysSupplements(user.id);
    const today = getLocalDateString();

    if (isOnline) {
      try {
        const { supplements: fetchedSupplements, error: fetchError } =
          await getTodaysSupplements(user.id);

        if (fetchError) {
          throw new Error(fetchError);
        }

        setSupplements(fetchedSupplements || []);

        // Cache the data
        const cacheData: CachedSupplementsData = {
          supplements: fetchedSupplements || [],
          date: today,
          cachedAt: new Date().toISOString(),
        };
        setCache(cacheKey, cacheData);
        setIsFromCache(false);
      } catch (err: any) {
        console.error('[useOfflineSupplements] Error fetching data:', err);
        setError(err.message);

        // Fall back to cache
        const cached = await getCache<CachedSupplementsData>(cacheKey);
        if (cached && cached.date === today) {
          setSupplements(cached.supplements);
          setIsFromCache(true);
        }
      }
    } else {
      // Offline - use cache
      const cached = await getCache<CachedSupplementsData>(cacheKey);
      if (cached) {
        // Check if cache is from today
        if (cached.date === today) {
          setSupplements(cached.supplements);
          setIsFromCache(true);
        } else {
          // Cache is stale, but still show it with warning
          setSupplements(cached.supplements);
          setIsFromCache(true);
          setError('Cached data may be outdated');
        }
      } else {
        setError('No cached supplements data available');
      }
    }

    setIsLoading(false);
  }, [user?.id, isOnline]);

  // Fetch data on mount
  useEffect(() => {
    fetchSupplementsData();
  }, [fetchSupplementsData]);

  // Queue a supplement log
  const queueSupplementLog = useCallback(
    (logData: {
      assignment_id: string;
      schedule: string;
      logged_at?: string;
    }) => {
      if (!user?.id) return;

      addToQueue({
        type: 'supplement_log',
        action: 'create',
        userId: user.id,
        payload: {
          user_id: user.id,
          logged_at: logData.logged_at || new Date().toISOString(),
          ...logData,
        },
      });

      // Update local state immediately
      setSupplements((prev) =>
        prev.map((supp) =>
          supp.id === logData.assignment_id && supp.schedule === logData.schedule
            ? { ...supp, isLogged: true }
            : supp
        )
      );

      refreshPendingCount();
    },
    [user?.id, refreshPendingCount]
  );

  // Queue a supplement log deletion
  const queueSupplementLogDelete = useCallback(
    (logId: string, assignmentId: string, schedule: string) => {
      if (!user?.id) return;

      addToQueue({
        type: 'supplement_log',
        action: 'delete',
        userId: user.id,
        payload: {
          id: logId,
        },
      });

      // Update local state immediately
      setSupplements((prev) =>
        prev.map((supp) =>
          supp.id === assignmentId && supp.schedule === schedule
            ? { ...supp, isLogged: false }
            : supp
        )
      );

      refreshPendingCount();
    },
    [user?.id, refreshPendingCount]
  );

  // Calculate stats
  const totalSupplements = supplements.length;
  const loggedCount = supplements.filter((s) => s.isLogged).length;
  const adherencePercentage = totalSupplements > 0
    ? Math.round((loggedCount / totalSupplements) * 100)
    : 0;

  return {
    // Data
    supplements,
    totalSupplements,
    loggedCount,
    adherencePercentage,

    // State
    isLoading,
    isFromCache,
    error,

    // Actions
    refresh: fetchSupplementsData,
    queueSupplementLog,
    queueSupplementLogDelete,
    isOnline,
  };
}
