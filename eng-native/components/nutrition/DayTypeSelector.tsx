import { View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticPressable } from '../HapticPressable';
import { SimpleDayType } from '../../types/nutrition';

interface DayTypeSelectorProps {
  selectedDayType: SimpleDayType | null;
  onSelectDayType: (dayType: SimpleDayType) => void;
}

/**
 * Tab selector for switching between Rest and Training day views
 */
export const DayTypeSelector = ({
  selectedDayType,
  onSelectDayType,
}: DayTypeSelectorProps) => {
  const { isDark } = useTheme();

  const dayTypes: SimpleDayType[] = ['Rest', 'Training'];

  return (
    <View
      style={{
        flexDirection: 'row',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#374151' : '#E5E7EB',
      }}
    >
      {dayTypes.map((dayType) => {
        const isSelected = selectedDayType === dayType;

        return (
          <HapticPressable
            key={dayType}
            onPress={() => onSelectDayType(dayType)}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginRight: 8,
              borderBottomWidth: 2,
              borderBottomColor: isSelected
                ? '#6366F1'
                : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: isSelected ? '600' : '500',
                color: isSelected
                  ? '#6366F1'
                  : isDark
                    ? '#9CA3AF'
                    : '#6B7280',
              }}
            >
              {dayType}
            </Text>
          </HapticPressable>
        );
      })}
    </View>
  );
};

export default DayTypeSelector;
