import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Import useParams
// import { useParams } from 'react-router-dom'; // Will use this later for routing
import { supabase } from '../../services/supabaseClient';

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
    name: string;
    order_in_plan: number | null;
    notes: string | null;
    meal_food_items: MealFoodItemData[];
}

interface NutritionPlanData {
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

const MealPlanView: React.FC = () => {
    const { planId } = useParams<MealPlanViewParams>(); // Get ID from route params

    const [plan, setPlan] = useState<NutritionPlanData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

     useEffect(() => {
        const fetchFullPlan = async () => {
            if (!planId) { // Check if planId is defined
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
                        name,
                        total_calories,
                        protein_grams,
                        carbohydrate_grams,
                        fat_grams,
                        description,
                        meals (
                            name,
                            order_in_plan,
                            notes,
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
                    // Optional: Order meals and items
                    // .order('order_in_plan', { foreignTable: 'meals', ascending: true })
                    // .order('id', { foreignTable: 'meals.meal_food_items', ascending: true }) // Example order
                    .single();

                if (fetchError) throw fetchError;
                
                if (data) {
                    setPlan(data as NutritionPlanData); // Type assertion might be needed
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

    }, [planId]); // useEffect depends on planId from params


    return (
        <div className="container mx-auto p-4">
            {isLoading && <p>Loading meal plan details...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {plan && (
                <div>
                    <h1 className="text-2xl font-bold mb-2">{plan.name}</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Target: {plan.total_calories}kcal, P:{plan.protein_grams}g, C:{plan.carbohydrate_grams}g, F:{plan.fat_grams}g</p>
                    {plan.description && <p className="mb-4 italic">{plan.description}</p>}

                    <div className="space-y-6">
                        {plan.meals
                            .sort((a, b) => (a.order_in_plan ?? 0) - (b.order_in_plan ?? 0))
                            .map((meal) => (
                            <div key={meal.name} className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                                <h2 className="font-semibold mb-2">{meal.name}</h2>
                                {meal.notes && <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-2">{meal.notes}</p>}
                                <ul className="text-sm space-y-1">
                                    {meal.meal_food_items.map((item, idx) => (
                                        <li key={idx}> 
                                            {item.quantity}{item.unit} - {item.food_items?.food_name ?? 'Unknown Item'}
                                            {/* TODO: Add macro breakdown per item if needed */} 
                                        </li>
                                    ))}
                                    {meal.meal_food_items.length === 0 && <li>No food items defined for this meal.</li>}
                                </ul>
                            </div>
                        ))}
                        {plan.meals.length === 0 && <p>No meals defined for this plan.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealPlanView; 