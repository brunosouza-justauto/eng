import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import FormInput from '../ui/FormInput';

// Basic type for plan list item
interface NutritionPlanListItem {
    id: string;
    name: string;
    total_calories: number | null;
    protein_grams: number | null;
    carbohydrate_grams: number | null;
    fat_grams: number | null;
    description: string | null;
    created_at: string;
}

// --- Zod Schema & Types --- 
const mealPlanSchema = z.object({
    name: z.string().min(1, 'Plan name is required'),
    total_calories: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                             z.number().int().nonnegative('Calories must be non-negative').optional().nullable()),
    protein_grams: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                           z.number().int().nonnegative('Protein must be non-negative').optional().nullable()),
    carbohydrate_grams: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                                z.number().int().nonnegative('Carbs must be non-negative').optional().nullable()),
    fat_grams: z.preprocess((val) => val ? parseInt(String(val), 10) : undefined, 
                       z.number().int().nonnegative('Fat must be non-negative').optional().nullable()),
    description: z.string().trim().optional().nullable(), 
});

interface MealPlanFormData {
    name: string;
    total_calories: string | null;
    protein_grams: string | null;
    carbohydrate_grams: string | null;
    fat_grams: string | null;
    description: string | null;
}

// -------------------------

const MealPlanner: React.FC = () => {
    const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [selectedPlan, setSelectedPlan] = useState<NutritionPlanListItem | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const profile = useSelector(selectProfile);

    // Form methods
    const methods = useForm<MealPlanFormData>({
        defaultValues: { name: '', total_calories: '', protein_grams: '', carbohydrate_grams: '', fat_grams: '', description: '' }
    });
    const { handleSubmit, reset, formState: { errors }, setError: setFormError } = methods;

    // Fetch existing plans created by the current coach
    const fetchPlans = async () => {
        if (!profile || !profile.id) return;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('nutrition_plans')
                .select('id, name, total_calories, protein_grams, carbohydrate_grams, fat_grams, description, created_at')
                .eq('coach_id', profile.id)
                .order('created_at', { ascending: false });
            
            if (fetchError) throw fetchError;
            setPlans(data || []);
        } catch {
             setError('Failed to load plans.'); 
        }
         finally { setIsLoading(false); }
    };
    useEffect(() => { fetchPlans(); }, [profile]);

    // --- Form Handling --- 
    useEffect(() => { // Populate form on edit
        if (selectedPlan) {
            reset({
                name: selectedPlan.name,
                total_calories: selectedPlan.total_calories?.toString() ?? '',
                protein_grams: selectedPlan.protein_grams?.toString() ?? '',
                carbohydrate_grams: selectedPlan.carbohydrate_grams?.toString() ?? '',
                fat_grams: selectedPlan.fat_grams?.toString() ?? '',
                description: selectedPlan.description ?? '' // Fetch description if added to list item type
            });
        } else {
            reset({ name: '', total_calories: '', protein_grams: '', carbohydrate_grams: '', fat_grams: '', description: '' });
        }
    }, [selectedPlan, reset]);

    const handleCreateNew = () => { setIsCreating(true); setSelectedPlan(null); reset(); };
    const handleEdit = (plan: NutritionPlanListItem) => { setSelectedPlan(plan); setIsCreating(false); };
    const handleCancel = () => { setIsCreating(false); setSelectedPlan(null); reset(); };

    const handleSavePlan: SubmitHandler<MealPlanFormData> = async (formData) => {
        if (!profile || !profile.id) return;
        setIsSaving(true); setError(null);
        Object.keys(formData).forEach(key => setFormError(key as keyof MealPlanFormData, {}));

        try {
            const validationResult = mealPlanSchema.safeParse({
                ...formData,
                total_calories: formData.total_calories || undefined,
                protein_grams: formData.protein_grams || undefined,
                carbohydrate_grams: formData.carbohydrate_grams || undefined,
                fat_grams: formData.fat_grams || undefined,
            });

            if (!validationResult.success) {
                validationResult.error.errors.forEach((err) => {
                    if (err.path.length > 0) {
                         setFormError(err.path[0] as keyof MealPlanFormData, { type: 'manual', message: err.message });
                    }
                });
                setIsSaving(false); return;
            }
            
            const validatedData = validationResult.data;
            const payload = { ...validatedData, coach_id: profile.id };
            let resultError;

            if (isCreating) {
                const { error } = await supabase.from('nutrition_plans').insert(payload);
                resultError = error;
            } else if (selectedPlan) {
                 const { error } = await supabase.from('nutrition_plans').update(payload).eq('id', selectedPlan.id);
                 resultError = error;
            }
            if (resultError) throw resultError;
            
            await fetchPlans(); // Refetch list
            handleCancel(); // Close form

        } catch (err) {
            console.error("Error saving plan:", err);
            setError('Failed to save plan.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <FormProvider {...methods}>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Meal Planner</h1>
                    <button onClick={handleCreateNew} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Create New Plan</button>
                </div>

                {isLoading && <p>Loading plans...</p>}
                {error && <p className="text-red-500">Error: {error}</p>}

                {(isCreating || selectedPlan) && (
                    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-xl mb-4">{isCreating ? 'Create New Plan' : `Editing: ${selectedPlan?.name}`}</h2>
                        <form onSubmit={handleSubmit(handleSavePlan)} className="space-y-3">
                            <FormInput<MealPlanFormData> name="name" label="Plan Name" required />
                             {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <FormInput<MealPlanFormData> name="total_calories" label="Calories (kcal)" type="number" />
                                {errors.total_calories && <p className="text-red-500 text-sm">{errors.total_calories.message}</p>}
                                
                                <FormInput<MealPlanFormData> name="protein_grams" label="Protein (g)" type="number" />
                                 {errors.protein_grams && <p className="text-red-500 text-sm">{errors.protein_grams.message}</p>}
                                 
                                <FormInput<MealPlanFormData> name="carbohydrate_grams" label="Carbs (g)" type="number" />
                                 {errors.carbohydrate_grams && <p className="text-red-500 text-sm">{errors.carbohydrate_grams.message}</p>}
                                 
                                <FormInput<MealPlanFormData> name="fat_grams" label="Fat (g)" type="number" />
                                {errors.fat_grams && <p className="text-red-500 text-sm">{errors.fat_grams.message}</p>}
                            </div>
                             <FormInput<MealPlanFormData> name="description" label="Description (Optional)" type="textarea" rows={2}/>

                            <div className="mt-4 flex justify-end gap-2">
                               <button type="button" onClick={handleCancel} className="px-3 py-1 border rounded text-sm">Cancel</button>
                               <button type="submit" disabled={isSaving} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">
                                   {isSaving ? 'Saving...' : 'Save Plan'}
                               </button>
                           </div>
                           {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>} 
                        </form>
                        {selectedPlan && <p className="mt-4">(Meal/Food Item Management Area Placeholder for {selectedPlan.name})</p>}
                    </div>
                )}

                {!isLoading && !isCreating && !selectedPlan && (
                     <div className="space-y-3">
                         {plans.length === 0 && <p>No nutrition plans created yet.</p>}
                         {plans.map((plan) => (
                            <div key={plan.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold">{plan.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">C: {plan.total_calories ?? 'N/A'}, P: {plan.protein_grams ?? 'N/A'}g, C: {plan.carbohydrate_grams ?? 'N/A'}g, F: {plan.fat_grams ?? 'N/A'}g</p>
                                </div>
                                <button onClick={() => handleEdit(plan)} className="px-3 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                            </div>
                         ))}
                     </div>
                )}
            </div>
        </FormProvider>
    );
};

export default MealPlanner; 