import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Re-enable useParams
import { supabase } from '../../services/supabaseClient';
// Update import to use the new exercise database adapter
import { getExercisesByIds } from '../../utils/exerciseDatabaseAdapter';
import { Exercise } from '../../utils/exerciseTypes';
import { SetType, ExerciseSet } from '../../types/adminTypes';
import BackButton from '../common/BackButton';

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
    superset_group_id?: string | null; // Add superset group ID field
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

// Helper function to clean exercise names from gender and version indicators
const cleanExerciseName = (name: string): string => {
  if (!name) return name;
  // Remove text within parentheses and extra whitespace
  return name.replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
             .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
             .trim();                          // Remove leading/trailing whitespace
};

const WorkoutView: React.FC = () => {
    const { workoutId } = useParams<WorkoutViewParams>(); // Get ID from route params
    // Removed placeholder ID
    // const workoutId = 'dummy-id'; 

    const [workout, setWorkout] = useState<WorkoutData | null>(null);
    // Update map to use string keys instead of number keys
    const [exercisesMap, setExercisesMap] = useState<Map<string, Exercise>>(new Map());
    const [isLoading, setIsLoading] = useState<boolean>(true); // Combined loading state
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            setWorkout(null);
            setExercisesMap(new Map()); // Reset map

            try {
                // First fetch the specific workout
                if (!workoutId) {
                    throw new Error('Workout ID not found in URL.');
                }
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
                
                if (!workoutData) {
                    throw new Error('Workout not found.');
                }

                // Cast needed as Supabase client might not infer nested types perfectly
                const typedWorkoutData = workoutData as unknown as WorkoutData;
                setWorkout(typedWorkoutData);

                // Extract exercise IDs that we need to fetch
                const exerciseIds = typedWorkoutData.exercise_instances
                    .map(ex => ex.exercise_db_id)
                    .filter((id): id is string => id !== null); // Filter out nulls

                // Only fetch exercises if we have valid IDs
                if (exerciseIds.length > 0) {
                    const exercises = await getExercisesByIds(exerciseIds);
                    // Use id as string for the map key
                    const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
                    setExercisesMap(exerciseMap);
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
        // Use string ID directly without conversion
        return exercisesMap.get(dbId);
    };

    // Helper to get a friendly name for the set type
    const getSetTypeName = (setType: SetType | null | undefined): string => {
        if (!setType) return '';
        
        const setTypeMap: Record<string, string> = {
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

    // Group exercises by consecutive superset set_type
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

    return (
        <div className="container mx-auto py-6">
            <BackButton to="/dashboard" />
            
            {isLoading && <p>Loading workout details...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {workout && (
                <div>
                    <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">{workout.name}</h1>
                    {/* Add more details like description, week/day etc. */} 
                    
                    <div className="space-y-4">
                        {workout.exercise_instances.length === 0 ? (
                            <p>No exercises found for this workout.</p>
                        ) : (
                            groupExercisesBySuperset(workout.exercise_instances).map((exerciseGroup, groupIndex) => {
                                if (exerciseGroup.isSuperset) {
                                    // Render a superset group
                                    return (
                                        <div 
                                            key={exerciseGroup.supersetGroupId || `superset-${groupIndex}`} 
                                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded shadow border-2 border-indigo-300 dark:border-indigo-700"
                                        >
                                            <div className="mb-2 flex items-center">
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                                    Superset Group
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {exerciseGroup.group.map((ex, index) => {
                                // Look up exercise data
                                const exerciseData = getExerciseDetails(ex.exercise_db_id);
                                const displayName = cleanExerciseName(ex.exercise_name || exerciseData?.name || 'Unnamed Exercise');
                                
                                return (
                                                        <div 
                                                            key={ex.exercise_db_id || `superset-ex-${index}`} 
                                                            className="p-3 bg-gray-100 rounded dark:bg-gray-700 relative"
                                                        >
                                                            {/* Connecting line for all but the last exercise */}
                                                            {index < exerciseGroup.group.length - 1 && (
                                                                <div className="absolute w-0.5 bg-indigo-300 dark:bg-indigo-600" style={{
                                                                    left: '50%',
                                                                    top: '100%',
                                                                    height: '8px',
                                                                    transform: 'translateX(-50%)'
                                                                }}></div>
                                                            )}
                                                            
                                        <h3 className="mb-1 font-semibold">{displayName}</h3>
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
                                                    {exerciseData.image && (
                                                        <a 
                                                            href={exerciseData.image} 
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
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Render a single exercise
                                    const ex = exerciseGroup.group[0];
                                    const exerciseData = getExerciseDetails(ex.exercise_db_id);
                                    const displayName = cleanExerciseName(ex.exercise_name || exerciseData?.name || 'Unnamed Exercise');
                                    
                                    return (
                                        <div key={ex.exercise_db_id || `ex-${groupIndex}`} className="p-3 bg-gray-100 rounded shadow dark:bg-gray-700">
                                            <h3 className="mb-1 font-semibold">{displayName}</h3>
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
                                                        {exerciseData.image && (
                                                            <a 
                                                                href={exerciseData.image} 
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
                                }
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkoutView;