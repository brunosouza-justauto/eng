import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function WorkoutSessionScreen() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="items-center py-20">
        <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Workout Session
        </Text>
        <Text className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Coming soon...
        </Text>
        <Text className={`text-xs mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Workout ID: {id}
        </Text>
      </View>
    </ScrollView>
  );
}
