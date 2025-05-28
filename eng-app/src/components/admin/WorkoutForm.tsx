import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { ExerciseInstanceAdminData, WorkoutAdminData, SetType } from '../../types/adminTypes';
import { FiTrash2, FiPlus, FiX, FiChevronDown, FiChevronUp, FiFilter, FiLink } from 'react-icons/fi';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Exercise as DatabaseExercise } from '../../utils/exerciseDatabase';
import { v4 as uuidv4 } from 'uuid';
import { 
    fetchExercises, 
    fetchMuscleGroups, 
    fetchEquipmentOptions,
    fetchGenderOptions,
    Muscle as Category
} from '../../utils/exerciseAPI';
import DraggableExerciseCard from './DraggableExerciseCard';

// Define ExerciseWithSupersetFields interface
interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
    superset_group_id?: string | null;
    superset_order?: number;
}

// Helper function to clean exercise names from gender and version indicators
const cleanExerciseName = (name: string): string => {
  if (!name) return name;
  // Remove text within parentheses and extra whitespace
  return name.replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
             .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
             .trim();                          // Remove leading/trailing whitespace
};

// Make sure LocalExercise is compatible with Exercise
interface LocalExercise {
    id: string;
    name: string;
    category: string;
    primaryMuscle: string;
    secondaryMuscles: string[];
    image?: string;
}

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

// Define item types for drag and drop
const ItemTypes = {
    WORKOUT_EXERCISE: 'workout_exercise',
    SEARCH_EXERCISE: 'search_exercise'
};

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

// Create a draggable exercise item component (search panel exercises)
// Note: We're now using the DraggableExerciseCard component imported from './DraggableExerciseCard'
// Note: We're now using the DraggableExerciseCard component imported from './DraggableExerciseCard'

// Create a component for the drop zone between exercises
const ExerciseDropZone = ({ 
    onDrop, 
    index,
    isOver,
    isDragging, 
}: { 
    onDrop: (item: { 
        type: string; 
        exerciseIndex?: number; 
        exercise?: DatabaseExercise;
        supersetInfo?: { 
            groupId: string;
            order: number;
            totalInGroup: number;
            isFirst: boolean;
            isLast: boolean;
        } | null; 
    }, targetIndex: number) => void, 
    index: number,
    isOver: boolean,
    isDragging: boolean, 
}) => {
    // Create a ref that React recognizes
    const dropElementRef = useRef<HTMLDivElement>(null);
    
    const [{ isOverCurrent }, drop] = useDrop(() => ({
        accept: [ItemTypes.WORKOUT_EXERCISE, ItemTypes.SEARCH_EXERCISE],
        drop: (item: { 
            type: string; 
            exerciseIndex?: number; 
            exercise?: DatabaseExercise;
            supersetInfo?: { 
                groupId: string;
                order: number;
                totalInGroup: number;
                isFirst: boolean;
                isLast: boolean;
            } | null; 
        }) => {
            onDrop(item, index);
            return { dropped: true };
        },
        collect: monitor => ({
            isOverCurrent: !!monitor.isOver({ shallow: true }),
        }),
    }));

    // Connect the drop ref to our element ref
    useEffect(() => {
        drop(dropElementRef.current);
    }, [drop]);

    // Only show the drop zone visually when dragging or hovering
    const isActive = isOverCurrent || isOver;
    
    return (
        <div
            ref={dropElementRef}
            className={`
                mx-1 transition-all duration-200 
                ${!isDragging ? 'h-2' : isActive ? 'h-20 py-2 my-2' : 'h-6 my-1'}
                ${isDragging ? 'border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md' : ''}
                ${isActive ? 'bg-indigo-100 dark:bg-indigo-900 dark:bg-opacity-30 border-indigo-400 scale-[1.02]' : 'bg-transparent'}
            `}
        >
            {isDragging && isActive && (
                <div className="flex items-center justify-center h-full">
                    <span className="text-sm font-medium text-indigo-500 dark:text-indigo-400">
                        Drop here
                    </span>
                </div>
            )}
        </div>
    );
};

