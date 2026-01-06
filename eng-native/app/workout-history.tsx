import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function WorkoutHistoryScreen() {
  const { isDark } = useTheme();

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="items-center py-20">
        <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Workout History
        </Text>
        <Text className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Coming soon...
        </Text>
      </View>
    </ScrollView>
  );
}
