import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, Link } from 'expo-router';
import { Dumbbell, Utensils, Pill, Footprints, Droplets, ClipboardCheck, Zap, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { getLocalDateString, getCurrentDayOfWeek } from '../../utils/date';
import { getGreeting, getMotivationalMessage, getStreakMessage } from '../../utils/motivationalMessages';
import { getTodaysSupplements } from '../../services/supplementService';
import { SupplementSchedule } from '../../types/supplements';
import { getDaysSinceLastCheckIn } from '../../services/checkinService';
import { getWorkoutReminderStatus, getTrainingTime, getSupplementReminderStatus, formatTimeForDisplay, WorkoutReminderStatus } from '../../utils/supplementReminders';
import CircularProgress from '../../components/home/CircularProgress';
import DailyTaskCard from '../../components/home/DailyTaskCard';
import StreakCounter from '../../components/home/StreakCounter';
import CelebrationOverlay from '../../components/home/CelebrationOverlay';
import SkeletonCard from '../../components/home/SkeletonCard';

export default function HomeScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const { refreshReminders } = useNotifications();

  // Today's overview stats
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
  const [hasWorkoutProgram, setHasWorkoutProgram] = useState(false);
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false);
  const [mealsLogged, setMealsLogged] = useState(0);
  const [mealsPlanned, setMealsPlanned] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(0);
  const [supplementsTaken, setSupplementsTaken] = useState(0);
  const [supplementsTotal, setSupplementsTotal] = useState(0);
  const [checkInStatus, setCheckInStatus] = useState<'complete' | 'todo' | 'overdue'>('todo');
  const [daysSinceCheckIn, setDaysSinceCheckIn] = useState<number | null>(null);
  const [hasMealsOverdue, setHasMealsOverdue] = useState(false);
  const [hasSupplementsOverdue, setHasSupplementsOverdue] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevAllGoalsMet = useRef(false);
  const hasLoadedOnce = useRef(false);

  // Calculate goal completion
  const workoutGoalMet = hasWorkoutToday ? workoutsCompleted > 0 : true; // If no workout scheduled, consider it met
  const mealsGoalMet = mealsPlanned > 0 ? mealsLogged >= mealsPlanned : mealsLogged > 0;
  const stepsGoalMet = stepsGoal > 0 && stepsCount >= stepsGoal;
  const waterGoalMet = waterGoal > 0 && waterIntake >= waterGoal;

  // Calculate water/steps overdue status (same logic as useLocalReminders)
  const { isWaterOverdue, isStepsOverdue } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const wakeHour = parseInt(profile?.nutrition_wakeup_time_of_day?.split(':')[0] || '6');
    const bedHour = parseInt(profile?.nutrition_bed_time_of_day?.split(':')[0] || '22');
    const awakeHours = bedHour - wakeHour;
    const hoursSinceWake = Math.max(0, hour - wakeHour);

    // Water: behind by more than 500ml after noon
    const expectedWater = Math.floor((hoursSinceWake / awakeHours) * waterGoal);
    const waterOverdue = hour >= 12 && waterGoal > 0 && waterIntake < expectedWater - 500;

    // Steps: behind by more than 2000 steps after 2pm
    const expectedSteps = Math.floor((hoursSinceWake / awakeHours) * stepsGoal);
    const stepsOverdue = hour >= 14 && stepsGoal > 0 && stepsCount < expectedSteps - 2000;

    return { isWaterOverdue: waterOverdue, isStepsOverdue: stepsOverdue };
  }, [profile, waterGoal, waterIntake, stepsGoal, stepsCount]);

  // Calculate overall progress
  const calculateOverallProgress = () => {
    let totalTasks = 0;
    let completedTasks = 0;

    // Workout (only count if user has a program assigned)
    if (hasWorkoutProgram) {
      totalTasks++;
      if (workoutGoalMet) completedTasks++;
    }

    // Meals
    if (mealsPlanned > 0) {
      totalTasks++;
      if (mealsGoalMet) completedTasks++;
    }

    // Steps
    if (stepsGoal > 0) {
      totalTasks++;
      if (stepsGoalMet) completedTasks++;
    }

    // Water
    if (waterGoal > 0) {
      totalTasks++;
      if (waterGoalMet) completedTasks++;
    }

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const overallProgress = calculateOverallProgress();
  const allGoalsMet = overallProgress === 100;

  // Calculate workout reminder status based on user's training time
  const workoutReminderStatus = useMemo(() => {
    return getWorkoutReminderStatus(hasWorkoutToday, workoutsCompleted > 0, profile);
  }, [hasWorkoutToday, workoutsCompleted, profile]);

  const trainingTime = useMemo(() => getTrainingTime(profile), [profile]);

  // Show celebration when all goals are met for the first time
  useEffect(() => {
    if (allGoalsMet && !prevAllGoalsMet.current) {
      setShowCelebration(true);
    }
    prevAllGoalsMet.current = allGoalsMet;
  }, [allGoalsMet]);

  // Fetch today's stats on focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id && profile?.id) {
        fetchTodaysStats();
        fetchStreak();
        refreshReminders();
      }
    }, [user?.id, profile?.id, refreshReminders])
  );

  const fetchStreak = async () => {
    if (!user?.id) return;

    try {
      // For now, calculate streak based on consecutive days with at least one workout completed
      // You could expand this to check all goals
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('start_time')
        .eq('user_id', user.id)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(60); // Check last 60 days max

      if (!sessions || sessions.length === 0) {
        setStreak(0);
        return;
      }

      // Count consecutive days
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const workoutDates = new Set(
        sessions.map((s) => {
          const date = new Date(s.start_time);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      );

      // Check each day going backwards
      for (let i = 0; i <= 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        checkDate.setHours(0, 0, 0, 0);

        if (workoutDates.has(checkDate.getTime())) {
          currentStreak++;
        } else if (i > 0) {
          // Allow skipping today if no workout yet
          break;
        }
      }

      setStreak(currentStreak);
    } catch (err) {
      console.error('Error fetching streak:', err);
    }
  };

  const fetchTodaysStats = async () => {
    if (!user?.id || !profile?.id) {
      setIsRefreshing(false);
      setIsLoading(false);
      return;
    }

    const today = getLocalDateString();

    try {
      // Fetch completed workouts today
      const { data: workouts, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('end_time', 'is', null)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`);

      if (!workoutsError && workouts) {
        setWorkoutsCompleted(workouts.length);
      }

      // Check if there's a workout program assigned and if there's a workout scheduled for today
      const { data: workoutAssignment } = await supabase
        .from('assigned_plans')
        .select('program_template_id')
        .eq('athlete_id', profile.id)
        .not('program_template_id', 'is', null)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (workoutAssignment?.program_template_id) {
        setHasWorkoutProgram(true);
        const currentDayOfWeek = getCurrentDayOfWeek();
        const { data: todaysWorkout } = await supabase
          .from('workouts')
          .select('id, name, exercise_instances(id)')
          .eq('program_template_id', workoutAssignment.program_template_id)
          .eq('day_of_week', currentDayOfWeek)
          .limit(1)
          .maybeSingle();

        // Check if today is an effective rest day (no workout, name contains "rest", or no exercises)
        const isEffectiveRest = !todaysWorkout ||
          todaysWorkout.name.toLowerCase().includes('rest') ||
          !todaysWorkout.exercise_instances ||
          todaysWorkout.exercise_instances.length === 0;

        setHasWorkoutToday(!isEffectiveRest);
      } else {
        setHasWorkoutProgram(false);
        setHasWorkoutToday(false);
      }

      // Fetch meals logged today
      const { data: mealLogs, error: mealsError } = await supabase
        .from('meal_logs')
        .select('id, meal_id')
        .eq('user_id', user.id)
        .eq('date', today);

      if (!mealsError && mealLogs) {
        setMealsLogged(mealLogs.length);
      }

      // Fetch nutrition plan to get planned meals count and check for overdue
      const { data: assignedPlan } = await supabase
        .from('assigned_plans')
        .select('nutrition_plan_id')
        .eq('athlete_id', profile.id)
        .is('program_template_id', null)
        .not('nutrition_plan_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignedPlan?.nutrition_plan_id) {
        let isTrainingDay = hasWorkoutToday;

        const { data: planMeals } = await supabase
          .from('meals')
          .select('id, day_type, time_suggestion')
          .eq('nutrition_plan_id', assignedPlan.nutrition_plan_id);

        if (planMeals) {
          const filteredMeals = planMeals.filter((meal) => {
            if (!meal.day_type) return true;
            const dayType = meal.day_type.toLowerCase();

            if (isTrainingDay) {
              return dayType.includes('training') || dayType.includes('heavy') || dayType === 'all';
            } else {
              return dayType.includes('rest') || dayType.includes('light') || dayType === 'all';
            }
          });
          setMealsPlanned(filteredMeals.length);

          // Check for overdue meals (time has passed but not logged)
          const loggedMealIds = (mealLogs || []).map((log) => log.meal_id).filter(Boolean);
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          const hasOverdue = filteredMeals.some((meal) => {
            if (loggedMealIds.includes(meal.id)) return false;
            return meal.time_suggestion && meal.time_suggestion < currentTime;
          });
          setHasMealsOverdue(hasOverdue);
        }
      } else {
        setHasMealsOverdue(false);
      }

      // Fetch steps today
      const { data: stepEntry } = await supabase
        .from('step_entries')
        .select('step_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      setStepsCount(stepEntry?.step_count || 0);

      // Fetch step goal
      const { data: stepGoalData } = await supabase
        .from('step_goals')
        .select('daily_steps')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStepsGoal(stepGoalData?.daily_steps || 0);

      // Fetch water intake today
      const { data: waterEntry } = await supabase
        .from('water_tracking')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      setWaterIntake(waterEntry?.amount_ml || 0);

      // Fetch water goal
      let waterGoalData = null;
      const { data: waterGoalByUserId } = await supabase
        .from('water_goals')
        .select('water_goal_ml')
        .eq('user_id', user.id)
        .maybeSingle();

      if (waterGoalByUserId) {
        waterGoalData = waterGoalByUserId;
      } else {
        const { data: waterGoalByProfileId } = await supabase
          .from('water_goals')
          .select('water_goal_ml')
          .eq('user_id', profile.id)
          .maybeSingle();
        waterGoalData = waterGoalByProfileId;
      }

      setWaterGoal(waterGoalData?.water_goal_ml || 0);

      // Fetch supplements data
      const { supplements: todaysSupplements } = await getTodaysSupplements(user.id);
      if (todaysSupplements) {
        setSupplementsTotal(todaysSupplements.length);
        setSupplementsTaken(todaysSupplements.filter(s => s.isLogged).length);

        // Check for overdue supplements
        const hasOverdueSupps = todaysSupplements.some((supp) => {
          if (supp.isLogged) return false;
          const status = getSupplementReminderStatus(
            supp.schedule as SupplementSchedule,
            false,
            profile
          );
          return status === 'overdue';
        });
        setHasSupplementsOverdue(hasOverdueSupps);
      } else {
        setHasSupplementsOverdue(false);
      }

      // Fetch check-in status
      const { days } = await getDaysSinceLastCheckIn(user.id);
      setDaysSinceCheckIn(days);
      if (days === null) {
        // Never done a check-in
        setCheckInStatus('todo');
      } else if (days <= 7) {
        // Check-in within last 7 days
        setCheckInStatus('complete');
      } else {
        // More than 7 days since last check-in
        setCheckInStatus('overdue');
      }
    } catch (err) {
      console.error('Error fetching today stats:', err);
    } finally {
      setIsRefreshing(false);
      // Only set loading false on first load
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTodaysStats();
    fetchStreak();
  }, []);

  // Get display name
  const getDisplayName = () => {
    if (profile?.first_name) return profile.first_name;
    if (profile?.username) return profile.username;
    return user?.email?.split('@')[0] || 'Champion';
  };

  const displayName = getDisplayName();

  // Task data
  const tasks = [
    {
      title: 'Workout',
      subtitle: hasWorkoutProgram
        ? (hasWorkoutToday ? 'Training day - Hit the gym!' : 'Rest day - Recover well!')
        : 'No program assigned',
      icon: Dumbbell,
      color: '#6366F1',
      progress: hasWorkoutProgram ? (hasWorkoutToday ? (workoutsCompleted > 0 ? 100 : 0) : 100) : 0,
      current: hasWorkoutProgram ? (hasWorkoutToday ? workoutsCompleted.toString() : 'Rest') : '—',
      goal: hasWorkoutProgram ? (hasWorkoutToday ? '1' : '') : '',
      isComplete: hasWorkoutProgram && workoutGoalMet,
      isOverdue: hasWorkoutProgram && workoutReminderStatus === 'overdue',
      href: '/(tabs)/workout',
      show: hasWorkoutProgram,
    },
    {
      title: 'Nutrition',
      subtitle: `Log your meals to hit your macros`,
      icon: Utensils,
      color: '#22C55E',
      progress: mealsPlanned > 0 ? Math.min((mealsLogged / mealsPlanned) * 100, 100) : 0,
      current: mealsLogged.toString(),
      goal: mealsPlanned.toString(),
      isComplete: mealsGoalMet,
      isOverdue: hasMealsOverdue,
      href: '/(tabs)/nutrition',
      show: mealsPlanned > 0,
    },
    {
      title: 'Steps',
      subtitle: 'Keep moving throughout the day',
      icon: Footprints,
      color: '#3B82F6',
      progress: stepsGoal > 0 ? Math.min((stepsCount / stepsGoal) * 100, 100) : 0,
      current: stepsCount >= 1000 ? `${(stepsCount / 1000).toFixed(1)}k` : stepsCount.toString(),
      goal: stepsGoal >= 1000 ? `${(stepsGoal / 1000).toFixed(0)}k` : stepsGoal.toString(),
      isComplete: stepsGoalMet,
      isOverdue: isStepsOverdue,
      href: '/(tabs)/steps',
      show: stepsGoal > 0,
    },
    {
      title: 'Water',
      subtitle: 'Stay hydrated for peak performance',
      icon: Droplets,
      color: '#06B6D4',
      progress: waterGoal > 0 ? Math.min((waterIntake / waterGoal) * 100, 100) : 0,
      current: waterIntake >= 1000 ? `${(waterIntake / 1000).toFixed(1)}L` : `${waterIntake}ml`,
      goal: waterGoal >= 1000 ? `${(waterGoal / 1000).toFixed(1)}L` : `${waterGoal}ml`,
      isComplete: waterGoalMet,
      isOverdue: isWaterOverdue,
      href: '/(tabs)/water',
      show: waterGoal > 0,
    },
  ];

  const completedCount = tasks.filter(t => t.show && t.isComplete).length;
  const totalCount = tasks.filter(t => t.show).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        }
      >
        {/* Workout Overdue Reminder Banner */}
        {workoutReminderStatus === 'overdue' && (
          <Link href="/(tabs)/workout" asChild>
            <Pressable
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              <AlertTriangle size={20} color="#DC2626" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#991B1B' }}>
                  Workout overdue!
                </Text>
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  Your training was scheduled for {trainingTime}. Tap to start!
                </Text>
              </View>
              <Dumbbell size={20} color="#DC2626" />
            </Pressable>
          </Link>
        )}

        {/* Header with Greeting and Streak */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Hey, {displayName}!
            </Text>
            <Text className={`text-base mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {getMotivationalMessage(overallProgress)}
            </Text>
          </View>
          <StreakCounter streak={streak} />
        </View>

        {/* Progress Ring Card */}
        {isLoading ? (
          <SkeletonCard variant="progress" />
        ) : (
          <View
            className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.4 : 0.15,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Progress Ring */}
              <CircularProgress progress={overallProgress} size={140} strokeWidth={12}>
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 36,
                      fontWeight: '800',
                      color: allGoalsMet ? '#22C55E' : isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {overallProgress}%
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      marginTop: -2,
                    }}
                  >
                    complete
                  </Text>
                </View>
              </CircularProgress>

            {/* Stats Summary */}
            <View style={{ flex: 1, marginLeft: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Zap size={20} color="#FBBF24" fill="#FBBF24" />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    marginLeft: 8,
                  }}
                >
                  Daily Score
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginBottom: 12,
                }}
              >
                {completedCount}/{totalCount} goals completed
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? '#6B7280' : '#9CA3AF',
                  fontStyle: 'italic',
                }}
              >
                {getStreakMessage(streak, 'secondary')}
              </Text>
            </View>
            </View>
          </View>
        )}

        {/* Section Header - only show if there are goals */}
        {(isLoading || totalCount > 0) && (
          <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Today's Goals
          </Text>
        )}

        {/* Task Cards - Show skeletons while loading */}
        {isLoading ? (
          <>
            <SkeletonCard variant="task" />
            <SkeletonCard variant="task" />
            <SkeletonCard variant="task" />
            <SkeletonCard variant="task" />
          </>
        ) : totalCount === 0 ? (
          <View
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              marginBottom: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
              No goals assigned yet.{'\n'}Ask your coach to set up your program!
            </Text>
          </View>
        ) : (
          tasks.filter(t => t.show).map((task, index) => (
            <DailyTaskCard
              key={index}
              title={task.title}
              subtitle={task.subtitle}
              icon={task.icon}
              color={task.color}
              progress={task.progress}
              current={task.current}
              goal={task.goal}
              isComplete={task.isComplete}
              isOverdue={task.isOverdue}
              href={task.href}
            />
          ))
        )}

        {/* Quick Links */}
        <Text className={`text-lg font-semibold mt-4 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          More
        </Text>

        {isLoading ? (
          <>
            <SkeletonCard variant="task" />
            <SkeletonCard variant="task" />
          </>
        ) : (
          <>
            {supplementsTotal > 0 && (
              <DailyTaskCard
                title="Supplements"
                subtitle="Track your daily supplements"
                icon={Pill}
                color="#8B5CF6"
                progress={Math.round((supplementsTaken / supplementsTotal) * 100)}
                current={supplementsTaken.toString()}
                goal={supplementsTotal.toString()}
                isComplete={supplementsTaken === supplementsTotal}
                isOverdue={hasSupplementsOverdue}
                href="/(tabs)/sups"
              />
            )}

            <DailyTaskCard
              title="Weekly Check-in"
              subtitle={
                checkInStatus === 'complete'
                  ? `Completed ${daysSinceCheckIn === 0 ? 'today' : daysSinceCheckIn === 1 ? 'yesterday' : `${daysSinceCheckIn} days ago`}`
                  : checkInStatus === 'overdue'
                  ? `Last check-in was ${daysSinceCheckIn} days ago`
                  : "Log your progress and photos"
              }
              icon={ClipboardCheck}
              color={checkInStatus === 'overdue' ? '#EF4444' : '#F59E0B'}
              progress={checkInStatus === 'complete' ? 100 : 0}
              current={
                checkInStatus === 'complete'
                  ? 'Complete'
                  : checkInStatus === 'overdue'
                  ? 'Overdue'
                  : 'To do'
              }
              goal=""
              isComplete={checkInStatus === 'complete'}
              isOverdue={checkInStatus === 'overdue'}
              isWarning={checkInStatus === 'todo'}
              href="/(tabs)/checkin"
            />
          </>
        )}
      </ScrollView>

      {/* Celebration Overlay */}
      <CelebrationOverlay
        visible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </View>
  );
}
