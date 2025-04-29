import React, { useEffect, useState } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import FormInput from '../ui/FormInput'; // Reuse FormInput
import { WorkoutAdminData, ExerciseInstanceAdminData } from '../../types/adminTypes'; // Import shared type
import ExerciseInstanceForm from './ExerciseInstanceForm'; // Import exercise form

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
// Note: Managing nested saves can be complex. This might need refinement.
type OnSaveWorkout = (
    workoutData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'>,
    exercises: ExerciseInstanceAdminData[], // Pass exercises back to parent
    workoutId?: string
) => Promise<void>;

interface WorkoutFormProps {
    workout?: WorkoutAdminData | null;
    onSave: OnSaveWorkout;
    onCancel: () => void;
    isSaving: boolean;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({ workout, onSave: onSaveWorkoutProp, onCancel, isSaving }) => {

    const methods = useForm<WorkoutFormData>({
        defaultValues: {
            name: workout?.name || '',
            description: workout?.description || '',
            week_number: workout?.week_number?.toString() || '',
            day_of_week: workout?.day_of_week?.toString() || '',
            order_in_program: workout?.order_in_program?.toString() || ''
        }
    });

    const { handleSubmit, reset, formState: { errors }, setError: setFormError } = methods;

    // State for managing exercises within this form
    const [exercises, setExercises] = useState<ExerciseInstanceAdminData[]>([]);
    // State for exercise form modal
    const [showExerciseModal, setShowExerciseModal] = useState<boolean>(false);
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
    const editingExercise = editingExerciseIndex !== null ? exercises[editingExerciseIndex] : null;

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

    // --- Exercise Handlers ---
    const handleAddExercise = () => { 
        setEditingExerciseIndex(null); // Ensure add mode
        setShowExerciseModal(true);
    };
    const handleEditExercise = (index: number) => { 
        setEditingExerciseIndex(index);
        setShowExerciseModal(true);
    };
    const handleCloseExerciseModal = () => {
        setShowExerciseModal(false);
        setEditingExerciseIndex(null);
    };
    // Save exercise data (called from ExerciseInstanceForm's onSave)
    const handleSaveExercise = (exerciseData: ExerciseInstanceAdminData) => {
        if (editingExerciseIndex !== null) {
            // Update existing exercise
            setExercises(prev => 
                prev.map((ex, index) => index === editingExerciseIndex ? exerciseData : ex)
            );
        } else {
            // Add new exercise (assign temporary order if needed)
            const newExercise = {
                ...exerciseData,
                order_in_workout: exerciseData.order_in_workout ?? exercises.length 
            };
            setExercises(prev => [...prev, newExercise]);
        }
        handleCloseExerciseModal(); // Close modal after save
    };
    const handleDeleteExercise = (index: number) => {
        if (window.confirm('Remove this exercise from the workout?')) {
             console.log("TODO: Update state - removing exercise at index:", index); 
             setExercises(prev => prev.filter((_, i) => i !== index));
             // Note: Actual DB delete needs to happen during the main workout save 
        }
    };
     // TODO: Implement reordering logic
    // ------------------------------------

    return (
        // Usually rendered inside a Modal component in the parent
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleWorkoutFormSubmit)} className="space-y-4 p-4 border rounded bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-medium mb-3">{workout ? 'Edit Workout' : 'Add New Workout'}</h3>
                
                <FormInput<WorkoutFormData> name="name" label="Workout Name" required />
                 {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                 
                <FormInput<WorkoutFormData> name="description" label="Description (Optional)" type="textarea" rows={2}/>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormInput<WorkoutFormData> name="week_number" label="Week # (Optional)" type="number" />
                    {errors.week_number && <p className="text-red-500 text-sm">{errors.week_number.message}</p>}
                    
                    <FormInput<WorkoutFormData> name="day_of_week" label="Day of Week (1-7, Optional)" type="number" />
                    {errors.day_of_week && <p className="text-red-500 text-sm">{errors.day_of_week.message}</p>}
                    
                    <FormInput<WorkoutFormData> name="order_in_program" label="Order (Optional)" type="number" placeholder="Order within program"/>
                     {errors.order_in_program && <p className="text-red-500 text-sm">{errors.order_in_program.message}</p>}
                </div>
                
                {/* Exercise Management Section */}
                <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-semibold">Exercises</h4>
                        <button 
                            type="button" 
                            onClick={handleAddExercise}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                            Add Exercise
                        </button>
                    </div>
                    {exercises.length === 0 && <p className="text-sm text-gray-500">No exercises added yet.</p>}
                    {exercises.length > 0 && (
                        <ul className="space-y-2">
                            {exercises.map((ex, index) => (
                                <li key={index /* TODO: Use ex.id if available after save */ } className="p-2 border rounded dark:border-gray-600 flex justify-between items-center text-sm">
                                    <span>{ex.order_in_workout ?? index + 1}. {ex.exercise_name || 'Select Exercise'} ({ex.sets}x{ex.reps})</span>
                                    <div className="space-x-2 flex-shrink-0 ml-2">
                                         {/* TODO: Add Reorder Buttons if needed */}
                                        <button type="button" onClick={() => handleEditExercise(index)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                        <button type="button" onClick={() => handleDeleteExercise(index)} className="text-xs text-red-600 hover:underline">Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-sm font-medium">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Workout'}
                    </button>
                </div>
            </form>

             {/* Exercise Form Modal */} 
             {showExerciseModal && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex justify-center items-start pt-16">
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-4"> 
                          <ExerciseInstanceForm 
                             exercise={editingExercise} 
                             onSave={handleSaveExercise} 
                             onCancel={handleCloseExerciseModal} 
                         />
                     </div>
                 </div>
             )}
        </FormProvider>
    );
};

export default WorkoutForm; 