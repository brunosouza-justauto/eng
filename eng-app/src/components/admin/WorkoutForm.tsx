import React, { useEffect, useState, useCallback } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { WorkoutAdminData, ExerciseInstanceAdminData, SetType } from '../../types/adminTypes';
import { FiTrash2, FiMove, FiSearch, FiPlus, FiX, FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi';
import { useDrop, useDrag } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ExerciseInstanceForm from './ExerciseInstanceForm';
import { 
  fetchExercises, 
  fetchMuscleGroups, 
  Exercise,
  HeyGainzMuscle as Category 
} from '../../utils/exerciseAPI';

// Define Zod schema for workout form
const workoutSchema = z.object({
    name: z.string().min(1, 'Workout name is required'),
    description: z.string().trim().optional().nullable(),
    week_number: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                         z.number().int().positive('Week must be positive').optional().nullable()),
    day_of_week: z.preprocess(
                        (val) => val ? parseInt(String(val), 10) : undefined, 
                        z.number().int().min(1).max(7, 'Day must be 1-7')
                          .refine(val => val !== undefined, 'Day of week is required')),
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

// We'll use the Exercise type directly from exerciseAPI.ts

// Add new item types for DnD
const ItemTypes = {
    SEARCH_EXERCISE: 'SEARCH_EXERCISE',
    WORKOUT_EXERCISE: 'WORKOUT_EXERCISE'
};

// Create a draggable exercise item component (search panel exercises)
const DraggableExerciseItem = ({ exercise, onAddExercise }: { exercise: Exercise, onAddExercise: (exercise: Exercise) => void }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.SEARCH_EXERCISE, // Update this to use the search exercise type
        item: exercise,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div 
            ref={(node) => drag(node as HTMLDivElement)}
            className={`p-2 bg-white rounded shadow cursor-pointer dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                isDragging ? 'opacity-50' : 'opacity-100'
            }`}
            onClick={() => onAddExercise(exercise)}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <div className="flex items-center justify-center h-20 mb-2 bg-gray-200 rounded dark:bg-gray-600">
                {exercise.image ? (
                    <img 
                        src={exercise.image} 
                        alt={exercise.name} 
                        className="object-cover w-full h-full rounded"
                        onError={(e) => {
                            console.error('Image failed to load:', exercise.image);
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                                const fallback = document.createElement('span');
                                fallback.className = "text-xs text-gray-500 dark:text-gray-400";
                                fallback.textContent = "No Image";
                                parent.appendChild(fallback);
                            }
                        }}
                    />
                ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">No Image</span>
                )}
            </div>
            <p className="text-sm font-medium truncate dark:text-white">
                {exercise.name || `Exercise #${exercise.id}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {exercise.category || 'Uncategorized'} 
                {exercise.muscles && exercise.muscles.length > 0 && (
                    <span className="ml-1">- {exercise.muscles[0]}</span>
                )}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                ID: {exercise.id}
            </p>
        </div>
    );
};

// Create a component for the drop zone between exercises
const ExerciseDropZone = ({ 
    onDrop, 
    index,
    isOver
}: { 
    onDrop: (item: any, targetIndex: number) => void, 
    index: number,
    isOver: boolean
}) => {
    const [{ isOverCurrent }, drop] = useDrop(() => ({
        accept: [ItemTypes.SEARCH_EXERCISE, ItemTypes.WORKOUT_EXERCISE],
        drop: (item) => {
            onDrop(item, index);
            return { dropped: true };
        },
        collect: monitor => ({
            isOverCurrent: !!monitor.isOver({ shallow: true }),
        }),
    }));

    return (
        <div 
            ref={(node) => drop(node as HTMLDivElement)}
            className={`h-2 mx-1 transition-all duration-200 rounded-full ${
                isOverCurrent || isOver ? 'bg-indigo-300 dark:bg-indigo-600 h-6 mb-2 mt-2' : 'bg-transparent'
            }`}
        />
    );
};

// Create a draggable component for existing workout exercises
const DraggableWorkoutExercise = ({ 
    exercise, 
    index, 
    activeExerciseIndex,
    setActiveExerciseIndex,
    handleRemoveExercise,
    renderExerciseDetails
}: { 
    exercise: ExerciseInstanceAdminData, 
    index: number,
    activeExerciseIndex: number | null,
    setActiveExerciseIndex: (index: number | null) => void,
    handleRemoveExercise: (index: number) => void,
    renderExerciseDetails: (exercise: ExerciseInstanceAdminData, index: number) => React.ReactNode
}) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.WORKOUT_EXERCISE,
        item: { type: ItemTypes.WORKOUT_EXERCISE, exerciseIndex: index, exercise },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div 
            ref={(node) => drag(node as HTMLDivElement)}
            className={`overflow-hidden bg-white border rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 
                ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            style={{ cursor: 'move' }}
        >
            {/* Exercise Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
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
            
            {activeExerciseIndex === index && renderExerciseDetails(exercise, index)}
        </div>
    );
};

// Add CSS constants for drop zone styling
const DROP_ZONE_BASE_CLASS = "flex-grow p-4 space-y-6 overflow-y-auto transition-all duration-300 border-2 border-dashed border-transparent";
const DROP_ZONE_ACTIVE_CLASS = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20";
const DROP_ZONE_HOVER_CLASS = "border-indigo-600 bg-indigo-100 dark:bg-indigo-800 dark:bg-opacity-30 scale-[1.01] shadow-md";

const WorkoutForm: React.FC<WorkoutFormProps> = ({ workout, onSave: onSaveWorkoutProp, onCancel }) => {
    // State for managing form and exercises
    const [exercises, setExercises] = useState<ExerciseInstanceAdminData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedExerciseDetails, setSelectedExerciseDetails] = useState<ExerciseInstanceAdminData | null>(null);
    const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [highlightSearchPanel, setHighlightSearchPanel] = useState(false);
    
    // Constants for pagination
    const RESULTS_PER_PAGE = 20;
    
    // Add new state for deletion confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingExerciseIndex, setDeletingExerciseIndex] = useState<number | null>(null);
    const [deletingSetIndex, setDeletingSetIndex] = useState<number | null>(null);
    
    // Add state to track if we're hovering over any drop zone
    const [hoveringIndex, setHoveringIndex] = useState<number | null>(null);

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
    
    // Fetch categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categoriesData = await fetchMuscleGroups();
                setCategories(categoriesData);
            } catch (err) {
                console.error("Error loading exercise categories:", err);
                setError("Failed to load exercise categories. Please try again later.");
            }
        };
        
        loadCategories();
    }, []);
    
    // Reset form and populate exercises when workout prop changes
    useEffect(() => {
        reset({
            name: workout?.name || '',
            description: workout?.description || '',
            week_number: workout?.week_number?.toString() || '',
            day_of_week: workout?.day_of_week?.toString() || '',
            order_in_program: workout?.order_in_program?.toString() || ''
        });
        
        // Set exercises from the prop when editing, but ensure sets_data is properly initialized
        if (workout?.exercise_instances) {
            const initializedExercises = workout.exercise_instances.map(exercise => {
                // If the exercise doesn't have sets_data but has a sets count, initialize sets_data
                if ((!exercise.sets_data || exercise.sets_data.length === 0) && exercise.sets) {
                    const numSets = parseInt(exercise.sets, 10);
                    // Only initialize if the sets count is reasonable (prevent rendering hundreds)
                    const safeNumSets = Math.min(numSets, 10); // Cap at 10 sets for safety
                    
                    // Create properly initialized sets_data array
                    const newSetsData = Array.from({ length: safeNumSets }, (_, i) => ({
                        order: i + 1,
                        type: exercise.set_type || SetType.REGULAR,
                        reps: exercise.reps || '',
                        rest_seconds: exercise.rest_period_seconds || 60
                    }));
                    
                    return {
                        ...exercise,
                        sets_data: newSetsData
                    };
                }
                return exercise;
            });
            
            setExercises(initializedExercises);
        } else {
            setExercises([]);
        }
    }, [workout, reset]);
    
    // Search exercises with debounce
    useEffect(() => {
        // Only search if query is provided or a category is selected
        if (!searchQuery && selectedCategory === null) {
            // Load initial exercises without specific search
            const timer = setTimeout(() => {
                searchExercises();
            }, 500);
            return () => clearTimeout(timer);
        }
        
        const timer = setTimeout(() => {
            searchExercises();
        }, 500);
        
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, page]);
    
    // Function to search exercises from API
    const searchExercises = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('Searching exercises with parameters:', {
                query: searchQuery,
                category: selectedCategory,
                page: page,
                perPage: RESULTS_PER_PAGE
            });
            
            const response = await fetchExercises(
                page,
                searchQuery, 
                selectedCategory,
                RESULTS_PER_PAGE
            );
            
            console.log('Search results received:', {
                count: response.count,
                hasNext: response.next !== null,
                results: response.results.length
            });
            
            if (response.results.length === 0) {
                console.warn('No exercise results found');
            } else {
                console.log('First result sample:', response.results[0]);
            }
            
            setSearchResults(response.results as Exercise[]);
            setTotalResults(response.count || 0);
            setHasMore(response.next !== null);
        } catch (err) {
            console.error("Error searching exercises:", err);
            setError("Failed to search exercises. Please try again later.");
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedCategory, page]);
    
    // Initial load of exercises
    useEffect(() => {
        const loadInitialExercises = async () => {
            setIsLoading(true);
            try {
                // Load first page of exercises without filters on component mount
                const response = await fetchExercises(
                    1, // First page 
                    "", // No search term
                    null, // No category filter
                    RESULTS_PER_PAGE
                );
                
                setSearchResults(response.results as Exercise[]);
                setTotalResults(response.count);
                setHasMore(response.next !== null);
            } catch (err) {
                console.error("Error loading initial exercises:", err);
                setError("Failed to load exercises. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        
        loadInitialExercises();
    }, []);
    
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

    const handleWorkoutFormSubmit: SubmitHandler<WorkoutFormData> = (formData) => {
         // Clear previous errors
        Object.keys(formData).forEach(key => setFormError(key as keyof WorkoutFormData, {}));

        // Add specific check for day_of_week
        if (!formData.day_of_week) {
            setFormError('day_of_week', {
                type: 'manual',
                message: 'Day of week is required'
            });
            return; // Stop submission
        }

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
        
        // Add console log to debug values being sent
        console.log('Saving workout with day_of_week:', validationResult.data.day_of_week);
        
        // Explicitly map validated data to ensure null instead of undefined for optional fields
        const saveData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'> = {
            name: validationResult.data.name,
            description: validationResult.data.description ?? null,
            week_number: validationResult.data.week_number ?? null,
            day_of_week: validationResult.data.day_of_week, // No null fallback for required field
            order_in_program: validationResult.data.order_in_program ?? null,
        };

        // Call the onSave prop, passing back the workout details AND the current exercises state
        onSaveWorkoutProp(saveData, exercises, workout?.id); 
    };

    // --- Exercise Management Handlers ---
    const handleAddExercise = (exercise: Exercise) => {
        // Create a new exercise instance with NO default sets
        const newExercise: ExerciseInstanceAdminData = {
            exercise_db_id: exercise.id,
            exercise_name: exercise.name,
            sets: "0", // Changed from 3 to 0 default sets
            reps: "10", // Default rep range
            rest_period_seconds: 60, // Default 60 seconds rest
            tempo: null,
            notes: null,
            order_in_workout: exercises.length + 1,
            set_type: SetType.REGULAR, // Default to regular set type for backward compatibility
            sets_data: [] // Empty array instead of pre-defined sets
        };
        
        // Add the exercise
        setExercises(prevExercises => [...prevExercises, newExercise]);
        
        // Automatically set this new exercise as active (expanded)
        setActiveExerciseIndex(exercises.length);
    };

    const handleRemoveExercise = (index: number) => {
        setDeletingExerciseIndex(index);
        setDeletingSetIndex(null);
        setShowDeleteConfirm(true);
    };

    // Create a function to confirm exercise deletion
    const confirmExerciseDeletion = () => {
        if (deletingExerciseIndex !== null) {
            setExercises(prev => prev.filter((_, i) => i !== deletingExerciseIndex));
            
            // If we were editing this exercise, close the details panel
            if (selectedExerciseDetails && selectedExerciseDetails === exercises[deletingExerciseIndex]) {
                setSelectedExerciseDetails(null);
            }
        }
        setShowDeleteConfirm(false);
    };

    // Update exercise details with proper typing to include undefined
    const handleExerciseDetailChange = (
        index: number, 
        field: keyof ExerciseInstanceAdminData, 
        value: string | number | null | boolean | string[] | object[] | undefined
    ) => {
        setExercises(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Update the drop functionality
    const [{ isOver }, mainDropRef] = useDrop(() => ({
        accept: [ItemTypes.SEARCH_EXERCISE, ItemTypes.WORKOUT_EXERCISE],
        drop: (item: any, monitor) => {
            // Only process drops directly on the container (not on nested drop targets)
            if (monitor.didDrop()) return;
            
            if (item.type === ItemTypes.WORKOUT_EXERCISE) {
                // Handle exercise reordering - move to the end
                handleMoveExercise(item.exerciseIndex, exercises.length);
            } else {
                // This is a new exercise from search
                handleAddExercise(item);
            }
            return { dropped: true };
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver({ shallow: true }),
        }),
    }));

    // Handler for dropping items between exercises
    const handleExerciseDrop = (item: any, targetIndex: number) => {
        if (item.type === ItemTypes.WORKOUT_EXERCISE) {
            // This is an existing exercise being reordered
            const sourceIndex = item.exerciseIndex;
            
            // Don't do anything if dropped on its own spot or the spot right after it
            if (sourceIndex === targetIndex || sourceIndex + 1 === targetIndex) {
                return;
            }
            
            // Reorder exercises
            handleMoveExercise(sourceIndex, targetIndex);
        } else {
            // This is a new exercise from the search panel
            handleAddExerciseAt(item, targetIndex);
        }
        
        // Clear any hover state
        setHoveringIndex(null);
    };

    // Function to move an exercise within the list
    const handleMoveExercise = (sourceIndex: number, targetIndex: number) => {
        setExercises(prevExercises => {
            const result = [...prevExercises];
            const [removed] = result.splice(sourceIndex, 1);
            
            // If moving forward, we need to account for the removed item
            const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            
            // Insert at the new position
            result.splice(adjustedTargetIndex, 0, removed);
            
            // Update order in workout
            return result.map((ex, index) => ({
                ...ex,
                order_in_workout: index + 1
            }));
        });

        // If the active exercise was moved, update its index
        if (activeExerciseIndex === sourceIndex) {
            // The new index will be the target index, but adjusted if needed
            const newActiveIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            setActiveExerciseIndex(newActiveIndex);
        }
    };

    // Function to add an exercise at a specific position
    const handleAddExerciseAt = (exercise: Exercise, targetIndex: number) => {
        // Create the new exercise instance
        const newExercise: ExerciseInstanceAdminData = {
            exercise_db_id: exercise.id,
            exercise_name: exercise.name,
            sets: "0",
            reps: "10",
            rest_period_seconds: 60,
            tempo: null,
            notes: null,
            order_in_workout: targetIndex + 1, // Initial order is the target position
            set_type: SetType.REGULAR,
            sets_data: []
        };
        
        setExercises(prevExercises => {
            const result = [...prevExercises];
            // Insert at the specified position
            result.splice(targetIndex, 0, newExercise);
            
            // Update all order values
            return result.map((ex, index) => ({
                ...ex,
                order_in_workout: index + 1
            }));
        });
        
        // Auto-expand the newly added exercise
        setActiveExerciseIndex(targetIndex);
    };

    // Function to render exercise details (extracted from the mapping function)
    const renderExerciseDetails = (exercise: ExerciseInstanceAdminData, index: number) => {
        return (
            <div className="border-t dark:border-gray-700">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
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
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 dark:text-gray-300">Time/Sets</span>
                                <input 
                                    type="text" 
                                    className="w-20 px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g., 10"
                                    value={exercise.reps || ''}
                                    onChange={(e) => handleExerciseDetailChange(index, 'reps', e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 dark:text-gray-300">Rest</span>
                                <input 
                                    type="text" 
                                    className="w-20 px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g., 60s"
                                    value={exercise.rest_period_seconds ? `${exercise.rest_period_seconds}s` : ''}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                        const restSeconds = value ? parseInt(value, 10) : undefined;
                                        handleExerciseDetailChange(index, 'rest_period_seconds', restSeconds);
                                    }}
                                />
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
                                    <th className="px-1 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {renderExerciseSets(exercise, index)}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 mb-3">
                        <div className="flex items-center gap-4">
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
                        </div>
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
        );
    };

    // Function to handle category selection
    const handleCategoryChange = (categoryId: number | null) => {
        setSelectedCategory(categoryId);
        setPage(1); // Reset to first page on category change
    };
    
    // Function to handle pagination
    const loadMoreExercises = () => {
        setPage(prev => prev + 1);
    };
    
    const loadPreviousExercises = () => {
        setPage(prev => Math.max(1, prev - 1));
    };

    const handleAddExerciseClick = () => {
        // Highlight the search panel to draw attention to it
        setHighlightSearchPanel(true);
        
        // Auto-remove the highlight after 2 seconds
        setTimeout(() => {
            setHighlightSearchPanel(false);
        }, 2000);
        
        // On mobile, we might want to scroll to or focus on the search panel
        const searchPanel = document.querySelector('.exercise-search-panel');
        if (searchPanel) {
            searchPanel.scrollIntoView({ behavior: 'smooth' });
        }
    };

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

    // Modify the handleRemoveSet function to use the custom dialog
    const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
        setDeletingExerciseIndex(exerciseIndex);
        setDeletingSetIndex(setIndex);
        setShowDeleteConfirm(true);
    };

    // Create a function to confirm set deletion
    const confirmSetDeletion = () => {
        if (deletingExerciseIndex !== null && deletingSetIndex !== null) {
            const exercise = exercises[deletingExerciseIndex];
        if (!exercise.sets_data) return;
        
        // Create a copy of the sets data without the removed set
            const updatedSetsData = exercise.sets_data.filter((_, i) => i !== deletingSetIndex);
        
        // Update the order of remaining sets
        const reorderedSetsData = updatedSetsData.map((set, i) => ({
            ...set,
            order: i + 1
        }));
        
        // Update the sets count for backward compatibility
            handleExerciseDetailChange(deletingExerciseIndex, 'sets', reorderedSetsData.length.toString());
        
        // Update the sets data
            handleExerciseDetailChange(deletingExerciseIndex, 'sets_data', reorderedSetsData);
        }
        setShowDeleteConfirm(false);
    };

    // Create a function to handle the delete confirmation based on what's being deleted
    const handleConfirmDeletion = () => {
        if (deletingSetIndex !== null) {
            confirmSetDeletion();
        } else {
            confirmExerciseDeletion();
        }
    };

    // Create a function to cancel deletion
    const cancelDeletion = () => {
        setShowDeleteConfirm(false);
        setDeletingExerciseIndex(null);
        setDeletingSetIndex(null);
    };

    // Generate exercise set rows for the table
    const renderExerciseSets = (exercise: ExerciseInstanceAdminData, index: number) => {
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
                        <td className="px-1 py-2 text-center">
                            <button
                                type="button"
                                onClick={() => handleRemoveSet(index, i)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Remove set"
                            >
                                <FiX size={16} />
                            </button>
                        </td>
                    </tr>
                );
            }
        } else {
            // Fall back to the legacy behavior for exercises without sets_data
            // But limit the number of sets to prevent UI issues with large numbers
            const rawNumSets = parseInt(exercise.sets || "0", 10);
            const numSets = Math.min(rawNumSets, 10); // Cap at 10 sets maximum
            
            // If the number was unusually large, create properly initialized sets_data
            if (rawNumSets > 10) {
                console.warn(`Exercise ${exercise.exercise_name} had ${rawNumSets} sets, capped to ${numSets}`);
                
                // Initialize sets_data properly for next render
                setTimeout(() => {
                    const newSetsData = Array.from({ length: numSets }, (_, i) => ({
                        order: i + 1,
                        type: exercise.set_type || SetType.REGULAR,
                        reps: exercise.reps || '',
                        rest_seconds: exercise.rest_period_seconds || 60
                    }));
                    
                    handleExerciseDetailChange(index, 'sets_data', newSetsData);
                }, 0);
            }
            
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
        <DndProvider backend={HTML5Backend}>
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
                    <div className={`flex flex-col w-1/4 overflow-hidden border-r dark:border-gray-700 exercise-search-panel ${highlightSearchPanel ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''}`}>
                    <div className="p-4 border-b dark:border-gray-700">
                        <h3 className="mb-3 font-semibold dark:text-white">Exercises</h3>
                        <div className="flex items-center px-3 py-2 mb-3 bg-gray-100 rounded-md dark:bg-gray-700">
                            <FiSearch className="mr-2 text-gray-500 dark:text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for exercises..."
                                className="w-full bg-transparent focus:outline-none dark:text-white"
                            />
                        </div>
                        
                        <div className="mb-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center text-sm text-gray-700 dark:text-gray-300"
                            >
                                <FiFilter className="mr-2" />
                                Filter by Category
                                {showFilters ? <FiChevronUp className="ml-2" /> : <FiChevronDown className="ml-2" />}
                            </button>
                            
                            {showFilters && (
                                <div className="p-2 mt-2 rounded-md bg-gray-50 dark:bg-gray-700">
                                    <div className="flex items-center mb-2">
                                        <input
                                            type="radio"
                                            id="all-categories"
                                            checked={selectedCategory === null}
                                            onChange={() => handleCategoryChange(null)}
                                            className="mr-2"
                                        />
                                        <label htmlFor="all-categories" className="text-sm dark:text-white">All Categories</label>
                                    </div>
                                    
                                    {categories.map((category) => (
                                        <div key={category.id} className="flex items-center mb-2">
                                            <input
                                                type="radio"
                                                id={`category-${category.id}`}
                                                checked={selectedCategory === category.id}
                                                onChange={() => handleCategoryChange(category.id)}
                                                className="mr-2"
                                            />
                                            <label htmlFor={`category-${category.id}`} className="text-sm dark:text-white">
                                                {category.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-grow p-2 overflow-y-auto">
                        {isLoading && (
                            <div className="flex items-center justify-center h-32">
                                <div className="w-6 h-6 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="p-4 text-center text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}
                        
                        {!isLoading && !error && searchResults.length === 0 && (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                No exercises found. Try a different search term or category.
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2">
                            {searchResults.map((exercise) => (
                                    <DraggableExerciseItem 
                                    key={exercise.id}
                                        exercise={exercise}
                                        onAddExercise={handleAddExercise}
                                    />
                            ))}
                        </div>
                        
                        {(page > 1 || hasMore) && (
                            <div className="flex items-center justify-between mt-4">
                                <button
                                    onClick={loadPreviousExercises}
                                    disabled={page <= 1}
                                    className={`px-3 py-1 text-sm rounded ${
                                        page <= 1 
                                            ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                                            : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-400'
                                    }`}
                                >
                                    Previous
                                </button>
                                
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Page {page} of {Math.ceil(totalResults / RESULTS_PER_PAGE) || 1}
                                </span>
                                
                                <button
                                    onClick={loadMoreExercises}
                                    disabled={!hasMore}
                                    className={`px-3 py-1 text-sm rounded ${
                                        !hasMore
                                            ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                                            : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-400'
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        )}
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
                                        Day of Week *
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
                                    {methods.formState.errors.day_of_week && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                            {methods.formState.errors.day_of_week.message}
                                        </p>
                                    )}
                            </div>
                        </div>
                    </div>
                    
                        {/* Exercise List with Enhanced Drop Zone and Drag Functionality */}
                        <div 
                            ref={(node) => mainDropRef(node as HTMLDivElement)}
                            className={`${DROP_ZONE_BASE_CLASS} ${isOver ? DROP_ZONE_HOVER_CLASS : DROP_ZONE_ACTIVE_CLASS}`}
                            onMouseLeave={() => setHoveringIndex(null)}
                        >
                            {/* First drop zone at the top */}
                            <ExerciseDropZone 
                                onDrop={handleExerciseDrop} 
                                index={0} 
                                isOver={hoveringIndex === 0}
                            />

                            {exercises.map((exercise, index) => (
                                <React.Fragment key={index}>
                                    <DraggableWorkoutExercise
                                        exercise={exercise}
                                        index={index}
                                        activeExerciseIndex={activeExerciseIndex}
                                        setActiveExerciseIndex={setActiveExerciseIndex}
                                        handleRemoveExercise={handleRemoveExercise}
                                        renderExerciseDetails={renderExerciseDetails}
                                    />
                                    
                                    {/* Add drop zone after each exercise */}
                                    <ExerciseDropZone 
                                        onDrop={handleExerciseDrop} 
                                        index={index + 1}
                                        isOver={hoveringIndex === index + 1}
                                    />
                                </React.Fragment>
                        ))}
                        
                        {exercises.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="p-6 mb-4 text-indigo-500 bg-indigo-100 rounded-full dark:bg-indigo-900 dark:bg-opacity-30 dark:text-indigo-300">
                                        <FiPlus size={36} />
                                    </div>
                                    <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                                        No exercises added yet
                                    </p>
                                    <p className="max-w-md text-gray-500 dark:text-gray-400">
                                        Drag exercises from the left panel and drop them here, or click on an exercise to add it.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Add Exercise Button */}
                    <div className="p-4 border-t dark:border-gray-700">
                        <button 
                            type="button"
                                onClick={handleAddExerciseClick}
                            className="flex items-center justify-center w-full py-2 font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300"
                        >
                            <FiPlus className="mr-2" /> Add Exercise
                        </button>
                    </div>
                </div>
            </div>
                
                {/* Add the custom confirmation dialog */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-white">Confirm Deletion</h2>
                            <p className="mb-6 text-gray-300">
                                {deletingSetIndex !== null 
                                    ? 'Are you sure you want to delete this set? This action cannot be undone.'
                                    : 'Are you sure you want to delete this exercise from the workout? This action cannot be undone.'}
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={cancelDeletion}
                                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDeletion}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
        </div>
                        </div>
                    </div>
                )}
            </div>
        </DndProvider>
    );
};

export default WorkoutForm; 