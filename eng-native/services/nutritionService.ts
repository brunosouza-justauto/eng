import { supabase } from '../lib/supabase';
import {
  NutritionPlan,
  NutritionPlanWithMeals,
  Meal,
  MealWithFoodItems,
  MealFoodItem,
  FoodItem,
  LoggedMeal,
  LoggedMealWithNutrition,
  DailyNutritionLog,
  ExtraMealFormData,
  NutritionValues,
  MissedMeal,
} from '../types/nutrition';

/**
 * Calculate nutrition values for a food item based on quantity
 */
export const calculateNutrition = (
  foodItem: FoodItem,
  quantity: number,
  unit: string
): NutritionValues => {
  // Convert quantity to grams for calculation
  let quantityInGrams = quantity;

  // Handle different units
  switch (unit.toLowerCase()) {
    case 'kg':
      quantityInGrams = quantity * 1000;
      break;
    case 'oz':
      quantityInGrams = quantity * 28.35;
      break;
    case 'lb':
      quantityInGrams = quantity * 453.59;
      break;
    case 'ml':
    case 'l':
      // Assume 1ml = 1g for liquids
      quantityInGrams = unit === 'l' ? quantity * 1000 : quantity;
      break;
    case 'serving':
      quantityInGrams = (foodItem.serving_size_g || 100) * quantity;
      break;
    case 'cup':
      quantityInGrams = quantity * 240; // Approximate
      break;
    case 'tbsp':
      quantityInGrams = quantity * 15;
      break;
    case 'tsp':
      quantityInGrams = quantity * 5;
      break;
    default:
      // Assume grams
      break;
  }

  const multiplier = quantityInGrams / 100;

  return {
    calories: Math.round(foodItem.calories_per_100g * multiplier),
    protein: Math.round(foodItem.protein_per_100g * multiplier * 10) / 10,
    carbs: Math.round(foodItem.carbs_per_100g * multiplier * 10) / 10,
    fat: Math.round(foodItem.fat_per_100g * multiplier * 10) / 10,
  };
};

/**
 * Get user's assigned nutrition plan
 */
export const getUserNutritionPlan = async (
  profileId: string
): Promise<{ nutritionPlan: NutritionPlanWithMeals | null; error?: string }> => {
  try {
    // Get the most recent nutrition plan assignment
    // Nutrition-only assignments have program_template_id = null
    const { data: assignment, error: assignmentError } = await supabase
      .from('assigned_plans')
      .select('nutrition_plan_id')
      .eq('athlete_id', profileId)
      .is('program_template_id', null)
      .not('nutrition_plan_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (assignmentError && assignmentError.code !== 'PGRST116') {
      console.error('Error fetching nutrition assignment:', assignmentError);
      return { nutritionPlan: null, error: assignmentError.message };
    }

    if (!assignment?.nutrition_plan_id) {
      return { nutritionPlan: null };
    }

    // Get the nutrition plan with meals
    return getNutritionPlanById(assignment.nutrition_plan_id);
  } catch (err: any) {
    console.error('Error in getUserNutritionPlan:', err);
    return { nutritionPlan: null, error: err.message };
  }
};

/**
 * Get nutrition plan by ID with all meals and food items
 */
