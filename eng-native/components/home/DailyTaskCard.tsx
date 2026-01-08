import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface DailyTaskCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  progress: number; // 0-100
  current: string;
  goal: string;
  isComplete: boolean;
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
  href,
}: DailyTaskCardProps) {
  const { isDark } = useTheme();

  return (
    <Link href={href as any} asChild>
      <Pressable
        style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: isComplete ? 2 : 1,
          borderColor: isComplete ? '#22C55E' : isDark ? '#374151' : '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
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
                    marginRight: 4,
                  }}
                >
                  {current}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? '#6B7280' : '#9CA3AF',
                  }}
                >
                  / {goal}
                </Text>
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
      </Pressable>
    </Link>
  );
}
