import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

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
                order_in_workout
              )
            )
          `)
          .eq('id', programTemplateId)
          // --- Simplification: Fetch first workout based on order --- 
          // This assumes workouts/instances are ordered correctly in the DB 
          // or you add .order() clauses here and in nested selects
          .limit(1, { foreignTable: 'workouts' })
          .limit(10, { foreignTable: 'workouts.exercise_instances' }) // Limit exercises shown in preview
          // ---------------------------------------------------------
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

  }, [programTemplateId]); // Refetch when programTemplateId changes

  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3 flex-shrink-0">Next Workout</h2>
      <div className="flex-grow overflow-y-auto text-sm">
        {isLoading && <p>Loading workout...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
            <> 
                {!programTemplateId && <p>No active program assigned.</p>}
                {programTemplateId && !workoutData && <p>No upcoming workout found in the assigned program.</p>}
                {workoutData && (
                    <div className="space-y-3">
                        <h3 className="font-semibold text-base text-indigo-600 dark:text-indigo-400">{workoutData.name}</h3>
                        {workoutData.exercise_instances.length > 0 ? (
                            <ul className="space-y-1.5 pl-1">
                                {workoutData.exercise_instances
                                    // Sort and take only first few for preview if desired (e.g., .slice(0, 3))
                                    .sort((a, b) => (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0))
                                    .map((ex, index) => (
                                        <li key={ex.exercise_db_id || index} className="flex justify-between items-center">
                                            <span>{ex.exercise_name || 'Unnamed Exercise'}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{ex.sets} x {ex.reps}</span>
                                        </li>
                                ))}
                            </ul>
                        ) : (
                             <p>No exercises defined for this workout.</p>
                        )}
                       
                        <Link 
                            to={`/workout/${workoutData.id}`} 
                            className="mt-3 inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            View Full Workout
                        </Link>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default NextWorkoutWidget; 