export const getNutritionPlanById = async (
  planId: string
): Promise<{ nutritionPlan: NutritionPlanWithMeals | null; error?: string }> => {
  try {
    // Get the nutrition plan
    const { data: plan, error: planError } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) {
      console.error('Error fetching nutrition plan:', planError);
      return { nutritionPlan: null, error: planError.message };
    }

    // Get all meals for the plan
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('nutrition_plan_id', planId)
      .order('order_in_plan', { ascending: true });

    if (mealsError) {
      console.error('Error fetching meals:', mealsError);
      return { nutritionPlan: null, error: mealsError.message };
    }

    // Get all food items for these meals
    const mealIds = meals?.map((m) => m.id) || [];
    let mealFoodItems: MealFoodItem[] = [];

    if (mealIds.length > 0) {
      const { data: foodItems, error: foodError } = await supabase
        .from('meal_food_items')
        .select(`
          *,
          food_item:food_items (*)
        `)
        .in('meal_id', mealIds);

      if (foodError) {
        console.error('Error fetching food items:', foodError);
      } else {
        mealFoodItems = (foodItems || []).map((item: any) => ({
          ...item,
          food_item: item.food_item,
        }));
      }
    }

    // Build meals with food items and calculate totals
    const mealsWithFoodItems: MealWithFoodItems[] = (meals || []).map((meal) => {
      const foodItems = mealFoodItems.filter((fi) => fi.meal_id === meal.id);

      // Calculate nutrition for each food item
      const processedFoodItems = foodItems.map((fi) => {
        if (fi.food_item) {
          const nutrition = calculateNutrition(fi.food_item, fi.quantity, fi.unit);
          return {
            ...fi,
            calculated_calories: nutrition.calories,
            calculated_protein: nutrition.protein,
            calculated_carbs: nutrition.carbs,
            calculated_fat: nutrition.fat,
          };
        }
        return fi;
      });

      // Calculate meal totals
      const totalCalories = processedFoodItems.reduce(
        (sum, fi) => sum + (fi.calculated_calories || 0),
        0
      );
      const totalProtein = processedFoodItems.reduce(
        (sum, fi) => sum + (fi.calculated_protein || 0),
        0
      );
      const totalCarbs = processedFoodItems.reduce(
        (sum, fi) => sum + (fi.calculated_carbs || 0),
        0
      );
      const totalFat = processedFoodItems.reduce(
        (sum, fi) => sum + (fi.calculated_fat || 0),
        0
      );

      return {
        ...meal,
        food_items: processedFoodItems,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
      };
    });

    // Collect unique day types
    const dayTypes = [...new Set(mealsWithFoodItems.map((m) => m.day_type).filter(Boolean))];

    return {
      nutritionPlan: {
        ...plan,
        meals: mealsWithFoodItems,
        dayTypes: dayTypes as string[],
      },
    };
  } catch (err: any) {
    console.error('Error in getNutritionPlanById:', err);
    return { nutritionPlan: null, error: err.message };
  }
};

/**
 * Log a planned meal as eaten
 */
export const logPlannedMeal = async (
  userId: string,
  mealId: string,
  date: string,
  notes?: string
): Promise<{ loggedMeal: LoggedMeal | null; error?: string }> => {
  try {
    // Get meal details
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .single();

    if (mealError || !meal) {
      return { loggedMeal: null, error: mealError?.message || 'Meal not found' };
    }

    // Check if already logged
    const { data: existing } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('meal_id', mealId)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      return { loggedMeal: null, error: 'Meal already logged for this date' };
    }

    // Create the log entry
    const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

    const { data: loggedMeal, error: logError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: userId,
        meal_id: mealId,
        nutrition_plan_id: meal.nutrition_plan_id,
        name: meal.name,
        date: date,
        time: currentTime,
        day_type: meal.day_type || 'Training Day',
        notes: notes || null,
        is_extra_meal: false,
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging meal:', logError);
      return { loggedMeal: null, error: logError.message };
    }

    return { loggedMeal };
  } catch (err: any) {
    console.error('Error in logPlannedMeal:', err);
    return { loggedMeal: null, error: err.message };
  }
};

/**
 * Create a custom food item in the database
 * @param foodItem - The food item data
 * @param profileId - The profile.id (NOT auth.users.id) since food_items.created_by references profiles
 */
export const createCustomFoodItem = async (
  foodItem: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>,
  profileId: string
): Promise<{ foodItem: FoodItem | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .insert({
        food_name: foodItem.food_name,
        calories_per_100g: foodItem.calories_per_100g,
        protein_per_100g: foodItem.protein_per_100g,
        carbs_per_100g: foodItem.carbs_per_100g,
        fat_per_100g: foodItem.fat_per_100g,
        fiber_per_100g: foodItem.fiber_per_100g || 0,
        serving_size_g: foodItem.serving_size_g || 100,
        nutrient_basis: foodItem.nutrient_basis || 'per 100g',
        source: 'custom',
        created_by: profileId,
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom food item:', error);
      return { foodItem: null, error: error.message };
    }

    return { foodItem: data };
  } catch (err: any) {
    console.error('Error in createCustomFoodItem:', err);
    return { foodItem: null, error: err.message };
  }
};

