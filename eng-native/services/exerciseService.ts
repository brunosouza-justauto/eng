import { supabase } from '../lib/supabase';

export interface ExerciseDetails {
  id: string;
  name: string;
  description: string | null;
  gifUrl: string | null;
  instructions: string[] | null;
  tips: string[] | null;
  youtubeLink: string | null;
  primaryMuscle: string | null;
  equipment: string[] | null;
}

/**
 * Format database exercise to ExerciseDetails
 */
const formatExercise = (data: any): ExerciseDetails => {
  // Handle instructions - could be array, string, or null
  let instructions: string[] | null = null;
  if (data.instructions) {
    if (Array.isArray(data.instructions)) {
      instructions = data.instructions.filter((i: any) => typeof i === 'string' && i.trim());
    } else if (typeof data.instructions === 'string') {
      instructions = [data.instructions];
    }
  }

  // Handle tips - could be array, string, or null
  let tips: string[] | null = null;
  if (data.tips) {
    if (Array.isArray(data.tips)) {
      tips = data.tips.filter((t: any) => typeof t === 'string' && t.trim());
    } else if (typeof data.tips === 'string') {
      tips = [data.tips];
    }
  }

  // Handle equipment - could be array, string, or null
  let equipment: string[] | null = null;
  if (data.equipment) {
    if (Array.isArray(data.equipment)) {
      equipment = data.equipment.filter((e: any) => typeof e === 'string' && e.trim());
    } else if (typeof data.equipment === 'string') {
      equipment = [data.equipment];
    }
  }

  return {
    id: String(data.id),
    name: data.name || 'Unknown Exercise',
    description: data.description || null,
    gifUrl: data.gif_url || null,
    instructions,
    tips,
    youtubeLink: data.youtube_link || null,
    primaryMuscle: data.primary_muscle_group || data.body_part || null,
    equipment,
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
