import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import BackButton from '../common/BackButton';
import { FiInfo, FiCheckCircle } from 'react-icons/fi';
import { checkIfMealLogged } from '../../services/mealLoggingService';
import { getCurrentDate } from '../../utils/dateUtils';
import { selectProfile } from '../../store/slices/authSlice';
import { useSelector } from 'react-redux';

// Define types locally (consider moving later)
interface FoodItemData {
    food_name: string;
    calories_per_100g: number | null;
    protein_per_100g: number | null;
    carbs_per_100g: number | null;
    fat_per_100g: number | null;
    nutrient_basis: string; // '100g' or '100mL'
}

interface MealFoodItemData {
    quantity: number;
    unit: string;
    food_items: FoodItemData | null;
}

interface MealData {
    id: string;
    name: string;
    order_in_plan: number | null;
    notes: string | null;
    day_type: string;
    meal_food_items: MealFoodItemData[];
}

interface NutritionPlanData {
    id: string;
    name: string;
    total_calories: number | null;
    protein_grams: number | null;
    carbohydrate_grams: number | null;
    fat_grams: number | null;
    description: string | null;
    meals: MealData[];
}

// Define params type
interface MealPlanViewParams extends Record<string, string | undefined> {
  planId: string;
}

// Calculate nutrition for a single food item
const calculateItemNutrition = (item: MealFoodItemData) => {
    if (!item.food_items) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    const multiplier = item.food_items.nutrient_basis === '100g' 
        ? item.quantity / 100 
        : item.quantity / 100; // Adjust for mL if needed
    
    return {
        calories: Math.round((item.food_items.calories_per_100g || 0) * multiplier),
        protein: Math.round(((item.food_items.protein_per_100g || 0) * multiplier) * 10) / 10,
        carbs: Math.round(((item.food_items.carbs_per_100g || 0) * multiplier) * 10) / 10,
        fat: Math.round(((item.food_items.fat_per_100g || 0) * multiplier) * 10) / 10
    };
};

