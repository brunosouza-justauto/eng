import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import { z } from 'zod';
import { WorkoutAdminData, ExerciseInstanceAdminData } from '../../types/adminTypes';
import WorkoutForm from './WorkoutForm';

// Basic type for template list item
interface ProgramTemplateListItem {
    id: string;
    name: string;
    phase: string | null;
    weeks: number;
    created_at: string;
}

// Define simple form data type (matching input values)
interface TemplateFormData {
    name: string;
    phase: string | null; // Keep nullable if needed
    weeks: string; // Store as string from input
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
});

const ProgramBuilder: React.FC = () => {
    const [templates, setTemplates] = useState<ProgramTemplateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplateListItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // State for workouts of the selected template
    const [currentWorkouts, setCurrentWorkouts] = useState<WorkoutAdminData[]>([]);
    const [isLoadingWorkouts, setIsLoadingWorkouts] = useState<boolean>(false);
    // State for workout modal/form
    const [showWorkoutModal, setShowWorkoutModal] = useState<boolean>(false);
    const [editingWorkout, setEditingWorkout] = useState<WorkoutAdminData | null>(null);
    const [isSavingWorkout, setIsSavingWorkout] = useState<boolean>(false);

    const profile = useSelector(selectProfile);

    // React Hook Form methods - remove resolver
    const methods = useForm<TemplateFormData>({
        // resolver: zodResolver(templateSchema),
        defaultValues: { name: '', phase: '', weeks: '' } 
    });
    const { handleSubmit, reset, formState: { errors }, setError: setFormError } = methods; // Add setFormError

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
                    .select('id, name, phase, weeks, created_at')
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
                weeks: selectedTemplate.weeks.toString()
            });
        } else {
             reset({ name: '', phase: '', weeks: '' });
        }
    }, [selectedTemplate, reset]);

    // Fetch workouts when a template is selected for editing
    useEffect(() => {
        const fetchWorkoutsForTemplate = async () => {
            if (!selectedTemplate) {
                setCurrentWorkouts([]);
                return;
            }
            setIsLoadingWorkouts(true);
            try {
                const { data, error } = await supabase
                    .from('workouts')
                    .select('*, exercise_instances(*)') // Fetch workouts and their exercises
                    .eq('program_template_id', selectedTemplate.id)
                    .order('order_in_program', { ascending: true })
                    .order('order_in_workout', { foreignTable: 'exercise_instances', ascending: true });

                if (error) throw error;
                setCurrentWorkouts(data || []);
            } catch (err) {
                console.error("Error fetching workouts for template:", err);
                setError('Failed to load workouts for this template.');
                setCurrentWorkouts([]); // Clear workouts on error
            } finally {
                setIsLoadingWorkouts(false);
            }
        };

        fetchWorkoutsForTemplate();
    }, [selectedTemplate]); // Depend on selectedTemplate

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedTemplate(null);
        reset({ name: '', phase: '', weeks: '' });
    };

    const handleEdit = (template: ProgramTemplateListItem) => {
        setSelectedTemplate(template);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setSelectedTemplate(null);
        setCurrentWorkouts([]); // Clear workouts when cancelling
        reset({ name: '', phase: '', weeks: '' });
    };

    // Save handler with manual validation
    const handleSaveTemplate: SubmitHandler<TemplateFormData> = async (formData) => {
        if (!profile || !profile.id) {
             setError('Cannot save template: User profile not loaded.');
             return; 
        }
        setIsSaving(true);
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
                setIsSaving(false);
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
                    .select('id, name, phase, weeks, created_at')
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
        } finally {
            setIsSaving(false);
        }
    };

    // --- Workout Handlers ---
    const handleAddWorkout = () => {
        setEditingWorkout(null); // Ensure we are in "add" mode
        setShowWorkoutModal(true);
    };
    const handleEditWorkout = (workoutId: string | undefined) => {
        if (!workoutId) return;
        const workoutToEdit = currentWorkouts.find(w => w.id === workoutId);
        if (workoutToEdit) {
            setEditingWorkout(workoutToEdit);
            setShowWorkoutModal(true);
        } else {
             setError('Could not find workout to edit.');
        }
    };
    const handleDeleteWorkout = async (workoutId: string | undefined) => {
        if (!workoutId || !selectedTemplate) return;
        if (window.confirm('Are you sure you want to delete this workout and its exercises?')) {
             try {
                setIsLoadingWorkouts(true); // Indicate loading during delete
                const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
                if (error) throw error;
                // Refresh workouts list
                setCurrentWorkouts(prev => prev.filter(w => w.id !== workoutId));
             } catch (err) {
                 console.error("Error deleting workout:", err);
                 setError('Failed to delete workout.');
             } finally {
                 setIsLoadingWorkouts(false);
             }
        }
    };
    const handleCloseWorkoutModal = () => {
        setShowWorkoutModal(false);
        setEditingWorkout(null);
    };

    const handleSaveWorkout = async (
        workoutFormData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'>, 
        exercises: ExerciseInstanceAdminData[], // Receive exercises from form
        workoutId?: string
    ) => {
        if (!selectedTemplate) return;
        setIsSavingWorkout(true);
        setError(null);

        let savedWorkoutId = workoutId;

        try {
            // 1. Save Workout Details (Insert or Update)
            const workoutPayload = { 
                ...workoutFormData, 
                program_template_id: selectedTemplate.id 
            };
            let workoutResultError;
            let workoutResultData: { id: string } | null = null; // Need the ID

            if (savedWorkoutId) {
                console.log('Updating workout:', savedWorkoutId, workoutPayload);
                const { data, error } = await supabase
                    .from('workouts')
                    .update(workoutPayload)
                    .eq('id', savedWorkoutId)
                    .select('id') // Just need ID back
                    .single();
                workoutResultError = error;
                workoutResultData = data;
            } else {
                console.log('Inserting workout:', workoutPayload);
                const { data, error } = await supabase
                    .from('workouts')
                    .insert(workoutPayload)
                    .select('id') 
                    .single();
                workoutResultError = error;
                workoutResultData = data;
            }

            if (workoutResultError || !workoutResultData?.id) {
                throw workoutResultError || new Error('Failed to save workout details or get ID.');
            }
            
            savedWorkoutId = workoutResultData.id; // Get the ID for exercise linking
            console.log('Workout saved with ID:', savedWorkoutId);

            // 2. Save Exercise Instances (Simplistic: Delete old, Insert new)
            // WARNING: This is inefficient and loses history if instance IDs matter elsewhere.
            // A better approach uses upsert or checks for changes.
            
            // Delete existing exercises for this workout
            console.log('Deleting existing exercise instances for workout:', savedWorkoutId);
            const { error: deleteError } = await supabase
                .from('exercise_instances')
                .delete()
                .eq('workout_id', savedWorkoutId);
            
            if (deleteError) {
                 console.error('Error deleting old exercises, continuing with insert...', deleteError);
                 // Decide if this error should stop the whole process
                 // throw deleteError; 
            }

            // Insert new exercises if any exist
            if (exercises.length > 0) {
                 console.log(`Inserting ${exercises.length} new exercise instances...`);
                 const exercisesToInsert = exercises.map((ex, index) => ({
                    ...ex,
                    id: undefined, // Ensure DB generates ID if needed
                    workout_id: savedWorkoutId,
                    order_in_workout: ex.order_in_workout ?? index // Ensure order
                 }));

                 const { error: insertError } = await supabase
                    .from('exercise_instances')
                    .insert(exercisesToInsert);
                 
                 if (insertError) throw insertError;
            }

            // 3. Refresh workout list in UI and close modal
            // Fetch the fully updated workout to update local state correctly
            const { data: refreshedWorkout, error: refreshError } = await supabase
                .from('workouts')
                .select('*, exercise_instances(*)')
                .eq('id', savedWorkoutId)
                .single();

            if (refreshedWorkout && !refreshError) {
                 setCurrentWorkouts(prev => 
                    prev.map(w => w.id === savedWorkoutId ? (refreshedWorkout as WorkoutAdminData) : w)
                       .filter(w => w.id !== undefined) // Ensure newly added are included if ID matches
                       .concat(prev.find(w => w.id === savedWorkoutId) ? [] : [refreshedWorkout as WorkoutAdminData]) // Add if new
                       .filter((w, index, self) => index === self.findIndex((t) => t.id === w.id)) // Deduplicate just in case
                 );
            } else {
                 console.error("Failed to refresh workout state after save.", refreshError);
                 // Might need a full template list refresh here instead
            }

            handleCloseWorkoutModal(); 
        } catch (err: unknown) {
            console.error('Error saving workout:', err);
            setError('Failed to save workout details.');
        } finally {
            setIsSavingWorkout(false);
        }
    };
    // ------------------------------------

    return (
        <FormProvider {...methods}>
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Program Builder</h1>
                    <button 
                        onClick={handleCreateNew}
                        className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                        Create New Template
                    </button>
                </div>

                {isLoading && <p>Loading templates...</p>}
                {error && <p className="text-red-500">Error: {error}</p>}

                {(isCreating || selectedTemplate) && (
                    <div className="p-4 mb-6 bg-white rounded shadow dark:bg-gray-800">
                        <h2 className="mb-4 text-xl">{isCreating ? 'Create New Template' : `Editing: ${selectedTemplate?.name}`}</h2>
                        <form onSubmit={handleSubmit(handleSaveTemplate)} className="space-y-3">
                            {/* Use simplified TemplateFormData type here */}
                            <FormInput<TemplateFormData> name="name" label="Template Name" required />
                            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                            
                            <FormInput<TemplateFormData> name="phase" label="Phase (e.g., Hypertrophy, Strength)" />
                            {/* No specific error display for phase needed unless required */}
                            
                            <FormInput<TemplateFormData> name="weeks" label="Duration (Weeks)" type="number" required />
                            {errors.weeks && <p className="text-sm text-red-500">{errors.weeks.message}</p>}

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={handleCancel} className="px-3 py-1 text-sm border rounded">Cancel</button>
                                <button type="submit" disabled={isSaving} className="px-3 py-1 text-sm text-white bg-green-600 rounded disabled:opacity-50">
                                    {isSaving ? 'Saving...' : 'Save Template'}
                                </button>
                            </div>
                             {/* Display general save error */}
                            {error && <p className="mt-2 text-sm text-red-500">Error: {error}</p>} 
                        </form>
                       
                        {/* Workout Management Area (only when editing existing template) */} 
                        {selectedTemplate && (
                            <div className="pt-4 mt-6 border-t border-gray-300 dark:border-gray-600">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold">Workouts</h3>
                                    <button 
                                        type="button" 
                                        onClick={handleAddWorkout}
                                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        Add Workout
                                    </button>
                                </div>
                                {isLoadingWorkouts && <p>Loading workouts...</p>}
                                {!isLoadingWorkouts && currentWorkouts.length === 0 && <p className="text-sm text-gray-500">No workouts added yet.</p>}
                                {!isLoadingWorkouts && currentWorkouts.length > 0 && (
                                    <ul className="space-y-2">
                                        {currentWorkouts.map((workout) => (
                                            <li key={workout.id} className="flex items-center justify-between p-2 border rounded dark:border-gray-600">
                                                <span>{workout.name || 'Unnamed Workout'} ({workout.exercise_instances?.length || 0} exercises)</span>
                                                <div className="space-x-2">
                                                    <button onClick={() => handleEditWorkout(workout.id)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteWorkout(workout.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                 {/* Workout Form Modal */} 
                                 {showWorkoutModal && (
                                     <div className="fixed inset-0 z-40 flex items-start justify-center pt-16 bg-gray-600 bg-opacity-75"> 
                                         <div className="w-full max-w-lg bg-white rounded-lg shadow-xl dark:bg-gray-800"> 
                                             <WorkoutForm 
                                                 workout={editingWorkout} 
                                                 onSave={handleSaveWorkout} 
                                                 onCancel={handleCloseWorkoutModal} 
                                                 isSaving={isSavingWorkout} 
                                             />
                                         </div>
                                     </div>
                                 )}
                            </div>
                        )}
                    </div>
                )}

                {!isLoading && !isCreating && !selectedTemplate && (
                     <div className="space-y-3">
                         {templates.length === 0 && <p>No program templates created yet.</p>}
                         {templates.map((template) => (
                            <div key={template.id} className="flex items-center justify-between p-3 bg-white rounded shadow dark:bg-gray-800">
                                <div>
                                    <h3 className="font-semibold">{template.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Phase: {template.phase || 'N/A'}, Weeks: {template.weeks}</p>
                                </div>
                                <button 
                                    onClick={() => handleEdit(template)}
                                    className="px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Edit
                                </button>
                            </div>
                         ))}
                     </div>
                )}
            </div>
        </FormProvider>
    );
};

export default ProgramBuilder; 