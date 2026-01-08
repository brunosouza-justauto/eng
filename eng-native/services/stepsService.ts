import { supabase } from '../lib/supabase';
import { StepGoal, StepEntry, WeeklyStepStats, DayStepData } from '../types/steps';
import { getLocalDateString } from '../utils/date';

/**
 * Get active step goal for a user
 * @param profileId Profile ID (profiles.id)
 */
export const getActiveStepGoal = async (
  profileId: string
): Promise<{ goal: StepGoal | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('step_goals')
      .select('*')
      .eq('user_id', profileId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching step goal:', error);
      return { goal: null, error: error.message };
    }

    return { goal: data };
  } catch (err) {
    console.error('Error in getActiveStepGoal:', err);
    return { goal: null, error: 'Failed to fetch step goal' };
  }
};

/**
 * Get today's step entry for a user
 * @param userId User ID (auth.users.id)
 * @param date Date in YYYY-MM-DD format
 */
export const getStepEntryForDate = async (
  userId: string,
  date: string
): Promise<{ entry: StepEntry | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('step_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching step entry:', error);
      return { entry: null, error: error.message };
    }

    return { entry: data };
  } catch (err) {
    console.error('Error in getStepEntryForDate:', err);
    return { entry: null, error: 'Failed to fetch step entry' };
  }
};

/**
 * Get step entries for the past N days
 * @param userId User ID (auth.users.id)
 * @param days Number of days to fetch
 */
export const getStepHistory = async (
  userId: string,
  days: number = 7
): Promise<{ entries: StepEntry[]; error?: string }> => {
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const startDateStr = getLocalDateString(startDate);
    const todayStr = getLocalDateString(today);

    const { data, error } = await supabase
      .from('step_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', todayStr)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching step history:', error);
      return { entries: [], error: error.message };
    }

    return { entries: data || [] };
  } catch (err) {
    console.error('Error in getStepHistory:', err);
    return { entries: [], error: 'Failed to fetch step history' };
  }
};

/**
 * Calculate weekly stats from step entries
 */
export const calculateWeeklyStats = (
  entries: StepEntry[],
  dailyGoal: number
): WeeklyStepStats => {
  if (entries.length === 0) {
    return {
      averageSteps: 0,
      totalSteps: 0,
      goalsHit: 0,
      streak: 0,
      entries: [],
    };
  }

  const totalSteps = entries.reduce((sum, e) => sum + e.step_count, 0);
  const averageSteps = Math.round(totalSteps / entries.length);
  const goalsHit = entries.filter((e) => e.step_count >= dailyGoal).length;

  // Calculate streak (consecutive days meeting goal, starting from today)
  let streak = 0;
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const entry of sortedEntries) {
    if (entry.step_count >= dailyGoal) {
      streak++;
    } else {
      break;
    }
  }

  return {
    averageSteps,
    totalSteps,
    goalsHit,
    streak,
    entries,
  };
};

/**
 * Get weekly data formatted for chart display
 */
export const getWeeklyChartData = (
  entries: StepEntry[],
  dailyGoal: number
): DayStepData[] => {
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: DayStepData[] = [];

  // Create a map of date -> entry for quick lookup
  const entryMap = new Map<string, StepEntry>();
  entries.forEach((e) => entryMap.set(e.date, e));

  // Generate data for the past 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getLocalDateString(date);
    const entry = entryMap.get(dateStr);
    const steps = entry?.step_count || 0;

    result.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      steps,
      goalMet: steps >= dailyGoal,
      isToday: dateStr === todayStr,
    });
  }

  return result;
};

/**
 * Add steps manually for a date
 * @param userId User ID (auth.users.id)
 * @param date Date in YYYY-MM-DD format
 * @param steps Number of steps to add
 */
export const addStepsManually = async (
  userId: string,
  date: string,
  steps: number
): Promise<{ entry: StepEntry | null; error?: string }> => {
  try {
    // Check if entry exists for this date
    const { data: existingEntry, error: fetchError } = await supabase
      .from('step_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing entry:', fetchError);
      return { entry: null, error: fetchError.message };
    }

    if (existingEntry) {
      // Update existing entry
      const newTotal = existingEntry.step_count + steps;
      const { data, error } = await supabase
        .from('step_entries')
        .update({
          step_count: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEntry.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating step entry:', error);
        return { entry: null, error: error.message };
      }

      return { entry: data };
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('step_entries')
        .insert({
          user_id: userId,
          date,
          step_count: steps,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating step entry:', error);
        return { entry: null, error: error.message };
      }

      return { entry: data };
    }
  } catch (err) {
    console.error('Error in addStepsManually:', err);
    return { entry: null, error: 'Failed to add steps' };
  }
};

/**
 * Remove steps manually for a date
 * @param userId User ID (auth.users.id)
 * @param date Date in YYYY-MM-DD format
 * @param steps Number of steps to remove
 */
export const removeStepsManually = async (
  userId: string,
  date: string,
  steps: number
): Promise<{ entry: StepEntry | null; error?: string }> => {
  try {
    // Check if entry exists for this date
    const { data: existingEntry, error: fetchError } = await supabase
      .from('step_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing entry:', fetchError);
      return { entry: null, error: fetchError.message };
    }

    if (!existingEntry) {
      return { entry: null, error: 'No step entry found for this date' };
    }

    const newTotal = Math.max(0, existingEntry.step_count - steps);
    const { data, error } = await supabase
      .from('step_entries')
      .update({
        step_count: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingEntry.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating step entry:', error);
      return { entry: null, error: error.message };
    }

    return { entry: data };
  } catch (err) {
    console.error('Error in removeStepsManually:', err);
    return { entry: null, error: 'Failed to remove steps' };
  }
};

/**
 * Set a personal step goal
 * @param profileId Profile ID (profiles.id)
 * @param dailySteps Daily step goal
 */
export const setPersonalStepGoal = async (
  profileId: string,
  dailySteps: number
): Promise<{ goal: StepGoal | null; error?: string }> => {
  try {
    // Deactivate any existing goals
    const { error: deactivateError } = await supabase
      .from('step_goals')
      .update({ is_active: false })
      .eq('user_id', profileId)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating existing goals:', deactivateError);
      return { goal: null, error: deactivateError.message };
    }

    // Create new goal
    const { data, error } = await supabase
      .from('step_goals')
      .insert({
        user_id: profileId,
        daily_steps: dailySteps,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating step goal:', error);
      return { goal: null, error: error.message };
    }

    return { goal: data };
  } catch (err) {
    console.error('Error in setPersonalStepGoal:', err);
    return { goal: null, error: 'Failed to set step goal' };
  }
};

/**
 * Get progress percentage
 */
export const getProgressPercentage = (current: number, goal: number): number => {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
};

/**
 * Get motivational message based on progress
 */
export const getMotivationalMessage = (progressPercentage: number): string => {
  if (progressPercentage === 0) return "Let's get those steps in today!";
  if (progressPercentage < 25) return 'Great start! Keep moving!';
  if (progressPercentage < 50) return "You're making good progress!";
  if (progressPercentage < 75) return 'More than halfway there!';
  if (progressPercentage < 100) return 'Almost there! Finish strong!';
  return 'Goal achieved! Great job!';
};
