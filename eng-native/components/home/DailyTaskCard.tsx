import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticPressable } from '../HapticPressable';

interface DailyTaskCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  progress: number; // 0-100
  current: string;
  goal: string;
  isComplete: boolean;
  isOverdue?: boolean;
  isWarning?: boolean;
  href: string;
}

export default function DailyTaskCard({
  title,
  subtitle,
  icon: Icon,
  color,
  progress,
  current,
  goal,
  isComplete,
  isOverdue = false,
  isWarning = false,
  href,
}: DailyTaskCardProps) {
  const { isDark } = useTheme();

  // Determine border color: green if complete, red if overdue, yellow if warning, default otherwise
  const getBorderColor = () => {
    if (isComplete) return '#22C55E';
    if (isOverdue) return '#DC2626';
    if (isWarning) return '#F59E0B';
    return isDark ? '#374151' : '#E5E7EB';
  };

  return (
    <Link href={href as any} asChild>
      <HapticPressable
        style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: isComplete || isOverdue || isWarning ? 2 : 1,
          borderColor: getBorderColor(),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 2,
          position: 'relative',
        }}
      >
        {/* Overdue notification badge (red) */}
        {isOverdue && !isComplete && (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#DC2626',
              borderWidth: 2,
              borderColor: isDark ? '#1F2937' : '#FFFFFF',
              zIndex: 1,
            }}
          />
        )}
        {/* Warning notification badge (yellow) */}
        {isWarning && !isComplete && !isOverdue && (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#F59E0B',
              borderWidth: 2,
              borderColor: isDark ? '#1F2937' : '#FFFFFF',
              zIndex: 1,
            }}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Icon */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: isComplete ? '#22C55E20' : `${color}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {isComplete ? (
              <Check size={24} color="#22C55E" />
            ) : (
              <Icon size={24} color={color} />
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                {title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: isComplete ? '#22C55E' : color,
                    marginRight: goal ? 4 : 0,
                  }}
                >
                  {current}
                </Text>
                {goal ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDark ? '#6B7280' : '#9CA3AF',
                    }}
                  >
                    / {goal}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginTop: 2,
                marginBottom: 8,
              }}
            >
              {subtitle}
            </Text>

            {/* Progress bar */}
            <View
              style={{
                height: 6,
                backgroundColor: isDark ? '#374151' : '#E5E7EB',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: isComplete ? '#22C55E' : color,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>

          {/* Arrow */}
          <ChevronRight
            size={20}
            color={isDark ? '#6B7280' : '#9CA3AF'}
            style={{ marginLeft: 8 }}
          />
        </View>
      </HapticPressable>
    </Link>
  );
}
