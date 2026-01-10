import { useRef, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface RepsPickerModalProps {
  visible: boolean;
  currentReps: number;
  onSelect: (reps: number) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const MAX_REPS = 50;
const PICKER_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT;

/**
 * Modal picker for selecting reps with a scroll wheel
 */
export const RepsPickerModal = ({
  visible,
  currentReps,
  onSelect,
  onClose,
}: RepsPickerModalProps) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(currentReps - 1);

  const repsOptions = Array.from({ length: MAX_REPS }, (_, i) => i + 1);

  // Scroll to current value when modal opens
  useEffect(() => {
    if (visible && scrollViewRef.current) {
      const index = Math.max(0, currentReps - 1);
      setSelectedIndex(index);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible, currentReps]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, repsOptions.length - 1));
    setSelectedIndex(clampedIndex);
  };

  const handleConfirm = () => {
    onSelect(repsOptions[selectedIndex]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom || 20,
          }}
        >
          {/* Handle indicator */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
              }}
            />
          </View>

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
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              Select Reps
            </Text>
            <Pressable
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
            </Pressable>
          </View>

          {/* Picker */}
          <View style={{ height: PICKER_HEIGHT, position: 'relative', marginVertical: 16 }}>
            {/* Selection indicator */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
                left: 20,
                right: 20,
                height: ITEM_HEIGHT,
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#6366F1',
                zIndex: 1,
              }}
            />

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingVertical: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
              }}
            >
              {repsOptions.map((reps, index) => (
                <Pressable
                  key={reps}
                  onPress={() => {
                    setSelectedIndex(index);
                    scrollViewRef.current?.scrollTo({
                      y: index * ITEM_HEIGHT,
                      animated: true,
                    });
                  }}
                  style={{
                    height: ITEM_HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '600',
                      color: index === selectedIndex
                        ? '#6366F1'
                        : isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {reps}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Confirm Button */}
          <View style={{ paddingHorizontal: 20 }}>
            <Pressable
              onPress={handleConfirm}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#6366F1',
                borderRadius: 12,
                paddingVertical: 14,
                gap: 8,
              }}
            >
              <Check size={20} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Select {repsOptions[selectedIndex]} Reps
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RepsPickerModal;
