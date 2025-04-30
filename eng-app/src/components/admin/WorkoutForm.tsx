import React, { useEffect, useState, useRef } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { WorkoutAdminData, ExerciseInstanceAdminData, SetType } from '../../types/adminTypes';
import { searchExercises, Exercise } from '../../utils/exerciseDatabase';
import { FiTrash2, FiMove, FiSearch, FiPlus } from 'react-icons/fi';
import { useDrop } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ExerciseInstanceForm from './ExerciseInstanceForm';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const [selectedCategory] = useState<string | null>(null);
    const [selectedExerciseDetails, setSelectedExerciseDetails] = useState<ExerciseInstanceAdminData | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
    
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

    const { handleSubmit, reset, setError: setFormError, register, watch } = methods;

    // Watch day_of_week to display day name in header
    const dayOfWeek = watch('day_of_week');
    
    // Get day name
    const getDayName = (day: string | null): string => {
        if (!day) return '';
        
        const dayMap: Record<string, string> = {
            '1': 'Monday',
            '2': 'Tuesday',
            '3': 'Wednesday',
            '4': 'Thursday',
            '5': 'Friday',
            '6': 'Saturday',
            '7': 'Sunday'
        };
        
        return dayMap[day] || '';
    };
    
    // Helper function to get a friendly display name for set types
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
        // Create a new exercise instance with basic defaults
        const defaultSets = 3; // Default to 3 sets
        
        // Create individual set data
        const setsData = Array.from({ length: defaultSets }, (_, i) => ({
            order: i + 1,
            type: SetType.REGULAR,
            reps: '8-12', // Default rep range
            rest_seconds: 60 // Default rest period
        }));
        
        const newExercise: ExerciseInstanceAdminData = {
            exercise_db_id: exercise.id,
            exercise_name: exercise.name,
            sets: defaultSets.toString(), // Default to 3 sets
            reps: "8-12", // Default rep range
            rest_period_seconds: 60, // Default 60 seconds rest
            tempo: null,
            notes: null,
            order_in_workout: exercises.length + 1,
            set_type: SetType.REGULAR, // Default to regular set type for backward compatibility
            sets_data: setsData // Add the individual set configurations
        };
        
        setExercises(prevExercises => [...prevExercises, newExercise]);
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

    // Update exercise details
    const handleExerciseDetailChange = (index: number, field: keyof ExerciseInstanceAdminData, value: any) => {
        setExercises(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
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

    // Function to add a set to an exercise
    const handleAddSet = (exerciseIndex: number) => {
        const exercise = exercises[exerciseIndex];
        // Get current sets count (for backward compatibility)
        const currentSets = parseInt(exercise.sets || "0", 10);
        // Create the updated count
        const newSetCount = currentSets + 1;
        
        // First update the sets count for backward compatibility
        handleExerciseDetailChange(exerciseIndex, 'sets', newSetCount.toString());
        
        // Now add a new set to the sets_data array
        const currentSetsData = [...(exercise.sets_data || [])];
        const newSet = {
            order: currentSetsData.length + 1,
            type: exercise.set_type || SetType.REGULAR, // Inherit the exercise's default set type
            reps: exercise.reps || '', // Inherit the exercise's default reps
            rest_seconds: exercise.rest_period_seconds // Inherit the exercise's default rest period
        };
        
        const updatedSetsData = [...currentSetsData, newSet];
        handleExerciseDetailChange(exerciseIndex, 'sets_data', updatedSetsData);
    };

    // Function to update a specific set type
    const handleSetTypeChange = (exerciseIndex: number, setIndex: number, newType: SetType) => {
        const exercise = exercises[exerciseIndex];
        if (!exercise.sets_data) return;
        
        const updatedSetsData = [...exercise.sets_data];
        if (updatedSetsData[setIndex]) {
            updatedSetsData[setIndex] = {
                ...updatedSetsData[setIndex],
                type: newType
            };
            handleExerciseDetailChange(exerciseIndex, 'sets_data', updatedSetsData);
        }
    };

    // Generate exercise set rows for the table
    const renderExerciseSets = (exercise: ExerciseInstanceAdminData, index: number) => {
        const numSets = parseInt(exercise.sets || "0", 10);
        const rows = [];
        
        // If we have sets_data with individual set configurations, use them
        if (exercise.sets_data && exercise.sets_data.length > 0) {
            // Show each configured set
            for (let i = 0; i < exercise.sets_data.length; i++) {
                const set = exercise.sets_data[i];
                rows.push(
                    <tr key={`set-${index}-${i}`} className="border-b dark:border-gray-700 dark:text-white">
                        <td className="px-4 py-2 text-center ">{i + 1}</td>
                        <td className="px-4 py-2 text-center">
                            <select
                                value={set.type}
                                onChange={(e) => handleSetTypeChange(index, i, e.target.value as SetType)}
                                className="w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value={SetType.REGULAR}>Regular</option>
                                <option value={SetType.WARM_UP}>Warm-up</option>
                                <option value={SetType.DROP_SET}>Drop Set</option>
                                <option value={SetType.FAILURE}>To Failure</option>
                            </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                            <input 
                                type="text" 
                                defaultValue={set.reps || ""}
                                onChange={(e) => {
                                    const updatedSetsData = [...exercise.sets_data!];
                                    updatedSetsData[i] = { ...updatedSetsData[i], reps: e.target.value };
                                    handleExerciseDetailChange(index, 'sets_data', updatedSetsData);
                                }}
                                className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none"
                            />
                        </td>
                        <td className="px-4 py-2 text-center">
                            <input 
                                type="text" 
                                defaultValue={set.rest_seconds ? `${set.rest_seconds}s` : ""}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    const restSeconds = value ? parseInt(value, 10) : undefined;
                                    const updatedSetsData = [...exercise.sets_data!];
                                    updatedSetsData[i] = { ...updatedSetsData[i], rest_seconds: restSeconds };
                                    handleExerciseDetailChange(index, 'sets_data', updatedSetsData);
                                }}
                                className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none"
                                placeholder="60s"
                            />
                        </td>
                    </tr>
                );
            }
        } else {
            // Fall back to the legacy behavior for exercises without sets_data
            for (let i = 0; i < numSets; i++) {
                rows.push(
                    <tr key={`set-${index}-${i}`} className="border-b dark:border-gray-700">
                        <td className="px-4 py-2 text-center">{i + 1}</td>
                        <td className="px-4 py-2 text-center">
                            {exercise.set_type ? (
                                <span className={`inline-block px-2 py-1 text-xs rounded ${
                                    exercise.set_type === SetType.WARM_UP ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 
                                    exercise.set_type === SetType.DROP_SET ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 
                                    exercise.set_type === SetType.FAILURE ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    {getSetTypeName(exercise.set_type)}
                                </span>
                            ) : (
                                <span className="text-xs text-gray-400">Default</span>
                            )}
                        </td>
                        <td className="px-4 py-2 text-center">
                            <input 
                                type="text" 
                                defaultValue="00:01:00"
                                className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none"
                            />
                        </td>
                        <td className="px-4 py-2 text-center">
                            <input 
                                type="text" 
                                defaultValue="01:00"
                                className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none"
                            />
                        </td>
                    </tr>
                );
            }
        }
        
        return rows;
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow dark:bg-gray-800">
            {/* Workout Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <div className="flex items-center">
                    <h2 className="text-lg font-semibold dark:text-white">
                        {watch('name') || 'Untitled Workout'} 
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                            {getDayName(dayOfWeek)} {watch('week_number') ? `- Week ${watch('week_number')}` : ''}
                        </span>
                    </h2>
                </div>
                <div className="flex space-x-2">
                    <button 
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onClick={handleSubmit(handleWorkoutFormSubmit)}
                        className="px-3 py-1.5 text-sm bg-indigo-600 rounded-md text-white hover:bg-indigo-700"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
            
            <div className="flex flex-grow overflow-hidden">
                {/* Left side - Exercises Panel */}
                <div className="flex flex-col w-1/4 overflow-hidden border-r dark:border-gray-700">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h3 className="mb-3 font-semibold dark:text-white">Exercises</h3>
                        <div className="flex items-center px-3 py-2 bg-gray-100 rounded-md dark:bg-gray-700">
                            <FiSearch className="mr-2 text-gray-500 dark:text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for exercises..."
                                className="w-full bg-transparent focus:outline-none dark:text-white"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-grow p-2 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                            {searchResults.map((exercise) => (
                                <div 
                                    key={exercise.id}
                                    className="p-2 bg-white rounded shadow cursor-pointer dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                    onClick={() => handleAddExercise(exercise)}
                                >
                                    <div className="flex items-center justify-center h-20 mb-2 bg-gray-200 rounded dark:bg-gray-600">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Exercise Image</span>
                                    </div>
                                    <p className="text-sm font-medium truncate dark:text-white">{exercise.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Right side - Workout Form */}
                <div className="flex flex-col flex-grow overflow-hidden">
                    <div className="flex-shrink-0 p-4 border-b dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Workout Name *
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    {...register('name')}
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g., Full Body - Post Comp"
                                />
                            </div>
                            <div>
                                <label htmlFor="day_of_week" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Day of Week
                                </label>
                                <select
                                    id="day_of_week"
                                    {...register('day_of_week')}
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Select day</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                    <option value="7">Sunday</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Exercise List */}
                    <div ref={dropRef} className="flex-grow p-4 space-y-6 overflow-y-auto">
                        {exercises.map((exercise, index) => (
                            <div key={index} className="overflow-hidden bg-white border rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                                {/* Exercise Header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-200 rounded dark:bg-gray-600">
                                            {/* Exercise Icon */}
                                        </div>
                                        <h3 className="font-medium dark:text-white">{exercise.exercise_name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveExerciseIndex(activeExerciseIndex === index ? null : index)}
                                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            {activeExerciseIndex === index ? 'Close' : 'Edit'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExercise(index)}
                                            className="p-1 text-red-500 hover:text-red-700"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                                
                                {activeExerciseIndex === index && (
                                    <div className="border-t dark:border-gray-700">
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`each-side-${index}`}
                                                            className="text-indigo-600 rounded focus:ring-indigo-500"
                                                        />
                                                        <label htmlFor={`each-side-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                                                            Each Side
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">Tempo</span>
                                                        <input 
                                                            type="text" 
                                                            className="w-20 px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            placeholder="e.g., 2:0:2"
                                                            value={exercise.tempo || ''}
                                                            onChange={(e) => handleExerciseDetailChange(index, 'tempo', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">Set Type</span>
                                                        <select
                                                            className="px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            value={exercise.set_type || ''}
                                                            onChange={(e) => handleExerciseDetailChange(index, 'set_type', e.target.value)}
                                                        >
                                                            <option value="">Default</option>
                                                            <option value={SetType.REGULAR}>Regular</option>
                                                            <option value={SetType.WARM_UP}>Warm-up</option>
                                                            <option value={SetType.DROP_SET}>Drop Set</option>
                                                            <option value={SetType.FAILURE}>To Failure</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleAddSet(index)}
                                                    className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                                >
                                                    <FiPlus className="mr-1" /> Add Set
                                                </button>
                                            </div>
                                            
                                            <div className="overflow-hidden border rounded-md dark:border-gray-700">
                                                <table className="min-w-full">
                                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                                        <tr>
                                                            <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Set</th>
                                                            <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Type</th>
                                                            <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Time/Sets</th>
                                                            <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Rest</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {renderExerciseSets(exercise, index)}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            <div className="mt-4">
                                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Add note for this exercise
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    placeholder="Add a note..."
                                                    value={exercise.notes || ''}
                                                    onChange={(e) => handleExerciseDetailChange(index, 'notes', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {exercises.length === 0 && (
                            <div className="py-8 text-center">
                                <p className="text-gray-500 dark:text-gray-400">
                                    No exercises added yet. Select exercises from the left panel or drag them here.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Add Exercise Button */}
                    <div className="p-4 border-t dark:border-gray-700">
                        <button 
                            type="button"
                            onClick={() => {}}
                            className="flex items-center justify-center w-full py-2 font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300"
                        >
                            <FiPlus className="mr-2" /> Add Exercise
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkoutForm; 