import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import { z } from 'zod';
import { WorkoutAdminData, ExerciseInstanceAdminData } from '../../types/adminTypes';
import WorkoutForm from './WorkoutForm';
import { FiSearch, FiCalendar, FiTrash2, FiEdit2, FiPlus } from 'react-icons/fi';

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
    // State for workout modal/form
    const [showWorkoutModal, setShowWorkoutModal] = useState<boolean>(false);
    const [editingWorkout, setEditingWorkout] = useState<WorkoutAdminData | null>(null);

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
        if (!selectedTemplate) {
            setError('No template selected to add workout to.');
            return;
        }
        
        try {
            // 1. Save Workout Details (Insert or Update)
            const workoutPayload = { 
                ...workoutFormData, 
                program_template_id: selectedTemplate.id 
            };
            let workoutResultError;
            let workoutResultData: { id: string } | null = null; // Need the ID

            if (workoutId) {
                console.log('Updating workout:', workoutId, workoutPayload);
                const { data, error } = await supabase
                    .from('workouts')
                    .update(workoutPayload)
                    .eq('id', workoutId)
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
            
            const savedWorkoutId = workoutResultData.id; // Get the ID for exercise linking
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
        }
    };

    // Add delete template handler
    const handleDeleteTemplate = async (templateId: string) => {
        if (!templateId) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            // First delete all associated workouts (which should cascade to exercise instances)
            const { error: workoutsError } = await supabase
                .from('workouts')
                .delete()
                .eq('program_template_id', templateId);
                
            if (workoutsError) throw workoutsError;
            
            // Then delete the template
            const { error: templateError } = await supabase
                .from('program_templates')
                .delete()
                .eq('id', templateId);
                
            if (templateError) throw templateError;
            
            // Update state
            setTemplates(templates.filter(t => t.id !== templateId));
            setShowDeleteConfirm(null);
            
        } catch (err: unknown) {
            console.error("Error deleting template:", err);
            setError('Failed to delete template. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Program Builder</h1>
                    <p className="text-gray-500 dark:text-gray-400">Create and manage training program templates</p>
                </div>
                <button 
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                >
                    <FiPlus /> Create New Template
                </button>
            </div>

            {error && (
                <div className="p-3 text-red-700 bg-red-100 border border-red-200 rounded-md dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                    {error}
                </div>
            )}

            {!isCreating && !selectedTemplate && (
                <div className="p-4 bg-white rounded-md shadow dark:bg-gray-800">
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <FiSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 pl-10 pr-4 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-6">
                            <div className="w-6 h-6 border-2 border-gray-300 rounded-full border-t-indigo-600 animate-spin"></div>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            {templates.length === 0 ? 
                                'No program templates created yet. Click "Create New Template" to get started.' : 
                                'No templates match your search. Try a different query.'}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTemplates.map((template) => (
                                <div key={template.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800/50 dark:border-gray-700 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{template.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleEdit(template)}
                                                className="p-1.5 text-indigo-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                title="Edit template"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => setShowDeleteConfirm(template.id)}
                                                className="p-1.5 text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                title="Delete template"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 mb-2 text-sm text-gray-500 dark:text-gray-400">
                                        <FiCalendar size={14} />
                                        <span>{template.weeks} {template.weeks === 1 ? 'week' : 'weeks'}</span>
                                    </div>
                                    
                                    {template.phase && (
                                        <div className="inline-block px-2 py-1 mb-3 text-xs font-medium text-indigo-800 bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-300">
                                            {template.phase}
                                        </div>
                                    )}
                                    
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Created: {new Date(template.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">Confirm Delete</h3>
                        <p className="mb-4 text-gray-600 dark:text-gray-300">
                            Are you sure you want to delete this template? This will also remove all workouts and exercises associated with this template.
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(isCreating || selectedTemplate) && (
                <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                        {isCreating ? 'Create New Program Template' : `Edit Program Template: ${selectedTemplate?.name}`}
                    </h2>
                    
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(handleSaveTemplate)} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <FormInput<TemplateFormData> 
                                        name="name" 
                                        label="Template Name" 
                                        required 
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                                </div>
                                
                                <div>
                                    <FormInput<TemplateFormData> 
                                        name="phase" 
                                        label="Phase (e.g., Hypertrophy, Strength)" 
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <FormInput<TemplateFormData> 
                                    name="weeks" 
                                    label="Duration (Weeks)" 
                                    type="number" 
                                    required 
                                />
                                {errors.weeks && <p className="mt-1 text-sm text-red-500">{errors.weeks.message}</p>}
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button 
                                    type="button" 
                                    onClick={handleCancel} 
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save Template
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                   
                    {/* Workout Management Area (only when editing existing template) */} 
                    {selectedTemplate && (
                        <div className="pt-6 mt-6 border-t border-gray-300 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Program Workouts</h3>
                                <button 
                                    type="button" 
                                    onClick={handleAddWorkout}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    <FiPlus size={16} /> Add Workout
                                </button>
                            </div>
                            
                            {isLoadingWorkouts ? (
                                <div className="flex justify-center p-6">
                                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full border-t-blue-600 animate-spin"></div>
                                </div>
                            ) : currentWorkouts.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-400">
                                    No workouts added to this program yet. Click "Add Workout" to get started.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Week visualization */}
                                    {selectedTemplate && selectedTemplate.weeks > 0 && (
                                        <div className="mb-6">
                                            <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Program Schedule Overview</h4>
                                            <div className="grid grid-cols-7 gap-2">
                                                {Array.from({ length: selectedTemplate.weeks * 7 }, (_, index) => {
                                                    const weekNum = Math.floor(index / 7) + 1;
                                                    const dayNum = (index % 7) + 1;
                                                    const dayWorkout = currentWorkouts.find(
                                                        w => w.week_number === weekNum && w.day_of_week === dayNum
                                                    );
                                                    
                                                    return (
                                                        <div 
                                                            key={`week${weekNum}-day${dayNum}`}
                                                            className={`p-2 text-center rounded ${
                                                                dayWorkout 
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer' 
                                                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                            } ${index % 7 === 0 ? 'border-l-4 border-indigo-300 dark:border-indigo-600' : ''}`}
                                                            onClick={() => dayWorkout ? handleEditWorkout(dayWorkout.id) : null}
                                                            title={dayWorkout ? `Edit: ${dayWorkout.name}` : `Week ${weekNum}, Day ${dayNum}`}
                                                        >
                                                            {index % 7 === 0 && <div className="mb-1 text-xs font-semibold">W{weekNum}</div>}
                                                            <div className="text-xs">{['M','T','W','T','F','S','S'][index % 7]}</div>
                                                            {dayWorkout && (
                                                                <div className="mt-1 text-xs font-medium truncate">{dayWorkout.name}</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Workout List</h4>
                                        {currentWorkouts.map((workout) => (
                                            <div key={workout.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700">
                                                <div>
                                                    <h5 className="font-medium">{workout.name || 'Unnamed Workout'}</h5>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        Week {workout.week_number}, Day {workout.day_of_week} • 
                                                        {workout.exercise_instances?.length || 0} exercises
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleEditWorkout(workout.id)} 
                                                        className="p-1.5 text-blue-600 hover:bg-gray-100 rounded dark:hover:bg-gray-700"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteWorkout(workout.id)} 
                                                        className="p-1.5 text-red-600 hover:bg-gray-100 rounded dark:hover:bg-gray-700"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                             
                             {/* Workout Form Modal */} 
                             {showWorkoutModal && (
                                 <div className="fixed inset-0 z-40 flex items-start justify-center pt-16 bg-gray-600 bg-opacity-75"> 
                                     <div className="w-full max-w-lg bg-white rounded-lg shadow-xl dark:bg-gray-800"> 
                                         <WorkoutForm 
                                             workout={editingWorkout} 
                                             onSave={handleSaveWorkout} 
                                             onCancel={handleCloseWorkoutModal} 
                                         />
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProgramBuilder; 