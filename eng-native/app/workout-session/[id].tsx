import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, BackHandler, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WorkoutData, ExerciseInstanceData } from '../../types/workout';
import { CompletedSetData, SetInputState } from '../../types/workoutSession';
import { formatTime } from '../../utils/formatters';
import { groupExercises } from '../../utils/exerciseGrouping';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useCountdownTimer } from '../../hooks/useCountdownTimer';
import {
  getWorkoutById,
  startWorkoutSession,
  completeWorkoutSession,
  cancelWorkoutSession,
  saveCompletedSet,
  removeCompletedSet,
  getPendingSession,
  getCompletedSetsForSession,
  deletePendingSession,
  getLastWorkoutSets,
  saveExerciseFeedback,
  getSessionFeedback,
  getPreviousFeedback,
  PendingSession,
  PreviousSetData,
} from '../../services/workoutService';
import { ExerciseFeedback, FeedbackRecommendation } from '../../types/workoutSession';

// Components
import ConfirmationModal from '../../components/ConfirmationModal';
import ExerciseCard from '../../components/workout/ExerciseCard';
import ExerciseGroupContainer from '../../components/workout/ExerciseGroupContainer';
import RestTimerBanner from '../../components/workout/RestTimerBanner';
import WorkoutSessionHeader from '../../components/workout/WorkoutSessionHeader';
import WorkoutActionButtons from '../../components/workout/WorkoutActionButtons';
import ExerciseDemoModal from '../../components/workout/ExerciseDemoModal';
import RestTimePickerModal from '../../components/workout/RestTimePickerModal';
import RepsPickerModal from '../../components/workout/RepsPickerModal';
import CountdownPickerModal from '../../components/workout/CountdownPickerModal';
import CountdownTimerBanner from '../../components/workout/CountdownTimerBanner';
import PendingSessionModal from '../../components/workout/PendingSessionModal';
import ExerciseFeedbackModal from '../../components/workout/ExerciseFeedbackModal';