/**
 * Log an extra meal (not in plan)
 * @param userId - auth.users.id for meal_logs
 * @param profileId - profiles.id for custom food items
 * @param nutritionPlanId - nutrition plan id
 * @param extraMeal - extra meal data
 * @param date - date string YYYY-MM-DD
 */
export const logExtraMeal = async (
  userId: string,
  profileId: string,
  nutritionPlanId: string,
  extraMeal: ExtraMealFormData,
  date: string
): Promise<{ loggedMeal: LoggedMealWithNutrition | null; error?: string }> => {
  try {
    const currentTime = new Date().toTimeString().split(' ')[0];

    // First, create any custom food items in the database
    const processedFoodItems: Array<{
      food_item_id: string;
      food_item?: FoodItem;
      quantity: number;
      unit: string;
    }> = [];

    for (const fi of extraMeal.food_items) {
      if (fi.food_item_id.startsWith('custom-') && fi.food_item) {
        // Create custom food item in database (using profileId, not userId)
        const { foodItem: createdItem, error: createError } = await createCustomFoodItem(
          fi.food_item,
          profileId
        );

        if (createError || !createdItem) {
          console.error('Error creating custom food item:', createError);
          // Still add to processed items for macro calculation, but won't be linked
          processedFoodItems.push({
            food_item_id: fi.food_item_id,
            food_item: fi.food_item,
            quantity: fi.quantity,
            unit: fi.unit,
          });
        } else {
          // Use the real database ID
          processedFoodItems.push({
            food_item_id: createdItem.id,
            food_item: createdItem,
            quantity: fi.quantity,
            unit: fi.unit,
          });
        }
      } else {
        processedFoodItems.push({
          food_item_id: fi.food_item_id,
          food_item: fi.food_item,
          quantity: fi.quantity,
          unit: fi.unit,
        });
      }
    }

    // Create the meal log
    const { data: loggedMeal, error: logError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: userId,
        nutrition_plan_id: nutritionPlanId,
        name: extraMeal.name,
        date: date,
        time: currentTime,
        day_type: extraMeal.day_type,
        notes: extraMeal.notes || null,
        is_extra_meal: true,
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating extra meal log:', logError);
      return { loggedMeal: null, error: logError.message };
    }

    // Insert food items for the extra meal (all items now have valid DB IDs)
    const validFoodItems = processedFoodItems.filter(
      (fi) => !fi.food_item_id.startsWith('custom-')
    );

    if (validFoodItems.length > 0) {
      const foodItemsToInsert = validFoodItems.map((fi) => ({
        meal_log_id: loggedMeal.id,
        food_item_id: fi.food_item_id,
        quantity: fi.quantity,
        unit: fi.unit,
      }));

      const { error: foodError } = await supabase
        .from('extra_meal_food_items')
        .insert(foodItemsToInsert);

      if (foodError) {
        console.error('Error inserting extra meal food items:', foodError);
      }
    }

    // Calculate totals from processed food items
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const fi of processedFoodItems) {
      if (fi.food_item) {
        const nutrition = calculateNutrition(fi.food_item, fi.quantity, fi.unit);
        totalCalories += nutrition.calories;
        totalProtein += nutrition.protein;
        totalCarbs += nutrition.carbs;
        totalFat += nutrition.fat;
      }
    }

    return {
      loggedMeal: {
        ...loggedMeal,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
      },
    };
  } catch (err: any) {
    console.error('Error in logExtraMeal:', err);
    return { loggedMeal: null, error: err.message };
  }
};

/**
 * Delete a logged meal
 */
