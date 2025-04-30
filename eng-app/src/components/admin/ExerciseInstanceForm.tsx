import React, { useEffect, useState, useRef } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { ExerciseInstanceAdminData, SetType, ExerciseSet } from '../../types/adminTypes';
import { FiX, FiSearch, FiChevronDown, FiChevronUp, FiPlus, FiTrash } from 'react-icons/fi';
import { searchExercises, Exercise } from '../../utils/exerciseDatabase';

// --- Zod Schema for Exercise Instance --- 
// Define schema for ExerciseSet
const exerciseSetSchema = z.object({
    id: z.string().optional(),
    order: z.number().int().nonnegative(),
    type: z.nativeEnum(SetType),
    reps: z.string().trim().optional(),
    weight: z.string().trim().optional(),
    rest_seconds: z.number().int().nonnegative().optional(),
    duration: z.string().trim().optional()
});

// Note: exercise_db_id might need specific validation if fetched from wger
const exerciseInstanceSchema = z.object({
    exercise_name: z.string().min(1, 'Exercise name is required'),
    exercise_db_id: z.string().trim().optional().nullable(), // Wger ID (might be number depending on wger service)
    sets: z.string().trim().optional().nullable(),
    reps: z.string().trim().optional().nullable(),
    rest_period_seconds: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                             z.number().int().nonnegative().optional().nullable()),
    tempo: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    order_in_workout: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                              z.number().int().nonnegative().optional().nullable()),
    set_type: z.nativeEnum(SetType).optional().nullable(), // Keep for backward compatibility
    sets_data: z.array(exerciseSetSchema).optional().nullable() // New validation for sets_data
});

// Form data type (numbers as strings)
interface ExerciseInstanceFormData {
    exercise_name: string;
    exercise_db_id: string | null;
    sets: string | null;
    reps: string | null;
    rest_period_seconds: string | null;
    tempo: string | null;
    notes: string | null;
    order_in_workout: string | null;
    set_type: SetType | null; // Keep for backward compatibility
    sets_data: ExerciseSet[] | null; // New field for sets data
}

// Callback type for saving
type OnSaveExercise = (data: ExerciseInstanceAdminData) => void;

interface ExerciseInstanceFormProps {
    exercise?: ExerciseInstanceAdminData | null; // Data for editing
    onSave: OnSaveExercise;
    onCancel: () => void;
    // isSaving might be needed later if saving is async
}

