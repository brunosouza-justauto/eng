import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import Card from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { SetType, ExerciseSet } from '../../types/adminTypes';
import { Link } from 'react-router-dom';
import { FiChevronRight, FiExternalLink } from 'react-icons/fi';

interface NextWorkoutWidgetProps {
  programTemplateId: string | null | undefined;
  program?: {
    id: string;
    name: string;
    description: string | null;
    version?: number;
  };
}

// Define types for fetched data (adjust fields as needed based on your SELECT query)
interface ExerciseInstanceData {
    exercise_db_id: string | null;
    exercise_name: string;
    sets: string | null;
    reps: string | null;
    rest_period_seconds: number | null;
    order_in_workout: number | null;
    set_type?: SetType | null;
    sets_data?: ExerciseSet[]; // Add support for individual set data
}

interface WorkoutData {
    name: string;
    day_of_week: number | null;
    order_in_program: number | null;
    exercise_instances: ExerciseInstanceData[];
}

interface WorkoutDataWithId extends WorkoutData {
    id: string;
}

interface WorkoutCompletionStatus {
  isCompleted: boolean;
  completionTime: string | null;
}

// Helper function to clean exercise names from gender and version indicators
const cleanExerciseName = (name: string): string => {
  if (!name) return name;
  // Remove text within parentheses and extra whitespace
  return name.replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
             .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
             .trim();                          // Remove leading/trailing whitespace
};

