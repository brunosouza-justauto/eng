import { Tabs } from 'expo-router';
import { View, Text, Image, Pressable } from 'react-native';
import { Home, Dumbbell, Utensils, Pill, Footprints, Droplets, ClipboardCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import HeaderRight from '../../components/HeaderRight';

// Custom tab bar button with haptic feedback
function HapticTabButton(props: any) {
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPress?.(e);
      }}
    />
  );
}

export default function TabLayout() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
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
        tabBarButton: HapticTabButton,
        headerStyle: {
          backgroundColor: backgroundColor,
        },
        headerTintColor: isDark ? '#FFFFFF' : '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Home color={color} size={20} />,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
              />
              <Text style={{ fontSize: 17, fontWeight: '600', color: isDark ? '#FFFFFF' : '#111827' }}>
                Earned Not Given 👊
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tabs.workout'),
          tabBarIcon: ({ color }) => <Dumbbell color={color} size={20} />,
          headerTitle: t('workout.program'),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tabs.nutrition'),
          tabBarIcon: ({ color }) => <Utensils color={color} size={20} />,
          headerTitle: t('nutrition.mealPlan'),
        }}
      />
      <Tabs.Screen
        name="sups"
        options={{
          title: t('tabs.supplements'),
          tabBarIcon: ({ color }) => <Pill color={color} size={20} />,
          headerTitle: t('supplements.title'),
        }}
      />
      <Tabs.Screen
        name="steps"
        options={{
          title: t('steps.title'),
          tabBarIcon: ({ color }) => <Footprints color={color} size={20} />,
          headerTitle: t('steps.stepsTracking'),
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: t('water.title'),
          tabBarIcon: ({ color }) => <Droplets color={color} size={20} />,
          headerTitle: t('water.waterTracking'),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: t('checkIn.checkIn'),
          tabBarIcon: ({ color }) => <ClipboardCheck color={color} size={20} />,
          headerTitle: t('checkIn.title'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerTitle: t('profile.title'),
          href: null, // Hide from tab bar, accessible via header
        }}
      />
    </Tabs>
  );
}
