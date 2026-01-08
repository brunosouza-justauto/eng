import { SupplementSchedule } from '../types/supplements';
import { ProfileData } from '../types/profile';

// ==================== TIME HELPERS ====================

/**
 * Parse a time string (HH:mm) to minutes since midnight
 */
const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Add minutes to a time string, handling day overflow
 */
const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  let totalMinutes = parseTimeToMinutes(time) + minutesToAdd;
  // Wrap around midnight
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Get the current time as HH:mm string
 */
export const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Calculate midpoint between two times
 */
const getMidpointTime = (time1: string, time2: string): string => {
  const mins1 = parseTimeToMinutes(time1);
  let mins2 = parseTimeToMinutes(time2);

  // Handle case where time2 is past midnight (e.g., wake 06:00, bed 22:00)
  if (mins2 < mins1) mins2 += 24 * 60;

  const midpoint = Math.floor((mins1 + mins2) / 2) % (24 * 60);
  const hours = Math.floor(midpoint / 60);
  const mins = midpoint % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Format time for display (e.g., "6:00 AM" or "18:00")
 */
export const formatTimeForDisplay = (time: string, use24Hour = true): string => {
  if (use24Hour) return time;

  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// ==================== WORKOUT REMINDERS ====================

export type WorkoutReminderStatus = 'not_scheduled' | 'upcoming' | 'due' | 'overdue' | 'completed';

/**
 * Get workout reminder status based on user's training time
 * @param hasWorkoutToday Whether a workout is scheduled for today
 * @param workoutCompleted Whether the workout has been completed
 * @param profile User profile with training_time_of_day
 * @param overdueThresholdMinutes Minutes after training time to consider overdue (default 120 = 2 hours)
 */
export const getWorkoutReminderStatus = (
  hasWorkoutToday: boolean,
  workoutCompleted: boolean,
  profile: ProfileData | null,
  overdueThresholdMinutes = 120
): WorkoutReminderStatus => {
  if (!hasWorkoutToday) return 'not_scheduled';
  if (workoutCompleted) return 'completed';

  const trainingTime = profile?.training_time_of_day || '17:00';
  const currentMinutes = parseTimeToMinutes(getCurrentTimeString());
  const trainingMinutes = parseTimeToMinutes(trainingTime);

  // Consider "due" from 30 min before training time
  const dueMinutes = trainingMinutes - 30;
  // Consider "overdue" after training time + threshold
  const overdueMinutes = trainingMinutes + overdueThresholdMinutes;

  if (currentMinutes >= overdueMinutes) return 'overdue';
  if (currentMinutes >= dueMinutes) return 'due';
  return 'upcoming';
};

/**
 * Get the user's scheduled training time
 */
export const getTrainingTime = (profile: ProfileData | null): string => {
  return profile?.training_time_of_day || '17:00';
};

// ==================== SUPPLEMENT REMINDERS ====================

interface ScheduleTimeConfig {
  /** Expected time to take the supplement (HH:mm format) */
  expectedTime: string;
  /** Time to start reminding (HH:mm format) */
  reminderTime: string;
  /** Grace period in minutes after expected time before marking as "missed" */
  gracePeriodMinutes: number;
}

/**
 * Get schedule time configuration based on user profile
 */
export const getScheduleTimeConfig = (
  schedule: SupplementSchedule,
  profile: ProfileData | null
): ScheduleTimeConfig => {
  const wakeTime = profile?.nutrition_wakeup_time_of_day || '06:00';
  const bedTime = profile?.nutrition_bed_time_of_day || '22:00';
  const trainingTime = profile?.training_time_of_day || '17:00';

  // Calculate intermediate times
  const afternoonTime = getMidpointTime(wakeTime, bedTime);
  const eveningTime = addMinutesToTime(bedTime, -120); // 2 hours before bed

  switch (schedule) {
    case 'Morning':
    case 'Empty Stomach':
      // Take right after waking up
      return {
        expectedTime: addMinutesToTime(wakeTime, 15), // 15 min after wake
        reminderTime: wakeTime,
        gracePeriodMinutes: 60,
      };

    case 'Before Workout':
      // Take 30-60 minutes before training
      return {
        expectedTime: addMinutesToTime(trainingTime, -45),
        reminderTime: addMinutesToTime(trainingTime, -60),
        gracePeriodMinutes: 30,
      };

    case 'During Workout':
      // Take during training
      return {
        expectedTime: trainingTime,
        reminderTime: addMinutesToTime(trainingTime, -15),
        gracePeriodMinutes: 60,
      };

    case 'After Workout':
      // Take within 30-60 min after training
      return {
        expectedTime: addMinutesToTime(trainingTime, 45),
        reminderTime: addMinutesToTime(trainingTime, 30),
        gracePeriodMinutes: 60,
      };

    case 'With Meal':
      // Assume lunch time (midpoint of day)
      return {
        expectedTime: afternoonTime,
        reminderTime: addMinutesToTime(afternoonTime, -15),
        gracePeriodMinutes: 120, // Flexible since can be any meal
      };

    case 'Afternoon':
      return {
        expectedTime: afternoonTime,
        reminderTime: addMinutesToTime(afternoonTime, -30),
        gracePeriodMinutes: 120,
      };

    case 'Evening':
      return {
        expectedTime: eveningTime,
        reminderTime: addMinutesToTime(eveningTime, -30),
        gracePeriodMinutes: 90,
      };

    case 'Before Bed':
      // Take 30 minutes before bed
      return {
        expectedTime: addMinutesToTime(bedTime, -30),
        reminderTime: addMinutesToTime(bedTime, -45),
        gracePeriodMinutes: 45,
      };

    // Frequency-based schedules (not time-specific)
    case 'Daily':
    case 'Every Other Day':
    case 'Weekly':
    case 'Monthly':
    case 'Quarterly':
    case 'Yearly':
    case 'Custom':
    default:
      // Default to morning for non-specific schedules
      return {
        expectedTime: addMinutesToTime(wakeTime, 30),
        reminderTime: wakeTime,
        gracePeriodMinutes: 240, // Very flexible
      };
  }
};

/**
 * Check if a supplement schedule is currently due (reminder time has passed)
 */
export const isScheduleDue = (
  schedule: SupplementSchedule,
  profile: ProfileData | null
): boolean => {
  const config = getScheduleTimeConfig(schedule, profile);
  const currentMinutes = parseTimeToMinutes(getCurrentTimeString());
  const reminderMinutes = parseTimeToMinutes(config.reminderTime);

  return currentMinutes >= reminderMinutes;
};

/**
 * Check if a supplement schedule is overdue (expected time + grace period has passed)
 */
export const isScheduleOverdue = (
  schedule: SupplementSchedule,
  profile: ProfileData | null
): boolean => {
  const config = getScheduleTimeConfig(schedule, profile);
  const currentMinutes = parseTimeToMinutes(getCurrentTimeString());
  const expectedMinutes = parseTimeToMinutes(config.expectedTime);
  const overdueMinutes = expectedMinutes + config.gracePeriodMinutes;

  return currentMinutes >= overdueMinutes;
};

/**
 * Get a human-readable label for when a supplement should be taken
 */
export const getScheduleTimeLabel = (
  schedule: SupplementSchedule,
  profile: ProfileData | null
): string => {
  const config = getScheduleTimeConfig(schedule, profile);
  return config.expectedTime;
};

/**
 * Get reminder status for a supplement
 */
export type ReminderStatus = 'upcoming' | 'due' | 'overdue' | 'taken';

export const getSupplementReminderStatus = (
  schedule: SupplementSchedule,
  isLogged: boolean,
  profile: ProfileData | null
): ReminderStatus => {
  if (isLogged) return 'taken';
  if (isScheduleOverdue(schedule, profile)) return 'overdue';
  if (isScheduleDue(schedule, profile)) return 'due';
  return 'upcoming';
};

/**
 * Get supplements that need attention (due but not taken)
 */
export interface SupplementReminder {
  schedule: SupplementSchedule;
  status: ReminderStatus;
  expectedTime: string;
  count: number;
}

/**
 * Group supplements by schedule and calculate reminder status
 */
export const getSupplementReminders = (
  supplements: Array<{ schedule: SupplementSchedule; isLogged: boolean }>,
  profile: ProfileData | null
): SupplementReminder[] => {
  const bySchedule = new Map<SupplementSchedule, { logged: number; total: number }>();

  supplements.forEach(({ schedule, isLogged }) => {
    const existing = bySchedule.get(schedule) || { logged: 0, total: 0 };
    existing.total++;
    if (isLogged) existing.logged++;
    bySchedule.set(schedule, existing);
  });

  const reminders: SupplementReminder[] = [];

  bySchedule.forEach(({ logged, total }, schedule) => {
    const allTaken = logged === total;
    const status = getSupplementReminderStatus(schedule, allTaken, profile);
    const config = getScheduleTimeConfig(schedule, profile);

    reminders.push({
      schedule,
      status,
      expectedTime: config.expectedTime,
      count: total - logged, // Untaken count
    });
  });

  // Sort by expected time
  return reminders.sort((a, b) =>
    parseTimeToMinutes(a.expectedTime) - parseTimeToMinutes(b.expectedTime)
  );
};

/**
 * Get count of supplements needing attention (due or overdue, not taken)
 */
export const getUrgentSupplementCount = (
  supplements: Array<{ schedule: SupplementSchedule; isLogged: boolean }>,
  profile: ProfileData | null
): number => {
  return supplements.filter(({ schedule, isLogged }) => {
    if (isLogged) return false;
    const status = getSupplementReminderStatus(schedule, false, profile);
    return status === 'due' || status === 'overdue';
  }).length;
};
