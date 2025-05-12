import { supabase } from './supabaseClient';
import { 
    LoggedMealWithNutrition, 
    DailyNutritionLog,
    ExtraMealFormData
} from '../types/mealPlanning';
import { getNutritionPlanById } from './mealPlanningService';
import { calculateNutrition } from '../types/mealPlanning';

// Define the interfaces that were previously imported from '../types/mealLogging'
interface LoggedMeal {
    id: string;
    user_id: string;
    meal_id?: string;
    nutrition_plan_id: string;
    name: string;
    date: string;
    time: string;
    day_type?: string;
    notes?: string;
    is_extra_meal: boolean;
    total_calories?: number;
    total_protein?: number;
    total_carbs?: number;
    total_fat?: number;
    food_items?: LoggedFoodItem[];
    meal?: MealData;
}

interface LoggedFoodItem {
    id: string;
    meal_log_id: string;
    food_item_id: string;
    quantity: number;
    unit: string;
    food_item?: FoodItemData;
    calories?: number;
    protein_grams?: number;
    carbs_grams?: number;
    fat_grams?: number;
}

interface MealLogDay {
    log_date: string;
    day_type: string | null;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    meals: LoggedMeal[];
}

// Define types for the meal data and food item data
interface MealData {
    id: string;
    name: string;
    time_suggestion?: string;
    food_items?: LoggedFoodItem[];
    [key: string]: unknown;
}

interface FoodItemData {
    food_name?: string;
    [key: string]: unknown;
}

// Use the interface by changing the comment to indicate its usage
// Type for the raw meal log data from Supabase, used implicitly through Record<string, any> currently
interface MealLogRaw {
    id: string;
    log_date: string;
    day_type: string | null;
    meal: MealData;
}

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
                
                meal.food_items?.forEach((item: { food_item: FoodItemData; quantity: number; unit: string }) => {
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

// Function to get all logged meal days for user
export const getUserMealLogs = async (userId: string): Promise<MealLogDay[]> => {
    try {
        // Fetch user's meal logs
        const { data: mealLogData, error } = await supabase
            .from('meal_logs')
            .select(`
                id,
                date as log_date,
                day_type,
                meal:meals(
                    id,
                    name,
                    time_suggestion,
                    food_items:meal_food_items(
                        id,
                        quantity,
                        unit,
                        food_item:food_items(*)
                    )
                )
            `)
            .eq('user_id', userId)
            .order('date', { ascending: false });
            
        if (error) throw error;
        
        if (!mealLogData || mealLogData.length === 0) {
            return [];
        }
                
        // Process meals and food items 
        return processDaysWithMeals(mealLogData);
    } catch (error) {
        console.error("Error fetching user meal logs:", error);
        throw error;
    }
}

// Fix the processDaysWithMeals function with better typings for any
export function processDaysWithMeals(days: Record<string, unknown>[]): MealLogDay[] {
    if (!days || days.length === 0) return [];
    
    // Group by date
    const groupedByDate: Record<string, Record<string, unknown>[]> = {};
    
    days.forEach((day) => {
        const date = day.log_date;
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(day);
    });
    
    // Create a day object for each date
    return Object.entries(groupedByDate).map(([date, mealsForDay]) => {
        // Sort meals by their suggested time if available
        mealsForDay.sort((a, b) => {
            const timeA = a.meal?.time_suggestion || '';
            const timeB = b.meal?.time_suggestion || '';
            return timeA.localeCompare(timeB);
        });

        const meals: LoggedMeal[] = [];
        const dayType = mealsForDay[0]?.day_type || null;

        const dailyTotals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
        };

        // Process each meal for this date
        mealsForDay.forEach((mealData) => {
            if (!mealData.meal) return;

            const { id: mealLogId, meal } = mealData;
            
            const foodItems: LoggedFoodItem[] = [];
            const mealTotals = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
            };

            // Process food items in the meal
            if (meal.food_items && Array.isArray(meal.food_items)) {
                meal.food_items.forEach((item: Record<string, unknown>) => {
                    if (!item || !item.food_item) return;
                    
                    // Convert to FoodItem compatible structure for calculateNutrition
                    const foodItem = {
                        id: String(item.food_item.id || ''),
                        food_name: String(item.food_item.food_name || ''),
                        calories_per_100g: Number(item.food_item.calories_per_100g || 0),
                        protein_per_100g: Number(item.food_item.protein_per_100g || 0), 
                        carbs_per_100g: Number(item.food_item.carbs_per_100g || 0),
                        fat_per_100g: Number(item.food_item.fat_per_100g || 0),
                        nutrient_basis: String(item.food_item.nutrient_basis || 'per_100g'),
                        created_at: '', // Default empty string for required fields
                        updated_at: ''  // Default empty string for required fields
                    };
                    
                    // Calculate nutrition for this food item
                    const nutrition = calculateNutrition(foodItem, item.quantity, item.unit);
                    
                    // Add to food items for this meal
                    const loggedFoodItem: LoggedFoodItem = {
                        id: item.id,
                        food_item: item.food_item,
                        quantity: item.quantity,
                        unit: item.unit,
                        calories: nutrition.calories,
                        protein_grams: nutrition.protein,
                        carbs_grams: nutrition.carbs,
                        fat_grams: nutrition.fat
                    };
                    
                    foodItems.push(loggedFoodItem);
                    
                    // Update meal totals
                    mealTotals.calories += nutrition.calories;
                    mealTotals.protein += nutrition.protein;
                    mealTotals.carbs += nutrition.carbs;
                    mealTotals.fat += nutrition.fat;
                });
            }
            
            // Create the logged meal with nutrition totals
            const loggedMeal: LoggedMeal = {
                id: mealLogId,
                user_id: '',
                nutrition_plan_id: '',
                meal_id: meal.id,
                name: meal.name,
                date: date,
                time: meal.time_suggestion || '',
                day_type: dayType || undefined,
                is_extra_meal: false,
                food_items: foodItems,
                total_calories: mealTotals.calories,
                total_protein: mealTotals.protein,
                total_carbs: mealTotals.carbs,
                total_fat: mealTotals.fat
            };
            
            meals.push(loggedMeal);
            
            // Update daily totals
            dailyTotals.calories += mealTotals.calories;
            dailyTotals.protein += mealTotals.protein;
            dailyTotals.carbs += mealTotals.carbs;
            dailyTotals.fat += mealTotals.fat;
        });
        
        // Return the processed day
        return {
            log_date: date,
            day_type: dayType,
            total_calories: dailyTotals.calories,
            total_protein: dailyTotals.protein,
            total_carbs: dailyTotals.carbs,
            total_fat: dailyTotals.fat,
            meals: meals
        };
    });
}