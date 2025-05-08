import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { RiPlayListAddLine, RiEdit2Line, RiDeleteBin6Line, RiSave3Line } from 'react-icons/ri';
import { FaDumbbell } from 'react-icons/fa';
import FormInput from '../ui/FormInput';
import { WorkoutAdminData, ExerciseInstanceAdminData, SetType, ExerciseGroupType, ExerciseSet } from '../../types/adminTypes';
import WorkoutForm from './WorkoutForm';
import { FiSearch, FiPlus } from 'react-icons/fi';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import WorkoutArrangement from './WorkoutArrangement';
import { z } from 'zod';

// Basic type for template list item
interface ProgramTemplateListItem {
    id: string;
    name: string;
    phase: string | null;
    weeks: number;
    created_at: string;
    description: string | null; // This is the field for template notes
}

// Define simple form data type (matching input values)
interface TemplateFormData {
    name: string;
    phase: string | null; // Keep nullable if needed
    weeks: string; // Store as string from input
    description: string | null; // This field serves as template notes
}

// Define Zod schema separately for manual validation
const templateSchema = z.object({
    name: z.string().min(1, 'Template name is required'),
    phase: z.string().trim().optional().nullable(),
    weeks: z.string({ required_error: 'Weeks duration is required' })
            .min(1, 'Weeks duration is required')
            .regex(/^\d+$/, 'Weeks must be a positive whole number')
            .transform(Number)
            .refine(val => val > 0, { message: 'Weeks must be greater than 0' }),
    description: z.string().trim().optional().nullable(), // Template notes field (existing)
});

