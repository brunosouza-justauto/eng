import { supabase } from './supabaseClient';
import {
    Meal,
    MealWithFoodItems,
    FoodItem,
    MealFoodItem,
    Recipe,
    RecipeIngredient,
    RecipeWithIngredients,
    NutritionPlanWithMeals,
    calculateNutrition
} from '../types/mealPlanning';

// Nutrition Plans
export const getNutritionPlanById = async (planId: string): Promise<NutritionPlanWithMeals | null> => {
    try {
        // First, get the nutrition plan
        const { data: planData, error: planError } = await supabase
            .from('nutrition_plans')
            .select('*')
            .eq('id', planId)
            .single();
        
        if (planError) throw planError;
        if (!planData) return null;
        
        // Next, get all meals for this plan
        const { data: mealsData, error: mealsError } = await supabase
            .from('meals')
            .select('*')
            .eq('nutrition_plan_id', planId)
            .order('order_in_plan', { ascending: true });
        
        if (mealsError) throw mealsError;
        
        // Get all meal_food_items for these meals
        const mealIds = mealsData?.map(meal => meal.id) || [];
        
        let mealsWithFoodItems: MealWithFoodItems[] = [];
        const uniqueDayTypes: string[] = [];
        
        if (mealIds.length > 0) {
            const { data: foodItemsData, error: foodItemsError } = await supabase
                .from('meal_food_items')
                .select(`
                    *,
                    food_item: food_items(*)
                `)
                .in('meal_id', mealIds);
            
            if (foodItemsError) throw foodItemsError;
            
            // Group food items by meal
            const foodItemsByMeal: Record<string, MealFoodItem[]> = {};
            
            foodItemsData?.forEach(item => {
                if (!foodItemsByMeal[item.meal_id]) {
                    foodItemsByMeal[item.meal_id] = [];
                }
                
                // Calculate nutrition based on quantity and unit
                if (item.food_item) {
                    const nutrition = calculateNutrition(
                        item.food_item,
                        item.quantity,
                        item.unit
                    );
                    
                    item.calculated_calories = nutrition.calories;
                    item.calculated_protein = nutrition.protein;
                    item.calculated_carbs = nutrition.carbs;
                    item.calculated_fat = nutrition.fat;
                }
                
                foodItemsByMeal[item.meal_id].push(item);
            });
            
            // Combine meals with their food items
            mealsWithFoodItems = mealsData.map(meal => {
                const foodItems = foodItemsByMeal[meal.id] || [];
                
                // Calculate totals
                const totals = foodItems.reduce(
                    (acc, item) => {
                        return {
                            calories: acc.calories + (item.calculated_calories || 0),
                            protein: acc.protein + (item.calculated_protein || 0),
                            carbs: acc.carbs + (item.calculated_carbs || 0),
                            fat: acc.fat + (item.calculated_fat || 0)
                        };
                    },
                    { calories: 0, protein: 0, carbs: 0, fat: 0 }
                );
                
                // Track unique day types
                if (meal.day_type && !uniqueDayTypes.includes(meal.day_type)) {
                    uniqueDayTypes.push(meal.day_type);
                }
                
                return {
                    ...meal,
                    food_items: foodItems,
                    total_calories: totals.calories,
                    total_protein: totals.protein,
                    total_carbs: totals.carbs,
                    total_fat: totals.fat
                };
            });
            
            // Sort day types
            uniqueDayTypes.sort();
        }
        
        return {
            ...planData,
            meals: mealsWithFoodItems,
            dayTypes: uniqueDayTypes
        };
    } catch (error) {
        console.error('Error fetching nutrition plan:', error);
        throw error;
    }
};

// Meals
export const createMeal = async (meal: Omit<Meal, 'id' | 'created_at' | 'updated_at'>): Promise<Meal> => {
    try {
        const { data, error } = await supabase
            .from('meals')
            .insert(meal)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating meal:', error);
        throw error;
    }
};

