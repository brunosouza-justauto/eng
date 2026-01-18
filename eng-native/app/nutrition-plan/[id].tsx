import { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Utensils, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { getNutritionPlanById } from '../../services/nutritionService';
import { NutritionPlanWithMeals, MealWithFoodItems } from '../../types/nutrition';
import { HapticPressable } from '../../components/HapticPressable';

export default function NutritionPlanScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  // Set translated header title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nutrition.nutritionPlan'),
    });
  }, [navigation, t]);

  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithMeals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      fetchNutritionPlan();
    }
  }, [id]);

  const fetchNutritionPlan = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { nutritionPlan: plan, error: planError } = await getNutritionPlanById(id);

      if (planError) {
        setError(planError);
        return;
      }

      setNutritionPlan(plan);
    } catch (err: any) {
      console.error('Error loading nutrition plan:', err);
      setError(t('nutrition.unableToLoadNutritionPlan'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMealExpanded = (mealId: string) => {
    setExpandedMeals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  // Group meals by day type
  const getMealsByDayType = () => {
    if (!nutritionPlan?.meals) return new Map<string, MealWithFoodItems[]>();

    const mealsByDay = new Map<string, MealWithFoodItems[]>();

    nutritionPlan.meals.forEach((meal) => {
      const dayType = meal.day_type || t('nutrition.allDays');
      const currentMeals = mealsByDay.get(dayType) || [];
      mealsByDay.set(dayType, [...currentMeals, meal]);
    });

    return mealsByDay;
  };

  // Format time suggestion
  const formatTime = (time?: string) => {
    if (!time) return null;
    // Convert 24h to 12h format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Render a meal card
  const renderMealCard = (meal: MealWithFoodItems) => {
    const isExpanded = expandedMeals.has(meal.id);

    return (
      <View
        key={meal.id}
        className={`rounded-xl mb-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Meal Header */}
        <HapticPressable
          onPress={() => toggleMealExpanded(meal.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                {meal.name}
              </Text>
              {meal.time_suggestion && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: 8,
                  }}
                >
                  <Clock size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text
                    style={{
                      marginLeft: 4,
                      fontSize: 12,
                      color: isDark ? '#9CA3AF' : '#6B7280',
                    }}
                  >
                    {formatTime(meal.time_suggestion)}
                  </Text>
                </View>
              )}
            </View>

            {/* Macro summary */}
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
              <Text style={{ fontSize: 12, color: '#F87171' }}>
                {Math.round(meal.total_calories)} cal
              </Text>
              <Text style={{ fontSize: 12, color: '#A78BFA' }}>
                {Math.round(meal.total_protein)}g P
              </Text>
              <Text style={{ fontSize: 12, color: '#FBBF24' }}>
                {Math.round(meal.total_carbs)}g C
              </Text>
              <Text style={{ fontSize: 12, color: '#60A5FA' }}>
                {Math.round(meal.total_fat)}g F
              </Text>
            </View>
          </View>

          {isExpanded ? (
            <ChevronUp size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          ) : (
            <ChevronDown size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          )}
        </HapticPressable>

        {/* Expanded food items */}
        {isExpanded && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: isDark ? '#374151' : '#E5E7EB',
              padding: 16,
            }}
          >
            {meal.food_items.length === 0 ? (
              <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontStyle: 'italic' }}>
                {t('nutrition.noFoodItems')}
              </Text>
            ) : (
              meal.food_items.map((foodItem, index) => (
                <View
                  key={foodItem.id || index}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: index < meal.food_items.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {foodItem.food_item?.food_name || t('nutrition.unknownFood')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      {foodItem.quantity} {foodItem.unit}
                    </Text>
                    <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      {foodItem.calculated_calories || 0} cal
                    </Text>
                  </View>
                  {foodItem.notes && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontStyle: 'italic',
                        color: isDark ? '#6B7280' : '#9CA3AF',
                        marginTop: 4,
                      }}
                    >
                      {foodItem.notes}
                    </Text>
                  )}
                </View>
              ))
            )}

            {meal.notes && (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                }}
              >
                <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#4B5563' }}>
                  {meal.notes}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('nutrition.loadingNutritionPlan')}
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !nutritionPlan) {
    return (
      <View className={`flex-1 p-4 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <View
          className="rounded-xl p-6"
          style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}
        >
          <Text className="text-red-500 text-lg font-semibold mb-2">
            {t('nutrition.errorLoadingNutritionPlan')}
          </Text>
          <Text className={`${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error || t('nutrition.unableToLoadNutritionPlan')}
          </Text>
          <HapticPressable
            onPress={() => router.back()}
            className="mt-4 bg-indigo-600 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-semibold">{t('common.back')}</Text>
          </HapticPressable>
        </View>
      </View>
    );
  }

  const mealsByDayType = getMealsByDayType();
  const hasMeals = nutritionPlan.meals && nutritionPlan.meals.length > 0;

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Plan Header */}
      <View
        className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          style={{ fontSize: 20 }}
        >
          {nutritionPlan.name}
        </Text>

        {nutritionPlan.description && (
          <Text
            className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            style={{ fontSize: 14, fontStyle: 'italic' }}
          >
            {nutritionPlan.description}
          </Text>
        )}

        {/* Daily Targets */}
        {(nutritionPlan.total_calories ||
          nutritionPlan.protein_grams ||
          nutritionPlan.carbohydrate_grams ||
          nutritionPlan.fat_grams) && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: isDark ? '#D1D5DB' : '#374151',
                marginBottom: 12,
              }}
            >
              {t('nutrition.dailyTargets')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {nutritionPlan.total_calories && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: 'rgba(248, 113, 113, 0.15)',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#F87171', fontWeight: '500' }}>
                    {nutritionPlan.total_calories} cal
                  </Text>
                </View>
              )}
              {nutritionPlan.protein_grams && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: 'rgba(167, 139, 250, 0.15)',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#A78BFA', fontWeight: '500' }}>
                    {t('nutrition.proteinGrams', { amount: nutritionPlan.protein_grams })}
                  </Text>
                </View>
              )}
              {nutritionPlan.carbohydrate_grams && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: 'rgba(251, 191, 36, 0.15)',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FBBF24', fontWeight: '500' }}>
                    {t('nutrition.carbsGrams', { amount: nutritionPlan.carbohydrate_grams })}
                  </Text>
                </View>
              )}
              {nutritionPlan.fat_grams && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#60A5FA', fontWeight: '500' }}>
                    {t('nutrition.fatGrams', { amount: nutritionPlan.fat_grams })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Meals by Day Type */}
      {hasMeals ? (
        <View>
          {Array.from(mealsByDayType.entries()).map(([dayType, meals]) => (
            <View key={dayType} style={{ marginBottom: 24 }}>
              {/* Day Type Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                }}
              >
                <Utensils color="#6366F1" size={18} />
                <Text
                  className={`ml-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                  style={{ fontSize: 16 }}
                >
                  {dayType}
                </Text>
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                  }}
                >
                  ({meals.length === 1 ? t('nutrition.mealCount', { count: meals.length }) : t('nutrition.mealsCount', { count: meals.length })})
                </Text>
              </View>

              {/* Meals */}
              {meals.map((meal) => renderMealCard(meal))}
            </View>
          ))}
        </View>
      ) : (
        <View
          className={`rounded-xl p-6 items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
        >
          <Utensils color={isDark ? '#6B7280' : '#9CA3AF'} size={48} />
          <Text
            className={`mt-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            style={{ fontSize: 16 }}
          >
            {t('nutrition.noMealsFound')}
          </Text>
          <Text className={`mt-2 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('nutrition.noMealsMessage')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
