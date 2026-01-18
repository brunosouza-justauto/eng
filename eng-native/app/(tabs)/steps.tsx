import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { HapticPressable } from '../../components/HapticPressable';
import {
  Footprints,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  Minus,
  X,
  Flame,
  Award,
  WifiOff,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useOffline } from '../../contexts/OfflineContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getCache, setCache, CacheKeys, getLastUserId } from '../../lib/storage';
import { addToQueue } from '../../lib/syncQueue';
import {
  getActiveStepGoal,
  getStepEntryForDate,
  getStepHistory,
  calculateWeeklyStats,
  getWeeklyChartData,
  addStepsManually,
  removeStepsManually,
  setPersonalStepGoal,
  getProgressPercentage,
  getMotivationalMessage,
} from '../../services/stepsService';

const DEFAULT_STEP_INCREMENT = 1000;
import { StepGoal, StepEntry, DayStepData, WeeklyStepStats } from '../../types/steps';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import EmptyState from '../../components/EmptyState';
import { getLocalDateString } from '../../utils/date';

// Progress Circle Component using SVG for smooth progress
function ProgressCircle({
  progress,
  currentSteps,
  goalSteps,
  isDark,
}: {
  progress: number;
  currentSteps: number;
  goalSteps: number;
  isDark: boolean;
}) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  // Determine color based on progress
  const getProgressColor = () => {
    if (progress < 25) return '#EF4444'; // Red
    if (progress < 75) return '#F59E0B'; // Yellow
    return '#22C55E'; // Green
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? '#374151' : '#E5E7EB'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getProgressColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
          />
        </Svg>
        {/* Center content */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Footprints color="#3B82F6" size={32} />
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginTop: 4,
            }}
          >
            {currentSteps.toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
            }}
          >
            steps
          </Text>
        </View>
      </View>
    </View>
  );
}

// Weekly Day Bar Component
function WeeklyDayBar({
  data,
  maxSteps,
  isDark,
}: {
  data: DayStepData;
  maxSteps: number;
  isDark: boolean;
}) {
  const heightPercentage = maxSteps > 0 ? (data.steps / maxSteps) * 100 : 0;

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View
        style={{
          height: 80,
          width: 28,
          backgroundColor: isDark ? '#374151' : '#E5E7EB',
          borderRadius: 14,
          overflow: 'hidden',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            height: `${Math.max(5, heightPercentage)}%`,
            backgroundColor: data.isToday
              ? '#6366F1'
              : data.goalMet
              ? '#22C55E'
              : isDark
              ? '#6B7280'
              : '#9CA3AF',
            borderRadius: 14,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: data.isToday ? '600' : '400',
          color: data.isToday ? '#6366F1' : isDark ? '#9CA3AF' : '#6B7280',
          marginTop: 6,
        }}
      >
        {data.dayName}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: isDark ? '#6B7280' : '#9CA3AF',
        }}
      >
        {data.steps > 0 ? (data.steps / 1000).toFixed(1) + 'k' : '-'}
      </Text>
    </View>
  );
}