// New function to duplicate a meal with all its food items
export const duplicateMeal = async (mealId: string): Promise<Meal> => {
    try {
        // 1. Get the original meal with all its food items
        const { data: mealData, error: mealError } = await supabase
            .from('meals')
            .select('*')
            .eq('id', mealId)
            .single();
        
        if (mealError) throw mealError;
        
        // 2. Get all food items in the meal
        const { data: foodItemsData, error: foodItemsError } = await supabase
            .from('meal_food_items')
            .select('*')
            .eq('meal_id', mealId);
        
        if (foodItemsError) throw foodItemsError;
        
        // 3. Create a new meal with the same properties
        // Convert null values to undefined to match expected types
        const newMeal: Omit<Meal, 'id' | 'created_at' | 'updated_at'> = {
            nutrition_plan_id: mealData.nutrition_plan_id,
            name: `${mealData.name} (Copy)`,
            time_suggestion: mealData.time_suggestion || undefined,
            notes: mealData.notes || undefined,
            order_in_plan: mealData.order_in_plan + 1, // Place right after the original meal
            day_type: mealData.day_type || undefined
        };
        
        const { data: newMealData, error: newMealError } = await supabase
            .from('meals')
            .insert(newMeal)
            .select()
            .single();
        
        if (newMealError) throw newMealError;
        
        // 4. Clone all food items and associate them with the new meal
        if (foodItemsData && foodItemsData.length > 0) {
            const newFoodItems = foodItemsData.map(item => ({
                meal_id: newMealData.id,
                food_item_id: item.food_item_id,
                source_recipe_id: item.source_recipe_id || undefined,
                quantity: item.quantity,
                unit: item.unit,
                notes: item.notes || undefined
            }));
            
            const { error: insertError } = await supabase
                .from('meal_food_items')
                .insert(newFoodItems);
            
            if (insertError) throw insertError;
        }
        
        return newMealData;
    } catch (error) {
        console.error('Error duplicating meal:', error);
        throw error;
    }
};

export const updateMeal = async (id: string, meal: Partial<Meal>): Promise<Meal> => {
    try {
        const { data, error } = await supabase
            .from('meals')
            .update(meal)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating meal:', error);
        throw error;
    }
};

// New function to update the order of meals
export const updateMealsOrder = async (mealIds: string[]): Promise<void> => {
    try {
        // Instead of using upsert which requires all non-null fields,
        // we'll update each meal individually with the new order
        for (let i = 0; i < mealIds.length; i++) {
            const { error } = await supabase
                .from('meals')
                .update({ order_in_plan: i })
                .eq('id', mealIds[i]);
            
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error updating meals order:', error);
        throw error;
    }
};

export const deleteMeal = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting meal:', error);
        throw error;
    }
};

