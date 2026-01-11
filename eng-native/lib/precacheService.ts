/**
 * Precache Service
 * Proactively fetches and caches all user data when the app loads while online.
 * This ensures data is available if connectivity changes.
 */

import { supabase } from './supabase';
import { setCache, CacheKeys } from './storage';
import { getLocalDateString, getCurrentDayOfWeek } from '../utils/date';
import { getTodaysSupplements } from '../services/supplementService';
import { getDaysSinceLastCheckIn } from '../services/checkinService';
import {
  getAssignedProgram,
  getProgramWorkouts,
  getTodaysWorkout as getWorkoutForToday,
  checkWorkoutCompletion,
  getLastWorkoutSets,
} from '../services/workoutService';
import {
  getUserNutritionPlan,
  getLoggedMealsForDate,
} from '../services/nutritionService';
import {
  getActiveStepGoal,
  getStepEntryForDate,
  getStepHistory,
  calculateWeeklyStats,
  getWeeklyChartData,
} from '../services/stepsService';
import { isEffectiveRestDay } from '../types/workout';
import { getSupplementReminderStatus } from '../utils/supplementReminders';
import { SupplementSchedule } from '../types/supplements';
import { ProfileData } from '../types/profile';

interface PrecacheProgress {
  total: number;
  completed: number;
  currentTask: string;
}

type ProgressCallback = (progress: PrecacheProgress) => void;

/**
 * Precache all user data for offline use
 */
