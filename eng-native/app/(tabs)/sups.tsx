import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { HapticPressable } from '../../components/HapticPressable';
import { Pill, Clock, AlertCircle, Check, Flame, CheckCheck, Plus, Trash2, User, WifiOff } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useOffline } from '../../contexts/OfflineContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../lib/storage';
import { addToQueue } from '../../lib/syncQueue';
import {
  getTodaysSupplements,
  logSupplementTaken,
  unlogSupplement,
  logMultipleSupplements,
  calculateSupplementAdherence,
  getSupplementHistory,
  getUnloggedSupplementsCount,
  groupSupplementsBySchedule,
  getScheduleDisplayText,
  addPersonalSupplement,
  removePersonalSupplement,
  isPersonalSupplement,
} from '../../services/supplementService';
import {
  TodaysSupplement,
  SupplementAdherence,
  DailySupplementSummary,
  SupplementGroupBySchedule,
  CATEGORY_COLORS,
  SupplementSchedule,
  SupplementCategory,
} from '../../types/supplements';
import { getLocalDateString } from '../../utils/date';
import AddSupplementModal from '../../components/supplements/AddSupplementModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import {
  getSupplementReminderStatus,
  getScheduleTimeConfig,
  formatTimeForDisplay,
  ReminderStatus,
} from '../../utils/supplementReminders';
import { ProfileData } from '../../types/profile';

// Reminder Banner Component
function ReminderBanner({
  groups,
  profile,
  isDark,
}: {
  groups: SupplementGroupBySchedule[];
  profile: ProfileData | null;
  isDark: boolean;
}) {
  // Find groups that are due or overdue with untaken supplements
  const urgentGroups = groups.filter((group) => {
    if (group.taken === group.total) return false; // All taken
    const status = getSupplementReminderStatus(
      group.schedule as SupplementSchedule,
      false,
      profile
    );
    return status === 'due' || status === 'overdue';
  });

  if (urgentGroups.length === 0) return null;

  // Count total urgent supplements
  const urgentCount = urgentGroups.reduce((sum, g) => sum + (g.total - g.taken), 0);

  // Get the most urgent group (first overdue, then first due)
  const overdueGroups = urgentGroups.filter((g) =>
    getSupplementReminderStatus(g.schedule as SupplementSchedule, false, profile) === 'overdue'
  );
  const mostUrgent = overdueGroups[0] || urgentGroups[0];
  const isOverdue = overdueGroups.length > 0;

  const config = getScheduleTimeConfig(mostUrgent.schedule as SupplementSchedule, profile);
  const timeLabel = formatTimeForDisplay(config.expectedTime);

  return (
    <View
      style={{
        backgroundColor: isOverdue ? '#FEE2E2' : '#FEF3C7',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Pill size={20} color={isOverdue ? '#DC2626' : '#D97706'} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isOverdue ? '#991B1B' : '#92400E',
          }}
        >
          {isOverdue
            ? `${urgentCount} supplement${urgentCount > 1 ? 's' : ''} overdue!`
            : `${urgentCount} supplement${urgentCount > 1 ? 's' : ''} to take now`}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: isOverdue ? '#B91C1C' : '#B45309',
            marginTop: 2,
          }}
        >
          {mostUrgent.schedule} supplements were due at {timeLabel}
        </Text>
      </View>
    </View>
  );
}

