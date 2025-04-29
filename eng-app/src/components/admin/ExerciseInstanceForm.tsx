import React, { useEffect } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import FormInput from '../ui/FormInput'; // Reuse FormInput
import { ExerciseInstanceAdminData } from '../../types/adminTypes';

// --- Zod Schema for Exercise Instance --- 
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

    const methods = useForm<ExerciseInstanceFormData>({
        defaultValues: {
            exercise_name: exercise?.exercise_name || '',
            exercise_db_id: exercise?.exercise_db_id || null,
            sets: exercise?.sets || null,
            reps: exercise?.reps || null,
            rest_period_seconds: exercise?.rest_period_seconds?.toString() || null,
            tempo: exercise?.tempo || null,
            notes: exercise?.notes || null,
            order_in_workout: exercise?.order_in_workout?.toString() || null,
        }
    });

    const { handleSubmit, reset, formState: { errors }, setError: setFormError } = methods;

    useEffect(() => {
        reset({ // Reset form if prop changes
            exercise_name: exercise?.exercise_name || '',
            exercise_db_id: exercise?.exercise_db_id || null,
            sets: exercise?.sets || null,
            reps: exercise?.reps || null,
            rest_period_seconds: exercise?.rest_period_seconds?.toString() || null,
            tempo: exercise?.tempo || null,
            notes: exercise?.notes || null,
            order_in_workout: exercise?.order_in_workout?.toString() || null,
        });
    }, [exercise, reset]);

    const handleFormSubmit: SubmitHandler<ExerciseInstanceFormData> = (formData) => {
         // Clear previous errors
        Object.keys(formData).forEach(key => setFormError(key as keyof ExerciseInstanceFormData, {}));
        
        // Manual validation
        const validationResult = exerciseInstanceSchema.safeParse({
            ...formData,
            // Convert numeric strings back
            rest_period_seconds: formData.rest_period_seconds || undefined,
            order_in_workout: formData.order_in_workout || undefined,
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
         };

        // Call onSave with the correctly typed data
        onSave(saveData);
    };

    return (
        // Rendered inside a modal usually
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3 p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h4 className="text-md font-semibold mb-2">{exercise ? 'Edit Exercise' : 'Add Exercise'}</h4>
                
                {/* TODO: Replace exercise_name with a search/select component using wger data */}
                <FormInput<ExerciseInstanceFormData> name="exercise_name" label="Exercise Name" required />
                {errors.exercise_name && <p className="text-red-500 text-sm">{errors.exercise_name.message}</p>}

                <div className="grid grid-cols-2 gap-4">
                    <FormInput<ExerciseInstanceFormData> name="sets" label="Sets" />
                    <FormInput<ExerciseInstanceFormData> name="reps" label="Reps" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <FormInput<ExerciseInstanceFormData> name="rest_period_seconds" label="Rest (sec)" type="number" />
                     {errors.rest_period_seconds && <p className="text-red-500 text-sm">{errors.rest_period_seconds.message}</p>}
                     
                     <FormInput<ExerciseInstanceFormData> name="tempo" label="Tempo" />
                </div>
                <FormInput<ExerciseInstanceFormData> name="notes" label="Notes" type="textarea" rows={2} />
                
                 <FormInput<ExerciseInstanceFormData> 
                    name="order_in_workout" 
                    label="Order in Workout (Optional)" 
                    type="number" 
                    placeholder="Leave blank for auto-order"
                />
                {errors.order_in_workout && <p className="text-red-500 text-sm">{errors.order_in_workout.message}</p>}

                 {/* Hidden field for wger ID - will be set by search later */}
                <input type="hidden" {...methods.register("exercise_db_id")} />

                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-sm font-medium">Cancel</button>
                    <button type="submit" /* disabled={isSaving} */ className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium">
                        {/* {isSaving ? 'Saving...' : 'Save Exercise'} */} Save Exercise
                    </button>
                </div>
            </form>
        </FormProvider>
    );

};

export default ExerciseInstanceForm; 