// Create a draggable component for existing workout exercises
const DraggableWorkoutExercise = ({ 
    exercise, 
    index, 
    activeExerciseIndex,
    setActiveExerciseIndex,
    handleRemoveExercise,
    renderExerciseDetails,
    isSelected,
    onSelect,
    supersetInfo,
    onRemoveFromSuperset
}: { 
    exercise: ExerciseInstanceAdminData, 
    index: number,
    activeExerciseIndex: number | null,
    setActiveExerciseIndex: (index: number | null) => void,
    handleRemoveExercise: (index: number) => void,
    renderExerciseDetails: (exercise: ExerciseInstanceAdminData, index: number) => React.ReactNode,
    isSelected: boolean,
    onSelect: () => void,
    supersetInfo: { 
        groupId: string,
        order: number,
        totalInGroup: number,
        isFirst: boolean,
        isLast: boolean
    } | null,
    onRemoveFromSuperset: (index: number) => void
}) => {
    // Create a ref that React recognizes
    const dragElementRef = useRef<HTMLDivElement>(null);
    
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.WORKOUT_EXERCISE,
        item: { 
            type: ItemTypes.WORKOUT_EXERCISE, 
            exerciseIndex: index, 
            exercise,
            // Include superset information in the dragged item
            supersetInfo: supersetInfo
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));
    
    // Connect the drag ref to our element ref
    useEffect(() => {
        drag(dragElementRef.current);
    }, [drag]);

    // Determine if this is in a superset
    const isSupersetExercise = supersetInfo !== null;

    return (
        <div 
            ref={dragElementRef}
            className={`overflow-hidden border rounded-lg shadow 
                ${isDragging ? 'opacity-50' : 'opacity-100'}
                ${isSupersetExercise ? 'border-indigo-500 dark:border-indigo-600' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}
                ${isSelected ? 'ring-2 ring-indigo-500 ring-opacity-70' : ''}
                ${supersetInfo?.isFirst ? 'rounded-b-none' : ''}
                ${supersetInfo?.isLast ? 'rounded-t-none' : ''}
                ${supersetInfo && !supersetInfo.isFirst && !supersetInfo.isLast ? 'rounded-none' : ''}
                ${supersetInfo && !supersetInfo.isFirst ? '-mt-1' : ''}
            `}
            style={{ cursor: 'move' }}
        >
            {/* Superset Label - only shown on first exercise in the superset */}
            {supersetInfo?.isFirst && (
                <div className="px-4 py-1 text-sm font-medium text-white bg-indigo-500 dark:bg-indigo-600">
                    {supersetInfo.totalInGroup === 2 ? 'Bi-Set' : 
                     supersetInfo.totalInGroup === 3 ? 'Tri-Set' : 
                     `Superset (${supersetInfo.totalInGroup} exercises)`}
                </div>
            )}
            
            {/* Exercise Header */}
            <div className={`flex items-center justify-between px-4 py-3 
                ${isSupersetExercise 
                    ? (supersetInfo?.isFirst 
                        ? 'bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20' 
                        : 'bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-10')
                    : 'bg-gray-50 dark:bg-gray-700'}`}>
                <div className="flex items-center gap-3">
                <div className="flex items-center">
                    <button
                            type="button"
                            onClick={onSelect}
                            className={`flex items-center justify-center w-8 h-8 p-1 mr-2 text-sm rounded-full focus:outline-none 
                                ${isSelected 
                                    ? 'text-white bg-indigo-500 hover:bg-indigo-600' 
                                    : 'text-gray-500 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'}`}
                            title={isSelected ? "Selected for superset - click to unselect" : "Click to select for superset group"}
                            aria-label="Select exercise for superset"
                        >
                            <FiLink />
                        </button>
                        
                        {isSupersetExercise && (
                            <span className="flex items-center justify-center w-6 h-6 mr-2 text-xs font-bold text-white bg-indigo-500 rounded-full">
                                {supersetInfo?.order}
                            </span>
                        )}
                        <h3 className="font-medium dark:text-white">{cleanExerciseName(exercise.exercise_name)}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSupersetExercise && (
                        <button
                            type="button"
                            onClick={() => onRemoveFromSuperset(index)}
                            className="p-1 text-indigo-500 hover:text-indigo-700"
                            title="Remove from superset"
                        >
                            <span className="text-xs">Unsuperset</span>
                        </button>
                    )}
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
    const [searchResults, setSearchResults] = useState<DatabaseExercise[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedExerciseDetails, setSelectedExerciseDetails] = useState<ExerciseInstanceAdminData | null>(null);
    const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [showFemaleExercises, setShowFemaleExercises] = useState<boolean>(false);
    const [highlightSearchPanel, setHighlightSearchPanel] = useState(false);
    
    // Add state for tracking if all exercises are expanded
    const [allExercisesExpanded, setAllExercisesExpanded] = useState(false);
    
    // Add state for supersets
    const [selectedExerciseIndices, setSelectedExerciseIndices] = useState<number[]>([]);
    const [supersetGroups, setSupersetGroups] = useState<Record<string, number[]>>({});
    
    // Constants for pagination
    const RESULTS_PER_PAGE = 20;
    
    // Add new state for deletion confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingExerciseIndex, setDeletingExerciseIndex] = useState<number | null>(null);
    const [deletingSetIndex, setDeletingSetIndex] = useState<number | null>(null);
    
    // Add state to track if we're hovering over any drop zone
    const [hoveringIndex, setHoveringIndex] = useState<number | null>(null);
    // Add state to track if any drag operation is in progress
    const [isDraggingAny, setIsDraggingAny] = useState<boolean>(false);

    // Add a new state for equipment filter
    const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
    const [equipmentOptions, setEquipmentOptions] = useState<string[]>([]);

    // Add a new state for gender options
    const [genderOptions, setGenderOptions] = useState<string[]>([]);
    const [selectedGender, setSelectedGender] = useState<string | null>(null);

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
                        set_order: i + 1, // Use set_order instead of order
                        type: exercise.set_type || SetType.REGULAR,
                        reps: exercise.reps || '',
                        rest_seconds: exercise.rest_period_seconds !== null && exercise.rest_period_seconds !== undefined ? exercise.rest_period_seconds : 60
                    }));
                    
                    return {
                        ...exercise,
                        sets_data: newSetsData
                    };
                }
                
                // Ensure existing sets_data has the set_order property
                if (exercise.sets_data && exercise.sets_data.length > 0) {
                    const checkedSetsData = exercise.sets_data.map((set, i) => ({
                        ...set,
                        set_order: set.set_order || i + 1 // Use set_order instead of order
                    }));
                    
                    return {
                        ...exercise,
                        sets_data: checkedSetsData
                    };
                }
                
                return exercise;
            });
            
            setExercises(initializedExercises);
            
            // Initialize supersetGroups state based on superset_group_id fields
            const newSupersetGroups: Record<string, number[]> = {};
            
            // First, collect all exercises with superset_group_id properties
            initializedExercises.forEach((exercise, index) => {
                // Use type assertion to safely access potential superset fields
                interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                    superset_group_id?: string | null;
                    superset_order?: number;
                }
                
                const exerciseWithSuperset = exercise as ExerciseWithSupersetFields;
                
                if (exerciseWithSuperset.superset_group_id) {
                    const groupId = exerciseWithSuperset.superset_group_id;
                    
                    if (!newSupersetGroups[groupId]) {
                        newSupersetGroups[groupId] = [];
                    }
                    
                    newSupersetGroups[groupId].push(index);
                }
            });
            
            // Sort each group's indices by the superset_order
            Object.keys(newSupersetGroups).forEach(groupId => {
                newSupersetGroups[groupId].sort((a, b) => {
                    const exerciseA = initializedExercises[a] as ExerciseWithSupersetFields;
                    const exerciseB = initializedExercises[b] as ExerciseWithSupersetFields;
                    return (exerciseA.superset_order || 0) - (exerciseB.superset_order || 0);
                });
            });
            
            // Only update if we found any superset groups
            if (Object.keys(newSupersetGroups).length > 0) {
                setSupersetGroups(newSupersetGroups);
            } else {
                setSupersetGroups({});
            }
        } else {
            setExercises([]);
            setSupersetGroups({});
        }
    }, [workout, reset]);
    
    // Function to search exercises from API
    const searchExercisesFromAPI = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetchExercises(
                searchQuery, 
                selectedCategory,
                selectedGender,
                selectedEquipment,
                page,
                RESULTS_PER_PAGE,
            );
            
            if (!response.results || response.results.length === 0) {
                console.warn('No exercise results found');
                
                // Check if this is the initial load
                if (page === 1 && !searchQuery && selectedCategory === null) {
                    console.warn('This is the initial load - database might be empty or not accessible');
                }
            }
            
            // Make sure results is always an array even if the API returns null
            const safeResults = response.results || [];
            
            // Convert API exercise type to database exercise type that the component expects
            const convertedResults = safeResults.map(apiExercise => ({
                ...apiExercise,
                primaryMuscle: apiExercise.category || '',
                secondaryMuscles: apiExercise.muscles || []
            })) as unknown as DatabaseExercise[];
            
            // We no longer need to filter for female exercises here since it's handled by the API
            setSearchResults(convertedResults);
            setTotalResults(response.count || 0);
            setHasMore(response.next !== null);
        } catch (err) {
            console.error("Error searching exercises:", err);
            setError("Failed to search exercises. Please try again later.");
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedCategory, page, showFemaleExercises, selectedEquipment, selectedGender]);
    
    // Search exercises with debounce
    useEffect(() => {
        // Only search if query is provided or a category is selected
        if (!searchQuery && selectedCategory === null && !showFemaleExercises) {
            // Load initial exercises without specific search
            const timer = setTimeout(() => {
                searchExercisesFromAPI();
            }, 500);
            return () => clearTimeout(timer);
        }
        
        const timer = setTimeout(() => {
            searchExercisesFromAPI();
        }, 500);
        
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, page, searchExercisesFromAPI, showFemaleExercises]);
    
    // Initial load of exercises
    useEffect(() => {
        const loadInitialExercises = async () => {
            setIsLoading(true);
            try {
                // Load first page of exercises without filters on component mount
                const response = await fetchExercises(
                    "", // No search term
                    "", // No category filter
                    "", // No gender filter
                    "", // No equipment filter
                    1, // First page
                    RESULTS_PER_PAGE,
                );
                
                // Convert API exercise type to database exercise type
                const convertedResults = response.results.map(apiExercise => ({
                    ...apiExercise,
                    primaryMuscle: apiExercise.category || '',
                    secondaryMuscles: apiExercise.muscles || []
                })) as unknown as DatabaseExercise[];
                
                // Filter for female exercises if the option is selected
                let filteredResults = convertedResults;
                if (showFemaleExercises) {
                    filteredResults = convertedResults.filter(exercise => 
                        exercise.name.toLowerCase().includes('(female)')
                    );
                }
                
                setSearchResults(filteredResults);
                setTotalResults(showFemaleExercises ? filteredResults.length : response.count);
                setHasMore(showFemaleExercises ? false : (response.next !== null));
            } catch (err) {
                console.error("Error loading initial exercises:", err);
                setError("Failed to load exercises. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        
        loadInitialExercises();
    }, [showFemaleExercises]);
    
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
        
        const setTypeMap: Record<string, string> = {
            [SetType.REGULAR]: 'Regular',
            [SetType.WARM_UP]: 'Warm-up',
            [SetType.DROP_SET]: 'Drop Set',
            [SetType.FAILURE]: 'To Failure',
            [SetType.SUPERSET]: 'Superset',
            [SetType.BACKDOWN]: 'Backdown',
            [SetType.TEMPO]: 'Tempo',
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

    // Add descriptions for each set type
    const getSetTypeDescription = (setType: SetType | null | undefined): string => {
        if (!setType) return '';
        
        const setTypeDescMap: Record<string, string> = {
            [SetType.REGULAR]: 'Standard set with consistent weight and reps.',
            [SetType.WARM_UP]: 'Lighter weight to prepare muscles for heavier loads.',
            [SetType.DROP_SET]: 'Complete a set, then immediately reduce weight and continue.',
            [SetType.FAILURE]: 'Perform reps until unable to complete another with proper form.',
            [SetType.SUPERSET]: 'Perform two exercises back-to-back with no rest between.',
            [SetType.BACKDOWN]: 'After heavy sets, reduce weight for volume work.',
            [SetType.TEMPO]: 'Control speed of movement with specific timing (eccentric/concentric).',
            [SetType.CONTRAST]: 'Alternate between heavy and light loads for power development.',
            [SetType.COMPLEX]: 'Series of exercises performed sequentially with same weight.',
            [SetType.CLUSTER]: 'Brief rest periods within a set to achieve more total reps.',
            [SetType.PYRAMID]: 'Progressively increase or decrease weight with each set.',
            [SetType.PARTIAL]: 'Limited range of motion to target specific portions of an exercise.',
            [SetType.BURNS]: 'Short, quick partial reps at the end of a set to increase intensity.',
            [SetType.PAUSE]: 'Hold position during exercise to increase time under tension.',
            [SetType.PULSE]: 'Small, rapid movements at a challenging point in the range of motion.',
            [SetType.NEGATIVE]: 'Focus on slow, controlled lowering (eccentric) portion of an exercise.',
            [SetType.FORCED_REP]: 'Partner assists to complete additional reps after reaching failure.',
            [SetType.PRE_EXHAUST]: 'Perform isolation exercise before compound movement for same muscle.',
            [SetType.POST_EXHAUST]: 'Perform isolation exercise after compound movement for same muscle.'
        };
        
        return setTypeDescMap[setType] || '';
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
    const handleAddExercise = (exercise: DatabaseExercise | LocalExercise) => {
        // Create a new exercise instance with proper information
        const newExercise: ExerciseInstanceAdminData = {
            exercise_db_id: 'id' in exercise ? exercise.id.toString() : '',
            exercise_name: exercise.name || 'Unnamed Exercise',
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

    // Helper function to extract muscle information from API exercise
    const createLocalExerciseFromAPI = (exercise: DatabaseExercise): LocalExercise => {
        // Convert the API exercise to a format our local state can use
        const primaryMuscle = exercise.category || '';
        const secondaryMuscles = exercise.muscles || [];
        
        return {
            id: exercise.id,
            name: exercise.name,
            category: exercise.category || '',
            primaryMuscle,
            secondaryMuscles,
            image: exercise.image === null ? undefined : exercise.image,
        };
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
        accept: [ItemTypes.WORKOUT_EXERCISE, ItemTypes.SEARCH_EXERCISE],
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    // Create a ref that React recognizes for the main drop area
    const mainDropAreaRef = useRef<HTMLDivElement>(null);

    // Connect the drop ref to our element ref
    useEffect(() => {
        mainDropRef(mainDropAreaRef.current);
    }, [mainDropRef]);

    // Handler for dropping items between exercises
    const handleExerciseDrop = (item: { 
        type: string; 
        exerciseIndex?: number; 
        exercise?: DatabaseExercise;
        supersetInfo?: { 
            groupId: string;
            order: number;
            totalInGroup: number;
            isFirst: boolean;
            isLast: boolean;
        } | null;
    }, targetIndex: number) => {
        if (item.type === ItemTypes.WORKOUT_EXERCISE) {
            // This is an existing exercise being reordered
            const sourceIndex = item.exerciseIndex!;
            
            // Don't do anything if dropped on its own spot or the spot right after it
            if (sourceIndex === targetIndex || sourceIndex + 1 === targetIndex) {
                return;
            }
            
            // Check if this is part of a superset
            if (item.supersetInfo) {
                // Get all exercises in this superset
                const groupId = item.supersetInfo.groupId;
                const supersetExerciseIndices = supersetGroups[groupId] || [];
                
                // If we found indices, move the entire superset
                if (supersetExerciseIndices.length > 0) {
                    handleMoveSupersetGroup(groupId, supersetExerciseIndices, targetIndex);
                    return;
                }
            }
            
            // If not a superset or superset indices not found, reorder a single exercise
            handleMoveExercise(sourceIndex, targetIndex);
        } else {
            // This is a new exercise from the search panel
            handleAddExerciseAt(item.exercise as DatabaseExercise, targetIndex);
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
    const handleAddExerciseAt = (exercise: DatabaseExercise, targetIndex: number) => {
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
                                    value={exercise.set_type || SetType.REGULAR}
                                    onChange={(e) => handleExerciseDetailChange(index, 'set_type', e.target.value)}
                                >
                                    <option value={SetType.REGULAR} title={getSetTypeDescription(SetType.REGULAR)}>Regular</option>
                                    <option value={SetType.WARM_UP} title={getSetTypeDescription(SetType.WARM_UP)}>Warm-up</option>
                                    <option value={SetType.DROP_SET} title={getSetTypeDescription(SetType.DROP_SET)}>Drop Set</option>
                                    <option value={SetType.FAILURE} title={getSetTypeDescription(SetType.FAILURE)}>To Failure</option>
                                    <option value={SetType.SUPERSET} title={getSetTypeDescription(SetType.SUPERSET)}>Superset</option>
                                    <option value={SetType.BACKDOWN} title={getSetTypeDescription(SetType.BACKDOWN)}>Backdown</option>
                                    <option value={SetType.TEMPO} title={getSetTypeDescription(SetType.TEMPO)}>Tempo</option>
                                    <option value={SetType.CONTRAST} title={getSetTypeDescription(SetType.CONTRAST)}>Contrast</option>
                                    <option value={SetType.COMPLEX} title={getSetTypeDescription(SetType.COMPLEX)}>Complex</option>
                                    <option value={SetType.CLUSTER} title={getSetTypeDescription(SetType.CLUSTER)}>Cluster</option>
                                    <option value={SetType.PYRAMID} title={getSetTypeDescription(SetType.PYRAMID)}>Pyramid</option>
                                    <option value={SetType.PARTIAL} title={getSetTypeDescription(SetType.PARTIAL)}>Partial</option>
                                    <option value={SetType.BURNS} title={getSetTypeDescription(SetType.BURNS)}>Burns</option>
                                    <option value={SetType.PAUSE} title={getSetTypeDescription(SetType.PAUSE)}>Pause</option>
                                    <option value={SetType.PULSE} title={getSetTypeDescription(SetType.PULSE)}>Pulse</option>
                                    <option value={SetType.NEGATIVE} title={getSetTypeDescription(SetType.NEGATIVE)}>Negative</option>
                                    <option value={SetType.FORCED_REP} title={getSetTypeDescription(SetType.FORCED_REP)}>Forced Rep</option>
                                    <option value={SetType.PRE_EXHAUST} title={getSetTypeDescription(SetType.PRE_EXHAUST)}>Pre-Exhaust</option>
                                    <option value={SetType.POST_EXHAUST} title={getSetTypeDescription(SetType.POST_EXHAUST)}>Post-Exhaust</option>
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
                                <select 
                                    value={exercise.rest_period_seconds ?? 60}
                                    onChange={(e) => {
                                        const restSeconds = parseInt(e.target.value, 10);
                                        handleExerciseDetailChange(index, 'rest_period_seconds', restSeconds);
                                    }}
                                    className="w-28 px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white [&>option]:dark:bg-gray-700 [&>option]:dark:text-white"
                                >
                                    <option value={0}>0s</option>
                                    <option value={30}>30s</option>
                                    <option value={60}>60s (1m)</option>
                                    <option value={90}>90s (1.5m)</option>
                                    <option value={120}>120s (2m)</option>
                                    <option value={180}>180s (3m)</option>
                                    <option value={240}>240s (4m)</option>
                                    <option value={300}>300s (5m)</option>
                                    <option value={360}>360s (6m)</option>
                                    <option value={420}>420s (7m)</option>
                                    <option value={480}>480s (8m)</option>
                                    <option value={540}>540s (9m)</option>
                                    <option value={600}>600s (10m)</option>
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
                                    checked={exercise.each_side || false}
                                    onChange={(e) => handleExerciseDetailChange(index, 'each_side', e.target.checked)}
                                    className="text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor={`each-side-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                                    Each Side
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id={`bodyweight-${index}`}
                                    checked={exercise.is_bodyweight || false}
                                    onChange={(e) => handleExerciseDetailChange(index, 'is_bodyweight', e.target.checked)}
                                    className="text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor={`bodyweight-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                                    Bodyweight Exercise
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
                        <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Add note for this exercise
                        </label>
                        <textarea
                            id="notes"
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Add a note..."
                            value={exercise.notes || ''}
                            onChange={(e) => handleExerciseDetailChange(index, 'notes', e.target.value)}
                        ></textarea>
                    </div>
                </div>
            </div>
        );
    };

    // Function to handle category selection
    const handleCategoryChange = (categoryName: string | null) => {
        setSelectedCategory(categoryName);
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
        const newSetOrder = currentSetsData.length + 1;
        const newSet = {
            set_order: newSetOrder, // Use set_order instead of order to match the ExerciseSet interface
            type: exercise.set_type || SetType.REGULAR, // Inherit the exercise's default set type
            reps: exercise.reps || '', // Inherit the exercise's default reps
            rest_seconds: exercise.rest_period_seconds ?? 60 // Inherit the exercise's default rest period
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
                type: newType,
                // Ensure set_order is preserved
                set_order: updatedSetsData[setIndex].set_order || setIndex + 1
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
                set_order: i + 1 // Use set_order instead of order
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
                                title={getSetTypeDescription(set.type)}
                            >
                                <option value={SetType.REGULAR} title={getSetTypeDescription(SetType.REGULAR)}>Regular</option>
                                <option value={SetType.WARM_UP} title={getSetTypeDescription(SetType.WARM_UP)}>Warm-up</option>
                                <option value={SetType.DROP_SET} title={getSetTypeDescription(SetType.DROP_SET)}>Drop Set</option>
                                <option value={SetType.FAILURE} title={getSetTypeDescription(SetType.FAILURE)}>To Failure</option>
                                <option value={SetType.SUPERSET} title={getSetTypeDescription(SetType.SUPERSET)}>Superset</option>
                                <option value={SetType.BACKDOWN} title={getSetTypeDescription(SetType.BACKDOWN)}>Backdown</option>
                                <option value={SetType.TEMPO} title={getSetTypeDescription(SetType.TEMPO)}>Tempo</option>
                                <option value={SetType.CONTRAST} title={getSetTypeDescription(SetType.CONTRAST)}>Contrast</option>
                                <option value={SetType.COMPLEX} title={getSetTypeDescription(SetType.COMPLEX)}>Complex</option>
                                <option value={SetType.CLUSTER} title={getSetTypeDescription(SetType.CLUSTER)}>Cluster</option>
                                <option value={SetType.PYRAMID} title={getSetTypeDescription(SetType.PYRAMID)}>Pyramid</option>
                                <option value={SetType.PARTIAL} title={getSetTypeDescription(SetType.PARTIAL)}>Partial</option>
                                <option value={SetType.BURNS} title={getSetTypeDescription(SetType.BURNS)}>Burns</option>
                                <option value={SetType.PAUSE} title={getSetTypeDescription(SetType.PAUSE)}>Pause</option>
                                <option value={SetType.PULSE} title={getSetTypeDescription(SetType.PULSE)}>Pulse</option>
                                <option value={SetType.NEGATIVE} title={getSetTypeDescription(SetType.NEGATIVE)}>Negative</option>
                                <option value={SetType.FORCED_REP} title={getSetTypeDescription(SetType.FORCED_REP)}>Forced Rep</option>
                                <option value={SetType.PRE_EXHAUST} title={getSetTypeDescription(SetType.PRE_EXHAUST)}>Pre-Exhaust</option>
                                <option value={SetType.POST_EXHAUST} title={getSetTypeDescription(SetType.POST_EXHAUST)}>Post-Exhaust</option>
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
                            <select 
                                value={set.rest_seconds ?? 60}
                                onChange={(e) => {
                                    const restSeconds = parseInt(e.target.value, 10);
                                    const updatedSetsData = [...exercise.sets_data!];
                                    updatedSetsData[i] = { ...updatedSetsData[i], rest_seconds: restSeconds };
                                    handleExerciseDetailChange(index, 'sets_data', updatedSetsData);
                                }}
                                className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 dark:text-white focus:border-indigo-500 focus:outline-none [&>option]:dark:bg-gray-700 [&>option]:dark:text-white"
                            >
                                <option value={0}>0s</option>
                                <option value={30}>30s</option>
                                <option value={60}>60s (1m)</option>
                                <option value={90}>90s (1.5m)</option>
                                <option value={120}>120s (2m)</option>
                                <option value={180}>180s (3m)</option>
                                <option value={240}>240s (4m)</option>
                                <option value={300}>300s (5m)</option>
                                <option value={360}>360s (6m)</option>
                                <option value={420}>420s (7m)</option>
                                <option value={480}>480s (8m)</option>
                                <option value={540}>540s (9m)</option>
                                <option value={600}>600s (10m)</option>
                            </select>
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
                        set_order: i + 1,
                        type: exercise.set_type || SetType.REGULAR,
                        reps: exercise.reps || '',
                        rest_seconds: exercise.rest_period_seconds ?? 60
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
                                <span 
                                    className={`inline-block px-2 py-1 text-xs rounded ${
                                    exercise.set_type === SetType.WARM_UP ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 
                                    exercise.set_type === SetType.DROP_SET ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 
                                    exercise.set_type === SetType.FAILURE ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                    title={getSetTypeDescription(exercise.set_type)}
                                >
                                    {getSetTypeName(exercise.set_type)}
                                </span>
                            ) : (
                                <span className="text-xs text-gray-400" title={getSetTypeDescription(SetType.REGULAR)}>Regular</span>
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

    // Function to handle exercise selection for supersets
    const handleExerciseSelection = (index: number) => {
        setSelectedExerciseIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
            return [...prev, index];
            }
        });
    };

    // Function to create a superset from selected exercises
    const handleCreateSuperset = () => {
        if (selectedExerciseIndices.length < 2) {
            // Show error or alert that at least 2 exercises are needed
            alert("Please select at least 2 exercises to create a superset");
            return;
        }

        // Generate a unique ID for this superset group using proper UUID format
        const supersetId = uuidv4();
        
        // Add the superset group
        setSupersetGroups(prev => ({
            ...prev,
            [supersetId]: [...selectedExerciseIndices].sort((a, b) => a - b)
        }));
        
        // Update exercise instances with superset info
        setExercises(prev => {
            const updated = [...prev];
            
            // Sort indices to maintain proper order
            const orderedIndices = [...selectedExerciseIndices].sort((a, b) => a - b);
            
            // Update each selected exercise
            orderedIndices.forEach((exerciseIndex, position) => {
                // Add superset properties to exercise
                interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                    superset_group_id: string;
                    superset_order: number;
                }
                
                updated[exerciseIndex] = {
                    ...updated[exerciseIndex],
                    superset_group_id: supersetId,
                    superset_order: position + 1,
                    set_type: SetType.SUPERSET
                } as ExerciseWithSupersetFields;
            });
            
            return updated;
        });
        
        // Clear selection after creating the superset
        setSelectedExerciseIndices([]);
    };

    // Function to remove an exercise from a superset
    const handleRemoveFromSuperset = (exerciseIndex: number) => {
        // Find which superset group this exercise belongs to
        const groupId = Object.entries(supersetGroups).find(([, indices]) => 
            indices.includes(exerciseIndex)
        )?.[0];
        
        if (!groupId) return;
        
        // Update the supersetGroups state
        setSupersetGroups(prev => {
            const updatedGroup = prev[groupId].filter(idx => idx !== exerciseIndex);
            
            // If only one exercise remains, dissolve the superset
            if (updatedGroup.length < 2) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [groupId]: ignored, ...rest } = prev;
                
                // Also update the remaining exercise to remove superset info
                if (updatedGroup.length === 1) {
                    setExercises(exercises => {
                        const updated = [...exercises];
                        // Add superset properties to exercise
                        interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                            superset_group_id?: string;
                            superset_order?: number;
                            set_type?: SetType;
                        }
                        
                        updated[updatedGroup[0]] = {
                            ...updated[updatedGroup[0]],
                            superset_group_id: undefined,
                            superset_order: undefined,
                            set_type: SetType.REGULAR
                        } as ExerciseWithSupersetFields;
                        return updated;
                    });
                }
                
                return rest;
            }
            
            // Otherwise update the order of remaining exercises
            setExercises(exercises => {
                const updated = [...exercises];
                updatedGroup.forEach((idx, i) => {
                    // Add superset properties to exercise
                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                        superset_order: number;
                    }
                    
                    updated[idx] = {
                        ...updated[idx],
                        superset_order: i + 1
                    } as ExerciseWithSupersetFields;
                });
                return updated;
            });
            
            return {
                ...prev,
                [groupId]: updatedGroup
            };
        });
        
        // Update the exercise to remove superset info
        setExercises(prev => {
            const updated = [...prev];
            // Add superset properties to exercise
            interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                superset_group_id?: string;
                superset_order?: number;
                set_type: SetType;
            }
            
            updated[exerciseIndex] = {
                ...updated[exerciseIndex],
                superset_group_id: undefined,
                superset_order: undefined,
                set_type: SetType.REGULAR
            } as ExerciseWithSupersetFields;
            return updated;
        });
    };

    // Function to check if an exercise is part of a superset
    const isInSuperset = (exerciseIndex: number) => {
        return Object.values(supersetGroups).some(indices => indices.includes(exerciseIndex));
    };

    // Function to get superset group ID and info
    const getSupersetInfo = (exerciseIndex: number) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const entry = Object.entries(supersetGroups).find(([key, indices]) => 
            indices.includes(exerciseIndex)
        );
        
        if (!entry) return null;
        
        const [groupId, indices] = entry;
        const order = indices.indexOf(exerciseIndex) + 1;
        const totalInGroup = indices.length;
        
        return {
            groupId,
            order,
            totalInGroup,
            isFirst: order === 1,
            isLast: order === totalInGroup
        };
    };

    // Add effect to listen for drag operations globally
    useEffect(() => {
        const handleDragStart = () => setIsDraggingAny(true);
        const handleDragEnd = () => {
            setIsDraggingAny(false);
            setHoveringIndex(null);
        };
        
        // These events will work for native HTML5 drag events
        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragend', handleDragEnd);
        
        return () => {
            document.removeEventListener('dragstart', handleDragStart);
            document.removeEventListener('dragend', handleDragEnd);
        };
    }, []);

    // Memoize the transformed search results to prevent unnecessary recalculations
    const memoizedLocalExercises = useMemo(() => {
        return searchResults.map(exercise => createLocalExerciseFromAPI(exercise));
    }, [searchResults]);

    // Add a new function to handle moving an entire superset group
    const handleMoveSupersetGroup = (groupId: string, exerciseIndices: number[], targetIndex: number) => {
        // Sort indices to maintain the correct order
        const sortedIndices = [...exerciseIndices].sort((a, b) => a - b);
        
        // Calculate the adjusted target index based on whether we're moving forward or backward
        // If any exercise in the group is before the target, we need to adjust the target index
        const minIndex = Math.min(...sortedIndices);
        
        // If we're moving forward, we need to account for the removed exercises
        const adjustedTargetIndex = minIndex < targetIndex ? 
            targetIndex - sortedIndices.length : targetIndex;
        
        setExercises(prevExercises => {
            // Create a copy of the exercises array
            const result = [...prevExercises];
            
            // Remove all exercises in the superset (in reverse order to avoid index shifting)
            const removedExercises = [];
            for (let i = sortedIndices.length - 1; i >= 0; i--) {
                const index = sortedIndices[i];
                const [removed] = result.splice(index, 1);
                // Store in reverse so they're in the correct order when re-inserted
                removedExercises.unshift(removed);
            }
            
            // Insert all removed exercises at the target position
            result.splice(adjustedTargetIndex, 0, ...removedExercises);
            
            // Create a new superset group with updated indices
            const newSupersetGroups = { ...supersetGroups };
            
            // Find all exercises at their new positions
            const newIndices = [];
            for (let i = 0; i < removedExercises.length; i++) {
                newIndices.push(adjustedTargetIndex + i);
            }
            
            // Update the superset group with the new indices
            newSupersetGroups[groupId] = newIndices;
            setSupersetGroups(newSupersetGroups);
            
            // Update order_in_workout for all exercises
            return result.map((ex, index) => ({
                ...ex,
                order_in_workout: index + 1
            }));
        });
        
        // Update activeExerciseIndex if necessary
        if (exerciseIndices.includes(activeExerciseIndex!)) {
            const relativePosition = activeExerciseIndex! - Math.min(...exerciseIndices);
            setActiveExerciseIndex(targetIndex + relativePosition);
        }
    };

    // 1. Add new function to handle direct page navigation
    const goToPage = (pageNumber: number) => {
        const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE) || 1;
        const targetPage = Math.max(1, Math.min(pageNumber, totalPages));
        setPage(targetPage);
    };

    // 2. Add a function to go to first page
    const goToFirstPage = () => {
        setPage(1);
    };

    // 3. Update the search function to reset page to 1
    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1); // Reset to page 1 when search query changes
    };

    // Add a function to fetch equipment options
    const fetchEquipmentOptionsFromAPI = useCallback(async () => {
        try {
            const equipmentOptions = await fetchEquipmentOptions();
            setEquipmentOptions(equipmentOptions);
        } catch (err) {
            console.error('Error in fetchEquipmentOptions:', err);
        }
    }, []);

    // Fetch equipment options when component mounts
    useEffect(() => {
        fetchEquipmentOptionsFromAPI();
    }, [fetchEquipmentOptionsFromAPI]);

    // Add effect to fetch gender options
    useEffect(() => {
        const loadGenderOptions = async () => {
            try {
                const options = await fetchGenderOptions();
                setGenderOptions(options);
            } catch (err) {
                console.error('Error loading gender options:', err);
            }
        };
        
        loadGenderOptions();
    }, []);
    
    // Add handler for gender selection
    const handleGenderChange = (gender: string | null) => {
        setSelectedGender(gender);
        
        // Keep the female checkbox in sync
        setShowFemaleExercises(gender === 'Female');
        
        setPage(1); // Reset to page 1 when filter changes
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
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchQueryChange}
                                    placeholder="Search for exercises..."
                                    className="w-full bg-transparent focus:outline-none dark:text-white pl-10 pr-4"
                                />
                            </div>
                        </div>
                        
                        <div className="mb-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center text-sm text-gray-700 dark:text-gray-300"
                            >
                                <FiFilter className="mr-2" />
                                Filter
                                {showFilters ? <FiChevronUp className="ml-2" /> : <FiChevronDown className="ml-2" />}
                            </button>
                            
                            {showFilters && (
                                <div className="p-2 mt-2 rounded-md bg-gray-50 dark:bg-gray-700">
                                    <div className="border-gray-200 dark:border-gray-600">
                                        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Muscle Group</h4>
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="radio"
                                                id="all-categories"
                                                checked={selectedCategory === null}
                                                onChange={() => handleCategoryChange(null)}
                                                className="mr-2"
                                            />
                                            <label htmlFor="all-categories" className="text-sm dark:text-white">All Muscle Groups</label>
                                        </div>
                                    
                                        {categories.map((category) => (
                                            <div key={category.name} className="flex items-center mb-2">
                                                <input
                                                    type="radio"
                                                    id={`category-${category.name}`}
                                                    checked={selectedCategory === category.name}
                                                    onChange={() => handleCategoryChange(category.name)}
                                                    className="mr-2"
                                                />
                                                <label htmlFor={`category-${category.name}`} className="text-sm dark:text-white">
                                                    {category.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Equipment Filter Section */}
                                    {equipmentOptions.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Equipment</h4>
                                            <div className="flex items-center mb-2">
                                                <input
                                                    type="radio"
                                                    id="all-equipment"
                                                    checked={selectedEquipment === null}
                                                    onChange={() => setSelectedEquipment(null)}
                                                    className="mr-2"
                                                />
                                                <label htmlFor="all-equipment" className="text-sm dark:text-white">All Equipment</label>
                                            </div>
                                            
                                            {equipmentOptions.map((equipment, idx) => (
                                                <div key={`equipment-${idx}`} className="flex items-center mb-2">
                                                    <input
                                                        type="radio"
                                                        id={`equipment-${idx}`}
                                                        checked={selectedEquipment === equipment}
                                                        onChange={() => setSelectedEquipment(equipment)}
                                                        className="mr-2"
                                                    />
                                                    <label htmlFor={`equipment-${idx}`} className="text-sm capitalize dark:text-white">
                                                        {equipment}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Gender Filter Section */}
                                    {genderOptions.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Gender</h4>
                                            <div className="flex items-center mb-2">
                                                <input
                                                    type="radio"
                                                    id="all-genders"
                                                    checked={selectedGender === null}
                                                    onChange={() => handleGenderChange(null)}
                                                    className="mr-2"
                                                />
                                                <label htmlFor="all-genders" className="text-sm dark:text-white">All Genders</label>
                                            </div>
                                            
                                            {genderOptions.map((gender, idx) => (
                                                <div key={`gender-${idx}`} className="flex items-center mb-2">
                                                    <input
                                                        type="radio"
                                                        id={`gender-${idx}`}
                                                        checked={selectedGender === gender}
                                                        onChange={() => handleGenderChange(gender)}
                                                        className="mr-2"
                                                    />
                                                    <label htmlFor={`gender-${idx}`} className="text-sm capitalize dark:text-white">
                                                        {gender}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                        
                        <div className="flex flex-col space-y-2">
                            {memoizedLocalExercises.map((localExercise, index) => (
                                <DraggableExerciseCard
                                    key={searchResults[index].id}
                                    exercise={localExercise}
                                    onClick={() => handleAddExercise(searchResults[index])}
                                />
                            ))}
                        </div>
                        
                        {(page > 1 || hasMore) && (
                            <div className="flex items-center justify-between mt-4 space-x-2">
                                <button
                                    onClick={goToFirstPage}
                                    disabled={page <= 1}
                                    className={`px-2 py-1 text-sm rounded ${
                                        page <= 1 
                                            ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                                            : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-400'
                                    }`}
                                    title="First Page"
                                >
                                    <span className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                        </svg>
                                    </span>
                                </button>
                                
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
                                
                                <div className="flex items-center space-x-1">
                                    <input
                                        type="number"
                                        min="1"
                                        max={Math.ceil(totalResults / RESULTS_PER_PAGE) || 1}
                                        value={page}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10);
                                            if (!isNaN(value)) {
                                                goToPage(value);
                                            }
                                        }}
                                        className="w-12 px-1 py-1 text-center text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded dark:text-white"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        of {Math.ceil(totalResults / RESULTS_PER_PAGE) || 1}
                                    </span>
                                </div>
                                
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

                        {/* Add Workout Notes/Description Field */}
                        <div className="mt-4">
                            <label htmlFor="description" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Workout Notes
                            </label>
                            <textarea
                                id="description"
                                {...register('description')}
                                rows={3}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Add general notes about this workout (goals, focus areas, etc.)"
                            ></textarea>
                        </div>
                    </div>
                                    
                        {/* Exercise List with Enhanced Drop Zone and Drag Functionality */}
                        <div 
                            ref={mainDropAreaRef}
                            className={`${DROP_ZONE_BASE_CLASS} ${isOver ? DROP_ZONE_HOVER_CLASS : DROP_ZONE_ACTIVE_CLASS}`}
                            onMouseLeave={() => setHoveringIndex(null)}
                        >
                            {/* Toggle button for expanding/collapsing all exercises */}
                            {exercises.length > 0 && (
                                <div className="flex justify-end mb-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (allExercisesExpanded) {
                                                // Collapse all exercises
                                                setActiveExerciseIndex(null);
                                            } else {
                                                // Expand all exercises (set to a special value that means "all")
                                                // We'll handle this in the rendering logic
                                                setAllExercisesExpanded(true);
                                            }
                                            setAllExercisesExpanded(!allExercisesExpanded);
                                        }}
                                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md flex items-center text-gray-700 dark:text-gray-300"
                                    >
                                        {allExercisesExpanded ? (
                                            <>
                                                <FiChevronUp className="mr-1" /> 
                                                Collapse All Exercises
                                            </>
                                        ) : (
                                            <>
                                                <FiChevronDown className="mr-1" /> 
                                                Expand All Exercises
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* First drop zone at the top */}
                            <ExerciseDropZone 
                                onDrop={handleExerciseDrop} 
                                index={0} 
                                isOver={hoveringIndex === 0}
                                isDragging={isDraggingAny}
                            />

                            {exercises.map((exercise, index) => (
                                                <React.Fragment key={index}>
                                                    <DraggableWorkoutExercise
                                                        exercise={exercise}
                                                        index={index}
                                        activeExerciseIndex={allExercisesExpanded ? index : activeExerciseIndex}
                                        setActiveExerciseIndex={(idx) => {
                                            // If we're in "all expanded" mode and trying to collapse one,
                                            // exit "all expanded" mode
                                            if (allExercisesExpanded && idx === null) {
                                                setAllExercisesExpanded(false);
                                            }
                                            setActiveExerciseIndex(idx);
                                        }}
                                                        handleRemoveExercise={handleRemoveExercise}
                                                        renderExerciseDetails={renderExerciseDetails}
                                        isSelected={selectedExerciseIndices.includes(index)}
                                        onSelect={() => handleExerciseSelection(index)}
                                        supersetInfo={getSupersetInfo(index)}
                                        onRemoveFromSuperset={handleRemoveFromSuperset}
                                    />
                                    
                                    {/* Only add drop zone if this isn't part of a superset, or it's the last in a superset */}
                                    {(!isInSuperset(index) || getSupersetInfo(index)?.isLast) && (
                                                        <ExerciseDropZone
                                            onDrop={handleExerciseDrop} 
                                                            index={index + 1}
                                            isOver={hoveringIndex === index + 1}
                                            isDragging={isDraggingAny}
                                                        />
                                                    )}
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
                        <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                                onClick={handleAddExerciseClick}
                                className="flex items-center justify-center flex-1 py-2 font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300"
                    >
                                <FiPlus className="mr-2" /> Add Exercise
                    </button>
                            
                    <button
                                type="button"
                                onClick={handleCreateSuperset}
                                disabled={selectedExerciseIndices.length < 2}
                                className={`flex items-center justify-center flex-1 py-2 font-medium rounded-md 
                                    ${selectedExerciseIndices.length < 2 
                                        ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800'}`}
                            >
                                Create {selectedExerciseIndices.length === 2 ? 'Bi-Set' : 
                                       selectedExerciseIndices.length === 3 ? 'Tri-Set' : 
                                       'Superset'} ({selectedExerciseIndices.length})
                    </button>
                </div>
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