const NextWorkoutWidget: React.FC<NextWorkoutWidgetProps> = ({ programTemplateId, program }) => {
  const profile = useSelector(selectProfile);
  const [workoutData, setWorkoutData] = useState<WorkoutDataWithId | null>(null);
  // allWorkouts is set in useEffect and is used for program state management,
  // though not directly rendered in the current view
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDataWithId[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestDay, setIsRestDay] = useState<boolean>(false);
  const [showAllExercises, setShowAllExercises] = useState<boolean>(false);
  // Add a new state to track workout completion status
  const [completionStatus, setCompletionStatus] = useState<WorkoutCompletionStatus>({
    isCompleted: false,
    completionTime: null
  });
  
  // Number of exercises to show in the preview
  const PREVIEW_COUNT = 3;
  
  // Helper to get the name of the day from the day_of_week number
  const getDayName = (dayOfWeek: number | null): string => {
    if (dayOfWeek === null) return "";
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Convert from 1-based to 0-based index
    return days[(dayOfWeek - 1) % 7];
  };

  // Helper to get the current day of the week (1 for Monday, 7 for Sunday)
  const getCurrentDayOfWeek = (): number => {
    const today = new Date();
    // getDay returns 0 for Sunday, 1 for Monday, etc.
    // We want 1 for Monday through 7 for Sunday
    return today.getDay() === 0 ? 7 : today.getDay();
  };

  // Helper to group exercises by superset (consecutive exercises with set_type=SUPERSET)
  const groupExercisesBySuperset = (exercises: ExerciseInstanceData[]) => {
    const sortedExercises = [...exercises].sort((a, b) => 
      (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0)
    );
    
    const result: {
      group: ExerciseInstanceData[];
      isSuperset: boolean;
      supersetGroupId: string | null;
    }[] = [];
    
    // Temporary workaround until superset_group_id is added to the database
    // Group consecutive exercises with set_type === SUPERSET as part of the same group
    let currentGroup: ExerciseInstanceData[] = [];
    let groupId = 0;
    
    for (let i = 0; i < sortedExercises.length; i++) {
      const exercise = sortedExercises[i];
      
      if (exercise.set_type === SetType.SUPERSET) {
        // Add to current superset group
        currentGroup.push(exercise);
        
        // If this is the last exercise or the next one isn't a superset, close this group
        if (i === sortedExercises.length - 1 || 
            sortedExercises[i + 1].set_type !== SetType.SUPERSET) {
          
          // Only create a superset group if there are at least 2 exercises
          if (currentGroup.length >= 2) {
            result.push({
              group: [...currentGroup],
              isSuperset: true,
              supersetGroupId: `temp-group-${groupId++}`
            });
          } else {
            // If only one exercise has SUPERSET type, treat it as a regular exercise
            result.push({
              group: [currentGroup[0]],
              isSuperset: false,
              supersetGroupId: null
            });
          }
          
          // Reset for next group
          currentGroup = [];
        }
      } else {
        // Regular exercise, add as its own group
        result.push({
          group: [exercise],
          isSuperset: false,
          supersetGroupId: null
        });
      }
    }
    
    return result;
  };

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!programTemplateId) {
        console.log("No program template ID provided to NextWorkoutWidget");
        setWorkoutData(null);
        setError(null);
        setIsLoading(false);
        setIsRestDay(false);
        return; // No ID, nothing to fetch
      }

      console.log("Fetching workout data for program ID:", programTemplateId);
      setIsLoading(true);
      setError(null);
      setWorkoutData(null);
      setIsRestDay(false);
      setCompletionStatus({ isCompleted: false, completionTime: null });

      try {
        // Fetch all workouts for this program template
        const { data, error: fetchError } = await supabase
          .from('program_templates')
          .select(`
            name,
            workouts (
              id,
              name,
              day_of_week,
              order_in_program,
              exercise_instances (
                exercise_db_id,
                exercise_name,
                sets,
                reps,
                rest_period_seconds,
                order_in_workout,
                set_type,
                sets_data
              )
            )
          `)
          .eq('id', programTemplateId)
          // Removed the limit on workouts to get all workouts
          .limit(10, { foreignTable: 'workouts.exercise_instances' })
          .single();

        if (fetchError) throw fetchError;
        
        console.log("Program template data:", data);

        if (data?.workouts && data.workouts.length > 0) {
          // Store all workouts
          const typedWorkouts = data.workouts as WorkoutDataWithId[];
          setAllWorkouts(typedWorkouts); 
          
          // Get the current day of the week (1-7, Monday-Sunday)
          const currentDayOfWeek = getCurrentDayOfWeek();
          console.log("Current day of week:", currentDayOfWeek);
          
          // Find workout for the current day
          const todaysWorkout = typedWorkouts.find(w => w.day_of_week === currentDayOfWeek);
          
          if (todaysWorkout) {
            console.log("Found workout for today:", todaysWorkout);
            setWorkoutData(todaysWorkout);
            setIsRestDay(false);
            
            // Check if this workout has already been completed today
            if (profile?.user_id) {
              await checkWorkoutCompletion(todaysWorkout.id, profile.user_id);
            }
          } else {
            console.log("No workout found for today (day", currentDayOfWeek, ") - it's a rest day");
            setWorkoutData(null);
            setIsRestDay(true);
          }
        } else {
          console.log("No workouts found for program ID:", programTemplateId);
          setWorkoutData(null);
          setError('No workouts found for the assigned program.');
          setIsRestDay(false);
        }

      } catch (err: unknown) {
        console.error("Error fetching workout data:", err);
        let message = 'Failed to load workout data.';
        if (typeof err === 'object' && err !== null && 'message' in err) {
          message = (err as Error).message;
        }
        setError(message);
        setWorkoutData(null);
        setIsRestDay(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkout();
  }, [programTemplateId, profile?.user_id]);

  // Add a new function to check if the workout has been completed today
  const checkWorkoutCompletion = async (workoutId: string, userId: string) => {
    try {
      // Get today's date in ISO format (YYYY-MM-DD)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      console.log(`Checking if workout ${workoutId} has been completed today (${todayStr})`);
      
      // Query for completed workout sessions from today
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, end_time')
        .eq('workout_id', workoutId)
        .eq('user_id', userId)
        .not('end_time', 'is', null) // Only sessions that were completed (have an end_time)
        .gte('start_time', `${todayStr}T00:00:00`) // From start of today
        .lte('start_time', `${todayStr}T23:59:59`) // To end of today
        .order('end_time', { ascending: false });
      
      if (error) {
        console.error('Error checking workout completion:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Found at least one completed session for today
        console.log('Found completed workout session for today:', data[0]);
        setCompletionStatus({
          isCompleted: true,
          completionTime: data[0].end_time
        });
      } else {
        console.log('No completed workout found for today');
        setCompletionStatus({
          isCompleted: false,
          completionTime: null
        });
      }
    } catch (err) {
      console.error('Error in checkWorkoutCompletion:', err);
    }
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <h2 className="text-lg font-medium">Today's Workout</h2>
      </div>
      {!isLoading && !error && (
        <>
          {!programTemplateId ? (
            <Link 
              to="/workout-programs" 
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
            >
              View available programs
              <FiChevronRight className="ml-1" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={`/workout-plan/${programTemplateId}`}
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
              >
                View Plan
                <FiExternalLink className="ml-1 w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
  
  // Modify the exercise list rendering to show exercises and the start button
  const renderExerciseList = (exercises: ExerciseInstanceData[]) => {
    if (!workoutData) return null;
    
    // Group exercises by superset type
    const exerciseGroups = groupExercisesBySuperset(exercises);
    
    // Determine which groups to show based on showAllExercises state
    // For preview mode, count a superset group as one "item"
    let visibleGroups = exerciseGroups;
    const totalExerciseCount = exerciseGroups.reduce((count, group) => count + group.group.length, 0);
    
    if (!showAllExercises && totalExerciseCount > PREVIEW_COUNT) {
      // Show only enough groups to approximately match PREVIEW_COUNT
      let countSoFar = 0;
      visibleGroups = [];
      
      for (const group of exerciseGroups) {
        visibleGroups.push(group);
        countSoFar += group.group.length;
        
        if (countSoFar >= PREVIEW_COUNT) {
          break;
        }
      }
    }
    
    // Flag to indicate if we're showing a preview (mobile optimization)
    const isPreview = !showAllExercises && totalExerciseCount > PREVIEW_COUNT;
    
    return (
      <div className="space-y-4">
        {/* Exercise list */}
        <div className="space-y-2">
          {visibleGroups.map((group, groupIndex) => (
            <div 
              key={group.supersetGroupId || `group-${groupIndex}`} 
              className={`p-2 rounded-md ${
                group.isSuperset 
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' 
                  : ''
              }`}
            >
              {/* If this is a superset, add a superset label */}
              {group.isSuperset && (
                <div className="mb-1 px-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Superset
                  </span>
                </div>
              )}
              
              {/* Exercise items */}
              <div className={`space-y-1 ${group.isSuperset ? 'pl-2' : ''}`}>
                {group.group.map((exercise, exIndex) => (
                  <div 
                    key={`${group.supersetGroupId || groupIndex}-exercise-${exIndex}`}
                    className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center">
                      <span className="text-gray-800 dark:text-white font-medium">
                        {cleanExerciseName(exercise.exercise_name)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* "Show more" toggle if we have more exercises than the preview count */}
        {totalExerciseCount > PREVIEW_COUNT && (
          <button
            onClick={() => setShowAllExercises(!showAllExercises)}
            className="block w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 py-1"
          >
            {showAllExercises ? 'Show Less' : `Show All (${totalExerciseCount})`}
          </button>
        )}
        
        {/* Start Workout Button */}
        <div className="pt-2 relative">
          {isPreview && (
            <div className="w-full text-center absolute -top-3 left-0 right-0 pointer-events-none">
              <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-300 rounded-full mx-auto animate-pulse">
                ↓ Click to start workout ↓
              </span>
            </div>
          )}
          
          {/* Stacked button layout (always two lines) */}
          <div className="flex flex-col gap-2">
            <ButtonLink 
              to={`/workout-session/${workoutData.id}`}
              variant="primary"
              color="indigo"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              }
            >
              Start Workout
            </ButtonLink>
            
            {/* Full-width History button */}
            <Link
              to="/workouts/history"
              className="flex items-center justify-center w-full px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>View History</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card
      header={header}
      className="h-full flex flex-col"
      variant="default"
    >
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-sm flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        {!isLoading && !error && (
          <> 
            {!programTemplateId && (
              <div className="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Active Program</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have an active training program assigned</p>
              </div>
            )}
            
            {isRestDay && (
              <div className="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-blue-300 dark:text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Rest Day</h3>
                <p className="text-gray-500 dark:text-gray-400">Take it easy today and recover for your next workout</p>
              </div>
            )}
            
            {workoutData && (
              <div className="space-y-4">
                {/* Workout header - always show this */}
                <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
                    {workoutData.name}
                    {program?.version && program.version > 1 && (
                      <span className="ml-1 text-sm font-normal">v{program.version}</span>
                    )}
                  </h3>
                  <div className="flex items-center mt-1">
                    {workoutData.day_of_week !== null && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {getDayName(workoutData.day_of_week)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Show different content based on completion status */}
                {completionStatus.isCompleted ? (
                  // Show completion message with both "View History" and "View Plan" buttons
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">
                      Workout Complete!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                      You've completed your workout for today.
                    </p>
                    {completionStatus.completionTime && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                        Completed at {new Date(completionStatus.completionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                      <Link
                        to="/workouts/history"
                        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        View Workout History
                      </Link>
                      {workoutData && (
                        <Link
                          to={`/workout-session/${workoutData.id}`}
                          className="inline-flex items-center justify-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Start Again
                        </Link>
                      )}
                    </div>
                  </div>
                ) : workoutData.exercise_instances.length > 0 ? (
                  // Show exercises and start button for non-completed workouts
                  renderExerciseList(workoutData.exercise_instances)
                ) : (
                  // Show message if no exercises are defined
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">
                      No exercises defined for this workout
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default NextWorkoutWidget; 