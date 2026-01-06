import { View, Text, ScrollView, Pressable } from 'react-native';
import { ClipboardCheck, Camera, Scale, FileText, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function CheckinScreen() {
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
        <ClipboardCheck color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sign in to submit check-ins
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Weekly check-ins help your coach track your progress
        </Text>
      </View>
    );
  }

  const checkinItems = [
    {
      title: 'Progress Photos',
      description: 'Front, side, and back photos',
      icon: Camera,
      color: '#6366F1',
      completed: false,
    },
    {
      title: 'Body Weight',
      description: 'Record your current weight',
      icon: Scale,
      color: '#22C55E',
      completed: false,
    },
    {
      title: 'Weekly Notes',
      description: 'How was your week? Any concerns?',
      icon: FileText,
      color: '#F59E0B',
      completed: false,
    },
  ];

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Check-in Status */}
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
        <View className="flex-row items-center justify-between mb-4">
          <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Weekly Check-in
          </Text>
          <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
            <Text className="text-yellow-600 text-xs font-medium">Pending</Text>
          </View>
        </View>

        <Text className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Submit your weekly check-in to keep your coach updated on your progress.
        </Text>

        {/* Progress */}
        <View className="flex-row items-center">
          <View className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <View className="h-2 rounded-full bg-indigo-500" style={{ width: '0%' }} />
          </View>
          <Text className={`ml-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            0/3
          </Text>
        </View>
      </View>

      {/* Check-in Items */}
      <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Required Items
      </Text>

      {checkinItems.map((item, index) => (
        <Pressable
          key={index}
          className={`rounded-xl p-4 mb-3 flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-4"
            style={{ backgroundColor: `${item.color}20` }}
          >
            <item.icon color={item.color} size={24} />
          </View>
          <View className="flex-1">
            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {item.title}
            </Text>
            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {item.description}
            </Text>
          </View>
          {item.completed ? (
            <CheckCircle color="#22C55E" size={24} />
          ) : (
            <View className={`w-6 h-6 rounded-full border-2 ${isDark ? 'border-gray-600' : 'border-gray-300'}`} />
          )}
        </Pressable>
      ))}

      {/* Submit Button */}
      <Pressable
        className="rounded-xl p-4 mt-4 items-center bg-indigo-500 opacity-50"
        disabled
      >
        <Text className="text-white font-semibold">Complete All Items to Submit</Text>
      </Pressable>

      {/* Previous Check-ins */}
      <Text className={`text-lg font-semibold mb-3 mt-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Previous Check-ins
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
        <ClipboardCheck color={isDark ? '#4B5563' : '#9CA3AF'} size={40} />
        <Text className={`mt-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          No previous check-ins
        </Text>
        <Text className={`text-sm text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Your check-in history will appear here
        </Text>
      </View>
    </ScrollView>
  );
}
