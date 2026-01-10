import { supabase } from '../lib/supabase';
import {
  AthleteSupplementWithDetails,
  SupplementCategory,
  SupplementsBySchedule,
  SupplementSchedule,
  SCHEDULE_TIMING_ORDER,
  SupplementLog,
  TodaysSupplement,
  SupplementAdherence,
  DailySupplementSummary,
  SupplementGroupBySchedule,
} from '../types/supplements';
import { getLocalDateString } from '../utils/date';

/**
 * Gets all supplements assigned to an athlete
 * @param userId User ID (auth.users.id)
 * @returns Object with supplements array and optional error
 */
export const getAthleteSupplements = async (
  userId: string
): Promise<{ supplements: AthleteSupplementWithDetails[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('athlete_supplements')
      .select(`
        *,
        supplement:supplement_id (
          id,
          name,
          category,
          default_dosage,
          default_timing,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching athlete supplements:', error);
      return { supplements: [], error: error.message };
    }

    // Transform the data to match the expected interface
    const supplements: AthleteSupplementWithDetails[] = (data || []).map((item) => ({
      ...item,
      supplement_name: item.supplement?.name || 'Unknown Supplement',
      supplement_category: (item.supplement?.category as SupplementCategory) || 'Other',
    }));

    return { supplements };
  } catch (err) {
    console.error('Error in getAthleteSupplements:', err);
    return { supplements: [], error: 'Failed to fetch supplements' };
  }
};

/**
 * Gets athlete supplements grouped by schedule/timing
 * @param userId User ID (auth.users.id)
 * @returns Object with grouped supplements and optional error
 */
export const getAthleteSupplementsBySchedule = async (
  userId: string
): Promise<{ groups: SupplementsBySchedule[]; error?: string }> => {
  const { supplements, error } = await getAthleteSupplements(userId);

  if (error) {
    return { groups: [], error };
  }

  // Group supplements by schedule
  const groupedSupplements = supplements.reduce((acc, supplement) => {
    const schedule = supplement.schedule;

    if (!acc[schedule]) {
      acc[schedule] = [];
    }

    acc[schedule].push(supplement);
    return acc;
  }, {} as Record<string, AthleteSupplementWithDetails[]>);

  // Convert to array and sort by timing order
  const groups = Object.entries(groupedSupplements)
    .map(([schedule, supplements]) => ({
      schedule: schedule as SupplementSchedule,
      supplements,
    }))
    .sort((a, b) => {
      const aIndex = SCHEDULE_TIMING_ORDER.indexOf(a.schedule);
      const bIndex = SCHEDULE_TIMING_ORDER.indexOf(b.schedule);
      return aIndex - bIndex;
    });

  return { groups };
};

/**
 * Checks if a supplement is currently active (within start/end dates)
 * @param supplement The supplement to check
 * @returns boolean indicating if supplement is active
 */
export const isSupplementActive = (supplement: AthleteSupplementWithDetails): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(supplement.start_date);
  startDate.setHours(0, 0, 0, 0);

  if (startDate > today) {
    return false; // Not started yet
  }

  if (supplement.end_date) {
    const endDate = new Date(supplement.end_date);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today) {
      return false; // Already ended
    }
  }

  return true;
};

/**
 * Filters supplements to only active ones
 * @param supplements Array of supplements
 * @returns Array of active supplements
 */
export const filterActiveSupplements = (
  supplements: AthleteSupplementWithDetails[]
): AthleteSupplementWithDetails[] => {
  return supplements.filter(isSupplementActive);
};

/**
 * Gets supplements that should be taken at a specific time/schedule
 * @param supplements Array of supplements
 * @param schedules Array of schedules to filter by
 * @returns Filtered supplements
 */
export const getSupplementsForTiming = (
  supplements: AthleteSupplementWithDetails[],
  schedules: SupplementSchedule[]
): AthleteSupplementWithDetails[] => {
  return supplements.filter((s) => schedules.includes(s.schedule));
};

/**
 * Gets supplements for current time of day
 * Based on current hour, returns supplements that should be taken now
 */
export const getSupplementsForCurrentTime = (
  supplements: AthleteSupplementWithDetails[]
): AthleteSupplementWithDetails[] => {
  const hour = new Date().getHours();
  const relevantSchedules: SupplementSchedule[] = ['Daily'];

  if (hour >= 5 && hour < 12) {
    // Morning (5am - 12pm)
    relevantSchedules.push('Morning', 'Empty Stomach', 'With Meal');
  } else if (hour >= 12 && hour < 17) {
    // Afternoon (12pm - 5pm)
    relevantSchedules.push('Afternoon', 'With Meal');
  } else if (hour >= 17 && hour < 21) {
    // Evening (5pm - 9pm)
    relevantSchedules.push('Evening', 'With Meal');
  } else {
    // Night (9pm - 5am)
    relevantSchedules.push('Before Bed');
  }

  return supplements.filter((s) => relevantSchedules.includes(s.schedule));
};

/**
 * Gets schedule display text
 * @param schedule The schedule type
 * @returns Human-readable schedule text
 */
export const getScheduleDisplayText = (schedule: SupplementSchedule): string => {
  const displayMap: Record<SupplementSchedule, string> = {
    Daily: 'Every day',
    'Every Other Day': 'Every other day',
    Weekly: 'Once a week',
    Monthly: 'Once a month',
    Quarterly: 'Every 3 months',
    Yearly: 'Once a year',
    Morning: 'In the morning',
    Afternoon: 'In the afternoon',
    Evening: 'In the evening',
    'Before Workout': 'Before training',
    'During Workout': 'During training',
    'After Workout': 'After training',
    'With Meal': 'With a meal',
    'Empty Stomach': 'On empty stomach',
    'Before Bed': 'Before bed',
    Custom: 'Custom schedule',
  };

  return displayMap[schedule] || schedule;
};

// ============================================
// SUPPLEMENT LOGGING FUNCTIONS
// ============================================

/**
 * Log a supplement as taken for today
 * @param userId User ID
 * @param athleteSupplementId The athlete_supplement record ID
 * @param date Optional date (defaults to today)
 * @param notes Optional notes
 */
export const logSupplementTaken = async (
  userId: string,
  athleteSupplementId: string,
  date?: string,
  notes?: string
): Promise<{ log: SupplementLog | null; error?: string }> => {
  try {
    const logDate = date || getLocalDateString();

    const { data, error } = await supabase
      .from('supplement_logs')
      .upsert(
        {
          user_id: userId,
          athlete_supplement_id: athleteSupplementId,
          date: logDate,
          taken_at: new Date().toISOString(),
          notes: notes || null,
        },
        { onConflict: 'athlete_supplement_id,date' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('Error logging supplement:', error);
      return { log: null, error: error.message };
    }

    return { log: data };
  } catch (err) {
    console.error('Error in logSupplementTaken:', err);
    return { log: null, error: 'Failed to log supplement' };
  }
};

/**
 * Remove a supplement log (uncheck)
 * @param logId The supplement log ID to remove
 */
export const unlogSupplement = async (
  logId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('supplement_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      console.error('Error removing supplement log:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in unlogSupplement:', err);
    return { success: false, error: 'Failed to remove supplement log' };
  }
};

/**
 * Get today's supplements with their log status
 * @param userId User ID
 */
export const getTodaysSupplements = async (
  userId: string
): Promise<{ supplements: TodaysSupplement[]; error?: string }> => {
  try {
    const today = getLocalDateString();

    // Get all active supplements
    const { supplements, error: supplementsError } = await getAthleteSupplements(userId);
    if (supplementsError) {
      return { supplements: [], error: supplementsError };
    }

    const activeSupplements = filterActiveSupplements(supplements);

    // Get today's logs
    const { data: logs, error: logsError } = await supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);

    if (logsError) {
      console.error('Error fetching supplement logs:', logsError);
      return { supplements: [], error: logsError.message };
    }

    // Map logs to supplement IDs for quick lookup
    const logsBySupplementId = new Map<string, SupplementLog>();
    (logs || []).forEach((log) => {
      logsBySupplementId.set(log.athlete_supplement_id, log);
    });

    // Combine supplements with log status
    const todaysSupplements: TodaysSupplement[] = activeSupplements.map((supplement) => {
      const log = logsBySupplementId.get(supplement.id);
      return {
        ...supplement,
        isLogged: !!log,
        logId: log?.id,
        loggedAt: log?.taken_at,
      };
    });

    return { supplements: todaysSupplements };
  } catch (err) {
    console.error('Error in getTodaysSupplements:', err);
    return { supplements: [], error: 'Failed to fetch today\'s supplements' };
  }
};

/**
 * Get supplement logs for a date range
 * @param userId User ID
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 */
export const getSupplementLogs = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ logs: SupplementLog[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching supplement logs:', error);
      return { logs: [], error: error.message };
    }

    return { logs: data || [] };
  } catch (err) {
    console.error('Error in getSupplementLogs:', err);
    return { logs: [], error: 'Failed to fetch supplement logs' };
  }
};

/**
 * Get supplement history with daily summaries
 * @param userId User ID
 * @param days Number of days to look back
 */
export const getSupplementHistory = async (
  userId: string,
  days: number = 7
): Promise<{ history: DailySupplementSummary[]; error?: string }> => {
  try {
    // Get active supplements
    const { supplements, error: supplementsError } = await getAthleteSupplements(userId);
    if (supplementsError) {
      return { history: [], error: supplementsError };
    }

    const activeSupplements = filterActiveSupplements(supplements);
    const total = activeSupplements.length;

    // Calculate date range
    const endDate = getLocalDateString();
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - (days - 1));
    const startDate = startDateObj.toISOString().split('T')[0];

    // Get logs for the date range
    const { logs, error: logsError } = await getSupplementLogs(userId, startDate, endDate);
    if (logsError) {
      return { history: [], error: logsError };
    }

    // Group logs by date
    const logsByDate = new Map<string, SupplementLog[]>();
    logs.forEach((log) => {
      const existing = logsByDate.get(log.date) || [];
      existing.push(log);
      logsByDate.set(log.date, existing);
    });

    // Build daily summaries
    const history: DailySupplementSummary[] = [];
    for (let i = 0; i < days; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - i);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayLogs = logsByDate.get(dateStr) || [];

      // Map logs to supplement IDs
      const loggedIds = new Set(dayLogs.map((l) => l.athlete_supplement_id));

      const dailySupplements: TodaysSupplement[] = activeSupplements.map((supplement) => {
        const log = dayLogs.find((l) => l.athlete_supplement_id === supplement.id);
        return {
          ...supplement,
          isLogged: loggedIds.has(supplement.id),
          logId: log?.id,
          loggedAt: log?.taken_at,
        };
      });

      const taken = dayLogs.length;
      history.push({
        date: dateStr,
        supplements: dailySupplements,
        taken,
        total,
        percentage: total > 0 ? Math.round((taken / total) * 100) : 0,
      });
    }

    return { history };
  } catch (err) {
    console.error('Error in getSupplementHistory:', err);
    return { history: [], error: 'Failed to fetch supplement history' };
  }
};

/**
 * Calculate supplement adherence stats
 * @param userId User ID
 * @param days Number of days to calculate adherence for
 */
export const calculateSupplementAdherence = async (
  userId: string,
  days: number = 7
): Promise<{ adherence: SupplementAdherence | null; error?: string }> => {
  try {
    const { history, error } = await getSupplementHistory(userId, days);
    if (error) {
      return { adherence: null, error };
    }

    if (history.length === 0 || history[0].total === 0) {
      return {
        adherence: {
          totalAssigned: 0,
          totalTaken: 0,
          percentage: 0,
          streak: 0,
        },
      };
    }

    const totalAssigned = history.reduce((sum, day) => sum + day.total, 0);
    const totalTaken = history.reduce((sum, day) => sum + day.taken, 0);
    const percentage = totalAssigned > 0 ? Math.round((totalTaken / totalAssigned) * 100) : 0;

    // Calculate streak (consecutive days with 100% completion)
    let streak = 0;
    for (const day of history) {
      if (day.percentage === 100) {
        streak++;
      } else {
        break;
      }
    }

    return {
      adherence: {
        totalAssigned,
        totalTaken,
        percentage,
        streak,
      },
    };
  } catch (err) {
    console.error('Error in calculateSupplementAdherence:', err);
    return { adherence: null, error: 'Failed to calculate adherence' };
  }
};

/**
 * Group today's supplements by schedule
 * @param supplements Array of today's supplements
 */
export const groupSupplementsBySchedule = (
  supplements: TodaysSupplement[]
): SupplementGroupBySchedule[] => {
  // Group supplements by schedule
  const grouped = supplements.reduce((acc, supplement) => {
    const schedule = supplement.schedule;
    if (!acc[schedule]) {
      acc[schedule] = [];
    }
    acc[schedule].push(supplement);
    return acc;
  }, {} as Record<string, TodaysSupplement[]>);

  // Convert to array and sort by timing order
  return Object.entries(grouped)
    .map(([schedule, supps]) => ({
      schedule: schedule as SupplementSchedule,
      supplements: supps,
      taken: supps.filter((s) => s.isLogged).length,
      total: supps.length,
    }))
    .sort((a, b) => {
      const aIndex = SCHEDULE_TIMING_ORDER.indexOf(a.schedule);
      const bIndex = SCHEDULE_TIMING_ORDER.indexOf(b.schedule);
      return aIndex - bIndex;
    });
};

/**
 * Log multiple supplements as taken at once
 * @param userId User ID
 * @param athleteSupplementIds Array of athlete_supplement IDs
 * @param date Optional date (defaults to today)
 */
export const logMultipleSupplements = async (
  userId: string,
  athleteSupplementIds: string[],
  date?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const logDate = date || getLocalDateString();

    const logsToInsert = athleteSupplementIds.map((id) => ({
      user_id: userId,
      athlete_supplement_id: id,
      date: logDate,
      taken_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('supplement_logs')
      .upsert(logsToInsert, { onConflict: 'athlete_supplement_id,date' });

    if (error) {
      console.error('Error logging multiple supplements:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in logMultipleSupplements:', err);
    return { success: false, error: 'Failed to log supplements' };
  }
};

/**
 * Get count of unlogged supplements for current time period
 * Used for reminder banners
 * @param userId User ID
 */
export const getUnloggedSupplementsCount = async (
  userId: string
): Promise<{ count: number; supplements: TodaysSupplement[]; error?: string }> => {
  try {
    const { supplements, error } = await getTodaysSupplements(userId);
    if (error) {
      return { count: 0, supplements: [], error };
    }

    // Filter for current time period (cast to TodaysSupplement since we're filtering TodaysSupplement[])
    const currentTimeSupplements = getSupplementsForCurrentTime(supplements) as TodaysSupplement[];
    const unlogged = currentTimeSupplements.filter((s) => !s.isLogged);

    return { count: unlogged.length, supplements: unlogged };
  } catch (err) {
    console.error('Error in getUnloggedSupplementsCount:', err);
    return { count: 0, supplements: [], error: 'Failed to check unlogged supplements' };
  }
};

// ============================================
// PERSONAL SUPPLEMENT MANAGEMENT
// ============================================

/**
 * Add a personal supplement (self-assigned by user)
 * @param userId User ID (auth.users.id)
 * @param supplementName Name of the supplement
 * @param category Category of the supplement
 * @param dosage Dosage string (e.g., "5g", "1 capsule")
 * @param schedule When to take the supplement
 * @param notes Optional notes
 */
export const addPersonalSupplement = async (
  userId: string,
  supplementName: string,
  category: SupplementCategory,
  dosage: string,
  schedule: SupplementSchedule,
  notes?: string
): Promise<{ supplement: AthleteSupplementWithDetails | null; error?: string }> => {
  try {
    // First, check if the supplement exists in the master supplements table
    let supplementId: string;

    const { data: existingSupplement, error: searchError } = await supabase
      .from('supplements')
      .select('id')
      .ilike('name', supplementName)
      .maybeSingle();

    if (searchError) {
      console.error('Error searching for supplement:', searchError);
      return { supplement: null, error: searchError.message };
    }

    if (existingSupplement) {
      supplementId = existingSupplement.id;
    } else {
      // Create a new supplement in the master table
      const { data: newSupplement, error: createError } = await supabase
        .from('supplements')
        .insert({
          name: supplementName,
          category: category,
          default_dosage: dosage,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating supplement:', createError);
        return { supplement: null, error: createError.message };
      }

      supplementId = newSupplement.id;
    }

    // Now create the athlete_supplements record
    // For personal supplements, prescribed_by is the user's own ID (self-assigned)
    const today = getLocalDateString();

    const { data: athleteSupplement, error: assignError } = await supabase
      .from('athlete_supplements')
      .insert({
        user_id: userId,
        supplement_id: supplementId,
        prescribed_by: userId, // Same as user_id indicates self-assigned
        dosage: dosage,
        schedule: schedule,
        notes: notes || null,
        start_date: today,
      })
      .select(`
        *,
        supplement:supplement_id (
          id,
          name,
          category,
          default_dosage,
          default_timing,
          notes,
          created_at,
          updated_at
        )
      `)
      .single();

    if (assignError) {
      console.error('Error assigning supplement:', assignError);
      return { supplement: null, error: assignError.message };
    }

    const result: AthleteSupplementWithDetails = {
      ...athleteSupplement,
      supplement_name: athleteSupplement.supplement?.name || supplementName,
      supplement_category: (athleteSupplement.supplement?.category as SupplementCategory) || category,
    };

    return { supplement: result };
  } catch (err) {
    console.error('Error in addPersonalSupplement:', err);
    return { supplement: null, error: 'Failed to add supplement' };
  }
};

/**
 * Remove a personal supplement (only works for self-assigned supplements)
 * @param userId User ID
 * @param athleteSupplementId The athlete_supplement record ID
 */
export const removePersonalSupplement = async (
  userId: string,
  athleteSupplementId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First verify this is a personal supplement (prescribed_by is null) and belongs to the user
    const { data: supplement, error: fetchError } = await supabase
      .from('athlete_supplements')
      .select('id, user_id, prescribed_by')
      .eq('id', athleteSupplementId)
      .single();

    if (fetchError) {
      console.error('Error fetching supplement:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (supplement.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (supplement.prescribed_by !== userId) {
      return { success: false, error: 'Cannot remove coach-assigned supplements' };
    }

    // Delete any associated logs first
    await supabase
      .from('supplement_logs')
      .delete()
      .eq('athlete_supplement_id', athleteSupplementId);

    // Delete the athlete_supplement record
    const { error: deleteError } = await supabase
      .from('athlete_supplements')
      .delete()
      .eq('id', athleteSupplementId);

    if (deleteError) {
      console.error('Error deleting supplement:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in removePersonalSupplement:', err);
    return { success: false, error: 'Failed to remove supplement' };
  }
};

/**
 * Check if a supplement is self-assigned (personal)
 * @param supplement The supplement to check
 */
export const isPersonalSupplement = (supplement: AthleteSupplementWithDetails): boolean => {
  return supplement.prescribed_by === supplement.user_id;
};

/**
 * Search supplements from the master list for autocomplete
 * @param query Search query
 * @param limit Max results to return
 */
export const searchSupplements = async (
  query: string,
  limit: number = 10
): Promise<{ supplements: { id: string; name: string; category: SupplementCategory }[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('supplements')
      .select('id, name, category')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching supplements:', error);
      return { supplements: [], error: error.message };
    }

    return { supplements: data || [] };
  } catch (err) {
    console.error('Error in searchSupplements:', err);
    return { supplements: [], error: 'Failed to search supplements' };
  }
};
