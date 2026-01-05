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

// Function to get initial language from local storage or browser preference
const getInitialLanguage = (): 'en' | 'pt-BR' => {
  // Check if language is saved in localStorage
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage === 'en' || savedLanguage === 'pt-BR') {
    return savedLanguage;
  }

  // Check browser language
  const browserLanguage = navigator.language;
  if (browserLanguage.startsWith('pt')) {
    return 'pt-BR';
  }

  // Default to English
  return 'en';
};

interface UIState {
  theme: 'light' | 'dark';
  language: 'en' | 'pt-BR';
}

const initialState: UIState = {
  theme: typeof window !== 'undefined' ? getInitialTheme() : 'light',
  language: typeof window !== 'undefined' ? getInitialLanguage() : 'en',
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
    setLanguage: (state, action: PayloadAction<'en' | 'pt-BR'>) => {
      state.language = action.payload;
      // Save preference to localStorage (i18next manages this key)
      if (typeof window !== 'undefined') {
        localStorage.setItem('i18nextLng', state.language);
      }
    },
  },
});

// Export actions
export const { toggleTheme, setTheme, setLanguage } = uiSlice.actions;

// Export selectors
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectLanguage = (state: RootState) => state.ui.language;

// Export reducer
export default uiSlice.reducer; 