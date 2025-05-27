import { supabase } from './supabaseClient';
import { 
  WaterTrackingEntry, 
  CreateWaterTrackingEntry, 
  UpdateWaterTrackingEntry
} from '../types/waterTracking';
import { format } from 'date-fns';

/**
 * Service for handling water tracking related operations
 */
export const waterTrackingService = {
  /**
   * Get water tracking entry for a specific user and date
   */
  async getWaterTrackingEntry(userId: string, date: Date): Promise<WaterTrackingEntry | null> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('water_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();
    
    if (error) {
      // If no entry found, return null instead of throwing an error
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  },

  /**
   * Get water tracking entries for a user within a date range
   */
  async getWaterTrackingHistory(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<WaterTrackingEntry[]> {
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('water_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: false });

    console.log('water tracking data', data)
    
    if (error) {
      throw error;
    }
    
    return data || [];
  },

  /**
   * Create or update water tracking entry for a specific user and date
   */
  async upsertWaterTrackingEntry(entry: CreateWaterTrackingEntry): Promise<WaterTrackingEntry> {
    const { data, error } = await supabase
      .from('water_tracking')
      .upsert([entry], {
        onConflict: 'user_id,date',
        defaultToNull: true
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  },

  /**
   * Update water tracking amount for a specific entry
   */
  async updateWaterAmount(id: string, update: UpdateWaterTrackingEntry): Promise<void> {
    const { error } = await supabase
      .from('water_tracking')
      .update(update)
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  },

  /**
   * Get water goal for a specific user
   */
  async getWaterGoal(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('water_goals')
      .select('water_goal_ml')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // If no goal found, return default value
      if (error.code === 'PGRST116') {
        return 2500; // Default to 2.5 liters
      }
      throw error;
    }
    
    return data.water_goal_ml || 2500;
  },

  /**
   * Update water goal for a specific user
   */
  async updateWaterGoal(userId: string, waterGoalMl: number): Promise<void> {
    // First check if the goal exists
    const { data, error: fetchError } = await supabase
      .from('water_goals')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }
    
    // If goal exists, update it. Otherwise, insert new record
    const { error } = data
      ? await supabase
          .from('water_goals')
          .update({ water_goal_ml: waterGoalMl, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
      : await supabase
          .from('water_goals')
          .insert({ user_id: userId, water_goal_ml: waterGoalMl });
    
    if (error) {
      throw error;
    }
  },

  /**
   * Increment water amount for today
   */
  async addWaterAmount(userId: string, amountMl: number): Promise<WaterTrackingEntry> {
    const today = new Date();
    const existingEntry = await this.getWaterTrackingEntry(userId, today);
    
    const newAmount = (existingEntry?.amount_ml || 0) + amountMl;
    
    const entry: CreateWaterTrackingEntry = {
      user_id: userId,
      date: format(today, 'yyyy-MM-dd'),
      amount_ml: newAmount
    };
    
    return this.upsertWaterTrackingEntry(entry);
  }
};
