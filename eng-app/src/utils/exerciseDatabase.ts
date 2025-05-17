/**
 * Exercise database adapter for the program builder
 * 
 * This file serves as a compatibility layer for components that use the
 * old exercise database interface. It now uses our database implementation
 * instead of the external API.
 */

import { 
  Exercise as APIExercise,
  searchExercises as apiSearchExercises,
  fetchExerciseById,
  fetchMuscleGroups as apiFetchMuscleGroups,
  fetchCategories as apiFetchCategories
} from './exerciseAPI';

// Simplified Exercise type for components that need minimal info
export interface Exercise {
  id: string;
  name: string;
  category: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
}

// Convert API Exercise to local Exercise type
export const convertAPIExercise = (apiExercise: APIExercise): Exercise => {
  return {
    id: apiExercise.id,
    name: apiExercise.name,
    category: apiExercise.category,
    primaryMuscle: apiExercise.muscles?.[0] || 'Unknown',
    secondaryMuscles: apiExercise.secondary_muscles || apiExercise.muscles?.slice(1) || []
  };
};

/**
 * Search the exercise database by name
 * @param query Search text
 * @returns Array of matching exercises
 */
export const searchExercises = async (query: string): Promise<Exercise[]> => {
  try {
    const response = await apiSearchExercises(query);
    return response.results.map(convertAPIExercise);
  } catch (error) {
    console.error('Error searching exercises:', error);
    return [];
  }
};

/**
 * Get exercise categories for filtering
 */
export const getExerciseCategories = async (): Promise<string[]> => {
  try {
    const categories = await apiFetchCategories();
    return categories.map(category => category.name);
  } catch (error) {
    console.error('Error fetching exercise categories:', error);
    return [];
  }
};

/**
 * Get all muscles targeted across exercises for filtering
 */
export const getMuscleGroups = async (): Promise<string[]> => {
  try {
    const muscles = await apiFetchMuscleGroups();
    return muscles.map(muscle => muscle.name);
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    return [];
  }
};

/**
 * Get an exercise by ID
 */
export const getExerciseById = async (id: string): Promise<Exercise | undefined> => {
  try {
    const exercise = await fetchExerciseById(id);
    if (!exercise) return undefined;
    return convertAPIExercise(exercise);
  } catch (error) {
    console.error(`Error fetching exercise with ID ${id}:`, error);
    return undefined;
  }
}; 