import React from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { WorkoutAdminData } from '../../types/adminTypes';

interface WorkoutArrangementProps {
  workouts: WorkoutAdminData[];
  onSelectWorkout: (workout: WorkoutAdminData) => void;
  selectedWorkoutId?: string;
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
}) => {
  // Define days of the week
  const [days, setDays] = React.useState<DayOfWeek[]>([
    { value: 1, name: 'MONDAY', expanded: true },
    { value: 2, name: 'TUESDAY', expanded: true },
    { value: 3, name: 'WEDNESDAY', expanded: false },
    { value: 4, name: 'THURSDAY', expanded: true },
    { value: 5, name: 'FRIDAY', expanded: false },
    { value: 6, name: 'SATURDAY', expanded: false },
    { value: 7, name: 'SUNDAY', expanded: false },
  ]);
  
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
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow dark:bg-gray-800">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold dark:text-white">Workout Arrangement</h2>
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
                        className={`flex items-center p-2 rounded-md cursor-pointer ${
                          selectedWorkoutId === workout.id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
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