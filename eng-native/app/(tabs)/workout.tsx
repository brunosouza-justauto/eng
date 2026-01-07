import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Dumbbell,
  AlertCircle,
  PlayCircle,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  Moon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  getAssignedProgram,
  getProgramWorkouts,
  getTodaysWorkout,
  checkWorkoutCompletion,
  getCompletedWorkoutDates,
} from '../../services/workoutService';
import {
  WorkoutData,
  ProgramAssignment,
  CompletedWorkoutDate,
  getDayName,
  cleanExerciseName,
  ExerciseInstanceData,
  ExerciseGroupType,
} from '../../types/workout';

const PREVIEW_COUNT = 3;

export default function WorkoutScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<ProgramAssignment | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutData[]>([]);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutData | null>(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionTime, setCompletionTime] = useState<string | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [completedDates, setCompletedDates] = useState<CompletedWorkoutDate[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pulse animation for "Click to start workout" badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Fetch data on screen focus
  useFocusEffect(
    useCallback(() => {
      if (profile?.id && user?.id) {
        fetchWorkoutData();
      }
    }, [profile?.id, user?.id])
  );

  // Fetch calendar data when month changes
  useEffect(() => {
    if (user?.id) {
      fetchCalendarData();
    }
  }, [user?.id, currentMonth]);

  const fetchWorkoutData = async () => {
    if (!profile?.id || !user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get assigned program
      const { assignment: programAssignment, error: assignError } = await getAssignedProgram(
        profile.id
      );

      if (assignError) {
        setError(assignError);
        setIsLoading(false);
        return;
      }

      setAssignment(programAssignment);

      if (!programAssignment?.program_template_id) {
        setTodaysWorkout(null);
        setIsRestDay(false);
        setIsLoading(false);
        return;
      }

      // Get workouts for the program
      const { workouts, error: workoutsError } = await getProgramWorkouts(
        programAssignment.program_template_id
      );

      if (workoutsError) {
        setError(workoutsError);
        setIsLoading(false);
        return;
      }

      setAllWorkouts(workouts);

      // Get today's workout
      const workout = getTodaysWorkout(workouts);
      setTodaysWorkout(workout);
      setIsRestDay(!workout);

      // Check completion status if there's a workout
      if (workout) {
        const { isCompleted: completed, completionTime: time } = await checkWorkoutCompletion(
          workout.id,
          user.id
        );
        setIsCompleted(completed);
        setCompletionTime(time);
      }
    } catch (err: any) {
      console.error('Error fetching workout data:', err);
      setError(err.message || 'Failed to load workout data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchWorkoutData();
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    if (!user?.id) return;

    setIsCalendarLoading(true);
    try {
      const { dates } = await getCompletedWorkoutDates(
        user.id,
        currentMonth.getFullYear(),
        currentMonth.getMonth()
      );
      setCompletedDates(dates);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  // Group exercises by group_id (supersets, bi-sets, tri-sets, giant sets)
  const groupExercisesBySuperset = (exercises: ExerciseInstanceData[]) => {
    const sortedExercises = [...exercises].sort(
      (a, b) => (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0)
    );

    const result: {
      group: ExerciseInstanceData[];
      isSuperset: boolean;
      groupType?: ExerciseGroupType | null;
    }[] = [];

    // Group exercises by group_id
    const groupMap = new Map<string, ExerciseInstanceData[]>();
    const ungrouped: ExerciseInstanceData[] = [];

    for (const exercise of sortedExercises) {
      if (exercise.group_id && exercise.group_type && exercise.group_type !== ExerciseGroupType.NONE) {
        const existing = groupMap.get(exercise.group_id) || [];
        existing.push(exercise);
        groupMap.set(exercise.group_id, existing);
      } else {
        ungrouped.push(exercise);
      }
    }

    // Build result maintaining order
    const processedGroups = new Set<string>();

    for (const exercise of sortedExercises) {
      if (exercise.group_id && exercise.group_type && exercise.group_type !== ExerciseGroupType.NONE) {
        if (!processedGroups.has(exercise.group_id)) {
          const groupExercises = groupMap.get(exercise.group_id) || [];
          // Sort by group_order within the group
          groupExercises.sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));
          result.push({
            group: groupExercises,
            isSuperset: groupExercises.length >= 2,
            groupType: exercise.group_type,
          });
          processedGroups.add(exercise.group_id);
        }
      } else {
        result.push({ group: [exercise], isSuperset: false });
      }
    }

    return result;
  };

  // Render exercise list
  const renderExerciseList = () => {
    if (!todaysWorkout?.exercise_instances.length) return null;

    const exerciseGroups = groupExercisesBySuperset(todaysWorkout.exercise_instances);
    const totalCount = todaysWorkout.exercise_instances.length;

    let visibleGroups = exerciseGroups;
    if (!showAllExercises && totalCount > PREVIEW_COUNT) {
      let countSoFar = 0;
      visibleGroups = [];
      for (const group of exerciseGroups) {
        visibleGroups.push(group);
        countSoFar += group.group.length;
        if (countSoFar >= PREVIEW_COUNT) break;
      }
    }

    return (
      <View className="space-y-2">
        {visibleGroups.map((group, groupIndex) => (
          <View
            key={groupIndex}
            className={`rounded-lg ${
              group.isSuperset
                ? isDark
                  ? 'bg-indigo-900/20 border border-indigo-800'
                  : 'bg-indigo-50 border border-indigo-200'
                : ''
            }`}
          >
            {group.isSuperset && (
              <View className="px-3 py-1">
                <View
                  className={`self-start px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isDark ? 'text-indigo-300' : 'text-indigo-800'
                    }`}
                  >
                    {group.groupType === ExerciseGroupType.SUPERSET
                      ? 'Superset'
                      : group.groupType === ExerciseGroupType.BI_SET
                        ? 'Bi-Set'
                        : group.groupType === ExerciseGroupType.TRI_SET
                          ? 'Tri-Set'
                          : group.groupType === ExerciseGroupType.GIANT_SET
                            ? 'Giant Set'
                            : 'Superset'}
                  </Text>
                </View>
              </View>
            )}
            <View className={group.isSuperset ? 'px-3 pb-2' : ''}>
              {group.group.map((exercise, exIndex) => (
                <View
                  key={exIndex}
                  className={`py-2 ${
                    exIndex < group.group.length - 1
                      ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`
                      : ''
                  }`}
                >
                  <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {cleanExerciseName(exercise.exercise_name)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {totalCount > PREVIEW_COUNT && (
          <Pressable onPress={() => setShowAllExercises(!showAllExercises)} className="py-2">
            <Text className="text-center text-sm text-indigo-500">
              {showAllExercises ? 'Show Less' : `Show All (${totalCount})`}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  // Calendar component
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const hasCompletedWorkout = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return completedDates.some((d) => d.date === dateStr);
    };

    const isToday = (day: number) => {
      const today = new Date();
      return (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      );
    };

    const formatMonth = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Build day cells
    const dayCells = [];
    for (let i = 0; i < firstDay; i++) {
      dayCells.push(
        <View key={`empty-${i}`} style={{ width: '14.28%', height: 40 }} />
      );
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const completed = hasCompletedWorkout(day);
      const todayDay = isToday(day);

      // Determine background color
      let bgColor = 'transparent';
      if (completed) {
        bgColor = '#22C55E'; // green-500
      } else if (todayDay) {
        bgColor = isDark ? '#4338CA' : '#E0E7FF'; // indigo-700 or indigo-100
      }

      // Determine text color
      let textColor = isDark ? '#D1D5DB' : '#374151'; // gray-300 or gray-700
      if (completed) {
        textColor = '#FFFFFF';
      } else if (todayDay) {
        textColor = isDark ? '#A5B4FC' : '#4338CA'; // indigo-300 or indigo-700
      }

      dayCells.push(
        <View
          key={`day-${day}`}
          style={{ width: '14.28%', height: 40 }}
          className="items-center justify-center"
        >
          <View
            className="w-8 h-8 items-center justify-center rounded-full"
            style={{ backgroundColor: bgColor }}
          >
            <Text
              className={`text-sm ${completed || todayDay ? 'font-medium' : ''}`}
              style={{ color: textColor }}
            >
              {day}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View
        className={`rounded-2xl p-4 mt-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Calendar color="#6366F1" size={18} />
            <Text className={`ml-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Workout Activity
            </Text>
          </View>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCurrentMonth(newMonth);
              }}
              className="p-2"
            >
              <ChevronLeft color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
            </Pressable>
            <Text className={`text-sm font-medium px-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatMonth(currentMonth)}
            </Text>
            <Pressable
              onPress={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCurrentMonth(newMonth);
              }}
              className="p-2"
            >
              <ChevronRight color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
            </Pressable>
          </View>
        </View>

        {/* Legend */}
        <View className="flex-row items-center justify-end mb-3">
          <View className="flex-row items-center mr-4">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#22C55E',
                marginRight: 6,
              }}
            />
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Workout completed
            </Text>
          </View>
          <View className="flex-row items-center">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: isDark ? '#4338CA' : '#E0E7FF',
                marginRight: 6,
              }}
            />
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Today</Text>
          </View>
        </View>

        {isCalendarLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color="#6366F1" />
          </View>
        ) : (
          <View
            className={`rounded-lg p-3 ${
              isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-100'
            }`}
          >
            {/* Day names */}
            <View className="flex-row mb-2">
              {dayNames.map((day) => (
                <View key={day} style={{ width: '14.28%' }} className="items-center">
                  <Text className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day cells */}
            <View className="flex-row flex-wrap">{dayCells}</View>
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (!isSupabaseConfigured) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AlertCircle color="#F59E0B" size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Supabase Not Configured
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Please add your Supabase credentials to the .env file
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Dumbbell color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sign in to view your workout program
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your personalized training program will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      }
    >
      {/* Today's Workout Header with View Plan link */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Dumbbell size={20} color="#6366F1" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Today's Workout
          </Text>
        </View>

        {assignment?.program_template_id && (
          <Pressable
            onPress={() => router.push(`/workout-plan/${assignment.program_template_id}`)}
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

      {/* Today's Workout Card */}
      <View
        className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {isLoading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : error ? (
          <View className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
            <Text className="text-red-500 text-sm">{error}</Text>
          </View>
        ) : !assignment?.program_template_id ? (
          // No program assigned
          <View className="items-center py-10">
            <Dumbbell color={isDark ? '#4B5563' : '#9CA3AF'} size={48} />
            <Text className={`mt-4 text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              No Active Program
            </Text>
            <Text className={`mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              You don't have an active training program assigned
            </Text>
          </View>
        ) : isRestDay ? (
          // Rest day
          <View className="items-center py-10">
            <Moon color={isDark ? '#60A5FA' : '#3B82F6'} size={48} />
            <Text className={`mt-4 text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Rest Day
            </Text>
            <Text className={`mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Take it easy today and recover for your next workout
            </Text>
          </View>
        ) : todaysWorkout ? (
          // Workout content
          <View>
            {/* Workout header */}
            <View
              style={{
                paddingBottom: 20,
                marginBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#374151' : '#F3F4F6',
              }}
            >
              <Text className="text-lg font-semibold text-indigo-500">
                {todaysWorkout.name}
                {assignment.program_templates?.version &&
                  assignment.program_templates.version > 1 && (
                    <Text className="text-sm font-normal">
                      {' '}
                      v{assignment.program_templates.version}
                    </Text>
                  )}
              </Text>
              {todaysWorkout.day_of_week !== null && (
                <View
                  className="mt-2 px-3 py-1 rounded-full"
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  }}
                >
                  <Text
                    className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}
                  >
                    {getDayName(todaysWorkout.day_of_week)}
                  </Text>
                </View>
              )}
            </View>

            {isCompleted ? (
              // Workout completed
              <View className="items-center py-8">
                <CheckCircle color="#22C55E" size={48} />
                <Text
                  className={`mt-3 text-xl font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}
                >
                  Workout Complete!
                </Text>
                <Text className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  You've completed your workout for today.
                </Text>
                {completionTime && (
                  <Text className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Completed at{' '}
                    {new Date(completionTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
                <View className="flex-row gap-3 mt-6">
                  <Pressable
                    onPress={() => router.push('/workout-history')}
                    className={`px-4 py-2 rounded-lg ${
                      isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'
                    }`}
                  >
                    <Text className={isDark ? 'text-indigo-400' : 'text-indigo-700'}>
                      View History
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/workout-session/${todaysWorkout.id}`)}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}
                  >
                    <Text className={isDark ? 'text-green-400' : 'text-green-700'}>Start Again</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              // Workout not completed - show exercises
              <View>
                {renderExerciseList()}

                {/* Buttons */}
                <View className="mt-4">
                  {!showAllExercises &&
                    todaysWorkout.exercise_instances.length > PREVIEW_COUNT && (
                      <View className="items-center mb-3">
                        <Animated.View
                          style={{
                            backgroundColor: isDark ? '#312E81' : '#E0E7FF',
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 12,
                            opacity: pulseAnim,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: isDark ? '#A5B4FC' : '#4338CA',
                            }}
                          >
                            ↓ Click to start workout ↓
                          </Text>
                        </Animated.View>
                      </View>
                    )}

                  <Pressable
                    onPress={() => router.push(`/workout-session/${todaysWorkout.id}`)}
                    className="bg-indigo-500 rounded-xl py-4 flex-row items-center justify-center"
                  >
                    <PlayCircle color="#FFFFFF" size={20} />
                    <Text className="text-white font-semibold ml-2">Start Workout</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push('/workout-history')}
                    className="rounded-xl py-4 flex-row items-center justify-center mt-3"
                    style={{ backgroundColor: isDark ? '#374151' : '#1F2937' }}
                  >
                    <Calendar color="#FFFFFF" size={20} />
                    <Text className="text-white font-medium ml-2">View History</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Calendar - only show if program is assigned */}
      {assignment?.program_template_id && renderCalendar()}
    </ScrollView>
  );
}
