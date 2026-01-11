import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getCache, setCache, CacheKeys } from '../lib/storage';
import { addToQueue } from '../lib/syncQueue';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../utils/date';

// Cache structure for steps data
interface CachedStepsData {
  goal: number | null;
  steps: number;
  date: string;
  cachedAt: string;
}

export function useOfflineSteps() {
  const { user, profile } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  const [stepGoal, setStepGoal] = useState<number | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch steps data
  const fetchStepsData = useCallback(async () => {
    if (!user?.id || !profile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cacheKey = CacheKeys.todaysSteps(user.id);
    const goalCacheKey = CacheKeys.stepGoal(user.id);
    const today = getLocalDateString();

    if (isOnline) {
      try {
        // Fetch step goal
        const { data: goalData, error: goalError } = await supabase
          .from('step_goals')
          .select('daily_steps')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (goalError) {
          console.warn('[useOfflineSteps] Error fetching goal:', goalError);
        }

        const goal = goalData?.daily_steps || null;
        setStepGoal(goal);

        // Fetch today's steps
        const { data: stepsData, error: stepsError } = await supabase
          .from('step_entries')
          .select('step_count')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (stepsError) {
          console.warn('[useOfflineSteps] Error fetching steps:', stepsError);
        }

        const steps = stepsData?.step_count || 0;
        setStepCount(steps);

        // Cache the data
        const cacheData: CachedStepsData = {
          goal,
          steps,
          date: today,
          cachedAt: new Date().toISOString(),
        };
        setCache(cacheKey, cacheData);
        setCache(goalCacheKey, goal);
        setIsFromCache(false);
      } catch (err: any) {
        console.error('[useOfflineSteps] Error fetching data:', err);
        setError(err.message);

        // Fall back to cache
        const cached = await getCache<CachedStepsData>(cacheKey);
        if (cached && cached.date === today) {
          setStepGoal(cached.goal);
          setStepCount(cached.steps);
          setIsFromCache(true);
        }
      }
    } else {
      // Offline - use cache
      const cached = await getCache<CachedStepsData>(cacheKey);
      if (cached) {
        setStepGoal(cached.goal);
        // If cache is from today, use the count, otherwise start fresh
        if (cached.date === today) {
          setStepCount(cached.steps);
        } else {
          setStepCount(0);
        }
        setIsFromCache(true);
      } else {
        // Try to get at least the goal from cache
        const cachedGoal = await getCache<number | null>(goalCacheKey);
        if (cachedGoal !== null) {
          setStepGoal(cachedGoal);
          setStepCount(0);
          setIsFromCache(true);
        }
      }
    }

    setIsLoading(false);
  }, [user?.id, profile?.id, isOnline]);

  // Fetch data on mount
  useEffect(() => {
    fetchStepsData();
  }, [fetchStepsData]);

  // Queue a steps update
  const queueStepsUpdate = useCallback(
    (newCount: number) => {
      if (!user?.id) return;

      const today = getLocalDateString();

      addToQueue({
        type: 'step_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          step_count: newCount,
        },
      });

      // Update local state immediately
      setStepCount(newCount);

      // Update cache
      const cacheKey = CacheKeys.todaysSteps(user.id);
      const cacheData: CachedStepsData = {
        goal: stepGoal,
        steps: newCount,
        date: today,
        cachedAt: new Date().toISOString(),
      };
      setCache(cacheKey, cacheData);

      refreshPendingCount();
    },
    [user?.id, stepGoal, refreshPendingCount]
  );

  // Add steps (convenience method)
  const addSteps = useCallback(
    (count: number) => {
      queueStepsUpdate(stepCount + count);
    },
    [stepCount, queueStepsUpdate]
  );

  // Calculate progress
  const progressPercentage = stepGoal && stepGoal > 0
    ? Math.min(100, Math.round((stepCount / stepGoal) * 100))
    : 0;

  const remainingSteps = stepGoal
    ? Math.max(0, stepGoal - stepCount)
    : 0;

  // Format steps for display
  const formattedSteps = stepCount >= 1000
    ? `${(stepCount / 1000).toFixed(1)}k`
    : stepCount.toString();

  const formattedGoal = stepGoal && stepGoal >= 1000
    ? `${(stepGoal / 1000).toFixed(0)}k`
    : stepGoal?.toString() || '0';

  return {
    // Data
    stepGoal,
    stepCount,
    progressPercentage,
    remainingSteps,
    formattedSteps,
    formattedGoal,

    // State
    isLoading,
    isFromCache,
    error,
    hasGoal: stepGoal !== null && stepGoal > 0,

    // Actions
    refresh: fetchStepsData,
    queueStepsUpdate,
    addSteps,
    isOnline,
  };
}
