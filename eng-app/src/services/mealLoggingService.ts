import { supabase } from './supabaseClient';
import { 
    LoggedMeal, 
    LoggedMealWithNutrition, 
    DailyNutritionLog,
    ExtraMealFormData,
    MealWithFoodItems
} from '../types/mealPlanning';
import { getNutritionPlanById } from './mealPlanningService';
import { calculateNutrition } from '../types/mealPlanning';

/**
 * Log a meal from the meal plan as eaten
 * @param userId User ID
 * @param mealId Meal ID from the meal plan
 * @param date Date when the meal was eaten (YYYY-MM-DD)
 * @param additionalNotes Optional additional notes
 */
export const logPlannedMeal = async (
    userId: string,
    mealId: string,
    date: string,
    additionalNotes?: string
): Promise<LoggedMeal> => {
    try {
        // First, get the meal details
        const { data: mealData, error: mealError } = await supabase
            .from('meals')
            .select('*, nutrition_plans(*)')
            .eq('id', mealId)
            .single();
        
        if (mealError) throw mealError;
        if (!mealData) throw new Error('Meal not found');
        
        // Create a timestamp for the current time
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0]; // Format: HH:MM:SS
        
        // Create the meal log entry
        const mealLog = {
            user_id: userId,
            meal_id: mealId,
            nutrition_plan_id: mealData.nutrition_plan_id,
            name: mealData.name,
            date,
            time: timeString,
            day_type: mealData.day_type || 'Unspecified',
            notes: additionalNotes,
            is_extra_meal: false
        };
        
        const { data: loggedMeal, error: logError } = await supabase
            .from('meal_logs')
            .insert(mealLog)
            .select()
            .single();
        
        if (logError) throw logError;
        return loggedMeal;
    } catch (error) {
        console.error('Error logging planned meal:', error);
        throw error;
    }
};

/**
 * Log an extra meal that's not in the meal plan
 * @param userId User ID
 * @param nutritionPlanId Nutrition plan ID
 * @param extraMeal Extra meal data
 * @param date Date when the meal was eaten (YYYY-MM-DD)
 */
export const logExtraMeal = async (
    userId: string,
    nutritionPlanId: string,
    extraMeal: ExtraMealFormData,
    date: string
): Promise<LoggedMealWithNutrition> => {
    try {
        // Create a timestamp for the current time
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0]; // Format: HH:MM:SS
        
        // Create the meal log entry for the extra meal
        const mealLog = {
            user_id: userId,
            nutrition_plan_id: nutritionPlanId,
            name: extraMeal.name,
            date,
            time: timeString,
            day_type: extraMeal.day_type,
            notes: extraMeal.notes,
            is_extra_meal: true
        };
        
        // Insert the meal log
        const { data: loggedMeal, error: logError } = await supabase
            .from('meal_logs')
            .insert(mealLog)
            .select()
            .single();
        
        if (logError) throw logError;
        
        // Insert food items for the extra meal
        if (extraMeal.food_items.length > 0) {
            const extraMealFoodItems = extraMeal.food_items.map(item => ({
                meal_log_id: loggedMeal.id,
                food_item_id: item.food_item_id,
                quantity: item.quantity,
                unit: item.unit
            }));
            
            const { error: foodItemsError } = await supabase
                .from('extra_meal_food_items')
                .insert(extraMealFoodItems);
            
            if (foodItemsError) throw foodItemsError;
        }
        
        // Get the food items with nutrition data
        const { data: foodItemsData, error: foodItemsQueryError } = await supabase
            .from('extra_meal_food_items')
            .select(`
                *,
                food_item:food_items(*)
            `)
            .eq('meal_log_id', loggedMeal.id);
        
        if (foodItemsQueryError) throw foodItemsQueryError;
        
        // Calculate nutrition totals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        
        if (foodItemsData) {
            foodItemsData.forEach(item => {
                if (item.food_item) {
                    const nutrition = calculateNutrition(
                        item.food_item,
                        item.quantity,
                        item.unit
                    );
                    
                    totalCalories += nutrition.calories;
                    totalProtein += nutrition.protein;
                    totalCarbs += nutrition.carbs;
                    totalFat += nutrition.fat;
                }
            });
        }
        
        // Return the logged meal with nutrition data
        return {
            ...loggedMeal,
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_carbs: totalCarbs,
            total_fat: totalFat,
            food_items: foodItemsData
        };
    } catch (error) {
        console.error('Error logging extra meal:', error);
        throw error;
    }
};

