import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseWorkoutTimerOptions {
  onTick?: (elapsedSeconds: number) => void;
}

interface UseWorkoutTimerReturn {
  elapsedTime: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Custom hook for managing workout timer
 */
export const useWorkoutTimer = (options?: UseWorkoutTimerOptions): UseWorkoutTimerReturn => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;

    startTimeRef.current = new Date();
    pausedTimeRef.current = 0;
    setElapsedTime(0);
    setIsRunning(true);
    setIsPaused(false);
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;

    pausedTimeRef.current = elapsedTime;
    clearTimer();
    setIsPaused(true);
  }, [isRunning, isPaused, elapsedTime, clearTimer]);

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return;

    startTimeRef.current = new Date(Date.now() - pausedTimeRef.current * 1000);
    setIsPaused(false);
  }, [isRunning, isPaused]);

  const stop = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setElapsedTime(0);
    setIsRunning(false);
    setIsPaused(false);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  }, [clearTimer]);

  // Recalculate elapsed time (used when app returns from background)
  const recalculateElapsed = useCallback(() => {
    if (startTimeRef.current && isRunning && !isPaused) {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
      setElapsedTime(elapsed);
      options?.onTick?.(elapsed);
    }
  }, [isRunning, isPaused, options]);

  // Timer interval effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Immediately calculate elapsed time
      recalculateElapsed();

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
          setElapsedTime(elapsed);
          options?.onTick?.(elapsed);
        }
      }, 1000);
    }

    return clearTimer;
  }, [isRunning, isPaused, clearTimer, options, recalculateElapsed]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - recalculate elapsed time
        recalculateElapsed();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [recalculateElapsed]);

  return {
    elapsedTime,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
  };
};
