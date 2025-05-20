import { z } from 'zod';

// Meal types
export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type MealType = typeof MEAL_TYPES[number];

// Day types for nutrition planning
export const DAY_TYPES = [
  'Training Day',
  'Rest Day', 
  'Low Carb Day',
  'High Carb Day',
  'Moderate Carb Day',
  'Refeed Day',
  'Deload Day',
  'Competition Day',
  'Travel Day',
  'Custom Day'
] as const;
export type DayType = typeof DAY_TYPES[number];

// Basic interfaces matching our database schema
export interface Meal {
    id: string;
    nutrition_plan_id: string;
    name: string;
    time_suggestion?: string;
    notes?: string;
    order_in_plan: number;
    day_type?: string;
    created_at: string;
    updated_at: string;
}

export interface FoodItem {
    id: string;
    afcd_id?: string;
    food_name: string;
    food_group?: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g?: number;
    serving_size_g?: number;
    serving_size_unit?: string;
    created_at: string;
    updated_at: string;
    nutrient_basis: string;
    barcode?: string;
    source?: 'ausnut' | 'usda' | 'open_food_facts' | 'custom';
    created_by?: string;
    is_verified?: boolean;
    brand?: string;
    source_id?: string;
}

export interface MealFoodItem {
    id: string;
    meal_id: string;
    food_item_id: string;
    source_recipe_id?: string;
    quantity: number;
    unit: string;
    notes?: string;
    created_at: string;
    // Joined data (not in database)
    food_item?: FoodItem;
    calculated_calories?: number;
    calculated_protein?: number;
    calculated_carbs?: number;
    calculated_fat?: number;
}

export interface Recipe {
    id: string;
    coach_id: string;
    name: string;
    description?: string;
    instructions?: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    serving_size: number;
    serving_unit: string;
    created_at: string;
    updated_at: string;
}

export interface RecipeIngredient {
    id: string;
    recipe_id: string;
    food_item_id: string;
    quantity: number;
    unit: string;
    notes?: string;
    created_at: string;
    // Joined data (not in database)
    food_item?: FoodItem;
}

export interface UnitConversion {
    id: string;
    from_unit: string;
    to_unit: string;
    food_category?: string;
    conversion_factor: number;
    created_at: string;
}

// Extended interfaces for UI components
export interface MealWithFoodItems extends Meal {
    food_items: MealFoodItem[];
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
}

export interface RecipeWithIngredients extends Recipe {
    ingredients: RecipeIngredient[];
}

export interface NutritionPlanWithMeals {
    id: string;
    name: string;
    total_calories?: number;
    protein_grams?: number;
    carbohydrate_grams?: number;
    fat_grams?: number;
    description?: string;
    meals: MealWithFoodItems[];
    // Track order groups in the plan by day_type instead of day numbers
    dayTypes?: string[];
}

// Form data interfaces for React Hook Form
export interface MealFormData {
    name: string;
    time_suggestion: string;
    notes: string;
    day_type: string;
}

export interface RecipeFormData {
    name: string;
    description: string;
    instructions: string;
    serving_size: string;
    serving_unit: string;
}

// Zod schemas for validation
export const mealSchema = z.object({
    name: z.string().min(1, 'Meal name is required'),
    time_suggestion: z.string().optional(),
    notes: z.string().optional(),
    day_type: z.string().min(1, 'Day type is required'),
});

export const recipeSchema = z.object({
    name: z.string().min(1, 'Recipe name is required'),
    description: z.string().optional(),
    instructions: z.string().optional(),
    serving_size: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().positive('Serving size must be positive').optional()
    ),
    serving_unit: z.string().min(1, 'Serving unit is required'),
});

// Common units for food
export const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const;
export const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz'] as const;
export const COUNT_UNITS = ['serving', 'piece', 'slice', 'scoop'] as const;

export type WeightUnit = typeof WEIGHT_UNITS[number];
export type VolumeUnit = typeof VOLUME_UNITS[number];
export type CountUnit = typeof COUNT_UNITS[number];
export type FoodUnit = WeightUnit | VolumeUnit | CountUnit | string;

// Utility functions for unit conversion and nutrition calculation
export const calculateNutrition = (
    foodItem: FoodItem,
    quantity: number,
    unit: string
): { calories: number; protein: number; carbs: number; fat: number } => {
    // Simple implementation - assumes everything is in grams for now
    // In a real implementation, we would use the unit conversion table
    let quantityInGrams = quantity;
    
    if (unit !== 'g') {
        // Very basic conversion - would be replaced with proper conversion logic
        if (unit === 'kg') quantityInGrams = quantity * 1000;
        else if (unit === 'oz') quantityInGrams = quantity * 28.35;
        else if (unit === 'lb') quantityInGrams = quantity * 453.59;
        // For other units, we'd need more sophisticated conversion based on food
    }
    
    const factor = quantityInGrams / 100; // Nutrients are per 100g
    
    return {
        calories: foodItem.calories_per_100g * factor,
        protein: foodItem.protein_per_100g * factor,
        carbs: foodItem.carbs_per_100g * factor,
        fat: foodItem.fat_per_100g * factor,
    };
};

// Interfaces for meal logging
export interface LoggedMeal {
    id: string;
    user_id: string;
    meal_id?: string; // Reference to the planned meal (null for extra meals)
    nutrition_plan_id: string;
    name: string;
    date: string; // ISO date string (YYYY-MM-DD)
    time: string; // Time when the meal was logged (HH:MM)
    day_type: string;
    notes?: string;
    is_extra_meal: boolean; // Whether this is an extra meal not in the plan
    created_at: string;
    updated_at: string;
}

export interface LoggedMealWithNutrition extends LoggedMeal {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    food_items?: MealFoodItem[]; // For extra meals
}

export interface DailyNutritionLog {
    date: string;
    day_type: string;
    logged_meals: LoggedMealWithNutrition[];
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fat?: number;
}

// Form data for logging an extra meal
export interface ExtraMealFormData {
    name: string;
    day_type: string;
    notes?: string;
    food_items: Array<{
        food_item_id: string;
        quantity: number;
        unit: string;
        custom_macros?: {
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
        };
    }>;
}

// Add a new interface for creating a custom food item
export interface CustomFoodItemFormData {
    food_name: string;
    food_group?: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g?: number;
    serving_size_g?: number;
    serving_size_unit?: string;
    barcode?: string;
    brand?: string;
    nutrient_basis: string;
}

// Add Zod schema for form validation
export const customFoodItemSchema = z.object({
    food_name: z.string().min(1, 'Food name is required'),
    food_group: z.string().optional(),
    calories_per_100g: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().min(0, 'Calories must be 0 or greater').optional()
    ),
    protein_per_100g: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().min(0, 'Protein must be 0 or greater').optional()
    ),
    carbs_per_100g: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().min(0, 'Carbs must be 0 or greater').optional()
    ),
    fat_per_100g: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().min(0, 'Fat must be 0 or greater').optional()
    ),
    fiber_per_100g: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().min(0, 'Fiber must be 0 or greater').optional()
    ),
    serving_size_g: z.preprocess(
        (val) => (val ? parseFloat(String(val)) : undefined),
        z.number().positive('Serving size must be positive').optional()
    ),
    serving_size_unit: z.string().optional(),
    barcode: z.string().optional(),
    brand: z.string().optional(),
    nutrient_basis: z.string().default('100g')
}); 