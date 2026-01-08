import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug: Log configuration status
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseAnonKey ? 'Set (length: ' + supabaseAnonKey.length + ')' : 'Not set');

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
console.log('Supabase configured:', isSupabaseConfigured);

// Custom storage adapter for better React Native compatibility
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  },
};

// Create the Supabase client
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Custom storage key matching eng-app
        storageKey: 'eng_supabase_auth',
        // Don't automatically start refresh on initialization
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'eng-native',
        },
      },
    })
  : (null as unknown as SupabaseClient);

// Set up app state listener for token refresh (only on native)
if (isSupabaseConfigured && Platform.OS !== 'web') {
  AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      try {
        // Check if session is valid before starting auto refresh
        const { error } = await supabase.auth.getSession();
        if (error) {
          // Invalid session - don't start auto refresh
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            console.log('[Supabase] Invalid refresh token on app resume - clearing session');
            await AsyncStorage.removeItem('eng_supabase_auth');
            await supabase.auth.signOut();
            return;
          }
        }
        supabase.auth.startAutoRefresh();
      } catch (err) {
        console.error('[Supabase] Error checking session on app resume:', err);
        // If there's an error, try to clear and sign out
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('Refresh Token') || errorMessage.includes('refresh_token')) {
          try {
            await AsyncStorage.removeItem('eng_supabase_auth');
            await supabase.auth.signOut();
          } catch (clearErr) {
            console.error('[Supabase] Error clearing session:', clearErr);
          }
        }
      }
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// Helper to check Supabase availability
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};
