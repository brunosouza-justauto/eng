import React, { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiCopy, FiTrash2 } from 'react-icons/fi';
import { WorkoutAdminData } from '../../types/adminTypes';

interface WorkoutArrangementProps {
  workouts: WorkoutAdminData[];
  onSelectWorkout: (workout: WorkoutAdminData) => void;
  selectedWorkoutId?: string;
  onDuplicateWorkout?: (workout: WorkoutAdminData, targetDayOfWeek: number) => void;
  onDeleteWorkout?: (workoutId: string, workoutName: string) => void;
}

type DayOfWeek = {
  value: number;
  name: string;
  expanded: boolean;
};

const WorkoutArrangement: React.FC<WorkoutArrangementProps> = ({
  workouts,
  onSelectWorkout,
  selectedWorkoutId,
  onDuplicateWorkout,
  onDeleteWorkout,
}) => {
  // Define days of the week
  const [days, setDays] = React.useState<DayOfWeek[]>([
    { value: 1, name: 'MONDAY', expanded: true },
    { value: 2, name: 'TUESDAY', expanded: true },
    { value: 3, name: 'WEDNESDAY', expanded: true },
    { value: 4, name: 'THURSDAY', expanded: true },
    { value: 5, name: 'FRIDAY', expanded: true },
    { value: 6, name: 'SATURDAY', expanded: true },
    { value: 7, name: 'SUNDAY', expanded: true },
  ]);

  // State for tracking which workout we're currently trying to duplicate
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<WorkoutAdminData | null>(null);
  
  // State for tracking which workout we're confirming deletion for
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutAdminData | null>(null);
  
  // Group workouts by day of week
  const workoutsByDay = React.useMemo(() => {
    const grouped: Record<number, WorkoutAdminData[]> = {};
    
    // Initialize empty arrays for each day
    days.forEach(day => {
      grouped[day.value] = [];
    });
    
    // Group workouts
    workouts.forEach(workout => {
      if (workout.day_of_week !== null) {
        const dayIndex = workout.day_of_week;
        if (!grouped[dayIndex]) {
          grouped[dayIndex] = [];
        }
        grouped[dayIndex].push(workout);
      }
    });
    
    return grouped;
  }, [workouts, days]);
  
  // Toggle day expansion
  const toggleDay = (dayValue: number) => {
    setDays(prev => 
      prev.map(day => 
        day.value === dayValue 
          ? { ...day, expanded: !day.expanded } 
          : day
      )
    );
  };

  // Handle clicking the duplicate button
  const handleDuplicateClick = (workout: WorkoutAdminData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the workout
    setDuplicatingWorkout(workout);
  };

  // Handle selecting the target day for duplication
  const handleSelectDuplicateTarget = (targetDayOfWeek: number) => {
    if (duplicatingWorkout && onDuplicateWorkout) {
      onDuplicateWorkout(duplicatingWorkout, targetDayOfWeek);
      setDuplicatingWorkout(null); // Reset after duplication
    }
  };

  // Cancel duplication mode
  const handleCancelDuplicate = () => {
    setDuplicatingWorkout(null);
  };
  
  // Handle clicking the delete button
  const handleDeleteClick = (workout: WorkoutAdminData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the workout
    setDeletingWorkout(workout);
  };
  
  // Handle confirming workout deletion
  const handleConfirmDelete = () => {
    if (deletingWorkout && onDeleteWorkout && deletingWorkout.id) {
      onDeleteWorkout(deletingWorkout.id, deletingWorkout.name);
      setDeletingWorkout(null);
    }
  };
  
  // Cancel deletion confirmation
  const handleCancelDelete = () => {
    setDeletingWorkout(null);
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow dark:bg-gray-800">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold dark:text-white">Workout Arrangement</h2>
        {duplicatingWorkout && (
          <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
            <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-2">
              Select a day to duplicate "{duplicatingWorkout.name}" to:
            </p>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => (
                <button
                  key={day.value}
                  onClick={() => handleSelectDuplicateTarget(day.value)}
                  disabled={day.value === duplicatingWorkout.day_of_week}
                  className={`text-xs py-1 rounded ${
                    day.value === duplicatingWorkout.day_of_week
                      ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {day.name.substring(0, 3)}
                </button>
              ))}
            </div>
            <button
              onClick={handleCancelDuplicate}
              className="mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        )}
        
        {deletingWorkout && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-400 mb-2">
              Delete workout "{deletingWorkout.name}"?
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              This will permanently remove this workout and all its exercises.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        {days.map(day => {
          const dayWorkouts = workoutsByDay[day.value] || [];
          const hasWorkouts = dayWorkouts.length > 0;
          
          return (
            <div key={day.value} className="pb-3 border-b dark:border-gray-700 last:border-0">
              <div 
                className="flex items-center py-1 mb-2 cursor-pointer" 
                onClick={() => toggleDay(day.value)}
              >
                {day.expanded ? (
                  <FiChevronDown className="mr-2 text-indigo-600" />
                ) : (
                  <FiChevronRight className="mr-2 text-indigo-600" />
                )}
                <h3 className="text-sm font-medium text-indigo-600">
                  {day.name} ({dayWorkouts.length})
                </h3>
              </div>
              
              {day.expanded && (
                <div className="pl-6 space-y-2">
                  {hasWorkouts ? (
                    dayWorkouts.map(workout => (
                      <div 
                        key={workout.id} 
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                          selectedWorkoutId === workout.id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div 
                          className="flex items-center flex-grow"
                          onClick={() => onSelectWorkout(workout)}
                        >
                          <div className="w-2 h-2 mr-3 bg-indigo-600 rounded-full"></div>
                          <span className={`text-sm ${
                            selectedWorkoutId === workout.id
                              ? 'font-medium text-indigo-700 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {workout.name}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          {onDuplicateWorkout && !duplicatingWorkout && !deletingWorkout && (
                            <button
                              onClick={(e) => handleDuplicateClick(workout, e)}
                              className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                              title="Duplicate workout to another day"
                            >
                              <FiCopy size={14} />
                            </button>
                          )}
                          {onDeleteWorkout && !duplicatingWorkout && !deletingWorkout && (
                            <button
                              onClick={(e) => handleDeleteClick(workout, e)}
                              className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                              title="Delete workout"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-1 text-sm text-gray-500 dark:text-gray-400">
                      No workouts scheduled
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutArrangement; 