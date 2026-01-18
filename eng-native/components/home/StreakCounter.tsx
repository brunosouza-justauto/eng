import React from 'react';
import { View, Text } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

interface StreakCounterProps {
  streak: number;
  size?: 'small' | 'large';
}

export default function StreakCounter({ streak, size = 'large' }: StreakCounterProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const isLarge = size === 'large';
  const iconSize = isLarge ? 24 : 16;
  const textSize = isLarge ? 24 : 14;

  // Flame color based on streak length
  const getFlameColor = () => {
    if (streak >= 30) return '#EF4444'; // Red hot - 30+ days
    if (streak >= 14) return '#F97316'; // Orange - 14+ days
    if (streak >= 7) return '#F59E0B'; // Amber - 7+ days
    if (streak >= 3) return '#FBBF24'; // Yellow - 3+ days
    return '#9CA3AF'; // Gray - starting out
  };

  const flameColor = getFlameColor();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        paddingHorizontal: isLarge ? 16 : 10,
        paddingVertical: isLarge ? 8 : 4,
        borderRadius: isLarge ? 20 : 12,
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#E5E7EB',
      }}
    >
      <Flame size={iconSize} color={flameColor} fill={streak > 0 ? flameColor : 'none'} />
      <Text
        style={{
          fontSize: textSize,
          fontWeight: '700',
          color: flameColor,
          marginLeft: 4,
        }}
      >
        {streak}
      </Text>
      {isLarge && (
        <Text
          style={{
            fontSize: 12,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginLeft: 4,
          }}
        >
          {streak === 1 ? t('home.streak.dayStreakLabel') : t('home.streak.daysStreakLabel')}
        </Text>
      )}
    </View>
  );
}
