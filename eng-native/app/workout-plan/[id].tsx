import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  WorkoutData,
  ExerciseInstanceData,
  ExerciseGroupType,
  getDayName,
  cleanExerciseName
} from '../../types/workout';

interface ProgramData {
  id: string;
  name: string;
  description: string | null;
  phase: string | null;
  weeks: number;
  workouts: WorkoutData[];
}

export default function WorkoutPlanScreen() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProgramData();
    }
  }, [id]);

  const fetchProgramData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch basic program info
      const { data: programInfo, error: programError } = await supabase
        .from('program_templates')
        .select('id, name, description, phase, weeks')
        .eq('id', id)
        .single();

      if (programError) throw programError;
      if (!programInfo) throw new Error('Program not found');

      // Fetch all workouts for this program
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          day_of_week,
          week_number,
          order_in_program,
          description,
          exercise_instances (
            id,
            exercise_db_id,
            exercise_name,
            sets,
            reps,
            rest_period_seconds,
            tempo,
            notes,
            order_in_workout,
            set_type,
            sets_data,
            group_id,
            group_type,
            group_order,
            is_bodyweight,
            each_side
          )
        `)
        .eq('program_template_id', id)
        .order('day_of_week', { ascending: true })
        .order('order_in_program', { ascending: true });

      if (workoutsError) throw workoutsError;

      setProgramData({
        ...programInfo,
        workouts: workoutsData || []
      });
    } catch (err: any) {
      console.error('Error loading workout plan:', err);
      setError('Failed to load workout plan details');
    } finally {
      setIsLoading(false);
    }
  };

  // Group exercises by their group_id for supersets/bi-sets/etc.
  const groupExercises = (exercises: ExerciseInstanceData[]) => {
    const sortedExercises = [...exercises].sort((a, b) =>
      (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0)
    );

    const result: {
      group: ExerciseInstanceData[];
      groupType: ExerciseGroupType | null;
      groupId: string | null;
    }[] = [];

    const processedGroupIds = new Set<string>();

    for (const exercise of sortedExercises) {
      // If exercise has a group_id and we haven't processed this group yet
      if (exercise.group_id && !processedGroupIds.has(exercise.group_id)) {
        // Find all exercises in this group
        const groupExercises = sortedExercises.filter(e => e.group_id === exercise.group_id);

        if (groupExercises.length >= 2) {
          result.push({
            group: groupExercises.sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0)),
            groupType: exercise.group_type || ExerciseGroupType.SUPERSET,
            groupId: exercise.group_id
          });
          processedGroupIds.add(exercise.group_id);
        } else {
          // Single exercise with group_id, treat as regular
          result.push({
            group: [exercise],
            groupType: null,
            groupId: null
          });
          processedGroupIds.add(exercise.group_id);
        }
      } else if (!exercise.group_id) {
        // Regular exercise without group
        result.push({
          group: [exercise],
          groupType: null,
          groupId: null
        });
      }
    }

    return result;
  };

  // Get group type label
  const getGroupTypeLabel = (groupType: ExerciseGroupType | null): string => {
    switch (groupType) {
      case ExerciseGroupType.SUPERSET:
        return 'Superset';
      case ExerciseGroupType.BI_SET:
        return 'Bi-Set';
      case ExerciseGroupType.TRI_SET:
        return 'Tri-Set';
      case ExerciseGroupType.GIANT_SET:
        return 'Giant Set';
      default:
        return 'Superset';
    }
  };

  // Group workouts by day of week
  const getWorkoutsByDay = () => {
    if (!programData?.workouts) return new Map<number, WorkoutData[]>();

    const workoutsByDay = new Map<number, WorkoutData[]>();

    // Initialize with empty arrays for all 7 days
    for (let i = 1; i <= 7; i++) {
      workoutsByDay.set(i, []);
    }

    // Group workouts by day_of_week
    programData.workouts.forEach(workout => {
      if (workout.day_of_week !== null) {
        const day = workout.day_of_week;
        const currentWorkouts = workoutsByDay.get(day) || [];
        workoutsByDay.set(day, [...currentWorkouts, workout]);
      }
    });

    return workoutsByDay;
  };

  // Render exercise item
  const renderExerciseItem = (exercise: ExerciseInstanceData, index: number, isLast: boolean) => (
    <View
      key={exercise.id || index}
      style={{
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? '#374151' : '#E5E7EB'
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: isDark ? '#F3F4F6' : '#1F2937'
        }}
      >
        {cleanExerciseName(exercise.exercise_name)}
      </Text>
      {(exercise.sets || exercise.reps) && (
        <Text
          style={{
            fontSize: 13,
            marginTop: 4,
            color: isDark ? '#9CA3AF' : '#4B5563'
          }}
        >
          {exercise.sets && exercise.reps
            ? `${exercise.sets} sets × ${exercise.reps} reps`
            : exercise.sets
              ? `${exercise.sets} sets`
              : `${exercise.reps} reps`
          }
        </Text>
      )}
    </View>
  );

  // Render a single workout card
  const renderWorkoutCard = (workout: WorkoutData) => {
    const exerciseGroups = groupExercises(workout.exercise_instances);

    return (
      <View
        key={workout.id}
        className={`rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Card Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#374151' : '#E5E7EB'
          }}
        >
          <Dumbbell color="#6366F1" size={18} />
          <Text
            className={`ml-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ fontSize: 16 }}
          >
            {workout.name}
          </Text>
        </View>

        {/* Card Body */}
        <View style={{ padding: 16 }}>
          {workout.description && (
            <Text
              className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              style={{ fontSize: 13, fontStyle: 'italic' }}
            >
              {workout.description}
            </Text>
          )}

          {/* Exercises */}
          <View>
            {exerciseGroups.map((group, groupIndex) => (
              <View
                key={group.groupId || `group-${groupIndex}`}
                style={{
                  marginBottom: groupIndex < exerciseGroups.length - 1 ? 8 : 0,
                  padding: group.groupType ? 12 : 0,
                  borderRadius: 8,
                  backgroundColor: group.groupType
                    ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)')
                    : 'transparent',
                  borderWidth: group.groupType ? 1 : 0,
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'
                }}
              >
                {/* Group label */}
                {group.groupType && (
                  <View style={{ marginBottom: 8 }}>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: isDark ? '#A5B4FC' : '#4F46E5'
                        }}
                      >
                        {getGroupTypeLabel(group.groupType)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Exercises in group */}
                {group.group.map((exercise, exIndex) =>
                  renderExerciseItem(exercise, exIndex, exIndex === group.group.length - 1)
                )}
              </View>
            ))}
          </View>

          {/* Start Workout Button */}
          <Pressable
            onPress={() => router.push(`/workout-session/${workout.id}`)}
            className="mt-4 rounded-lg py-3 items-center bg-indigo-500"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1
            })}
          >
            <Text className="text-white font-semibold" style={{ fontSize: 14 }}>
              Start Workout
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Loading workout plan...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !programData) {
    return (
      <View className={`flex-1 p-4 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <View
          className="rounded-xl p-6"
          style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}
        >
          <Text className="text-red-500 text-lg font-semibold mb-2">
            Error Loading Workout Plan
          </Text>
          <Text className={`${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error || 'Unable to load workout plan data'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 bg-indigo-600 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const workoutsByDay = getWorkoutsByDay();
  const hasWorkouts = programData.workouts && programData.workouts.length > 0;

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Program Header */}
      <View
        className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          style={{ fontSize: 20 }}
        >
          {programData.name}
        </Text>

        {programData.description && (
          <Text
            className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            style={{ fontSize: 14, fontStyle: 'italic' }}
          >
            {programData.description}
          </Text>
        )}

        {/* Tags */}
        <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
          {programData.phase && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#93C5FD' : '#2563EB'
                }}
              >
                {programData.phase}
              </Text>
            </View>
          )}
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: isDark ? '#A5B4FC' : '#4F46E5'
              }}
            >
              {programData.weeks} {programData.weeks === 1 ? 'week' : 'weeks'}
            </Text>
          </View>
        </View>
      </View>

      {/* Weekly Schedule */}
      {hasWorkouts ? (
        <View>
          {Array.from({ length: 7 }, (_, i) => i + 1).map(day => {
            const workoutsForDay = workoutsByDay.get(day) || [];

            return (
              <View key={`day-${day}`} style={{ marginBottom: 24 }}>
                {/* Day Header */}
                <View
                  className="flex-row items-center mb-3"
                  style={{
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#374151' : '#E5E7EB'
                  }}
                >
                  <Calendar
                    color={workoutsForDay.length > 0 ? '#6366F1' : (isDark ? '#6B7280' : '#9CA3AF')}
                    size={18}
                  />
                  <Text
                    className={`ml-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    style={{ fontSize: 16 }}
                  >
                    {getDayName(day)}
                  </Text>
                </View>

                {/* Workouts or Rest Day */}
                {workoutsForDay.length === 0 ? (
                  <View
                    className={`rounded-xl p-4 items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                  >
                    <Text className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Rest Day
                    </Text>
                  </View>
                ) : (
                  workoutsForDay.map(workout => renderWorkoutCard(workout))
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View
          className={`rounded-xl p-6 items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
        >
          <Dumbbell color={isDark ? '#6B7280' : '#9CA3AF'} size={48} />
          <Text
            className={`mt-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            style={{ fontSize: 16 }}
          >
            No Workouts Found
          </Text>
          <Text className={`mt-2 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            There are no workouts defined for this program.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