// Food Items
export const searchFoodItems = async (
    query: string,
    category?: string,
    limit: number = 20,
    offset: number = 0,
    includeExternalSources: boolean = true
): Promise<{ items: FoodItem[]; count: number }> => {
    try {
        // First search our database to get total count without pagination
        let countQuery = supabase
            .from('food_items')
            .select('id', { count: 'exact', head: true });
        
        if (query) {
            // Split the query into words and create a filter for each word
            const words = query.trim().split(/\s+/).filter(word => word.length > 0);
            
            if (words.length > 0) {
                // Use .and() logic to match items containing ALL search terms
                words.forEach(word => {
                    countQuery = countQuery.ilike('food_name', `%${word}%`);
                });
            }
        }
        
        if (category) {
            countQuery = countQuery.eq('food_group', category);
        }
        
        // Get total count
        const { count: dbTotalCount, error: countError } = await countQuery;
        
        if (countError) throw countError;
        
        // Create search query for data
        let dbResults: FoodItem[] = [];
        
        // Only query database if offset is within range
        if (offset < (dbTotalCount || 0)) {
            let searchQuery = supabase
                .from('food_items')
                .select('*');
            
            if (query) {
                const words = query.trim().split(/\s+/).filter(word => word.length > 0);
                
                if (words.length > 0) {
                    words.forEach(word => {
                        searchQuery = searchQuery.ilike('food_name', `%${word}%`);
                    });
                }
            }
            
            if (category) {
                searchQuery = searchQuery.eq('food_group', category);
            }
            
            // Calculate safe range to avoid out of bounds
            const endOffset = Math.min(offset + limit - 1, (dbTotalCount || 0) - 1);
            
            // Only execute query if we have a valid range
            if (endOffset >= offset) {
                const { data, error } = await searchQuery
                    .order('food_name')
                    .range(offset, endOffset);
                
                if (error) throw error;
                dbResults = data || [];
            }
        }
        
        // If we want to include USDA results
        if (includeExternalSources && query) {
            try {
                // Fetch USDA results
                const externalResults = await searchUsdaFoodItems(query, limit * 2);
                
                // Calculate total combined count
                const totalCount = (dbTotalCount || 0) + externalResults.length;
                
                // If we have no database results for this page, use only USDA results
                if (dbResults.length === 0) {
                    // Calculate how many USDA results to skip
                    const usdaOffset = Math.max(0, offset - (dbTotalCount || 0));
                    
                    // Get slice of USDA results for this page
                    const usdaItems = externalResults
                        .slice(usdaOffset, usdaOffset + limit)
                        .map(item => ({
                            ...item,
                            id: `usda-${item.id}` // Prefix ID to avoid collisions
                        }));
                    
                    return {
                        items: usdaItems,
                        count: totalCount
                    };
                }
                
                // Normal case - we have some database results
                // Add USDA results, ensuring we don't exceed the limit
                const remainingSpace = limit - dbResults.length;
                
                if (remainingSpace > 0 && externalResults.length > 0) {
                    // Take only what we need to fill the page
                    const usdaResultsToAdd = externalResults
                        .slice(0, remainingSpace)
                        .map(item => ({
                            ...item,
                            id: `usda-${item.id}` // Prefix ID to avoid collisions
                        }));
                    
                    // Add USDA results to fill the page
                    const mergedResults = [...dbResults, ...usdaResultsToAdd];
                    
                    // Sort combined results
                    mergedResults.sort((a, b) => a.food_name.localeCompare(b.food_name));
                    
                    return {
                        items: mergedResults,
                        count: totalCount
                    };
                }
                
                // We have enough database results to fill the page
                return {
                    items: dbResults,
                    count: totalCount
                };
            } catch (err) {
                console.error('Error fetching USDA data:', err);
                // If USDA search fails, return just our database results
                return {
                    items: dbResults,
                    count: dbTotalCount || 0
                };
            }
        }
        
        // Return just the database results
        return {
            items: dbResults,
            count: dbTotalCount || 0
        };
    } catch (error) {
        console.error('Error searching food items:', error);
        throw error;
    }
};

// Helper function to search USDA database
const searchUsdaFoodItems = async (query: string, limit: number = 10): Promise<FoodItem[]> => {
    try {
        // Get API key from environment variables
        const apiKey = import.meta.env.VITE_USDA_API_KEY;
        
        if (!apiKey) {
            console.error('USDA API key not found in environment variables');
            return [];
        }
        
        // Make a request to the USDA API
        const response = await fetch(
            `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=${limit}`,
            { method: 'GET' }
        );
        
        if (!response.ok) {
            throw new Error(`USDA API error: ${response.statusText}`);
        }
        
        interface UsdaFood {
            fdcId: number;
            description: string;
            brandName?: string;
            gtinUpc?: string;
            foodNutrients: UsdaNutrient[];
        }
        
        interface UsdaNutrient {
            nutrientId: number;
            nutrientName: string;
            value: number;
        }
        
        interface UsdaResponse {
            foods: UsdaFood[];
            totalHits: number;
        }
        
        const data = await response.json() as UsdaResponse;
        
        // Get current timestamp for created_at and updated_at fields
        const timestamp = new Date().toISOString();
        
        // Transform USDA response to our FoodItem format
        const foodItems: FoodItem[] = data.foods.map((food: UsdaFood) => {
            // Extract nutrients
            const nutrients = food.foodNutrients || [];
            
            // Find nutrient values
            const calories = nutrients.find((n: UsdaNutrient) => n.nutrientId === 1008)?.value || 0;
            const protein = nutrients.find((n: UsdaNutrient) => n.nutrientId === 1003)?.value || 0;
            const carbs = nutrients.find((n: UsdaNutrient) => n.nutrientId === 1005)?.value || 0;
            const fat = nutrients.find((n: UsdaNutrient) => n.nutrientId === 1004)?.value || 0;
            
            return {
                id: food.fdcId.toString(),
                food_name: food.description,
                brand: food.brandName,
                calories_per_100g: calories,
                protein_per_100g: protein,
                carbs_per_100g: carbs,
                fat_per_100g: fat,
                source: 'usda',
                barcode: food.gtinUpc,
                source_id: food.fdcId.toString(),
                created_at: timestamp,
                updated_at: timestamp,
                nutrient_basis: 'per_100g',
                is_verified: true
            };
        });
        
        return foodItems;
    } catch (error) {
        console.error('Error searching USDA database:', error);
        return []; // Return empty array in case of error
    }
};