// Calculate total nutrition for a meal
const calculateMealNutrition = (meal: MealData) => {
    return meal.meal_food_items.reduce((totals, item) => {
        const itemNutrition = calculateItemNutrition(item);
        return {
            calories: totals.calories + itemNutrition.calories,
            protein: Math.round((totals.protein + itemNutrition.protein) * 10) / 10,
            carbs: Math.round((totals.carbs + itemNutrition.carbs) * 10) / 10,
            fat: Math.round((totals.fat + itemNutrition.fat) * 10) / 10
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
};

const MealPlanView: React.FC = () => {
    const { planId } = useParams<MealPlanViewParams>();
    const userProfile = useSelector(selectProfile);
    const location = useLocation();
    
    // Get dayType from URL query parameters
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const dayTypeParam = queryParams.get('dayType');
    
    const [plan, setPlan] = useState<NutritionPlanData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDayType, setSelectedDayType] = useState<string | "all">("all");
    const [loggedMeals, setLoggedMeals] = useState<Record<string, boolean>>({});

    // Get unique day types from meals
    const dayTypes = useMemo(() => {
        if (!plan?.meals) return [];
        return Array.from(new Set(plan.meals.map(meal => meal.day_type))).filter(Boolean);
    }, [plan?.meals]);

    // Set initial day type from URL parameter when plan loads
    useEffect(() => {
        if (dayTypeParam && plan) {
            // Check if the day type from URL is valid for this plan
            const validDayTypes = Array.from(new Set(plan.meals.map(meal => meal.day_type))).filter(Boolean);
            if (validDayTypes.includes(dayTypeParam)) {
                setSelectedDayType(dayTypeParam);
            }
        }
    }, [dayTypeParam, plan]);

    useEffect(() => {
        const fetchFullPlan = async () => {
            if (!planId) {
                setError('Nutrition Plan ID not provided.');
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            setPlan(null);

            try {
                // Fetch specific plan and all its meals/items
                const { data, error: fetchError } = await supabase
                    .from('nutrition_plans')
                    .select(`
                        id,
                        name,
                        total_calories,
                        protein_grams,
                        carbohydrate_grams,
                        fat_grams,
                        description,
                        meals (
                            id,
                            name,
                            order_in_plan,
                            notes,
                            day_type,
                            meal_food_items (
                                quantity,
                                unit,
                                food_items (
                                    food_name,
                                    calories_per_100g,
                                    protein_per_100g,
                                    carbs_per_100g,
                                    fat_per_100g,
                                    nutrient_basis
                                )
                            )
                        )
                    `)
                    .eq('id', planId)
                    .single();

                if (fetchError) throw fetchError;
                
                if (data) {
                    setPlan(data as NutritionPlanData);
                } else {
                    setError('Nutrition Plan not found.');
                }

            } catch (err: unknown) {
                console.error("Error fetching full nutrition plan data:", err);
                let message = 'Failed to load nutrition plan.';
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    message = (err as Error).message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullPlan();
    }, [planId]);

    // Check which meals have already been logged today
    useEffect(() => {
        const checkLoggedMeals = async () => {
            if (!plan || !userProfile) return;
            
            const today = getCurrentDate();
            const mealStatus: Record<string, boolean> = {};
            
            for (const meal of plan.meals) {
                if (meal.id && typeof meal.id === 'string') {
                    try {
                        const isLogged = await checkIfMealLogged(userProfile.id, meal.id, today);
                        mealStatus[meal.id] = isLogged;
                    } catch (error) {
                        console.error(`Error checking if meal ${meal.id} is logged:`, error);
                        mealStatus[meal.id] = false;
                    }
                }
            }
            
            setLoggedMeals(mealStatus);
        };
        
        checkLoggedMeals();
    }, [plan, userProfile]);

    // Filter meals by selected day type
    const filteredMeals = useMemo(() => {
        if (!plan?.meals) return [];
        
        return selectedDayType === "all" 
            ? plan.meals 
            : plan.meals.filter(meal => meal.day_type === selectedDayType);
    }, [plan?.meals, selectedDayType]);

    return (
        <div className="container p-4 mx-auto">
            <BackButton to="/dashboard" />

            {isLoading && <div className="p-4 flex justify-center"><p>Loading meal plan details...</p></div>}
            {error && <p className="text-red-500 p-4">Error: {error}</p>}
            
            {plan && (
                <div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{plan.name}</h1>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-sm text-blue-700 dark:text-blue-300">
                                {plan.total_calories}kcal
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full text-sm text-red-700 dark:text-red-300">
                                P: {plan.protein_grams}g
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm text-green-700 dark:text-green-300">
                                C: {plan.carbohydrate_grams}g
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full text-sm text-yellow-700 dark:text-yellow-300">
                                F: {plan.fat_grams}g
                            </div>
                        </div>
                        
                        {plan.description && 
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">{plan.description}</p>
                        }
                    </div>
                    
                    {dayTypes.length > 0 && (
                        <div className="mb-6 overflow-x-auto">
                            <div className="flex space-x-2 p-1">
                                {dayTypes.map(dayType => (
                                    <button
                                        key={dayType}
                                        onClick={() => setSelectedDayType(dayType)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                                            ${selectedDayType === dayType 
                                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" 
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                            }`}
                                    >
                                        {dayType}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {filteredMeals.length === 0 && 
                            <p className="text-center p-4 text-gray-500 dark:text-gray-400">
                                No meals available for the selected day type.
                            </p>
                        }
                        
                        {filteredMeals
                            .sort((a, b) => (a.order_in_plan ?? 0) - (b.order_in_plan ?? 0))
                            .map((meal) => {
                                const mealNutrition = calculateMealNutrition(meal);
                                const isLogged = loggedMeals[meal.id] || false;
                                
                                return (
                                    <div key={meal.id} className="bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden text-white">
                                        <div className="p-4 border-b border-gray-800 dark:border-gray-700">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-xl font-semibold text-white flex items-center">
                                                        {meal.name}
                                                        {isLogged && (
                                                            <span className="ml-2 text-green-500 dark:text-green-400" title="Logged today">
                                                                <FiCheckCircle />
                                                            </span>
                                                        )}
                                                    </h2>
                                                    
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        Day Type: {meal.day_type}
                                                    </p>
                                                </div>
                                                
                                                <div className="text-right">
                                                    <p className="text-lg font-medium text-white">
                                                        {mealNutrition.calories} kcal
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-2 text-sm text-gray-300">
                                                P: {mealNutrition.protein}g · C: {mealNutrition.carbs}g · F: {mealNutrition.fat}g
                                            </div>
                                        </div>
                                        
                                        {meal.notes && (
                                            <div className="px-4 py-2 bg-gray-800 dark:bg-gray-700 flex items-start">
                                                <FiInfo className="text-indigo-400 mt-0.5 mr-2 flex-shrink-0" />
                                                <p className="text-sm text-indigo-200">
                                                    {meal.notes}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="p-4">
                                            <table className="w-full text-sm">
                                                <thead className="text-xs text-gray-400 border-b border-gray-800 dark:border-gray-700">
                                                    <tr>
                                                        <th className="text-left pb-3 font-medium">Item</th>
                                                        <th className="text-right pb-3 font-medium">Amount</th>
                                                        <th className="text-right pb-3 font-medium">Calories</th>
                                                        <th className="text-right pb-3 font-medium whitespace-nowrap">P/C/F (g)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-300">
                                                    {meal.meal_food_items.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-3 text-center text-gray-500">
                                                                No food items defined for this meal.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        meal.meal_food_items.map((item, idx) => {
                                                            const itemNutrition = calculateItemNutrition(item);
                                                            
                                                            return (
                                                                <tr key={idx} className="border-b border-gray-800 dark:border-gray-700 last:border-0">
                                                                    <td className="py-3 font-medium">
                                                                        {item.food_items?.food_name ?? 'Unknown Item'}
                                                                    </td>
                                                                    <td className="py-3 text-right whitespace-nowrap">
                                                                        {item.quantity}{item.unit}
                                                                    </td>
                                                                    <td className="py-3 text-right">
                                                                        {itemNutrition.calories}
                                                                    </td>
                                                                    <td className="py-3 text-right whitespace-nowrap">
                                                                        {itemNutrition.protein}/{itemNutrition.carbs}/{itemNutrition.fat}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealPlanView; 