export const deleteLoggedMeal = async (
  mealLogId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('meal_logs').delete().eq('id', mealLogId);

    if (error) {
      console.error('Error deleting meal log:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteLoggedMeal:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get logged meals for a specific date
 */
export const getLoggedMealsForDate = async (
  userId: string,
  date: string,
  nutritionPlan?: NutritionPlanWithMeals | null
): Promise<{ dailyLog: DailyNutritionLog | null; error?: string }> => {
  try {
    // Get all meal logs for the date
    const { data: mealLogs, error: logsError } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('time', { ascending: true });

    if (logsError) {
      console.error('Error fetching meal logs:', logsError);
      return { dailyLog: null, error: logsError.message };
    }

    // Process each logged meal
    const loggedMeals: LoggedMealWithNutrition[] = [];

    for (const log of mealLogs || []) {
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      if (log.is_extra_meal) {
        // Get food items from extra_meal_food_items
        const { data: extraFoodItems } = await supabase
          .from('extra_meal_food_items')
          .select(`
            *,
            food_item:food_items (*)
          `)
          .eq('meal_log_id', log.id);

        for (const item of extraFoodItems || []) {
          if (item.food_item) {
            const nutrition = calculateNutrition(item.food_item, item.quantity, item.unit);
            totalCalories += nutrition.calories;
            totalProtein += nutrition.protein;
            totalCarbs += nutrition.carbs;
            totalFat += nutrition.fat;
          }
        }
      } else if (log.meal_id && nutritionPlan) {
        // Find meal in nutrition plan
        const meal = nutritionPlan.meals.find((m) => m.id === log.meal_id);
        if (meal) {
          totalCalories = meal.total_calories;
          totalProtein = meal.total_protein;
          totalCarbs = meal.total_carbs;
          totalFat = meal.total_fat;
        }
      }

      loggedMeals.push({
        ...log,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
      });
    }

    // Calculate daily totals
    const dailyTotalCalories = loggedMeals.reduce((sum, m) => sum + m.total_calories, 0);
    const dailyTotalProtein = loggedMeals.reduce((sum, m) => sum + m.total_protein, 0);
    const dailyTotalCarbs = loggedMeals.reduce((sum, m) => sum + m.total_carbs, 0);
    const dailyTotalFat = loggedMeals.reduce((sum, m) => sum + m.total_fat, 0);

    // Determine day type from most common logged meal type
    const dayTypeCounts = loggedMeals.reduce(
      (acc, m) => {
        acc[m.day_type] = (acc[m.day_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const primaryDayType =
      Object.entries(dayTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Training Day';

    return {
      dailyLog: {
        date,
        day_type: primaryDayType,
        logged_meals: loggedMeals,
        total_calories: dailyTotalCalories,
        total_protein: dailyTotalProtein,
        total_carbs: dailyTotalCarbs,
        total_fat: dailyTotalFat,
        target_calories: nutritionPlan?.total_calories,
        target_protein: nutritionPlan?.protein_grams,
        target_carbs: nutritionPlan?.carbohydrate_grams,
        target_fat: nutritionPlan?.fat_grams,
      },
    };
  } catch (err: any) {
    console.error('Error in getLoggedMealsForDate:', err);
    return { dailyLog: null, error: err.message };
  }
};

/**
 * Check if a specific meal has been logged for a date
 */
export const isMealLoggedForDate = async (
  userId: string,
  mealId: string,
  date: string
): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('meal_id', mealId)
      .eq('date', date)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
};

/**
 * Get missed meals for the day (suggested time has passed)
 */
export const getMissedMeals = (
  meals: MealWithFoodItems[],
  loggedMealIds: string[],
  dayType: string
): MissedMeal[] => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const missedMeals: MissedMeal[] = [];

  for (const meal of meals) {
    // Filter by day type
    if (meal.day_type && !meal.day_type.toLowerCase().includes(dayType.toLowerCase())) {
      continue;
    }

    // Skip if already logged
    if (loggedMealIds.includes(meal.id)) {
      continue;
    }

    // Check if time has passed
    if (meal.time_suggestion && meal.time_suggestion < currentTime) {
      missedMeals.push({
        mealId: meal.id,
        name: meal.name,
        suggestedTime: meal.time_suggestion,
      });
    }
  }

  return missedMeals;
};

/**
 * Search food items
 */
export const searchFoodItems = async (
  query: string,
  limit: number = 20
): Promise<{ items: FoodItem[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .ilike('food_name', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching food items:', error);
      return { items: [], error: error.message };
    }

    return { items: data || [] };
  } catch (err: any) {
    console.error('Error in searchFoodItems:', err);
    return { items: [], error: err.message };
  }
};

/**
 * Open Food Facts API response types
 */
interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    proteins?: number;
    carbohydrates_100g?: number;
    carbohydrates?: number;
    fat_100g?: number;
    fat?: number;
    fiber_100g?: number;
    fiber?: number;
  };
  serving_size?: string;
  code?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

/**
 * Fetch product from Open Food Facts API
 */
const fetchFromOpenFoodFacts = async (
  barcode: string
): Promise<{ product: OpenFoodFactsProduct | null; error?: string }> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'ENG-Native-App/1.0 (https://github.com/anthropics)',
        },
      }
    );

    if (!response.ok) {
      return { product: null, error: 'Failed to fetch from Open Food Facts' };
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return { product: null }; // Product not found, but no error
    }

    return { product: data.product };
  } catch (err: any) {
    console.error('Error fetching from Open Food Facts:', err);
    return { product: null, error: err.message };
  }
};

