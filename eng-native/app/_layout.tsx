import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { OfflineProvider, useOffline } from '../contexts/OfflineContext';
import { precacheAllUserData } from '../lib/precacheService';
import NotificationsModal from '../components/NotificationsModal';
import UpdatePrompt from '../components/UpdatePrompt';
import IncompleteProfilePrompt from '../components/IncompleteProfilePrompt';

// Import global CSS for NativeWind/Tailwind
import '../global.css';

// Set NativeWind to use class-based dark mode on web
if (Platform.OS === 'web' && typeof (StyleSheet as any).setFlag === 'function') {
  (StyleSheet as any).setFlag('darkMode', 'class');
}

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Hide splash screen immediately
SplashScreen.hideAsync();

function useProtectedRoute(user: any, profile: any, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Logged in but on login page
      // Check if onboarding is complete
      if (profile && !profile.onboarding_complete) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else if (user && !inOnboarding && profile && !profile.onboarding_complete) {
      // Logged in, not on onboarding, but onboarding not complete
      router.replace('/onboarding');
    } else if (user && inOnboarding && profile && profile.onboarding_complete) {
      // On onboarding but already completed, go to tabs
      router.replace('/(tabs)');
    }
  }, [user, profile, segments, loading]);
}

function AppContent() {
  const { isDark } = useTheme();
  const { user, profile, loading } = useAuth();
  const { isOnline, isInitialized } = useOffline();
  const hasPrecached = useRef(false);

  useProtectedRoute(user, profile, loading);

  // Proactively cache all user data when app loads while online
  useEffect(() => {
    if (
      !loading &&
      isInitialized &&
      isOnline &&
      user?.id &&
      profile?.id &&
      !hasPrecached.current
    ) {
      hasPrecached.current = true;
      console.log('[AppContent] Starting proactive data precaching...');

      precacheAllUserData(user.id, profile.id, profile)
        .then((result) => {
          console.log(
            `[AppContent] Precaching complete: ${result.cached} items cached, success: ${result.success}`
          );
          if (result.errors.length > 0) {
            console.warn('[AppContent] Precache errors:', result.errors);
          }
        })
        .catch((err) => {
          console.error('[AppContent] Precaching failed:', err);
        });
    }
  }, [loading, isInitialized, isOnline, user?.id, profile?.id, profile]);

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        },
        headerTintColor: isDark ? '#FFFFFF' : '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          gestureEnabled: false, // Prevent swiping back
        }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="modal"
        options={{
          presentation: 'modal',
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="workout-plan/[id]"
        options={{
          title: 'Workout Plan',
        }}
      />
      <Stack.Screen
        name="workout-session/[id]"
        options={{
          title: 'Workout Session',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="workout-history"
        options={{
          title: 'Workout History',
        }}
      />
      <Stack.Screen
        name="nutrition-plan/[id]"
        options={{
          title: 'Nutrition Plan',
        }}
      />
      <Stack.Screen
        name="checkin-form"
        options={{
          title: 'Weekly Check-in',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <AuthProvider>
              <OfflineProvider>
                <NotificationsProvider>
                  <AppContent />
                  <NotificationsModal />
                  <UpdatePrompt />
                  <IncompleteProfilePrompt />
                </NotificationsProvider>
              </OfflineProvider>
            </AuthProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
