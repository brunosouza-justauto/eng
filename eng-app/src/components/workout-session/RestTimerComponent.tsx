import React, { useState, useEffect, useRef } from 'react';
import { playCountdownBeep, formatRestTime, playAlertSound } from '../../utils/timerUtils';

// Next exercise information type
interface NextExerciseInfo {
  exerciseName: string;
  setType: string;
  reps: string | number;
  isSameExercise: boolean;
  exerciseDbId?: string | null;
}

// Simplified props - only the essential data needed to start a timer
interface RestTimerProps {
  // Identification props
  exerciseId: string;
  setIndex: number;
  duration: number; // Initial duration in seconds
  
  // Context props
  isPaused: boolean;
  getNextExerciseInfo: (exerciseId: string, setIndex: number) => NextExerciseInfo | null;
  
  // Event callbacks
  onComplete: (exerciseId: string, setIndex: number) => void;
  onSkip: () => void;
}

const RestTimerComponent: React.FC<RestTimerProps> = ({
  exerciseId,
  setIndex,
  duration,
  isPaused,
  getNextExerciseInfo,
  onComplete,
  onSkip
}) => {
  // Internal state
  const [timeLeft, setTimeLeft] = useState(duration);
  const [nextExerciseInfo, setNextExerciseInfo] = useState<NextExerciseInfo | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get next exercise info when the component mounts
  useEffect(() => {
    setNextExerciseInfo(getNextExerciseInfo(exerciseId, setIndex));
  }, [exerciseId, setIndex, getNextExerciseInfo]);
  
  // Timer initialization effect
  useEffect(() => {
    // Clean up any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Set initial time
    setTimeLeft(duration);
    
    // Don't start if paused
    if (isPaused) return;
    
    // Vibrate when timer starts (if supported)
    if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
      navigator.vibrate(200);
    }
  }, [duration]);
  
  // Handle pause state changes
  useEffect(() => {
    if (isPaused && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    } else if (!isPaused && !timerIntervalRef.current && timeLeft > 0) {
      // Restart timer if unpaused and timer not running
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          if (newTime <= 0) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            playAlertSound();
            setTimeout(() => onComplete(exerciseId, setIndex), 100);
            return 0;
          }
          
          if (newTime <= 5 && newTime > 0) {
            playCountdownBeep();
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPaused, timerIntervalRef]);
  
  // Progress calculation
  const progress = (timeLeft / duration) * 100;
  const isCountingDown = timeLeft <= 5;
  
  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className={`${isCountingDown ? 'bg-red-600' : 'bg-indigo-600'} 
        text-white p-3 shadow-lg flex flex-col items-center w-full
        transition-all ${isCountingDown ? 'scale-105' : ''}`}>
        
        <div className="w-full max-w-screen-sm mx-auto px-3">
          {/* Timer display */}
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-medium">
              {isCountingDown ? 'Get Ready!' : 'Rest Timer'}
            </div>
            
            <div className={`text-2xl font-bold ${isCountingDown ? 'animate-pulse' : ''}`}>
              {isCountingDown 
                ? <span className="text-3xl">{timeLeft}</span> 
                : formatRestTime(timeLeft)
              }
            </div>
            
            <button 
              onClick={onSkip}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-2 py-1 transition-colors"
            >
              Skip
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
            <div 
              className={`h-2.5 rounded-full ${isCountingDown ? 'bg-white' : 'bg-indigo-300'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Next exercise info - improved layout with grid for consistent alignment */}
          {nextExerciseInfo ? (
            <div className="grid grid-cols-12 gap-2 text-xs text-white/90 py-1">
              {/* Left column - Next Set/Exercise Label */}
              <div className="col-span-2 sm:col-span-2 flex items-center">
                <span className="whitespace-nowrap">
                  {nextExerciseInfo.isSameExercise ? 'Next Set:' : 'Next Exercise:'}
                </span>
              </div>
              
              {/* Middle column - Exercise Name (with truncation for very long names) */}
              <div className="col-span-6 ml-2 sm:col-span-6 flex items-center">
                <span className="font-medium text-white truncate max-w-full">
                  {nextExerciseInfo.exerciseName}
                </span>
              </div>
              
              {/* Right column - Set Type and Reps Badges (always on the same line) */}
              <div className="col-span-4 sm:col-span-4 flex items-center justify-end space-x-2 whitespace-nowrap">
                <span className="px-2 py-0.5 bg-white/20 rounded-full inline-block">
                  {nextExerciseInfo.setType}
                </span>
                <span className="px-2 py-0.5 bg-green-500/30 rounded-full inline-block">
                  {nextExerciseInfo.reps} reps
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <span className="opacity-80">Prepare for next exercise</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestTimerComponent;
