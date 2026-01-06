import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ModalScreen() {
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <View className={`flex-1 p-6 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Settings
        </Text>
        <Pressable
          onPress={() => router.back()}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <X color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center">
        <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Settings coming soon...
        </Text>
      </View>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
