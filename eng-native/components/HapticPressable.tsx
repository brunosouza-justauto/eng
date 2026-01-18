import { Pressable, PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';

interface HapticPressableProps extends PressableProps {
  /**
   * The type of haptic feedback to trigger on press
   * - 'light': Subtle tap
   * - 'medium': Balanced feel (default)
   * - 'heavy': Stronger feedback
   * - 'success': Success notification pattern
   * - 'warning': Warning notification pattern
   * - 'error': Error notification pattern
   * - 'none': No haptic feedback
   */
  hapticStyle?: HapticStyle;
}

/**
 * A Pressable component with built-in haptic feedback.
 * Drop-in replacement for React Native's Pressable.
 */
export function HapticPressable({
  hapticStyle = 'medium',
  onPress,
  disabled,
  ...props
}: HapticPressableProps) {
  const triggerHaptic = () => {
    if (disabled || hapticStyle === 'none') return;

    switch (hapticStyle) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  };

  const handlePress = (event: any) => {
    triggerHaptic();
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      {...props}
    />
  );
}

export default HapticPressable;
