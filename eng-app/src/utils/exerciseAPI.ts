import axios from 'axios';

// HeyGainz API base URL
const API_BASE_URL = 'https://svc.heygainz.com/api';

// Define interfaces for API responses
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

// Simplified Exercise type for our application
export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId?: number;
  muscles: string[];
  equipment: string[];
  image: string | null;
  instructions: string[];
  tips: string[];
  type: string;
}

// Base response interface for paginated data
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Function to fetch all muscle groups
export const fetchMuscleGroups = async (): Promise<HeyGainzMuscle[]> => {
  try {
    const response = await axios.get<HeyGainzMuscle[]>(`${API_BASE_URL}/muscles`);
    return response.data;
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    throw error;
  }
};

// Basic typings for backward compatibility
export interface ExerciseBase {
  id: number;
  name: string;
  category?: number;
}

export interface ExerciseCategory {
  id: number;
  name: string;
}

export interface ExerciseImage {
  id: number;
  image: string;
  is_main: boolean;
}

export interface ExerciseTranslation {
  id: number;
  name: string;
  description: string;
}

export interface Equipment {
  id: number;
  name: string;
}

export interface Muscle {
  id: number;
  name: string;
  is_front: boolean;
}

// Function to fetch categories (based on body parts)
export const fetchCategories = async (): Promise<ExerciseCategory[]> => {
  try {
    // Use body parts as categories
    const muscles = await fetchMuscleGroups();
    // Get unique body parts
    const bodyParts = Array.from(new Set(muscles.map(m => m.body_part)));
    
    return bodyParts.map((bodyPart, index) => ({
      id: index + 1,
      name: bodyPart
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Function to fetch muscles
export const fetchMuscles = async (): Promise<Muscle[]> => {
  try {
    const muscles = await fetchMuscleGroups();
    
    return muscles.map(muscle => ({
      id: muscle.id,
      name: muscle.name,
      is_front: muscle.region === 'abs' || muscle.region === 'chest' || muscle.region === 'quads'
    }));
  } catch (error) {
    console.error('Error fetching muscles:', error);
    return [];
  }
};

// Function to fetch equipment
export const fetchEquipment = async (): Promise<Equipment[]> => {
  // HeyGainz doesn't have a direct equipment endpoint
  // We could parse it from exercise descriptions, but for now return a default set
  return [
    { id: 1, name: 'Barbell' },
    { id: 2, name: 'Dumbbell' },
    { id: 3, name: 'Kettlebell' },
    { id: 4, name: 'Bodyweight' },
    { id: 5, name: 'Machine' },
    { id: 6, name: 'Cable' }
  ];
};

// Function to fetch detailed exercise info
export const fetchExerciseInfo = async (exerciseId: number): Promise<Exercise | null> => {
  try {
    // The API doesn't have a direct endpoint for fetching by ID
    // So we'll search for it
    const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(`${API_BASE_URL}/exercises`, {
      params: {
        page: 1,
        per_page: 100
      }
    });

    const exercise = response.data.data.find(ex => ex.id === exerciseId);
    
    if (!exercise) {
      return null;
    }

    return formatHeyGainzExercise(exercise);
  } catch (error) {
    console.error(`Error fetching exercise info for ID ${exerciseId}:`, error);
    return null;
  }
};

// Function to fetch exercises with pagination
export const fetchExercises = async (
  pageOrSearch?: number | string,
  searchOrCategory?: string | number | null,
  categoryOrLimit?: number | null,
  limitOrOffset?: number
): Promise<{ count: number, next: string | null, results: Exercise[] }> => {
  try {
    let endpoint = `${API_BASE_URL}/exercises`;
    let page: number;
    let search: string | undefined;
    let category: number | null | undefined;
    let limit: number;
    let actualOffset: number;

    // Handle flexible parameter order based on types
    if (typeof pageOrSearch === 'number') {
      // Called with (page, search, category, perPage) format
      page = pageOrSearch;
      search = typeof searchOrCategory === 'string' ? searchOrCategory : undefined;
      category = typeof searchOrCategory === 'number' ? searchOrCategory : 
                 (typeof categoryOrLimit === 'number' ? categoryOrLimit : null);
      limit = typeof limitOrOffset === 'number' ? limitOrOffset : 20;
      actualOffset = 0; // Default offset
    } else {
      // Called with (search, category, limit, offset) format
      search = typeof pageOrSearch === 'string' ? pageOrSearch : undefined;
      category = typeof searchOrCategory === 'number' ? searchOrCategory : null;
      limit = typeof categoryOrLimit === 'number' ? categoryOrLimit : 20;
      actualOffset = typeof limitOrOffset === 'number' ? limitOrOffset : 0;
      page = Math.floor(actualOffset / limit) + 1;
    }

    const params: Record<string, string | number> = {
      page,
      per_page: limit
    };

    // Add search term if provided
    if (search && typeof search === 'string' && search.trim() !== '') {
      params.search = search.trim();
    }

    // If category is specified, use the muscle-specific endpoint
    if (category) {
      endpoint = `${API_BASE_URL}/muscles/${category}/exercises`;
    }

    console.log(`Fetching exercises from: ${endpoint}`, params);
    const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(endpoint, { params });
    console.log('API Response:', response.data);

    // Process and format the exercises
    if (!response.data.data || !Array.isArray(response.data.data)) {
      console.error('Invalid API response format:', response.data);
      return {
        count: 0,
        next: null,
        results: []
      };
    }

    const exercises = response.data.data.map(exercise => {
      try {
        return formatHeyGainzExercise(exercise);
      } catch (formatError) {
        console.error('Error formatting exercise:', exercise, formatError);
        // Return a minimal valid exercise object if formatting fails
        return {
          id: exercise.id?.toString() || '0',
          name: exercise.name || 'Unknown Exercise',
          description: '',
          category: 'Uncategorized',
          muscles: [],
          equipment: [],
          image: null,
          instructions: [],
          tips: [],
          type: 'Strength'
        };
      }
    });

    return {
      count: response.data.total,
      next: response.data.next_page_url,
      results: exercises
    };
  } catch (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }
};

// Function to search exercises
export const searchExercises = async (
  query: string,
  page = 1,
  per_page = 20
): Promise<{ count: number, next: string | null, results: Exercise[] }> => {
  return fetchExercises(query, undefined, per_page, (page - 1) * per_page);
};

// Helper function to extract equipment from the description
const extractEquipment = (description: string): string[] => {
  try {
    // The description is a JSON string containing various properties
    const parsedDesc = JSON.parse(description);
    return parsedDesc.equipment ? [parsedDesc.equipment] : [];
  } catch (error) {
    console.error('Failed to parse exercise description:', error);
    return [];
  }
};

// Helper function to extract body part from the description
const extractBodyPart = (description: string): string => {
  try {
    const parsedDesc = JSON.parse(description);
    return parsedDesc.body_part || 'Uncategorized';
  } catch (error) {
    console.error('Failed to parse exercise description:', error);
    return 'Uncategorized';
  }
};

// Format HeyGainz exercise to our Exercise format
export const formatHeyGainzExercise = (exercise: HeyGainzExercise): Exercise => {
  // Defensive check to ensure muscles property exists
  if (!exercise.muscles) {
    console.warn(`Exercise ${exercise.id} (${exercise.name}) is missing muscles property`);
    exercise.muscles = [];
  }

  // Extract primary muscles
  const primaryMuscles = exercise.muscles
    .filter(m => m.pivot?.type === 'primary')
    .map(m => m.name);

  // Get the body part from the first muscle or from description
  const category = exercise.muscles.length > 0 
    ? exercise.muscles[0].body_part 
    : extractBodyPart(exercise.description);

  return {
    id: exercise.id.toString(),
    name: exercise.name,
    description: exercise.seo_description || '',
    category,
    categoryId: exercise.id,
    muscles: primaryMuscles,
    equipment: extractEquipment(exercise.description),
    image: exercise.gif_url,
    instructions: exercise.instructions || [],
    tips: exercise.tips || [],
    type: exercise.type
  };
};

// Format any exercise object to our standard Exercise format
export const formatExercise = (exercise: Exercise | HeyGainzExercise | Record<string, unknown>): Exercise => {
  // Check if this matches a HeyGainzExercise structure
  if ('slug' in exercise && 'gif_url' in exercise) {
    // This is a HeyGainzExercise
    return formatHeyGainzExercise(exercise as HeyGainzExercise);
  }

  // Check if this is already in our Exercise format
  if ('id' in exercise && 'name' in exercise && 'description' in exercise && 'category' in exercise) {
    // This seems to already be in our Exercise format
    return exercise as Exercise;
  }

  // If it's in some other format, create a minimal Exercise object
  return {
    id: ('id' in exercise ? String(exercise.id) : '0'),
    name: ('name' in exercise ? String(exercise.name) : 'Unknown Exercise'),
    description: ('description' in exercise ? String(exercise.description) : ''),
    category: 'Uncategorized',
    muscles: [],
    equipment: [],
    image: null,
    instructions: [],
    tips: [],
    type: 'Strength'
  };
};

// Function to fetch exercise by ID
export const fetchExerciseById = async (id: string): Promise<Exercise | null> => {
  try {
    // The API doesn't have a direct endpoint for fetching by ID
    // So we'll search for it and filter
    const response = await axios.get<HeyGainzPaginatedResponse<HeyGainzExercise>>(`${API_BASE_URL}/exercises`, {
      params: {
        page: 1,
        per_page: 100
      }
    });

    const exercise = response.data.data.find(ex => ex.id.toString() === id);
    
    if (!exercise) {
      return null;
    }

    return formatHeyGainzExercise(exercise);
  } catch (error) {
    console.error(`Error fetching exercise with ID ${id}:`, error);
    return null;
  }
};

// Function to fetch exercises by category
export const fetchExercisesByCategory = async (
  category: string,
  page = 1,
  per_page = 20
): Promise<{ count: number, next: string | null, results: Exercise[] }> => {
  try {
    // Find the muscle ID that corresponds to the category
    const muscles = await fetchMuscleGroups();
    const matchingMuscles = muscles.filter(m => 
      m.body_part.toLowerCase() === category.toLowerCase() ||
      m.name.toLowerCase() === category.toLowerCase()
    );

    if (matchingMuscles.length === 0) {
      // If no matching muscle is found, just search by the category name
      return fetchExercises(category, undefined, per_page, (page - 1) * per_page);
    }

    // Otherwise use the first matching muscle ID
    return fetchExercises(undefined, matchingMuscles[0].id, per_page, (page - 1) * per_page);
  } catch (error) {
    console.error(`Error fetching exercises for category ${category}:`, error);
    throw error;
  }
}; 