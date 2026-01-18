import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Timer, X, Pause, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/formatters';
import { HapticPressable } from '../HapticPressable';

interface CountdownTimerBannerProps {
  timeRemaining: number;
  totalTime: number;
  isPaused: boolean;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
}

const COUNTDOWN_THRESHOLD = 5;

/**
 * Banner displayed during countdown timer for timed exercises (planks, cardio, etc.)
 * Blue color scheme, with pause/resume functionality
 */
export const CountdownTimerBanner = ({
  timeRemaining,
  totalTime,
  isPaused,
  onSkip,
  onPause,
  onResume,
}: CountdownTimerBannerProps) => {
  const { t } = useTranslation();
  const flashAnim = useRef(new Animated.Value(0)).current;
  const lastTickTimeRef = useRef<number | null>(null);

  const isCountdown = timeRemaining <= COUNTDOWN_THRESHOLD && timeRemaining > 0;

  // Flash animation for countdown
  useEffect(() => {
    if (isCountdown && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        flashAnim.setValue(0);
      };
    } else {
      flashAnim.setValue(0);
    }
  }, [isCountdown, isPaused, flashAnim]);

  // Haptic feedback for countdown
  useEffect(() => {
    if (!isCountdown || isPaused || lastTickTimeRef.current === timeRemaining) {
      return;
    }

    lastTickTimeRef.current = timeRemaining;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [timeRemaining, isCountdown, isPaused]);

  // Calculate progress
  const progress = totalTime > 0 ? (totalTime - timeRemaining) / totalTime : 0;

  // Interpolate background color for flash effect
  const backgroundColor = isCountdown && !isPaused
    ? flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#DC2626', '#7F1D1D'], // Red flash
      })
    : isPaused
      ? '#6B7280' // Gray when paused
      : '#2563EB'; // Blue normally

  return (
    <Animated.View
      style={{
        backgroundColor,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      {/* Progress bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 3,
          width: `${progress * 100}%`,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Timer size={20} color="#FFFFFF" />
          <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
            {isCountdown ? t('workout.almostDone') : isPaused ? t('workout.paused') : t('workout.countdown')}
          </Text>
        </View>

        <Text
          style={{
            fontSize: isCountdown ? 28 : 24,
            fontWeight: '700',
            color: '#FFFFFF',
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatTime(timeRemaining)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Pause/Resume button */}
          <HapticPressable
            onPress={isPaused ? onResume : onPause}
            style={{
              padding: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 6,
            }}
          >
            {isPaused ? (
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
            )}
          </HapticPressable>

          {/* Stop button */}
          <HapticPressable
            onPress={onSkip}
            style={{
              padding: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 6,
            }}
          >
            <X size={18} color="#FFFFFF" />
          </HapticPressable>
        </View>
      </View>
    </Animated.View>
  );
};

export default CountdownTimerBanner;
