import React, { useEffect, useRef } from 'react';
import { formatTime } from '../../utils/timerUtils';

interface WorkoutTimerProps {
  isStarted: boolean;
  isPaused: boolean;
  initialElapsedTime?: number;
  onTimeUpdate: (elapsedTime: number) => void;
}

const WorkoutTimerComponent: React.FC<WorkoutTimerProps> = ({
  isStarted,
  isPaused,
  initialElapsedTime = 0,
  onTimeUpdate
}) => {
  // Refs for managing the timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(initialElapsedTime);
  
  // We now use formatTime from timerUtils.ts

  // Start the timer
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // If the workout is started and not paused, start the timer
    if (isStarted && !isPaused) {
      // Set the start time
      startTimeRef.current = new Date();
      
      // Start the interval
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000) + pausedTimeRef.current;
          onTimeUpdate(elapsed);
        }
      }, 1000);
    } 
    // If the workout is paused, store the current elapsed time
    else if (isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Store the current elapsed time
      pausedTimeRef.current = initialElapsedTime;
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStarted, isPaused, initialElapsedTime, onTimeUpdate]);

  return (
    <div className="workout-timer">
      <div className="text-xl font-semibold">
        {formatTime(initialElapsedTime)}
      </div>
    </div>
  );
};

export default WorkoutTimerComponent;