const ProgramBuilder: React.FC = () => {
    const [templates, setTemplates] = useState<ProgramTemplateListItem[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<ProgramTemplateListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplateListItem | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    // State for workouts of the selected template
    const [currentWorkouts, setCurrentWorkouts] = useState<WorkoutAdminData[]>([]);
    const [isLoadingWorkouts, setIsLoadingWorkouts] = useState<boolean>(false);
    // State for workout form
    const [editingWorkout, setEditingWorkout] = useState<WorkoutAdminData | null>(null);
    const [selectedWorkout, setSelectedWorkout] = useState<WorkoutAdminData | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const profile = useSelector(selectProfile);

    // React Hook Form methods - remove resolver
    const methods = useForm<TemplateFormData>({
        // resolver: zodResolver(templateSchema),
        defaultValues: { name: '', phase: '', weeks: '', description: '' } 
    });
    const { handleSubmit, reset, setError: setFormError, register } = methods; // Add setFormError and register

    // Fetch existing templates created by the current coach
    useEffect(() => {
        const fetchTemplates = async () => {
            if (!profile || !profile.id) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from('program_templates')
                    .select('id, name, phase, weeks, created_at, description')
                    .eq('coach_id', profile.id)
                    .order('created_at', { ascending: false });
                
                if (fetchError) throw fetchError;
                setTemplates(data || []);

            } catch (err: unknown) {
                console.error("Error fetching program templates:", err);
                setError('Failed to load templates.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTemplates();
    }, [profile]);

    // Effect to populate form when editing
    useEffect(() => {
        if (selectedTemplate) {
            reset({
                name: selectedTemplate.name,
                phase: selectedTemplate.phase || '',
                weeks: selectedTemplate.weeks.toString(),
                description: selectedTemplate.description || ''
            });
        } else {
             reset({ name: '', phase: '', weeks: '', description: '' });
        }
    }, [selectedTemplate, reset]);

    // Fetch workouts when a template is selected for editing
    useEffect(() => {
        fetchWorkoutsForTemplate();
    }, [selectedTemplate]); // Depend on selectedTemplate

    // Add search filtering
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTemplates(templates);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = templates.filter(
            template => 
                template.name.toLowerCase().includes(query) || 
                (template.phase && template.phase.toLowerCase().includes(query))
        );
        setFilteredTemplates(filtered);
    }, [searchQuery, templates]);

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedTemplate(null);
        reset({ name: '', phase: '', weeks: '', description: '' });
    };

    const handleEdit = (template: ProgramTemplateListItem) => {
        setSelectedTemplate(template);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setSelectedTemplate(null);
        setCurrentWorkouts([]); // Clear workouts when cancelling
        reset({ name: '', phase: '', weeks: '', description: '' });
    };

    // Save handler with manual validation
    const handleSaveTemplate: SubmitHandler<TemplateFormData> = async (formData) => {
        if (!profile || !profile.id) {
             setError('Cannot save template: User profile not loaded.');
             return; 
        }
        setError(null); // Clear general error
         // Clear previous form errors
        Object.keys(formData).forEach(key => setFormError(key as keyof TemplateFormData, {}));

        try {
            // --- Manual Zod Validation ---
            const validationResult = templateSchema.safeParse(formData);
            if (!validationResult.success) {
                // Populate form errors from Zod issues
                validationResult.error.errors.forEach((err) => {
                    if (err.path.length > 0) {
                         setFormError(err.path[0] as keyof TemplateFormData, { 
                             type: 'manual', 
                             message: err.message 
                         });
                    }
                });
                return; // Stop submission
            }
            // --- Validation Passed ---

            // Use validated data (includes transformed `weeks` as number)
            const validatedData = validationResult.data;
            
            const coachProfileId = profile.id;
            const payload = { ...validatedData, coach_id: coachProfileId };
            let resultError;

            if (isCreating) {
                 const { error } = await supabase.from('program_templates').insert(payload);
                resultError = error;
            } else if (selectedTemplate) {
                 const { error } = await supabase
                    .from('program_templates')
                    .update(payload)
                    .eq('id', selectedTemplate.id);
                resultError = error;
            }

            if (resultError) throw resultError;
            
            // ... Success: Refetch list, close form ...
            // (Refetch logic needs to be extracted or repeated here)
             const { data, error: fetchError } = await supabase
                    .from('program_templates')
                    .select('id, name, phase, weeks, created_at, description')
                    .eq('coach_id', coachProfileId)
                    .order('created_at', { ascending: false });
            if (fetchError) {
                 setError('Template saved, but failed to refresh list.');
            } else {
                 setTemplates(data || []);
            }
            handleCancel(); 

        } catch (err: unknown) {
             console.error("Error saving template:", err);
             setError('Failed to save template.'); // Show general error
        }
    };

    // --- Workout Handlers ---
    const handleAddWorkout = () => {
        // Create an empty workout object to use for a new workout
        const emptyWorkout: WorkoutAdminData = {
            name: "New Workout",
            day_of_week: null,
            week_number: null,
            order_in_program: currentWorkouts.length,
            description: null,
            exercise_instances: []
        };
        
        // Set both selected and editing workout to our empty workout
        setSelectedWorkout(emptyWorkout);
        setEditingWorkout(emptyWorkout);
    };

    const handleCloseWorkoutModal = () => {
        setSelectedWorkout(null);
        setEditingWorkout(null);
    };

    const handleSaveWorkout = async (
        workoutFormData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'>, 
        exercises: ExerciseInstanceAdminData[], // Receive exercises from form
        workoutId?: string
    ) => {
        if (!selectedTemplate || !selectedTemplate.id) {
            setError('Cannot save workout: No program template selected.');
            return;
        }
        
        try {
            let savedWorkoutId = workoutId;
            
            // 1. Create or update the workout
            if (!workoutId) {
                // INSERT new workout
                const { data, error } = await supabase
                    .from('workouts')
                    .insert({
                        ...workoutFormData,
                        program_template_id: selectedTemplate.id
                    })
                    .select('id')
                    .single();
                    
                if (error) throw error;
                if (!data?.id) throw new Error('No workout ID returned from insert');
                
                savedWorkoutId = data.id;
            } else {
                // UPDATE existing workout
                const { error } = await supabase
                    .from('workouts')
                    .update(workoutFormData)
                    .eq('id', workoutId);
                    
                if (error) throw error;
            }
            
            // 2. If we got here, we have a valid workout ID
            if (!savedWorkoutId) throw new Error('Missing workout ID for exercise save');
            
            // 3. When updating, we need to get existing exercise instance IDs before deleting them
            // so we can delete related sets
            let existingExerciseIds: string[] = [];
            if (workoutId) {
                const { data: existingExercises, error: fetchError } = await supabase
                    .from('exercise_instances')
                    .select('id')
                    .eq('workout_id', workoutId);
                    
                if (fetchError) throw fetchError;
                
                existingExerciseIds = existingExercises?.map(ex => ex.id) || [];
                
                // 3.1 Delete all existing exercise sets first
                if (existingExerciseIds.length > 0) {
                    const { error: deleteSetsError } = await supabase
                        .from('exercise_sets')
                        .delete()
                        .in('exercise_instance_id', existingExerciseIds);
                        
                    if (deleteSetsError) throw deleteSetsError;
                }
                
                // 3.2 Now delete the exercise instances
                const { error: deleteExercisesError } = await supabase
                    .from('exercise_instances')
                    .delete()
                    .eq('workout_id', workoutId);
                    
                if (deleteExercisesError) throw deleteExercisesError;
            }
            
            // 4. Insert all current exercises and keep track of their IDs
            const newExerciseIds: Map<number, string> = new Map();
            
            if (exercises.length > 0) {
                // 4.1 Prepare the exercise instance data with the workout_id
                const exerciseData = exercises.map(exercise => {
                    // Create a type that includes workout_id for database operations
                    interface ExerciseInstanceForDb extends Omit<ExerciseInstanceAdminData, 'sets_data'> {
                        workout_id: string;
                    }
                    
                    // Create a more specific interface for internal use that includes superset fields
                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                        superset_group_id?: string | null;
                        superset_order?: number;
                    }
                    
                    // Safely access potential superset fields
                    const exerciseWithSuperset = exercise as ExerciseWithSupersetFields;
                    
                    const baseExerciseData = {
                        exercise_db_id: exercise.exercise_db_id,
                        exercise_name: exercise.exercise_name,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        rest_period_seconds: exercise.rest_period_seconds,
                        tempo: exercise.tempo,
                        notes: exercise.notes,
                        order_in_workout: exercise.order_in_workout,
                        set_type: exercise.set_type,
                        each_side: exercise.each_side || false,
                        // Map superset fields to group fields
                        group_id: exerciseWithSuperset.superset_group_id || exercise.group_id || null,
                        group_type: exercise.set_type === SetType.SUPERSET ? ExerciseGroupType.SUPERSET : (exercise.group_type || ExerciseGroupType.NONE),
                        group_order: exerciseWithSuperset.superset_order || exercise.group_order || 0,
                        workout_id: savedWorkoutId
                    };
                    
                    // Only include ID if it exists and is not null
                    const exerciseForDb: ExerciseInstanceForDb = exercise.id 
                        ? { ...baseExerciseData, id: exercise.id } 
                        : { ...baseExerciseData, id: uuidv4() }; // Generate a new UUID for new exercises
                    
                    return exerciseForDb;
                });
                
                // 4.2 Insert exercise instances and get their IDs
                console.log('Inserting exercise instances:', exerciseData);
                const { data: insertedExercises, error: insertError } = await supabase
                    .from('exercise_instances')
                    .insert(exerciseData)
                    .select('id, order_in_workout');
                    
                if (insertError) {
                    console.error('Error inserting exercise instances:', insertError);
                    throw insertError;
                }
                
                console.log('Inserted exercise instances:', insertedExercises);
                
                if (insertedExercises) {
                    // Create a map of position to ID for referencing when creating sets
                    insertedExercises.forEach(ex => {
                        if (ex.order_in_workout !== null) {
                            newExerciseIds.set(ex.order_in_workout, ex.id);
                        }
                    });
                }
                
                // 5. Now insert all exercise sets
                const allSetsToInsert = [];
                
                for (let i = 0; i < exercises.length; i++) {
                    const exercise = exercises[i];
                    const exerciseId = newExerciseIds.get(exercise.order_in_workout || 0);
                    
                    console.log(`Processing exercise ${i+1}/${exercises.length}:`, exercise.exercise_name);
                    console.log(`Exercise ID mapped: ${exerciseId}`);
                    console.log(`Exercise has ${exercise.sets_data?.length || 0} sets`);
                    console.log(`Exercise group type: ${exercise.group_type || 'none'}`);
                    
                    if (exerciseId && exercise.sets_data && exercise.sets_data.length > 0) {
                        // Map each set to include the exercise_instance_id
                        const setData = exercise.sets_data.map(set => ({
                            exercise_instance_id: exerciseId,
                            set_order: set.set_order,
                            type: set.type,
                            reps: set.reps || null,
                            weight: set.weight || null,
                            rest_seconds: set.rest_seconds || null,
                            duration: set.duration || null
                        }));
                        
                        console.log('Sets to insert:', JSON.stringify(setData));
                        allSetsToInsert.push(...setData);
                    } else {
                        console.warn(`No sets to insert for exercise ${exercise.exercise_name}:`, {
                            hasExerciseId: !!exerciseId,
                            hasSetsData: !!exercise.sets_data,
                            setsCount: exercise.sets_data?.length || 0
                        });
                    }
                }
                
                // Insert all sets in a batch if we have any
                if (allSetsToInsert.length > 0) {
                    console.log(`Inserting ${allSetsToInsert.length} sets...`);
                    const { data: insertedSets, error: insertSetsError } = await supabase
                        .from('exercise_sets')
                        .insert(allSetsToInsert)
                        .select();
                        
                    if (insertSetsError) {
                        console.error('Error inserting exercise sets:', insertSetsError);
                        throw insertSetsError;
                    }
                    
                    console.log(`Successfully inserted ${insertedSets?.length || 0} sets`);
                } else {
                    console.warn('No sets to insert for any exercises');
                }
            }
            
            // 6. Refetch workouts to update the list
            const { data: refreshedWorkouts, error: refreshError } = await supabase
                .from('workouts')
                .select(`
                    *, 
                    exercise_instances(*)
                `)
                .eq('program_template_id', selectedTemplate.id)
                .order('order_in_program', { ascending: true })
                .order('order_in_workout', { foreignTable: 'exercise_instances', ascending: true });
                
            if (refreshError) {
                setError('Workout saved, but failed to refresh workout list.');
            } else if (refreshedWorkouts) {
                // Get all exercise instance IDs
                const exerciseInstanceIds: string[] = [];
                refreshedWorkouts.forEach(workout => {
                    if (workout.exercise_instances && workout.exercise_instances.length > 0) {
                        workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                            if (instance.id) {
                                exerciseInstanceIds.push(instance.id);
                            }
                        });
                    }
                });
                
                console.log('Fetching exercise sets for refreshed workout data:', exerciseInstanceIds);
                
                // Fetch all exercise sets for these instances
                if (exerciseInstanceIds.length > 0) {
                    const { data: setsData, error: setsError } = await supabase
                        .from('exercise_sets')
                        .select('*')
                        .in('exercise_instance_id', exerciseInstanceIds)
                        .order('set_order', { ascending: true });
                        
                    if (setsError) {
                        console.error('Error fetching exercise sets:', setsError);
                    } else if (setsData) {
                        console.log('Fetched exercise sets for refresh:', setsData);
                        
                        // Group sets by exercise instance ID
                        const setsByExerciseId = new Map<string, ExerciseSet[]>();
                        
                        setsData.forEach(set => {
                            const exerciseId = set.exercise_instance_id;
                            if (!setsByExerciseId.has(exerciseId)) {
                                setsByExerciseId.set(exerciseId, []);
                            }
                            
                            setsByExerciseId.get(exerciseId)?.push({
                                id: set.id,
                                set_order: set.set_order,
                                type: set.type as SetType,
                                reps: set.reps || undefined,
                                weight: set.weight || undefined,
                                rest_seconds: set.rest_seconds || undefined,
                                duration: set.duration || undefined
                            });
                        });
                        
                        // Attach sets to their respective exercise instances
                        refreshedWorkouts.forEach(workout => {
                            if (workout.exercise_instances) {
                                // First, identify all group IDs and create a mapping of exercises within each group
                                const exerciseGroups = new Map<string, ExerciseInstanceAdminData[]>();
                                
                                // Pre-process to identify all groups
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        if (!exerciseGroups.has(instance.group_id)) {
                                            exerciseGroups.set(instance.group_id, []);
                                        }
                                        exerciseGroups.get(instance.group_id)?.push(instance);
                                    }
                                });
                                
                                // Process each exercise - attach sets and map group fields to superset fields
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    // Attach sets if available
                                    if (instance.id && setsByExerciseId.has(instance.id)) {
                                        instance.sets_data = setsByExerciseId.get(instance.id);
                                        console.log(`Attached ${instance.sets_data?.length} sets to ${instance.exercise_name}`);
                                    }
                                    
                                    // Map group fields to superset fields for the UI component
                                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                                        superset_group_id?: string | null;
                                        superset_order?: number;
                                    }
                                    
                                    const instanceWithSuperset = instance as ExerciseWithSupersetFields;
                                    
                                    // If part of a superset group, set superset fields
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        instanceWithSuperset.superset_group_id = instance.group_id;
                                        instanceWithSuperset.superset_order = instance.group_order;
                                    }
                                });
                                
                                // Sort exercise instances by order_in_workout for normal display
                                workout.exercise_instances.sort((a: ExerciseInstanceAdminData, b: ExerciseInstanceAdminData) => 
                                    (a.order_in_workout || 0) - (b.order_in_workout || 0)
                                );
                            }
                        });
                    }
                }
                
                setCurrentWorkouts(refreshedWorkouts);
            } else {
                setCurrentWorkouts([]);
            }
            
            // 7. Close workout form
            handleCloseWorkoutModal();
            
        } catch (err: unknown) {
            console.error("Error saving workout:", err);
            setError('Failed to save workout.');
        }
    };

    // Fix the duplicateWorkout function to properly refer to the existing fetchWorkoutsForTemplate function
    const duplicateWorkout = async (workout: WorkoutAdminData, targetDayOfWeek: number) => {
        if (!selectedTemplate || !selectedTemplate.id) {
            setError('Cannot duplicate workout: No program template selected.');
            return;
        }

        try {
            setIsLoading(true);
            console.log('Starting workout duplication:', workout.name);
            
            // Create a new workout object without ID (to create a new record)
            const newWorkoutData = {
                program_template_id: selectedTemplate.id,
                name: `${workout.name} (Copy)`,
                day_of_week: targetDayOfWeek,
                week_number: workout.week_number,
                order_in_program: workout.order_in_program,
                description: workout.description
            };

            // 1. Insert the new workout
            const { data: newWorkout, error: workoutError } = await supabase
                .from('workouts')
                .insert(newWorkoutData)
                .select('id')
                .single();

            if (workoutError) throw workoutError;
            if (!newWorkout?.id) throw new Error('No workout ID returned from insert');

            console.log('Created new workout with ID:', newWorkout.id);
            const newWorkoutId = newWorkout.id;

            // 2. Get the original workout's exercise instances
            const { data: exerciseInstances, error: exercisesError } = await supabase
                .from('exercise_instances')
                .select('*')
                .eq('workout_id', workout.id);

            if (exercisesError) throw exercisesError;
            
            if (!exerciseInstances || exerciseInstances.length === 0) {
                console.log('No exercise instances to duplicate');
                // No exercises to duplicate, just return the new workout
                // Refresh the workout list
                if (selectedTemplate) {
                    await fetchWorkoutsForTemplate();
                }
                setIsLoading(false);
                setSuccess(`Duplicated workout "${workout.name}" to ${getDayName(targetDayOfWeek)}`);
                return;
            }

            console.log(`Found ${exerciseInstances.length} exercise instances to duplicate`);

            // 3. Create new exercise instances for the duplicated workout
            const newExerciseData = exerciseInstances.map(exercise => ({
                ...exercise,
                id: uuidv4(), // Generate a new UUID instead of undefined
                workout_id: newWorkoutId // Set to the new workout ID
            }));

            // 4. Insert the new exercise instances
            const { data: newExercises, error: newExercisesError } = await supabase
                .from('exercise_instances')
                .insert(newExerciseData)
                .select('id, exercise_db_id');

            if (newExercisesError) {
                console.error('Error inserting exercise instances:', newExercisesError);
                throw newExercisesError;
            }
            
            if (!newExercises || newExercises.length === 0) {
                console.error('No exercise instances were created.');
                throw new Error('Failed to create exercise instances');
            }
            
            console.log(`Created ${newExercises.length} new exercise instances`);
            
            // Create a mapping from old exercise IDs to new exercise IDs
            const exerciseIdMap = new Map<string, string>();
            
            for (let i = 0; i < exerciseInstances.length; i++) {
                if (newExercises && newExercises[i]) {
                    exerciseIdMap.set(exerciseInstances[i].id, newExercises[i].id);
                    console.log(`Mapped old exercise ID ${exerciseInstances[i].id} to new ID ${newExercises[i].id}`);
                }
            }

            // 5. Get all exercise sets for the original exercise instances
            const originalExerciseIds = exerciseInstances.map(e => e.id);
            
            console.log('Fetching sets for original exercise IDs:', originalExerciseIds);
            const { data: exerciseSets, error: setsError } = await supabase
                .from('exercise_sets')
                .select('*')
                .in('exercise_instance_id', originalExerciseIds);

            if (setsError) {
                console.error('Error fetching exercise sets:', setsError);
                throw setsError;
            }

            console.log(`Found ${exerciseSets?.length || 0} exercise sets to duplicate`);

            if (exerciseSets && exerciseSets.length > 0) {
                // 6. Create new exercise sets for the duplicated exercise instances
                const newSetsData = exerciseSets.map(set => {
                    const newExerciseId = exerciseIdMap.get(set.exercise_instance_id);
                    if (!newExerciseId) {
                        console.error(`Failed to find mapping for exercise instance ID: ${set.exercise_instance_id}`);
                    }
                    
                    return {
                        ...set,
                        id: uuidv4(), // Generate a new UUID for each set too
                        exercise_instance_id: newExerciseId // Map to new exercise ID
                    };
                });
                
                console.log('Inserting new sets data:', newSetsData);

                // 7. Insert the new exercise sets
                const { data: insertedSets, error: newSetsError } = await supabase
                    .from('exercise_sets')
                    .insert(newSetsData)
                    .select();

                if (newSetsError) {
                    console.error('Error inserting new sets:', newSetsError);
                    throw newSetsError;
                }
                
                console.log(`Successfully created ${insertedSets?.length || 0} new exercise sets`);
            } else {
                console.log('No exercise sets found to duplicate');
            }

            // 8. Refresh the workouts to show the newly duplicated one
            if (selectedTemplate) {
                await fetchWorkoutsForTemplate();
            }
            
            setSuccess(`Duplicated workout "${workout.name}" to ${getDayName(targetDayOfWeek)}`);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
            
        } catch (err) {
            console.error('Error duplicating workout:', err);
            setError('Failed to duplicate workout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to get day name from day number
    const getDayName = (dayOfWeek: number): string => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days[dayOfWeek - 1] || 'Unknown';
    };

    const handleDeleteTemplate = async (templateId: string) => {
        try {
            // 1. First get all workouts for this template
            const { data: workouts, error: workoutsError } = await supabase
                .from('workouts')
                .select('id')
                .eq('program_template_id', templateId);
                
            if (workoutsError) throw workoutsError;
            
            // 2. Delete all exercise instances for all workouts
            if (workouts && workouts.length > 0) {
                const workoutIds = workouts.map(w => w.id);
                
                const { error: exercisesError } = await supabase
                    .from('exercise_instances')
                    .delete()
                    .in('workout_id', workoutIds);
                    
                if (exercisesError) throw exercisesError;
                
                // 3. Delete all workouts
                const { error: deleteWorkoutsError } = await supabase
                    .from('workouts')
                    .delete()
                    .in('id', workoutIds);
                    
                if (deleteWorkoutsError) throw deleteWorkoutsError;
            }
            
            // 4. Finally delete the template
            const { error: deleteTemplateError } = await supabase
                .from('program_templates')
                .delete()
                .eq('id', templateId);
                
            if (deleteTemplateError) throw deleteTemplateError;
            
            // 5. Update local state
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            
            if (selectedTemplate?.id === templateId) {
                handleCancel(); // Reset form & selection
            }
            
        } catch (err: unknown) {
            console.error("Error deleting template:", err);
            setError('Failed to delete template.');
        } finally {
            setShowDeleteConfirm(null); // Reset confirmation dialog
        }
    };

    const selectWorkout = (workout: WorkoutAdminData) => {
        setSelectedWorkout(workout);
        setEditingWorkout(workout);
    };

    // Add a reusable function for fetching workouts
    const fetchWorkoutsForTemplate = async () => {
        if (!selectedTemplate) {
            setCurrentWorkouts([]);
            return;
        }
        setIsLoadingWorkouts(true);
        try {
            // Enhanced query to fetch workouts and exercise instances
            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    *, 
                    exercise_instances(*)
                `)
                .eq('program_template_id', selectedTemplate.id)
                .order('order_in_program', { ascending: true })
                .order('order_in_workout', { foreignTable: 'exercise_instances', ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                console.log('*** DETAILED PROGRAM DATA ***');
                console.log('Raw workout data:', JSON.stringify(data, null, 2));
                
                // Get all exercise instance IDs
                const exerciseInstanceIds: string[] = [];
                data.forEach(workout => {
                    if (workout.exercise_instances && workout.exercise_instances.length > 0) {
                        workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                            if (instance.id) {
                                exerciseInstanceIds.push(instance.id);
                            }
                        });
                    }
                });
                
                console.log('Fetching exercise sets for instances:', exerciseInstanceIds);
                
                // Fetch all exercise sets for these instances
                if (exerciseInstanceIds.length > 0) {
                    const { data: setsData, error: setsError } = await supabase
                        .from('exercise_sets')
                        .select('*')
                        .in('exercise_instance_id', exerciseInstanceIds)
                        .order('set_order', { ascending: true });
                        
                    if (setsError) {
                        console.error('Error fetching exercise sets:', setsError);
                    } else if (setsData) {
                        console.log('Fetched exercise sets:', setsData);
                        
                        // Group sets by exercise instance ID
                        const setsByExerciseId = new Map<string, ExerciseSet[]>();
                        
                        setsData.forEach(set => {
                            const exerciseId = set.exercise_instance_id;
                            if (!setsByExerciseId.has(exerciseId)) {
                                setsByExerciseId.set(exerciseId, []);
                            }
                            
                            setsByExerciseId.get(exerciseId)?.push({
                                id: set.id,
                                set_order: set.set_order,
                                type: set.type as SetType,
                                reps: set.reps || undefined,
                                weight: set.weight || undefined,
                                rest_seconds: set.rest_seconds || undefined,
                                duration: set.duration || undefined
                            });
                        });
                        
                        // Attach sets to their respective exercise instances
                        data.forEach(workout => {
                            if (workout.exercise_instances) {
                                // First, identify all group IDs and create a mapping of exercises within each group
                                const exerciseGroups = new Map<string, ExerciseInstanceAdminData[]>();
                                
                                // Pre-process to identify all groups
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        if (!exerciseGroups.has(instance.group_id)) {
                                            exerciseGroups.set(instance.group_id, []);
                                        }
                                        exerciseGroups.get(instance.group_id)?.push(instance);
                                    }
                                });
                                
                                // Process each exercise - attach sets and map group fields to superset fields
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    // Attach sets if available
                                    if (instance.id && setsByExerciseId.has(instance.id)) {
                                        instance.sets_data = setsByExerciseId.get(instance.id);
                                        console.log(`Attached ${instance.sets_data?.length} sets to ${instance.exercise_name}`);
                                    }
                                    
                                    // Map group fields to superset fields for the UI component
                                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                                        superset_group_id?: string | null;
                                        superset_order?: number;
                                    }
                                    
                                    const instanceWithSuperset = instance as ExerciseWithSupersetFields;
                                    
                                    // If part of a superset group, set superset fields
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        instanceWithSuperset.superset_group_id = instance.group_id;
                                        instanceWithSuperset.superset_order = instance.group_order;
                                    }
                                });
                                
                                // Sort exercise instances by order_in_workout for normal display
                                workout.exercise_instances.sort((a: ExerciseInstanceAdminData, b: ExerciseInstanceAdminData) => 
                                    (a.order_in_workout || 0) - (b.order_in_workout || 0)
                                );
                            }
                        });
                    }
                }
                
                setCurrentWorkouts(data);
            } else {
                setCurrentWorkouts([]);
            }
        } catch (err) {
            console.error("Error fetching workouts for template:", err);
            setError('Failed to load workouts for this template.');
            setCurrentWorkouts([]); // Clear workouts on error
        } finally {
            setIsLoadingWorkouts(false);
        }
    };

    // After the duplicateWorkout function, add a new deleteWorkout function
    const deleteWorkout = async (workoutId: string, workoutName: string) => {
        if (!selectedTemplate || !selectedTemplate.id) {
            setError('Cannot delete workout: No program template selected.');
            return;
        }

        try {
            setIsLoading(true);
            
            // 1. Get all exercise instances for this workout
            const { data: exerciseInstances, error: exercisesError } = await supabase
                .from('exercise_instances')
                .select('id')
                .eq('workout_id', workoutId);

            if (exercisesError) throw exercisesError;
            
            // 2. If we have exercise instances, delete all their sets first
            if (exerciseInstances && exerciseInstances.length > 0) {
                const exerciseIds = exerciseInstances.map(e => e.id);
                
                // Delete all exercise sets for these instances
                const { error: setsError } = await supabase
                    .from('exercise_sets')
                    .delete()
                    .in('exercise_instance_id', exerciseIds);

                if (setsError) throw setsError;
            }
            
            // 3. Delete all exercise instances for this workout
            const { error: deleteInstancesError } = await supabase
                .from('exercise_instances')
                .delete()
                .eq('workout_id', workoutId);
                
            if (deleteInstancesError) throw deleteInstancesError;
            
            // 4. Finally delete the workout itself
            const { error: deleteWorkoutError } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workoutId);
                
            if (deleteWorkoutError) throw deleteWorkoutError;
            
            // 5. Refresh the workouts list
            await fetchWorkoutsForTemplate();
            
            setSuccess(`Deleted workout "${workoutName}"`);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
            
        } catch (err) {
            console.error('Error deleting workout:', err);
            setError('Failed to delete workout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="container mx-auto py-6 px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Program Builder</h1>
                    
                    {!selectedTemplate && !isCreating && (
                        <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                        >
                            <FiPlus className="mr-2" /> New Template
                        </button>
                    )}
                </div>
                
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
                        <p>{error}</p>
                    </div>
                )}
                
                {success && (
                    <div className="p-4 mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-500">
                        <p>{success}</p>
                    </div>
                )}
                
                {/* Conditional render based on state */}
                {isCreating || selectedTemplate ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">
                            {isCreating ? 'Create New Template' : 'Edit Template'}
                        </h2>
                        
                        <FormProvider {...methods}>
                            <form onSubmit={handleSubmit(handleSaveTemplate)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <FormInput
                                            name="name"
                                            label="Template Name"
                                            required={true}
                                            placeholder="e.g., 12-Week Hypertrophy"
                                        />
                                    </div>
                                    <div>
                                        <FormInput
                                            name="phase"
                                            label="Training Phase"
                                            placeholder="e.g., Bulking, Cutting, Maintenance"
                                        />
                                    </div>
                                    <div>
                                        <FormInput
                                            name="weeks"
                                            label="Duration (weeks)"
                                            required={true}
                                            type="number"
                                            min="1"
                                            max="52"
                                        />
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Template Notes
                                    </label>
                                    <textarea
                                        id="description"
                                        {...register('description')}
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Add programming guidance, variations, progression ideas, etc."
                                    ></textarea>
                                </div>
                                
                                <div className="flex justify-end space-x-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Save Template
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    </div>
                ) : isLoading ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">No Templates Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Create your first program template to get started.
                        </p>
                        <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Create Template
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="relative w-64">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <FiSearch className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="pl-10 pr-4 py-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Search templates..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateNew}
                                className="px-3 py-1.5 bg-indigo-600 text-sm text-white rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <FiPlus className="mr-1" /> New
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phase</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Weeks</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {filteredTemplates.map((template) => (
                                        <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{template.phase || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{template.weeks}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(template.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleEdit(template)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(template.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {selectedTemplate && !isCreating && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold dark:text-white">
                                Workouts for: {selectedTemplate.name}
                            </h2>
                            <button
                                onClick={handleAddWorkout}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <FiPlus className="mr-1" /> Add Workout
                            </button>
                        </div>
                        
                        {isLoadingWorkouts ? (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">Loading workouts...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3">
                                    {currentWorkouts.length === 0 && !selectedWorkout ? (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                                            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">No Workouts Yet</h3>
                                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                                Add your first workout to this program template.
                                            </p>
                                            <button
                                                onClick={handleAddWorkout}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                            >
                                                Add Workout
                                            </button>
                                        </div>
                                    ) : (
                                        selectedWorkout ? (
                                            <WorkoutForm 
                                                workout={editingWorkout}
                                                onSave={handleSaveWorkout}
                                                onCancel={handleCloseWorkoutModal}
                                            />
                                        ) : (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                                                <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">Select a Workout</h3>
                                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                                    Choose a workout from the panel on the right or create a new one.
                                                </p>
                                                <button
                                                    onClick={handleAddWorkout}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                                >
                                                    Add Workout
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                                
                                <div className="lg:col-span-1">
                                    <WorkoutArrangement 
                                        workouts={currentWorkouts}
                                        onSelectWorkout={selectWorkout}
                                        selectedWorkoutId={selectedWorkout?.id}
                                        onDuplicateWorkout={duplicateWorkout}
                                        onDeleteWorkout={deleteWorkout}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white">Confirm Deletion</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Are you sure you want to delete this template? This will also delete all workouts and exercises associated with it.
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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

export default ProgramBuilder; 