// Today's Supplement Item with Checkbox
function TodaySupplementItem({
  supplement,
  isDark,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  supplement: TodaysSupplement;
  isDark: boolean;
  onToggle: (supplement: TodaysSupplement) => void;
  onDelete?: (supplement: TodaysSupplement) => void;
  isToggling: boolean;
  isDeleting?: boolean;
}) {
  const categoryColor = CATEGORY_COLORS[supplement.supplement_category] || '#6B7280';
  const isPersonal = isPersonalSupplement(supplement);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#374151' : '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: categoryColor,
        opacity: isToggling || isDeleting ? 0.7 : 1,
      }}
    >
      {/* Checkbox */}
      <HapticPressable
        onPress={() => !isToggling && !isDeleting && onToggle(supplement)}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: supplement.isLogged ? '#22C55E' : (isDark ? '#6B7280' : '#D1D5DB'),
          backgroundColor: supplement.isLogged ? '#22C55E' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color={supplement.isLogged ? '#FFFFFF' : '#6B7280'} />
        ) : supplement.isLogged ? (
          <Check size={16} color="#FFFFFF" strokeWidth={3} />
        ) : null}
      </HapticPressable>

      {/* Supplement Info */}
      <HapticPressable
        onPress={() => !isToggling && !isDeleting && onToggle(supplement)}
        style={{ flex: 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              textDecorationLine: supplement.isLogged ? 'line-through' : 'none',
              opacity: supplement.isLogged ? 0.7 : 1,
            }}
          >
            {supplement.supplement_name}
          </Text>
          {isPersonal && (
            <View
              style={{
                marginLeft: 8,
                backgroundColor: isDark ? '#4B5563' : '#E5E7EB',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>Personal</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {supplement.dosage}
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#6B7280' : '#9CA3AF', marginHorizontal: 6 }}>•</Text>
          <Text style={{ fontSize: 13, color: categoryColor }}>{supplement.supplement_category}</Text>
        </View>
      </HapticPressable>

      {/* Delete Button (only for personal supplements) */}
      {isPersonal && onDelete && (
        <HapticPressable
          onPress={() => !isDeleting && onDelete(supplement)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? '#4B5563' : '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
          }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Trash2 size={16} color="#EF4444" />
          )}
        </HapticPressable>
      )}
    </View>
  );
}

// Schedule Group with Mark All button
function ScheduleGroupCard({
  group,
  isDark,
  profile,
  onToggleSupplement,
  onDeleteSupplement,
  onMarkAllTaken,
  togglingIds,
  deletingIds,
  isMarkingAll,
}: {
  group: SupplementGroupBySchedule;
  isDark: boolean;
  profile: ProfileData | null;
  onToggleSupplement: (supplement: TodaysSupplement) => void;
  onDeleteSupplement: (supplement: TodaysSupplement) => void;
  onMarkAllTaken: (group: SupplementGroupBySchedule) => void;
  togglingIds: Set<string>;
  deletingIds: Set<string>;
  isMarkingAll: boolean;
}) {
  const allTaken = group.taken === group.total;
  const hasUnloggedSupplements = group.supplements.some(s => !s.isLogged);

  // Get reminder status for this group
  const reminderStatus = getSupplementReminderStatus(
    group.schedule as SupplementSchedule,
    allTaken,
    profile
  );
  const config = getScheduleTimeConfig(group.schedule as SupplementSchedule, profile);
  const expectedTime = formatTimeForDisplay(config.expectedTime);

  // Status colors
  const statusColors: Record<ReminderStatus, { bg: string; text: string; icon: string }> = {
    taken: { bg: '#DCFCE7', text: '#166534', icon: '#22C55E' },
    overdue: { bg: '#FEE2E2', text: '#991B1B', icon: '#DC2626' },
    due: { bg: '#FEF3C7', text: '#92400E', icon: '#D97706' },
    upcoming: { bg: isDark ? '#374151' : '#F3F4F6', text: isDark ? '#9CA3AF' : '#6B7280', icon: '#6366F1' },
  };
  const statusStyle = statusColors[reminderStatus];

  return (
    <View
      style={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: reminderStatus === 'overdue' ? 2 : 1,
        borderColor: reminderStatus === 'overdue'
          ? '#FCA5A5'
          : reminderStatus === 'due'
          ? '#FCD34D'
          : isDark ? '#374151' : '#E5E7EB',
      }}
    >
      {/* Group Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Clock size={16} color={statusStyle.icon} />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 15,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            {group.schedule}
          </Text>
          <View
            style={{
              marginLeft: 8,
              backgroundColor: statusStyle.bg,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: statusStyle.text,
              }}
            >
              {reminderStatus === 'taken'
                ? 'Done'
                : reminderStatus === 'overdue'
                ? `Overdue (${expectedTime})`
                : reminderStatus === 'due'
                ? `Due now`
                : expectedTime}
            </Text>
          </View>
        </View>

        {/* Progress Badge */}
        <View
          style={{
            backgroundColor: allTaken ? '#DCFCE7' : (isDark ? '#374151' : '#F3F4F6'),
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: allTaken ? '#166534' : (isDark ? '#D1D5DB' : '#4B5563'),
            }}
          >
            {group.taken}/{group.total}
          </Text>
        </View>
      </View>

      {/* Supplements List */}
      {group.supplements.map((supplement) => (
        <TodaySupplementItem
          key={supplement.id}
          supplement={supplement}
          isDark={isDark}
          onToggle={onToggleSupplement}
          onDelete={onDeleteSupplement}
          isToggling={togglingIds.has(supplement.id)}
          isDeleting={deletingIds.has(supplement.id)}
        />
      ))}

      {/* Mark All Button */}
      {hasUnloggedSupplements && (
        <HapticPressable
          onPress={() => onMarkAllTaken(group)}
          disabled={isMarkingAll}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#8B5CF6',
            paddingVertical: 12,
            borderRadius: 10,
            marginTop: 4,
            opacity: isMarkingAll ? 0.7 : 1,
          }}
        >
          {isMarkingAll ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCheck size={18} color="#FFFFFF" />
              <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                Mark All as Taken
              </Text>
            </>
          )}
        </HapticPressable>
      )}

      {/* All Complete Message */}
      {allTaken && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
          }}
        >
          <Check size={16} color="#22C55E" />
          <Text style={{ marginLeft: 6, color: '#22C55E', fontWeight: '500', fontSize: 13 }}>
            All done!
          </Text>
        </View>
      )}
    </View>
  );
}