export default function StepsScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const { refreshReminders } = useNotifications();
  const { isOnline, refreshPendingCount } = useOffline();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [stepGoal, setStepGoal] = useState<StepGoal | null>(null);
  const [todayEntry, setTodayEntry] = useState<StepEntry | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStepStats | null>(null);
  const [weeklyChartData, setWeeklyChartData] = useState<DayStepData[]>([]);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSteps, setManualSteps] = useState('');
  const [isAddingSteps, setIsAddingSteps] = useState(false);

  // Set goal state
  const [showSetGoalModal, setShowSetGoalModal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState('10000');
  const [isSettingGoal, setIsSettingGoal] = useState(false);

  // Error modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Today's date (local timezone)
  const today = useMemo(() => getLocalDateString(), []);

  // Load data
  const loadStepsData = useCallback(async () => {
    if (!user?.id || !profile?.id) return;

    const cacheKey = CacheKeys.todaysSteps(user.id);
    const goalCacheKey = CacheKeys.stepGoal(user.id);

    // If offline, try to load from cache
    if (!isOnline) {
      try {
        const cached = await getCache<{
          goal: StepGoal | null;
          entry: StepEntry | null;
          weeklyStats: WeeklyStepStats | null;
          weeklyChartData: DayStepData[];
          date: string;
        }>(cacheKey);

        if (cached) {
          setStepGoal(cached.goal);
          setTodayEntry(cached.date === today ? cached.entry : null);
          setWeeklyStats(cached.weeklyStats);
          setWeeklyChartData(cached.weeklyChartData);
          setIsFromCache(true);
        }
      } catch (err) {
        console.error('Error loading cached steps data:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    // Online - fetch from API
    try {
      // Fetch step goal (uses profile.id)
      const { goal } = await getActiveStepGoal(profile.id);
      setStepGoal(goal);

      // Fetch today's entry (uses user.id)
      const { entry } = await getStepEntryForDate(user.id, today);
      setTodayEntry(entry);

      // Fetch weekly history
      const { entries } = await getStepHistory(user.id, 7);

      let stats: WeeklyStepStats | null = null;
      let chartData: DayStepData[] = [];
      if (goal) {
        // Calculate stats
        stats = calculateWeeklyStats(entries, goal.daily_steps);
        setWeeklyStats(stats);

        // Get chart data
        chartData = getWeeklyChartData(entries, goal.daily_steps);
        setWeeklyChartData(chartData);
      }

      // Cache the data for offline use
      await setCache(cacheKey, {
        goal,
        entry,
        weeklyStats: stats,
        weeklyChartData: chartData,
        date: today,
      });
      setIsFromCache(false);
    } catch (err) {
      console.error('Error loading steps data:', err);
      // Try to fall back to cache
      const cached = await getCache<{
        goal: StepGoal | null;
        entry: StepEntry | null;
        weeklyStats: WeeklyStepStats | null;
        weeklyChartData: DayStepData[];
      }>(cacheKey);
      if (cached) {
        setStepGoal(cached.goal);
        setTodayEntry(cached.entry);
        setWeeklyStats(cached.weeklyStats);
        setWeeklyChartData(cached.weeklyChartData);
        setIsFromCache(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, profile?.id, today, isOnline]);

  // Initial load
  useEffect(() => {
    loadStepsData();
  }, [loadStepsData]);

  // Handle offline cold start - load cached data when offline
  useEffect(() => {
    if (!isOnline && isLoading) {
      const loadCachedDataOffline = async () => {
        try {
          // Use current user ID if available, otherwise get from cache
          const userId = user?.id || await getLastUserId();
          if (userId) {
            const cachedSteps = await getCache<{
              goal: StepGoal | null;
              entry: StepEntry | null;
              weeklyStats: WeeklyStepStats | null;
              weeklyChartData: DayStepData[];
            }>(CacheKeys.todaysSteps(userId));

            if (cachedSteps) {
              setStepGoal(cachedSteps.goal);
              setTodayEntry(cachedSteps.entry);
              setWeeklyStats(cachedSteps.weeklyStats);
              setWeeklyChartData(cachedSteps.weeklyChartData);
              setIsFromCache(true);
            }
          }
        } catch (err) {
          console.error('Error loading offline steps cache:', err);
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

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadStepsData();
  }, [loadStepsData]);

  // Current steps and progress
  const currentSteps = todayEntry?.step_count || 0;
  const dailyGoal = stepGoal?.daily_steps || 10000;
  const progress = getProgressPercentage(currentSteps, dailyGoal);
  const motivationalMessage = getMotivationalMessage(progress);

  // Max steps in weekly data for bar scaling
  const maxWeeklySteps = useMemo(() => {
    const maxFromData = Math.max(...weeklyChartData.map((d) => d.steps), 0);
    return Math.max(maxFromData, dailyGoal);
  }, [weeklyChartData, dailyGoal]);

  // Handle adding steps manually
  const handleAddSteps = async () => {
    if (!user?.id) return;

    const steps = parseInt(manualSteps, 10);
    if (isNaN(steps) || steps <= 0) {
      setErrorMessage('Please enter a valid number of steps');
      setShowErrorModal(true);
      return;
    }

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      const newStepCount = (todayEntry?.step_count || 0) + steps;
      const updatedEntry: StepEntry = {
        id: todayEntry?.id || `offline-${Date.now()}`,
        user_id: user.id,
        date: today,
        step_count: newStepCount,
        created_at: todayEntry?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addToQueue({
        type: 'step_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          step_count: newStepCount,
          },
      });
      refreshPendingCount();

      // Update local state
      setTodayEntry(updatedEntry);
      setManualSteps('');
      setShowManualEntry(false);
      return;
    }

    // Online - make API call
    setIsAddingSteps(true);
    const { entry, error } = await addStepsManually(user.id, today, steps);
    setIsAddingSteps(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (entry) {
      setTodayEntry(entry);
      setManualSteps('');
      setShowManualEntry(false);
      refreshReminders();
      // Refresh to update stats
      loadStepsData();
    }
  };

  // Handle quick add steps
  const handleQuickAddSteps = async (steps: number = DEFAULT_STEP_INCREMENT) => {
    if (!user?.id || isAddingSteps) return;

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      const newStepCount = (todayEntry?.step_count || 0) + steps;
      const updatedEntry: StepEntry = {
        id: todayEntry?.id || `offline-${Date.now()}`,
        user_id: user.id,
        date: today,
        step_count: newStepCount,
        created_at: todayEntry?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addToQueue({
        type: 'step_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          step_count: newStepCount,
          },
      });
      refreshPendingCount();

      // Update local state
      setTodayEntry(updatedEntry);
      return;
    }

    // Online - make API call
    setIsAddingSteps(true);
    const { entry, error } = await addStepsManually(user.id, today, steps);
    setIsAddingSteps(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (entry) {
      setTodayEntry(entry);
      refreshReminders();
      loadStepsData();
    }
  };

  // Handle quick remove steps
  const handleQuickRemoveSteps = async (steps: number = DEFAULT_STEP_INCREMENT) => {
    if (!user?.id || isAddingSteps || !todayEntry?.step_count) return;

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      const newStepCount = Math.max(0, (todayEntry?.step_count || 0) - steps);
      const updatedEntry: StepEntry = {
        ...todayEntry!,
        step_count: newStepCount,
        updated_at: new Date().toISOString(),
      };

      addToQueue({
        type: 'step_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          step_count: newStepCount,
          },
      });
      refreshPendingCount();

      // Update local state
      setTodayEntry(updatedEntry);
      return;
    }

    // Online - make API call
    setIsAddingSteps(true);
    const { entry, error } = await removeStepsManually(user.id, today, steps);
    setIsAddingSteps(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (entry) {
      setTodayEntry(entry);
      refreshReminders();
      loadStepsData();
    }
  };

  // Handle setting personal goal
  const handleSetGoal = async () => {
    if (!profile?.id) return;

    const goalValue = parseInt(newGoalValue, 10);
    if (isNaN(goalValue) || goalValue <= 0) {
      setErrorMessage('Please enter a valid step goal');
      setShowErrorModal(true);
      return;
    }

    setIsSettingGoal(true);
    const { goal, error } = await setPersonalStepGoal(profile.id, goalValue);
    setIsSettingGoal(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (goal) {
      setStepGoal(goal);
      setShowSetGoalModal(false);
      loadStepsData();
    }
  };

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
        <Footprints color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Sign in to track your steps
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Connect your fitness device to sync steps
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
        <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading steps data...</Text>
      </View>
    );
  }

  // No goal set - show empty state
  if (!stepGoal) {
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
            icon={Footprints}
            iconColor="#3B82F6"
            title="No Step Goal Set"
            subtitle="Set your own goal or wait for your coach to assign one"
            buttonText="Set My Goal"
            buttonIcon={Target}
            onButtonPress={() => setShowSetGoalModal(true)}
          />
        </ScrollView>

        {/* Set Goal Modal */}
        <Modal
          visible={showSetGoalModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSetGoalModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 340,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Set Your Step Goal
              </Text>

              <TextInput
                value={newGoalValue}
                onChangeText={setNewGoalValue}
                placeholder="Daily step goal"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                keyboardType="numeric"
                style={{
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 12,
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginBottom: 20,
                }}
              >
                Recommended: 7,000-10,000 steps for general health
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <HapticPressable
                  onPress={() => setShowSetGoalModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#374151' : '#E5E7EB',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563', fontWeight: '600' }}>
                    Cancel
                  </Text>
                </HapticPressable>
                <HapticPressable
                  onPress={handleSetGoal}
                  disabled={isSettingGoal}
                  style={{
                    flex: 1,
                    backgroundColor: '#3B82F6',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: isSettingGoal ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                    {isSettingGoal ? 'Saving...' : 'Save'}
                  </Text>
                </HapticPressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        keyboardShouldPersistTaps="handled"
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
              You're offline. Showing cached data.
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Footprints size={20} color="#3B82F6" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Daily Steps
          </Text>
        </View>

        {/* Today's Steps Card */}
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <>
            <>
              {/* Progress Circle */}
              <ProgressCircle
                progress={progress}
                currentSteps={currentSteps}
                goalSteps={dailyGoal}
                isDark={isDark}
              />

              {/* Amount Display */}
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 4,
                }}
              >
                {currentSteps.toLocaleString()} / {dailyGoal.toLocaleString()}
              </Text>

              {/* Goal Info */}
              <HapticPressable
                onPress={() => {
                  setNewGoalValue(String(dailyGoal));
                  setShowSetGoalModal(true);
                }}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: isDark ? '#374151' : '#E5E7EB',
                }}
              >
                <Target size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={{ marginLeft: 4, fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                  Daily Goal: {dailyGoal.toLocaleString()} steps
                </Text>
                <Text style={{ marginLeft: 4, fontSize: 11, color: '#6366F1' }}>Edit</Text>
              </HapticPressable>

              {/* Streak & Motivation */}
              {weeklyStats && weeklyStats.streak > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? '#374151' : '#FEF3C7',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    alignSelf: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Flame size={16} color="#F59E0B" />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontWeight: '600',
                      color: isDark ? '#FCD34D' : '#D97706',
                    }}
                  >
                    {weeklyStats.streak} day streak!
                  </Text>
                </View>
              )}

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  textAlign: 'center',
                  color: isDark ? '#D1D5DB' : '#4B5563',
                }}
              >
                {motivationalMessage}
              </Text>

              {/* Divider */}
              <View
                style={{
                  marginTop: 20,
                  marginBottom: 16,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#374151' : '#E5E7EB',
                }}
              />

              {/* Quick Add/Remove Buttons */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <HapticPressable
                  onPress={() => handleQuickRemoveSteps()}
                  disabled={isAddingSteps || !todayEntry?.step_count}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isAddingSteps || !todayEntry?.step_count ? 0.5 : 1,
                  }}
                >
                  <Minus size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </HapticPressable>

                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    {DEFAULT_STEP_INCREMENT.toLocaleString()} steps
                  </Text>
                </View>

                <HapticPressable
                  onPress={() => handleQuickAddSteps()}
                  disabled={isAddingSteps}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#22C55E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isAddingSteps ? 0.7 : 1,
                  }}
                >
                  <Plus size={24} color="#FFFFFF" />
                </HapticPressable>
              </View>

              {/* Manual Entry Section */}
              <View style={{ marginTop: 4 }}>
                {showManualEntry ? (
                  <View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={manualSteps}
                        onChangeText={setManualSteps}
                        placeholder="Enter steps"
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        keyboardType="numeric"
                        style={{
                          flex: 1,
                          backgroundColor: isDark ? '#374151' : '#F3F4F6',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 14,
                          color: isDark ? '#F3F4F6' : '#1F2937',
                        }}
                      />
                      <HapticPressable
                        onPress={handleAddSteps}
                        disabled={isAddingSteps}
                        style={{
                          backgroundColor: '#22C55E',
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isAddingSteps ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                          {isAddingSteps ? '...' : 'Add'}
                        </Text>
                      </HapticPressable>
                      <HapticPressable
                        onPress={() => setShowManualEntry(false)}
                        style={{
                          backgroundColor: isDark ? '#374151' : '#E5E7EB',
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </HapticPressable>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDark ? '#6B7280' : '#9CA3AF',
                        marginTop: 8,
                      }}
                    >
                      Enter steps not tracked automatically
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <HapticPressable
                      onPress={() => setShowManualEntry(true)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#6366F1',
                        paddingVertical: 12,
                        borderRadius: 8,
                      }}
                    >
                      <Plus size={18} color="#FFFFFF" />
                      <Text
                        style={{ marginLeft: 6, color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}
                      >
                        Add Steps
                      </Text>
                    </HapticPressable>
                    <HapticPressable
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                        paddingVertical: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: isDark ? '#4B5563' : '#D1D5DB',
                      }}
                    >
                      <TrendingUp size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                      <Text
                        style={{
                          marginLeft: 6,
                          color: isDark ? '#6B7280' : '#9CA3AF',
                          fontWeight: '500',
                          fontSize: 13,
                        }}
                      >
                        Connect Device
                      </Text>
                    </HapticPressable>
                  </View>
                )}
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Fitbit, Garmin, Apple Health coming soon
                </Text>
              </View>
            </>
          </>
        </View>

        {/* Weekly Stats */}
        <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
                marginBottom: 12,
              }}
            >
              This Week
            </Text>

            <View
              style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#E5E7EB',
              }}
            >
              {/* Weekly Chart */}
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                {weeklyChartData.map((day) => (
                  <WeeklyDayBar
                    key={day.date}
                    data={day}
                    maxSteps={maxWeeklySteps}
                    isDark={isDark}
                  />
                ))}
              </View>

              {/* Stats Row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#374151' : '#E5E7EB',
                }}
              >
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {weeklyStats?.averageSteps.toLocaleString() || '0'}
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                    Avg Steps
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {weeklyStats?.goalsHit || 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                    Goals Hit
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {((weeklyStats?.totalSteps || 0) / 1000).toFixed(1)}k
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                    Total Steps
                  </Text>
                </View>
              </View>
            </View>

        {/* Set Goal Modal */}
        <Modal
          visible={showSetGoalModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSetGoalModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 340,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Set Your Step Goal
              </Text>

              <TextInput
                value={newGoalValue}
                onChangeText={setNewGoalValue}
                placeholder="Daily step goal"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                keyboardType="numeric"
                style={{
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 12,
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginBottom: 20,
                }}
              >
                Recommended: 7,000-10,000 steps for general health
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <HapticPressable
                  onPress={() => setShowSetGoalModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#374151' : '#E5E7EB',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563', fontWeight: '600' }}>
                    Cancel
                  </Text>
                </HapticPressable>
                <HapticPressable
                  onPress={handleSetGoal}
                  disabled={isSettingGoal}
                  style={{
                    flex: 1,
                    backgroundColor: '#6366F1',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: isSettingGoal ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                    {isSettingGoal ? 'Saving...' : 'Save'}
                  </Text>
                </HapticPressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <ConfirmationModal
          visible={showErrorModal}
          title="Error"
          message={errorMessage}
          confirmText="OK"
          onConfirm={() => setShowErrorModal(false)}
          onCancel={() => setShowErrorModal(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