export default function WorkoutSessionScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Workout data
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session state
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [workoutSessionId, setWorkoutSessionId] = useState<string | null>(null);

  // Set tracking
  const [completedSets, setCompletedSets] = useState<Map<string, CompletedSetData[]>>(new Map());
  const [setInputs, setSetInputs] = useState<Map<string, SetInputState[]>>(new Map());

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoExerciseId, setDemoExerciseId] = useState<string | number | null>(null);
  const [demoExerciseName, setDemoExerciseName] = useState<string>('');
  const [showRestTimePicker, setShowRestTimePicker] = useState(false);
  const [customRestTime, setCustomRestTime] = useState<number | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  const [repsPickerExerciseId, setRepsPickerExerciseId] = useState<string | null>(null);
  const [repsPickerSetIndex, setRepsPickerSetIndex] = useState<number>(0);
  const [repsPickerCurrentValue, setRepsPickerCurrentValue] = useState<number>(10);

  // Pending session recovery
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCompletedSetsCount, setPendingCompletedSetsCount] = useState(0);
  const [isHandlingPending, setIsHandlingPending] = useState(false);

  // Countdown picker
  const [showCountdownPicker, setShowCountdownPicker] = useState(false);

  // Feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackExerciseId, setFeedbackExerciseId] = useState<string | null>(null);
  const [feedbackExerciseName, setFeedbackExerciseName] = useState<string>('');
  const [sessionFeedback, setSessionFeedback] = useState<Map<string, ExerciseFeedback>>(new Map());
  const [exerciseRecommendations, setExerciseRecommendations] = useState<Map<string, FeedbackRecommendation[]>>(new Map());
  const [previousFeedbackNotes, setPreviousFeedbackNotes] = useState<Map<string, string>>(new Map());

  // Timers
  const workoutTimer = useWorkoutTimer();
  const restTimer = useRestTimer();
  const countdownTimer = useCountdownTimer();

  // Fetch workout data (only on initial load, not on token refresh)
  useEffect(() => {
    if (id && user?.id && !workout) {
      fetchWorkout();
    }
  }, [id, user?.id]);

  // Prevent accidental back navigation on Android when workout is active or pending modal is shown
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isWorkoutStarted) {
        // Show cancel modal instead of navigating back
        setShowCancelModal(true);
        return true; // Prevent default back behavior
      }
      if (showPendingModal) {
        // Prevent back when pending session modal is visible
        return true;
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [isWorkoutStarted, showPendingModal]);

  const fetchWorkout = async () => {
    if (!id || !user?.id) return;

    setIsLoading(true);
    setError(null);

    const { workout: workoutData, error: fetchError } = await getWorkoutById(id);

    if (fetchError || !workoutData) {
      setError(fetchError || 'Workout not found');
      setIsLoading(false);
      return;
    }

    setWorkout(workoutData);

    // Fetch previous workout sets to pre-fill weights
    const { sets: previousSets } = await getLastWorkoutSets(id, user.id);
    initializeSetInputs(workoutData, previousSets);

    // Load previous feedback recommendations and notes for each exercise
    const recommendations = new Map<string, FeedbackRecommendation[]>();
    const notes = new Map<string, string>();
    for (const exercise of workoutData.exercise_instances) {
      const { feedback, recommendations: recs } = await getPreviousFeedback(exercise.id, user.id);
      if (recs.length > 0) {
        recommendations.set(exercise.id, recs);
      }
      if (feedback?.notes) {
        notes.set(exercise.id, feedback.notes);
      }
    }
    setExerciseRecommendations(recommendations);
    setPreviousFeedbackNotes(notes);

    // Check for pending session
    const { session } = await getPendingSession(id, user.id);
    if (session) {
      setPendingSession(session);
      // Get count of completed sets for the pending session
      const { sets } = await getCompletedSetsForSession(session.id);
      setPendingCompletedSetsCount(sets.length);
      setShowPendingModal(true);
    }

    setIsLoading(false);
  };

  const initializeSetInputs = (
    workoutData: WorkoutData,
    previousSets?: Map<string, PreviousSetData[]>
  ) => {
    const inputs = new Map<string, SetInputState[]>();

    workoutData.exercise_instances.forEach((exercise) => {
      const setsData = exercise.sets_data || [];
      const numSets = setsData.length > 0 ? setsData.length : parseInt(exercise.sets || '0', 10);
      const prevExerciseSets = previousSets?.get(exercise.id) || [];

      const exerciseInputs: SetInputState[] = [];
      for (let i = 0; i < numSets; i++) {
        const setData = setsData[i];
        // Find previous set data for this set order (1-based)
        const prevSetData = prevExerciseSets.find((s) => s.setOrder === i + 1);

        // Priority: 1) Bodyweight, 2) Previous workout weight, 3) Template weight, 4) Empty
        let weight = '';
        if (exercise.is_bodyweight) {
          weight = 'BW';
        } else if (prevSetData?.weight !== null && prevSetData?.weight !== undefined) {
          weight = String(prevSetData.weight);
        } else if (setData?.weight) {
          weight = setData.weight;
        }

        // Priority: 1) Previous workout reps, 2) Template reps, 3) Exercise default reps
        let reps = '';
        if (prevSetData?.reps !== null && prevSetData?.reps !== undefined && prevSetData.reps > 0) {
          reps = String(prevSetData.reps);
        } else if (setData?.reps) {
          reps = setData.reps;
        } else if (exercise.reps) {
          reps = exercise.reps;
        }

        exerciseInputs.push({ weight, reps });
      }
      inputs.set(exercise.id, exerciseInputs);
    });

    setSetInputs(inputs);
  };

  const handleStartWorkout = async () => {
    if (!user?.id || !id) return;

    const { sessionId, error: startError } = await startWorkoutSession(id, user.id);

    if (startError || !sessionId) {
      console.error('Failed to start workout:', startError);
      return;
    }

    setWorkoutSessionId(sessionId);
    setIsWorkoutStarted(true);
    workoutTimer.start();
  };

  const handlePauseWorkout = () => {
    if (workoutTimer.isPaused) {
      workoutTimer.resume();
    } else {
      workoutTimer.pause();
    }
  };

  const handleCancelWorkout = async () => {
    if (workoutSessionId) {
      await cancelWorkoutSession(workoutSessionId);
    }

    setShowCancelModal(false);
    router.back();
  };

  const handleCompleteWorkout = async () => {
    if (!workoutSessionId) return;

    await completeWorkoutSession(workoutSessionId, workoutTimer.elapsedTime);

    setShowCompleteModal(false);
    router.back();
  };

  const handleToggleSetComplete = async (
    exerciseId: string,
    setIndex: number,
    restSeconds: number | null
  ) => {
    if (!workoutSessionId || !workout) return;

    // Find the exercise and check if it's part of a group
    const exercise = workout.exercise_instances.find(e => e.id === exerciseId);
    if (!exercise) return;

    // Get all exercises in the same group (if any)
    const exercisesInGroup = exercise.group_id
      ? workout.exercise_instances.filter(e => e.group_id === exercise.group_id)
      : [exercise];

    const exerciseInputs = setInputs.get(exerciseId) || [];
    const input = exerciseInputs[setIndex];
    if (!input) return;

    const currentCompleted = completedSets.get(exerciseId) || [];
    const isCurrentlyCompleted = currentCompleted.some(
      (s) => s.setOrder === setIndex + 1 && s.isCompleted
    );

    if (isCurrentlyCompleted) {
      // Uncomplete the set - also uncomplete for all exercises in the group
      const newCompletedSets = new Map(completedSets);

      for (const groupExercise of exercisesInGroup) {
        const groupCompleted = newCompletedSets.get(groupExercise.id) || [];
        const updatedSets = groupCompleted.filter((s) => s.setOrder !== setIndex + 1);
        newCompletedSets.set(groupExercise.id, updatedSets);

        await removeCompletedSet(workoutSessionId, groupExercise.id, setIndex + 1);
      }

      setCompletedSets(newCompletedSets);

      // Stop rest timer if it's running
      if (restTimer.isActive) {
        restTimer.stop();
      }
    } else {
      // Complete the set - also complete for all exercises in the group
      const newCompletedSets = new Map(completedSets);

      for (const groupExercise of exercisesInGroup) {
        const groupInputs = setInputs.get(groupExercise.id) || [];
        const groupInput = groupInputs[setIndex];

        // Skip if this exercise doesn't have this set or inputs aren't filled
        if (!groupInput) continue;

        const groupCompleted = newCompletedSets.get(groupExercise.id) || [];

        const newSet: CompletedSetData = {
          exerciseInstanceId: groupExercise.id,
          setOrder: setIndex + 1,
          weight: groupInput.weight,
          reps: parseInt(groupInput.reps, 10) || 0,
          isCompleted: true,
        };

        const updatedSets = [...groupCompleted.filter((s) => s.setOrder !== setIndex + 1), newSet];
        newCompletedSets.set(groupExercise.id, updatedSets);

        const weightValue = groupInput.weight === 'BW' ? null : parseFloat(groupInput.weight) || null;
        await saveCompletedSet(
          workoutSessionId,
          groupExercise.id,
          setIndex + 1,
          weightValue,
          parseInt(groupInput.reps, 10) || 0
        );
      }

      setCompletedSets(newCompletedSets);

      // Start rest timer - use custom time, or find rest time from the group
      // (typically set on the last exercise in a superset)
      let effectiveRestTime = customRestTime;
      if (effectiveRestTime === null) {
        // Find the rest time from the group - use the last non-zero rest time
        for (const groupExercise of exercisesInGroup) {
          if (groupExercise.rest_period_seconds && groupExercise.rest_period_seconds > 0) {
            effectiveRestTime = groupExercise.rest_period_seconds;
          }
        }
      }

      if (effectiveRestTime && effectiveRestTime > 0) {
        restTimer.start(effectiveRestTime, exerciseId);
      }
    }
  };

  const updateSetInput = (
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    const exerciseInputs = setInputs.get(exerciseId) || [];
    const updatedInputs = [...exerciseInputs];
    if (updatedInputs[setIndex]) {
      updatedInputs[setIndex] = { ...updatedInputs[setIndex], [field]: value };
      setSetInputs(new Map(setInputs.set(exerciseId, updatedInputs)));
    }
  };

  const isSetCompleted = (exerciseId: string, setIndex: number): boolean => {
    const exerciseSets = completedSets.get(exerciseId) || [];
    return exerciseSets.some((s) => s.setOrder === setIndex + 1 && s.isCompleted);
  };

  const getCompletedSetsCount = (): number => {
    let count = 0;
    completedSets.forEach((sets) => {
      // Use a Set to avoid counting duplicate setOrders for the same exercise
      const uniqueSetOrders = new Set<number>();
      sets.forEach((s) => {
        if (s.isCompleted) {
          uniqueSetOrders.add(s.setOrder);
        }
      });
      count += uniqueSetOrders.size;
    });
    return count;
  };

  const getTotalSetsCount = (): number => {
    if (!workout) return 0;
    return workout.exercise_instances.reduce((total, ex) => {
      const setsData = ex.sets_data || [];
      return total + (setsData.length > 0 ? setsData.length : parseInt(ex.sets || '0', 10));
    }, 0);
  };

  const handleBackPress = () => {
    if (isWorkoutStarted) {
      setShowCancelModal(true);
    } else {
      router.back();
    }
  };

  const handleViewDemo = (exerciseDbId: string | number, exerciseName: string) => {
    setDemoExerciseId(exerciseDbId);
    setDemoExerciseName(exerciseName);
    setShowDemoModal(true);
  };

  const handleRepsPress = (exerciseId: string, setIndex: number, currentReps: number) => {
    setRepsPickerExerciseId(exerciseId);
    setRepsPickerSetIndex(setIndex);
    setRepsPickerCurrentValue(currentReps);
    setShowRepsPicker(true);
  };

  const handleRepsSelect = (reps: number) => {
    if (repsPickerExerciseId !== null) {
      updateSetInput(repsPickerExerciseId, repsPickerSetIndex, 'reps', String(reps));
    }
  };

  // Feedback handlers
  const handleFeedbackPress = (exerciseId: string, exerciseName: string) => {
    setFeedbackExerciseId(exerciseId);
    setFeedbackExerciseName(exerciseName);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async (feedback: {
    painLevel: number | null;
    pumpLevel: number | null;
    workloadLevel: number | null;
    notes: string;
  }) => {
    if (!workoutSessionId || !feedbackExerciseId) return;

    const feedbackData = {
      workout_session_id: workoutSessionId,
      exercise_instance_id: feedbackExerciseId,
      pain_level: feedback.painLevel,
      pump_level: feedback.pumpLevel,
      workload_level: feedback.workloadLevel,
      notes: feedback.notes || null,
    };

    const { success } = await saveExerciseFeedback(feedbackData);

    if (success) {
      // Update local state
      const newFeedback = new Map(sessionFeedback);
      newFeedback.set(feedbackExerciseId, feedbackData as ExerciseFeedback);
      setSessionFeedback(newFeedback);
    }
  };

  // Pending session handlers
  const handleResumePendingSession = async () => {
    if (!pendingSession || !workout) return;

    setIsHandlingPending(true);

    // Load completed sets from the pending session
    const { sets } = await getCompletedSetsForSession(pendingSession.id);

    // Rebuild completed sets state
    const newCompletedSets = new Map<string, CompletedSetData[]>();
    const newSetInputs = new Map(setInputs);

    sets.forEach((set) => {
      const exerciseSets = newCompletedSets.get(set.exerciseInstanceId) || [];
      exerciseSets.push({
        exerciseInstanceId: set.exerciseInstanceId,
        setOrder: set.setOrder,
        weight: set.weight !== null ? String(set.weight) : 'BW',
        reps: set.reps,
        isCompleted: true,
      });
      newCompletedSets.set(set.exerciseInstanceId, exerciseSets);

      // Update input values
      const inputs = newSetInputs.get(set.exerciseInstanceId) || [];
      if (inputs[set.setOrder - 1]) {
        inputs[set.setOrder - 1] = {
          weight: set.weight !== null ? String(set.weight) : 'BW',
          reps: String(set.reps),
        };
        newSetInputs.set(set.exerciseInstanceId, inputs);
      }
    });

    setCompletedSets(newCompletedSets);
    setSetInputs(newSetInputs);
    setWorkoutSessionId(pendingSession.id);
    setIsWorkoutStarted(true);

    // Calculate elapsed time from session start
    const startTime = new Date(pendingSession.startTime).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    workoutTimer.start();
    // Note: The timer will start from 0, but that's OK for resumption

    setShowPendingModal(false);
    setPendingSession(null);
    setIsHandlingPending(false);
  };

  const handleDiscardPendingSession = async () => {
    if (!pendingSession) return;

    setIsHandlingPending(true);
    await deletePendingSession(pendingSession.id);
    setShowPendingModal(false);
    setPendingSession(null);
    setIsHandlingPending(false);
  };

  const handleCompletePendingSession = async () => {
    if (!pendingSession) return;

    setIsHandlingPending(true);

    // Calculate duration from start time to now
    const startTime = new Date(pendingSession.startTime).getTime();
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    await completeWorkoutSession(pendingSession.id, durationSeconds);
    setShowPendingModal(false);
    setPendingSession(null);
    setIsHandlingPending(false);
  };

  // Group exercises for supersets/bi-sets/etc.
  const exerciseGroups = useMemo(() => {
    if (!workout) return [];
    return groupExercises(workout.exercise_instances);
  }, [workout]);

  // Calculate estimated workout duration
  const estimatedDuration = useMemo(() => {
    if (!workout) return 0;

    const AVG_TIME_PER_SET = 40; // seconds for regular exercises
    const DEFAULT_REST_TIME = 60; // seconds
    const TRANSITION_TIME = 45; // seconds between exercises

    // Keywords that indicate time-based exercises
    const TIME_BASED_KEYWORDS = [
      'plank', 'hold', 'cardio', 'bike', 'treadmill', 'elliptical',
      'rowing', 'stairmaster', 'walk', 'run', 'jog', 'sprint',
      'cycle', 'cycling', 'hiit', 'stretch', 'iso', 'isometric',
      'dead hang', 'hang', 'wall sit', 'farmer'
    ];

    const isTimeBased = (exerciseName: string): boolean => {
      const nameLower = exerciseName.toLowerCase();
      return TIME_BASED_KEYWORDS.some(keyword => nameLower.includes(keyword));
    };

    let totalSeconds = 0;
    const exercises = workout.exercise_instances;

    exercises.forEach((exercise, index) => {
      const setsData = exercise.sets_data || [];
      const numSets = setsData.length > 0 ? setsData.length : parseInt(exercise.sets || '0', 10);
      // Use custom rest time if set, otherwise use exercise's rest time or default
      const restTime = customRestTime !== null
        ? customRestTime
        : (exercise.rest_period_seconds || DEFAULT_REST_TIME);

      // Determine time per set based on exercise type
      let timePerSet = AVG_TIME_PER_SET;
      if (isTimeBased(exercise.exercise_name)) {
        // For time-based exercises, use the reps value as seconds
        // Common formats: "60" (60 sec), "30" (30 sec), etc.
        const repsValue = parseInt(exercise.reps || '0', 10);
        if (repsValue > 0) {
          timePerSet = repsValue; // Treat reps as seconds for time-based exercises
        } else {
          timePerSet = 60; // Default 1 minute for time-based if no value
        }
      }

      // Time to perform all sets
      totalSeconds += numSets * timePerSet;

      // Rest time between sets (sets - 1 rest periods per exercise)
      // But for supersets, only the last exercise has rest
      if (exercise.group_id) {
        // Check if this is the last exercise in its group
        const groupExercises = exercises.filter(e => e.group_id === exercise.group_id);
        const isLastInGroup = groupExercises[groupExercises.length - 1]?.id === exercise.id;
        if (isLastInGroup && numSets > 0) {
          totalSeconds += numSets * restTime; // Rest after each superset round
        }
      } else {
        // Regular exercise - rest between sets
        if (numSets > 1) {
          totalSeconds += (numSets - 1) * restTime;
        }
      }

      // Transition time (except for exercises in the same group)
      const nextExercise = exercises[index + 1];
      if (nextExercise && nextExercise.group_id !== exercise.group_id) {
        totalSeconds += TRANSITION_TIME;
      }
    });

    return totalSeconds;
  }, [workout, customRestTime]);

  // Get the overall index for an exercise (for numbering)
  const getExerciseIndex = (exerciseId: string): number => {
    if (!workout) return 0;
    return workout.exercise_instances.findIndex(e => e.id === exerciseId);
  };

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
        <Text style={{ marginTop: 16, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          Loading workout...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !workout) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>
          {error || 'Workout not found'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: '#6366F1',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
      {/* Header */}
      <WorkoutSessionHeader
        workoutName={workout.name}
        elapsedTime={workoutTimer.elapsedTime}
        isPaused={workoutTimer.isPaused}
        isWorkoutStarted={isWorkoutStarted}
        completedSets={getCompletedSetsCount()}
        totalSets={getTotalSetsCount()}
        topInset={insets.top}
        onBackPress={handleBackPress}
        customRestTime={customRestTime}
        onTimerSettingsPress={() => setShowRestTimePicker(true)}
        onCountdownPress={() => setShowCountdownPicker(true)}
        estimatedDuration={estimatedDuration}
      />

      {/* Countdown Timer Banner */}
      {countdownTimer.isActive && (
        <CountdownTimerBanner
          timeRemaining={countdownTimer.timeRemaining}
          totalTime={countdownTimer.totalTime}
          isPaused={countdownTimer.isPaused}
          onSkip={countdownTimer.skip}
          onPause={countdownTimer.pause}
          onResume={countdownTimer.resume}
        />
      )}

      {/* Rest Timer Banner */}
      {restTimer.isActive && (
        <RestTimerBanner
          timeRemaining={restTimer.timeRemaining}
          onSkip={restTimer.skip}
        />
      )}

      {/* Exercise List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Workout Notes/Description Preview */}
        {workout.description && (
          <Pressable
            onPress={() => setShowNotesModal(true)}
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? '#D1D5DB' : '#374151',
                }}
                numberOfLines={1}
              >
                {workout.description}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#6366F1',
              }}
            >
              View notes →
            </Text>
          </Pressable>
        )}

        {exerciseGroups.map((group, groupIndex) => {
          // Check if this is a grouped exercise (superset, bi-set, etc.)
          if (group.groupType && group.exercises.length >= 2) {
            return (
              <ExerciseGroupContainer
                key={group.groupId || `group-${groupIndex}`}
                groupType={group.groupType}
              >
                {group.exercises.map((exercise, exIndex) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    index={getExerciseIndex(exercise.id)}
                    exerciseInputs={setInputs.get(exercise.id) || []}
                    isWorkoutStarted={isWorkoutStarted}
                    isSetCompleted={(setIndex) => isSetCompleted(exercise.id, setIndex)}
                    onSetComplete={(setIndex, restSeconds) =>
                      handleToggleSetComplete(exercise.id, setIndex, restSeconds)
                    }
                    onInputChange={(setIndex, field, value) =>
                      updateSetInput(exercise.id, setIndex, field, value)
                    }
                    onViewDemo={handleViewDemo}
                    onRepsPress={handleRepsPress}
                    onFeedbackPress={handleFeedbackPress}
                    hasFeedback={sessionFeedback.has(exercise.id)}
                    recommendations={exerciseRecommendations.get(exercise.id) || []}
                    previousNotes={previousFeedbackNotes.get(exercise.id)}
                    isInGroup={true}
                    isLastInGroup={exIndex === group.exercises.length - 1}
                  />
                ))}
              </ExerciseGroupContainer>
            );
          }

          // Single exercise (not in a group)
          const exercise = group.exercises[0];
          return (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={getExerciseIndex(exercise.id)}
              exerciseInputs={setInputs.get(exercise.id) || []}
              isWorkoutStarted={isWorkoutStarted}
              isSetCompleted={(setIndex) => isSetCompleted(exercise.id, setIndex)}
              onSetComplete={(setIndex, restSeconds) =>
                handleToggleSetComplete(exercise.id, setIndex, restSeconds)
              }
              onInputChange={(setIndex, field, value) =>
                updateSetInput(exercise.id, setIndex, field, value)
              }
              onViewDemo={handleViewDemo}
              onRepsPress={handleRepsPress}
              onFeedbackPress={handleFeedbackPress}
              hasFeedback={sessionFeedback.has(exercise.id)}
              recommendations={exerciseRecommendations.get(exercise.id) || []}
              previousNotes={previousFeedbackNotes.get(exercise.id)}
            />
          );
        })}

        {/* Spacer for bottom buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <WorkoutActionButtons
        isWorkoutStarted={isWorkoutStarted}
        isPaused={workoutTimer.isPaused}
        bottomInset={insets.bottom}
        onStart={handleStartWorkout}
        onPause={handlePauseWorkout}
        onCancel={() => setShowCancelModal(true)}
        onComplete={() => setShowCompleteModal(true)}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Workout?"
        message="Your progress will be lost. Are you sure you want to cancel this workout?"
        confirmText="Cancel Workout"
        cancelText="Keep Going"
        confirmColor="red"
        onConfirm={handleCancelWorkout}
        onCancel={() => setShowCancelModal(false)}
        reverseButtons
      />

      {/* Complete Confirmation Modal */}
      <ConfirmationModal
        visible={showCompleteModal}
        title="Complete Workout?"
        message="Great job! You completed:"
        confirmText="Finish Workout"
        cancelText="Keep Going"
        confirmColor="green"
        onConfirm={handleCompleteWorkout}
        onCancel={() => setShowCompleteModal(false)}
      >
        <View>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151' }}>
            • {getCompletedSetsCount()} of {getTotalSetsCount()} sets
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151' }}>
            • Duration: {formatTime(workoutTimer.elapsedTime)}
          </Text>
        </View>
      </ConfirmationModal>

      {/* Exercise Demo Modal */}
      <ExerciseDemoModal
        visible={showDemoModal}
        exerciseDbId={demoExerciseId}
        exerciseName={demoExerciseName}
        onClose={() => setShowDemoModal(false)}
      />

      {/* Rest Time Picker Modal */}
      <RestTimePickerModal
        visible={showRestTimePicker}
        currentRestTime={customRestTime}
        onSelect={setCustomRestTime}
        onClose={() => setShowRestTimePicker(false)}
      />

      {/* Reps Picker Modal */}
      <RepsPickerModal
        visible={showRepsPicker}
        currentReps={repsPickerCurrentValue}
        onSelect={handleRepsSelect}
        onClose={() => setShowRepsPicker(false)}
      />

      {/* Countdown Picker Modal */}
      <CountdownPickerModal
        visible={showCountdownPicker}
        onSelect={(seconds) => countdownTimer.start(seconds)}
        onClose={() => setShowCountdownPicker(false)}
      />

      {/* Pending Session Modal */}
      {pendingSession && (
        <PendingSessionModal
          visible={showPendingModal}
          isFromToday={pendingSession.isFromToday}
          sessionDate={pendingSession.startTime}
          completedSetsCount={pendingCompletedSetsCount}
          onResume={handleResumePendingSession}
          onDiscard={handleDiscardPendingSession}
          onComplete={handleCompletePendingSession}
          isLoading={isHandlingPending}
        />
      )}

      {/* Exercise Feedback Modal */}
      <ExerciseFeedbackModal
        visible={showFeedbackModal}
        exerciseName={feedbackExerciseName}
        existingFeedback={feedbackExerciseId ? sessionFeedback.get(feedbackExerciseId) : null}
        onSubmit={handleFeedbackSubmit}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Workout Notes Modal */}
      <Modal
        visible={showNotesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: '90%',
              paddingBottom: insets.bottom,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#374151' : '#E5E7EB',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                Workout Notes
              </Text>
              <Pressable
                onPress={() => setShowNotesModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, color: isDark ? '#9CA3AF' : '#6B7280' }}>✕</Text>
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: isDark ? '#D1D5DB' : '#374151',
                  lineHeight: 24,
                }}
              >
                {workout?.description}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