const ExerciseInstanceForm: React.FC<ExerciseInstanceFormProps> = ({ exercise, onSave, onCancel }) => {
    // State for exercise search dropdown
    const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const methods = useForm<ExerciseInstanceFormData>({
        defaultValues: {
            exercise_name: exercise?.exercise_name || '',
            exercise_db_id: exercise?.exercise_db_id || '',
            sets: exercise?.sets || '',
            reps: exercise?.reps || '',
            rest_period_seconds: exercise?.rest_period_seconds?.toString() || '',
            tempo: exercise?.tempo || '',
            notes: exercise?.notes || '',
            order_in_workout: exercise?.order_in_workout?.toString() || '',
            set_type: exercise?.set_type || null,
            sets_data: exercise?.sets_data || []
        }
    });

    const { handleSubmit, reset, register, setValue, watch, formState: { errors }, setError: setFormError } = methods;
    
    const exerciseName = watch('exercise_name');
    const setsData = watch('sets_data') || [];

    // Handle search when query changes
    useEffect(() => {
        if (showExerciseDropdown) {
            setSearchResults(searchExercises(searchQuery));
        }
    }, [searchQuery, showExerciseDropdown]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExerciseDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        reset({ // Reset form if prop changes
            exercise_name: exercise?.exercise_name || '',
            exercise_db_id: exercise?.exercise_db_id || '',
            sets: exercise?.sets || '',
            reps: exercise?.reps || '',
            rest_period_seconds: exercise?.rest_period_seconds?.toString() || '',
            tempo: exercise?.tempo || '',
            notes: exercise?.notes || '',
            order_in_workout: exercise?.order_in_workout?.toString() || '',
            set_type: exercise?.set_type || null,
            sets_data: exercise?.sets_data || [],
        });
    }, [exercise, reset]);

    // Initialize sets when the component loads or when exercise or sets count changes
    useEffect(() => {
        if (!exercise?.sets_data?.length && exercise?.sets) {
            // If we have a sets count but no set data, generate the default sets
            const setCount = parseInt(exercise.sets, 10);
            if (!isNaN(setCount) && setCount > 0) {
                const generatedSets: ExerciseSet[] = Array.from({ length: setCount }, (_, i) => ({
                    order: i + 1,
                    type: exercise.set_type || SetType.REGULAR,
                    reps: exercise.reps || undefined,
                    rest_seconds: exercise.rest_period_seconds || undefined
                }));
                setValue('sets_data', generatedSets);
            }
        }
    }, [exercise, setValue]);

    const handleFormSubmit: SubmitHandler<ExerciseInstanceFormData> = (formData) => {
         // Clear previous errors
        Object.keys(formData).forEach(key => setFormError(key as keyof ExerciseInstanceFormData, {}));
        
        // Manual validation
        const validationResult = exerciseInstanceSchema.safeParse({
            ...formData,
            // Convert numeric strings back
            rest_period_seconds: formData.rest_period_seconds || undefined,
            order_in_workout: formData.order_in_workout || undefined,
            // Ensure sets_data is properly formatted
            sets_data: formData.sets_data && formData.sets_data.length > 0 
                ? formData.sets_data 
                : undefined
        });

        if (!validationResult.success) {
            validationResult.error.errors.forEach((err) => {
                if (err.path.length > 0) {
                     setFormError(err.path[0] as keyof ExerciseInstanceFormData, { 
                         type: 'manual', message: err.message 
                     });
                }
            });
            return; // Stop submission
        }

        // Explicitly map validated data to ensure null instead of undefined
        const saveData: ExerciseInstanceAdminData = { 
            id: exercise?.id, // Preserve existing ID if editing
            exercise_name: validationResult.data.exercise_name,
            exercise_db_id: validationResult.data.exercise_db_id ?? null,
            sets: validationResult.data.sets ?? null,
            reps: validationResult.data.reps ?? null,
            rest_period_seconds: validationResult.data.rest_period_seconds ?? null,
            tempo: validationResult.data.tempo ?? null,
            notes: validationResult.data.notes ?? null,
            order_in_workout: validationResult.data.order_in_workout ?? null,
            set_type: validationResult.data.set_type ?? null,
            sets_data: validationResult.data.sets_data ?? []
         };

        // Call onSave with the correctly typed data
        onSave(saveData);
    };
    
    const handleSelectExercise = (selectedExercise: Exercise) => {
        setValue('exercise_name', selectedExercise.name);
        setValue('exercise_db_id', selectedExercise.id);
        setSearchQuery('');
        setShowExerciseDropdown(false);
    };

    // Function to add a new set
    const handleAddSet = () => {
        const currentSets = [...setsData]; // Create a copy
        const newSet: ExerciseSet = {
            order: currentSets.length + 1,
            type: SetType.REGULAR,
            reps: watch('reps') || '',
            rest_seconds: watch('rest_period_seconds') 
                ? parseInt(watch('rest_period_seconds') || '0', 10) 
                : undefined
        };
        
        setValue('sets_data', [...currentSets, newSet]);
        // Update the sets count as well for backward compatibility
        setValue('sets', (currentSets.length + 1).toString());
    };

    // Function to remove a set
    const handleRemoveSet = (index: number) => {
        const currentSets = [...setsData]; // Create a copy
        currentSets.splice(index, 1);
        
        // Reorder the remaining sets
        const reorderedSets = currentSets.map((set, idx) => ({
            ...set,
            order: idx + 1
        }));
        
        setValue('sets_data', reorderedSets);
        // Update the sets count for backward compatibility
        setValue('sets', reorderedSets.length.toString());
    };

    // Function to update a set property
    const handleUpdateSet = (index: number, field: keyof ExerciseSet, value: string | number | SetType) => {
        const currentSets = [...setsData]; // Create a copy
        if (currentSets[index]) {
            currentSets[index] = {
                ...currentSets[index],
                [field]: value
            };
            setValue('sets_data', currentSets);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    {exercise ? 'Edit Exercise' : 'Add Exercise'}
                </h2>
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <FiX size={24} className="text-gray-500" />
                </button>
            </div>
            
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div ref={dropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Exercise Name <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowExerciseDropdown(true)}
                                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Search exercises..."
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <FiSearch className="text-gray-400" />
                            </div>
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                                onClick={() => setShowExerciseDropdown(!showExerciseDropdown)}
                            >
                                {showExerciseDropdown ? (
                                    <FiChevronUp className="text-gray-400" />
                                ) : (
                                    <FiChevronDown className="text-gray-400" />
                                )}
                            </button>
                        </div>
                        
                        {showExerciseDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg dark:bg-gray-800 max-h-60 overflow-auto">
                                {searchResults.length > 0 ? (
                                    <ul className="py-1">
                                        {searchResults.map((exercise) => (
                                            <li 
                                                key={exercise.id}
                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => handleSelectExercise(exercise)}
                                            >
                                                <div className="font-medium">{exercise.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {exercise.primaryMuscle} {exercise.secondaryMuscles.length > 0 && `• ${exercise.secondaryMuscles.join(', ')}`}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        No exercises found
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {exerciseName && (
                            <div className="mt-1 py-1 px-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">
                                Selected: <span className="font-medium">{exerciseName}</span>
                            </div>
                        )}
                        
                        {errors.exercise_name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.exercise_name.message}</p>
                        )}
                        
                        <input type="hidden" {...register('exercise_name')} />
                        <input type="hidden" {...register('exercise_db_id')} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Sets
                            </label>
                            <input
                                type="text"
                                {...register('sets')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="e.g., 3-4"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Reps
                            </label>
                            <input
                                type="text"
                                {...register('reps')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="e.g., 8-12"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Default Set Type
                        </label>
                        <select
                            {...register('set_type')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select a set type</option>
                            <option value={SetType.REGULAR}>Regular</option>
                            <option value={SetType.WARM_UP}>Warm-up</option>
                            <option value={SetType.DROP_SET}>Drop Set</option>
                            <option value={SetType.FAILURE}>To Failure</option>
                        </select>
                        {errors.set_type && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.set_type.message}</p>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Rest Period (seconds)
                            </label>
                            <input
                                type="number"
                                min="0"
                                {...register('rest_period_seconds')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="e.g., 60"
                            />
                            {errors.rest_period_seconds && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.rest_period_seconds.message}</p>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tempo
                            </label>
                            <input
                                type="text"
                                {...register('tempo')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="e.g., 3-1-3"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Additional instructions or cues..."
                        ></textarea>
                    </div>

                    {/* Individual Sets Manager */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Configure Individual Sets
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddSet}
                                className="flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                <FiPlus className="mr-1" /> Add Set
                            </button>
                        </div>
                        
                        {setsData.length === 0 ? (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 text-center rounded border border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    No sets defined. Click "Add Set" to create individual sets with specific types.
                                </p>
                            </div>
                        ) : (
                            <div className="border dark:border-gray-700 rounded-md overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">#</th>
                                            <th className="py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">Type</th>
                                            <th className="py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">Reps</th>
                                            <th className="py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">Weight</th>
                                            <th className="py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">Rest</th>
                                            <th className="py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {setsData.map((set, index) => (
                                            <tr key={`set-${index}`} className="bg-white dark:bg-gray-800">
                                                <td className="py-2 px-2 text-sm text-gray-700 dark:text-gray-300 text-center">{index + 1}</td>
                                                <td className="py-2 px-2">
                                                    <select
                                                        value={set.type}
                                                        onChange={(e) => handleUpdateSet(index, 'type', e.target.value as SetType)}
                                                        className="w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    >
                                                        <option value={SetType.REGULAR}>Regular</option>
                                                        <option value={SetType.WARM_UP}>Warm-up</option>
                                                        <option value={SetType.DROP_SET}>Drop Set</option>
                                                        <option value={SetType.FAILURE}>To Failure</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="text"
                                                        value={set.reps || ''}
                                                        onChange={(e) => handleUpdateSet(index, 'reps', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        placeholder="e.g., 8-12"
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="text"
                                                        value={set.weight || ''}
                                                        onChange={(e) => handleUpdateSet(index, 'weight', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        placeholder="e.g., 60kg"
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="number"
                                                        value={set.rest_seconds || ''}
                                                        onChange={(e) => handleUpdateSet(index, 'rest_seconds', parseInt(e.target.value, 10) || 0)}
                                                        className="w-full px-2 py-1 text-sm text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        placeholder="60"
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSet(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                        title="Remove Set"
                                                    >
                                                        <FiTrash size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Save Exercise
                        </button>
                    </div>

                    {/* Hidden field for workout ordering - typically auto-generated */}
                    <input type="hidden" {...register("order_in_workout")} />
                </form>
            </FormProvider>
        </div>
    );
};

export default ExerciseInstanceForm; 