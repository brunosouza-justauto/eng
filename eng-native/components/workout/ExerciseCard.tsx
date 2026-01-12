import { View, Text, TextInput, Pressable } from 'react-native';
import { CheckCircle, Play, Star, AlertTriangle, Zap, Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ExerciseInstanceData, SetType, cleanExerciseName } from '../../types/workout';
import { SetInputState, getSetTypeLabel, FeedbackRecommendation } from '../../types/workoutSession';

interface ExerciseCardProps {
  exercise: ExerciseInstanceData;
  index: number;
  exerciseInputs: SetInputState[];
  isWorkoutStarted: boolean;
  isSetCompleted: (setIndex: number) => boolean;
  onSetComplete: (setIndex: number, restSeconds: number | null) => void;
  onInputChange: (setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onViewDemo?: (exerciseDbId: string | number, exerciseName: string) => void;
  onRepsPress?: (exerciseId: string, setIndex: number, currentReps: number) => void;
  onFeedbackPress?: (exerciseId: string, exerciseName: string) => void;
  hasFeedback?: boolean;
  recommendations?: FeedbackRecommendation[];
  previousNotes?: string | null;
  isInGroup?: boolean;
  isLastInGroup?: boolean;
}

/**
 * Card component displaying a single exercise with its sets table
 */
export const ExerciseCard = ({
  exercise,
  index,
  exerciseInputs,
  isWorkoutStarted,
  isSetCompleted,
  onSetComplete,
  onInputChange,
  onViewDemo,
  onRepsPress,
  onFeedbackPress,
  hasFeedback = false,
  recommendations = [],
  previousNotes,
  isInGroup = false,
  isLastInGroup = false,
}: ExerciseCardProps) => {
  const { isDark } = useTheme();

  const setsData = exercise.sets_data || [];
  const numSets = setsData.length > 0 ? setsData.length : parseInt(exercise.sets || '0', 10);

  const handleViewDemo = () => {
    if (onViewDemo && exercise.exercise_db_id) {
      onViewDemo(exercise.exercise_db_id, exercise.exercise_name);
    }
  };

  return (
    <View
      style={{
        marginBottom: isInGroup ? (isLastInGroup ? 0 : 8) : 16,
        borderRadius: 12,
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* Exercise Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isDark ? '#4F46E5' : '#6366F1',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
            {index + 1}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
            numberOfLines={2}
          >
            {cleanExerciseName(exercise.exercise_name)}
          </Text>
          {exercise.notes && (
            <Text
              style={{
                fontSize: 12,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginTop: 4,
                fontStyle: 'italic',
              }}
            >
              {exercise.notes}
            </Text>
          )}
        </View>

        {/* Tags */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {exercise.is_bodyweight && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
              }}
            >
              <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '600' }}>BW</Text>
            </View>
          )}
          {exercise.each_side && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
              }}
            >
              <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>Each Side</Text>
            </View>
          )}
          {/* View Demo Button */}
          {exercise.exercise_db_id && onViewDemo && (
            <Pressable
              onPress={handleViewDemo}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              }}
            >
              <Play size={12} color={isDark ? '#A5B4FC' : '#6366F1'} fill={isDark ? '#A5B4FC' : '#6366F1'} />
              <Text
                style={{
                  marginLeft: 4,
                  fontSize: 11,
                  fontWeight: '600',
                  color: isDark ? '#A5B4FC' : '#6366F1',
                }}
              >
                Demo
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Recommendations and notes from previous session */}
      {(recommendations.length > 0 || previousNotes) && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: isDark ? '#9CA3AF' : '#6B7280',
              marginBottom: 6,
            }}
          >
            PREVIOUS SESSION FEEDBACK
          </Text>
          {recommendations.map((rec, idx) => {
            const getRecommendationStyle = () => {
              switch (rec.type) {
                case 'pain':
                  return {
                    bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                    icon: <AlertTriangle size={14} color="#EF4444" />,
                  };
                case 'pump':
                  return {
                    bg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6',
                    icon: <Zap size={14} color="#3B82F6" />,
                  };
                case 'workload':
                  return {
                    bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                    color: '#F59E0B',
                    icon: <Dumbbell size={14} color="#F59E0B" />,
                  };
                default:
                  return {
                    bg: isDark ? '#374151' : '#F3F4F6',
                    color: isDark ? '#D1D5DB' : '#374151',
                    icon: null,
                  };
              }
            };
            const style = getRecommendationStyle();
            return (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: style.bg,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 4,
                }}
              >
                {style.icon}
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: style.color,
                    flex: 1,
                  }}
                >
                  {rec.message}
                </Text>
              </View>
            );
          })}
          {/* Previous notes */}
          {previousNotes && (
            <View
              style={{
                backgroundColor: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(107, 114, 128, 0.1)',
                borderRadius: 8,
                padding: 10,
                marginTop: recommendations.length > 0 ? 4 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginBottom: 4,
                }}
              >
                Notes:
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#D1D5DB' : '#374151',
                  fontStyle: 'italic',
                }}
              >
                "{previousNotes}"
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Sets Table */}
      <View style={{ padding: 12 }}>
        {/* Header Row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 10,
            marginBottom: 4,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#374151' : '#E5E7EB',
            minHeight: 24,
          }}
        >
          <View style={{ width: 70 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              TYPE
            </Text>
          </View>
          <View style={{ width: 70, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              WEIGHT
            </Text>
          </View>
          <View style={{ width: 55, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              REPS
            </Text>
          </View>
          <View style={{ width: 50, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              REST
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              DONE
            </Text>
          </View>
        </View>

        {/* Set Rows */}
        {Array.from({ length: numSets }, (_, setIndex) => {
          const setData = setsData[setIndex];
          const input = exerciseInputs[setIndex] || { weight: '', reps: '' };
          const completed = isSetCompleted(setIndex);
          const setType = setData?.type || exercise.set_type;
          const restSeconds = exercise.rest_period_seconds;

          // Validation: check if weight (for non-bodyweight) and reps are filled
          const isWeightValid = exercise.is_bodyweight || (input.weight.trim() !== '');
          const isRepsValid = input.reps.trim() !== '';
          const canComplete = isWeightValid && isRepsValid;

          return (
            <View
              key={`set-${setIndex}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: setIndex < numSets - 1 ? 1 : 0,
                borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                opacity: completed ? 0.6 : 1,
                minHeight: 48,
              }}
            >
              {/* Type */}
              <View style={{ width: 70 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      setType === SetType.WARMUP
                        ? '#F59E0B'
                        : setType === SetType.FAILURE
                          ? '#EF4444'
                          : isDark
                            ? '#D1D5DB'
                            : '#374151',
                  }}
                  numberOfLines={1}
                >
                  {getSetTypeLabel(setType)}
                </Text>
              </View>

              {/* Weight Input */}
              <View style={{ width: 70, alignItems: 'center' }}>
                {exercise.is_bodyweight ? (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    BW
                  </Text>
                ) : (
                  <TextInput
                    value={input.weight}
                    onChangeText={(v) => onInputChange(setIndex, 'weight', v)}
                    keyboardType="decimal-pad"
                    editable={!completed}
                    onFocus={() => {
                      // This will trigger the start prompt if workout hasn't started
                      if (!isWorkoutStarted) {
                        onInputChange(setIndex, 'weight', input.weight);
                      }
                    }}
                    style={{
                      width: 58,
                      height: 36,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: isDark ? '#4B5563' : '#D1D5DB',
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                      textAlign: 'center',
                      fontSize: 14,
                      paddingHorizontal: 4,
                    }}
                    placeholder="kg"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                )}
              </View>

              {/* Reps Input */}
              <View style={{ width: 55, alignItems: 'center' }}>
                <Pressable
                  onPress={() => {
                    if (onRepsPress) {
                      const currentReps = parseInt(input.reps, 10) || 10;
                      onRepsPress(exercise.id, setIndex, currentReps);
                    }
                  }}
                  disabled={completed}
                  style={{
                    width: 48,
                    height: 36,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: isDark ? '#4B5563' : '#D1D5DB',
                    backgroundColor: isDark ? '#374151' : '#F9FAFB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: input.reps
                        ? (isDark ? '#F3F4F6' : '#1F2937')
                        : (isDark ? '#6B7280' : '#9CA3AF'),
                      fontWeight: input.reps ? '500' : '400',
                    }}
                  >
                    {input.reps || '0'}
                  </Text>
                </Pressable>
              </View>

              {/* Rest */}
              <View style={{ width: 50, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                  }}
                >
                  {restSeconds ? `${restSeconds}s` : '-'}
                </Text>
              </View>

              {/* Done Checkbox */}
              <Pressable
                onPress={() => onSetComplete(setIndex, restSeconds)}
                disabled={!isWorkoutStarted ? false : (!completed && !canComplete)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  opacity: !isWorkoutStarted ? 0.6 : (completed || canComplete) ? 1 : 0.4,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: completed
                      ? '#22C55E'
                      : !canComplete
                        ? isDark ? '#374151' : '#E5E7EB'
                        : isDark ? '#4B5563' : '#D1D5DB',
                    backgroundColor: completed ? '#22C55E' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {completed && <CheckCircle size={18} color="#FFFFFF" />}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Feedback Button - at the bottom */}
      {isWorkoutStarted && onFeedbackPress && (
        <Pressable
          onPress={() => onFeedbackPress(exercise.id, exercise.exercise_name)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 12,
            marginBottom: 12,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: hasFeedback
              ? isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)'
              : isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            borderWidth: 1,
            borderColor: hasFeedback
              ? isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'
              : isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
          }}
        >
          <Star
            size={14}
            color={hasFeedback ? '#22C55E' : '#3B82F6'}
            fill={hasFeedback ? '#22C55E' : 'transparent'}
          />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 13,
              fontWeight: '500',
              color: hasFeedback ? '#22C55E' : '#3B82F6',
            }}
          >
            {hasFeedback ? 'Feedback Added' : 'Add Feedback'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default ExerciseCard;
