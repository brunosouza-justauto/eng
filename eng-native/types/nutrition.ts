// Day types for nutrition plans
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
  'Custom Day',
] as const;

export type DayType = (typeof DAY_TYPES)[number];

// Simplified day type for UI tabs
export type SimpleDayType = 'Training' | 'Rest';

// Meal types
export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

// Food item from database
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
  nutrient_basis: string;
  barcode?: string;
  source: 'ausnut' | 'usda' | 'open_food_facts' | 'custom' | 'coach' | 'system';
  created_by?: string;
  is_verified?: boolean;
  brand?: string;
  source_id?: string;
  created_at: string;
  updated_at: string;
}

// Food item within a meal
export interface MealFoodItem {
  id: string;
  meal_id: string;
  food_item_id: string;
  source_recipe_id?: string;
  quantity: number;
  unit: string;
  notes?: string;
  created_at: string;
  // Joined data
  food_item?: FoodItem;
  // Calculated fields
  calculated_calories?: number;
  calculated_protein?: number;
  calculated_carbs?: number;
  calculated_fat?: number;
}

// Meal in a nutrition plan
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

// Meal with food items and calculated totals
export interface MealWithFoodItems extends Meal {
  food_items: MealFoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

// Nutrition plan
export interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  total_calories?: number;
  protein_grams?: number;
  carbohydrate_grams?: number;
  fat_grams?: number;
  coach_id?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

// Full nutrition plan with meals
export interface NutritionPlanWithMeals extends NutritionPlan {
  meals: MealWithFoodItems[];
  dayTypes?: string[];
}

// Logged meal entry
export interface LoggedMeal {
  id: string;
  user_id: string;
  meal_id?: string;
  nutrition_plan_id: string;
  name: string;
  date: string;
  time: string;
  day_type: string;
  notes?: string;
  is_extra_meal: boolean;
  created_at: string;
  updated_at: string;
}

// Logged meal with nutrition data
export interface LoggedMealWithNutrition extends LoggedMeal {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  food_items?: MealFoodItem[];
}

// Daily nutrition summary
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

// Extra meal form data
export interface ExtraMealFormData {
  name: string;
  day_type: string;
  notes?: string;
  food_items: Array<{
    food_item_id: string;
    food_item?: FoodItem;
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

// Custom food item form
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

// Nutrition calculation result
export interface NutritionValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Missed meal info for alerts
export interface MissedMeal {
  mealId: string;
  name: string;
  suggestedTime: string;
}

// Unit constants
export const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const;
export const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz'] as const;
export const COUNT_UNITS = ['serving', 'piece', 'slice', 'scoop'] as const;
export const ALL_UNITS = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type CountUnit = (typeof COUNT_UNITS)[number];
export type FoodUnit = WeightUnit | VolumeUnit | CountUnit;
