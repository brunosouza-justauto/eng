import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { ChevronDown, ChevronUp, Clock, Plus, Check, Info } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticPressable } from '../HapticPressable';
import { MealWithFoodItems } from '../../types/nutrition';

interface PlannedMealCardProps {
  meal: MealWithFoodItems;
  isLogged: boolean;
  isLogging?: boolean;
  onLogMeal: (mealId: string) => void;
  onUnlogMeal?: (mealId: string) => void;
}

/**
 * Expandable card displaying a planned meal with ingredients
 */
export const PlannedMealCard = ({
  meal,
  isLogged,
  isLogging,
  onLogMeal,
  onUnlogMeal,
}: PlannedMealCardProps) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return '';
    // Handle both HH:MM and HH:MM:SS formats
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#E5E7EB',
      }}
    >
      {/* Header - Always visible */}
      <HapticPressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
        }}
      >
        {/* Expand/Collapse icon */}
        <View style={{ marginRight: 12 }}>
          {isExpanded ? (
            <ChevronUp size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          ) : (
            <ChevronDown size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          )}
        </View>

        {/* Meal info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            {meal.name}
          </Text>

          {/* Time */}
          {meal.time_suggestion && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Clock size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  color: isDark ? '#6B7280' : '#9CA3AF',
                }}
              >
                {formatTime(meal.time_suggestion)}
              </Text>
            </View>
          )}

          {/* Quick macros */}
          <Text
            style={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
              marginTop: 4,
            }}
          >
            {meal.total_calories} cal • {Math.round(meal.total_protein)}g protein
          </Text>
        </View>

        {/* Log/Unlog button */}
        <HapticPressable
          onPress={() => {
            if (isLogged && onUnlogMeal) {
              onUnlogMeal(meal.id);
            } else if (!isLogged) {
              onLogMeal(meal.id);
            }
          }}
          disabled={isLogging}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isLogged
              ? '#22C55E'
              : isDark
                ? '#374151'
                : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color={isDark ? '#9CA3AF' : '#6B7280'} />
          ) : isLogged ? (
            <Check size={18} color="#FFFFFF" />
          ) : (
            <Plus size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          )}
        </HapticPressable>
      </HapticPressable>

      {/* Expanded content */}
      {isExpanded && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          {/* Notes */}
          {meal.notes && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              <Info size={16} color="#3B82F6" style={{ marginTop: 2 }} />
              <Text
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 13,
                  color: isDark ? '#93C5FD' : '#3B82F6',
                  lineHeight: 18,
                }}
              >
                {meal.notes}
              </Text>
            </View>
          )}

          {/* Ingredients section */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginTop: meal.notes ? 0 : 12,
              marginBottom: 12,
            }}
          >
            Ingredients
          </Text>

          {meal.food_items.length === 0 ? (
            <Text style={{ fontSize: 13, color: isDark ? '#6B7280' : '#9CA3AF' }}>
              No ingredients listed
            </Text>
          ) : (
            meal.food_items.map((foodItem, index) => (
              <View
                key={foodItem.id}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: index < meal.food_items.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                }}
              >
                {/* Food name and quantity */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: '500',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {foodItem.food_item?.food_name || 'Unknown'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      marginLeft: 12,
                    }}
                  >
                    {foodItem.quantity} {foodItem.unit}
                  </Text>
                </View>

                {/* Macros */}
                <Text
                  style={{
                    fontSize: 12,
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    marginTop: 4,
                  }}
                >
                  {foodItem.calculated_calories || 0} cal • P: {foodItem.calculated_protein || 0}g •
                  C: {foodItem.calculated_carbs || 0}g • F: {foodItem.calculated_fat || 0}g
                </Text>

                {/* Notes */}
                {foodItem.notes && (
                  <Text
                    style={{
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      marginTop: 4,
                    }}
                  >
                    {foodItem.notes}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

export default PlannedMealCard;