export async function precacheAllUserData(
  userId: string,
  profileId: string,
  profile: ProfileData | null,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; cached: number; errors: string[] }> {
  const errors: string[] = [];
  let cached = 0;
  const tasks = [
    'workout',
    'nutrition',
    'supplements',
    'water',
    'steps',
    'homeStats',
  ];
  const total = tasks.length;

  const updateProgress = (index: number, task: string) => {
    onProgress?.({ total, completed: index, currentTask: task });
  };

  const today = getLocalDateString();

  try {
    // 1. Cache Workout Program
    updateProgress(0, 'Caching workout program...');
    try {
      const { assignment } = await getAssignedProgram(profileId);

      if (assignment?.program_template_id) {
        const { workouts } = await getProgramWorkouts(assignment.program_template_id);
        const todaysWorkout = getWorkoutForToday(workouts);

        let isCompleted = false;
        let completionTime: string | null = null;

        if (todaysWorkout && !isEffectiveRestDay(todaysWorkout)) {
          const result = await checkWorkoutCompletion(todaysWorkout.id, userId);
          isCompleted = result.isCompleted;
          completionTime = result.completionTime;
        }

        await setCache(CacheKeys.workoutProgram(userId), {
          assignment,
          workouts,
          isCompleted,
          completionTime,
          cachedAt: new Date().toISOString(),
        });
        cached++;

        // Pre-fetch and cache previous workout sets for all workouts
        // This enables offline weight/rep pre-filling
        for (const workout of workouts) {
          try {
            const { sets: previousSets } = await getLastWorkoutSets(workout.id, userId);
            if (previousSets.size > 0) {
              await setCache(
                CacheKeys.previousWorkoutSets(userId, workout.id),
                Array.from(previousSets.entries())
              );
            }
          } catch (err) {
            // Don't fail the whole precache if one workout fails
            console.warn(`[Precache] Error caching previous sets for workout ${workout.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[Precache] Error caching workout:', err);
      errors.push('workout');
    }

    // 2. Cache Nutrition Plan and Today's Meals
    updateProgress(1, 'Caching nutrition plan...');
    try {
      const { nutritionPlan } = await getUserNutritionPlan(profileId);

      if (nutritionPlan) {
        await setCache(CacheKeys.nutritionPlan(userId), {
          nutritionPlan,
          cachedAt: new Date().toISOString(),
        });
        cached++;

        // Also cache today's meals
        const { dailyLog } = await getLoggedMealsForDate(userId, today, nutritionPlan);

        // Determine day type based on workout
        const { assignment } = await getAssignedProgram(profileId);
        let dayType: 'Training' | 'Rest' = 'Training';
        if (assignment?.program_template_id) {
          const { workouts } = await getProgramWorkouts(assignment.program_template_id);
          const todaysWorkout = getWorkoutForToday(workouts);
          dayType = todaysWorkout && !isEffectiveRestDay(todaysWorkout) ? 'Training' : 'Rest';
        }

        await setCache(CacheKeys.todaysMeals(userId), {
          dailyLog,
          selectedDayType: dayType,
          date: today,
        });
        cached++;
      }
    } catch (err) {
      console.error('[Precache] Error caching nutrition:', err);
      errors.push('nutrition');
    }

    // 3. Cache Today's Supplements
    updateProgress(2, 'Caching supplements...');
    try {
      const { supplements: todaysSupplements } = await getTodaysSupplements(userId);

      if (todaysSupplements) {
        await setCache(CacheKeys.todaysSupplements(userId), {
          supplements: todaysSupplements,
          date: today,
        });
        cached++;
      }
    } catch (err) {
      console.error('[Precache] Error caching supplements:', err);
      errors.push('supplements');
    }

    // 4. Cache Water Data
    updateProgress(3, 'Caching water data...');
    try {
      // Get water entry for today
      const { data: waterEntry } = await supabase
        .from('water_tracking')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      // Get water goal
      let waterGoal = null;
      const { data: waterGoalByUserId } = await supabase
        .from('water_goals')
        .select('water_goal_ml')
        .eq('user_id', userId)
        .maybeSingle();

      if (waterGoalByUserId) {
        waterGoal = waterGoalByUserId;
      } else {
        const { data: waterGoalByProfileId } = await supabase
          .from('water_goals')
          .select('water_goal_ml')
          .eq('user_id', profileId)
          .maybeSingle();
        waterGoal = waterGoalByProfileId;
      }

      await setCache(CacheKeys.todaysWater(userId), {
        amount: waterEntry?.amount_ml || 0,
        goal: waterGoal?.water_goal_ml || 0,
        date: today,
      });
      cached++;
    } catch (err) {
      console.error('[Precache] Error caching water:', err);
      errors.push('water');
    }

    // 5. Cache Steps Data
    updateProgress(4, 'Caching steps data...');
    try {
      const { goal } = await getActiveStepGoal(profileId);
      const { entry } = await getStepEntryForDate(userId, today);
      const { entries } = await getStepHistory(userId, 7);

      let weeklyStats = null;
      let weeklyChartData: any[] = [];

      if (goal) {
        weeklyStats = calculateWeeklyStats(entries, goal.daily_steps);
        weeklyChartData = getWeeklyChartData(entries, goal.daily_steps);
      }

      await setCache(CacheKeys.todaysSteps(userId), {
        goal,
        entry,
        weeklyStats,
        weeklyChartData,
        date: today,
      });
      cached++;
    } catch (err) {
      console.error('[Precache] Error caching steps:', err);
      errors.push('steps');
    }

    // 6. Cache Home Stats (aggregated data)
    updateProgress(5, 'Caching home stats...');
    try {
      await cacheHomeStats(userId, profileId, profile, today);
      cached++;
    } catch (err) {
      console.error('[Precache] Error caching home stats:', err);
      errors.push('homeStats');
    }

    updateProgress(total, 'Complete');
    console.log(`[Precache] Complete: ${cached} items cached, ${errors.length} errors`);

    return { success: errors.length === 0, cached, errors };
  } catch (error) {
    console.error('[Precache] Fatal error:', error);
    return { success: false, cached, errors: ['fatal'] };
  }
}

/**
 * Cache home stats (aggregated dashboard data)
 */
async function cacheHomeStats(
  userId: string,
  profileId: string,
  profile: ProfileData | null,
  today: string
): Promise<void> {
  // Fetch completed workouts today
  const { data: workouts } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .not('end_time', 'is', null)
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`);

  const workoutsCompleted = workouts?.length || 0;

  // Check workout program and today's workout
  const { data: workoutAssignment } = await supabase
    .from('assigned_plans')
    .select('program_template_id')
    .eq('athlete_id', profileId)
    .not('program_template_id', 'is', null)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let hasWorkoutProgram = false;
  let hasWorkoutToday = false;

  if (workoutAssignment?.program_template_id) {
    hasWorkoutProgram = true;
    const currentDayOfWeek = getCurrentDayOfWeek();
    const { data: todaysWorkout } = await supabase
      .from('workouts')
      .select('id, name, exercise_instances(id)')
      .eq('program_template_id', workoutAssignment.program_template_id)
      .eq('day_of_week', currentDayOfWeek)
      .limit(1)
      .maybeSingle();

    const isEffectiveRest = !todaysWorkout ||
      todaysWorkout.name.toLowerCase().includes('rest') ||
      !todaysWorkout.exercise_instances ||
      todaysWorkout.exercise_instances.length === 0;

    hasWorkoutToday = !isEffectiveRest;
  }

  // Fetch meals logged today
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('id, meal_id')
    .eq('user_id', userId)
    .eq('date', today);

  const mealsLogged = mealLogs?.length || 0;

  // Fetch nutrition plan for meal count
  const { data: assignedPlan } = await supabase
    .from('assigned_plans')
    .select('nutrition_plan_id')
    .eq('athlete_id', profileId)
    .is('program_template_id', null)
    .not('nutrition_plan_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let mealsPlanned = 0;
  if (assignedPlan?.nutrition_plan_id) {
    const { data: planMeals } = await supabase
      .from('meals')
      .select('id, day_type')
      .eq('nutrition_plan_id', assignedPlan.nutrition_plan_id);

    if (planMeals) {
      const filteredMeals = planMeals.filter((meal) => {
        if (!meal.day_type) return true;
        const dayType = meal.day_type.toLowerCase();
        if (hasWorkoutToday) {
          return dayType.includes('training') || dayType.includes('heavy') || dayType === 'all';
        } else {
          return dayType.includes('rest') || dayType.includes('light') || dayType === 'all';
        }
      });
      mealsPlanned = filteredMeals.length;
    }
  }

  // Fetch steps
  const { data: stepEntry } = await supabase
    .from('step_entries')
    .select('step_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const stepsCount = stepEntry?.step_count || 0;

  // Fetch step goal
  const { data: stepGoalData } = await supabase
    .from('step_goals')
    .select('daily_steps')
    .eq('user_id', profileId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stepsGoal = stepGoalData?.daily_steps || 0;

  // Fetch water
  const { data: waterEntry } = await supabase
    .from('water_tracking')
    .select('amount_ml')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const waterIntake = waterEntry?.amount_ml || 0;

  // Fetch water goal
  let waterGoalData = null;
  const { data: waterGoalByUserId } = await supabase
    .from('water_goals')
    .select('water_goal_ml')
    .eq('user_id', userId)
    .maybeSingle();

  if (waterGoalByUserId) {
    waterGoalData = waterGoalByUserId;
  } else {
    const { data: waterGoalByProfileId } = await supabase
      .from('water_goals')
      .select('water_goal_ml')
      .eq('user_id', profileId)
      .maybeSingle();
    waterGoalData = waterGoalByProfileId;
  }

  const waterGoal = waterGoalData?.water_goal_ml || 0;

  // Fetch supplements
  const { supplements: todaysSupplements } = await getTodaysSupplements(userId);
  const supplementsTotal = todaysSupplements?.length || 0;
  const supplementsTaken = todaysSupplements?.filter(s => s.isLogged).length || 0;

  // Fetch check-in status
  const { days } = await getDaysSinceLastCheckIn(userId);
  let checkInStatus: 'complete' | 'todo' | 'overdue' = 'todo';
  if (days === null) {
    checkInStatus = 'todo';
  } else if (days <= 7) {
    checkInStatus = 'complete';
  } else {
    checkInStatus = 'overdue';
  }

  await setCache(CacheKeys.homeStats(userId), {
    workoutsCompleted,
    hasWorkoutProgram,
    hasWorkoutToday,
    mealsLogged,
    mealsPlanned,
    stepsCount,
    stepsGoal,
    waterIntake,
    waterGoal,
    supplementsTaken,
    supplementsTotal,
    checkInStatus,
    daysSinceCheckIn: days,
    date: today,
  });
}
