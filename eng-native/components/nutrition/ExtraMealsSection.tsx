import { View, Text, Pressable } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { LoggedMealWithNutrition } from '../../types/nutrition';

interface ExtraMealsSectionProps {
  extraMeals: LoggedMealWithNutrition[];
  onAddExtraMeal: () => void;
  onDeleteExtraMeal: (mealLogId: string) => void;
}

/**
 * Section displaying logged extra meals with add button
 */
export const ExtraMealsSection = ({
  extraMeals,
  onAddExtraMeal,
  onDeleteExtraMeal,
}: ExtraMealsSectionProps) => {
  const { isDark } = useTheme();

  return (
    <View style={{ marginTop: 24 }}>
      {/* Header with Add button */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Extra Meals
        </Text>

        <Pressable
          onPress={onAddExtraMeal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#6366F1',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 13,
              fontWeight: '600',
              color: '#FFFFFF',
            }}
          >
            Add Extra Meal
          </Text>
        </Pressable>
      </View>

      {/* Extra meals list */}
      {extraMeals.length === 0 ? (
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: isDark ? '#6B7280' : '#9CA3AF',
              textAlign: 'center',
            }}
          >
            No extra meals logged for today.
          </Text>
        </View>
      ) : (
        extraMeals.map((meal) => (
          <View
            key={meal.id}
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#E5E7EB',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Meal info */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                {meal.name}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#6B7280' : '#9CA3AF',
                  marginTop: 2,
                }}
              >
                {meal.time.slice(0, 5)} • {meal.day_type}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginTop: 4,
                }}
              >
                {meal.total_calories} cal • P: {Math.round(meal.total_protein)}g • C:{' '}
                {Math.round(meal.total_carbs)}g • F: {Math.round(meal.total_fat)}g
              </Text>

              {meal.notes && (
                <Text
                  style={{
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    marginTop: 4,
                  }}
                  numberOfLines={2}
                >
                  {meal.notes}
                </Text>
              )}
            </View>

            {/* Delete button */}
            <Pressable
              onPress={() => onDeleteExtraMeal(meal.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? '#374151' : '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 12,
              }}
            >
              <Trash2 size={16} color="#EF4444" />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
};

export default ExtraMealsSection;
