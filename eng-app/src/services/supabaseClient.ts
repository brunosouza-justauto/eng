import { createClient } from '@supabase/supabase-js';

// Fetch environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check to ensure variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Track the last visibility change time globally
let lastVisibilityChangeTime = 0;

// Listen for visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastVisibilityChangeTime = Date.now();
      console.log('Visibility change tracked in supabaseClient');
    }
  });
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic token refresh but with manual control
    autoRefreshToken: true,
    persistSession: true,
    
    // Disable URL detection to prevent auto-redirects
    detectSessionInUrl: true,
    
    // Custom storage key to isolate the auth state
    storageKey: 'eng_supabase_auth',
    flowType: 'pkce', // More secure flow type for auth
    // Add more robust storage options
    storage: localStorage,
    // Debug to help track issues
    debug: import.meta.env.DEV ? true : false
  },
  global: {
    // Set this to false to ensure reliable token handling
    headers: {
      'X-Client-Info': 'eng-app'
    }
  },
  // Increase timeouts for more reliable auth flows
  realtime: {
    timeout: 60000
  }
});

// Export a function to check if an event happened soon after visibility change
export const wasTriggeredByVisibilityChange = () => {
  return document.visibilityState === 'visible' && 
         (Date.now() - lastVisibilityChangeTime < 2000);
}; 