import { View, Text, ScrollView, Pressable } from 'react-native';
import { Pill, Plus, Clock, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function SupsScreen() {
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
        <Pill color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sign in to view your supplements
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your supplement schedule will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Today's Supplements */}
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
        <View className="flex-row justify-between items-center mb-4">
          <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Today's Supplements
          </Text>
          <View className="flex-row items-center">
            <Clock color={isDark ? '#9CA3AF' : '#6B7280'} size={16} />
            <Text className={`ml-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              0/0 taken
            </Text>
          </View>
        </View>

        <View className="items-center py-8">
          <Pill color={isDark ? '#4B5563' : '#9CA3AF'} size={48} />
          <Text className={`mt-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No supplements scheduled
          </Text>
          <Text className={`text-sm text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Your coach will assign supplements to you
          </Text>
        </View>
      </View>

      {/* Supplement List Placeholder */}
      <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Your Supplements
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
        <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          No supplements assigned yet
        </Text>
      </View>
    </ScrollView>
  );
}
