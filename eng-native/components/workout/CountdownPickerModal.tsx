import { useRef, useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Timer, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticPressable } from '../HapticPressable';

interface CountdownPickerModalProps {
  visible: boolean;
  onSelect: (seconds: number) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT;

// Common countdown durations in seconds
const COUNTDOWN_OPTIONS = [
  { label: '30 sec', value: 30 },
  { label: '45 sec', value: 45 },
  { label: '1 min', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2 min', value: 120 },
  { label: '2:30', value: 150 },
  { label: '3 min', value: 180 },
  { label: '4 min', value: 240 },
  { label: '5 min', value: 300 },
];

/**
 * Modal picker for selecting countdown duration
 */
export const CountdownPickerModal = ({
  visible,
  onSelect,
  onClose,
}: CountdownPickerModalProps) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(2); // Default to 60 seconds (index 2)

  // Scroll to default (60 seconds) when modal opens
  useEffect(() => {
    if (visible && scrollViewRef.current) {
      const defaultIndex = COUNTDOWN_OPTIONS.findIndex(opt => opt.value === 60);
      setSelectedIndex(defaultIndex);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: defaultIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, COUNTDOWN_OPTIONS.length - 1));
    setSelectedIndex(clampedIndex);
  };

  const handleStart = () => {
    onSelect(COUNTDOWN_OPTIONS[selectedIndex].value);
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Timer size={20} color="#3B82F6" />
              <Text
                style={{
                  marginLeft: 10,
                  fontSize: 18,
                  fontWeight: '600',
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
              >
                {t('workout.setCountdown')}
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
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#3B82F6',
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
              {COUNTDOWN_OPTIONS.map((option, index) => (
                <HapticPressable
                  key={option.value}
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
                      fontSize: 24,
                      fontWeight: '600',
                      color: index === selectedIndex
                        ? '#3B82F6'
                        : isDark ? '#F3F4F6' : '#1F2937',
                    }}
                  >
                    {option.label}
                  </Text>
                </HapticPressable>
              ))}
            </ScrollView>
          </View>

          {/* Start Button */}
          <View style={{ paddingHorizontal: 20 }}>
            <HapticPressable
              onPress={handleStart}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#3B82F6',
                borderRadius: 12,
                paddingVertical: 14,
                gap: 8,
              }}
            >
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                {t('workout.startCountdown')}
              </Text>
            </HapticPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CountdownPickerModal;
