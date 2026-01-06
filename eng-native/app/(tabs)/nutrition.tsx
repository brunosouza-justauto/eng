import { View, Text, ScrollView } from 'react-native';
import { Utensils, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function NutritionScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AlertCircle color="#F59E0B" size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Supabase Not Configured
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Please add your Supabase credentials to the .env file
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Utensils color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sign in to view your nutrition plan
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your personalized meal plans will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Macros Overview */}
      <View
        className={`rounded-2xl p-5 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Today's Macros
        </Text>

        <View className="flex-row justify-between">
          {/* Protein */}
          <View className="items-center flex-1">
            <View className="w-16 h-16 rounded-full border-4 border-red-500 items-center justify-center mb-2">
              <Text className="text-red-500 font-bold">0g</Text>
            </View>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Protein</Text>
            <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/ 0g</Text>
          </View>

          {/* Carbs */}
          <View className="items-center flex-1">
            <View className="w-16 h-16 rounded-full border-4 border-yellow-500 items-center justify-center mb-2">
              <Text className="text-yellow-500 font-bold">0g</Text>
            </View>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Carbs</Text>
            <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/ 0g</Text>
          </View>

          {/* Fat */}
          <View className="items-center flex-1">
            <View className="w-16 h-16 rounded-full border-4 border-blue-500 items-center justify-center mb-2">
              <Text className="text-blue-500 font-bold">0g</Text>
            </View>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fat</Text>
            <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/ 0g</Text>
          </View>
        </View>
      </View>

      {/* Meals List Placeholder */}
      <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Today's Meals
      </Text>

      <View
        className={`rounded-2xl p-8 items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Utensils color={isDark ? '#4B5563' : '#9CA3AF'} size={40} />
        <Text className={`mt-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          No meals scheduled for today
        </Text>
        <Text className={`text-sm text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Your meal plan will appear here once assigned by your coach
        </Text>
      </View>
    </ScrollView>
  );
}
