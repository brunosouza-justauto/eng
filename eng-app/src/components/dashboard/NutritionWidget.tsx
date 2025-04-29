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

    const header = (
        <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
            </svg>
            <h2 className="text-lg font-medium">Today's Nutrition</h2>
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
                                
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Daily Macros</h4>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Calories</div>
                                            <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                {planData.total_calories?.toLocaleString() ?? 'N/A'}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Protein</div>
                                            <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                {planData.protein_grams?.toLocaleString() ?? 'N/A'}<span className="text-xs font-normal ml-1">g</span>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Carbs</div>
                                            <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                {planData.carbohydrate_grams?.toLocaleString() ?? 'N/A'}<span className="text-xs font-normal ml-1">g</span>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-center shadow-sm">
                                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Fat</div>
                                            <div className="font-bold text-xl text-gray-800 dark:text-gray-200">
                                                {planData.fat_grams?.toLocaleString() ?? 'N/A'}<span className="text-xs font-normal ml-1">g</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
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