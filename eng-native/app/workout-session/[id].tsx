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
  PendingSession,
} from '../../services/workoutService';

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
    initializeSetInputs(workoutData);

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

  const initializeSetInputs = (workoutData: WorkoutData) => {
    const inputs = new Map<string, SetInputState[]>();

    workoutData.exercise_instances.forEach((exercise) => {
      const setsData = exercise.sets_data || [];
      const numSets = setsData.length > 0 ? setsData.length : parseInt(exercise.sets || '0', 10);

      const exerciseInputs: SetInputState[] = [];
      for (let i = 0; i < numSets; i++) {
        const setData = setsData[i];
        exerciseInputs.push({
          weight: exercise.is_bodyweight ? 'BW' : (setData?.weight || ''),
          reps: setData?.reps || exercise.reps || '',
        });
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
    if (!workoutSessionId) return;

    const exerciseInputs = setInputs.get(exerciseId) || [];
    const input = exerciseInputs[setIndex];
    if (!input) return;

    const currentCompleted = completedSets.get(exerciseId) || [];
    const isCurrentlyCompleted = currentCompleted.some(
      (s) => s.setOrder === setIndex + 1 && s.isCompleted
    );

    if (isCurrentlyCompleted) {
      // Uncomplete the set
      const updatedSets = currentCompleted.filter((s) => s.setOrder !== setIndex + 1);
      setCompletedSets(new Map(completedSets.set(exerciseId, updatedSets)));

      // Stop rest timer if it's running
      if (restTimer.isActive) {
        restTimer.stop();
      }

      await removeCompletedSet(workoutSessionId, exerciseId, setIndex + 1);
    } else {
      // Complete the set
      const newSet: CompletedSetData = {
        exerciseInstanceId: exerciseId,
        setOrder: setIndex + 1,
        weight: input.weight,
        reps: parseInt(input.reps, 10) || 0,
        isCompleted: true,
      };

      const updatedSets = [...currentCompleted.filter((s) => s.setOrder !== setIndex + 1), newSet];
      setCompletedSets(new Map(completedSets.set(exerciseId, updatedSets)));

      const weightValue = input.weight === 'BW' ? null : parseFloat(input.weight) || null;
      await saveCompletedSet(
        workoutSessionId,
        exerciseId,
        setIndex + 1,
        weightValue,
        parseInt(input.reps, 10) || 0
      );

      // Start rest timer (use custom time if set, otherwise use exercise default)
      const effectiveRestTime = customRestTime !== null ? customRestTime : restSeconds;
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
      count += sets.filter((s) => s.isCompleted).length;
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
