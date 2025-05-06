import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile, ProfileData } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import FormInput from '../ui/FormInput';
import { FiSearch, FiPlus } from 'react-icons/fi';

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
    const [filteredPlans, setFilteredPlans] = useState<NutritionPlanListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [selectedPlan, setSelectedPlan] = useState<NutritionPlanListItem | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const profile = useSelector(selectProfile);

    // Add Athlete Selection
    const [athletes, setAthletes] = useState<ProfileData[]>([]);
    const [selectedAthlete, setSelectedAthlete] = useState<ProfileData | null>(null);

    // Fetch all profiles (athletes)
    const fetchAthletes = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, email, height_cm, weight_kg, age, gender, user_id, onboarding_complete, role')
                .eq('role', 'athlete');
            if (error) throw error;
            setAthletes(data || []);
        } catch (err) {
            console.error('Error fetching athletes:', err);
        }
    };

    useEffect(() => {
        fetchAthletes();
    }, []);

    // BMR Calculator Component
    const BMRCalculator: React.FC = () => {
        const [height, setHeight] = useState(selectedAthlete?.height_cm?.toString() || '');
        const [weight, setWeight] = useState(selectedAthlete?.weight_kg?.toString() || '');
        const [age, setAge] = useState(selectedAthlete?.age?.toString() || '');
        const [gender, setGender] = useState(selectedAthlete?.gender || 'male');
        const [activityLevel, setActivityLevel] = useState('1.2'); // Sedentary by default
        const [proteinMultiplier, setProteinMultiplier] = useState(2.0);
        const [fatMultiplier, setFatMultiplier] = useState(1.0);
        const [carbMultiplier, setCarbMultiplier] = useState(0);
        const [bmr, setBMR] = useState(0);
        const [tdee, setTDEE] = useState(0);
        const [calorieTarget, setCalorieTarget] = useState(0);
        const [goal, setGoal] = useState('maintenance');

        const calculateBMR = () => {
            const h = parseFloat(height);
            const w = parseFloat(weight);
            const a = parseInt(age, 10);
            let bmrValue = 0;

            if (gender === 'male') {
                bmrValue = 10 * w + 6.25 * h - 5 * a + 5;
            } else {
                bmrValue = 10 * w + 6.25 * h - 5 * a - 161;
            }

            setBMR(bmrValue);
            calculateTDEE(bmrValue);
        };

        const calculateTDEE = (bmrValue: number) => {
            const tdeeValue = bmrValue * parseFloat(activityLevel);
            setTDEE(tdeeValue);
            calculateCalorieTarget(tdeeValue);
        };

        const calculateCalorieTarget = (tdeeValue: number) => {
            let adjustedTDEE = tdeeValue;
            if (goal === 'bulking') {
                adjustedTDEE *= 1.10; // 10% surplus for bulking
            } else if (goal === 'cutting') {
                adjustedTDEE *= 0.80; // 20% deficit for cutting
            }

            const proteinCalories = parseFloat(weight) * proteinMultiplier * 4;
            const fatCalories = parseFloat(weight) * fatMultiplier * 9;
            const carbCalories = adjustedTDEE - (proteinCalories + fatCalories);
            const carbGrams = carbCalories / 4;

            setCalorieTarget(adjustedTDEE);
            setCarbMultiplier(carbGrams / parseFloat(weight));
        };

        const calculateMultipliers = () => {
            switch (goal) {
                case 'bulking':
                    setProteinMultiplier(2.0);
                    setFatMultiplier(1.0);
                    break;
                case 'cutting':
                    setProteinMultiplier(2.4);
                    setFatMultiplier(0.4);
                    break;
                default:
                    setProteinMultiplier(1.8);
                    setFatMultiplier(0.7);
            }
            calculateBMR();
        };

        useEffect(() => {
            calculateMultipliers();
        }, [goal]);

        return (
            <div className="p-6 mb-6 bg-white rounded-lg shadow-md bmr-calculator dark:bg-gray-800">
                <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">BMR & TDEE Calculator</h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Goal:</label>
                    <select value={goal} onChange={(e) => setGoal(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="maintenance">Maintenance</option>
                        <option value="bulking">Bulking</option>
                        <option value="cutting">Cutting</option>
                    </select>
                </div>
                <div className="mb-4">
                    {goal === 'bulking' && (
                        <>
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Bulking</h4>
                            <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                                <li>Protein: 2.0-2.5g/kg</li>
                                <li>Fat: 0.5-2.0g/kg</li>
                                <li>Carbohydrates: 4-7g/kg</li>
                            </ul>
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                Bulking Phase Caloric Surplus: Research suggests aiming for a 10% caloric surplus during bulking phases. This moderate surplus provides sufficient additional energy to support muscle growth while minimizing excessive fat gain. For most individuals, this translates to 300-500 calories above maintenance requirements.
                            </p>
                        </>
                    )}
                    {goal === 'cutting' && (
                        <>
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Cutting</h4>
                            <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                                <li>Protein: 1.6-2.4g/kg (potentially up to 3.1g/kg)</li>
                                <li>Fat: 0.3-0.5g/kg</li>
                                <li>Carbohydrates: Sufficient amounts to fill remaining calories</li>
                            </ul>
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                Cutting Phase Caloric Deficit: For effective fat loss while preserving muscle mass, most experts recommend starting with a 20% caloric deficit from maintenance levels. This moderate deficit (typically 400-600 calories below maintenance) promotes steady fat loss while minimizing muscle catabolism.
                            </p>
                        </>
                    )}
                    {goal === 'maintenance' && (
                        <>
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Maintenance</h4>
                            <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                                <li>Protein: 1.6-2.2g/kg</li>
                                <li>Fat: 0.5-1.0g/kg</li>
                                <li>Carbohydrates: 4-5g/kg</li>
                            </ul>
                        </>
                    )}
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Athlete:</label>
                    <select value={selectedAthlete?.id || ''} onChange={(e) => {
                        const athlete = athletes.find(a => a.id === e.target.value);
                        setSelectedAthlete(athlete || null);
                    }} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">Select an athlete</option>
                        {athletes.map(athlete => (
                            <option key={athlete.id} value={athlete.id}>{athlete.username}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Height (cm):</label>
                        <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weight (kg):</label>
                        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age:</label>
                        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender:</label>
                        <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-col mb-4 sm:flex-row">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Activity Level:</label>
                        <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="1.2">Sedentary: little or no exercise</option>
                            <option value="1.375">Exercise 1-3 times/week</option>
                            <option value="1.55">Exercise 4-5 times/week</option>
                            <option value="1.725">Daily exercise or intense exercise 3-4 times/week</option>
                            <option value="1.9">Intense exercise 6-7 times/week</option>
                            <option value="2.0">Very intense exercise daily, or physical job</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Protein Multiplier:</label>
                        <input type="number" value={proteinMultiplier} onChange={(e) => setProteinMultiplier(parseFloat(e.target.value))} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fat Multiplier:</label>
                        <input type="number" value={fatMultiplier} onChange={(e) => setFatMultiplier(parseFloat(e.target.value))} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Carbs Multiplier:</label>
                        <input type="number" value={carbMultiplier} onChange={(e) => setCarbMultiplier(parseFloat(e.target.value))} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>
                <div className="mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Guidelines</h4>
                    <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                        <li>Exercise: 15-30 minutes of elevated heart rate activity.</li>
                        <li>Intense exercise: 45-120 minutes of elevated heart rate activity.</li>
                        <li>Very intense exercise: 2+ hours of elevated heart rate activity.</li>
                    </ul>
                </div>
                <button onClick={calculateBMR} className="inline-flex justify-center px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Recalculate
                </button>
                <div className="mt-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Energy Expenditure</h4>
                    <table className="min-w-full mt-2 divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Metric</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Value</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">BMR</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{bmr.toFixed(2)} kcal/day</div>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">TDEE</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{tdee.toFixed(2)} kcal/day</div>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Calorie Target</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{calorieTarget.toFixed(2)} kcal/day</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Daily Macronutrient Targets</h4>
                    <table className="min-w-full mt-2 divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Nutrient</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Grams/Day</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Protein</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{(proteinMultiplier * parseFloat(weight)).toFixed(2)} g</div>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Carbohydrates</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{(carbMultiplier * parseFloat(weight)).toFixed(2)} g</div>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Fats</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{(fatMultiplier * parseFloat(weight)).toFixed(2)} g</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

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
            setFilteredPlans(data || []);
        } catch {
             setError('Failed to load plans.'); 
        }
         finally { setIsLoading(false); }
    };
    useEffect(() => { fetchPlans(); }, [profile]);

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
                description: selectedPlan.description ?? ''
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

    const handleDeletePlan = async (planId: string) => {
        if (!profile || !profile.id) return;
        setError(null);
        
        try {
            const { error } = await supabase
                .from('nutrition_plans')
                .delete()
                .eq('id', planId)
                .eq('coach_id', profile.id); // Safety check
            
            if (error) throw error;
            
            // Update local state after successful deletion
            setPlans(prevPlans => prevPlans.filter(plan => plan.id !== planId));
            setFilteredPlans(prevFilteredPlans => prevFilteredPlans.filter(plan => plan.id !== planId));
            
            if (selectedPlan?.id === planId) {
                setSelectedPlan(null);
                setIsCreating(false);
            }
        } catch (err) {
            console.error("Error deleting nutrition plan:", err);
            setError('Failed to delete plan.');
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    return (
        <FormProvider {...methods}>
            <div className="meal-planner">
                <BMRCalculator />
                <div className="container px-4 py-6 mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meal Planner</h1>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">Create and manage nutrition plans for your athletes</p>
                        </div>
                        
                        {!selectedPlan && !isCreating && (
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                                <FiPlus className="mr-2" /> New Plan
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded dark:bg-red-900/20 dark:text-red-400" role="alert">
                            <p>{error}</p>
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
                                    <div className="p-8 text-center border border-gray-300 border-dashed rounded-md dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <p className="text-gray-500 dark:text-gray-400">Meal/Food Item Management will be implemented in future updates</p>
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
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Name</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Calories</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Macros (P/C/F)</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Created</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-300">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {filteredPlans.map((plan) => (
                                                <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</div>
                                                        {plan.description && (
                                                            <div className="max-w-xs mt-1 text-xs text-gray-500 truncate dark:text-gray-400">{plan.description}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{plan.total_calories || '-'} kcal</div>
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
                                                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleEdit(plan)}
                                                            className="mr-3 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
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