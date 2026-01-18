import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, CheckCircle, ChevronDown, ChevronUp, Trash2, Dumbbell } from 'lucide-react-native';
import { cleanExerciseName } from '../types/workout';
import ConfirmationModal from '../components/ConfirmationModal';
import { HapticPressable } from '../components/HapticPressable';

const PAGE_SIZE = 5;

interface WorkoutSession {
  id: string;
  workout_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  notes: string | null;
  workout_name: string;
  workout_description: string | null;
  completed_sets_count: number;
  completed_sets?: CompletedSet[];
}

interface CompletedSet {
  exercise_name: string;
  set_order: number;
  weight: string;
  reps: number;
  is_completed: boolean;
  each_side?: boolean;
  order_in_workout?: number | null;
}

export default function WorkoutHistoryScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchWorkoutHistory(true);
    }
  }, [user?.id]);

  const fetchWorkoutHistory = async (isInitial: boolean = false) => {
    if (!user?.id) return;

    if (isInitial) {
      setIsLoading(true);
      setError(null);
      setCurrentOffset(0);
    }

    try {
      const offset = isInitial ? 0 : currentOffset;

      // Step 1: Get workout sessions with pagination
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, workout_id, start_time, end_time, duration_seconds, notes')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (sessionsError) throw sessionsError;

      if (!sessionsData || sessionsData.length === 0) {
        if (isInitial) {
          setSessions([]);
        }
        setHasMore(false);
        return;
      }

      // Check if we have more data
      const receivedCount = sessionsData.length;
      setHasMore(receivedCount === PAGE_SIZE);
      setCurrentOffset(prev => isInitial ? receivedCount : prev + receivedCount);

      // Step 2: Get workout details
      const workoutIds = [...new Set(sessionsData.map(s => s.workout_id).filter(Boolean))];

      let workoutMap = new Map<string, { name: string; description: string | null }>();

      if (workoutIds.length > 0) {
        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, name, description')
          .in('id', workoutIds);

        if (workouts) {
          workouts.forEach(w => {
            workoutMap.set(w.id, { name: w.name, description: w.description });
          });
        }
      }

      // Step 3: Get completed sets count for each session
      const processedSessions = await Promise.all(
        sessionsData.map(async (session) => {
          const workoutDetails = workoutMap.get(session.workout_id) || {
            name: 'Unknown Workout',
            description: null
          };

          const { count } = await supabase
            .from('completed_exercise_sets')
            .select('*', { count: 'exact', head: true })
            .eq('workout_session_id', session.id);

          return {
            ...session,
            workout_name: workoutDetails.name,
            workout_description: workoutDetails.description,
            completed_sets_count: count || 0
          };
        })
      );

      if (isInitial) {
        setSessions(processedSessions);
      } else {
        // Filter out any duplicates before adding
        setSessions(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newSessions = processedSessions.filter(s => !existingIds.has(s.id));
          return [...prev, ...newSessions];
        });
      }
    } catch (err: any) {
      console.error('Error fetching workout history:', err);
      setError('Failed to load workout history');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading && !isRefreshing) {
      setIsLoadingMore(true);
      fetchWorkoutHistory(false);
    }
  }, [isLoadingMore, hasMore, isLoading, isRefreshing, currentOffset]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setHasMore(true);
    setCurrentOffset(0);
    fetchWorkoutHistory(true);
  }, [user?.id]);

  const toggleSessionExpansion = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      await fetchSessionDetails(sessionId);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    const existingSession = sessions.find(s => s.id === sessionId);
    if (existingSession?.completed_sets) return;

    setLoadingDetails(sessionId);

    try {
      const { data: setData, error: setError } = await supabase
        .from('completed_exercise_sets')
        .select(`
          exercise_instance_id,
          set_order,
          weight,
          reps,
          is_completed,
          exercise_instances:exercise_instances(
            exercise_name,
            each_side,
            order_in_workout
          )
        `)
        .eq('workout_session_id', sessionId)
        .order('set_order', { ascending: true });

      if (setError || !setData) return;

      const processedSets: CompletedSet[] = setData.map(set => {
        const exerciseInstances = set.exercise_instances as {
          exercise_name?: string;
          each_side?: boolean;
          order_in_workout?: number | null;
        } | null;

        return {
          exercise_name: exerciseInstances?.exercise_name || 'Unknown Exercise',
          set_order: Number(set.set_order) || 0,
          weight: String(set.weight || ''),
          reps: Number(set.reps) || 0,
          is_completed: Boolean(set.is_completed),
          each_side: Boolean(exerciseInstances?.each_side),
          order_in_workout: exerciseInstances?.order_in_workout || null
        };
      });

      setSessions(prev =>
        prev.map(session =>
          session.id === sessionId
            ? { ...session, completed_sets: processedSets }
            : session
        )
      );
    } catch (err) {
      console.error('Error fetching session details:', err);
    } finally {
      setLoadingDetails(null);
    }
  };

  const showDeleteConfirmation = (session: WorkoutSession) => {
    setSessionToDelete(session);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      // Delete completed sets first
      await supabase
        .from('completed_exercise_sets')
        .delete()
        .eq('workout_session_id', sessionToDelete.id);

      // Delete the session
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionToDelete.id);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      setDeleteModalVisible(false);
      setSessionToDelete(null);
    } catch (err) {
      console.error('Error deleting session:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setSessionToDelete(null);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatWeight = (weight: string): string => {
    if (weight === 'BW') return 'BW';
    if (!weight || weight === '') return '-';
    return `${weight}kg`;
  };

  const renderSessionDetails = (session: WorkoutSession) => {
    if (!session.completed_sets) {
      return (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      );
    }

    if (session.completed_sets.length === 0) {
      return (
        <View style={{ padding: 16 }}>
          <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
            No detailed set information available
          </Text>
        </View>
      );
    }

    // Group sets by exercise
    const groupedSets = session.completed_sets.reduce((acc, set) => {
      if (!acc[set.exercise_name]) {
        acc[set.exercise_name] = new Map<number, CompletedSet>();
      }
      const existingSet = acc[set.exercise_name].get(set.set_order);
      if (!existingSet || (set.is_completed && !existingSet.is_completed)) {
        acc[set.exercise_name].set(set.set_order, set);
      }
      return acc;
    }, {} as Record<string, Map<number, CompletedSet>>);

    // Convert to array and sort
    const sortedExercises = Object.entries(groupedSets)
      .map(([name, setsMap]) => ({
        name,
        sets: Array.from(setsMap.values()).sort((a, b) => a.set_order - b.set_order)
      }))
      .sort((a, b) => {
        const orderA = a.sets[0]?.order_in_workout ?? 999;
        const orderB = b.sets[0]?.order_in_workout ?? 999;
        return orderA - orderB;
      });

    return (
      <View style={{ padding: 16, paddingTop: 8 }}>
        {sortedExercises.map((exercise, index) => (
          <View
            key={`${session.id}-${exercise.name}-${index}`}
            style={{
              marginBottom: index < sortedExercises.length - 1 ? 12 : 0,
              padding: 12,
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 1)'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#A5B4FC' : '#4F46E5' }}>
                  {index + 1}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '500',
                  color: isDark ? '#F3F4F6' : '#1F2937'
                }}
                numberOfLines={1}
              >
                {cleanExerciseName(exercise.name)}
              </Text>
              {exercise.sets[0]?.each_side && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)'
                  }}
                >
                  <Text style={{ fontSize: 10, color: isDark ? '#FCD34D' : '#D97706' }}>
                    Each Side
                  </Text>
                </View>
              )}
            </View>

            {/* Sets table */}
            <View>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: isDark ? '#4B5563' : '#E5E7EB' }}>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }}>SET</Text>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }}>WEIGHT</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }}>REPS</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'right' }}>STATUS</Text>
              </View>

              {/* Rows */}
              {exercise.sets.map((set) => (
                <View
                  key={`${exercise.name}-set-${set.set_order}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                    opacity: set.is_completed ? 1 : 0.5
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#D1D5DB' : '#374151' }}>
                    {set.set_order}
                  </Text>
                  <Text style={{ flex: 2, fontSize: 13, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                    {formatWeight(set.weight)}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                    {set.reps}
                  </Text>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {set.is_completed ? (
                      <CheckCircle size={16} color="#22C55E" />
                    ) : (
                      <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF' }}>Skip</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSession = ({ item: session }: { item: WorkoutSession }) => {
    const isExpanded = expandedSession === session.id;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 16,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Header */}
        <HapticPressable
          onPress={() => toggleSessionExpansion(session.id)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.9 : 1
          })}
        >
          <View style={{ paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    marginBottom: 4
                  }}
                  numberOfLines={1}
                >
                  {session.workout_name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={{ marginLeft: 4, fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    {formatDate(session.start_time)}
                  </Text>
                </View>
              </View>

              {isExpanded ? (
                <ChevronUp size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              ) : (
                <ChevronDown size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              )}
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 4 }}>
                  Start
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#374151' }}>
                  {formatTime(session.start_time)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 4 }}>
                  Duration
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#374151' }}>
                  {formatDuration(session.duration_seconds)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 4 }}>
                  Sets
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#374151' }}>
                  {session.completed_sets_count}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 4 }}>
                  Status
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: session.end_time ? '#22C55E' : '#F59E0B'
                  }}
                >
                  {session.end_time ? 'Done' : 'Active'}
                </Text>
              </View>
            </View>

          </View>
        </HapticPressable>

        {/* Delete button - outside main pressable */}
        <View style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 20 }}>
          <HapticPressable
            onPress={() => showDeleteConfirmation(session)}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#EF4444',
                backgroundColor: 'transparent',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Trash2 size={16} color="#EF4444" />
                <Text style={{ marginLeft: 8, fontSize: 14, color: '#EF4444', fontWeight: '600' }}>
                  Delete Session
                </Text>
              </View>
            </View>
          </HapticPressable>
        </View>

        {/* Expanded details */}
        {isExpanded && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: isDark ? '#374151' : '#E5E7EB'
            }}
          >
            {loadingDetails === session.id ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={{ marginTop: 8, fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                  Loading details...
                </Text>
              </View>
            ) : (
              renderSessionDetails(session)
            )}
          </View>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={{ marginTop: 8, fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40
        }}
      >
        <Dumbbell size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#D1D5DB' : '#374151'
          }}
        >
          No Workout History
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: isDark ? '#6B7280' : '#9CA3AF',
            textAlign: 'center'
          }}
        >
          Complete your first workout to see it here
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#111827' : '#F9FAFB'
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 16, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          Loading workout history...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: isDark ? '#111827' : '#F9FAFB'
        }}
      >
        <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Error
        </Text>
        <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
          {error}
        </Text>
        <HapticPressable
          onPress={() => fetchWorkoutHistory(true)}
          style={{
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: '#6366F1',
            borderRadius: 8
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
        </HapticPressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 40,
          flexGrow: 1
        }}
        style={{ flex: 1 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Workout Session"
        message={`Are you sure you want to delete "${sessionToDelete?.workout_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </View>
  );
}
