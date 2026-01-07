import { supabase } from '../lib/supabase';
import {
  AthleteSupplementWithDetails,
  SupplementCategory,
  SupplementsBySchedule,
  SupplementSchedule,
  SCHEDULE_TIMING_ORDER,
} from '../types/supplements';

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
