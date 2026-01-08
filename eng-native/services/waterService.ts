import { supabase } from '../lib/supabase';
import {
  WaterTrackingEntry,
  WaterGoal,
  WaterProgress,
  DEFAULT_GLASS_SIZE,
  DEFAULT_WATER_GOAL,
} from '../types/water';
import { getLocalDateString } from '../utils/date';

/**
 * Get water tracking entry for a specific date
 * @param userId User ID (auth.users.id)
 * @param date Date in YYYY-MM-DD format
 */
export const getWaterEntryForDate = async (
  userId: string,
  date: string
): Promise<{ entry: WaterTrackingEntry | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('water_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching water entry:', error);
      return { entry: null, error: error.message };
    }

    return { entry: data };
  } catch (err) {
    console.error('Error in getWaterEntryForDate:', err);
    return { entry: null, error: 'Failed to fetch water entry' };
  }
};

/**
 * Get water goal for a user
 * @param userId User ID (auth.users.id)
 * @param profileId Optional Profile ID (profiles.id) as fallback
 * @returns goal in ml or null if no goal is set
 */
export const getWaterGoal = async (
  userId: string,
  profileId?: string
): Promise<{ goal: number | null; error?: string }> => {
  try {
    // First try with user.id
    const { data, error } = await supabase
      .from('water_goals')
      .select('water_goal_ml')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data?.water_goal_ml) {
      return { goal: data.water_goal_ml };
    }

    // Fallback to profile.id if provided
    if (profileId) {
      const { data: profileData } = await supabase
        .from('water_goals')
        .select('water_goal_ml')
        .eq('user_id', profileId)
        .maybeSingle();

      if (profileData?.water_goal_ml) {
        return { goal: profileData.water_goal_ml };
      }
    }

    return { goal: null };
  } catch (err) {
    console.error('Error in getWaterGoal:', err);
    return { goal: null };
  }
};

/**
 * Add water amount for a specific date
 * @param userId User ID (auth.users.id)
 * @param date Date in YYYY-MM-DD format
 * @param amountMl Amount in milliliters to add
 */
export const addWaterAmount = async (
  userId: string,
  date: string,
  amountMl: number
): Promise<{ entry: WaterTrackingEntry | null; error?: string }> => {
  try {
    // Get existing entry for today
    const { entry: existingEntry } = await getWaterEntryForDate(userId, date);

    const newAmount = (existingEntry?.amount_ml || 0) + amountMl;

    // Upsert the entry
    const { data, error } = await supabase
      .from('water_tracking')
      .upsert(
        {
          user_id: userId,
          date,
          amount_ml: newAmount,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error adding water:', error);
      return { entry: null, error: error.message };
    }

    return { entry: data };
  } catch (err) {
    console.error('Error in addWaterAmount:', err);
    return { entry: null, error: 'Failed to add water' };
  }
};

/**
 * Remove water amount for a specific date
 * @param userId User ID (auth.users.id)
 * @param date Date in YYYY-MM-DD format
 * @param amountMl Amount in milliliters to remove
 */
export const removeWaterAmount = async (
  userId: string,
  date: string,
  amountMl: number
): Promise<{ entry: WaterTrackingEntry | null; error?: string }> => {
  try {
    // Get existing entry for today
    const { entry: existingEntry } = await getWaterEntryForDate(userId, date);

    if (!existingEntry) {
      return { entry: null, error: 'No water entry found' };
    }

    const newAmount = Math.max(0, existingEntry.amount_ml - amountMl);

    // Update the entry
    const { data, error } = await supabase
      .from('water_tracking')
      .update({
        amount_ml: newAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingEntry.id)
      .select()
      .single();

    if (error) {
      console.error('Error removing water:', error);
      return { entry: null, error: error.message };
    }

    return { entry: data };
  } catch (err) {
    console.error('Error in removeWaterAmount:', err);
    return { entry: null, error: 'Failed to remove water' };
  }
};

/**
 * Set water goal for a user
 * @param userId User ID (auth.users.id)
 * @param goalMl Goal in milliliters
 */
export const setWaterGoal = async (
  userId: string,
  goalMl: number
): Promise<{ goal: WaterGoal | null; error?: string }> => {
  try {
    // Check if goal exists
    const { data: existingGoal } = await supabase
      .from('water_goals')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;

    if (existingGoal) {
      // Update existing goal
      const { data, error } = await supabase
        .from('water_goals')
        .update({
          water_goal_ml: goalMl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new goal
      const { data, error } = await supabase
        .from('water_goals')
        .insert({
          user_id: userId,
          water_goal_ml: goalMl,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return { goal: result };
  } catch (err) {
    console.error('Error in setWaterGoal:', err);
    return { goal: null, error: 'Failed to set water goal' };
  }
};

/**
 * Get water history for the past N days
 * @param userId User ID (auth.users.id)
 * @param days Number of days
 */
export const getWaterHistory = async (
  userId: string,
  days: number = 7
): Promise<{ entries: WaterTrackingEntry[]; error?: string }> => {
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const startDateStr = getLocalDateString(startDate);
    const todayStr = getLocalDateString(today);

    const { data, error } = await supabase
      .from('water_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', todayStr)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching water history:', error);
      return { entries: [], error: error.message };
    }

    return { entries: data || [] };
  } catch (err) {
    console.error('Error in getWaterHistory:', err);
    return { entries: [], error: 'Failed to fetch water history' };
  }
};

/**
 * Calculate water progress
 */
export const calculateWaterProgress = (
  amountMl: number,
  goalMl: number,
  glassSize: number = DEFAULT_GLASS_SIZE
): WaterProgress => {
  let percentage = goalMl > 0 ? Math.min(100, Math.round((amountMl / goalMl) * 100)) : 0;

  // If the displayed amounts would be equal (rounded to 1 decimal), show 100%
  const displayedCurrent = (amountMl / 1000).toFixed(1);
  const displayedGoal = (goalMl / 1000).toFixed(1);
  if (displayedCurrent === displayedGoal && amountMl > 0) {
    percentage = 100;
  }

  const glasses = Math.floor(amountMl / glassSize);
  const glassesGoal = Math.ceil(goalMl / glassSize);

  return {
    currentAmount: amountMl,
    goal: goalMl,
    percentage,
    glasses,
    glassesGoal,
  };
};

/**
 * Get motivational message based on progress
 */
export const getWaterMotivationalMessage = (percentage: number): string => {
  if (percentage === 0) return 'Start hydrating! Your body needs water.';
  if (percentage < 25) return 'Good start! Keep drinking.';
  if (percentage < 50) return "You're doing well! Stay hydrated.";
  if (percentage < 75) return 'More than halfway! Keep it up.';
  if (percentage < 100) return 'Almost there! Just a bit more.';
  return 'Goal achieved! Great hydration today!';
};

/**
 * Format amount for display
 */
export const formatWaterAmount = (amountMl: number): string => {
  if (amountMl >= 1000) {
    return `${(amountMl / 1000).toFixed(1)}L`;
  }
  return `${amountMl}ml`;
};
