import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LocalReminder } from '../types/notifications';
import { getLocalDateString, getCurrentDayOfWeek } from '../utils/date';
import { getTodaysSupplements } from '../services/supplementService';
import { getDaysSinceLastCheckIn } from '../services/checkinService';
import {
  getWorkoutReminderStatus,
  getTrainingTime,
  getSupplementReminderStatus,
  getScheduleTimeConfig,
  formatTimeForDisplay,
} from '../utils/supplementReminders';
import { SupplementSchedule, TodaysSupplement } from '../types/supplements';

/**
 * Hook that generates local reminders based on user's schedule and progress
 * These are client-side generated and shown in the notifications panel
 */
export function useLocalReminders() {
  const { user, profile } = useAuth();
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateReminders = useCallback(async () => {
    if (!user?.id || !profile?.id) {
      setReminders([]);
      return;
    }

    setIsLoading(true);
    const newReminders: LocalReminder[] = [];
    const today = getLocalDateString();
    const now = new Date();

    try {
      // ==================== WORKOUT REMINDER ====================
      // Check if there's a workout scheduled for today
      const { data: workoutAssignment } = await supabase
        .from('assigned_plans')
        .select('program_template_id')
        .eq('athlete_id', profile.id)
        .not('program_template_id', 'is', null)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let hasWorkoutToday = false;
      if (workoutAssignment?.program_template_id) {
        const currentDayOfWeek = getCurrentDayOfWeek();
        const { data: todaysWorkout } = await supabase
          .from('workouts')
          .select('id')
          .eq('program_template_id', workoutAssignment.program_template_id)
          .eq('day_of_week', currentDayOfWeek)
          .limit(1)
          .maybeSingle();
        hasWorkoutToday = !!todaysWorkout;
      }

      if (hasWorkoutToday) {
        // Check if workout completed today
        const { data: completedWorkouts } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', user.id)
          .not('end_time', 'is', null)
          .gte('start_time', `${today}T00:00:00`)
          .lte('start_time', `${today}T23:59:59`);

        const workoutCompleted = (completedWorkouts?.length || 0) > 0;
        const workoutStatus = getWorkoutReminderStatus(hasWorkoutToday, workoutCompleted, profile);
        const trainingTime = getTrainingTime(profile);

        if (workoutStatus === 'overdue') {
          newReminders.push({
            id: 'reminder-workout-overdue',
            type: 'workout_overdue',
            title: 'Workout Overdue',
            message: `Your training was scheduled for ${trainingTime}. Time to hit the gym!`,
            priority: 'high',
            iconColor: '#DC2626',
            href: '/(tabs)/workout',
            createdAt: now,
          });
        } else if (workoutStatus === 'due') {
          newReminders.push({
            id: 'reminder-workout-due',
            type: 'workout_due',
            title: 'Workout Time',
            message: `Your training is scheduled for ${trainingTime}. Ready to crush it?`,
            priority: 'medium',
            iconColor: '#F97316',
            href: '/(tabs)/workout',
            createdAt: now,
          });
        }
      }

      // ==================== SUPPLEMENTS REMINDER ====================
      const { supplements: todaysSupplements } = await getTodaysSupplements(user.id);

      if (todaysSupplements && todaysSupplements.length > 0) {
        // Group by schedule and check status
        const overdueSupplements: TodaysSupplement[] = [];
        const dueSupplements: TodaysSupplement[] = [];

        todaysSupplements.forEach((supp) => {
          if (supp.isLogged) return;
          const status = getSupplementReminderStatus(
            supp.schedule as SupplementSchedule,
            false,
            profile
          );
          if (status === 'overdue') {
            overdueSupplements.push(supp);
          } else if (status === 'due') {
            dueSupplements.push(supp);
          }
        });

        if (overdueSupplements.length > 0) {
          const schedules = [...new Set(overdueSupplements.map(s => s.schedule))];
          newReminders.push({
            id: 'reminder-supplements-overdue',
            type: 'supplements_overdue',
            title: `${overdueSupplements.length} Supplement${overdueSupplements.length > 1 ? 's' : ''} Overdue`,
            message: `${schedules.join(', ')} supplements need to be taken`,
            priority: 'high',
            iconColor: '#DC2626',
            href: '/(tabs)/sups',
            createdAt: now,
          });
        } else if (dueSupplements.length > 0) {
          const schedules = [...new Set(dueSupplements.map(s => s.schedule))];
          newReminders.push({
            id: 'reminder-supplements-due',
            type: 'supplements_due',
            title: `${dueSupplements.length} Supplement${dueSupplements.length > 1 ? 's' : ''} Due`,
            message: `Time to take your ${schedules.join(', ').toLowerCase()} supplements`,
            priority: 'medium',
            iconColor: '#8B5CF6',
            href: '/(tabs)/sups',
            createdAt: now,
          });
        }
      }

      // ==================== MEALS REMINDER ====================
      // Check for missed meals based on actual meal times (time_suggestion)
      const { data: nutritionPlan } = await supabase
        .from('assigned_plans')
        .select('nutrition_plan_id')
        .eq('athlete_id', profile.id)
        .is('program_template_id', null)
        .not('nutrition_plan_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (nutritionPlan?.nutrition_plan_id) {
        // Fetch meals with time_suggestion
        const { data: planMeals } = await supabase
          .from('meals')
          .select('id, name, day_type, time_suggestion')
          .eq('nutrition_plan_id', nutritionPlan.nutrition_plan_id);

        // Fetch today's logged meals
        const { data: mealsLogged } = await supabase
          .from('meal_logs')
          .select('meal_id')
          .eq('user_id', user.id)
          .eq('date', today);

        if (planMeals && planMeals.length > 0) {
          // Filter meals by day type (training vs rest day)
          const filteredMeals = planMeals.filter((meal) => {
            if (!meal.day_type) return true;
            const mealDayType = meal.day_type.toLowerCase();

            if (hasWorkoutToday) {
              return mealDayType.includes('training') || mealDayType.includes('heavy') || mealDayType === 'all';
            } else {
              return mealDayType.includes('rest') || mealDayType.includes('light') || mealDayType === 'all';
            }
          });

          // Get logged meal IDs
          const loggedMealIds = (mealsLogged || []).map((log) => log.meal_id).filter(Boolean);

          // Calculate current time for comparison
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          // Find missed meals (time has passed but not logged)
          const missedMeals = filteredMeals.filter((meal) => {
            // Skip if already logged
            if (loggedMealIds.includes(meal.id)) return false;
            // Check if time has passed
            return meal.time_suggestion && meal.time_suggestion < currentTime;
          });

          if (missedMeals.length > 0) {
            // Sort by time and get the first missed meal for the message
            const sortedMissed = missedMeals.sort((a, b) =>
              (a.time_suggestion || '').localeCompare(b.time_suggestion || '')
            );
            const firstMissed = sortedMissed[0];

            newReminders.push({
              id: 'reminder-meals-overdue',
              type: 'meals_overdue',
              title: missedMeals.length === 1 ? 'Meal Overdue' : `${missedMeals.length} Meals Overdue`,
              message: missedMeals.length === 1
                ? `${firstMissed.name} was scheduled for ${firstMissed.time_suggestion}`
                : `${firstMissed.name} and ${missedMeals.length - 1} other${missedMeals.length > 2 ? 's' : ''} need logging`,
              priority: 'high',
              iconColor: '#DC2626',
              href: '/(tabs)/nutrition',
              createdAt: now,
            });
          }
        }
      }

      // ==================== WATER REMINDER ====================
      // Only show water reminders if user has set a water goal
      const { data: waterGoalData } = await supabase
        .from('water_goals')
        .select('water_goal_ml')
        .eq('user_id', user.id)
        .maybeSingle();

      if (waterGoalData?.water_goal_ml) {
        const waterGoal = waterGoalData.water_goal_ml;

        const { data: waterEntry } = await supabase
          .from('water_tracking')
          .select('amount_ml')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        const waterIntake = waterEntry?.amount_ml || 0;
        const hour = now.getHours();

        // Calculate expected water by time of day (linear distribution)
        const wakeHour = parseInt(profile.nutrition_wakeup_time_of_day?.split(':')[0] || '6');
        const bedHour = parseInt(profile.nutrition_bed_time_of_day?.split(':')[0] || '22');
        const awakeHours = bedHour - wakeHour;
        const hoursSinceWake = Math.max(0, hour - wakeHour);
        const expectedWater = Math.floor((hoursSinceWake / awakeHours) * waterGoal);

        // Show reminder if significantly behind (more than 500ml behind expected)
        if (hour >= 12 && waterIntake < expectedWater - 500) {
          newReminders.push({
            id: 'reminder-water-behind',
            type: 'water_behind',
            title: 'Stay Hydrated',
            message: `You're at ${waterIntake}ml of ${waterGoal}ml. Drink some water!`,
            priority: 'low',
            iconColor: '#06B6D4',
            href: '/(tabs)/water',
            createdAt: now,
          });
        }
      }

      // ==================== STEPS REMINDER ====================
      // Fetch step goal
      const { data: stepGoalData } = await supabase
        .from('step_goals')
        .select('daily_steps')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const stepGoal = stepGoalData?.daily_steps || 0;

      if (stepGoal > 0) {
        // Fetch today's steps
        const { data: stepEntry } = await supabase
          .from('step_entries')
          .select('step_count')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        const stepsCount = stepEntry?.step_count || 0;

        // Calculate expected steps by time of day (linear distribution during waking hours)
        const expectedSteps = Math.floor((hoursSinceWake / awakeHours) * stepGoal);

        // Show reminder if significantly behind (more than 2000 steps behind expected)
        // Only show after noon to give time to accumulate steps
        if (hour >= 14 && stepsCount < expectedSteps - 2000) {
          const stepsFormatted = stepsCount >= 1000
            ? `${(stepsCount / 1000).toFixed(1)}k`
            : stepsCount.toString();
          const goalFormatted = stepGoal >= 1000
            ? `${(stepGoal / 1000).toFixed(0)}k`
            : stepGoal.toString();

          newReminders.push({
            id: 'reminder-steps-behind',
            type: 'steps_behind',
            title: 'Stay Active',
            message: `You're at ${stepsFormatted} of ${goalFormatted} steps. Time for a walk!`,
            priority: 'low',
            iconColor: '#3B82F6',
            href: '/(tabs)/steps',
            createdAt: now,
          });
        }
      }

      // ==================== CHECK-IN REMINDER ====================
      const { days: daysSinceCheckIn } = await getDaysSinceLastCheckIn(user.id);

      if (daysSinceCheckIn === null || daysSinceCheckIn > 7) {
        newReminders.push({
          id: 'reminder-checkin-overdue',
          type: 'checkin_overdue',
          title: 'Weekly Check-in Overdue',
          message: daysSinceCheckIn === null
            ? "You haven't done a check-in yet. Submit your progress!"
            : `It's been ${daysSinceCheckIn} days since your last check-in`,
          priority: 'high',
          iconColor: '#DC2626',
          href: '/(tabs)/checkin',
          createdAt: now,
        });
      }

      // Sort by priority (high first, then medium, then low)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newReminders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setReminders(newReminders);
    } catch (error) {
      console.error('[useLocalReminders] Error generating reminders:', error);
      setReminders([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, profile?.id, profile]);

  // Generate reminders on mount and when dependencies change
  useEffect(() => {
    generateReminders();
  }, [generateReminders]);

  return {
    reminders,
    isLoading,
    refreshReminders: generateReminders,
    reminderCount: reminders.length,
  };
}