/**
 * Delete a logged meal
 * @param mealLogId Meal log ID
 */
export const deleteLoggedMeal = async (mealLogId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('meal_logs')
            .delete()
            .eq('id', mealLogId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting logged meal:', error);
        throw error;
    }
};

/**
 * Get logged meals for a user on a specific date
 * @param userId User ID
 * @param date Date to fetch logs for (YYYY-MM-DD)
 */
export const getLoggedMealsForDate = async (
    userId: string,
    date: string
): Promise<DailyNutritionLog> => {
    try {
        // Get all logged meals for the date
        const { data: loggedMeals, error: logsError } = await supabase
            .from('meal_logs')
            .select(`
                *,
                meal:meals(
                    *,
                    food_items:meal_food_items(
                        *,
                        food_item:food_items(*)
                    )
                )
            `)
            .eq('user_id', userId)
            .eq('date', date)
            .order('time', { ascending: true });
        
        if (logsError) throw logsError;
        
        // Get all extra meals and their food items
        const extraMealIds = loggedMeals
            ?.filter(meal => meal.is_extra_meal)
            .map(meal => meal.id) || [];
        
        let extraMealFoodItems = [];
        if (extraMealIds.length > 0) {
            const { data: extraFoodItems, error: extraError } = await supabase
                .from('extra_meal_food_items')
                .select(`
                    *,
                    food_item:food_items(*)
                `)
                .in('meal_log_id', extraMealIds);
            
            if (extraError) throw extraError;
            extraMealFoodItems = extraFoodItems || [];
        }
        
        // Process each meal log to include nutrition data
        const loggedMealsWithNutrition: LoggedMealWithNutrition[] = (loggedMeals || []).map(loggedMeal => {
            if (loggedMeal.is_extra_meal) {
                // For extra meals, get food items and calculate nutrition
                const mealFoodItems = extraMealFoodItems.filter(
                    item => item.meal_log_id === loggedMeal.id
                );
                
                // Calculate nutrition totals
                let totalCalories = 0;
                let totalProtein = 0;
                let totalCarbs = 0;
                let totalFat = 0;
                
                mealFoodItems.forEach(item => {
                    if (item.food_item) {
                        const nutrition = calculateNutrition(
                            item.food_item,
                            item.quantity,
                            item.unit
                        );
                        
                        totalCalories += nutrition.calories;
                        totalProtein += nutrition.protein;
                        totalCarbs += nutrition.carbs;
                        totalFat += nutrition.fat;
                    }
                });
                
                return {
                    ...loggedMeal,
                    total_calories: totalCalories,
                    total_protein: totalProtein,
                    total_carbs: totalCarbs,
                    total_fat: totalFat,
                    food_items: mealFoodItems
                };
            } else {
                // For planned meals, get nutrition from the original meal
                const meal = loggedMeal.meal;
                if (!meal) {
                    // If the original meal was deleted, return zeros
                    return {
                        ...loggedMeal,
                        total_calories: 0,
                        total_protein: 0,
                        total_carbs: 0,
                        total_fat: 0
                    };
                }
                
                // Calculate totals from food items
                let totalCalories = 0;
                let totalProtein = 0;
                let totalCarbs = 0;
                let totalFat = 0;
                
                meal.food_items?.forEach(item => {
                    if (item.food_item) {
                        const nutrition = calculateNutrition(
                            item.food_item,
                            item.quantity,
                            item.unit
                        );
                        
                        totalCalories += nutrition.calories;
                        totalProtein += nutrition.protein;
                        totalCarbs += nutrition.carbs;
                        totalFat += nutrition.fat;
                    }
                });
                
                return {
                    ...loggedMeal,
                    total_calories: totalCalories,
                    total_protein: totalProtein,
                    total_carbs: totalCarbs,
                    total_fat: totalFat
                };
            }
        });
        
        // Calculate daily totals
        const totals = loggedMealsWithNutrition.reduce(
            (acc, meal) => {
                return {
                    total_calories: acc.total_calories + meal.total_calories,
                    total_protein: acc.total_protein + meal.total_protein,
                    total_carbs: acc.total_carbs + meal.total_carbs,
                    total_fat: acc.total_fat + meal.total_fat
                };
            },
            { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 }
        );
        
        // Determine primary day type for the date (most common among logged meals)
        let dayType = 'Unspecified';
        if (loggedMealsWithNutrition.length > 0) {
            const dayTypeCounts: Record<string, number> = {};
            loggedMealsWithNutrition.forEach(meal => {
                const type = meal.day_type || 'Unspecified';
                dayTypeCounts[type] = (dayTypeCounts[type] || 0) + 1;
            });
            
            // Find the day type with the highest count
            dayType = Object.entries(dayTypeCounts).reduce(
                (a, b) => (a[1] > b[1] ? a : b),
                ['Unspecified', 0]
            )[0];
        }
        
        // Get the active nutrition plan to determine targets
        let targetCalories, targetProtein, targetCarbs, targetFat;
        if (loggedMealsWithNutrition.length > 0) {
            const nutritionPlanId = loggedMealsWithNutrition[0].nutrition_plan_id;
            try {
                const plan = await getNutritionPlanById(nutritionPlanId);
                targetCalories = plan?.total_calories;
                targetProtein = plan?.protein_grams;
                targetCarbs = plan?.carbohydrate_grams;
                targetFat = plan?.fat_grams;
            } catch (err) {
                console.error('Error fetching nutrition plan:', err);
            }
        }
        
        return {
            date,
            day_type: dayType,
            logged_meals: loggedMealsWithNutrition,
            ...totals,
            target_calories: targetCalories,
            target_protein: targetProtein,
            target_carbs: targetCarbs,
            target_fat: targetFat
        };
    } catch (error) {
        console.error('Error getting logged meals for date:', error);
        throw error;
    }
};

