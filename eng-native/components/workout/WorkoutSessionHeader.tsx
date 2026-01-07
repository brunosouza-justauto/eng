import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, Clock, Timer } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { formatTime } from '../../utils/formatters';

interface WorkoutSessionHeaderProps {
  workoutName: string;
  elapsedTime: number;
  isPaused: boolean;
  isWorkoutStarted: boolean;
  completedSets: number;
  totalSets: number;
  topInset: number;
  onBackPress: () => void;
  customRestTime?: number | null;
  onTimerSettingsPress?: () => void;
  onCountdownPress?: () => void;
}

/**
 * Header component for workout session screen
 */
export const WorkoutSessionHeader = ({
  workoutName,
  elapsedTime,
  isPaused,
  isWorkoutStarted,
  completedSets,
  totalSets,
  topInset,
  onBackPress,
  customRestTime,
  onTimerSettingsPress,
  onCountdownPress,
}: WorkoutSessionHeaderProps) => {
  const { isDark } = useTheme();

  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // Format rest time for display
  const formatRestTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <View
      style={{
        paddingTop: topInset + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#374151' : '#E5E7EB',
      }}
    >
      {/* Top row with back button and title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Pressable onPress={onBackPress} style={{ padding: 4, marginRight: 8 }}>
          <ChevronLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '700',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
          numberOfLines={1}
        >
          {workoutName}
        </Text>

        {/* Header Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Countdown Button */}
          {onCountdownPress && (
            <Pressable
              onPress={onCountdownPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(59, 130, 246, 0.1)',
              }}
            >
              <Timer size={14} color="#3B82F6" />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#3B82F6',
                }}
              >
                Countdown
              </Text>
            </Pressable>
          )}

          {/* Timer Settings Button */}
          {onTimerSettingsPress && (
            <Pressable
              onPress={onTimerSettingsPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: customRestTime !== null
                  ? isDark
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(245, 158, 11, 0.1)'
                  : isDark
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(245, 158, 11, 0.1)',
                borderWidth: customRestTime !== null ? 1 : 0,
                borderColor: '#F59E0B',
              }}
            >
              <Timer
                size={14}
                color="#F59E0B"
              />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#F59E0B',
                }}
              >
                {customRestTime !== null ? formatRestTime(customRestTime) : 'Rest'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Timer and Progress */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Clock size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 20,
              fontWeight: '600',
              color: isWorkoutStarted
                ? isPaused
                  ? '#F59E0B'
                  : '#22C55E'
                : isDark
                  ? '#9CA3AF'
                  : '#6B7280',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatTime(elapsedTime)}
          </Text>
          {isPaused && (
            <Text style={{ marginLeft: 8, fontSize: 12, color: '#F59E0B' }}>PAUSED</Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {completedSets} / {totalSets} sets
          </Text>
          <View
            style={{
              width: 100,
              height: 6,
              borderRadius: 3,
              backgroundColor: isDark ? '#374151' : '#E5E7EB',
              marginTop: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#22C55E',
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default WorkoutSessionHeader;
