import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';
// Import other reducers here later

// Configure persist for auth slice
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['profile'], // Only persist the profile part of the auth state
};

// Configure persist for UI slice
const uiPersistConfig = {
  key: 'ui',
  storage,
  whitelist: ['theme'], // Only persist theme setting
};

// Configure persist for notification slice
const notificationPersistConfig = {
  key: 'notifications',
  storage,
  whitelist: ['unreadCount'], // Only persist unread count
};

// Create the store with our reducers
export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    ui: persistReducer(uiPersistConfig, uiReducer),
    notifications: persistReducer(notificationPersistConfig, notificationReducer),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Ignore specific non-serializable actions from redux-persist
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  // devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Types remain the same, but derived from rootReducer now
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 