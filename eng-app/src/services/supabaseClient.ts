import { createClient } from '@supabase/supabase-js';

// Fetch environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check to ensure variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure the redirect behavior when using Supabase auth
    autoRefreshToken: false, // Disable automatic refreshing on window focus
    detectSessionInUrl: true,
    persistSession: true,
    // Custom storage key to isolate the auth state
    storageKey: 'eng_supabase_auth',
    flowType: 'pkce' // More secure flow type for auth
  }
}); 