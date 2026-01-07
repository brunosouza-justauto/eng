import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface RepsPickerModalProps {
  visible: boolean;
  currentReps: number;
  onSelect: (reps: number) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const MAX_REPS = 50;

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

  const repsOptions = Array.from({ length: MAX_REPS }, (_, i) => i + 1);

  // Scroll to current value when modal opens
  useEffect(() => {
    if (visible && scrollViewRef.current) {
      const index = Math.max(0, currentReps - 1);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible, currentReps]);

  const handleSelect = (reps: number) => {
    onSelect(reps);
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
            height: 400,
            paddingBottom: insets.bottom,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
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
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT, position: 'relative' }}>
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
                contentContainerStyle={{
                  paddingVertical: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
                }}
              >
                {repsOptions.map((reps) => (
                  <Pressable
                    key={reps}
                    onPress={() => handleSelect(reps)}
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
                        color: isDark ? '#F3F4F6' : '#1F2937',
                      }}
                    >
                      {reps}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RepsPickerModal;
