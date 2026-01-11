import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys for different data types
export const CacheKeys = {
  // Auth/User caches (not user-specific, for offline cold start)
  lastUserId: '@cache/last-user-id',
  lastUser: '@cache/last-user',
  lastProfile: '@cache/last-profile',

  // User data caches
  workoutProgram: (userId: string) => `@cache/workout-program/${userId}`,
  nutritionPlan: (userId: string) => `@cache/nutrition-plan/${userId}`,
  supplements: (userId: string) => `@cache/supplements/${userId}`,
  waterGoal: (userId: string) => `@cache/water-goal/${userId}`,
  stepGoal: (userId: string) => `@cache/step-goal/${userId}`,
  profile: (userId: string) => `@cache/profile/${userId}`,
  homeStats: (userId: string) => `@cache/home-stats/${userId}`,

  // Today's data caches (refreshed daily)
  todaysWorkout: (userId: string) => `@cache/todays-workout/${userId}`,
  todaysMeals: (userId: string) => `@cache/todays-meals/${userId}`,
  todaysSupplements: (userId: string) => `@cache/todays-supplements/${userId}`,
  todaysWater: (userId: string) => `@cache/todays-water/${userId}`,
  todaysSteps: (userId: string) => `@cache/todays-steps/${userId}`,

  // Workout history caches (for pre-filling weights)
  previousWorkoutSets: (userId: string, workoutId: string) => `@cache/prev-sets/${userId}/${workoutId}`,

  // Sync-related keys
  syncQueue: '@sync/queue',
  lastSyncTime: '@sync/last-sync-time',
} as const;

/**
 * Get cached data by key (async)
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error(`[Storage] Error reading cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Get cached data by key (sync version using in-memory fallback)
 * Note: First call may return null, subsequent calls are faster
 */
const memoryCache: Record<string, any> = {};

export function getCacheSync<T>(key: string): T | null {
  return memoryCache[key] ?? null;
}

/**
 * Set cached data by key (async)
 */
export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const json = JSON.stringify(data);
    await AsyncStorage.setItem(key, json);
    // Also update memory cache
    memoryCache[key] = data;
  } catch (error) {
    console.error(`[Storage] Error writing cache for key ${key}:`, error);
  }
}

/**
 * Delete cached data by key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    delete memoryCache[key];
  } catch (error) {
    console.error(`[Storage] Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear all cached data (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('@cache/') || k.startsWith('@sync/'));
    await AsyncStorage.multiRemove(cacheKeys);
    // Clear memory cache
    Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  } catch (error) {
    console.error('[Storage] Error clearing all cache:', error);
  }
}

/**
 * Check if a cache key exists
 */
export async function hasCache(key: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  } catch {
    return false;
  }
}

/**
 * Get all cache keys
 */
export async function getAllCacheKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.startsWith('@cache/') || k.startsWith('@sync/'));
  } catch {
    return [];
  }
}

/**
 * Get cache metadata (for debugging)
 */
export async function getCacheSize(): Promise<number> {
  const keys = await getAllCacheKeys();
  return keys.length;
}

/**
 * Clear user-specific cache (on logout)
 */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter((key) => key.includes(userId));
    await AsyncStorage.multiRemove(userKeys);
    // Clear from memory cache
    userKeys.forEach((key) => delete memoryCache[key]);
  } catch (error) {
    console.error('[Storage] Error clearing user cache:', error);
  }
}

/**
 * Preload cache into memory for faster sync access
 */
export async function preloadCache(): Promise<void> {
  try {
    const keys = await getAllCacheKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([key, value]) => {
      if (value) {
        try {
          memoryCache[key] = JSON.parse(value);
        } catch {
          // Ignore parse errors
        }
      }
    });
  } catch (error) {
    console.error('[Storage] Error preloading cache:', error);
  }
}

/**
 * Get the last cached user ID for offline cold start
 */
export async function getLastUserId(): Promise<string | null> {
  try {
    const userId = await getCache<string>(CacheKeys.lastUserId);
    return userId;
  } catch {
    return null;
  }
}
