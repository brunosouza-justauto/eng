import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

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
    food_items: FoodItemData | null; // Nested fetch
}

interface MealData {
    name: string;
    order_in_plan: number | null;
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

const NutritionWidget: React.FC<NutritionWidgetProps> = ({ nutritionPlanId }) => {
    const [planData, setPlanData] = useState<NutritionPlanDataWithId | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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
                            meal_food_items (
                                quantity,
                                unit,
                                food_items ( food_name )
                            )
                        )
                    `)
                    .eq('id', nutritionPlanId)
                    // TODO: Add ordering for meals and meal_food_items if needed
                    // .order('order_in_plan', { foreignTable: 'meals', ascending: true })
                    .single();

                if (fetchError) throw fetchError;

                if (data) {
                    setPlanData(data as NutritionPlanDataWithId);
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

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">Today's Nutrition</h2>
            <div className="flex-grow overflow-y-auto text-sm">
                {isLoading && <p>Loading nutrition plan...</p>}
                {error && <p className="text-red-500">Error: {error}</p>}
                {!isLoading && !error && (
                    <>
                        {!nutritionPlanId && <p>No active nutrition plan assigned.</p>}
                        {nutritionPlanId && !planData && <p>Nutrition plan details not found.</p>}
                        {planData && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base text-indigo-600 dark:text-indigo-400">{planData.name}</h3>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Calories</div>
                                        <div className="font-medium">{planData.total_calories ?? 'N/A'}</div>
                                    </div>
                                     <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Protein</div>
                                        <div className="font-medium">{planData.protein_grams ?? 'N/A'}g</div>
                                    </div>
                                     <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Carbs</div>
                                        <div className="font-medium">{planData.carbohydrate_grams ?? 'N/A'}g</div>
                                    </div>
                                     <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
                                        <div className="font-medium">{planData.fat_grams ?? 'N/A'}g</div>
                                    </div>
                                </div>
                                
                                <Link 
                                    to={`/meal-plan/${planData.id}`}
                                    className="mt-3 inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    View Full Meal Plan
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NutritionWidget; 