/**
 * Convert Open Food Facts product to our FoodItem format
 */
const convertOffProductToFoodItem = (
  product: OpenFoodFactsProduct,
  barcode: string
): Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> => {
  const nutriments = product.nutriments || {};

  // Get calories (prefer per 100g, fallback to total)
  const calories = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0;
  const protein = nutriments.proteins_100g || nutriments.proteins || 0;
  const carbs = nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
  const fat = nutriments.fat_100g || nutriments.fat || 0;
  const fiber = nutriments.fiber_100g || nutriments.fiber || 0;

  // Parse serving size if available
  let servingSize = 100;
  if (product.serving_size) {
    const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (match) {
      servingSize = parseFloat(match[1]);
    }
  }

  // Build product name
  let foodName = product.product_name || 'Unknown Product';
  if (product.brands) {
    foodName = `${product.brands} - ${foodName}`;
  }

  return {
    food_name: foodName,
    calories_per_100g: Math.round(calories),
    protein_per_100g: Math.round(protein * 10) / 10,
    carbs_per_100g: Math.round(carbs * 10) / 10,
    fat_per_100g: Math.round(fat * 10) / 10,
    fiber_per_100g: Math.round(fiber * 10) / 10,
    serving_size_g: servingSize,
    nutrient_basis: 'per 100g',
    barcode: barcode,
    source: 'open_food_facts',
    is_verified: false,
    brand: product.brands,
  };
};

/**
 * Save a food item from Open Food Facts to local database
 */
const saveOffProductToDatabase = async (
  foodItemData: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>
): Promise<{ item: FoodItem | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .insert(foodItemData)
      .select()
      .single();

    if (error) {
      console.error('Error saving OFF product to database:', error);
      return { item: null, error: error.message };
    }

    return { item: data };
  } catch (err: any) {
    console.error('Error in saveOffProductToDatabase:', err);
    return { item: null, error: err.message };
  }
};

/**
 * Get food item by barcode
 * First checks local database, then falls back to Open Food Facts API
 */
