import { View, Text, ScrollView, Pressable } from 'react-native';
import { Footprints, Target, TrendingUp, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function StepsScreen() {
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
        <Footprints color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sign in to track your steps
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Connect your fitness device to sync steps
        </Text>
      </View>
    );
  }

  const stepGoal = 10000;
  const currentSteps = 0;
  const progress = (currentSteps / stepGoal) * 100;

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Today's Steps Card */}
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
        <View className="items-center">
          <View className="w-32 h-32 rounded-full border-8 border-blue-500 items-center justify-center mb-4">
            <Footprints color="#3B82F6" size={32} />
            <Text className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentSteps.toLocaleString()}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Target color={isDark ? '#9CA3AF' : '#6B7280'} size={16} />
            <Text className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Goal: {stepGoal.toLocaleString()} steps
            </Text>
          </View>

          {/* Progress Bar */}
          <View className={`w-full h-3 rounded-full mt-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <View
              className="h-3 rounded-full bg-blue-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </View>
          <Text className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {progress.toFixed(0)}% of daily goal
          </Text>
        </View>
      </View>

      {/* Weekly Stats */}
      <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        This Week
      </Text>

      <View
        className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="flex-row justify-between mb-4">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <View key={index} className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  0
                </Text>
              </View>
              <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <View className="items-center flex-1">
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>0</Text>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg Steps</Text>
          </View>
          <View className="items-center flex-1">
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>0</Text>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Goals Hit</Text>
          </View>
          <View className="items-center flex-1">
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>0</Text>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Steps</Text>
          </View>
        </View>
      </View>

      {/* Connect Device */}
      <Pressable
        className={`rounded-xl p-4 mt-4 flex-row items-center justify-center border-2 border-dashed ${
          isDark ? 'border-gray-700' : 'border-gray-300'
        }`}
      >
        <TrendingUp color={isDark ? '#6B7280' : '#9CA3AF'} size={20} />
        <Text className={`ml-2 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Connect Fitness Device
        </Text>
      </Pressable>
    </ScrollView>
  );
}
