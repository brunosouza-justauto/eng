import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticPressable } from './HapticPressable';

interface EmptyStateProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  buttonIcon?: React.ComponentType<{ size: number; color: string }>;
  onButtonPress?: () => void;
}

/**
 * Reusable empty state component for tabs with no data
 * Follows the Supplements tab design pattern
 */
export default function EmptyState({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  buttonText,
  buttonIcon: ButtonIcon,
  onButtonPress,
}: EmptyStateProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
      }}
    >
      {/* Large circular icon */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: isDark ? '#374151' : '#E5E7EB',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Icon size={40} color={isDark ? '#6B7280' : '#9CA3AF'} />
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: isDark ? '#F3F4F6' : '#1F2937',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 15,
          color: isDark ? '#9CA3AF' : '#6B7280',
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: buttonText ? 24 : 0,
        }}
      >
        {subtitle}
      </Text>

      {/* Action button (optional) */}
      {buttonText && onButtonPress && (
        <HapticPressable
          onPress={onButtonPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: iconColor,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          {ButtonIcon && (
            <ButtonIcon size={20} color="#FFFFFF" />
          )}
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              marginLeft: ButtonIcon ? 8 : 0,
            }}
          >
            {buttonText}
          </Text>
        </HapticPressable>
      )}
    </View>
  );
}
