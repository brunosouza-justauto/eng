import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import BackButton from '../common/BackButton';
import { FiInfo, FiCheckCircle, FiPlusCircle, FiXCircle, FiShoppingCart } from 'react-icons/fi';
import { logPlannedMeal, deleteLoggedMeal } from '../../services/mealLoggingService';
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
    const navigate = useNavigate();
    
    // Get dayType from URL query parameters
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const dayTypeParam = queryParams.get('dayType');
    
    const [plan, setPlan] = useState<NutritionPlanData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDayType, setSelectedDayType] = useState<string | "all">("all");
    const [loggedMeals, setLoggedMeals] = useState<Record<string, boolean>>({});
    const [loadingMeals, setLoadingMeals] = useState<Record<string, boolean>>({});
    const [loggedMealIds, setLoggedMealIds] = useState<Record<string, string>>({});
    const todayDate = getCurrentDate();

    // Get unique day types from meals
    const dayTypes = useMemo(() => {
        if (!plan?.meals) return [];
        return Array.from(new Set(plan.meals.map(meal => meal.day_type))).filter(Boolean);
    }, [plan?.meals]);

    // Set initial day type from URL parameter or default to the first available day type
    useEffect(() => {
        if (plan) {
            const validDayTypes = Array.from(new Set(plan.meals.map(meal => meal.day_type))).filter(Boolean);
            if (dayTypeParam && validDayTypes.includes(dayTypeParam)) {
                setSelectedDayType(dayTypeParam);
            } else if (validDayTypes.length > 0) {
                setSelectedDayType(validDayTypes[0]);
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
            const mealLogIds: Record<string, string> = {};
            
            try {
                // Get all logged meals for today
                const { data: loggedMealsData, error: logsError } = await supabase
                    .from('meal_logs')
                    .select('id, meal_id')
                    .eq('user_id', userProfile.id)
                    .eq('date', today)
                    .not('is_extra_meal', 'eq', true);

                if (logsError) {
                    console.error('Error fetching logged meals:', logsError);
                }
                
                if (loggedMealsData) {
                    // Create lookup maps
                    loggedMealsData.forEach(loggedMeal => {
                        if (loggedMeal.meal_id) {
                            mealStatus[loggedMeal.meal_id] = true;
                            mealLogIds[loggedMeal.meal_id] = loggedMeal.id;
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching logged meals:', error);
            }
            
            setLoggedMeals(mealStatus);
            setLoggedMealIds(mealLogIds);
        };
        
        checkLoggedMeals();
    }, [plan, userProfile]);

    // Handle log meal action
    const handleLogMeal = async (meal: MealData) => {
        if (!userProfile?.id) return;
        
        setLoadingMeals(prev => ({ ...prev, [meal.id]: true }));
        try {
            // Check if the meal is already logged
            if (loggedMeals[meal.id]) {
                // Find the log entry ID and delete it
                const loggedMealId = loggedMealIds[meal.id];
                if (loggedMealId) {
                    await deleteLoggedMeal(loggedMealId);
                    
                    // Update state
                    setLoggedMeals(prev => ({ ...prev, [meal.id]: false }));
                    setLoggedMealIds(prev => {
                        const newState = { ...prev };
                        delete newState[meal.id];
                        return newState;
                    });
                }
            } else {
                // Log the meal
                const result = await logPlannedMeal(userProfile.id, meal.id, todayDate);
                
                if (result.id) {
                    // Update state
                    setLoggedMeals(prev => ({ ...prev, [meal.id]: true }));
                    setLoggedMealIds(prev => ({ ...prev, [meal.id]: result.id }));
                }
            }
        } catch (error) {
            console.error("Error toggling meal log:", error);
        } finally {
            setLoadingMeals(prev => ({ ...prev, [meal.id]: false }));
        }
    };

    // Filter meals by selected day type
    const filteredMeals = useMemo(() => {
        if (!plan?.meals) return [];
        
        return selectedDayType === "all" 
            ? plan.meals 
            : plan.meals.filter(meal => meal.day_type === selectedDayType);
    }, [plan?.meals, selectedDayType]);

    // Handle shopping list button click
    const handleGenerateShoppingList = () => {
        if (planId) {
            navigate(`/shopping-cart?planId=${planId}`);
        }
    };

    return (
        <div className="container mx-auto py-6">
            <BackButton to="/dashboard" />

            {isLoading && <div className="p-4 flex justify-center"><p>Loading meal plan details...</p></div>}
            {error && <p className="text-red-500 p-4">Error: {error}</p>}
            
            {plan && (
                <div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
                        <div className="flex justify-between items-start mb-3">
                            <div>
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
                            </div>
                        </div>
                        <button
                            onClick={handleGenerateShoppingList}
                            className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded mb-4"
                        >
                            <FiShoppingCart className="mr-2" /> Generate Shopping List
                        </button>
                        {plan.description && 
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4 whitespace-pre-line">{plan.description}</p>
                        }
                    </div>
                    
                    {dayTypes.length > 0 && (
                        <div className="mb-6 overflow-x-auto">
                            <div className="flex space-x-2 p-1">
                                {dayTypes.map(dayType => (
                                    <button
                                        key={dayType}
                                        onClick={() => setSelectedDayType(dayType)}
                                        className={`capitalize px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors
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

                    <div id="todays-meals" className="space-y-6">
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
                                                </div>
                                                
                                                <div className="flex items-center">
                                                    <div className="text-right">
                                                        <p className="text-lg font-medium text-white">
                                                            {mealNutrition.calories} kcal
                                                        </p>
                                                    </div>
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
                                            <table className="w-full text-sm table-fixed">
                                                <thead className="text-xs text-gray-400 border-b border-gray-800 dark:border-gray-700">
                                                    <tr>
                                                        <th className="text-left pb-3 font-medium w-1/2">Item</th>
                                                        <th className="text-right pb-3 font-medium w-1/4">Amount</th>
                                                        <th className="text-right pb-3 font-medium w-1/4">Calories</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-300">
                                                    {meal.meal_food_items.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="py-3 text-center text-gray-500">
                                                                No food items defined for this meal.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        meal.meal_food_items.map((item, idx) => {
                                                            const itemNutrition = calculateItemNutrition(item);
                                                            
                                                            return (
                                                                <tr key={idx} className="border-b border-gray-800 dark:border-gray-700 last:border-0">
                                                                    <td className="py-3">
                                                                        <div className="font-medium">
                                                                            {item.food_items?.food_name ?? 'Unknown Item'}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 mt-1">
                                                                            P: {itemNutrition.protein} · C: {itemNutrition.carbs} · F: {itemNutrition.fat}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 text-right whitespace-nowrap align-top">
                                                                        {item.quantity}{item.unit}
                                                                    </td>
                                                                    <td className="py-3 text-right align-top">
                                                                        {itemNutrition.calories}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                            
                                            <div className="mt-4">
                                                <button 
                                                    onClick={() => handleLogMeal(meal)}
                                                    disabled={loadingMeals[meal.id]}
                                                    className={`w-full py-2 px-4 rounded-md transition-colors flex justify-center items-center ${
                                                        isLogged 
                                                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                                    }`}
                                                >
                                                    {loadingMeals[meal.id] ? (
                                                        <span className="block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                                                    ) : isLogged ? (
                                                        <>
                                                            <FiXCircle size={18} className="mr-2" />
                                                            Remove from log
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiPlusCircle size={18} className="mr-2" />
                                                            Log this meal
                                                        </>
                                                    )}
                                                </button>
                                            </div>
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