export const getFoodItemByBarcode = async (
  barcode: string
): Promise<{ item: FoodItem | null; error?: string; source?: 'local' | 'open_food_facts' }> => {
  try {
    // First, check local database
    const { data: localItem, error: localError } = await supabase
      .from('food_items')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (localError) {
      console.error('Error fetching from local database:', localError);
    }

    if (localItem) {
      console.log('Found barcode in local database:', barcode);
      return { item: localItem, source: 'local' };
    }

    // Not found locally, try Open Food Facts
    console.log('Barcode not found locally, checking Open Food Facts:', barcode);
    const { product, error: offError } = await fetchFromOpenFoodFacts(barcode);

    if (offError) {
      return { item: null, error: offError };
    }

    if (!product) {
      console.log('Barcode not found in Open Food Facts:', barcode);
      return { item: null }; // Not found anywhere
    }

    // Convert OFF product to our format
    const foodItemData = convertOffProductToFoodItem(product, barcode);

    // Save to local database for future lookups
    console.log('Saving OFF product to local database:', foodItemData.food_name);
    const { item: savedItem, error: saveError } = await saveOffProductToDatabase(foodItemData);

    if (saveError || !savedItem) {
      // Even if save fails, return the item (just won't be cached)
      console.warn('Failed to save OFF product, returning unsaved item');
      return {
        item: {
          ...foodItemData,
          id: `off-${barcode}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as FoodItem,
        source: 'open_food_facts',
      };
    }

    return { item: savedItem, source: 'open_food_facts' };
  } catch (err: any) {
    console.error('Error in getFoodItemByBarcode:', err);
    return { item: null, error: err.message };
  }
};

/**
 * Get meals for a specific day type from nutrition plan
 */
export const getMealsForDayType = (
  nutritionPlan: NutritionPlanWithMeals,
  dayType: string
): MealWithFoodItems[] => {
  // Handle simplified day types (Training/Rest)
  const normalizedDayType = dayType.toLowerCase();

  return nutritionPlan.meals.filter((meal) => {
    if (!meal.day_type) return true; // Include meals without day type

    const mealDayType = meal.day_type.toLowerCase();

    if (normalizedDayType === 'training') {
      return mealDayType.includes('training') || mealDayType.includes('heavy');
    } else if (normalizedDayType === 'rest') {
      return mealDayType.includes('rest') || mealDayType.includes('light');
    }

    return mealDayType.includes(normalizedDayType);
  });
};

/**
 * Calculate daily target nutrition for a day type
 */
export const getDayTypeTargets = (
  nutritionPlan: NutritionPlanWithMeals,
  dayType: string
): NutritionValues => {
  const meals = getMealsForDayType(nutritionPlan, dayType);

  return {
    calories: meals.reduce((sum, m) => sum + m.total_calories, 0),
    protein: meals.reduce((sum, m) => sum + m.total_protein, 0),
    carbs: meals.reduce((sum, m) => sum + m.total_carbs, 0),
    fat: meals.reduce((sum, m) => sum + m.total_fat, 0),
  };
};

// =============================================================================
// PUBLIC NUTRITION PLAN BROWSING FUNCTIONS
// =============================================================================

export interface PublicNutritionPlan {
  id: string;
  name: string;
  description: string | null;
  total_calories: number | null;
  protein_grams: number | null;
  carbohydrate_grams: number | null;
  fat_grams: number | null;
  coach_name: string | null;
}

/**
 * Get all public nutrition plans for browsing
 * @returns Array of public plans with coach names
 */
export const getPublicNutritionPlans = async (): Promise<{
  plans: PublicNutritionPlan[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select(`
        id,
        name,
        description,
        total_calories,
        protein_grams,
        carbohydrate_grams,
        fat_grams,
        profiles:coach_id (
          first_name,
          last_name
        )
      `)
      .eq('is_public', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching public nutrition plans:', error);
      return { plans: [], error: error.message };
    }

    const plans: PublicNutritionPlan[] = (data || []).map((p: any) => {
      const profile = p.profiles;
      let coachName: string | null = null;
      if (profile?.first_name && profile?.last_name) {
        coachName = `${profile.first_name} ${profile.last_name}`;
      } else if (profile?.first_name) {
        coachName = profile.first_name;
      }
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        total_calories: p.total_calories,
        protein_grams: p.protein_grams,
        carbohydrate_grams: p.carbohydrate_grams,
        fat_grams: p.fat_grams,
        coach_name: coachName,
      };
    });

    return { plans };
  } catch (err: any) {
    console.error('Error in getPublicNutritionPlans:', err);
    return { plans: [], error: err.message };
  }
};

/**
 * Self-assign a nutrition plan to the current user
 * @param profileId The athlete's profile ID
 * @param planId The nutrition plan ID to assign
 * @returns Success status
 */
export const assignNutritionPlanToSelf = async (
  profileId: string,
  planId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('assigned_plans').insert({
      athlete_id: profileId,
      nutrition_plan_id: planId,
      assigned_by: profileId,
      assigned_at: new Date().toISOString(),
      start_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      console.error('Error assigning nutrition plan:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in assignNutritionPlanToSelf:', err);
    return { success: false, error: err.message };
  }
};
