import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PickerOption {
  label: string;
  value: string | null;
}

interface CustomPickerProps {
  selectedValue: string | null;
  onValueChange: (value: any) => void;
  options: PickerOption[];
  placeholder?: string;
  hasError?: boolean;
}

export default function CustomPicker({
  selectedValue,
  onValueChange,
  options,
  placeholder = 'Select an option',
  hasError = false,
}: CustomPickerProps) {
  const { isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (value: string | null) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        className={`flex-row items-center justify-between rounded-xl px-4 py-4 border ${
          hasError
            ? 'border-red-500'
            : isDark
            ? 'bg-gray-700 border-gray-600'
            : 'bg-gray-50 border-gray-200'
        } ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
      >
        <Text
          className={`text-base ${
            selectedValue
              ? isDark
                ? 'text-white'
                : 'text-gray-900'
              : isDark
              ? 'text-gray-400'
              : 'text-gray-500'
          }`}
        >
          {displayText}
        </Text>
        <ChevronDown color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setModalVisible(false)}
        >
          <View
            className={`w-[85%] max-h-[70%] rounded-2xl overflow-hidden ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <View
              className={`px-4 py-3 border-b ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <Text
                className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {placeholder}
              </Text>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item.value)}
                  className={`flex-row items-center justify-between px-4 py-4 border-b ${
                    isDark ? 'border-gray-700' : 'border-gray-100'
                  } ${
                    selectedValue === item.value
                      ? isDark
                        ? 'bg-indigo-900/30'
                        : 'bg-indigo-50'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selectedValue === item.value
                        ? 'text-indigo-500 font-medium'
                        : isDark
                        ? 'text-white'
                        : 'text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {selectedValue === item.value && (
                    <Check color="#6366F1" size={20} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
