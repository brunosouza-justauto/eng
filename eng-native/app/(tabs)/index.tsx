import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Dumbbell, Utensils, Pill, Footprints, Droplets, ClipboardCheck, Zap } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getLocalDateString, getCurrentDayOfWeek } from '../../utils/date';
import { getGreeting, getMotivationalMessage, getStreakMessage } from '../../utils/motivationalMessages';
import { getTodaysSupplements } from '../../services/supplementService';
import CircularProgress from '../../components/home/CircularProgress';
import DailyTaskCard from '../../components/home/DailyTaskCard';
import StreakCounter from '../../components/home/StreakCounter';
import CelebrationOverlay from '../../components/home/CelebrationOverlay';

export default function HomeScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();

  // Today's overview stats
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false);
  const [mealsLogged, setMealsLogged] = useState(0);
  const [mealsPlanned, setMealsPlanned] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [supplementsTaken, setSupplementsTaken] = useState(0);
  const [supplementsTotal, setSupplementsTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevAllGoalsMet = useRef(false);

  // Calculate goal completion
  const workoutGoalMet = hasWorkoutToday ? workoutsCompleted > 0 : true; // If no workout scheduled, consider it met
  const mealsGoalMet = mealsPlanned > 0 ? mealsLogged >= mealsPlanned : mealsLogged > 0;
  const stepsGoalMet = stepsGoal > 0 && stepsCount >= stepsGoal;
  const waterGoalMet = waterGoal > 0 && waterIntake >= waterGoal;

  // Calculate overall progress
  const calculateOverallProgress = () => {
    let totalTasks = 0;
    let completedTasks = 0;

    // Workout (only count if there's one scheduled)
    if (hasWorkoutToday) {
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
      }
    }, [user?.id, profile?.id])
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
    if (!user?.id || !profile?.id) return;

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

      // Check if there's a workout scheduled for today
      const { data: workoutAssignment } = await supabase
        .from('assigned_plans')
        .select('program_template_id')
        .eq('athlete_id', profile.id)
        .not('program_template_id', 'is', null)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (workoutAssignment?.program_template_id) {
        const currentDayOfWeek = getCurrentDayOfWeek();
        const { data: todaysWorkout } = await supabase
          .from('workouts')
          .select('id')
          .eq('program_template_id', workoutAssignment.program_template_id)
          .eq('day_of_week', currentDayOfWeek)
          .limit(1)
          .maybeSingle();

        setHasWorkoutToday(!!todaysWorkout);
      } else {
        setHasWorkoutToday(false);
      }

      // Fetch meals logged today
      const { data: meals, error: mealsError } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today);

      if (!mealsError && meals) {
        setMealsLogged(meals.length);
      }

      // Fetch nutrition plan to get planned meals count
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
          .select('id, day_type')
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
        }
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

      setStepsGoal(stepGoalData?.daily_steps || 10000);

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

      setWaterGoal(waterGoalData?.water_goal_ml || 2500);

      // Fetch supplements data
      const { supplements: todaysSupplements } = await getTodaysSupplements(user.id);
      if (todaysSupplements) {
        setSupplementsTotal(todaysSupplements.length);
        setSupplementsTaken(todaysSupplements.filter(s => s.isLogged).length);
      }
    } catch (err) {
      console.error('Error fetching today stats:', err);
    } finally {
      setIsRefreshing(false);
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
      subtitle: hasWorkoutToday ? 'Training day - Hit the gym!' : 'Rest day - Recover well!',
      icon: Dumbbell,
      color: '#6366F1',
      progress: hasWorkoutToday ? (workoutsCompleted > 0 ? 100 : 0) : 100,
      current: workoutsCompleted.toString(),
      goal: hasWorkoutToday ? '1' : '0',
      isComplete: workoutGoalMet,
      href: '/(tabs)/workout',
      show: true,
    },
    {
      title: 'Nutrition',
      subtitle: `Log your meals to hit your macros`,
      icon: Utensils,
      color: '#22C55E',
      progress: mealsPlanned > 0 ? Math.min((mealsLogged / mealsPlanned) * 100, 100) : (mealsLogged > 0 ? 100 : 0),
      current: mealsLogged.toString(),
      goal: mealsPlanned > 0 ? mealsPlanned.toString() : '—',
      isComplete: mealsGoalMet,
      href: '/(tabs)/nutrition',
      show: true,
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
      href: '/(tabs)/water',
      show: waterGoal > 0,
    },
  ];

  const completedCount = tasks.filter(t => t.show && t.isComplete).length;
  const totalCount = tasks.filter(t => t.show).length;

  return (
    <>
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

        {/* Section Header */}
        <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Today's Goals
        </Text>

        {/* Task Cards */}
        {tasks.filter(t => t.show).map((task, index) => (
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
            href={task.href}
          />
        ))}

        {/* Quick Links */}
        <Text className={`text-lg font-semibold mt-4 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          More
        </Text>

        <DailyTaskCard
          title="Supplements"
          subtitle={supplementsTotal > 0 ? "Track your daily supplements" : "No supplements assigned"}
          icon={Pill}
          color="#8B5CF6"
          progress={supplementsTotal > 0 ? Math.round((supplementsTaken / supplementsTotal) * 100) : 0}
          current={supplementsTotal > 0 ? supplementsTaken.toString() : "—"}
          goal={supplementsTotal > 0 ? supplementsTotal.toString() : "—"}
          isComplete={supplementsTotal > 0 && supplementsTaken === supplementsTotal}
          href="/(tabs)/sups"
        />

        <DailyTaskCard
          title="Weekly Check-in"
          subtitle="Log your progress and photos"
          icon={ClipboardCheck}
          color="#F59E0B"
          progress={0}
          current="—"
          goal="—"
          isComplete={false}
          href="/(tabs)/checkin"
        />
      </ScrollView>

      {/* Celebration Overlay */}
      <CelebrationOverlay
        visible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </>
  );
}
