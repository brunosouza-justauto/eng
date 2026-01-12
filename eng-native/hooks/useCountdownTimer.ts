import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';

interface UseCountdownTimerOptions {
  vibrationPattern?: number[];
  onComplete?: () => void;
}

interface UseCountdownTimerReturn {
  timeRemaining: number;
  totalTime: number;
  isActive: boolean;
  isPaused: boolean;
  start: (seconds: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
}

const DEFAULT_VIBRATION_PATTERN = [0, 500, 200, 500, 200, 500];

/**
 * Custom hook for managing countdown timer for timed exercises (planks, cardio, etc.)
 * Uses end time tracking to properly handle background/foreground transitions
 */
export const useCountdownTimer = (options?: UseCountdownTimerOptions): UseCountdownTimerReturn => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const completeTimer = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(0);
    setTotalTime(0);
    endTimeRef.current = null;
    pausedTimeRef.current = 0;

    // Trigger vibration
    Vibration.vibrate(options?.vibrationPattern || DEFAULT_VIBRATION_PATTERN);

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Call completion callback
    options?.onComplete?.();
  }, [clearTimer, options]);

  const stop = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(0);
    setTotalTime(0);
    endTimeRef.current = null;
    pausedTimeRef.current = 0;
  }, [clearTimer]);

  const skip = useCallback(() => {
    stop();
  }, [stop]);

  const pause = useCallback(() => {
    if (!isActive || isPaused) return;

    clearTimer();
    pausedTimeRef.current = timeRemaining;
    setIsPaused(true);
    endTimeRef.current = null;
  }, [isActive, isPaused, clearTimer, timeRemaining]);

  const resume = useCallback(() => {
    if (!isActive || !isPaused) return;

    endTimeRef.current = Date.now() + pausedTimeRef.current * 1000;
    setIsPaused(false);
    setTimerKey(prev => prev + 1);
  }, [isActive, isPaused]);

  const start = useCallback((seconds: number) => {
    clearTimer();

    endTimeRef.current = Date.now() + seconds * 1000;
    pausedTimeRef.current = 0;

    setTimeRemaining(seconds);
    setTotalTime(seconds);
    setIsActive(true);
    setIsPaused(false);
    setTimerKey(prev => prev + 1);
  }, [clearTimer]);

  // Recalculate remaining time (used when app returns from background)
  const recalculateRemaining = useCallback(() => {
    if (endTimeRef.current && isActive && !isPaused) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

      if (remaining <= 0) {
        completeTimer();
      } else {
        setTimeRemaining(remaining);
      }
    }
  }, [isActive, isPaused, completeTimer]);

  // Timer interval effect
  useEffect(() => {
    if (isActive && !isPaused && timeRemaining > 0) {
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
  }, [isActive, isPaused, timerKey, clearTimer, completeTimer]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
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
    totalTime,
    isActive,
    isPaused,
    start,
    stop,
    pause,
    resume,
    skip,
  };
};
