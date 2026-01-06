import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Calendar, Dumbbell, Utensils, Pill, Footprints, Droplets, ClipboardCheck } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();

  // Today's overview stats
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
  const [mealsLogged, setMealsLogged] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);

  // Fetch today's stats on focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchTodaysStats();
      }
    }, [user?.id])
  );

  const fetchTodaysStats = async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      // Fetch completed workouts today
      const { data: workouts, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('end_time', 'is', null)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`);

      if (!workoutsError && workouts) {
        setWorkoutsCompleted(workouts.length);
      }

      // TODO: Fetch meals logged today
      // TODO: Fetch steps today
      // TODO: Fetch water intake today
    } catch (err) {
      console.error('Error fetching today stats:', err);
    }
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.username) {
      return profile.username;
    }
    return user?.email?.split('@')[0] || 'there';
  };

  const quickActions = [
    {
      title: "Today's Workout",
      icon: Dumbbell,
      color: '#6366F1',
      href: '/(tabs)/workout',
    },
    {
      title: 'Nutrition Plan',
      icon: Utensils,
      color: '#22C55E',
      href: '/(tabs)/nutrition',
    },
    {
      title: 'Supplements',
      icon: Pill,
      color: '#8B5CF6',
      href: '/(tabs)/sups',
    },
    {
      title: 'Daily Steps',
      icon: Footprints,
      color: '#3B82F6',
      href: '/(tabs)/steps',
    },
    {
      title: 'Water Intake',
      icon: Droplets,
      color: '#06B6D4',
      href: '/(tabs)/water',
    },
    {
      title: 'Check-in',
      icon: ClipboardCheck,
      color: '#F59E0B',
      href: '/(tabs)/checkin',
    },
  ];

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Welcome Section */}
      <View className="mb-6">
        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Welcome back, {getDisplayName()}!
        </Text>
        <Text className={`text-base mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Let's crush today's goals
        </Text>
      </View>

      {/* Today's Overview Card */}
      <View
        className={`rounded-2xl p-5 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center mb-4">
          <Calendar color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
          <Text className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Today's Overview
          </Text>
        </View>

        <View className="flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-indigo-500 text-2xl font-bold">{workoutsCompleted}</Text>
            <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Workouts
            </Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-green-500 text-2xl font-bold">0</Text>
            <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Meals
            </Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-blue-500 text-2xl font-bold">0</Text>
            <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Steps
            </Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-cyan-500 text-2xl font-bold">0</Text>
            <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Water
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Quick Actions
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {quickActions.map((action, index) => (
          <Link href={action.href as any} asChild key={index}>
            <Pressable
              className={`w-[31%] rounded-xl p-3 mb-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                className="w-9 h-9 rounded-lg items-center justify-center mb-2"
                style={{ backgroundColor: `${action.color}20` }}
              >
                <action.icon color={action.color} size={18} />
              </View>
              <Text className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {action.title}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
