import { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Timer, Check } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticPressable } from '../HapticPressable';

interface RestTimePickerModalProps {
  visible: boolean;
  currentRestTime: number | null;
  onSelect: (seconds: number | null) => void;
  onClose: () => void;
}

const REST_TIME_OPTIONS = [
  { label: 'Use Default', value: null, description: 'Use each exercise\'s default rest time' },
  { label: '30 seconds', value: 30, description: 'Quick rest' },
  { label: '45 seconds', value: 45, description: 'Short rest' },
  { label: '60 seconds', value: 60, description: '1 minute' },
  { label: '90 seconds', value: 90, description: '1.5 minutes' },
  { label: '2 minutes', value: 120, description: 'Standard rest' },
  { label: '2.5 minutes', value: 150, description: 'Moderate rest' },
  { label: '3 minutes', value: 180, description: 'Longer rest' },
  { label: '4 minutes', value: 240, description: 'Extended rest' },
  { label: '5 minutes', value: 300, description: 'Heavy lifting rest' },
];

/**
 * Modal for selecting a custom rest time that applies to all exercises
 */
export const RestTimePickerModal = ({
  visible,
  currentRestTime,
  onSelect,
  onClose,
}: RestTimePickerModalProps) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

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

  const handleSelect = (value: number | null) => {
    onSelect(value);
    onClose();
  };

  return (
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Timer size={20} color="#6366F1" />
          <Text
            style={{
              marginLeft: 10,
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Set Rest Timer
          </Text>
        </View>
        <HapticPressable
          onPress={onClose}
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

      {/* Description */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 13,
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Choose a rest time that will apply to all exercises in this session
        </Text>
      </View>

      {/* Options */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {REST_TIME_OPTIONS.map((option) => {
          const isSelected = currentRestTime === option.value;

          return (
            <HapticPressable
              key={option.label}
              onPress={() => handleSelect(option.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                marginBottom: 8,
                borderRadius: 12,
                backgroundColor: isSelected
                  ? isDark
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'rgba(99, 102, 241, 0.1)'
                  : isDark
                    ? '#374151'
                    : '#F9FAFB',
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected
                  ? '#6366F1'
                  : isDark
                    ? '#4B5563'
                    : '#E5E7EB',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isSelected
                      ? '#6366F1'
                      : isDark
                        ? '#F3F4F6'
                        : '#1F2937',
                  }}
                >
                  {option.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    marginTop: 2,
                  }}
                >
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#6366F1',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={16} color="#FFFFFF" />
                </View>
              )}
            </HapticPressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

export default RestTimePickerModal;
