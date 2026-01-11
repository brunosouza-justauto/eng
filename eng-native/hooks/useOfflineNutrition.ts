import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getCache, setCache, CacheKeys } from '../lib/storage';
import { addToQueue } from '../lib/syncQueue';
import {
  getUserNutritionPlan,
  getLoggedMealsForDate,
  getMealsForDayType,
} from '../services/nutritionService';
import {
  NutritionPlanWithMeals,
  DailyNutritionLog,
  MealWithFoodItems,
} from '../types/nutrition';
import { getLocalDateString } from '../utils/date';

// Cache structure for nutrition data
interface CachedNutritionData {
  nutritionPlan: NutritionPlanWithMeals | null;
  cachedAt: string;
}

interface CachedDailyLog {
  dailyLog: DailyNutritionLog | null;
  date: string;
  cachedAt: string;
}

export function useOfflineNutrition() {
  const { user, profile } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithMeals | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyNutritionLog | null>(null);
  const [mealsForToday, setMealsForToday] = useState<MealWithFoodItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch nutrition data
  const fetchNutritionData = useCallback(async () => {
    if (!user?.id || !profile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cacheKey = CacheKeys.nutritionPlan(user.id);
    const dailyCacheKey = CacheKeys.todaysMeals(user.id);
    const today = getLocalDateString();

    if (isOnline) {
      try {
        // Fetch nutrition plan
        const { nutritionPlan: fetchedPlan, error: planError } =
          await getUserNutritionPlan(profile.id);

        if (planError) {
          throw new Error(planError);
        }

        setNutritionPlan(fetchedPlan);

        // Cache the nutrition plan
        if (fetchedPlan) {
          const cacheData: CachedNutritionData = {
            nutritionPlan: fetchedPlan,
            cachedAt: new Date().toISOString(),
          };
          setCache(cacheKey, cacheData);

          // Set meals for today based on day type
          // Default to training day for now - could be smarter based on workout schedule
          const todayMeals = getMealsForDayType(fetchedPlan, 'Training');
          setMealsForToday(todayMeals);
        }

        // Fetch daily log
        const { dailyLog: fetchedLog, error: logError } =
          await getLoggedMealsForDate(user.id, today, fetchedPlan);

        if (logError) {
          console.warn('[useOfflineNutrition] Error fetching daily log:', logError);
        }

        setDailyLog(fetchedLog);

        // Cache daily log
        if (fetchedLog) {
          const dailyCacheData: CachedDailyLog = {
            dailyLog: fetchedLog,
            date: today,
            cachedAt: new Date().toISOString(),
          };
          setCache(dailyCacheKey, dailyCacheData);
        }

        setIsFromCache(false);
      } catch (err: any) {
        console.error('[useOfflineNutrition] Error fetching data:', err);
        setError(err.message);

        // Fall back to cache
        await loadFromCache(cacheKey, dailyCacheKey);
      }
    } else {
      // Offline - use cache
      await loadFromCache(cacheKey, dailyCacheKey);
    }

    setIsLoading(false);
  }, [user?.id, profile?.id, isOnline]);

  // Load from cache
  const loadFromCache = async (cacheKey: string, dailyCacheKey: string) => {
    const cachedPlan = await getCache<CachedNutritionData>(cacheKey);
    const cachedDaily = await getCache<CachedDailyLog>(dailyCacheKey);

    if (cachedPlan?.nutritionPlan) {
      setNutritionPlan(cachedPlan.nutritionPlan);
      const todayMeals = getMealsForDayType(cachedPlan.nutritionPlan, 'Training');
      setMealsForToday(todayMeals);
      setIsFromCache(true);
    }

    if (cachedDaily?.dailyLog) {
      setDailyLog(cachedDaily.dailyLog);
    }

    if (!cachedPlan) {
      setError('No cached nutrition data available');
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchNutritionData();
  }, [fetchNutritionData]);

  // Queue a meal log for sync
  const queueMealLog = useCallback(
    (mealData: {
      meal_id: string;
      date: string;
      notes?: string;
    }) => {
      if (!user?.id) return;

      addToQueue({
        type: 'meal_log',
        action: 'create',
        userId: user.id,
        payload: {
          user_id: user.id,
          ...mealData,
        },
      });

      refreshPendingCount();
    },
    [user?.id, refreshPendingCount]
  );

  // Queue a meal log deletion
  const queueMealLogDelete = useCallback(
    (mealLogId: string) => {
      if (!user?.id) return;

      addToQueue({
        type: 'meal_log',
        action: 'delete',
        userId: user.id,
        payload: {
          id: mealLogId,
        },
      });

      refreshPendingCount();
    },
    [user?.id, refreshPendingCount]
  );

  return {
    // Data
    nutritionPlan,
    dailyLog,
    mealsForToday,

    // State
    isLoading,
    isFromCache,
    error,

    // Actions
    refresh: fetchNutritionData,
    queueMealLog,
    queueMealLogDelete,
    isOnline,
  };
}