// Weekly Day Bar (similar to water)
function WeeklyDayBar({
  date,
  taken,
  total,
  maxTotal,
  isToday,
  isDark,
}: {
  date: string;
  taken: number;
  total: number;
  maxTotal: number;
  isToday: boolean;
  isDark: boolean;
}) {
  const dayDate = new Date(date + 'T00:00:00');
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
  const percentage = total > 0 ? (taken / total) * 100 : 0;
  const heightPercentage = maxTotal > 0 ? (taken / maxTotal) * 100 : 0;
  const goalMet = taken === total && total > 0;

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
              ? '#8B5CF6'
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
          color: isToday ? '#8B5CF6' : isDark ? '#9CA3AF' : '#6B7280',
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
        {total > 0 ? `${taken}/${total}` : '-'}
      </Text>
    </View>
  );
}

export default function SupsScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const { refreshReminders } = useNotifications();
  const { isOnline, refreshPendingCount, isSyncing, lastSyncTime } = useOffline();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // State for tracking features
  const [todaysSupplements, setTodaysSupplements] = useState<TodaysSupplement[]>([]);
  const [adherence, setAdherence] = useState<SupplementAdherence | null>(null);
  const [history, setHistory] = useState<DailySupplementSummary[]>([]);
  const [unloggedCount, setUnloggedCount] = useState(0);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [markingAllSchedule, setMarkingAllSchedule] = useState<string | null>(null);

  // Add supplement modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingSupplement, setIsAddingSupplement] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplementToDelete, setSupplementToDelete] = useState<TodaysSupplement | null>(null);

  // Today's date
  const today = useMemo(() => getLocalDateString(), []);

  // Group supplements by schedule
  const groupedSupplements = useMemo(() => {
    return groupSupplementsBySchedule(todaysSupplements);
  }, [todaysSupplements]);

  // Load all supplement data
  const loadSupplements = useCallback(async () => {
    if (!user?.id) return;

    const cacheKey = CacheKeys.supplements(user.id);

    // If offline, try to load from cache
    if (!isOnline) {
      try {
        const cached = await getCache<{
          supplements: TodaysSupplement[];
          adherence: SupplementAdherence | null;
          history: DailySupplementSummary[];
          unloggedCount: number;
          date: string;
        }>(cacheKey);

        if (cached) {
          setTodaysSupplements(cached.supplements);
          setAdherence(cached.adherence);
          setHistory(cached.history);
          setUnloggedCount(cached.unloggedCount);
          setIsFromCache(true);
        }
      } catch (err) {
        console.error('Error loading cached supplements:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    // Online - fetch from API
    try {
      // Load all data in parallel
      const [todaysResult, adherenceResult, historyResult, unloggedResult] = await Promise.all([
        getTodaysSupplements(user.id),
        calculateSupplementAdherence(user.id, 7),
        getSupplementHistory(user.id, 7),
        getUnloggedSupplementsCount(user.id),
      ]);

      // Set today's supplements
      if (!todaysResult.error) {
        setTodaysSupplements(todaysResult.supplements);
      }

      // Set adherence
      if (!adherenceResult.error) {
        setAdherence(adherenceResult.adherence);
      }

      // Set history
      if (!historyResult.error) {
        setHistory(historyResult.history);
      }

      // Set unlogged count
      if (!unloggedResult.error) {
        setUnloggedCount(unloggedResult.count);
      }

      // Cache the data for offline use
      await setCache(cacheKey, {
        supplements: todaysResult.supplements || [],
        adherence: adherenceResult.adherence || null,
        history: historyResult.history || [],
        unloggedCount: unloggedResult.count || 0,
        date: today,
      });
      setIsFromCache(false);
    } catch (err) {
      console.error('Error in loadSupplements:', err);
      // Try to fall back to cache
      const cached = await getCache<{
        supplements: TodaysSupplement[];
        adherence: SupplementAdherence | null;
        history: DailySupplementSummary[];
        unloggedCount: number;
      }>(cacheKey);
      if (cached) {
        setTodaysSupplements(cached.supplements);
        setAdherence(cached.adherence);
        setHistory(cached.history);
        setUnloggedCount(cached.unloggedCount);
        setIsFromCache(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, isOnline, today]);

  // Initial load
  useEffect(() => {
    loadSupplements();
  }, [loadSupplements]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadSupplements();
      }
    }, [loadSupplements, isLoading])
  );

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
      console.log('[Supplements] Sync completed, refetching data');
      loadSupplements();
    }
  }, [lastSyncTime, isOnline, isSyncing, isLoading, loadSupplements]);

  // Handle supplement toggle
  const handleToggleSupplement = useCallback(async (supplement: TodaysSupplement) => {
    if (!user?.id) return;

    setTogglingIds((prev) => new Set(prev).add(supplement.id));

    // If offline, queue the operation and update local state immediately
    if (!isOnline) {
      if (supplement.isLogged && supplement.logId) {
        // Only queue deletion if it's not an offline-created log
        if (!supplement.logId.startsWith('offline-')) {
          addToQueue({
            type: 'supplement_log',
            action: 'delete',
            userId: user.id,
            payload: { id: supplement.logId },
          });
        }
        // Update local state
        setTodaysSupplements(prev =>
          prev.map(s => s.id === supplement.id ? { ...s, isLogged: false, logId: undefined } : s)
        );
      } else {
        // Queue the log
        addToQueue({
          type: 'supplement_log',
          action: 'create',
          userId: user.id,
          payload: {
            user_id: user.id,
            assignment_id: supplement.id,
            schedule: supplement.schedule,
            logged_at: new Date().toISOString(),
          },
        });
        // Update local state
        setTodaysSupplements(prev =>
          prev.map(s => s.id === supplement.id ? { ...s, isLogged: true, logId: `offline-${Date.now()}` } : s)
        );
      }
      refreshPendingCount();
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(supplement.id);
        return next;
      });
      return;
    }

    // Online - make API call
    try {
      if (supplement.isLogged && supplement.logId) {
        await unlogSupplement(supplement.logId);
      } else {
        await logSupplementTaken(user.id, supplement.id);
      }
      await loadSupplements();
      // Refresh notification reminders to update the bell badge
      refreshReminders();
    } catch (err) {
      console.error('Error toggling supplement:', err);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(supplement.id);
        return next;
      });
    }
  }, [user?.id, loadSupplements, refreshReminders, isOnline, refreshPendingCount]);

  // Handle mark all as taken for a group
  const handleMarkAllTaken = useCallback(async (group: SupplementGroupBySchedule) => {
    if (!user?.id) return;

    const unloggedSupplements = group.supplements.filter(s => !s.isLogged);

    if (unloggedSupplements.length === 0) return;

    setMarkingAllSchedule(group.schedule);

    // If offline, queue all operations and update local state immediately
    if (!isOnline) {
      unloggedSupplements.forEach(supplement => {
        addToQueue({
          type: 'supplement_log',
          action: 'create',
          userId: user.id,
          payload: {
            user_id: user.id,
            assignment_id: supplement.id,
            schedule: supplement.schedule,
            logged_at: new Date().toISOString(),
          },
        });
      });

      // Update local state
      const unloggedIds = new Set(unloggedSupplements.map(s => s.id));
      setTodaysSupplements(prev =>
        prev.map(s => unloggedIds.has(s.id) ? { ...s, isLogged: true, logId: `offline-${Date.now()}-${s.id}` } : s)
      );

      refreshPendingCount();
      setMarkingAllSchedule(null);
      return;
    }

    // Online - make API call
    try {
      await logMultipleSupplements(user.id, unloggedSupplements.map(s => s.id));
      await loadSupplements();
      // Refresh notification reminders to update the bell badge
      refreshReminders();
    } catch (err) {
      console.error('Error marking all supplements:', err);
    } finally {
      setMarkingAllSchedule(null);
    }
  }, [user?.id, loadSupplements, refreshReminders, isOnline, refreshPendingCount]);

  // Handle adding a personal supplement
  const handleAddSupplement = useCallback(async (data: {
    name: string;
    category: SupplementCategory;
    dosage: string;
    schedule: SupplementSchedule;
    notes?: string;
  }) => {
    if (!user?.id) return;

    setIsAddingSupplement(true);

    try {
      const { error } = await addPersonalSupplement(
        user.id,
        data.name,
        data.category,
        data.dosage,
        data.schedule,
        data.notes
      );

      if (error) {
        console.error('Error adding supplement:', error);
      } else {
        setShowAddModal(false);
        await loadSupplements();
        refreshReminders();
      }
    } catch (err) {
      console.error('Error in handleAddSupplement:', err);
    } finally {
      setIsAddingSupplement(false);
    }
  }, [user?.id, loadSupplements, refreshReminders]);

  // Handle delete supplement confirmation
  const handleDeletePress = useCallback((supplement: TodaysSupplement) => {
    setSupplementToDelete(supplement);
    setShowDeleteConfirm(true);
  }, []);

  // Handle confirmed delete
  const handleConfirmDelete = useCallback(async () => {
    if (!user?.id || !supplementToDelete) return;

    setDeletingIds((prev) => new Set(prev).add(supplementToDelete.id));
    setShowDeleteConfirm(false);

    try {
      const { error } = await removePersonalSupplement(user.id, supplementToDelete.id);

      if (error) {
        console.error('Error deleting supplement:', error);
      } else {
        await loadSupplements();
        refreshReminders();
      }
    } catch (err) {
      console.error('Error in handleConfirmDelete:', err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(supplementToDelete.id);
        return next;
      });
      setSupplementToDelete(null);
    }
  }, [user?.id, supplementToDelete, loadSupplements, refreshReminders]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadSupplements();
  }, [loadSupplements]);

  // Calculate totals
  const totalSupplements = todaysSupplements.length;
  const takenCount = todaysSupplements.filter((s) => s.isLogged).length;
  const todaysPercentage = totalSupplements > 0 ? Math.round((takenCount / totalSupplements) * 100) : 0;

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
        <Pill color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Sign in to view your supplements
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Your supplement schedule will appear here
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
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading supplements...</Text>
      </View>
    );
  }

  // No supplements assigned
  if (totalSupplements === 0) {
    return (
      <>
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
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Pill color={isDark ? '#6B7280' : '#9CA3AF'} size={40} />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              marginBottom: 8,
              textAlign: 'center',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            No Supplements Yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: 'center',
              color: isDark ? '#9CA3AF' : '#6B7280',
              marginBottom: 24,
              paddingHorizontal: 20,
            }}
          >
            Add your own supplements to track, or wait for your coach to assign them
          </Text>
          <HapticPressable
            onPress={() => setShowAddModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#8B5CF6',
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
              Add My Supplements
            </Text>
          </HapticPressable>
        </ScrollView>

        {/* Add Supplement Modal */}
        <AddSupplementModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSupplement}
          isLoading={isAddingSupplement}
        />
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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

      {/* Reminder Banner - shows when supplements are due/overdue based on user's schedule */}
      <ReminderBanner groups={groupedSupplements} profile={profile} isDark={isDark} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pill size={20} color="#8B5CF6" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Today's Supplements
          </Text>
        </View>

        {/* Overall Progress Badge */}
        <View
          style={{
            backgroundColor: todaysPercentage === 100 ? '#DCFCE7' : (isDark ? '#374151' : '#F3F4F6'),
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: todaysPercentage === 100 ? '#166534' : (isDark ? '#D1D5DB' : '#4B5563'),
            }}
          >
            {takenCount}/{totalSupplements}
          </Text>
        </View>
      </View>

      {/* Grouped Supplements */}
      {groupedSupplements.map((group) => (
        <ScheduleGroupCard
          key={group.schedule}
          group={group}
          isDark={isDark}
          profile={profile}
          onToggleSupplement={handleToggleSupplement}
          onDeleteSupplement={handleDeletePress}
          onMarkAllTaken={handleMarkAllTaken}
          togglingIds={togglingIds}
          deletingIds={deletingIds}
          isMarkingAll={markingAllSchedule === group.schedule}
        />
      ))}

      {/* Add More Button */}
      <HapticPressable
        onPress={() => setShowAddModal(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#374151' : '#F3F4F6',
          paddingVertical: 14,
          borderRadius: 12,
          marginBottom: 16,
          borderWidth: 2,
          borderColor: isDark ? '#4B5563' : '#E5E7EB',
          borderStyle: 'dashed',
        }}
      >
        <Plus size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        <Text
          style={{
            marginLeft: 8,
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontWeight: '500',
            fontSize: 14,
          }}
        >
          Add Supplement
        </Text>
      </HapticPressable>

      {/* This Week Section (like water) */}
      {history.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginTop: 8,
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
                const maxTotal = Math.max(...history.map((d) => d.total));
                return history.slice().reverse().map((day) => (
                  <WeeklyDayBar
                    key={day.date}
                    date={day.date}
                    taken={day.taken}
                    total={day.total}
                    maxTotal={maxTotal}
                    isToday={day.date === today}
                    isDark={isDark}
                  />
                ));
              })()}
            </View>

            {/* Weekly Stats */}
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
                  {history.filter((d) => d.percentage === 100).length}
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                  Perfect Days
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
                  {adherence?.percentage || 0}%
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                  Adherence
                </Text>
              </View>
              {adherence && adherence.streak > 0 && (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Flame size={16} color="#F97316" />
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: isDark ? '#F3F4F6' : '#1F2937',
                        marginLeft: 4,
                      }}
                    >
                      {adherence.streak}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                    Day Streak
                  </Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}
      </ScrollView>

      {/* Add Supplement Modal */}
      <AddSupplementModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSupplement}
        isLoading={isAddingSupplement}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Remove Supplement"
        message={`Are you sure you want to remove "${supplementToDelete?.supplement_name}" from your list?`}
        confirmText="Remove"
        cancelText="Keep"
        confirmColor="red"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSupplementToDelete(null);
        }}
      />
    </View>
  );
}
