import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput, Modal } from 'react-native';
import { HapticPressable } from '../../components/HapticPressable';
import { Droplets, Plus, Minus, Target, AlertCircle, Award, X, WifiOff } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useOffline } from '../../contexts/OfflineContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../lib/storage';
import { addToQueue } from '../../lib/syncQueue';
import {
  getWaterEntryForDate,
  getWaterGoal,
  setWaterGoal as setWaterGoalService,
  addWaterAmount,
  removeWaterAmount,
  calculateWaterProgress,
  getWaterMotivationalMessage,
  formatWaterAmount,
  getWaterHistory,
} from '../../services/waterService';
import {
  WaterTrackingEntry,
  WaterProgress,
  QUICK_ADD_AMOUNTS,
  DEFAULT_GLASS_SIZE,
  DEFAULT_WATER_GOAL,
} from '../../types/water';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import EmptyState from '../../components/EmptyState';
import { getLocalDateString } from '../../utils/date';

// Progress Circle Component using SVG for smooth progress
function WaterProgressCircle({
  progress,
  isDark,
}: {
  progress: WaterProgress;
  isDark: boolean;
}) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress.percentage / 100) * circumference;

  // Determine color based on progress
  const getProgressColor = () => {
    if (progress.percentage < 25) return '#EF4444'; // Red
    if (progress.percentage < 50) return '#F59E0B'; // Yellow
    if (progress.percentage < 75) return '#3B82F6'; // Blue
    return '#06B6D4'; // Cyan
  };

  // Format liters display
  const liters = (progress.currentAmount / 1000).toFixed(1);

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
          <Droplets color="#06B6D4" size={32} />
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginTop: 4,
            }}
          >
            {liters}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
            }}
          >
            liters
          </Text>
        </View>
      </View>
    </View>
  );
}

// Weekly Day Indicator
function WeeklyDayBar({
  date,
  amountMl,
  goalMl,
  maxAmount,
  isToday,
  isDark,
}: {
  date: string;
  amountMl: number;
  goalMl: number;
  maxAmount: number;
  isToday: boolean;
  isDark: boolean;
}) {
  const dayDate = new Date(date + 'T00:00:00');
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
  // Handle rounding: 2490ml and 2500ml both display as "2.5L", so compare displayed values
  const displayedAmount = (amountMl / 1000).toFixed(1);
  const displayedGoal = (goalMl / 1000).toFixed(1);
  const goalMet = amountMl >= goalMl || (displayedAmount === displayedGoal && amountMl > 0);
  const heightPercentage = maxAmount > 0 ? (amountMl / maxAmount) * 100 : 0;

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
            backgroundColor: isToday
              ? '#06B6D4'
              : goalMet
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
          fontWeight: isToday ? '600' : '400',
          color: isToday ? '#06B6D4' : isDark ? '#9CA3AF' : '#6B7280',
          marginTop: 6,
        }}
      >
        {dayName}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: isDark ? '#6B7280' : '#9CA3AF',
        }}
      >
        {amountMl > 0 ? (amountMl / 1000).toFixed(1) + 'L' : '-'}
      </Text>
    </View>
  );
}

