import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { X, Utensils, User, Flame } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getPublicNutritionPlans, PublicNutritionPlan } from '../../services/nutritionService';

// Calorie range definitions for filtering
const CALORIE_RANGES = [
  { label: 'Under 1500', min: 0, max: 1499 },
  { label: '1500-2000', min: 1500, max: 2000 },
  { label: '2000-2500', min: 2001, max: 2500 },
  { label: '2500-3000', min: 2501, max: 3000 },
  { label: '3000+', min: 3001, max: Infinity },
];

interface BrowseNutritionPlansModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (plan: PublicNutritionPlan) => void;
}

export default function BrowseNutritionPlansModal({
  visible,
  onClose,
  onSelect,
}: BrowseNutritionPlansModalProps) {
  const { isDark } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const [plans, setPlans] = useState<PublicNutritionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalorieRange, setSelectedCalorieRange] = useState<string | null>(null);
  const isPresenting = useRef(false);

  // Get available calorie ranges based on plans data
  const availableCalorieRanges = useMemo(() => {
    return CALORIE_RANGES.filter((range) =>
      plans.some((plan) => {
        if (!plan.total_calories) return false;
        return plan.total_calories >= range.min && plan.total_calories <= range.max;
      })
    );
  }, [plans]);

  // Filter plans based on selected calorie range
  const filteredPlans = useMemo(() => {
    if (!selectedCalorieRange) return plans;
    const range = CALORIE_RANGES.find((r) => r.label === selectedCalorieRange);
    if (!range) return plans;
    return plans.filter((plan) => {
      if (!plan.total_calories) return false;
      return plan.total_calories >= range.min && plan.total_calories <= range.max;
    });
  }, [plans, selectedCalorieRange]);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    const { plans: fetchedPlans, error: fetchError } = await getPublicNutritionPlans();
    if (fetchError) {
      setError(fetchError);
    } else {
      setPlans(fetchedPlans);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (visible && !isPresenting.current) {
      isPresenting.current = true;
      bottomSheetRef.current?.present();
      fetchPlans();
    } else if (!visible && isPresenting.current) {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      isPresenting.current = false;
      onClose();
    }
  }, [onClose]);

  const handleClose = () => {
    bottomSheetRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    []
  );

  const renderMacrosPill = (label: string, value: number | null, color: string) => {
    if (!value) return null;
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#374151' : '#F3F4F6',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          marginRight: 6,
          marginBottom: 6,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            marginRight: 4,
          }}
        />
        <Text
          style={{
            fontSize: 12,
            color: isDark ? '#D1D5DB' : '#4B5563',
          }}
        >
          {value}g {label}
        </Text>
      </View>
    );
  };

  const renderPlanCard = (plan: PublicNutritionPlan) => (
    <Pressable
      key={plan.id}
      onPress={() => onSelect(plan)}
      style={{
        backgroundColor: isDark ? '#374151' : '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? '#4B5563' : '#E5E7EB',
      }}
    >
      {/* Plan Name */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: isDark ? '#F3F4F6' : '#1F2937',
          marginBottom: 6,
        }}
      >
        {plan.name}
      </Text>

      {/* Description */}
      {plan.description && (
        <Text
          style={{
            fontSize: 14,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginBottom: 10,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {plan.description}
        </Text>
      )}

      {/* Calories */}
      {plan.total_calories && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Flame size={14} color="#F59E0B" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginLeft: 4,
            }}
          >
            {plan.total_calories} cal
          </Text>
        </View>
      )}

      {/* Macros row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {renderMacrosPill('P', plan.protein_grams, '#EF4444')}
        {renderMacrosPill('C', plan.carbohydrate_grams, '#F59E0B')}
        {renderMacrosPill('F', plan.fat_grams, '#3B82F6')}
      </View>

      {/* Coach name */}
      {plan.coach_name && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <User size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
          <Text
            style={{
              fontSize: 12,
              color: isDark ? '#6B7280' : '#9CA3AF',
              marginLeft: 4,
            }}
          >
            By: {plan.coach_name}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
        width: 40,
      }}
      backgroundStyle={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Utensils size={20} color="#22C55E" />
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginLeft: 8,
            }}
          >
            Browse Nutrition Plans
          </Text>
        </View>
        <Pressable onPress={handleClose} hitSlop={8}>
          <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </Pressable>
      </View>

      {/* Content */}
      <BottomSheetScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          paddingBottom: 40,
        }}
      >
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text
              style={{
                marginTop: 12,
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              Loading plans...
            </Text>
          </View>
        ) : error ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', textAlign: 'center' }}>{error}</Text>
            <Pressable
              onPress={fetchPlans}
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: '#22C55E',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Retry</Text>
            </Pressable>
          </View>
        ) : plans.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Utensils size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: '500',
                color: isDark ? '#9CA3AF' : '#6B7280',
                textAlign: 'center',
              }}
            >
              No Public Plans Available
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: isDark ? '#6B7280' : '#9CA3AF',
                textAlign: 'center',
              }}
            >
              Ask your coach to create a public nutrition plan
            </Text>
          </View>
        ) : (
          <>
            {/* Calorie Range Filter */}
            {availableCalorieRanges.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    marginBottom: 8,
                  }}
                >
                  Calories
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                >
                  <Pressable
                    onPress={() => setSelectedCalorieRange(null)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor:
                        selectedCalorieRange === null
                          ? '#22C55E'
                          : isDark
                            ? '#374151'
                            : '#F3F4F6',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color:
                          selectedCalorieRange === null
                            ? '#FFFFFF'
                            : isDark
                              ? '#D1D5DB'
                              : '#4B5563',
                      }}
                    >
                      All
                    </Text>
                  </Pressable>
                  {availableCalorieRanges.map((range) => (
                    <Pressable
                      key={range.label}
                      onPress={() => setSelectedCalorieRange(range.label)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor:
                          selectedCalorieRange === range.label
                            ? '#22C55E'
                            : isDark
                              ? '#374151'
                              : '#F3F4F6',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color:
                            selectedCalorieRange === range.label
                              ? '#FFFFFF'
                              : isDark
                                ? '#D1D5DB'
                                : '#4B5563',
                        }}
                      >
                        {range.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Results count */}
            <Text
              style={{
                fontSize: 13,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginBottom: 12,
              }}
            >
              {filteredPlans.length === plans.length
                ? `${plans.length} plan${plans.length !== 1 ? 's' : ''} available`
                : `${filteredPlans.length} of ${plans.length} plans`}
            </Text>

            {/* Plan list */}
            {filteredPlans.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    textAlign: 'center',
                  }}
                >
                  No plans match your filter
                </Text>
              </View>
            ) : (
              filteredPlans.map(renderPlanCard)
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
