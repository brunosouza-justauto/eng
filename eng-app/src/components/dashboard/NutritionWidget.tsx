import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { ButtonLink } from '../ui/Button';

interface NutritionWidgetProps {
  nutritionPlanId: string | null | undefined;
}

// Define types for fetched data
interface FoodItemData {
    food_name: string;
    // Add other fields if needed for display
}

interface MealFoodItemData {
    quantity: number;
    unit: string;
    // Add nutrition properties
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    food_items: FoodItemData | null; // Nested fetch
}

interface MealData {
    name: string;
    order_in_plan: number | null;
    day_number: number | null;
    day_type: string | null; // Day type (e.g., "Training Day", "Rest Day")
    meal_food_items: MealFoodItemData[];
}

interface NutritionPlanData {
    name: string;
    total_calories: number | null;
    protein_grams: number | null;
    carbohydrate_grams: number | null;
    fat_grams: number | null;
    meals: MealData[];
}

interface NutritionPlanDataWithId extends NutritionPlanData {
    id: string;
}

// Helper type for organizing meals by day type
interface DayTypeMeals {
    dayType: string;
    meals: MealData[];
}

// Nutrition totals for a day type
interface DayTypeNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

const NutritionWidget: React.FC<NutritionWidgetProps> = ({ nutritionPlanId }) => {
    const [planData, setPlanData] = useState<NutritionPlanDataWithId | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDayType, setSelectedDayType] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    
    // Daily nutrition for each day type
    const [dayTypeNutrition, setDayTypeNutrition] = useState<Record<string, DayTypeNutrition>>({});

    useEffect(() => {
        const fetchPlan = async () => {
            if (!nutritionPlanId) {
                setPlanData(null);
                setError(null);
                setIsLoading(false);
                return; 
            }

            setIsLoading(true);
            setError(null);
            setPlanData(null);

            try {
                // Also fetch food_items nutrition data to calculate per-day type macros
                const { data, error: fetchError } = await supabase
                    .from('nutrition_plans')
                    .select(`
                        id,
                        name,
                        total_calories,
                        protein_grams,
                        carbohydrate_grams,
                        fat_grams,
                        meals (
                            name,
                            order_in_plan,
                            day_number,
                            day_type,
                            meal_food_items (
                                quantity,
                                unit,
                                calories,
                                protein,
                                carbs,
                                fat,
                                food_items ( food_name )
                            )
                        )
                    `)
                    .eq('id', nutritionPlanId)
                    .order('day_type', { foreignTable: 'meals', ascending: true })
                    .order('order_in_plan', { foreignTable: 'meals', ascending: true })
                    .single();

                if (fetchError) throw fetchError;

                if (data) {
                    // Cast the data safely
                    const typedData = data as unknown as NutritionPlanDataWithId;
                    setPlanData(typedData);
                    
                    // Calculate nutrition totals per day type
                    const dayTypes = calculateDayTypeNutrition(typedData.meals);
                    setDayTypeNutrition(dayTypes);

                    // Set default selected day type
                    if (typedData.meals && typedData.meals.length > 0) {
                        // Find first day type with meals
                        const firstDayType = Object.keys(dayTypes)[0] || null;
                        setSelectedDayType(firstDayType);
                    }
                } else {
                    setError('Assigned nutrition plan not found.');
                }

            } catch (err: unknown) {
                console.error("Error fetching nutrition plan data:", err);
                let message = 'Failed to load nutrition plan data.';
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    message = (err as Error).message;
                }
                setError(message);
                setPlanData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlan();

    }, [nutritionPlanId]);

    // Reset expanded state when day type changes
    useEffect(() => {
        setIsExpanded(false);
    }, [selectedDayType]);

    // Calculate nutrition totals per day type from meals
    const calculateDayTypeNutrition = (meals: MealData[]): Record<string, DayTypeNutrition> => {
        if (!meals || meals.length === 0) return {};

        const nutritionByDayType: Record<string, DayTypeNutrition> = {};
        
        meals.forEach(meal => {
            // Use a default day type if none exists
            const dayType = meal.day_type || 'Unspecified';
            
            if (!nutritionByDayType[dayType]) {
                nutritionByDayType[dayType] = {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                };
            }
            
            // Add up meal food item nutrients
            (meal.meal_food_items || []).forEach(item => {
                if (item) {
                    nutritionByDayType[dayType].calories += item.calories || 0;
                    nutritionByDayType[dayType].protein += item.protein || 0;
                    nutritionByDayType[dayType].carbs += item.carbs || 0;
                    nutritionByDayType[dayType].fat += item.fat || 0;
                }
            });
        });
        
        return nutritionByDayType;
    };

    // Group meals by day type
    const getMealsByDayType = (): DayTypeMeals[] => {
        if (!planData?.meals || planData.meals.length === 0) return [];

        // Create a map to group meals by day type
        const mealsByDayType = new Map<string, MealData[]>();
        
        // Group all meals by their day type
        planData.meals.forEach(meal => {
            // Use a default day type if none exists
            const dayType = meal.day_type || 'Unspecified';
            
            if (!mealsByDayType.has(dayType)) {
                mealsByDayType.set(dayType, []);
            }
            mealsByDayType.get(dayType)?.push(meal);
        });
        
        // Convert map to array and sort alphabetically by day type
        return Array.from(mealsByDayType.entries())
            .map(([dayType, meals]) => ({ 
                dayType, 
                meals: meals.sort((a, b) => (a.order_in_plan || 0) - (b.order_in_plan || 0))
            }))
            .sort((a, b) => a.dayType.localeCompare(b.dayType));
    };

    const dayTypeMeals = getMealsByDayType();
    
    // Get the current day type's meals
    const currentDayType = selectedDayType || (dayTypeMeals[0]?.dayType ?? null);
    const currentDayMeals = dayTypeMeals.find(d => d.dayType === currentDayType)?.meals || [];
    
    // Get nutrition for current day type
    const currentNutrition = currentDayType ? dayTypeNutrition[currentDayType] || null : null;
    
    // For the summary view, show only the first two meals
    const summaryMeals = currentDayMeals.slice(0, 2);
    const remainingMealsCount = currentDayMeals.length - summaryMeals.length;

    const header = (
        <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
            </svg>
            <h2 className="text-lg font-medium">Today's Nutrition</h2>
        </div>
    );

    // Render a single meal card
    const renderMealCard = (meal: MealData, index: number) => (
        <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
            <h5 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">{meal.name}</h5>
            {meal.meal_food_items && meal.meal_food_items.length > 0 ? (
                <ul className="space-y-2">
                    {meal.meal_food_items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300 truncate pr-2">
                                {item.food_items?.food_name || 'Unknown food'}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {item.quantity} {item.unit}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No food items</p>
            )}
        </div>
    );

    return (
        <Card 
            header={header}
            className="h-full flex flex-col"
            variant="default"
        >
            <div className="flex-grow overflow-y-auto">
                {isLoading && (
                    <div className="flex items-center justify-center h-full py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                )}
                
                {error && (
                    <div className="text-red-500 text-sm flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}
                
                {!isLoading && !error && (
                    <>
                        {!nutritionPlanId && (
                            <div className="text-center py-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Nutrition Plan</h3>
                                <p className="text-gray-500 dark:text-gray-400">You don't have an active meal plan assigned</p>
                            </div>
                        )}
                        
                        {nutritionPlanId && !planData && (
                            <div className="text-center py-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Plan Not Found</h3>
                                <p className="text-gray-500 dark:text-gray-400">The assigned meal plan could not be found</p>
                            </div>
                        )}
                        
                        {planData && (
                            <div className="space-y-5">
                                <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">{planData.name}</h3>
                                </div>
                                
                                {/* Day type selector tabs */}
                                {dayTypeMeals.length > 1 && (
                                    <div className="flex overflow-x-auto space-x-2 pb-2">
                                        {dayTypeMeals.map((dayTypeMeal) => (
                                            <button
                                                key={dayTypeMeal.dayType}
                                                onClick={() => setSelectedDayType(dayTypeMeal.dayType)}
                                                className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                                                    selectedDayType === dayTypeMeal.dayType
                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {dayTypeMeal.dayType}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Daily Macros for the selected day type */}
                                {currentDayType && currentNutrition && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            {currentDayType} Macros
                                        </h4>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Calories</div>
                                                <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                    {Math.round(currentNutrition.calories).toLocaleString() ?? 'N/A'}
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Protein</div>
                                                <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                    {Math.round(currentNutrition.protein).toLocaleString() ?? 'N/A'}<span className="text-xs font-normal ml-1">g</span>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Carbs</div>
                                                <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                    {Math.round(currentNutrition.carbs).toLocaleString() ?? 'N/A'}<span className="text-xs font-normal ml-1">g</span>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Fat</div>
                                                <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                    {Math.round(currentNutrition.fat).toLocaleString() ?? 'N/A'}<span className="text-xs font-normal ml-1">g</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Meals for selected day type */}
                                {dayTypeMeals.length > 0 ? (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {currentDayType} Meals
                                            </h4>
                                            {currentDayMeals.length > 0 && (
                                                <button 
                                                    onClick={() => setIsExpanded(!isExpanded)}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                                                >
                                                    {isExpanded ? 'Show Less' : 'Show All'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {currentDayMeals.length > 0 ? (
                                            <div className="space-y-4">
                                                {/* Show either summary or all meals based on expanded state */}
                                                {(isExpanded ? currentDayMeals : summaryMeals).map((meal, index) => 
                                                    renderMealCard(meal, index)
                                                )}
                                                
                                                {/* Show "more meals" indicator if not expanded */}
                                                {!isExpanded && remainingMealsCount > 0 && (
                                                    <button 
                                                        onClick={() => setIsExpanded(true)}
                                                        className="w-full py-2 px-3 text-sm text-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                                                    >
                                                        + {remainingMealsCount} more meal{remainingMealsCount !== 1 ? 's' : ''}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No meals defined for this day type</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No meals defined for this plan</p>
                                    </div>
                                )}
                                
                                <div className="pt-2">
                                    <ButtonLink 
                                        to={`/meal-plan/${planData.id}`}
                                        variant="secondary"
                                        color="indigo"
                                        fullWidth
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        }
                                    >
                                        View Full Meal Plan
                                    </ButtonLink>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
};

export default NutritionWidget; 