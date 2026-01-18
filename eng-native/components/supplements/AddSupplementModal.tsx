import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { HapticPressable } from '../HapticPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Pill, Plus } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SUPPLEMENT_CATEGORIES,
  SupplementCategory,
  SupplementSchedule,
  CATEGORY_COLORS,
} from '../../types/supplements';

// Common schedules for display (subset of all schedules)
const COMMON_SCHEDULES: SupplementSchedule[] = [
  'Morning',
  'Afternoon',
  'Evening',
  'Before Workout',
  'After Workout',
  'With Meal',
  'Before Bed',
];

interface AddSupplementModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    category: SupplementCategory;
    dosage: string;
    schedule: SupplementSchedule;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function AddSupplementModal({
  visible,
  onClose,
  onAdd,
  isLoading = false,
}: AddSupplementModalProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplementCategory>('Vitamins');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState<SupplementSchedule>('Morning');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory('Vitamins');
    setDosage('');
    setSchedule('Morning');
    setNotes('');
    setError('');
    setShowCategoryPicker(false);
  };

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      resetForm();
      onClose();
    }
  }, [onClose]);

  const handleClose = () => {
    bottomSheetRef.current?.dismiss();
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError('Please enter a supplement name');
      return;
    }
    if (!dosage.trim()) {
      setError('Please enter a dosage');
      return;
    }

    setError('');
    await onAdd({
      name: name.trim(),
      category,
      dosage: dosage.trim(),
      schedule,
      notes: notes.trim() || undefined,
    });
    resetForm();
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
          <Pill size={20} color="#8B5CF6" />
          <Text
            style={{
              marginLeft: 10,
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Add Supplement
          </Text>
        </View>
        <HapticPressable
          onPress={handleClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </HapticPressable>
      </View>

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error Message */}
        {error ? (
          <View
            style={{
              backgroundColor: '#FEE2E2',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {/* Supplement Name */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#D1D5DB' : '#374151',
            marginBottom: 8,
          }}
        >
          Supplement Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Vitamin D, Creatine, Omega-3"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          style={{
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderRadius: 10,
            padding: 14,
            fontSize: 16,
            color: isDark ? '#F3F4F6' : '#1F2937',
            marginBottom: 16,
          }}
        />

        {/* Category */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#D1D5DB' : '#374151',
            marginBottom: 8,
          }}
        >
          Category
        </Text>
        <HapticPressable
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          style={{
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderRadius: 10,
            padding: 14,
            marginBottom: showCategoryPicker ? 8 : 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: CATEGORY_COLORS[category],
                marginRight: 10,
              }}
            />
            <Text style={{ fontSize: 16, color: isDark ? '#F3F4F6' : '#1F2937' }}>
              {category}
            </Text>
          </View>
          <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {showCategoryPicker ? '▲' : '▼'}
          </Text>
        </HapticPressable>

        {/* Category Picker */}
        {showCategoryPicker && (
          <View
            style={{
              backgroundColor: isDark ? '#4B5563' : '#E5E7EB',
              borderRadius: 10,
              marginBottom: 16,
              maxHeight: 200,
              overflow: 'hidden',
            }}
          >
            {SUPPLEMENT_CATEGORIES.map((cat) => (
              <HapticPressable
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryPicker(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  backgroundColor:
                    cat === category
                      ? isDark
                        ? '#6B7280'
                        : '#D1D5DB'
                      : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: CATEGORY_COLORS[cat],
                    marginRight: 10,
                  }}
                />
                <Text style={{ color: isDark ? '#F3F4F6' : '#1F2937' }}>{cat}</Text>
              </HapticPressable>
            ))}
          </View>
        )}

        {/* Dosage */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#D1D5DB' : '#374151',
            marginBottom: 8,
          }}
        >
          Dosage *
        </Text>
        <TextInput
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g., 5g, 1000mg, 2 capsules"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          style={{
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderRadius: 10,
            padding: 14,
            fontSize: 16,
            color: isDark ? '#F3F4F6' : '#1F2937',
            marginBottom: 16,
          }}
        />

        {/* Schedule */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#D1D5DB' : '#374151',
            marginBottom: 8,
          }}
        >
          When to Take
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {COMMON_SCHEDULES.map((sched) => (
            <HapticPressable
              key={sched}
              onPress={() => setSchedule(sched)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor:
                  schedule === sched
                    ? '#8B5CF6'
                    : isDark
                    ? '#374151'
                    : '#F3F4F6',
                borderWidth: 1,
                borderColor:
                  schedule === sched
                    ? '#8B5CF6'
                    : isDark
                    ? '#4B5563'
                    : '#E5E7EB',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color:
                    schedule === sched
                      ? '#FFFFFF'
                      : isDark
                      ? '#D1D5DB'
                      : '#4B5563',
                  fontWeight: schedule === sched ? '600' : '400',
                }}
              >
                {sched}
              </Text>
            </HapticPressable>
          ))}
        </View>

        {/* Notes (optional) */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isDark ? '#D1D5DB' : '#374151',
            marginBottom: 8,
          }}
        >
          Notes (optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions..."
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderRadius: 10,
            padding: 14,
            fontSize: 16,
            color: isDark ? '#F3F4F6' : '#1F2937',
            marginBottom: 24,
            minHeight: 80,
            textAlignVertical: 'top',
          }}
        />

        {/* Submit Button */}
        <HapticPressable
          onPress={handleSubmit}
          disabled={isLoading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#8B5CF6',
            paddingVertical: 16,
            borderRadius: 12,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Plus size={20} color="#FFFFFF" />
              <Text
                style={{
                  marginLeft: 8,
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Add Supplement
              </Text>
            </>
          )}
        </HapticPressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
