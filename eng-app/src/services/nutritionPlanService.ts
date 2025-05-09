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