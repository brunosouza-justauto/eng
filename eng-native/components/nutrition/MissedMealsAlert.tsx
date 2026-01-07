import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { MissedMeal } from '../../types/nutrition';

interface MissedMealsAlertProps {
  missedMeals: MissedMeal[];
}

/**
 * Alert banner showing missed meals for the day
 */
export const MissedMealsAlert = ({ missedMeals }: MissedMealsAlertProps) => {
  const { isDark } = useTheme();

  if (missedMeals.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <AlertCircle size={18} color="#F59E0B" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: 15,
            fontWeight: '600',
            color: '#F59E0B',
          }}
        >
          Missed Meals
        </Text>
      </View>

      {/* List of missed meals */}
      {missedMeals.map((meal, index) => (
        <View
          key={meal.mealId}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: index > 0 ? 6 : 0,
          }}
        >
          <Text style={{ color: '#F59E0B', marginRight: 8 }}>•</Text>
          <Text
            style={{
              fontSize: 13,
              color: isDark ? '#FCD34D' : '#D97706',
            }}
          >
            {meal.name} - Suggested time: {meal.suggestedTime} has passed
          </Text>
        </View>
      ))}
    </View>
  );
};

export default MissedMealsAlert;
