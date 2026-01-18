import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { HapticPressable } from '../../components/HapticPressable';
import { router } from 'expo-router';
import { Utensils, AlertCircle, ExternalLink, Search, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useOffline } from '../../contexts/OfflineContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getCache, setCache, CacheKeys, getLastUserId } from '../../lib/storage';
import { addToQueue } from '../../lib/syncQueue';
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
import EmptyState from '../../components/EmptyState';
import {
  getUserNutritionPlan,
  getLoggedMealsForDate,
  logPlannedMeal,
  logExtraMeal,
  deleteLoggedMeal,
  getMealsForDayType,
  getMissedMeals,
  getDayTypeTargets,
  getPublicNutritionPlans,
  assignNutritionPlanToSelf,
  PublicNutritionPlan,
} from '../../services/nutritionService';
import BrowseNutritionPlansModal from '../../components/nutrition/BrowseNutritionPlansModal';
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
  LoggedMealWithNutrition,
} from '../../types/nutrition';

export default function NutritionScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const { refreshReminders } = useNotifications();
  const { isOnline, refreshPendingCount, isSyncing, lastSyncTime } = useOffline();

  // State
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithMeals | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyNutritionLog | null>(null);
  const [selectedDayType, setSelectedDayType] = useState<SimpleDayType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const [showAddExtraMealModal, setShowAddExtraMealModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnlogModal, setShowUnlogModal] = useState(false);
  const [mealToUnlog, setMealToUnlog] = useState<string | null>(null);
  const [isUnlogging, setIsUnlogging] = useState(false);

  // Browse plans state
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [showAssignConfirmModal, setShowAssignConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PublicNutritionPlan | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Get today's date in YYYY-MM-DD format (local timezone)
  const today = useMemo(() => getLocalDateString(), []);

  // Load nutrition data
  const loadNutritionData = useCallback(async () => {
    if (!profile?.id || !user?.id) return;

    const cacheKey = CacheKeys.nutritionPlan(user.id);
    const dailyCacheKey = CacheKeys.todaysMeals(user.id);

    // If offline, try to load from cache
    if (!isOnline) {
      try {
        const cachedPlan = await getCache<{
          nutritionPlan: NutritionPlanWithMeals | null;
          cachedAt: string;
        }>(cacheKey);
        const cachedDaily = await getCache<{
          dailyLog: DailyNutritionLog | null;
          selectedDayType: SimpleDayType;
          date: string;
        }>(dailyCacheKey);

        if (cachedPlan) {
          setNutritionPlan(cachedPlan.nutritionPlan);
          setIsFromCache(true);
        }
        if (cachedDaily && cachedDaily.date === today) {
          setDailyLog(cachedDaily.dailyLog);
          if (selectedDayType === null) {
            setSelectedDayType(cachedDaily.selectedDayType);
          }
        }
        if (!cachedPlan) {
          // Default to Training if no cache
          if (selectedDayType === null) {
            setSelectedDayType('Training');
          }
        }
      } catch (error) {
        console.error('Error loading cached nutrition data:', error);
        if (selectedDayType === null) {
          setSelectedDayType('Training');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    // Online - fetch from API
    try {
      // Get nutrition plan (uses profile.id for assigned_plans)
      const { nutritionPlan: plan } = await getUserNutritionPlan(profile.id);
      setNutritionPlan(plan);

      // Get today's logged meals (uses user.id for meal_logs)
      const { dailyLog: log } = await getLoggedMealsForDate(user.id, today, plan);
      setDailyLog(log);

      // Determine if today is a training or rest day (only on initial load)
      let dayType: SimpleDayType = 'Training';
      if (selectedDayType === null) {
        const { assignment } = await getAssignedProgram(profile.id);
        if (assignment?.program_template_id) {
          const { workouts } = await getProgramWorkouts(assignment.program_template_id);
          const todaysWorkout = getTodaysWorkout(workouts);
          dayType = todaysWorkout ? 'Training' : 'Rest';
          setSelectedDayType(dayType);
        } else {
          // No program assigned, default to Training
          setSelectedDayType('Training');
        }
      } else {
        dayType = selectedDayType;
      }

      // Cache the data for offline use
      await setCache(cacheKey, {
        nutritionPlan: plan,
        cachedAt: new Date().toISOString(),
      });
      await setCache(dailyCacheKey, {
        dailyLog: log,
        selectedDayType: dayType,
        date: today,
      });
      setIsFromCache(false);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
      // Try to fall back to cache
      const cachedPlan = await getCache<{
        nutritionPlan: NutritionPlanWithMeals | null;
      }>(cacheKey);
      if (cachedPlan) {
        setNutritionPlan(cachedPlan.nutritionPlan);
        setIsFromCache(true);
      }
      // Default to Training if there's an error
      if (selectedDayType === null) {
        setSelectedDayType('Training');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profile?.id, user?.id, today, selectedDayType, isOnline]);

  // Initial load
  useEffect(() => {
    loadNutritionData();
  }, [loadNutritionData]);

  // Handle offline cold start - load cached data when offline
  useEffect(() => {
    if (!isOnline && isLoading) {
      const loadCachedDataOffline = async () => {
        try {
          // Use current user ID if available, otherwise get from cache
          const userId = user?.id || await getLastUserId();
          if (userId) {
            const cachedPlan = await getCache<{
              nutritionPlan: NutritionPlanWithMeals | null;
            }>(CacheKeys.nutritionPlan(userId));
            const cachedDaily = await getCache<{
              dailyLog: DailyNutritionLog | null;
              selectedDayType: SimpleDayType;
            }>(CacheKeys.todaysMeals(userId));

            if (cachedPlan?.nutritionPlan) {
              setNutritionPlan(cachedPlan.nutritionPlan);
              setIsFromCache(true);
            }
            if (cachedDaily) {
              setDailyLog(cachedDaily.dailyLog);
              setSelectedDayType(cachedDaily.selectedDayType || 'Training');
            } else {
              setSelectedDayType('Training');
            }
          } else {
            setSelectedDayType('Training');
          }
        } catch (err) {
          console.error('Error loading offline nutrition cache:', err);
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      };

      // Small delay to allow normal flow first, but shorter if we have user
      const delay = user?.id ? 100 : 500;
      const timer = setTimeout(loadCachedDataOffline, delay);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isLoading, user?.id]);

  // Refetch data after sync completes to pick up synced offline changes
  const prevSyncTimeRef = useRef<Date | null>(null);
  useEffect(() => {
    // Only refetch if:
    // 1. We have a new sync time (sync just completed)
    // 2. We're online
    // 3. Not currently syncing
    // 4. Not already loading
    if (
      lastSyncTime &&
      isOnline &&
      !isSyncing &&
      !isLoading &&
      prevSyncTimeRef.current !== lastSyncTime
    ) {
      prevSyncTimeRef.current = lastSyncTime;
      console.log('[Nutrition] Sync completed, refetching data');
      loadNutritionData();
    }
  }, [lastSyncTime, isOnline, isSyncing, isLoading, loadNutritionData]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadNutritionData();
  }, [loadNutritionData]);

  const handlePlanSelect = (plan: PublicNutritionPlan) => {
    setSelectedPlan(plan);
    setShowBrowseModal(false);
    setShowAssignConfirmModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedPlan || !profile?.id) return;

    setIsAssigning(true);
    const { success, error: assignError } = await assignNutritionPlanToSelf(
      profile.id,
      selectedPlan.id
    );

    if (success) {
      setShowAssignConfirmModal(false);
      setSelectedPlan(null);
      loadNutritionData();
    } else {
      console.error('Error assigning nutrition plan:', assignError);
    }
    setIsAssigning(false);
  };

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

      // If offline, queue the operation and update local state
      if (!isOnline) {
        addToQueue({
          type: 'meal_log',
          action: 'create',
          userId: user.id,
          payload: {
            user_id: user.id,
            meal_id: mealId,
            log_date: today,
            is_extra_meal: false,
          },
        });
        refreshPendingCount();

        // Update local state immediately - find the meal data and add to daily log
        const meal = mealsForDayType.find(m => m.id === mealId);
        if (meal && dailyLog) {
          const totalCalories = meal.food_items?.reduce((sum, fi) => sum + (fi.calculated_calories || 0), 0) || 0;
          const totalProtein = meal.food_items?.reduce((sum, fi) => sum + (fi.calculated_protein || 0), 0) || 0;
          const totalCarbs = meal.food_items?.reduce((sum, fi) => sum + (fi.calculated_carbs || 0), 0) || 0;
          const totalFat = meal.food_items?.reduce((sum, fi) => sum + (fi.calculated_fat || 0), 0) || 0;

          const newLogEntry: LoggedMealWithNutrition = {
            id: `offline-${Date.now()}`,
            user_id: user.id,
            meal_id: mealId,
            nutrition_plan_id: nutritionPlan?.id || '',
            name: meal.name,
            date: today,
            time: meal.time_suggestion || '',
            day_type: selectedDayType || 'Training',
            is_extra_meal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_carbs: totalCarbs,
            total_fat: totalFat,
          };
          setDailyLog({
            ...dailyLog,
            logged_meals: [...(dailyLog.logged_meals || []), newLogEntry],
            total_calories: (dailyLog.total_calories || 0) + totalCalories,
            total_protein: (dailyLog.total_protein || 0) + totalProtein,
            total_carbs: (dailyLog.total_carbs || 0) + totalCarbs,
            total_fat: (dailyLog.total_fat || 0) + totalFat,
          });
        }

        setLoggingMealId(null);
        return;
      }

      // Online - make API call
      const { error } = await logPlannedMeal(user.id, mealId, today);

      if (error) {
        Alert.alert('Error', error);
      } else {
        // Refresh data and reminders
        await loadNutritionData();
        refreshReminders();
      }

      setLoggingMealId(null);
    },
    [user?.id, today, loadNutritionData, refreshReminders, isOnline, refreshPendingCount, mealsForDayType, dailyLog]
  );

  // Log an extra meal
  const handleLogExtraMeal = useCallback(
    async (mealData: ExtraMealFormData) => {
      if (!user?.id || !profile?.id || !nutritionPlan?.id) return;

      // Extra meals are more complex (creating food items, etc.) - require online for now
      if (!isOnline) {
        Alert.alert('Offline', 'Extra meals can only be logged when online. Please connect to the internet.');
        return;
      }

      // Pass user.id for meal_logs (references auth.users)
      // Pass profile.id for custom food items (references profiles)
      const { error } = await logExtraMeal(user.id, profile.id, nutritionPlan.id, mealData, today);

      if (error) {
        Alert.alert('Error', error);
      } else {
        await loadNutritionData();
        refreshReminders();
      }
    },
    [user?.id, profile?.id, nutritionPlan?.id, today, loadNutritionData, refreshReminders, isOnline]
  );

  // Unlog a planned meal - show confirmation modal
  const handleUnlogMeal = useCallback((mealId: string) => {
    setMealToUnlog(mealId);
    setShowUnlogModal(true);
  }, []);

  // Confirm unlog planned meal
  const confirmUnlogMeal = useCallback(async () => {
    if (!mealToUnlog || !user?.id) return;

    const logId = mealIdToLogId[mealToUnlog];
    if (!logId) {
      setShowUnlogModal(false);
      setMealToUnlog(null);
      return;
    }

    setIsUnlogging(true);

    // If offline, queue the deletion and update local state
    if (!isOnline) {
      // Only queue for deletion if it's not an offline-created entry
      if (!logId.startsWith('offline-')) {
        addToQueue({
          type: 'meal_log',
          action: 'delete',
          userId: user.id,
          payload: { id: logId },
        });
        refreshPendingCount();
      }

      // Update local state immediately
      if (dailyLog) {
        const mealToRemove = dailyLog.logged_meals?.find(m => m.id === logId);
        setDailyLog({
          ...dailyLog,
          logged_meals: (dailyLog.logged_meals || []).filter(m => m.id !== logId),
          total_calories: (dailyLog.total_calories || 0) - (mealToRemove?.total_calories || 0),
          total_protein: (dailyLog.total_protein || 0) - (mealToRemove?.total_protein || 0),
          total_carbs: (dailyLog.total_carbs || 0) - (mealToRemove?.total_carbs || 0),
          total_fat: (dailyLog.total_fat || 0) - (mealToRemove?.total_fat || 0),
        });
      }

      setIsUnlogging(false);
      setShowUnlogModal(false);
      setMealToUnlog(null);
      return;
    }

    // Online - make API call
    const { error } = await deleteLoggedMeal(logId);
    setIsUnlogging(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      await loadNutritionData();
      refreshReminders();
    }

    setShowUnlogModal(false);
    setMealToUnlog(null);
  }, [mealToUnlog, mealIdToLogId, loadNutritionData, refreshReminders, isOnline, user?.id, refreshPendingCount, dailyLog]);

  // Delete an extra meal - show confirmation modal
  const handleDeleteExtraMeal = useCallback((mealLogId: string) => {
    setMealToDelete(mealLogId);
    setShowDeleteModal(true);
  }, []);

  // Confirm delete
  const confirmDeleteMeal = useCallback(async () => {
    if (!mealToDelete || !user?.id) return;

    setIsDeleting(true);

    // If offline, queue the deletion and update local state
    if (!isOnline) {
      // Only queue for deletion if it's not an offline-created entry
      if (!mealToDelete.startsWith('offline-')) {
        addToQueue({
          type: 'meal_log',
          action: 'delete',
          userId: user.id,
          payload: { id: mealToDelete },
        });
        refreshPendingCount();
      }

      // Update local state immediately
      if (dailyLog) {
        const mealToRemove = dailyLog.logged_meals?.find(m => m.id === mealToDelete);
        setDailyLog({
          ...dailyLog,
          logged_meals: (dailyLog.logged_meals || []).filter(m => m.id !== mealToDelete),
          total_calories: (dailyLog.total_calories || 0) - (mealToRemove?.total_calories || 0),
          total_protein: (dailyLog.total_protein || 0) - (mealToRemove?.total_protein || 0),
          total_carbs: (dailyLog.total_carbs || 0) - (mealToRemove?.total_carbs || 0),
          total_fat: (dailyLog.total_fat || 0) - (mealToRemove?.total_fat || 0),
        });
      }

      setIsDeleting(false);
      setShowDeleteModal(false);
      setMealToDelete(null);
      return;
    }

    // Online - make API call
    const { error } = await deleteLoggedMeal(mealToDelete);
    setIsDeleting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      await loadNutritionData();
      refreshReminders();
    }

    setShowDeleteModal(false);
    setMealToDelete(null);
  }, [mealToDelete, loadNutritionData, refreshReminders, isOnline, user?.id, refreshPendingCount, dailyLog]);

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
      <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? '#9CA3AF' : '#6B7280'}
            />
          }
        >
          <EmptyState
            icon={Utensils}
            iconColor="#22C55E"
            title="No Nutrition Plan"
            subtitle="Your coach hasn't assigned a nutrition plan yet, or browse public plans."
            buttonText="Browse Public Plans"
            buttonIcon={Search}
            onButtonPress={() => setShowBrowseModal(true)}
          />
        </ScrollView>

        <BrowseNutritionPlansModal
          visible={showBrowseModal}
          onClose={() => setShowBrowseModal(false)}
          onSelect={handlePlanSelect}
        />

        <ConfirmationModal
          visible={showAssignConfirmModal}
          title="Assign this plan?"
          message={`You're about to assign "${selectedPlan?.name}" to yourself. You can always switch to a different plan later.`}
          confirmText="Assign Plan"
          confirmColor="green"
          onConfirm={handleConfirmAssign}
          onCancel={() => {
            setShowAssignConfirmModal(false);
            setSelectedPlan(null);
          }}
          isLoading={isAssigning}
        />
      </View>
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
      {/* Offline Banner */}
      {!isOnline && isFromCache && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#78350F' : '#FEF3C7',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <WifiOff size={16} color={isDark ? '#FDBA74' : '#92400E'} />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 13,
              color: isDark ? '#FDBA74' : '#92400E',
              flex: 1,
            }}
          >
            {t('common.youreOffline')}
          </Text>
        </View>
      )}

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <HapticPressable
              onPress={() => setShowBrowseModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Search size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text
                style={{
                  marginLeft: 4,
                  fontSize: 14,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  fontWeight: '500',
                }}
              >
                Switch
              </Text>
            </HapticPressable>
            <HapticPressable
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
            </HapticPressable>
          </View>
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

      {/* Browse Plans Modal */}
      <BrowseNutritionPlansModal
        visible={showBrowseModal}
        onClose={() => setShowBrowseModal(false)}
        onSelect={handlePlanSelect}
      />

      {/* Confirm Plan Switch Modal */}
      <ConfirmationModal
        visible={showAssignConfirmModal}
        title="Switch to this plan?"
        message={`You're about to switch to "${selectedPlan?.name}". This will replace your current nutrition plan.`}
        confirmText="Switch Plan"
        confirmColor="green"
        onConfirm={handleConfirmAssign}
        onCancel={() => {
          setShowAssignConfirmModal(false);
          setSelectedPlan(null);
        }}
        isLoading={isAssigning}
      />
    </ScrollView>
  );
}
