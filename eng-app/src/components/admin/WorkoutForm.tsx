import React, { useEffect, useState, useRef } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { WorkoutAdminData, ExerciseInstanceAdminData } from '../../types/adminTypes';
import { searchExercises, Exercise } from '../../utils/exerciseDatabase';
import { FiTrash2, FiMove } from 'react-icons/fi';
import { useDrop } from 'react-dnd';

// Define Zod schema for workout form
const workoutSchema = z.object({
    name: z.string().min(1, 'Workout name is required'),
    description: z.string().trim().optional().nullable(),
    week_number: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                         z.number().int().positive('Week must be positive').optional().nullable()),
    day_of_week: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                         z.number().int().min(1).max(7, 'Day must be 1-7').optional().nullable()),
    order_in_program: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                              z.number().int().nonnegative('Order must be non-negative').optional().nullable()),
});

// Type for form data - needs conversion for number inputs
interface WorkoutFormData {
    name: string;
    description: string | null;
    week_number: string | null;
    day_of_week: string | null;
    order_in_program: string | null;
}

// Update OnSaveWorkout type to potentially include exercises
type OnSaveWorkout = (
    workoutData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'>,
    exercises: ExerciseInstanceAdminData[],
    workoutId?: string
) => Promise<void>;

interface WorkoutFormProps {
    workout?: WorkoutAdminData | null;
    onSave: OnSaveWorkout;
    onCancel: () => void;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({ workout, onSave: onSaveWorkoutProp, onCancel }) => {
    // State for managing form and exercises
    const [exercises, setExercises] = useState<ExerciseInstanceAdminData[]>([]);
    const [searchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const [selectedCategory] = useState<string | null>(null);
    const [selectedExerciseDetails, setSelectedExerciseDetails] = useState<ExerciseInstanceAdminData | null>(null);
    
    // Drag state management
    const dragExercise = useRef<Exercise | null>(null);

    const methods = useForm<WorkoutFormData>({
        defaultValues: {
            name: workout?.name || '',
            description: workout?.description || '',
            week_number: workout?.week_number?.toString() || '',
            day_of_week: workout?.day_of_week?.toString() || '',
            order_in_program: workout?.order_in_program?.toString() || ''
        }
    });

    const { handleSubmit, reset, setError: setFormError } = methods;

    // Reset form and populate exercises when workout prop changes
    useEffect(() => {
        reset({
            name: workout?.name || '',
            description: workout?.description || '',
            week_number: workout?.week_number?.toString() || '',
            day_of_week: workout?.day_of_week?.toString() || '',
            order_in_program: workout?.order_in_program?.toString() || ''
        });
        // Set exercises from the prop when editing
        setExercises(workout?.exercise_instances || []); 
    }, [workout, reset]);
    
    // Update search results when query changes
    useEffect(() => {
        const results = searchExercises(searchQuery);
        
        // Filter by category if one is selected
        const filteredResults = selectedCategory
            ? results.filter(ex => ex.category === selectedCategory)
            : results;
            
        setSearchResults(filteredResults);
    }, [searchQuery, selectedCategory]);

    const handleWorkoutFormSubmit: SubmitHandler<WorkoutFormData> = (formData) => {
         // Clear previous errors
        Object.keys(formData).forEach(key => setFormError(key as keyof WorkoutFormData, {}));

        // Validate manually
        const validationResult = workoutSchema.safeParse({
            ...formData,
            // Convert numeric strings back for validation
            week_number: formData.week_number || undefined,
            day_of_week: formData.day_of_week || undefined,
            order_in_program: formData.order_in_program || undefined,
        });

        if (!validationResult.success) {
            validationResult.error.errors.forEach((err) => {
                if (err.path.length > 0) {
                     setFormError(err.path[0] as keyof WorkoutFormData, { 
                         type: 'manual', 
                         message: err.message 
                     });
                }
            });
            return; // Stop submission
        }
        
        // Explicitly map validated data to ensure null instead of undefined for optional fields
        const saveData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'> = {
            name: validationResult.data.name,
            description: validationResult.data.description ?? null,
            week_number: validationResult.data.week_number ?? null,
            day_of_week: validationResult.data.day_of_week ?? null,
            order_in_program: validationResult.data.order_in_program ?? null,
        };

        // Call the onSave prop, passing back the workout details AND the current exercises state
        onSaveWorkoutProp(saveData, exercises, workout?.id); 
    };

    // --- Exercise Management Handlers ---
    const handleAddExercise = (exercise: Exercise) => {
        // Create a new exercise instance with default values
        const newExercise: ExerciseInstanceAdminData = {
            exercise_name: exercise.name,
            exercise_db_id: exercise.id,
            sets: "3",
            reps: "10",
            rest_period_seconds: 60,
            tempo: null,
            notes: null,
            order_in_workout: exercises.length
        };
        
        setExercises(prev => [...prev, newExercise]);
    };

    const handleRemoveExercise = (index: number) => {
        if (window.confirm('Remove this exercise from the workout?')) {
            setExercises(prev => prev.filter((_, i) => i !== index));
            
            // If we were editing this exercise, close the details panel
            if (selectedExerciseDetails && selectedExerciseDetails === exercises[index]) {
                setSelectedExerciseDetails(null);
            }
        }
    };

    // Add drop zone to the workout exercises list
    const [{ isOver }, dropRef] = useDrop(() => ({
        accept: 'EXERCISE',
        drop: () => {
            if (dragExercise.current) {
                handleAddExercise(dragExercise.current);
                dragExercise.current = null;
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver()
        })
    }));

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleWorkoutFormSubmit)} className="space-y-4">
                {/* Form fields with register and error handling */}
                {/* ... */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column: Search and add exercises */}
                    <div className="space-y-4">
                        {/* Search and filter UI */}
                        {/* ... */}
                    </div>
                    
                    {/* Right column: Current workout exercises */}
                    <div 
                        className={`p-4 border rounded-md min-h-[300px] ${isOver ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'}`}
                        ref={(node) => {
                            if (typeof dropRef === 'function') {
                                dropRef(node);
                            }
                        }}
                    >
                        <h3 className="font-medium text-lg mb-3 dark:text-white">Selected Exercises</h3>
                        
                        {exercises.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                                <FiMove className="text-3xl mb-2" />
                                <p>Drag exercises from the left to add</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {exercises.map((exerciseItem, index) => {
                                    const exercise = searchResults.find(e => e.id === exerciseItem.exercise_db_id);
                                    if (!exercise) return null;
                                    
                                    return (
                                        <div key={`${exercise.id}-${index}`} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow dark:border dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-medium dark:text-white">{exercise.name}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExercise(index)}
                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-300 mb-1">Sets</label>
                                                    <input
                                                        type="text"
                                                        value={exerciseItem.sets || ""}
                                                        onChange={(e) => {
                                                            const newExercises = [...exercises];
                                                            newExercises[index] = { ...newExercises[index], sets: e.target.value };
                                                            setExercises(newExercises);
                                                        }}
                                                        className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-300 mb-1">Reps</label>
                                                    <input
                                                        type="text"
                                                        value={exerciseItem.reps || ""}
                                                        onChange={(e) => {
                                                            const newExercises = [...exercises];
                                                            newExercises[index] = { ...newExercises[index], reps: e.target.value };
                                                            setExercises(newExercises);
                                                        }}
                                                        className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-300 mb-1">Rest (sec)</label>
                                                    <input
                                                        type="number"
                                                        value={exerciseItem.rest_period_seconds || 0}
                                                        onChange={(e) => {
                                                            const newExercises = [...exercises];
                                                            newExercises[index] = { 
                                                                ...newExercises[index], 
                                                                rest_period_seconds: parseInt(e.target.value, 10) || 0 
                                                            };
                                                            setExercises(newExercises);
                                                        }}
                                                        className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        {workout ? 'Update Workout' : 'Create Workout'}
                    </button>
                </div>
            </form>
        </FormProvider>
    );
};

export default WorkoutForm; 