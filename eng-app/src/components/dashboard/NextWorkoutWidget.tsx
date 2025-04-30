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
    week_number: number | null;
    order_in_program: number | null;
    exercise_instances: ExerciseInstanceData[];
}

interface WorkoutDataWithId extends WorkoutData {
    id: string;
}

const NextWorkoutWidget: React.FC<NextWorkoutWidgetProps> = ({ programTemplateId }) => {
  const [workoutData, setWorkoutData] = useState<WorkoutDataWithId | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get a friendly name for the set type
  const getSetTypeName = (setType: SetType | null | undefined): string => {
    if (!setType) return '';
    
    const setTypeMap: Record<SetType, string> = {
      [SetType.REGULAR]: 'Regular',
      [SetType.WARM_UP]: 'Warm-up',
      [SetType.DROP_SET]: 'Drop Set',
      [SetType.FAILURE]: 'To Failure'
    };
    
    return setTypeMap[setType] || '';
  };

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!programTemplateId) {
        setWorkoutData(null);
        setError(null);
        setIsLoading(false);
        return; // No ID, nothing to fetch
      }

      setIsLoading(true);
      setError(null);
      setWorkoutData(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('program_templates')
          .select(`
            name,
            workouts (
              id,
              name,
              day_of_week,
              week_number,
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
          .limit(1, { foreignTable: 'workouts' })
          .limit(10, { foreignTable: 'workouts.exercise_instances' })
          .single();

        if (fetchError) throw fetchError;

        if (data && data.workouts && data.workouts.length > 0) {
          setWorkoutData(data.workouts[0] as WorkoutDataWithId); 
        } else {
          setWorkoutData(null);
          setError('No workouts found for the assigned program.');
        }

      } catch (err: unknown) {
        console.error("Error fetching workout data:", err);
        let message = 'Failed to load workout data.';
        if (typeof err === 'object' && err !== null && 'message' in err) {
          message = (err as Error).message;
        }
        setError(message);
        setWorkoutData(null);
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
        <h2 className="text-lg font-medium">Next Workout</h2>
      </div>
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
            
            {programTemplateId && !workoutData && (
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
                    {workoutData.week_number !== null && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 mr-2">
                        Week {workoutData.week_number}
                      </span>
                    )}
                    {workoutData.day_of_week !== null && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Day {workoutData.day_of_week}
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
                            <span className="font-medium text-gray-800 dark:text-gray-200">{ex.exercise_name || 'Unnamed Exercise'}</span>
                          </div>
                          <div className="flex items-center">
                            {/* Display badges for set types */}
                            {ex.sets_data && ex.sets_data.length > 0 ? (
                              // Group by set type and show a badge for each type
                              [...new Set(ex.sets_data.map(set => set.type))].map((type, idx) => (
                                <span key={`type-${idx}`} className={`mr-2 px-2 py-0.5 text-xs rounded ${
                                  type === SetType.WARM_UP ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 
                                  type === SetType.DROP_SET ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 
                                  type === SetType.FAILURE ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {getSetTypeName(type)}
                                </span>
                              ))
                            ) : (
                              // If no sets_data, fall back to displaying the overall set_type
                              ex.set_type && (
                                <span className={`mr-2 px-2 py-0.5 text-xs rounded ${
                                  ex.set_type === SetType.WARM_UP ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 
                                  ex.set_type === SetType.DROP_SET ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 
                                  ex.set_type === SetType.FAILURE ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {getSetTypeName(ex.set_type)}
                                </span>
                              )
                            )}
                            <span className="px-2.5 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                              {ex.sets} × {ex.reps}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                    <div className="pt-2">
                      <ButtonLink 
                        to={`/workout/${workoutData.id}`}
                        variant="secondary"
                        color="indigo"
                        fullWidth
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        View Full Workout
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