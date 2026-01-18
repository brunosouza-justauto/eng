import { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Calendar, Dumbbell, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { supabase } from '../../lib/supabase';
import { getCache, CacheKeys, getLastUserId } from '../../lib/storage';
import { HapticPressable } from '../../components/HapticPressable';
import {
  WorkoutData,
  ExerciseInstanceData,
  ExerciseGroupType,
  cleanExerciseName,
  isEffectiveRestDay,
  ProgramAssignment
} from '../../types/workout';
import { Moon } from 'lucide-react-native';
import i18n from '../../lib/i18n';

interface ProgramData {
  id: string;
  name: string;
  description: string | null;
  phase: string | null;
  weeks: number;
  workouts: WorkoutData[];
}

/**
 * Apply localization to workouts and exercise instances
 */
const applyLocalization = async (
  workouts: any[],
  exerciseDbIds: string[]
): Promise<WorkoutData[]> => {
  const currentLang = i18n.language;

  // Fetch localized exercise names from exercises table
  let exerciseNameMap = new Map<string, { name: string; name_pt: string | null }>();

  if (exerciseDbIds.length > 0) {
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name, name_en, name_pt')
      .in('id', [...new Set(exerciseDbIds)]);

    if (exercises && exercises.length > 0) {
      exercises.forEach((ex) => {
        exerciseNameMap.set(String(ex.id), {
          name: ex.name || ex.name_en || '',
          name_pt: ex.name_pt,
        });
      });
    }
  }

  // Apply localization to workouts
  return workouts.map((workout) => {
    let localizedWorkout = { ...workout };

    // Localize workout name
    if (currentLang === 'pt' && workout.name_pt) {
      localizedWorkout.name = workout.name_pt;
    } else if (workout.name_en) {
      localizedWorkout.name = workout.name_en;
    }

    // Localize workout description
    if (currentLang === 'pt' && workout.description_pt) {
      localizedWorkout.description = workout.description_pt;
    } else if (workout.description_en) {
      localizedWorkout.description = workout.description_en;
    }

    if (!workout.exercise_instances) return localizedWorkout;

    // Localize exercise instances
    const localizedInstances = workout.exercise_instances.map((instance: any) => {
      let localizedInstance = { ...instance };

      // Localize exercise name from exercises table
      if (instance.exercise_db_id) {
        const exerciseData = exerciseNameMap.get(String(instance.exercise_db_id));
        if (exerciseData) {
          if (currentLang === 'pt' && exerciseData.name_pt) {
            localizedInstance.exercise_name = exerciseData.name_pt;
          } else if (exerciseData.name) {
            localizedInstance.exercise_name = exerciseData.name;
          }
        }
      }

      // Localize exercise instance notes
      if (currentLang === 'pt' && instance.notes_pt) {
        localizedInstance.notes = instance.notes_pt;
      } else if (instance.notes_en) {
        localizedInstance.notes = instance.notes_en;
      }

      return localizedInstance;
    });

    return { ...localizedWorkout, exercise_instances: localizedInstances };
  });
};

export default function WorkoutPlanScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Set translated header title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('workout.workoutPlan'),
    });
  }, [navigation, t]);

  // Helper to get translated day name
  const getTranslatedDayName = (dayOfWeek: number | null): string => {
    if (dayOfWeek === null) return '';
    const dayKeys = ['days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday', 'days.sunday'];
    return t(dayKeys[(dayOfWeek - 1) % 7]);
  };

  useEffect(() => {
    if (id) {
      fetchProgramData();
    }
  }, [id]);

  // Try to load program data from cache
  const loadFromCache = async (): Promise<boolean> => {
    try {
      const userId = user?.id || await getLastUserId();
      if (!userId) return false;

      const cached = await getCache<{
        assignment: ProgramAssignment | null;
        workouts: WorkoutData[];
        isCompleted: boolean;
        completionTime: string | null;
      }>(CacheKeys.workoutProgram(userId));

      if (cached?.assignment && cached?.workouts && cached.assignment.program_template_id === id) {
        // Build program data from cached assignment and workouts
        setProgramData({
          id: cached.assignment.program_template_id,
          name: cached.assignment.program_templates?.name || 'Workout Program',
          description: cached.assignment.program_templates?.description || null,
          phase: null, // Not stored in assignment cache
          weeks: 1, // Default, not critical for display
          workouts: cached.workouts
        });
        setIsFromCache(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error loading cached workout plan:', err);
      return false;
    }
  };

  const fetchProgramData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    setIsFromCache(false);

    // If offline, try to load from cache first
    if (!isOnline) {
      const loadedFromCache = await loadFromCache();
      if (loadedFromCache) {
        setIsLoading(false);
        return;
      } else {
        setError(t('workout.noCachedData'));
        setIsLoading(false);
        return;
      }
    }

    try {
      const currentLang = i18n.language;

      // Fetch basic program info with localized columns
      const { data: programInfo, error: programError } = await supabase
        .from('program_templates')
        .select('id, name, description, description_en, description_pt, phase, weeks')
        .eq('id', id)
        .single();

      if (programError) throw programError;
      if (!programInfo) throw new Error('Program not found');

      // Apply localization to program description
      let localizedDescription = programInfo.description;
      if (currentLang === 'pt' && programInfo.description_pt) {
        localizedDescription = programInfo.description_pt;
      } else if (programInfo.description_en) {
        localizedDescription = programInfo.description_en;
      }

      // Fetch all workouts for this program with localized columns
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          name_en,
          name_pt,
          day_of_week,
          week_number,
          order_in_program,
          description,
          description_en,
          description_pt,
          exercise_instances (
            id,
            exercise_db_id,
            exercise_name,
            sets,
            reps,
            rest_period_seconds,
            tempo,
            notes,
            notes_en,
            notes_pt,
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

      // Collect all exercise_db_ids for fetching localized names
      const exerciseDbIds: string[] = [];
      (workoutsData || []).forEach((workout: any) => {
        if (workout.exercise_instances) {
          workout.exercise_instances.forEach((instance: any) => {
            if (instance.exercise_db_id) {
              exerciseDbIds.push(String(instance.exercise_db_id));
            }
          });
        }
      });

      // Apply localization to workouts
      const localizedWorkouts = await applyLocalization(workoutsData || [], exerciseDbIds);

      setProgramData({
        ...programInfo,
        description: localizedDescription,
        workouts: localizedWorkouts
      });
    } catch (err: any) {
      console.error('Error loading workout plan:', err);
      // On network error, try cache as fallback
      const loadedFromCache = await loadFromCache();
      if (!loadedFromCache) {
        setError(t('workout.unableToLoad'));
      }
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
        return t('workout.groupTypes.superset');
      case ExerciseGroupType.BI_SET:
        return t('workout.groupTypes.biSet');
      case ExerciseGroupType.TRI_SET:
        return t('workout.groupTypes.triSet');
      case ExerciseGroupType.GIANT_SET:
        return t('workout.groupTypes.giantSet');
      default:
        return t('workout.groupTypes.superset');
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
            ? t('workout.setsReps', { sets: exercise.sets, reps: exercise.reps })
            : exercise.sets
              ? t('workout.setsOnly', { sets: exercise.sets })
              : t('workout.repsOnly', { reps: exercise.reps })
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

          {/* Start Workout Button or Rest Day indicator */}
          {isEffectiveRestDay(workout) ? (
            <View
              className="mt-4 rounded-lg py-3 items-center flex-row justify-center"
              style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}
            >
              <Moon size={16} color={isDark ? '#60A5FA' : '#3B82F6'} />
              <Text
                className="ml-2 font-semibold"
                style={{ fontSize: 14, color: isDark ? '#60A5FA' : '#3B82F6' }}
              >
                {t('workout.restDay')}
              </Text>
            </View>
          ) : (
            <HapticPressable
              onPress={() => router.push(`/workout-session/${workout.id}`)}
              className="mt-4 rounded-lg py-3 items-center bg-indigo-500"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1
              })}
            >
              <Text className="text-white font-semibold" style={{ fontSize: 14 }}>
                {t('workout.startWorkout')}
              </Text>
            </HapticPressable>
          )}
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
          {t('workout.loadingWorkoutPlan')}
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
            {t('workout.errorLoadingWorkoutPlan')}
          </Text>
          <Text className={`${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error || t('workout.unableToLoad')}
          </Text>
          <HapticPressable
            onPress={() => router.back()}
            className="mt-4 bg-indigo-600 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-semibold">{t('workout.goBack')}</Text>
          </HapticPressable>
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
      {/* Offline Banner */}
      {isFromCache && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.2)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            marginBottom: 16,
            gap: 8,
          }}
        >
          <WifiOff size={16} color={isDark ? '#FBBF24' : '#D97706'} />
          <Text style={{ fontSize: 13, color: isDark ? '#FBBF24' : '#D97706' }}>
            {t('workout.viewingCachedData')}
          </Text>
        </View>
      )}

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
              {programData.weeks} {programData.weeks === 1 ? t('workout.weekSingular') : t('workout.weeks')}
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
                    {getTranslatedDayName(day)}
                  </Text>
                </View>

                {/* Workouts or Rest Day */}
                {workoutsForDay.length === 0 ? (
                  <View
                    className={`rounded-xl p-4 items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                  >
                    <Text className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {t('workout.restDay')}
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
            {t('workout.noWorkoutsFound')}
          </Text>
          <Text className={`mt-2 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('workout.noWorkoutsMessage')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