/**
 * Get logged meals for a user within a date range
 * @param userId User ID
 * @param startDate Start date (inclusive, YYYY-MM-DD)
 * @param endDate End date (inclusive, YYYY-MM-DD)
 */
export const getLoggedMealsForDateRange = async (
    userId: string,
    startDate: string,
    endDate: string
): Promise<DailyNutritionLog[]> => {
    try {
        // Get all dates in the range
        const dates: string[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
            dates.push(date.toISOString().split('T')[0]);
        }
        
        // Get logs for each date
        const logsPromises = dates.map(date => getLoggedMealsForDate(userId, date));
        return Promise.all(logsPromises);
    } catch (error) {
        console.error('Error getting logged meals for date range:', error);
        throw error;
    }
};

/**
 * Check if a specific meal has been logged on a given date
 * @param userId User ID
 * @param mealId Meal ID
 * @param date Date to check (YYYY-MM-DD)
 */
export const checkIfMealLogged = async (
    userId: string,
    mealId: string,
    date: string
): Promise<boolean> => {
    try {
        const { count, error } = await supabase
            .from('meal_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('meal_id', mealId)
            .eq('date', date);
        
        if (error) throw error;
        return count !== null && count > 0;
    } catch (error) {
        console.error('Error checking if meal logged:', error);
        throw error;
    }
}; 