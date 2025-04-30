import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Re-enable useParams
import { supabase } from '../../services/supabaseClient';
// Import exercise service and types - with updated interface names
import { getAllExercisesCached, Exercise } from '../../services/exerciseService';
import { SetType, ExerciseSet } from '../../types/adminTypes';

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
    set_type?: SetType | null;
    sets_data?: ExerciseSet[]; // Add support for individual set data
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
    const [exercisesMap, setExercisesMap] = useState<Map<number, Exercise>>(new Map());
    const [isLoading, setIsLoading] = useState<boolean>(true); // Combined loading state
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            setWorkout(null);
            setExercisesMap(new Map()); // Reset map

            try {
                // Fetch exercises first (potentially from cache)
                console.log('Fetching exercise cache...');
                const exercises = await getAllExercisesCached();
                const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
                setExercisesMap(exerciseMap);
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
                            order_in_workout,
                            set_type,
                            sets_data
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

    // Helper to get exercise details based on DB ID
    const getExerciseDetails = (dbId: string | null): Exercise | undefined => {
        if (!dbId) return undefined;
        // IDs are numbers, ensure conversion if needed (assuming db_id is stored correctly)
        const numericId = parseInt(dbId, 10);
        return isNaN(numericId) ? undefined : exercisesMap.get(numericId);
    };

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

    return (
        <div className="container p-4 mx-auto">
            {isLoading && <p>Loading workout details...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {workout && (
                <div>
                    <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">{workout.name}</h1>
                    {/* Add more details like description, week/day etc. */} 
                    
                    <div className="space-y-4">
                        {workout.exercise_instances
                            .sort((a, b) => (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0))
                            .map((ex, index) => {
                                // Look up exercise data
                                const exerciseData = getExerciseDetails(ex.exercise_db_id);
                                const displayName = ex.exercise_name || exerciseData?.name || 'Unnamed Exercise';
                                
                                return (
                                    <div key={ex.exercise_db_id || index} className="p-3 bg-gray-100 rounded shadow dark:bg-gray-700">
                                        <h3 className="mb-1 font-semibold">{displayName}</h3>
                                        {/* Display basic details */} 
                                        <p className="text-sm">Sets: {ex.sets ?? 'N/A'}, Reps: {ex.reps ?? 'N/A'}</p>
                                        {ex.rest_period_seconds !== null && <p className="text-sm">Rest: {ex.rest_period_seconds}s</p>}
                                        {ex.tempo && <p className="text-sm text-gray-600 dark:text-gray-400">Tempo: {ex.tempo}</p>}
                                        
                                        {/* Display individual sets if available */}
                                        {ex.sets_data && ex.sets_data.length > 0 ? (
                                            <div className="mt-2">
                                                <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Set Details:</p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b dark:border-gray-700">
                                                                <th className="py-1 pr-2 text-left">#</th>
                                                                <th className="py-1 pr-2 text-left">Type</th>
                                                                <th className="py-1 pr-2 text-left">Reps</th>
                                                                <th className="py-1 text-left">Rest</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {ex.sets_data.map((set, i) => (
                                                                <tr key={`set-${i}`} className="border-b border-gray-100 dark:border-gray-800">
                                                                    <td className="py-1 pr-2">{i + 1}</td>
                                                                    <td className="py-1 pr-2">
                                                                        <span className={`inline-block px-1.5 py-0.5 text-xs rounded ${
                                                                            set.type === SetType.WARM_UP ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 
                                                                            set.type === SetType.DROP_SET ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 
                                                                            set.type === SetType.FAILURE ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                                        }`}>
                                                                            {getSetTypeName(set.type)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-1 pr-2">{set.reps || '-'}</td>
                                                                    <td className="py-1">{set.rest_seconds ? `${set.rest_seconds}s` : '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Fall back to showing the overall set type if no individual sets */
                                            ex.set_type && (
                                                <p className="text-sm">
                                                    <span className={`inline-block px-2 py-1 text-xs rounded mr-1 ${
                                                        ex.set_type === SetType.WARM_UP ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 
                                                        ex.set_type === SetType.DROP_SET ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 
                                                        ex.set_type === SetType.FAILURE ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        Set Type: {getSetTypeName(ex.set_type)}
                                                    </span>
                                                </p>
                                            )
                                        )}
                                        
                                        {ex.notes && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Notes: {ex.notes}</p>}
                                        
                                        {/* Display exercise details if found */} 
                                        {exerciseData && (
                                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    (Exercise ID: {exerciseData.id})
                                                    {exerciseData.gif_url && (
                                                        <a 
                                                            href={exerciseData.gif_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="ml-2 text-indigo-500 hover:underline"
                                                        >
                                                            View Animation
                                                        </a>
                                                    )}
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