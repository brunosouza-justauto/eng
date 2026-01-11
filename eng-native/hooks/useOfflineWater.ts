import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getCache, setCache, CacheKeys } from '../lib/storage';
import { addToQueue } from '../lib/syncQueue';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../utils/date';

// Cache structure for water data
interface CachedWaterData {
  goal: number | null;
  intake: number;
  date: string;
  cachedAt: string;
}

export function useOfflineWater() {
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch water data
  const fetchWaterData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cacheKey = CacheKeys.todaysWater(user.id);
    const goalCacheKey = CacheKeys.waterGoal(user.id);
    const today = getLocalDateString();

    if (isOnline) {
      try {
        // Fetch water goal
        const { data: goalData, error: goalError } = await supabase
          .from('water_goals')
          .select('water_goal_ml')
          .eq('user_id', user.id)
          .maybeSingle();

        if (goalError) {
          console.warn('[useOfflineWater] Error fetching goal:', goalError);
        }

        const goal = goalData?.water_goal_ml || null;
        setWaterGoal(goal);

        // Fetch today's intake
        const { data: intakeData, error: intakeError } = await supabase
          .from('water_tracking')
          .select('amount_ml')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (intakeError) {
          console.warn('[useOfflineWater] Error fetching intake:', intakeError);
        }

        const intake = intakeData?.amount_ml || 0;
        setWaterIntake(intake);

        // Cache the data
        const cacheData: CachedWaterData = {
          goal,
          intake,
          date: today,
          cachedAt: new Date().toISOString(),
        };
        setCache(cacheKey, cacheData);
        setCache(goalCacheKey, goal);
        setIsFromCache(false);
      } catch (err: any) {
        console.error('[useOfflineWater] Error fetching data:', err);
        setError(err.message);

        // Fall back to cache
        const cached = await getCache<CachedWaterData>(cacheKey);
        if (cached && cached.date === today) {
          setWaterGoal(cached.goal);
          setWaterIntake(cached.intake);
          setIsFromCache(true);
        }
      }
    } else {
      // Offline - use cache
      const cached = await getCache<CachedWaterData>(cacheKey);
      if (cached) {
        setWaterGoal(cached.goal);
        // If cache is from today, use the intake, otherwise start fresh
        if (cached.date === today) {
          setWaterIntake(cached.intake);
        } else {
          setWaterIntake(0);
        }
        setIsFromCache(true);
      } else {
        // Try to get at least the goal from cache
        const cachedGoal = await getCache<number | null>(goalCacheKey);
        if (cachedGoal !== null) {
          setWaterGoal(cachedGoal);
          setWaterIntake(0);
          setIsFromCache(true);
        }
      }
    }

    setIsLoading(false);
  }, [user?.id, isOnline]);

  // Fetch data on mount
  useEffect(() => {
    fetchWaterData();
  }, [fetchWaterData]);

  // Queue a water log update
  const queueWaterUpdate = useCallback(
    (newAmount: number) => {
      if (!user?.id) return;

      const today = getLocalDateString();

      addToQueue({
        type: 'water_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          amount_ml: newAmount,
        },
      });

      // Update local state immediately
      setWaterIntake(newAmount);

      // Update cache
      const cacheKey = CacheKeys.todaysWater(user.id);
      const cacheData: CachedWaterData = {
        goal: waterGoal,
        intake: newAmount,
        date: today,
        cachedAt: new Date().toISOString(),
      };
      setCache(cacheKey, cacheData);

      refreshPendingCount();
    },
    [user?.id, waterGoal, refreshPendingCount]
  );

  // Add water (convenience method)
  const addWater = useCallback(
    (amountMl: number) => {
      queueWaterUpdate(waterIntake + amountMl);
    },
    [waterIntake, queueWaterUpdate]
  );

  // Calculate progress
  const progressPercentage = waterGoal && waterGoal > 0
    ? Math.min(100, Math.round((waterIntake / waterGoal) * 100))
    : 0;

  const remainingMl = waterGoal
    ? Math.max(0, waterGoal - waterIntake)
    : 0;

  return {
    // Data
    waterGoal,
    waterIntake,
    progressPercentage,
    remainingMl,

    // State
    isLoading,
    isFromCache,
    error,
    hasGoal: waterGoal !== null && waterGoal > 0,

    // Actions
    refresh: fetchWaterData,
    queueWaterUpdate,
    addWater,
    isOnline,
  };
}