export default function WaterScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const { refreshReminders } = useNotifications();
  const { isOnline, refreshPendingCount } = useOffline();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [todayEntry, setTodayEntry] = useState<WaterTrackingEntry | null>(null);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [historyEntries, setHistoryEntries] = useState<WaterTrackingEntry[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Error modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Set goal state
  const [showSetGoalModal, setShowSetGoalModal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState('2500');
  const [isSettingGoal, setIsSettingGoal] = useState(false);

  // Custom water entry state
  const [showCustomEntry, setShowCustomEntry] = useState(false);
  const [customWaterAmount, setCustomWaterAmount] = useState('');

  // Today's date (local timezone)
  const today = useMemo(() => getLocalDateString(), []);

  // Calculate progress
  const progress = useMemo(() => {
    return calculateWaterProgress(todayEntry?.amount_ml || 0, waterGoal || DEFAULT_WATER_GOAL);
  }, [todayEntry, waterGoal]);

  // Motivational message
  const motivationalMessage = getWaterMotivationalMessage(progress.percentage);

  // Calculate recommended water intake based on body weight (weight in kg * 35ml)
  const recommendedWaterIntake = useMemo(() => {
    if (profile?.weight_kg) {
      return Math.round(profile.weight_kg * 35);
    }
    return 2500; // Default fallback
  }, [profile?.weight_kg]);

  // Load data
  const loadWaterData = useCallback(async () => {
    if (!user?.id) return;

    const cacheKey = CacheKeys.waterGoal(user.id);

    // If offline, try to load from cache
    if (!isOnline) {
      try {
        const cached = await getCache<{
          goal: number | null;
          entry: WaterTrackingEntry | null;
          history: WaterTrackingEntry[];
          date: string;
        }>(cacheKey);

        if (cached) {
          setWaterGoal(cached.goal);
          setTodayEntry(cached.date === today ? cached.entry : null);
          setHistoryEntries(cached.history);
          setIsFromCache(true);
        }
      } catch (err) {
        console.error('Error loading cached water data:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    // Online - fetch from API
    try {
      // Fetch water goal (try both user.id and profile.id)
      const { goal } = await getWaterGoal(user.id, profile?.id);
      setWaterGoal(goal);

      // Fetch today's entry
      const { entry } = await getWaterEntryForDate(user.id, today);
      setTodayEntry(entry);

      // Fetch history for weekly display
      const { entries } = await getWaterHistory(user.id, 7);
      setHistoryEntries(entries);

      // Cache the data for offline use
      await setCache(cacheKey, {
        goal,
        entry,
        history: entries,
        date: today,
      });
      setIsFromCache(false);
    } catch (err) {
      console.error('Error loading water data:', err);
      // Try to fall back to cache
      const cached = await getCache<{
        goal: number | null;
        entry: WaterTrackingEntry | null;
        history: WaterTrackingEntry[];
      }>(cacheKey);
      if (cached) {
        setWaterGoal(cached.goal);
        setTodayEntry(cached.entry);
        setHistoryEntries(cached.history);
        setIsFromCache(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, profile?.id, today, isOnline]);

  // Initial load
  useEffect(() => {
    loadWaterData();
  }, [loadWaterData]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadWaterData();
  }, [loadWaterData]);

  // Add water
  const handleAddWater = async (amountMl: number) => {
    if (!user?.id || isUpdating) return;

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      const newAmount = (todayEntry?.amount_ml || 0) + amountMl;
      const updatedEntry: WaterTrackingEntry = {
        id: todayEntry?.id || `offline-${Date.now()}`,
        user_id: user.id,
        date: today,
        amount_ml: newAmount,
        created_at: todayEntry?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addToQueue({
        type: 'water_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          amount_ml: newAmount,
        },
      });
      refreshPendingCount();

      // Update local state
      setTodayEntry(updatedEntry);
      setHistoryEntries((prev) => {
        const existingIndex = prev.findIndex((e) => e.date === today);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedEntry;
          return updated;
        } else {
          return [updatedEntry, ...prev];
        }
      });
      return;
    }

    // Online - make API call
    setIsUpdating(true);
    const { entry, error } = await addWaterAmount(user.id, today, amountMl);
    setIsUpdating(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (entry) {
      setTodayEntry(entry);
      refreshReminders();
      // Update history entries to reflect the change in weekly graph
      setHistoryEntries((prev) => {
        const existingIndex = prev.findIndex((e) => e.date === today);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = entry;
          return updated;
        } else {
          return [entry, ...prev];
        }
      });
    }
  };

  // Remove water
  const handleRemoveWater = async () => {
    if (!user?.id || isUpdating || !todayEntry?.amount_ml) return;

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      const newAmount = Math.max(0, (todayEntry?.amount_ml || 0) - DEFAULT_GLASS_SIZE);
      const updatedEntry: WaterTrackingEntry = {
        ...todayEntry!,
        amount_ml: newAmount,
        updated_at: new Date().toISOString(),
      };

      addToQueue({
        type: 'water_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          amount_ml: newAmount,
        },
      });
      refreshPendingCount();

      // Update local state
      setTodayEntry(updatedEntry);
      setHistoryEntries((prev) => {
        const existingIndex = prev.findIndex((e) => e.date === today);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedEntry;
          return updated;
        }
        return prev;
      });
      return;
    }

    // Online - make API call
    setIsUpdating(true);
    const { entry, error } = await removeWaterAmount(user.id, today, DEFAULT_GLASS_SIZE);
    setIsUpdating(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (entry) {
      setTodayEntry(entry);
      refreshReminders();
      // Update history entries to reflect the change in weekly graph
      setHistoryEntries((prev) => {
        const existingIndex = prev.findIndex((e) => e.date === today);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = entry;
          return updated;
        }
        return prev;
      });
    }
  };

  // Handle custom water entry
  const handleCustomWaterEntry = async () => {
    if (!user?.id || isUpdating) return;

    const amount = parseInt(customWaterAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount in ml');
      setShowErrorModal(true);
      return;
    }

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      const newAmount = (todayEntry?.amount_ml || 0) + amount;
      const updatedEntry: WaterTrackingEntry = {
        id: todayEntry?.id || `offline-${Date.now()}`,
        user_id: user.id,
        date: today,
        amount_ml: newAmount,
        created_at: todayEntry?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addToQueue({
        type: 'water_log',
        action: 'update',
        userId: user.id,
        payload: {
          user_id: user.id,
          date: today,
          amount_ml: newAmount,
        },
      });
      refreshPendingCount();

      // Update local state
      setTodayEntry(updatedEntry);
      setCustomWaterAmount('');
      setShowCustomEntry(false);
      setHistoryEntries((prev) => {
        const existingIndex = prev.findIndex((e) => e.date === today);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedEntry;
          return updated;
        } else {
          return [updatedEntry, ...prev];
        }
      });
      return;
    }

    // Online - make API call
    setIsUpdating(true);
    const { entry, error } = await addWaterAmount(user.id, today, amount);
    setIsUpdating(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (entry) {
      setTodayEntry(entry);
      setCustomWaterAmount('');
      setShowCustomEntry(false);
      refreshReminders();
      setHistoryEntries((prev) => {
        const existingIndex = prev.findIndex((e) => e.date === today);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = entry;
          return updated;
        } else {
          return [entry, ...prev];
        }
      });
    }
  };

  // Handle setting personal water goal
  const handleSetWaterGoal = async () => {
    if (!user?.id) return;

    const goalValue = parseInt(newGoalValue, 10);
    if (isNaN(goalValue) || goalValue <= 0) {
      setErrorMessage('Please enter a valid water goal in ml');
      setShowErrorModal(true);
      return;
    }

    setIsSettingGoal(true);
    const { goal, error } = await setWaterGoalService(user.id, goalValue);
    setIsSettingGoal(false);

    if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    } else if (goal) {
      setWaterGoal(goal.water_goal_ml);
      setShowSetGoalModal(false);
      loadWaterData();
    }
  };

  // Get weekly chart data
  const weeklyData = useMemo(() => {
    const result: { date: string; amount: number }[] = [];
    const todayDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      const entry = historyEntries.find((e) => e.date === dateStr);
      result.push({
        date: dateStr,
        amount: entry?.amount_ml || 0,
      });
    }

    return result;
  }, [historyEntries]);

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
        <Droplets color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Sign in to track your water intake
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Stay hydrated and track your daily water consumption
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
        <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading water data...</Text>
      </View>
    );
  }

  // No goal set - show empty state
  if (!waterGoal) {
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
            icon={Droplets}
            iconColor="#06B6D4"
            title="No Water Goal Set"
            subtitle="Set a daily water intake goal to track your hydration"
            buttonText="Set My Goal"
            buttonIcon={Target}
            onButtonPress={() => {
              setNewGoalValue(String(recommendedWaterIntake));
              setShowSetGoalModal(true);
            }}
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
                Set Your Water Goal
              </Text>

              <TextInput
                value={newGoalValue}
                onChangeText={setNewGoalValue}
                placeholder="Daily water goal (ml)"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                keyboardType="numeric"
                style={{
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 8,
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginBottom: 16,
                }}
              >
                Recommended: {formatWaterAmount(recommendedWaterIntake)} based on your weight
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
                  onPress={handleSetWaterGoal}
                  style={{
                    flex: 1,
                    backgroundColor: '#06B6D4',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save Goal</Text>
                </HapticPressable>
              </View>
            </View>
          </View>
        </Modal>
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
            You're offline. Showing cached data.
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Droplets size={20} color="#06B6D4" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: 17,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Water Intake
        </Text>
      </View>

      {/* Today's Water Card */}
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
            {/* Progress Circle */}
            <WaterProgressCircle progress={progress} isDark={isDark} />

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
              {formatWaterAmount(progress.currentAmount)} / {formatWaterAmount(progress.goal)}
            </Text>

            {/* Goal Info */}
            <HapticPressable
              onPress={() => {
                setNewGoalValue(String(waterGoal));
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
                Daily Goal: {(progress.goal / 1000).toFixed(1)}L
              </Text>
              <Text style={{ marginLeft: 4, fontSize: 11, color: '#6366F1' }}>Edit</Text>
            </HapticPressable>

        {/* Goal achieved badge */}
        {progress.percentage >= 100 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? '#164E63' : '#CFFAFE',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              alignSelf: 'center',
              marginBottom: 12,
            }}
          >
            <Award size={16} color="#06B6D4" />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 13,
                fontWeight: '600',
                color: '#06B6D4',
              }}
            >
              Goal achieved!
            </Text>
          </View>
        )}

        {/* Motivational message */}
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

        {/* Add/Remove Buttons */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <HapticPressable
            onPress={handleRemoveWater}
            disabled={isUpdating || !todayEntry?.amount_ml}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUpdating || !todayEntry?.amount_ml ? 0.5 : 1,
            }}
          >
            <Minus size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </HapticPressable>

          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {DEFAULT_GLASS_SIZE}ml per glass
            </Text>
          </View>

          <HapticPressable
            onPress={() => handleAddWater(DEFAULT_GLASS_SIZE)}
            disabled={isUpdating}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#06B6D4',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUpdating ? 0.7 : 1,
            }}
          >
            <Plus size={24} color="#FFFFFF" />
          </HapticPressable>
        </View>

        {/* Quick Add Section */}
        <View style={{ marginTop: 16 }}>
          {/* Quick Add Buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {QUICK_ADD_AMOUNTS.map((item) => (
              <HapticPressable
                key={item.amount}
                onPress={() => handleAddWater(item.amount)}
                disabled={isUpdating}
                style={{
                  width: '31%',
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                  opacity: isUpdating ? 0.7 : 1,
                }}
              >
                <Droplets size={18} color="#06B6D4" />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    marginTop: 6,
                  }}
                >
                  +{item.label}
                </Text>
              </HapticPressable>
            ))}
          </View>

          {/* Custom Entry Section */}
          {showCustomEntry ? (
            <View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={customWaterAmount}
                  onChangeText={setCustomWaterAmount}
                  placeholder="Enter ml"
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
                  onPress={handleCustomWaterEntry}
                  disabled={isUpdating}
                  style={{
                    backgroundColor: '#06B6D4',
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isUpdating ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                    {isUpdating ? '...' : 'Add'}
                  </Text>
                </HapticPressable>
                <HapticPressable
                  onPress={() => setShowCustomEntry(false)}
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
                Enter a custom amount in milliliters
              </Text>
            </View>
          ) : (
            <HapticPressable
              onPress={() => setShowCustomEntry(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#06B6D4',
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text
                style={{ marginLeft: 6, color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}
              >
                Add Custom Amount
              </Text>
            </HapticPressable>
          )}
        </View>
        </>
      </View>

      {/* This Week Section */}
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: isDark ? '#F3F4F6' : '#1F2937',
          marginTop: 24,
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
        <View style={{ flexDirection: 'row' }}>
          {(() => {
            const maxAmount = Math.max(waterGoal, ...weeklyData.map((d) => d.amount));
            return weeklyData.map((day) => (
              <WeeklyDayBar
                key={day.date}
                date={day.date}
                amountMl={day.amount}
                goalMl={waterGoal}
                maxAmount={maxAmount}
                isToday={day.date === today}
                isDark={isDark}
              />
            ));
          })()}
        </View>

        {/* Weekly stats */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              {historyEntries.filter((e) => e.amount_ml >= waterGoal).length}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
              Goals Hit
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              {formatWaterAmount(
                Math.round(
                  historyEntries.reduce((sum, e) => sum + e.amount_ml, 0) /
                    Math.max(historyEntries.length, 1)
                )
              )}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
              Daily Avg
            </Text>
          </View>
        </View>
      </View>

      {/* Error Modal */}
      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
      />

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
              Set Your Water Goal
            </Text>

            <TextInput
              value={newGoalValue}
              onChangeText={setNewGoalValue}
              placeholder="Daily water goal (ml)"
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
              {profile?.weight_kg
                ? `Recommended for you: ${recommendedWaterIntake}ml (${profile.weight_kg}kg × 35ml)`
                : 'Recommended: body weight (kg) × 35ml'}
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
                onPress={handleSetWaterGoal}
                disabled={isSettingGoal}
                style={{
                  flex: 1,
                  backgroundColor: '#06B6D4',
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
    </ScrollView>
  );
}
