const WGER_API_URL = 'https://wger.de/api/v2';
// Ensure VITE_WGER_API_KEY is set in your .env file
const API_KEY = import.meta.env.VITE_WGER_API_KEY;
const EXERCISE_CACHE_KEY = 'wgerExercisesCache';

if (!API_KEY) {
    console.warn('WGER API Key (VITE_WGER_API_KEY) not found in environment variables. Exercise fetching may fail.');
    // Optionally throw an error if the key is absolutely required at build/startup
    // throw new Error('VITE_WGER_API_KEY is required.');
}

// --- Types (Define more specific types based on actual API response) ---
// Export the interface
export interface WgerExercise {
    id: number;
    uuid: string;
    name: string;
    description: string;
    category: number;
    muscles: number[];
    muscles_secondary: number[];
    equipment: number[];
    language: number;
    license: number;
    license_author: string | null;
    // Add other relevant fields: variations, images, etc.
}

// Export the interface
export interface WgerApiResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// --- API Fetch Function ---
const fetchWger = async <T,>(endpoint: string, params?: Record<string, string | number>): Promise<T> => {
    const url = new URL(`${WGER_API_URL}${endpoint}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, String(value)));
    }

    const headers: HeadersInit = {
        'Accept': 'application/json',
    };
    // Only add Authorization header if API_KEY is present
    if (API_KEY) {
        headers['Authorization'] = `Token ${API_KEY}`;
    }

    try {
        const response = await fetch(url.toString(), { headers });
        if (!response.ok) {
            // Attempt to parse error details from wger if available
            let errorBody = 'Unknown API Error';
            try { errorBody = await response.text(); } catch { /* Ignore */ }
            throw new Error(`Wger API Error (${response.status}): ${response.statusText}. Body: ${errorBody}`);
        }
        return await response.json() as T;
    } catch (error) {
        console.error(`Error fetching from Wger endpoint ${endpoint}:`, error);
        throw error; // Re-throw after logging
    }
};

// --- Service Functions ---

/**
 * Fetches a list of exercises from the wger API, using sessionStorage for caching.
 * Retrieves all exercises by default.
 */
export const getAllExercisesCached = async (): Promise<WgerExercise[]> => {
    // Try to get from cache first
    const cachedData = sessionStorage.getItem(EXERCISE_CACHE_KEY);
    if (cachedData) {
        console.log('Returning cached exercises');
        try {
            return JSON.parse(cachedData) as WgerExercise[];
        } catch (e) {
            console.error('Failed to parse cached exercises:', e);
            sessionStorage.removeItem(EXERCISE_CACHE_KEY); // Clear corrupted cache
        }
    }

    console.log('Fetching all exercises from wger API...');
    let allExercises: WgerExercise[] = [];
    let offset = 0;
    const limit = 100; // Fetch in batches of 100
    let hasMore = true;

    try {
        while (hasMore) {
            const response = await fetchWger<WgerApiResponse<WgerExercise>>('/exercise/', {
                limit,
                offset,
                language: 2, // English
            });
            allExercises = allExercises.concat(response.results);
            offset += limit;
            hasMore = response.next !== null;
            console.log(`Fetched ${allExercises.length} / ${response.count} exercises...`);
        }
        
        // Cache the result
        try {
            sessionStorage.setItem(EXERCISE_CACHE_KEY, JSON.stringify(allExercises));
            console.log(`Cached ${allExercises.length} exercises.`);
        } catch (e) {
            console.error('Failed to cache exercises (storage full?): ', e);
        }

        return allExercises;

    } catch (error) {
        console.error('Failed to fetch all exercises:', error);
        return []; // Return empty array on failure
    }
};

/**
 * Fetches details for a single exercise by its ID.
 * (Consider caching this too if exercises are fetched frequently by ID)
 */
export const getExerciseById = async (id: number): Promise<WgerExercise> => {
    return fetchWger<WgerExercise>(`/exercise/${id}/`);
};

// TODO:
// - Add functions to fetch related data like categories, muscles, equipment (consider caching these too).
// - Explore more robust caching (IndexedDB, React Query/SWR) if sessionStorage is insufficient.

// Remove or deprecate the paginated version if not needed
// export const getExercises = async (
//     limit: number = 20,
//     offset: number = 0
// ): Promise<WgerApiResponse<WgerExercise>> => {
//     return fetchWger<WgerApiResponse<WgerExercise>>('/exercise/', { limit, offset, language: 2 });
// }; 