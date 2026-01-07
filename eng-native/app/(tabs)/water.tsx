import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Droplets, Plus, Minus, Target, AlertCircle } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function WaterScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [glasses, setGlasses] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // TODO: Fetch water intake data
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const waterGoal = 8; // glasses
  const glassSize = 250; // ml
  const progress = (glasses / waterGoal) * 100;

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
        <Droplets color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sign in to track your water intake
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Stay hydrated and track your daily water consumption
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      }
    >
      {/* Today's Water Intake */}
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
          {/* Water Circle */}
          <View className="w-36 h-36 rounded-full border-8 border-cyan-500 items-center justify-center mb-4">
            <Droplets color="#06B6D4" size={32} />
            <Text className={`text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {glasses}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              glasses
            </Text>
          </View>

          <Text className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {(glasses * glassSize / 1000).toFixed(1)}L / {(waterGoal * glassSize / 1000).toFixed(1)}L
          </Text>

          {/* Progress Bar */}
          <View className={`w-full h-3 rounded-full mt-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <View
              className="h-3 rounded-full bg-cyan-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </View>
          <Text className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {progress.toFixed(0)}% of daily goal
          </Text>

          {/* Add/Remove Buttons */}
          <View className="flex-row items-center mt-6">
            <Pressable
              onPress={() => setGlasses(Math.max(0, glasses - 1))}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                isDark ? 'bg-gray-700' : 'bg-gray-100'
              }`}
            >
              <Minus color={isDark ? '#9CA3AF' : '#6B7280'} size={24} />
            </Pressable>

            <View className="mx-6">
              <Text className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {glassSize}ml per glass
              </Text>
            </View>

            <Pressable
              onPress={() => setGlasses(glasses + 1)}
              className="w-14 h-14 rounded-full items-center justify-center bg-cyan-500"
            >
              <Plus color="#FFFFFF" size={24} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Quick Add */}
      <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Quick Add
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {[1, 2, 3, 4].map((amount) => (
          <Pressable
            key={amount}
            onPress={() => setGlasses(glasses + amount)}
            className={`w-[48%] rounded-xl p-4 mb-3 items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Droplets color="#06B6D4" size={20} />
            <Text className={`font-semibold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              +{amount} {amount === 1 ? 'glass' : 'glasses'}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {amount * glassSize}ml
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
