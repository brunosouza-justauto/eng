import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { SetType, ExerciseSet } from '../../types/adminTypes';

interface NextWorkoutWidgetProps {
  programTemplateId: string | null | undefined;
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

const NextWorkoutWidget: React.FC<NextWorkoutWidgetProps> = ({ programTemplateId }) => {
  const [workoutData, setWorkoutData] = useState<WorkoutDataWithId | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDataWithId[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestDay, setIsRestDay] = useState<boolean>(false);
  
  // Helper to get the name of the day from the day_of_week number
  const getDayName = (dayOfWeek: number | null): string => {
    if (dayOfWeek === null) return "";
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Convert from 1-based to 0-based index
    return days[(dayOfWeek - 1) % 7];
  };

  // Helper to get a friendly name for the set type
  const getSetTypeName = (setType: SetType | null | undefined): string => {
    if (!setType) return '';
    
    // Using index signature instead of Record<SetType, string> to allow for string keys
    const setTypeMap: { [key: string]: string } = {
      [SetType.REGULAR]: 'Regular',
      [SetType.WARM_UP]: 'Warm-up',
      [SetType.DROP_SET]: 'Drop Set',
      [SetType.FAILURE]: 'To Failure',
      [SetType.BACKDOWN]: 'Backdown',
      [SetType.TEMPO]: 'Tempo',
      [SetType.SUPERSET]: 'Superset',
      [SetType.CONTRAST]: 'Contrast',
      [SetType.COMPLEX]: 'Complex',
      [SetType.CLUSTER]: 'Cluster',
      [SetType.PYRAMID]: 'Pyramid',
      [SetType.PARTIAL]: 'Partial',
      [SetType.BURNS]: 'Burns',
      [SetType.PAUSE]: 'Pause',
      [SetType.PULSE]: 'Pulse',
      [SetType.NEGATIVE]: 'Negative',
      [SetType.FORCED_REP]: 'Forced Rep',
      [SetType.PRE_EXHAUST]: 'Pre-Exhaust',
      [SetType.POST_EXHAUST]: 'Post-Exhaust'
    };
    
    return setTypeMap[setType] || setType;
  };

  // Helper to get the current day of the week (1 for Monday, 7 for Sunday)
  const getCurrentDayOfWeek = (): number => {
    const today = new Date();
    // getDay returns 0 for Sunday, 1 for Monday, etc.
    // We want 1 for Monday through 7 for Sunday
    return today.getDay() === 0 ? 7 : today.getDay();
  };

  // Helper to format exercise sets display
  const formatSetsReps = (exercise: ExerciseInstanceData): string => {
    // If we have detailed sets_data, use that for a more accurate display
    if (exercise.sets_data && exercise.sets_data.length > 0) {
      const repScheme = exercise.sets_data.map(set => {
        let repText = set.reps || '';
        // Add set type indicator for special sets
        if (set.type && set.type !== SetType.REGULAR) {
          const setTypeAbbr = getSetTypeName(set.type).substring(0, 1); // Get first letter of set type
          repText = `${repText}${setTypeAbbr}`;
        }
        return repText;
      }).join(' / ');
      
      return `${exercise.sets_data.length} sets: ${repScheme}`;
    }
    
    // Fall back to the legacy format
    const sets = exercise.sets || '0';
    const reps = exercise.reps || 'N/A';
    return `${sets}×${reps}`;
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
  }, [programTemplateId]);

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <h2 className="text-lg font-medium">Today's Workout</h2>
      </div>
      {workoutData?.day_of_week && (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {getDayName(workoutData.day_of_week)}
        </span>
      )}
    </div>
  );
  
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
            
            {programTemplateId && isRestDay && (
              <div className="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">REST DAY</h3>
                <p className="text-gray-500 dark:text-gray-400">Take time to recover and prepare for your next workout</p>
                
                {allWorkouts.length > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your program includes:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {allWorkouts
                        .sort((a, b) => (a.day_of_week || 0) - (b.day_of_week || 0))
                        .map(workout => (
                          <span key={workout.id} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {getDayName(workout.day_of_week)}: {workout.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {programTemplateId && !isRestDay && !workoutData && (
              <div className="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Upcoming Workout</h3>
                <p className="text-gray-500 dark:text-gray-400">Check back later for your next session</p>
              </div>
            )}
            
            {workoutData && (
              <div className="space-y-4">
                <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">{workoutData.name}</h3>
                  <div className="flex items-center mt-1">
                    {workoutData.day_of_week !== null && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {getDayName(workoutData.day_of_week)}
                      </span>
                    )}
                  </div>
                </div>
                
                {workoutData.exercise_instances.length > 0 ? (
                  <div className="space-y-3">
                    {workoutData.exercise_instances
                      .sort((a, b) => (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0))
                      .map((ex, index) => (
                        <div key={ex.exercise_db_id || index} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                          <div className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xs font-medium text-indigo-800 dark:text-indigo-300 mr-3">
                              {index + 1}
                            </span>
                            <div>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{ex.exercise_name || 'Unnamed Exercise'}</span>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatSetsReps(ex)}
                                {ex.set_type && ex.set_type !== SetType.REGULAR && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                                    {getSetTypeName(ex.set_type)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                    <div className="pt-2">
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
                    </div>
                  </div>
                ) : (
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