export const getFoodItemById = async (id: string): Promise<FoodItem | null> => {
    try {
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching food item:', error);
        throw error;
    }
};

// Meal Food Items
export const addFoodItemToMeal = async (
    mealId: string,
    foodItemId: string,
    quantity: number,
    unit: string,
    sourceRecipeId?: string,
    notes?: string
): Promise<MealFoodItem> => {
    try {
        const mealFoodItem = {
            meal_id: mealId,
            food_item_id: foodItemId,
            quantity,
            unit,
            source_recipe_id: sourceRecipeId,
            notes
        };
        
        const { data, error } = await supabase
            .from('meal_food_items')
            .insert(mealFoodItem)
            .select(`
                *,
                food_item: food_items(*)
            `)
            .single();
        
        if (error) throw error;
        
        // Calculate nutrition
        if (data.food_item) {
            const nutrition = calculateNutrition(
                data.food_item,
                data.quantity,
                data.unit
            );
            
            data.calculated_calories = nutrition.calories;
            data.calculated_protein = nutrition.protein;
            data.calculated_carbs = nutrition.carbs;
            data.calculated_fat = nutrition.fat;
        }
        
        return data;
    } catch (error) {
        console.error('Error adding food item to meal:', error);
        throw error;
    }
};

export const updateMealFoodItem = async (
    id: string,
    updates: Partial<MealFoodItem>
): Promise<MealFoodItem> => {
    try {
        const { data, error } = await supabase
            .from('meal_food_items')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                food_item: food_items(*)
            `)
            .single();
        
        if (error) throw error;
        
        // Calculate nutrition
        if (data.food_item) {
            const nutrition = calculateNutrition(
                data.food_item,
                data.quantity,
                data.unit
            );
            
            data.calculated_calories = nutrition.calories;
            data.calculated_protein = nutrition.protein;
            data.calculated_carbs = nutrition.carbs;
            data.calculated_fat = nutrition.fat;
        }
        
        return data;
    } catch (error) {
        console.error('Error updating meal food item:', error);
        throw error;
    }
};

export const removeFoodItemFromMeal = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('meal_food_items')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error removing food item from meal:', error);
        throw error;
    }
};

// Recipes
export const getRecipesByCoach = async (
    coachId: string,
    query?: string,
    limit: number = 20,
    offset: number = 0
): Promise<{ recipes: Recipe[]; count: number }> => {
    try {
        let supabaseQuery = supabase
            .from('recipes')
            .select('*', { count: 'exact' })
            .eq('coach_id', coachId);
        
        if (query) {
            supabaseQuery = supabaseQuery.ilike('name', `%${query}%`);
        }
        
        const { data, error, count } = await supabaseQuery
            .order('name')
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        
        return {
            recipes: data || [],
            count: count || 0
        };
    } catch (error) {
        console.error('Error fetching recipes:', error);
        throw error;
    }
};

export const getRecipeById = async (id: string): Promise<RecipeWithIngredients | null> => {
    try {
        // Get recipe
        const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();
        
        if (recipeError) throw recipeError;
        if (!recipeData) return null;
        
        // Get ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .select(`
                *,
                food_item: food_items(*)
            `)
            .eq('recipe_id', id)
            .order('id');
        
        if (ingredientsError) throw ingredientsError;
        
        return {
            ...recipeData,
            ingredients: ingredientsData || []
        };
    } catch (error) {
        console.error('Error fetching recipe:', error);
        throw error;
    }
};

export const createRecipe = async (
    recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>,
    ingredients: Array<Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at'>>
): Promise<RecipeWithIngredients> => {
    try {
        // Start a transaction
        const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .insert(recipe)
            .select()
            .single();
        
        if (recipeError) throw recipeError;
        
        // Add the recipe_id to each ingredient
        const ingredientsWithRecipeId = ingredients.map(ingredient => ({
            ...ingredient,
            recipe_id: recipeData.id
        }));
        
        // Insert ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientsWithRecipeId)
            .select(`
                *,
                food_item: food_items(*)
            `);
        
        if (ingredientsError) throw ingredientsError;
        
        return {
            ...recipeData,
            ingredients: ingredientsData || []
        };
    } catch (error) {
        console.error('Error creating recipe:', error);
        throw error;
    }
};

export const updateRecipe = async (
    id: string,
    recipe: Partial<Recipe>,
    ingredients?: Array<Omit<RecipeIngredient, 'recipe_id' | 'created_at'>>
): Promise<RecipeWithIngredients> => {
    try {
        // Update recipe
        const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .update(recipe)
            .eq('id', id)
            .select()
            .single();
        
        if (recipeError) throw recipeError;
        
        // If ingredients are provided, update them
        if (ingredients) {
            // Delete existing ingredients
            const { error: deleteError } = await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', id);
            
            if (deleteError) throw deleteError;
            
            // Insert new ingredients
            const ingredientsWithRecipeId = ingredients.map(ingredient => ({
                ...ingredient,
                recipe_id: id,
                // If ingredient has an id, keep it, otherwise it's a new ingredient
                id: 'id' in ingredient ? ingredient.id : undefined
            }));
            
            const { data: ingredientsData, error: ingredientsError } = await supabase
                .from('recipe_ingredients')
                .insert(ingredientsWithRecipeId)
                .select(`
                    *,
                    food_item: food_items(*)
                `);
            
            if (ingredientsError) throw ingredientsError;
            
            return {
                ...recipeData,
                ingredients: ingredientsData || []
            };
        } else {
            // Just fetch the current ingredients
            const { data: ingredientsData, error: ingredientsError } = await supabase
                .from('recipe_ingredients')
                .select(`
                    *,
                    food_item: food_items(*)
                `)
                .eq('recipe_id', id);
            
            if (ingredientsError) throw ingredientsError;
            
            return {
                ...recipeData,
                ingredients: ingredientsData || []
            };
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        throw error;
    }
};

export const deleteRecipe = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting recipe:', error);
        throw error;
    }
};

// Adding a recipe to a meal
export const addRecipeToMeal = async (
    mealId: string,
    recipeId: string,
    servingSize: number
): Promise<MealFoodItem[]> => {
    try {
        // Get the recipe with ingredients
        const recipe = await getRecipeById(recipeId);
        if (!recipe) throw new Error('Recipe not found');
        
        // For each ingredient, calculate the quantity based on serving size
        // and add it to the meal
        const mealFoodItemPromises = recipe.ingredients.map(ingredient => {
            if (!ingredient.food_item) {
                throw new Error(`Food item not found for ingredient ${ingredient.id}`);
            }
            
            // Calculate the adjusted quantity based on serving size
            const servingRatio = servingSize / recipe.serving_size;
            const adjustedQuantity = ingredient.quantity * servingRatio;
            
            return addFoodItemToMeal(
                mealId,
                ingredient.food_item_id,
                adjustedQuantity,
                ingredient.unit,
                recipeId, // Track which recipe this came from
                ingredient.notes
            );
        });
        
        const mealFoodItems = await Promise.all(mealFoodItemPromises);
        return mealFoodItems;
    } catch (error) {
        console.error('Error adding recipe to meal:', error);
        throw error;
    }
};

/**
 * Calculates the total nutritional values for a recipe based on its ingredients
 * @param recipe The recipe with ingredients to calculate nutrition for
 * @returns Object containing total calories, protein, carbs, and fat
 */
export const calculateRecipeNutrition = (recipe: RecipeWithIngredients): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
} => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
        return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    // Calculate nutrition for each ingredient and sum them
    return recipe.ingredients.reduce((totals, ingredient) => {
        if (!ingredient.food_item) return totals;
        
        const nutrition = calculateNutrition(
            ingredient.food_item,
            ingredient.quantity,
            ingredient.unit
        );
        
        return {
            calories: totals.calories + nutrition.calories,
            protein: totals.protein + nutrition.protein,
            carbs: totals.carbs + nutrition.carbs,
            fat: totals.fat + nutrition.fat
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
};

/**
 * Gets a recipe by ID with ingredients and pre-calculated nutrition information
 * @param id Recipe ID
 * @returns Recipe with ingredients and nutrition totals
 */
export const getRecipeWithNutrition = async (id: string): Promise<RecipeWithIngredients & {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
} | null> => {
    try {
        const recipe = await getRecipeById(id);
        if (!recipe) return null;
        
        const nutrition = calculateRecipeNutrition(recipe);
        
        return {
            ...recipe,
            total_calories: nutrition.calories,
            total_protein: nutrition.protein,
            total_carbs: nutrition.carbs,
            total_fat: nutrition.fat
        };
    } catch (error) {
        console.error('Error getting recipe with nutrition:', error);
        throw new Error(`Failed to get recipe with nutrition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Gets all recipes by coach ID with pre-calculated nutrition information
 */
export const getRecipesWithNutritionByCoach = async (
    coachId: string,
    query?: string,
    limit: number = 20,
    offset: number = 0
): Promise<{
    recipes: Array<Recipe & {
        total_calories: number;
        total_protein: number;
        total_carbs: number;
        total_fat: number;
    }>;
    count: number;
}> => {
    try {
        const { recipes, count } = await getRecipesByCoach(coachId, query, limit, offset);
        
        // For each recipe, get full details with ingredients and calculate nutrition
        const recipesWithNutrition = await Promise.all(
            recipes.map(async (recipe) => {
                try {
                    const recipeWithIngredients = await getRecipeById(recipe.id);
                    if (!recipeWithIngredients) {
                        return {
                            ...recipe,
                            total_calories: 0,
                            total_protein: 0,
                            total_carbs: 0,
                            total_fat: 0
                        };
                    }
                    
                    const nutrition = calculateRecipeNutrition(recipeWithIngredients);
                    
                    return {
                        ...recipe,
                        total_calories: nutrition.calories,
                        total_protein: nutrition.protein,
                        total_carbs: nutrition.carbs,
                        total_fat: nutrition.fat
                    };
                } catch (err) {
                    console.error(`Error processing recipe ${recipe.id}:`, err);
                    // Return the recipe with zero nutrition rather than failing the whole request
                    return {
                        ...recipe,
                        total_calories: 0,
                        total_protein: 0,
                        total_carbs: 0,
                        total_fat: 0
                    };
                }
            })
        );
        
        return {
            recipes: recipesWithNutrition,
            count
        };
    } catch (error) {
        console.error('Error getting recipes with nutrition:', error);
        throw new Error(`Failed to get recipes with nutrition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// New function to duplicate all meals with a specific day_type
export const duplicateDayType = async (
    nutritionPlanId: string,
    sourceDayType: string,
    newDayType: string
): Promise<void> => {
    try {
        // 1. Find all meals with the source day_type in this nutrition plan
        const { data: mealsData, error: mealsError } = await supabase
            .from('meals')
            .select('*')
            .eq('nutrition_plan_id', nutritionPlanId)
            .eq('day_type', sourceDayType);
        
        if (mealsError) throw mealsError;
        if (!mealsData || mealsData.length === 0) {
            throw new Error(`No meals found with day type "${sourceDayType}"`);
        }
        
        // 2. For each meal, create a duplicate with the new day_type
        const duplicatedMeals: Meal[] = [];
        
        for (const meal of mealsData) {
            // Get the meal's food items
            const { data: foodItemsData, error: foodItemsError } = await supabase
                .from('meal_food_items')
                .select('*')
                .eq('meal_id', meal.id);
            
            if (foodItemsError) throw foodItemsError;
            
            // Create a new meal with the same properties but different day_type
            const { data: newMealData, error: newMealError } = await supabase
                .from('meals')
                .insert({
                    nutrition_plan_id: meal.nutrition_plan_id,
                    name: meal.name,
                    time_suggestion: meal.time_suggestion || undefined,
                    notes: meal.notes || undefined,
                    order_in_plan: meal.order_in_plan,
                    day_type: newDayType
                })
                .select()
                .single();
            
            if (newMealError) throw newMealError;
            duplicatedMeals.push(newMealData);
            
            // Duplicate food items if they exist
            if (foodItemsData && foodItemsData.length > 0) {
                const newFoodItems = foodItemsData.map(item => ({
                    meal_id: newMealData.id,
                    food_item_id: item.food_item_id,
                    source_recipe_id: item.source_recipe_id || undefined,
                    quantity: item.quantity,
                    unit: item.unit,
                    notes: item.notes || undefined
                }));
                
                const { error: insertError } = await supabase
                    .from('meal_food_items')
                    .insert(newFoodItems);
                
                if (insertError) throw insertError;
            }
        }
    } catch (error) {
        console.error('Error duplicating day type:', error);
        throw error;
    }
}; 