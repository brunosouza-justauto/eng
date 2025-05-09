import { supabase } from './supabaseClient';
import { getNutritionPlanById } from './mealPlanningService';
import { NutritionPlanWithMeals } from '../types/mealPlanning';

/**
 * Get the nutrition plan assigned to a user
 * @param profileId The profile ID
 * @returns Object containing the nutrition plan
 */
export const getUserNutritionPlan = async (profileId: string): Promise<{
  nutritionPlan: NutritionPlanWithMeals | null;
  error?: string;
}> => {
  try {
    // Fetch most recent nutrition plan assignment
    const { data: nutritionData, error: nutritionError } = await supabase
      .from('assigned_plans')
      .select('nutrition_plan_id')
      .eq('athlete_id', profileId)
      .is('program_template_id', null) // Program template ID must be null
      .not('nutrition_plan_id', 'is', null) // Must have nutrition_plan_id
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (nutritionError) {
      console.error("Error fetching nutrition plan assignment:", nutritionError);
      return { nutritionPlan: null, error: "Failed to fetch nutrition plan assignment" };
    }
    
    if (!nutritionData || !nutritionData.nutrition_plan_id) {
      return { nutritionPlan: null, error: "No nutrition plan assigned" };
    }
    
    // Get the full nutrition plan details
    const nutritionPlan = await getNutritionPlanById(nutritionData.nutrition_plan_id);
    
    return {
      nutritionPlan,
      error: nutritionPlan ? undefined : "Failed to load nutrition plan details"
    };
  } catch (err) {
    console.error('Error in getUserNutritionPlan:', err);
    return { nutritionPlan: null, error: "An unexpected error occurred" };
  }
};

/**
 * Check if a user has an assigned nutrition plan
 * @param userId The user ID
 * @returns Boolean indicating if user has a nutrition plan
 */
export const hasNutritionPlan = async (profileId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('assigned_plans')
      .select('nutrition_plan_id', { count: 'exact', head: true })
      .eq('athlete_id', profileId)
      .is('program_template_id', null)
      .not('nutrition_plan_id', 'is', null);
    
    if (error) throw error;
    return !!count && count > 0;
  } catch (err) {
    console.error('Error checking if user has nutrition plan:', err);
    return false;
  }
};

/**
 * Get all available nutrition plans
 * @returns Array of nutrition plans that an athlete can select from
 */
export const getAvailableNutritionPlans = async (): Promise<{
  nutritionPlans: Array<{
    id: string;
    name: string;
    description?: string;
    total_calories?: number;
    protein_grams?: number;
    carbohydrate_grams?: number;
    fat_grams?: number;
    created_at: string;
    coach_id: string;
  }>;
  error?: string;
}> => {
  try {
    // Fetch nutrition plans that are available for athletes
    const { data: plansData, error: plansError } = await supabase
      .from('nutrition_plans')
      .select('id, name, description, total_calories, protein_grams, carbohydrate_grams, fat_grams, created_at, coach_id')
      .order('name', { ascending: true });
    
    if (plansError) {
      console.error("Error fetching available nutrition plans:", plansError);
      return { nutritionPlans: [], error: "Failed to fetch available nutrition plans" };
    }
    
    return {
      nutritionPlans: plansData || []
    };
  } catch (err) {
    console.error('Error in getAvailableNutritionPlans:', err);
    return { nutritionPlans: [], error: "An unexpected error occurred" };
  }
};

/**
 * Assign a nutrition plan to a user
 * @param athleteId The athlete's profile ID
 * @param nutritionPlanId The nutrition plan ID to assign
 * @returns Success status and any error message
 */
export const assignNutritionPlan = async (
  athleteId: string,
  nutritionPlanId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create a new assignment
    const { error: assignError } = await supabase
      .from('assigned_plans')
      .insert({
        athlete_id: athleteId,
        nutrition_plan_id: nutritionPlanId,
        assigned_by: athleteId, // Self-assigned
        assigned_at: new Date().toISOString(),
        start_date: new Date().toISOString().split('T')[0] // Today as the start date
      });

    if (assignError) throw assignError;
    
    return { success: true };
  } catch (err) {
    console.error('Error assigning nutrition plan:', err);
    return { 
      success: false, 
      error: "Failed to assign nutrition plan. Please try again." 
    };
  }
}; 