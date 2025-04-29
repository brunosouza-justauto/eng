import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Function to get initial theme from local storage or system preference
const getInitialTheme = (): 'light' | 'dark' => {
  // Check if theme is saved in localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  // If no saved preference, check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  // Default to light mode
  return 'light';
};

interface UIState {
  theme: 'light' | 'dark';
}

const initialState: UIState = {
  theme: typeof window !== 'undefined' ? getInitialTheme() : 'light',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      // Save preference to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', state.theme);
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      // Save preference to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', state.theme);
      }
    },
  },
});

// Export actions
export const { toggleTheme, setTheme } = uiSlice.actions;

// Export selectors
export const selectTheme = (state: RootState) => state.ui.theme;

// Export reducer
export default uiSlice.reducer; 