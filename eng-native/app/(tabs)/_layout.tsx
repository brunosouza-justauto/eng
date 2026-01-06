import { Tabs } from 'expo-router';
import { Home, Dumbbell, Utensils, Pill, Footprints, Droplets, ClipboardCheck, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const activeColor = '#6366F1'; // Indigo-500 to match eng-app
  const inactiveColor = isDark ? '#9CA3AF' : '#6B7280';
  const backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: backgroundColor,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          height: 52 + (insets.bottom > 0 ? insets.bottom : 6),
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: {
          backgroundColor: backgroundColor,
        },
        headerTintColor: isDark ? '#FFFFFF' : '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={20} />,
          headerTitle: 'ENG',
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <Dumbbell color={color} size={20} />,
          headerTitle: 'Workout Program',
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => <Utensils color={color} size={20} />,
          headerTitle: 'Nutrition Plan',
        }}
      />
      <Tabs.Screen
        name="sups"
        options={{
          title: 'Sups',
          tabBarIcon: ({ color }) => <Pill color={color} size={20} />,
          headerTitle: 'Supplements',
        }}
      />
      <Tabs.Screen
        name="steps"
        options={{
          title: 'Steps',
          tabBarIcon: ({ color }) => <Footprints color={color} size={20} />,
          headerTitle: 'Step Tracking',
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: 'Water',
          tabBarIcon: ({ color }) => <Droplets color={color} size={20} />,
          headerTitle: 'Water Tracking',
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color }) => <ClipboardCheck color={color} size={20} />,
          headerTitle: 'Weekly Check-in',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={20} />,
          headerTitle: 'Profile',
        }}
      />
    </Tabs>
  );
}
