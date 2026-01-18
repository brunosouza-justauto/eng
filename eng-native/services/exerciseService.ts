import { supabase } from '../lib/supabase';
import { getExerciseName, getExerciseDescription, LocalizedExercise } from '../lib/localizedData';

export interface ExerciseDetails {
  id: string;
  name: string;
  name_en: string | null;
  name_pt: string | null;
  description: string | null;
  description_en: string | null;
  description_pt: string | null;
  gifUrl: string | null;
  instructions: string[] | null;
  instructions_pt: string[] | null;
  tips: string[] | null;
  tips_pt: string[] | null;
  youtubeLink: string | null;
  primaryMuscle: string | null;
  equipment: string[] | null;
}

/**
 * Parse array field - could be array, string, or null
 */
const parseArrayField = (data: any): string[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.filter((i: any) => typeof i === 'string' && i.trim());
  }
  if (typeof data === 'string') {
    return [data];
  }
  return null;
};

/**
 * Format database exercise to ExerciseDetails
 */
const formatExercise = (data: any): ExerciseDetails => {
  // Get localized name using the helper
  const localizedData: LocalizedExercise = {
    name: data.name,
    name_en: data.name_en,
    name_pt: data.name_pt,
    description_en: data.description_en,
    description_pt: data.description_pt,
  };

  return {
    id: String(data.id),
    name: getExerciseName(localizedData) || data.name || 'Unknown Exercise',
    name_en: data.name_en || null,
    name_pt: data.name_pt || null,
    description: getExerciseDescription(localizedData) || data.description || null,
    description_en: data.description_en || null,
    description_pt: data.description_pt || null,
    gifUrl: data.gif_url || null,
    instructions: parseArrayField(data.instructions),
    instructions_pt: parseArrayField(data.instructions_pt),
    tips: parseArrayField(data.tips),
    tips_pt: parseArrayField(data.tips_pt),
    youtubeLink: data.youtube_link || null,
    primaryMuscle: data.primary_muscle_group || data.body_part || null,
    equipment: parseArrayField(data.equipment),
  };
};

/**
 * Fetch exercise details by ID from the exercises database
 * @param exerciseId The exercise database ID
 * @returns Exercise details including demo GIF, instructions, tips
 */
export const getExerciseById = async (
  exerciseId: string | number
): Promise<{ exercise: ExerciseDetails | null; error?: string }> => {
  try {
    // Handle both string and number IDs
    const id = typeof exerciseId === 'string' ? exerciseId.trim() : String(exerciseId);

    console.log('[ExerciseService] Fetching exercise with ID:', id);

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[ExerciseService] Error fetching exercise:', error);
      return { exercise: null, error: error.message };
    }

    if (!data) {
      console.log('[ExerciseService] No data returned for ID:', id);
      return { exercise: null, error: 'Exercise not found' };
    }

    console.log('[ExerciseService] Found exercise:', data.name);
    console.log('[ExerciseService] GIF URL:', data.gif_url);

    const exercise = formatExercise(data);
    return { exercise };
  } catch (err: any) {
    console.error('[ExerciseService] Exception in getExerciseById:', err);
    return { exercise: null, error: err.message };
  }
};

/**
 * Search for exercises by name
 * @param query Search query
 * @param limit Max results to return
 * @returns Array of matching exercises
 */
export const searchExercises = async (
  query: string,
  limit: number = 10
): Promise<{ exercises: ExerciseDetails[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[ExerciseService] Error searching exercises:', error);
      return { exercises: [], error: error.message };
    }

    const exercises = (data || []).map(formatExercise);
    return { exercises };
  } catch (err: any) {
    console.error('[ExerciseService] Exception in searchExercises:', err);
    return { exercises: [], error: err.message };
  }
};
