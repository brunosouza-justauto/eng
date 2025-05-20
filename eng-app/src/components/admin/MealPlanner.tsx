import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import FormInput from '../ui/FormInput';
import { FiSearch, FiPlus, FiBook } from 'react-icons/fi';
import MealManager from './MealManager';
import RecipeManager from './RecipeManager';
import { useNavigate } from 'react-router-dom';

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
    is_public: boolean;
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
    is_public: z.boolean().default(false),
});

interface MealPlanFormData {
    name: string;
    total_calories: string | null;
    protein_grams: string | null;
    carbohydrate_grams: string | null;
    fat_grams: string | null;
    description: string | null;
    is_public: boolean;
}

// -------------------------

const MealPlanner: React.FC = () => {
    const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
    const [filteredPlans, setFilteredPlans] = useState<NutritionPlanListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [selectedPlan, setSelectedPlan] = useState<NutritionPlanListItem | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showRecipeManager, setShowRecipeManager] = useState<boolean>(false);
    const [alertMessage, setAlertMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const profile = useSelector(selectProfile);
    const navigate = useNavigate();

    // Form methods
    const methods = useForm<MealPlanFormData>({
        defaultValues: { name: '', total_calories: '', protein_grams: '', carbohydrate_grams: '', fat_grams: '', description: '', is_public: false }
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
                .select('id, name, total_calories, protein_grams, carbohydrate_grams, fat_grams, description, created_at, is_public')
                .eq('coach_id', profile.id)
                .order('created_at', { ascending: false });
            
            if (fetchError) throw fetchError;
            setPlans(data || []);
            setFilteredPlans(data || []);
        } catch {
             setError('Failed to load plans.'); 
        }
         finally { setIsLoading(false); }
    };
    useEffect(() => { fetchPlans(); }, [profile]);

    // Check if there's pre-filled data from the BMR Calculator
    useEffect(() => {
        const newMealPlanData = localStorage.getItem('newMealPlanData');
        console.log("Checking for BMR Calculator data:", newMealPlanData);
        
        if (newMealPlanData) {
            try {
                const data = JSON.parse(newMealPlanData);
                console.log("Parsed BMR Calculator data:", data);
                
                // Set creating mode
                setIsCreating(true);
                setSelectedPlan(null);
                
                // Reset and then set form values
                reset(data);
                
                // Also set values explicitly to ensure they're applied
                methods.setValue('name', data.name);
                methods.setValue('total_calories', data.total_calories);
                methods.setValue('protein_grams', data.protein_grams);
                methods.setValue('carbohydrate_grams', data.carbohydrate_grams);
                methods.setValue('fat_grams', data.fat_grams);
                methods.setValue('description', data.description);
                methods.setValue('is_public', data.is_public);
                
                console.log("Form values set from BMR Calculator data");
                
                // Clear localStorage
                localStorage.removeItem('newMealPlanData');
            } catch (error) {
                console.error('Error parsing meal plan data from BMR Calculator:', error);
            }
        }
    }, []);

    // Filter plans based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPlans(plans);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = plans.filter(
            plan => plan.name.toLowerCase().includes(query) || 
                   (plan.description && plan.description.toLowerCase().includes(query))
        );
        setFilteredPlans(filtered);
    }, [searchQuery, plans]);

    // --- Form Handling --- 
    useEffect(() => { // Populate form on edit
        if (selectedPlan) {
            reset({
                name: selectedPlan.name,
                total_calories: selectedPlan.total_calories?.toString() ?? '',
                protein_grams: selectedPlan.protein_grams?.toString() ?? '',
                carbohydrate_grams: selectedPlan.carbohydrate_grams?.toString() ?? '',
                fat_grams: selectedPlan.fat_grams?.toString() ?? '',
                description: selectedPlan.description ?? '',
                is_public: selectedPlan.is_public
            });
        }
    }, [selectedPlan, reset]);

    const handleCreateNew = () => {
        navigate('/admin/mealplans/new');
    };
    const handleEdit = (plan: NutritionPlanListItem) => {
        navigate(`/admin/mealplans/edit/${plan.id}`);
    };
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

    const handleDeletePlan = async (planId: string) => {
        try {
            const { error } = await supabase.from('nutrition_plans').delete().eq('id', planId);
            if (error) throw error;
            setShowDeleteConfirm(null);
            await fetchPlans();
        } catch (err) {
            console.error("Error deleting nutrition plan:", err);
            setError('Failed to delete plan.');
        }
    };
    
    const toggleVisibility = async (plan: NutritionPlanListItem) => {
        if (!profile?.id) return;
        setError(null);
        
        try {
            const newVisibility = !plan.is_public;
            
            const { error } = await supabase
                .from('nutrition_plans')
                .update({ is_public: newVisibility })
                .eq('id', plan.id)
                .eq('coach_id', profile.id);
                
            if (error) throw error;
            
            // Refresh plans after update
            await fetchPlans();
            
            // If this is the selected plan, update that too
            if (selectedPlan?.id === plan.id) {
                setSelectedPlan({ ...selectedPlan, is_public: newVisibility });
            }
            
            setAlertMessage({
                message: `Nutrition plan visibility ${newVisibility ? 'made public' : 'made private'}`,
                type: 'success'
            });
            setTimeout(() => setAlertMessage(null), 3000);
            
        } catch (err) {
            console.error('Error updating plan visibility:', err);
            setError('Failed to update nutrition plan visibility.');
        }
    };

    // Meal and recipe management
    const handleManageRecipes = () => {
        setShowRecipeManager(true);
    };

    const handleCloseRecipeManager = () => {
        setShowRecipeManager(false);
    };

    return (
        <FormProvider {...methods}>
            <div className="meal-planner">
                <div className="container px-4 py-6 mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meal Planner</h1>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">Create and manage nutrition plans for your athletes</p>
                        </div>
                        
                        <div className="flex space-x-2">
                            {!selectedPlan && !isCreating && (
                                <>
                                    <button
                                        onClick={handleManageRecipes}
                                        className="flex items-center px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 mr-2"
                                    >
                                        <FiBook className="mr-2" /> Manage Recipes
                                    </button>
                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                    >
                                        <FiPlus className="mr-2" /> New Plan
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md dark:bg-red-900/20 dark:text-red-300">
                            {error}
                        </div>
                    )}
                    
                    {alertMessage && (
                        <div className={`p-4 mb-4 rounded-md ${
                            alertMessage.type === 'success' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                            {alertMessage.message}
                        </div>
                    )}

                    {/* Confirmation Dialog for Delete */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="max-w-md p-6 mx-auto bg-white rounded-lg dark:bg-gray-800">
                                <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
                                <p className="mb-6 text-gray-600 dark:text-gray-400">
                                    Are you sure you want to delete this nutrition plan? This action cannot be undone.
                                </p>
                                <div className="flex justify-end space-x-3">
                                    <button 
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => showDeleteConfirm && handleDeletePlan(showDeleteConfirm)}
                                        className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recipe Manager Modal */}
                    {showRecipeManager && (
                        <RecipeManager 
                            onClose={handleCloseRecipeManager}
                        />
                    )}

                    {/* Form for Creating/Editing Plan */}
                    {(isCreating || selectedPlan) && (
                        <div className="p-6 mb-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                    {isCreating ? 'Create New Nutrition Plan' : `Editing: ${selectedPlan?.name}`}
                                </h2>
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit(handleSavePlan)} className="space-y-4">
                                <FormInput<MealPlanFormData> name="name" label="Plan Name" required />
                                
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <FormInput<MealPlanFormData> name="total_calories" label="Calories (kcal)" type="number" />
                                    <FormInput<MealPlanFormData> name="protein_grams" label="Protein (g)" type="number" />
                                    <FormInput<MealPlanFormData> name="carbohydrate_grams" label="Carbs (g)" type="number" />
                                    <FormInput<MealPlanFormData> name="fat_grams" label="Fat (g)" type="number" />
                                </div>
                                
                                <FormInput<MealPlanFormData> name="description" label="Description (Optional)" type="textarea" rows={3}/>

                                <div className="mb-4">
                                    <div className="flex items-center">
                                        <input
                                            id="is_public"
                                            {...methods.register('is_public')}
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Make this nutrition plan public
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Public nutrition plans are visible to all athletes. Private plans are only visible to athletes you assign them to.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-3 space-x-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        className={`px-4 py-2 ${isSaving ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
                                        disabled={isSaving}
                                    >
                                        {isSaving && (
                                            <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        {isCreating ? 'Create Plan' : 'Update Plan'}
                                    </button>
                                </div>
                            </form>
                            
                            {selectedPlan && (
                                <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white">Meals Management</h3>
                                    <div className="border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
                                        <MealManager 
                                            nutritionPlanId={selectedPlan.id}
                                            onClose={() => {}} // Empty function since we're not in a modal anymore
                                            isEmbedded={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Plans Listing */}
                    {!isLoading && !isCreating && !selectedPlan && (
                        <div className="overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                                <div className="flex items-center">
                                    <div className="relative w-64">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <FiSearch className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full py-2 pl-10 pr-4 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="Search plans..."
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
                            
                            {plans.length === 0 ? (
                                <div className="py-8 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    </svg>
                                    <h3 className="mb-2 text-lg font-medium text-gray-800 dark:text-white">No Nutrition Plans</h3>
                                    <p className="mb-4 text-gray-600 dark:text-gray-400">Create your first nutrition plan to get started</p>
                                    <button 
                                        onClick={handleCreateNew} 
                                        className="flex items-center px-4 py-2 mx-auto text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                    >
                                        <FiPlus className="mr-1" /> Create New Plan
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Calories</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Macros (P/C/F)</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Visibility</th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {filteredPlans.map((plan) => (
                                                <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</div>
                                                        {plan.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {plan.total_calories ? `${plan.total_calories} kcal` : '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {plan.protein_grams || '-'}g / {plan.carbohydrate_grams || '-'}g / {plan.fat_grams || '-'}g
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(plan.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            plan.is_public 
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                                        }`}>
                                                            {plan.is_public ? 'Public' : 'Private'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => toggleVisibility(plan)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                                                            title={plan.is_public ? "Make Private" : "Make Public"}
                                                        >
                                                            {plan.is_public ? "Make Private" : "Make Public"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(plan)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(plan.id)}
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
                            )}
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            </div>
        </FormProvider>
    );
};

export default MealPlanner; 