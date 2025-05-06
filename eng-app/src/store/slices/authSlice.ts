import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session, User } from '@supabase/supabase-js';
import type { RootState } from '../store'; // Import RootState type

// Define and Export the type for the profile data
export interface ProfileData {
  id: string; // Profile table's primary key (uuid)
  user_id: string; // Foreign key to auth.users
  username: string | null; // Add username field
  email: string | null; // Add email field
  onboarding_complete: boolean;
  role: string; // Add the role field
  height_cm: number | null; // Add height_cm field
  weight_kg: number | null; // Add weight_kg field
  age: number | null; // Add age field
  gender: 'male' | 'female' | null; // Add gender field
  // Add other profile fields you might want in Redux state later (username, role, etc.)
}

// Define a type for the slice state
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileData | null; // Add profile state
  isLoading: boolean;
  error: string | null;
}

// Define the initial state using that type
const initialState: AuthState = {
  session: null,
  user: null,
  profile: null, // Initialize profile as null
  isLoading: true, // Start as true to check for existing session on load
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
      state.user = action.payload?.user ?? null;
      // Reset profile when session changes, it will be fetched again
      state.profile = null; 
      state.isLoading = false; // Set loading false *after* session is checked/set
      state.error = null;
    },
    setProfile: (state, action: PayloadAction<ProfileData | null>) => {
        state.profile = action.payload;
        // Potentially set loading false here if profile fetch is the last step
        // state.isLoading = false; 
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    logout: (state) => {
      state.session = null;
      state.user = null;
      state.profile = null; // Clear profile on logout
      state.isLoading = false;
      state.error = null;
    },
  },
});

// Export actions
export const { setSession, setProfile, setLoading, setError, logout } = authSlice.actions;

// Selectors
export const selectSession = (state: RootState) => state.auth.session;
export const selectUser = (state: RootState) => state.auth.user;
export const selectProfile = (state: RootState) => state.auth.profile; // Add profile selector
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.session;
export const selectAuthError = (state: RootState) => state.auth.error;

// Export the reducer as default
export default authSlice.reducer; 