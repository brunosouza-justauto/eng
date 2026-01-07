import { View, Text, Pressable } from 'react-native';
import { Play, Pause, Square, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface WorkoutActionButtonsProps {
  isWorkoutStarted: boolean;
  isPaused: boolean;
  bottomInset: number;
  onStart: () => void;
  onPause: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

/**
 * Bottom action buttons for workout session
 */
export const WorkoutActionButtons = ({
  isWorkoutStarted,
  isPaused,
  bottomInset,
  onStart,
  onPause,
  onCancel,
  onComplete,
}: WorkoutActionButtonsProps) => {
  const { isDark } = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: bottomInset + 12,
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: isDark ? '#374151' : '#E5E7EB',
        flexDirection: 'row',
        gap: 12,
      }}
    >
      {!isWorkoutStarted ? (
        <Pressable
          onPress={onStart}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 12,
            backgroundColor: '#22C55E',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={{ marginLeft: 8, color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Start Workout
          </Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            onPress={onPause}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 12,
              backgroundColor: isPaused ? '#22C55E' : '#F59E0B',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPaused ? (
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Pause size={20} color="#FFFFFF" />
            )}
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 12,
              backgroundColor: '#EF4444',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Square size={20} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={onComplete}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 12,
              backgroundColor: '#6366F1',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              Finish
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

export default WorkoutActionButtons;
