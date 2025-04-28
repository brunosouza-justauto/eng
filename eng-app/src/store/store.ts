import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
// Use specific storage adapter
import createIdbStorage from 'redux-persist-indexeddb-storage'; 

import authReducer from './slices/authSlice';
// Import other reducers here later

// Configure persist
const persistConfig = {
  key: 'root', // Key for storage
  storage: createIdbStorage({name: "eng-app-db", storeName: "eng-app-store"}), // Use IndexedDB
  whitelist: ['auth'] // Persist only the 'auth' slice for now
  // blacklist: ['someSliceToIgnore'] // Alternatively, blacklist slices
};

// Combine reducers if you have more than one
const rootReducer = combineReducers({
  auth: authReducer,
  // Add other reducers here
});

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer, // Use the persisted reducer
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
export type RootState = ReturnType<typeof rootReducer>; 
export type AppDispatch = typeof store.dispatch; 