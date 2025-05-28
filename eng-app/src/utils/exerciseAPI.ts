/**
 * Exercise API
 * 
 * This file has been updated to use the local database instead of the HeyGainz API.
 * It maintains the same interface for backward compatibility with existing code.
 */

import {
  Exercise,
  PaginatedResponse,
  Muscle,
  ExerciseCategory
} from './exerciseTypes';

import * as dbAdapter from './exerciseDatabaseAdapter';

// Re-export the Exercise interface for backward compatibility
export type { Exercise, PaginatedResponse, Muscle, ExerciseCategory };

// Fetch muscle groups (formerly from HeyGainz API, now from our database)
export const fetchMuscleGroups = async (): Promise<Muscle[]> => {
  return dbAdapter.getMuscleGroups();
};

// Fetch categories
export const fetchCategories = async (): Promise<ExerciseCategory[]> => {
  return dbAdapter.getCategories();
};

// Fetch equipment options
export const fetchEquipmentOptions = async (): Promise<string[]> => {
  return dbAdapter.getEquipmentOptions();
};

// Fetch gender options
export const fetchGenderOptions = async (): Promise<string[]> => {
  return dbAdapter.getGenderOptions();
};

// Fetch exercise information by ID
export const fetchExerciseInfo = async (exerciseId: number): Promise<Exercise | null> => {
  return dbAdapter.getExerciseById(exerciseId);
};

// Function to fetch exercises with pagination
export const fetchExercises = async (
  search?: string | null,
  category?: string | null,
  gender?: string | null,
  equipment?: string | null,
  page?: number,
  limit?: number
): Promise<PaginatedResponse<Exercise>> => {  
  try {
    // Call our database adapter with normalized parameters
    const result = await dbAdapter.searchExercises(
      search || '', 
      page || 1,
      limit || 20,
      category,
      gender,
      equipment
    );
    return result;
  } catch (error) {
    console.error('Error in fetchExercises:', error);
    // Return empty result set on error
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
};

// Function to search exercises
export const searchExercises = async (
  query: string,
  page = 1,
  per_page = 20,
  genderFilter?: string | null,
  equipmentFilter?: string | null
): Promise<PaginatedResponse<Exercise>> => {
  try {
    const results = await dbAdapter.searchExercises(
      query, 
      page, 
      per_page, 
      null, // No category filter
      genderFilter,
      equipmentFilter
    );
    return results;
  } catch (error) {
    console.error('Error in searchExercises:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
};

// Format any exercise object to our standard Exercise format
export const formatExercise = (exercise: Exercise | Record<string, unknown>): Exercise => {
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
    type: 'Strength',
    youtube_link: null
  };
};

// Fetch exercise by ID
export const fetchExerciseById = async (id: string): Promise<Exercise | null> => {
  return dbAdapter.getExerciseById(id);
};

// Fetch exercises by category
export const fetchExercisesByCategory = async (
  category: string,
  page = 1,
  per_page = 20
): Promise<PaginatedResponse<Exercise>> => {
  return dbAdapter.searchExercises('', page, per_page, category);
}; 