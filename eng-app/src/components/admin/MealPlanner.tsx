import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import FormInput from '../ui/FormInput';
import Card from '../ui/Card';
import Button from '../ui/Button';

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
    const { handleSubmit, reset, setError: setFormError } = methods;

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
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meal Planner</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage nutrition plans for your athletes</p>
                    </div>
                    <Button 
                        onClick={handleCreateNew} 
                        variant="primary" 
                        color="indigo"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        }
                    >
                        Create New Plan
                    </Button>
                </div>

                {isLoading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {(isCreating || selectedPlan) && (
                    <Card className="overflow-visible">
                        <div className="mb-4 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {isCreating ? 'Create New Plan' : `Editing: ${selectedPlan?.name}`}
                            </h2>
                            <Button variant="outline" color="gray" size="sm" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                        
                        <form onSubmit={handleSubmit(handleSavePlan)} className="space-y-4">
                            <FormInput<MealPlanFormData> name="name" label="Plan Name" required />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormInput<MealPlanFormData> name="total_calories" label="Calories (kcal)" type="number" />
                                <FormInput<MealPlanFormData> name="protein_grams" label="Protein (g)" type="number" />
                                <FormInput<MealPlanFormData> name="carbohydrate_grams" label="Carbs (g)" type="number" />
                                <FormInput<MealPlanFormData> name="fat_grams" label="Fat (g)" type="number" />
                            </div>
                            
                            <FormInput<MealPlanFormData> name="description" label="Description (Optional)" type="textarea" rows={3}/>

                            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    color="green" 
                                    loading={isSaving}
                                    disabled={isSaving}
                                >
                                    {isCreating ? 'Create Plan' : 'Update Plan'}
                                </Button>
                            </div>
                        </form>
                        
                        {selectedPlan && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="font-medium text-lg mb-4 text-gray-800 dark:text-white">Meals Management</h3>
                                <div className="p-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50 text-center">
                                    <p className="text-gray-500 dark:text-gray-400">Meal/Food Item Management will be implemented in future updates</p>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {!isLoading && !isCreating && !selectedPlan && (
                    <div className="space-y-4">
                        {plans.length === 0 ? (
                            <Card>
                                <div className="text-center py-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Nutrition Plans</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first nutrition plan to get started</p>
                                    <Button 
                                        onClick={handleCreateNew} 
                                        variant="secondary" 
                                        color="indigo"
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                        }
                                    >
                                        Create New Plan
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <div>
                                <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Your Nutrition Plans</h2>
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {plans.map((plan) => (
                                        <Card key={plan.id} hoverable>
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-medium text-lg text-indigo-600 dark:text-indigo-400">{plan.name}</h3>
                                                    <Button 
                                                        onClick={() => handleEdit(plan)} 
                                                        variant="text" 
                                                        color="indigo" 
                                                        size="xs"
                                                        icon={
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        }
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                                
                                                {plan.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">{plan.description}</p>
                                                )}
                                                
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-center">
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400">Calories</span>
                                                        <span className="font-semibold">{plan.total_calories || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-center">
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400">Protein</span>
                                                        <span className="font-semibold">{plan.protein_grams || 'N/A'}g</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                                                    Created {new Date(plan.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </FormProvider>
    );
};

export default MealPlanner; 