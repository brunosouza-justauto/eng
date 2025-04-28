import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Re-enable useParams
import { supabase } from '../../services/supabaseClient';
// Import wger service and types
import { getAllExercisesCached, WgerExercise } from '../../services/exerciseService';

// Define types locally for now (consider moving to shared types file later)
interface ExerciseInstanceData {
    exercise_db_id: string | null;
    exercise_name: string;
    sets: string | null;
    reps: string | null;
    rest_period_seconds: number | null;
    tempo: string | null;
    notes: string | null;
    order_in_workout: number | null;
}

interface WorkoutData {
    name: string;
    day_of_week: number | null;
    week_number: number | null;
    order_in_program: number | null;
    description: string | null;
    exercise_instances: ExerciseInstanceData[];
}

// Define params type
interface WorkoutViewParams extends Record<string, string | undefined> {
  workoutId: string;
}

const WorkoutView: React.FC = () => {
    const { workoutId } = useParams<WorkoutViewParams>(); // Get ID from route params
    // Removed placeholder ID
    // const workoutId = 'dummy-id'; 

    const [workout, setWorkout] = useState<WorkoutData | null>(null);
    const [wgerExercisesMap, setWgerExercisesMap] = useState<Map<number, WgerExercise>>(new Map());
    const [isLoading, setIsLoading] = useState<boolean>(true); // Combined loading state
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            setWorkout(null);
            setWgerExercisesMap(new Map()); // Reset map

            try {
                // Fetch wger exercises first (potentially from cache)
                console.log('Fetching wger exercise cache...');
                const exercises = await getAllExercisesCached();
                const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
                setWgerExercisesMap(exerciseMap);
                console.log(`Loaded ${exerciseMap.size} exercises into map.`);

                // Now fetch the specific workout
                if (!workoutId) {
                    throw new Error('Workout ID not found in URL.');
                }
                console.log(`Fetching workout ${workoutId}...`);
                const { data: workoutData, error: workoutError } = await supabase
                    .from('workouts')
                    .select(`
                        name,
                        day_of_week,
                        week_number,
                        order_in_program,
                        description,
                        exercise_instances (
                            exercise_db_id,
                            exercise_name,
                            sets,
                            reps,
                            rest_period_seconds,
                            tempo,
                            notes,
                            order_in_workout
                        )
                    `)
                    .eq('id', workoutId)
                    .single();

                if (workoutError) throw workoutError;
                
                if (workoutData) {
                    // Cast needed as Supabase client might not infer nested types perfectly
                    setWorkout(workoutData as unknown as WorkoutData);
                } else {
                    throw new Error('Workout not found.');
                }
                setError(null); // Clear any previous errors on success
            } catch (err: unknown) {
                console.error("Error loading workout view data:", err);
                let message = 'Failed to load workout data.';
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    message = (err as Error).message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [workoutId]); // useEffect depends on workoutId from params

    // Helper to get wger data based on DB ID
    const getWgerDetails = (dbId: string | null): WgerExercise | undefined => {
        if (!dbId) return undefined;
        // wger IDs are numbers, ensure conversion if needed (assuming db_id is stored correctly)
        const numericId = parseInt(dbId, 10);
        return isNaN(numericId) ? undefined : wgerExercisesMap.get(numericId);
    };

    return (
        <div className="container mx-auto p-4">
            {isLoading && <p>Loading workout details...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {workout && (
                <div>
                    <h1 className="text-2xl font-bold mb-4">{workout.name}</h1>
                    {/* Add more details like description, week/day etc. */} 
                    
                    <div className="space-y-4">
                        {workout.exercise_instances
                            .sort((a, b) => (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0))
                            .map((ex, index) => {
                                // Look up wger data
                                const wgerData = getWgerDetails(ex.exercise_db_id);
                                const displayName = ex.exercise_name || wgerData?.name || 'Unnamed Exercise';
                                
                                return (
                                    <div key={ex.exercise_db_id || index} className="p-3 bg-gray-100 dark:bg-gray-700 rounded shadow">
                                        <h3 className="font-semibold mb-1">{displayName}</h3>
                                        {/* Display basic details */} 
                                        <p className="text-sm">Sets: {ex.sets ?? 'N/A'}, Reps: {ex.reps ?? 'N/A'}</p>
                                        {ex.rest_period_seconds !== null && <p className="text-sm">Rest: {ex.rest_period_seconds}s</p>}
                                        {ex.tempo && <p className="text-sm text-gray-600 dark:text-gray-400">Tempo: {ex.tempo}</p>}
                                        {ex.notes && <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Notes: {ex.notes}</p>}
                                        
                                        {/* Display wger details if found */} 
                                        {wgerData && (
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    (Wger ID: {wgerData.id})
                                                    {/* Add link or description later */}
                                                    {/* <a href={`https://wger.de/en/exercise/info/${wgerData.id}/`} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-500 hover:underline">View Details</a> */}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        {workout.exercise_instances.length === 0 && <p>No exercises found for this workout.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkoutView; 