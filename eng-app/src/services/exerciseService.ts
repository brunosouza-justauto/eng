import axios from 'axios';

const HEYGAINZ_API_URL = 'https://svc.heygainz.com/api';
const EXERCISE_CACHE_KEY = 'heygainzExercisesCache';

// --- Types for HeyGainz API responses ---
export interface HeyGainzMuscle {
  id: number;
  body_part: string;
  name: string;
  region: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
  pivot?: {
    exercise_id: number;
    muscle_id: number;
    type: 'primary' | 'synergist';
  };
}

export interface HeyGainzExercise {
  id: number;
  name: string;
  slug: string;
  description: string;
  seo_description: string;
  type: string;
  youtube_link: string | null;
  gif_url: string;
  instructions: string[];
  tips: string[];
  note: string | null;
  user_id: number | null;
  post_id: number;
  muscles: HeyGainzMuscle[];
  __tntSearchScore__?: number;
  pivot?: {
    muscle_id: number;
    exercise_id: number;
    type: 'primary' | 'synergist';
  };
}

export interface HeyGainzPaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// --- Simplified Exercise interface for our application ---
export interface Exercise {
  id: number;
  name: string;
  description: string;
  muscles?: number[]; 
  muscles_secondary?: number[];
  equipment?: number[];
  // Added HeyGainz fields
  gif_url?: string;
  instructions?: string[];
  tips?: string[];
}

// Export the interface for paginated data
export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Helper Functions ---

// Extract equipment from description JSON
const extractEquipment = (description: string): number[] => {
  try {
    const parsedDesc = JSON.parse(description);
    // Return an array with a single ID, or empty array if no equipment
    return parsedDesc.equipment ? [1] : []; // Using a placeholder ID
  } catch (error) {
    console.error('Failed to parse exercise description:', error);
    return [];
  }
};

// Helper function to convert HeyGainz exercise to standardized Exercise format
const convertToStandardFormat = (exercise: HeyGainzExercise): Exercise => {
  // Extract primary muscles IDs
  const muscleIds = exercise.muscles
    .filter(m => m.pivot?.type === 'primary')
    .map(m => m.id);

  // Extract secondary muscles IDs
  const secondaryMuscleIds = exercise.muscles
    .filter(m => m.pivot?.type === 'synergist')
    .map(m => m.id);

  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.seo_description || exercise.description,
    // Add fields from HeyGainz
    gif_url: exercise.gif_url,
    instructions: exercise.instructions,
    tips: exercise.tips,
    // Add compatibility fields
    muscles: muscleIds,
    muscles_secondary: secondaryMuscleIds,
    // Parse equipment from description
    equipment: extractEquipment(exercise.description)
  };
};

// --- Service Functions ---

/**
 * Fetches a list of exercises from the HeyGainz API, using sessionStorage for caching.
 * Retrieves all exercises by default, paginated.
 */
export const getAllExercisesCached = async (): Promise<Exercise[]> => {
  // Try to get from cache first
  const cachedData = sessionStorage.getItem(EXERCISE_CACHE_KEY);
  if (cachedData) {
    console.log('Returning cached exercises');
    try {
      return JSON.parse(cachedData) as Exercise[];
    } catch (e) {
      console.error('Failed to parse cached exercises:', e);
      sessionStorage.removeItem(EXERCISE_CACHE_KEY); // Clear corrupted cache
    }
  }

  console.log('Fetching all exercises from HeyGainz API...');
  let allExercises: Exercise[] = [];
  let page = 1;
  const perPage = 100; // Fetch in batches of 100
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(
        `${HEYGAINZ_API_URL}/exercises`,
        {
          params: {
            page,
            per_page: perPage
          }
        }
      );

      // Convert to standard format
      const standardFormatExercises = response.data.data.map(convertToStandardFormat);
      allExercises = [...allExercises, ...standardFormatExercises];
      
      // Check if there's more data to fetch
      hasMore = response.data.next_page_url !== null;
      page++;
      
      console.log(`Fetched ${allExercises.length} / ${response.data.total} exercises...`);
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
 */
export const getExerciseById = async (id: number): Promise<Exercise | null> => {
  try {
    // The HeyGainz API doesn't have a direct endpoint for fetching by ID
    // So we'll get exercises and filter
    const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(
      `${HEYGAINZ_API_URL}/exercises`,
      {
        params: {
          page: 1,
          per_page: 100
        }
      }
    );

    const exercise = response.data.data.find(ex => ex.id === id);
    
    if (!exercise) {
      return null;
    }

    return convertToStandardFormat(exercise);
  } catch (error) {
    console.error(`Error fetching exercise with ID ${id}:`, error);
    return null;
  }
};

/**
 * Fetches exercises by muscle group
 */
export const getExercisesByMuscle = async (muscleId: number): Promise<Exercise[]> => {
  try {
    const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(
      `${HEYGAINZ_API_URL}/muscles/${muscleId}/exercises`,
      {
        params: {
          page: 1,
          per_page: 100
        }
      }
    );

    return response.data.data.map(convertToStandardFormat);
  } catch (error) {
    console.error(`Error fetching exercises for muscle ${muscleId}:`, error);
    return [];
  }
};

/**
 * Fetches all available muscle groups
 */
export const getMuscleGroups = async (): Promise<HeyGainzMuscle[]> => {
  try {
    const response = await axios.get<HeyGainzMuscle[]>(`${HEYGAINZ_API_URL}/muscles`);
    return response.data;
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    return [];
  }
};

/**
 * Searches for exercises by name
 */
export const searchExercises = async (query: string): Promise<Exercise[]> => {
  try {
    const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(
      `${HEYGAINZ_API_URL}/exercises`,
      {
        params: {
          search: query,
          page: 1,
          per_page: 100
        }
      }
    );

    return response.data.data.map(convertToStandardFormat);
  } catch (error) {
    console.error(`Error searching exercises with query "${query}":`, error);
    return [];
  }
};

// TODO:
// - Add functions to fetch related data like categories, muscles, equipment (consider caching these too).
// - Explore more robust caching (IndexedDB, React Query/SWR) if sessionStorage is insufficient.
