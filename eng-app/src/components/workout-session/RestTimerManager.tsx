import { useState, forwardRef, useImperativeHandle } from 'react';
import RestTimerComponent from './RestTimerComponent';

interface NextExerciseInfo {
  exerciseName: string;
  setType: string;
  reps: string | number;
  isSameExercise: boolean;
  exerciseDbId?: string | null;
}

interface RestTimerManagerProps {
  isPaused: boolean;
  getNextExerciseInfo: (exerciseId: string, setIndex: number) => NextExerciseInfo | null;
  onRestComplete: (exerciseId: string, setIndex: number) => void;
}

// Track active rest timer
interface RestTimerData {
  exerciseId: string;
  setIndex: number;
  duration: number;
}

// Define the handle interface for imperative operations
export interface RestTimerManagerHandle {
  startRestTimer: (exerciseId: string, setIndex: number, duration: number) => void;
  isTimerActive: () => boolean;
  clearTimer: () => void;
}

const RestTimerManager = forwardRef<RestTimerManagerHandle, RestTimerManagerProps>(({
  isPaused,
  getNextExerciseInfo,
  onRestComplete
}, ref) => {
  // Internal state to track active timers
  const [activeTimer, setActiveTimer] = useState<RestTimerData | null>(null);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // Start a new rest timer
    startRestTimer: (exerciseId: string, setIndex: number, duration: number) => {
      // Set the active timer data
      setActiveTimer({
        exerciseId,
        setIndex,
        duration
      });
    },
    
    // Check if a timer is currently active
    isTimerActive: () => activeTimer !== null,
    
    // Clear the current timer if any
    clearTimer: () => setActiveTimer(null)
  }));
  
  // Handler for timer completion
  const handleTimerComplete = (exerciseId: string, setIndex: number) => {
    // Clear active timer
    setActiveTimer(null);
    
    // Notify parent component
    onRestComplete(exerciseId, setIndex);
  };
  
  // Handler for timer skip
  const handleSkipTimer = () => {
    setActiveTimer(null);
  };
  
  // Only render the timer component if there is an active timer
  if (!activeTimer) return null;
  
  return (
    <RestTimerComponent
      exerciseId={activeTimer.exerciseId}
      setIndex={activeTimer.setIndex}
      duration={activeTimer.duration}
      isPaused={isPaused}
      getNextExerciseInfo={getNextExerciseInfo}
      onComplete={handleTimerComplete}
      onSkip={handleSkipTimer}
    />
  );
});

RestTimerManager.displayName = 'RestTimerManager';

export { RestTimerManager, type RestTimerData };
