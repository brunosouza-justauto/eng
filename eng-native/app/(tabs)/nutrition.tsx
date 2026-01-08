import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Utensils, AlertCircle, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getLocalDateString } from '../../utils/date';
import {
  MacroCircle,
  PlannedMealCard,
  MissedMealsAlert,
  DayTypeSelector,
  ExtraMealsSection,
  AddExtraMealModal,
} from '../../components/nutrition';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import {
  getUserNutritionPlan,
  getLoggedMealsForDate,
  logPlannedMeal,
  logExtraMeal,
  deleteLoggedMeal,
  getMealsForDayType,
  getMissedMeals,
  getDayTypeTargets,
} from '../../services/nutritionService';
import {
  getAssignedProgram,
  getProgramWorkouts,
  getTodaysWorkout,
} from '../../services/workoutService';
import {
  NutritionPlanWithMeals,
  DailyNutritionLog,
  SimpleDayType,
  ExtraMealFormData,
  MissedMeal,
} from '../../types/nutrition';

export default function NutritionScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();

  // State
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithMeals | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyNutritionLog | null>(null);
  const [selectedDayType, setSelectedDayType] = useState<SimpleDayType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const [showAddExtraMealModal, setShowAddExtraMealModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnlogModal, setShowUnlogModal] = useState(false);
  const [mealToUnlog, setMealToUnlog] = useState<string | null>(null);
  const [isUnlogging, setIsUnlogging] = useState(false);

  // Get today's date in YYYY-MM-DD format (local timezone)
  const today = useMemo(() => getLocalDateString(), []);

  // Load nutrition data
  const loadNutritionData = useCallback(async () => {
    if (!profile?.id || !user?.id) return;

    try {
      // Get nutrition plan (uses profile.id for assigned_plans)
      const { nutritionPlan: plan } = await getUserNutritionPlan(profile.id);
      setNutritionPlan(plan);

      // Get today's logged meals (uses user.id for meal_logs)
      const { dailyLog: log } = await getLoggedMealsForDate(user.id, today, plan);
      setDailyLog(log);

      // Determine if today is a training or rest day (only on initial load)
      if (selectedDayType === null) {
        const { assignment } = await getAssignedProgram(profile.id);
        if (assignment?.program_template_id) {
          const { workouts } = await getProgramWorkouts(assignment.program_template_id);
          const todaysWorkout = getTodaysWorkout(workouts);
          setSelectedDayType(todaysWorkout ? 'Training' : 'Rest');
        } else {
          // No program assigned, default to Training
          setSelectedDayType('Training');
        }
      }
    } catch (error) {
      console.error('Error loading nutrition data:', error);
      // Default to Training if there's an error
      if (selectedDayType === null) {
        setSelectedDayType('Training');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profile?.id, user?.id, today, selectedDayType]);

  // Initial load
  useEffect(() => {
    loadNutritionData();
  }, [loadNutritionData]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadNutritionData();
  }, [loadNutritionData]);

  // Get meals for selected day type
  const mealsForDayType = useMemo(() => {
    if (!nutritionPlan || !selectedDayType) return [];
    return getMealsForDayType(nutritionPlan, selectedDayType);
  }, [nutritionPlan, selectedDayType]);

  // Get logged meal IDs for today
  const loggedMealIds = useMemo(() => {
    return (dailyLog?.logged_meals || [])
      .filter((m) => !m.is_extra_meal && m.meal_id)
      .map((m) => m.meal_id!);
  }, [dailyLog]);

  // Map of meal_id to meal_log_id (for unlogging planned meals)
  const mealIdToLogId = useMemo(() => {
    const map: Record<string, string> = {};
    (dailyLog?.logged_meals || [])
      .filter((m) => !m.is_extra_meal && m.meal_id)
      .forEach((m) => {
        map[m.meal_id!] = m.id;
      });
    return map;
  }, [dailyLog]);

  // Get extra meals for today
  const extraMeals = useMemo(() => {
    return (dailyLog?.logged_meals || []).filter((m) => m.is_extra_meal);
  }, [dailyLog]);

  // Get missed meals
  const missedMeals = useMemo((): MissedMeal[] => {
    if (!mealsForDayType.length || !selectedDayType) return [];
    return getMissedMeals(mealsForDayType, loggedMealIds, selectedDayType);
  }, [mealsForDayType, loggedMealIds, selectedDayType]);

  // Calculate daily targets based on day type
  const dailyTargets = useMemo(() => {
    if (!nutritionPlan || !selectedDayType) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    return getDayTypeTargets(nutritionPlan, selectedDayType);
  }, [nutritionPlan, selectedDayType]);

  // Calculate consumed macros
  const consumedMacros = useMemo(() => {
    return {
      calories: dailyLog?.total_calories || 0,
      protein: dailyLog?.total_protein || 0,
      carbs: dailyLog?.total_carbs || 0,
      fat: dailyLog?.total_fat || 0,
    };
  }, [dailyLog]);

  // Meals completed count (includes both planned and extra meals)
  const mealsCompleted = loggedMealIds.length + extraMeals.length;
  const totalMeals = mealsForDayType.length;

  // Log a planned meal
  const handleLogMeal = useCallback(
    async (mealId: string) => {
      if (!user?.id) return;

      setLoggingMealId(mealId);

      const { error } = await logPlannedMeal(user.id, mealId, today);

      if (error) {
        Alert.alert('Error', error);
      } else {
        // Refresh data
        await loadNutritionData();
      }

      setLoggingMealId(null);
    },
    [user?.id, today, loadNutritionData]
  );

  // Log an extra meal
  const handleLogExtraMeal = useCallback(
    async (mealData: ExtraMealFormData) => {
      if (!user?.id || !profile?.id || !nutritionPlan?.id) return;

      // Pass user.id for meal_logs (references auth.users)
      // Pass profile.id for custom food items (references profiles)
      const { error } = await logExtraMeal(user.id, profile.id, nutritionPlan.id, mealData, today);

      if (error) {
        Alert.alert('Error', error);
      } else {
        await loadNutritionData();
      }
    },
    [user?.id, profile?.id, nutritionPlan?.id, today, loadNutritionData]
  );

  // Unlog a planned meal - show confirmation modal
  const handleUnlogMeal = useCallback((mealId: string) => {
    setMealToUnlog(mealId);
    setShowUnlogModal(true);
  }, []);

  // Confirm unlog planned meal
  const confirmUnlogMeal = useCallback(async () => {
    if (!mealToUnlog) return;

    const logId = mealIdToLogId[mealToUnlog];
    if (!logId) {
      setShowUnlogModal(false);
      setMealToUnlog(null);
      return;
    }

    setIsUnlogging(true);
    const { error } = await deleteLoggedMeal(logId);
    setIsUnlogging(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      await loadNutritionData();
    }

    setShowUnlogModal(false);
    setMealToUnlog(null);
  }, [mealToUnlog, mealIdToLogId, loadNutritionData]);

  // Delete an extra meal - show confirmation modal
  const handleDeleteExtraMeal = useCallback((mealLogId: string) => {
    setMealToDelete(mealLogId);
    setShowDeleteModal(true);
  }, []);

  // Confirm delete
  const confirmDeleteMeal = useCallback(async () => {
    if (!mealToDelete) return;

    setIsDeleting(true);
    const { error } = await deleteLoggedMeal(mealToDelete);
    setIsDeleting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      await loadNutritionData();
    }

    setShowDeleteModal(false);
    setMealToDelete(null);
  }, [mealToDelete, loadNutritionData]);

  // Supabase not configured
  if (!isSupabaseConfigured) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <AlertCircle color="#F59E0B" size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Supabase Not Configured
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Please add your Supabase credentials to the .env file
        </Text>
      </View>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <Utensils color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Sign in to view your nutrition plan
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Your personalized meal plans will appear here
        </Text>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading nutrition plan...</Text>
      </View>
    );
  }

  // No nutrition plan assigned
  if (!nutritionPlan) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
        contentContainerStyle={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        }
      >
        <Utensils color={isDark ? '#4B5563' : '#9CA3AF'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          No Nutrition Plan
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Your coach hasn't assigned a nutrition plan yet. Pull down to refresh!
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      }
    >
      {/* Today's Meals Header with View Plan link */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Utensils size={20} color="#6366F1" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Today's Meals
          </Text>
        </View>

        {nutritionPlan && (
          <Pressable
            onPress={() => router.push(`/nutrition-plan/${nutritionPlan.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: '#6366F1',
                fontWeight: '500',
              }}
            >
              View Plan
            </Text>
            <ExternalLink size={14} color="#6366F1" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
      </View>

      {/* Missed Meals Alert */}
      <MissedMealsAlert missedMeals={missedMeals} />

      {/* Day Type Selector */}
      <DayTypeSelector selectedDayType={selectedDayType} onSelectDayType={setSelectedDayType} />

      {/* Meals Completed Counter */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>Meals Completed</Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          {mealsCompleted} / {totalMeals}
        </Text>
      </View>

      {/* Daily Nutrition Card */}
      <View
        style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
            marginBottom: 20,
          }}
        >
          Daily Nutrition ({selectedDayType?.toLowerCase() || 'loading'})
        </Text>

        {/* Macro Circles - 2x2 Grid */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <MacroCircle
            label="Calories"
            current={consumedMacros.calories}
            target={dailyTargets.calories}
            color="#F87171"
            size={75}
          />
          <MacroCircle
            label="Protein"
            current={Math.round(consumedMacros.protein)}
            target={Math.round(dailyTargets.protein)}
            color="#A78BFA"
            size={75}
          />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <MacroCircle
            label="Carbs"
            current={Math.round(consumedMacros.carbs)}
            target={Math.round(dailyTargets.carbs)}
            color="#FBBF24"
            size={75}
          />
          <MacroCircle
            label="Fat"
            current={Math.round(consumedMacros.fat)}
            target={Math.round(dailyTargets.fat)}
            color="#60A5FA"
            size={75}
          />
        </View>
      </View>

      {/* Planned Meals Section */}
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: isDark ? '#F3F4F6' : '#1F2937',
          marginBottom: 12,
        }}
      >
        Planned Meals
      </Text>

      {mealsForDayType.length === 0 ? (
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text style={{ fontSize: 14, color: isDark ? '#6B7280' : '#9CA3AF', textAlign: 'center' }}>
            No meals scheduled for {selectedDayType?.toLowerCase() || 'this'} days
          </Text>
        </View>
      ) : (
        mealsForDayType.map((meal) => (
          <PlannedMealCard
            key={meal.id}
            meal={meal}
            isLogged={loggedMealIds.includes(meal.id)}
            isLogging={loggingMealId === meal.id}
            onLogMeal={handleLogMeal}
            onUnlogMeal={handleUnlogMeal}
          />
        ))
      )}

      {/* Extra Meals Section */}
      <ExtraMealsSection
        extraMeals={extraMeals}
        onAddExtraMeal={() => setShowAddExtraMealModal(true)}
        onDeleteExtraMeal={handleDeleteExtraMeal}
      />

      {/* Add Extra Meal Modal */}
      <AddExtraMealModal
        visible={showAddExtraMealModal}
        currentDayType={selectedDayType}
        onSubmit={handleLogExtraMeal}
        onClose={() => setShowAddExtraMealModal(false)}
      />

      {/* Delete Meal Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Meal"
        message="Are you sure you want to delete this meal? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
        isLoading={isDeleting}
        onConfirm={confirmDeleteMeal}
        onCancel={() => {
          setShowDeleteModal(false);
          setMealToDelete(null);
        }}
      />

      {/* Unlog Planned Meal Confirmation Modal */}
      <ConfirmationModal
        visible={showUnlogModal}
        title="Unlog Meal"
        message="Are you sure you want to unlog this meal? You can log it again later."
        confirmText="Unlog"
        cancelText="Cancel"
        confirmColor="red"
        isLoading={isUnlogging}
        onConfirm={confirmUnlogMeal}
        onCancel={() => {
          setShowUnlogModal(false);
          setMealToUnlog(null);
        }}
      />
    </ScrollView>
  );
}
