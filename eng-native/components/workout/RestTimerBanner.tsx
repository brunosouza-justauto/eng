import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Timer, X } from 'lucide-react-native';
import { formatTime } from '../../utils/formatters';
import { HapticPressable } from '../HapticPressable';

interface RestTimerBannerProps {
  timeRemaining: number;
  onSkip: () => void;
}

const COUNTDOWN_THRESHOLD = 5;

/**
 * Banner displayed during rest periods between sets
 * Flashes red and provides haptic feedback in the last 5 seconds
 */
export const RestTimerBanner = ({ timeRemaining, onSkip }: RestTimerBannerProps) => {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const lastTickTimeRef = useRef<number | null>(null);

  const isCountdown = timeRemaining <= COUNTDOWN_THRESHOLD && timeRemaining > 0;

  // Flash animation for countdown
  useEffect(() => {
    if (isCountdown) {
      // Create pulsing animation
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
  }, [isCountdown, flashAnim]);

  // Haptic feedback for countdown - triggers once per second
  useEffect(() => {
    // Only trigger if we're in countdown and haven't triggered for this second yet
    if (!isCountdown || lastTickTimeRef.current === timeRemaining) {
      return;
    }

    lastTickTimeRef.current = timeRemaining;

    // Haptic feedback - medium impact for countdown ticks
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [timeRemaining, isCountdown]);

  // Interpolate background color for flash effect
  const backgroundColor = isCountdown
    ? flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#DC2626', '#7F1D1D'], // Red flash
      })
    : '#4F46E5'; // Normal indigo

  return (
    <Animated.View
      style={{
        backgroundColor,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Timer size={20} color="#FFFFFF" />
        <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
          {isCountdown ? 'Get Ready!' : 'Rest Time'}
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

      <HapticPressable onPress={onSkip} style={{ padding: 4 }}>
        <X size={20} color="#FFFFFF" />
      </HapticPressable>
    </Animated.View>
  );
};

export default RestTimerBanner;
