import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, AppState, AppStateStatus } from 'react-native';

interface UseRestTimerOptions {
  vibrationPattern?: number[];
  onComplete?: () => void;
}

interface UseRestTimerReturn {
  timeRemaining: number;
  isActive: boolean;
  currentExercise: string | null;
  start: (seconds: number, exerciseId?: string) => void;
  stop: () => void;
  skip: () => void;
}

const DEFAULT_VIBRATION_PATTERN = [0, 500, 200, 500];

/**
 * Custom hook for managing rest timer between sets
 * Uses end time tracking to properly handle background/foreground transitions
 */
export const useRestTimer = (options?: UseRestTimerOptions): UseRestTimerReturn => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0); // Used to force effect re-run

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const completeTimer = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setTimeRemaining(0);
    setCurrentExercise(null);
    endTimeRef.current = null;

    // Trigger vibration
    Vibration.vibrate(options?.vibrationPattern || DEFAULT_VIBRATION_PATTERN);

    // Call completion callback
    options?.onComplete?.();
  }, [clearTimer, options]);

  const stop = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setTimeRemaining(0);
    setCurrentExercise(null);
    endTimeRef.current = null;
  }, [clearTimer]);

  const skip = useCallback(() => {
    stop();
  }, [stop]);

  const start = useCallback((seconds: number, exerciseId?: string) => {
    // Clear any existing timer
    clearTimer();

    // Set the end time
    endTimeRef.current = Date.now() + seconds * 1000;

    setTimeRemaining(seconds);
    setIsActive(true);
    setCurrentExercise(exerciseId || null);
    setTimerKey(prev => prev + 1); // Force effect to re-run
  }, [clearTimer]);

  // Recalculate remaining time (used when app returns from background)
  const recalculateRemaining = useCallback(() => {
    if (endTimeRef.current && isActive) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

      if (remaining <= 0) {
        // Timer completed while in background
        completeTimer();
      } else {
        setTimeRemaining(remaining);
      }
    }
  }, [isActive, completeTimer]);

  // Timer interval effect
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        if (endTimeRef.current) {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

          if (remaining <= 0) {
            completeTimer();
          } else {
            setTimeRemaining(remaining);
          }
        }
      }, 1000);
    }

    return clearTimer;
  }, [isActive, timerKey, clearTimer, completeTimer]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - recalculate remaining time
        recalculateRemaining();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [recalculateRemaining]);

  return {
    timeRemaining,
    isActive,
    currentExercise,
    start,
    stop,
    skip,
  };
};
