import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, QrCode, Plus, Search, Trash2, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticPressable } from '../HapticPressable';
import {
  FoodItem,
  ExtraMealFormData,
  SimpleDayType,
} from '../../types/nutrition';
import { searchFoodItems, calculateNutrition, getFoodItemByBarcode } from '../../services/nutritionService';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ConfirmationModal } from '../ConfirmationModal';

interface AddExtraMealModalProps {
  visible: boolean;
  currentDayType: SimpleDayType | null;
  onSubmit: (mealData: ExtraMealFormData) => void;
  onClose: () => void;
}

interface AddedFoodItem {
  food_item_id: string;
  food_item: FoodItem;
  quantity: number;
  unit: string;
}

/**
 * Bottom sheet modal for adding extra meals
 */
export const AddExtraMealModal = ({
  visible,
  currentDayType,
  onSubmit,
  onClose,
}: AddExtraMealModalProps) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  // Form state
  const [mealName, setMealName] = useState('');
  const [notes, setNotes] = useState('');
  const [addedFoodItems, setAddedFoodItems] = useState<AddedFoodItem[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Custom food item state
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [customFoodName, setCustomFoodName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServingSize, setCustomServingSize] = useState('100');

  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [showBarcodeNotFound, setShowBarcodeNotFound] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [showBarcodeError, setShowBarcodeError] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

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

  // Reset custom food form
  const resetCustomFoodForm = () => {
    setCustomFoodName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomServingSize('100');
  };

  // Reset form when modal closes
  const resetForm = () => {
    setMealName('');
    setNotes('');
    setAddedFoodItems([]);
    setSearchQuery('');
    setSearchResults([]);
    setShowCustomFoodForm(false);
    resetCustomFoodForm();
  };

  // Search food items
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { items } = await searchFoodItems(query, 15);
    setSearchResults(items);
    setIsSearching(false);
  }, []);

  // Add food item
  const handleAddFoodItem = (foodItem: FoodItem) => {
    setAddedFoodItems((prev) => [
      ...prev,
      {
        food_item_id: foodItem.id,
        food_item: foodItem,
        quantity: foodItem.serving_size_g || 100,
        unit: 'g',
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update food item quantity
  const handleUpdateQuantity = (index: number, quantity: string) => {
    const numQuantity = parseFloat(quantity) || 0;
    setAddedFoodItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: numQuantity };
      return updated;
    });
  };

  // Remove food item
  const handleRemoveFoodItem = (index: number) => {
    setAddedFoodItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totals = addedFoodItems.reduce(
    (acc, item) => {
      const nutrition = calculateNutrition(item.food_item, item.quantity, item.unit);
      return {
        calories: acc.calories + nutrition.calories,
        protein: acc.protein + nutrition.protein,
        carbs: acc.carbs + nutrition.carbs,
        fat: acc.fat + nutrition.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Submit form
  const handleSubmit = () => {
    if (!mealName.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    if (addedFoodItems.length === 0) {
      Alert.alert('Error', 'Please add at least one food item');
      return;
    }

    onSubmit({
      name: mealName.trim(),
      day_type: currentDayType === 'Rest' ? 'Rest Day' : 'Training Day',
      notes: notes.trim() || undefined,
      food_items: addedFoodItems.map((item) => ({
        food_item_id: item.food_item_id,
        food_item: item.food_item,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });

    resetForm();
    onClose();
  };

  // Handle scan barcode - open the scanner
  const handleScanBarcode = () => {
    setShowBarcodeScanner(true);
  };

  // Handle barcode scanned - look up the food item
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setShowBarcodeScanner(false);
    setIsLookingUpBarcode(true);
    setScannedBarcode(barcode);

    const { item, error } = await getFoodItemByBarcode(barcode);

    setIsLookingUpBarcode(false);

    if (error) {
      setShowBarcodeError(true);
      return;
    }

    if (!item) {
      setShowBarcodeNotFound(true);
      return;
    }

    // Add the found item to the list
    handleAddFoodItem(item);
  }, []);

  // Handle add custom item - show the form
  const handleAddCustomItem = () => {
    setShowCustomFoodForm(true);
  };

  // Handle custom food item submission
  const handleSubmitCustomFood = () => {
    // Validation
    if (!customFoodName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    const calories = parseFloat(customCalories) || 0;
    const protein = parseFloat(customProtein) || 0;
    const carbs = parseFloat(customCarbs) || 0;
    const fat = parseFloat(customFat) || 0;
    const servingSize = parseFloat(customServingSize) || 100;

    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      Alert.alert('Error', 'Please enter at least one nutritional value');
      return;
    }

    // Create a custom FoodItem object with a temporary ID
    const customFoodItem: FoodItem = {
      id: `custom-${Date.now()}`,
      food_name: customFoodName.trim(),
      calories_per_100g: calories,
      protein_per_100g: protein,
      carbs_per_100g: carbs,
      fat_per_100g: fat,
      serving_size_g: servingSize,
      nutrient_basis: 'per 100g',
      source: 'custom',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to food items list
    setAddedFoodItems((prev) => [
      ...prev,
      {
        food_item_id: customFoodItem.id,
        food_item: customFoodItem,
        quantity: servingSize,
        unit: 'g',
      },
    ]);

    // Reset and close custom food form
    resetCustomFoodForm();
    setShowCustomFoodForm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        bottomInset={insets.bottom}
        detached={false}
        handleIndicatorStyle={{
          backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
          width: 40,
        }}
        handleStyle={{
          paddingBottom: 12,
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
            padding: 20,
            paddingTop: 8,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          {showCustomFoodForm ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HapticPressable
                onPress={() => {
                  setShowCustomFoodForm(false);
                  resetCustomFoodForm();
                }}
                style={{ marginRight: 12 }}
              >
                <ChevronLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
              </HapticPressable>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                Add Custom Food
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              Log Extra Meal
            </Text>
          )}
          <HapticPressable
            onPress={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </HapticPressable>
        </View>

        {/* Custom Food Form */}
        {showCustomFoodForm ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <BottomSheetScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Food Name */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 8,
                }}
              >
                Food Name <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                value={customFoodName}
                onChangeText={setCustomFoodName}
                placeholder="e.g., Homemade Protein Bar"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                style={{
                  backgroundColor: isDark ? '#374151' : '#F9FAFB',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 15,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                  marginBottom: 20,
                }}
              />

              {/* Nutrition Info Header */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  marginBottom: 12,
                }}
              >
                Nutrition Info (per 100g)
              </Text>

              {/* Calories */}
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    marginBottom: 6,
                  }}
                >
                  Calories
                </Text>
                <TextInput
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#F9FAFB',
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 15,
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                  }}
                />
              </View>

              {/* Macros Row */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                {/* Protein */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#A78BFA',
                      marginBottom: 6,
                    }}
                  >
                    Protein (g)
                  </Text>
                  <TextInput
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderRadius: 10,
                      padding: 14,
                      fontSize: 15,
                      color: isDark ? '#F3F4F6' : '#1F2937',
                      borderWidth: 1,
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                  />
                </View>

                {/* Carbs */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#FBBF24',
                      marginBottom: 6,
                    }}
                  >
                    Carbs (g)
                  </Text>
                  <TextInput
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderRadius: 10,
                      padding: 14,
                      fontSize: 15,
                      color: isDark ? '#F3F4F6' : '#1F2937',
                      borderWidth: 1,
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                  />
                </View>

                {/* Fat */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#60A5FA',
                      marginBottom: 6,
                    }}
                  >
                    Fat (g)
                  </Text>
                  <TextInput
                    value={customFat}
                    onChangeText={setCustomFat}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderRadius: 10,
                      padding: 14,
                      fontSize: 15,
                      color: isDark ? '#F3F4F6' : '#1F2937',
                      borderWidth: 1,
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                  />
                </View>
              </View>

              {/* Serving Size */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    marginBottom: 6,
                  }}
                >
                  Serving Size (g)
                </Text>
                <TextInput
                  value={customServingSize}
                  onChangeText={setCustomServingSize}
                  placeholder="100"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#F9FAFB',
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 15,
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                  }}
                />
              </View>

              {/* Preview */}
              {(customCalories || customProtein || customCarbs || customFat) && (
                <View
                  style={{
                    backgroundColor: isDark ? '#374151' : '#E5E7EB',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                      marginBottom: 6,
                    }}
                  >
                    Preview (per serving)
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDark ? '#D1D5DB' : '#374151',
                    }}
                  >
                    {Math.round(
                      ((parseFloat(customCalories) || 0) * (parseFloat(customServingSize) || 100)) /
                        100
                    )}{' '}
                    cal • P:{' '}
                    {Math.round(
                      ((parseFloat(customProtein) || 0) * (parseFloat(customServingSize) || 100)) /
                        100
                    )}
                    g • C:{' '}
                    {Math.round(
                      ((parseFloat(customCarbs) || 0) * (parseFloat(customServingSize) || 100)) /
                        100
                    )}
                    g • F:{' '}
                    {Math.round(
                      ((parseFloat(customFat) || 0) * (parseFloat(customServingSize) || 100)) / 100
                    )}
                    g
                  </Text>
                </View>
              )}
            </BottomSheetScrollView>

            {/* Custom Food Footer */}
            <View
              style={{
                flexDirection: 'row',
                padding: 20,
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#374151' : '#E5E7EB',
              }}
            >
              <HapticPressable
                onPress={() => {
                  setShowCustomFoodForm(false);
                  resetCustomFoodForm();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: isDark ? '#F3F4F6' : '#1F2937',
                  }}
                >
                  Cancel
                </Text>
              </HapticPressable>

              <HapticPressable
                onPress={handleSubmitCustomFood}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: '#6366F1',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}
                >
                  Add Food
                </Text>
              </HapticPressable>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <>
            {/* Content */}
            <BottomSheetScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
          {/* Meal Name */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginBottom: 8,
            }}
          >
            Meal Name <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g., Post-Workout Snack"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            style={{
              backgroundColor: isDark ? '#374151' : '#F9FAFB',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              color: isDark ? '#F3F4F6' : '#1F2937',
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#E5E7EB',
              marginBottom: 16,
            }}
          />

          {/* Notes */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginBottom: 8,
            }}
          >
            Notes (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes here..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: isDark ? '#374151' : '#F9FAFB',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              color: isDark ? '#F3F4F6' : '#1F2937',
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#E5E7EB',
              marginBottom: 20,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />

          {/* Food Items */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginBottom: 12,
            }}
          >
            Food Items <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <HapticPressable
              onPress={handleScanBarcode}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDark ? '#4B5563' : '#D1D5DB',
              }}
            >
              <QrCode size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 13,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                }}
              >
                Scan Barcode
              </Text>
            </HapticPressable>

            <HapticPressable
              onPress={handleAddCustomItem}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#6366F1',
              }}
            >
              <Plus size={16} color="#6366F1" />
              <Text style={{ marginLeft: 8, fontSize: 13, color: '#6366F1' }}>
                Add Custom Item
              </Text>
            </HapticPressable>
          </View>

          {/* Search input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#374151' : '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#E5E7EB',
              paddingHorizontal: 12,
            }}
          >
            <Search size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search for food items..."
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              style={{
                flex: 1,
                padding: 12,
                fontSize: 15,
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            />
            {isSearching && <ActivityIndicator size="small" color="#6366F1" />}
            {searchQuery.length > 0 && !isSearching && (
              <HapticPressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <X size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
              </HapticPressable>
            )}
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#FFFFFF',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? '#4B5563' : '#E5E7EB',
                marginTop: 8,
                maxHeight: 200,
              }}
            >
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {searchResults.map((item, index) => (
                  <HapticPressable
                    key={item.id}
                    onPress={() => handleAddFoodItem(item)}
                    style={{
                      padding: 12,
                      borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          color: isDark ? '#F3F4F6' : '#1F2937',
                        }}
                        numberOfLines={1}
                      >
                        {item.food_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: isDark ? '#6B7280' : '#9CA3AF',
                          marginTop: 2,
                        }}
                      >
                        {item.calories_per_100g} cal • P:{item.protein_per_100g}g C:{item.carbs_per_100g}g F:{item.fat_per_100g}g
                      </Text>
                    </View>
                    <Plus size={18} color="#6366F1" />
                  </HapticPressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 12 }} />

          {/* Added food items */}
          {addedFoodItems.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#E5E7EB',
                borderStyle: 'dashed',
                borderRadius: 10,
                padding: 24,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, color: isDark ? '#6B7280' : '#9CA3AF' }}>
                No food items added yet. Search and add food items above.
              </Text>
            </View>
          ) : (
            <View>
              {addedFoodItems.map((item, index) => {
                const nutrition = calculateNutrition(item.food_item, item.quantity, item.unit);

                return (
                  <View
                    key={`${item.food_item_id}-${index}`}
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: isDark ? '#F3F4F6' : '#1F2937',
                          }}
                        >
                          {item.food_item.food_name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: isDark ? '#6B7280' : '#9CA3AF',
                            marginTop: 4,
                          }}
                        >
                          {nutrition.calories} cal • P: {nutrition.protein}g • C: {nutrition.carbs}
                          g • F: {nutrition.fat}g
                        </Text>
                      </View>

                      {/* Quantity input */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          value={String(item.quantity)}
                          onChangeText={(text) => handleUpdateQuantity(index, text)}
                          keyboardType="numeric"
                          style={{
                            width: 60,
                            padding: 8,
                            borderRadius: 6,
                            backgroundColor: isDark ? '#374151' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? '#4B5563' : '#E5E7EB',
                            fontSize: 14,
                            color: isDark ? '#F3F4F6' : '#1F2937',
                            textAlign: 'center',
                          }}
                        />
                        <Text
                          style={{
                            marginLeft: 6,
                            fontSize: 13,
                            color: isDark ? '#9CA3AF' : '#6B7280',
                          }}
                        >
                          {item.unit}
                        </Text>

                        <HapticPressable
                          onPress={() => handleRemoveFoodItem(index)}
                          style={{
                            marginLeft: 10,
                            padding: 6,
                          }}
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </HapticPressable>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Totals */}
              <View
                style={{
                  backgroundColor: isDark ? '#374151' : '#E5E7EB',
                  borderRadius: 10,
                  padding: 14,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    marginBottom: 6,
                  }}
                >
                  Total
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark ? '#D1D5DB' : '#374151',
                  }}
                >
                  {totals.calories} cal • Protein: {Math.round(totals.protein)}g • Carbs:{' '}
                  {Math.round(totals.carbs)}g • Fat: {Math.round(totals.fat)}g
                </Text>
              </View>
            </View>
          )}
        </BottomSheetScrollView>

        {/* Footer buttons */}
        <View
          style={{
            flexDirection: 'row',
            padding: 20,
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <HapticPressable
            onPress={handleClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              Cancel
            </Text>
          </HapticPressable>

          <HapticPressable
            onPress={handleSubmit}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: '#6366F1',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 15,
                fontWeight: '600',
                color: '#FFFFFF',
              }}
            >
              Log Meal
            </Text>
          </HapticPressable>
        </View>
          </>
        )}

        {/* Loading overlay when looking up barcode */}
        {isLookingUpBarcode && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                padding: 24,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color="#6366F1" />
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                Looking up barcode...
              </Text>
            </View>
          </View>
        )}
      </BottomSheetModal>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* Barcode Not Found Modal */}
      <ConfirmationModal
        visible={showBarcodeNotFound}
        title="Not Found"
        message={`No food item found for barcode: ${scannedBarcode}. Would you like to add it as a custom item?`}
        confirmText="Add Custom"
        cancelText="Cancel"
        confirmColor="indigo"
        onConfirm={() => {
          setShowBarcodeNotFound(false);
          setShowCustomFoodForm(true);
        }}
        onCancel={() => setShowBarcodeNotFound(false)}
      />

      {/* Barcode Error Modal */}
      <ConfirmationModal
        visible={showBarcodeError}
        title="Error"
        message="Failed to look up barcode. Please try again."
        confirmText="OK"
        cancelText="Cancel"
        confirmColor="red"
        onConfirm={() => setShowBarcodeError(false)}
        onCancel={() => setShowBarcodeError(false)}
      />
    </>
  );
};

export default AddExtraMealModal;
