import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getCache, setCache, CacheKeys } from '../lib/storage';
import { addToQueue } from '../lib/syncQueue';
import {
  getAssignedProgram,
  getProgramWorkouts,
  getTodaysWorkout,
  checkWorkoutCompletion,
} from '../services/workoutService';
import {
  ProgramAssignment,
  WorkoutData,
  getCurrentDayOfWeek,
  isEffectiveRestDay,
} from '../types/workout';

// Cache structure for workout data
interface CachedWorkoutData {
  assignment: ProgramAssignment | null;
  workouts: WorkoutData[];
  todaysWorkout: WorkoutData | null;
  isCompleted: boolean;
  completionTime: string | null;
  cachedAt: string;
}

export function useOfflineWorkout() {
  const { user, profile } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  const [assignment, setAssignment] = useState<ProgramAssignment | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutData | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workout data
  const fetchWorkoutData = useCallback(async () => {
    if (!user?.id || !profile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cacheKey = CacheKeys.workoutProgram(user.id);
    const todaysCacheKey = CacheKeys.todaysWorkout(user.id);

    if (isOnline) {
      try {
        // Fetch fresh data from server
        const { assignment: fetchedAssignment, error: assignError } =
          await getAssignedProgram(profile.id);

        if (assignError) {
          throw new Error(assignError);
        }

        setAssignment(fetchedAssignment);

        if (fetchedAssignment?.program_template_id) {
          const { workouts: fetchedWorkouts, error: workoutsError } =
            await getProgramWorkouts(fetchedAssignment.program_template_id);

          if (workoutsError) {
            throw new Error(workoutsError);
          }

          setWorkouts(fetchedWorkouts);

          // Get today's workout
          const todayWorkout = getTodaysWorkout(fetchedWorkouts);
          setTodaysWorkout(todayWorkout);

          // Check completion status if there's a workout today
          let completed = false;
          let completedAt: string | null = null;

          if (todayWorkout && !isEffectiveRestDay(todayWorkout)) {
            const { isCompleted: isComp, completionTime: compTime } =
              await checkWorkoutCompletion(todayWorkout.id, user.id);
            completed = isComp;
            completedAt = compTime;
          }

          setIsCompleted(completed);
          setCompletionTime(completedAt);

          // Cache the data
          const cacheData: CachedWorkoutData = {
            assignment: fetchedAssignment,
            workouts: fetchedWorkouts,
            todaysWorkout: todayWorkout,
            isCompleted: completed,
            completionTime: completedAt,
            cachedAt: new Date().toISOString(),
          };
          setCache(cacheKey, cacheData);
          setCache(todaysCacheKey, cacheData);
          setIsFromCache(false);
        } else {
          // No assigned program
          setWorkouts([]);
          setTodaysWorkout(null);
          setIsCompleted(false);
          setCompletionTime(null);
        }
      } catch (err: any) {
        console.error('[useOfflineWorkout] Error fetching data:', err);
        setError(err.message);

        // Fall back to cache on error
        const cached = await getCache<CachedWorkoutData>(cacheKey);
        if (cached) {
          loadFromCache(cached);
        }
      }
    } else {
      // Offline - use cache
      const cached = await getCache<CachedWorkoutData>(cacheKey);
      if (cached) {
        loadFromCache(cached);
      } else {
        setError('No cached workout data available');
      }
    }

    setIsLoading(false);
  }, [user?.id, profile?.id, isOnline]);

  // Load data from cache
  const loadFromCache = (cached: CachedWorkoutData) => {
    setAssignment(cached.assignment);
    setWorkouts(cached.workouts);

    // Recalculate today's workout based on current day
    const todayWorkout = getTodaysWorkout(cached.workouts);
    setTodaysWorkout(todayWorkout);

    // Use cached completion status (may be stale)
    setIsCompleted(cached.isCompleted);
    setCompletionTime(cached.completionTime);
    setIsFromCache(true);
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  // Check if today is a rest day
  const isRestDay = !todaysWorkout || isEffectiveRestDay(todaysWorkout);

  // Get the day name for display
  const currentDayName = getCurrentDayOfWeek();

  return {
    // Data
    assignment,
    workouts,
    todaysWorkout,
    isCompleted,
    completionTime,

    // State
    isLoading,
    isFromCache,
    error,
    isRestDay,
    currentDayName,

    // Actions
    refresh: fetchWorkoutData,
  };
}

/**
 * Hook for caching workout session data for offline logging
 */
export function useOfflineWorkoutSession() {
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  // Queue a workout session completion for sync
  const queueWorkoutSession = useCallback(
    (sessionData: {
      workout_id: string;
      start_time: string;
      end_time: string;
      duration_seconds: number;
    }) => {
      if (!user?.id) return;

      addToQueue({
        type: 'workout_session',
        action: 'create',
        userId: user.id,
        payload: {
          user_id: user.id,
          ...sessionData,
        },
      });

      refreshPendingCount();
    },
    [user?.id, refreshPendingCount]
  );

  // Queue a workout set completion for sync
  const queueWorkoutSet = useCallback(
    (setData: {
      session_id: string;
      exercise_instance_id: string;
      set_number: number;
      reps: number;
      weight_kg: number | null;
      rpe?: number;
      notes?: string;
    }) => {
      if (!user?.id) return;

      addToQueue({
        type: 'workout_set',
        action: 'create',
        userId: user.id,
        payload: setData,
      });

      refreshPendingCount();
    },
    [user?.id, refreshPendingCount]
  );

  return {
    isOnline,
    queueWorkoutSession,
    queueWorkoutSet,
  };
}
