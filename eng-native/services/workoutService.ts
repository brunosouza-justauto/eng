import { supabase } from '../lib/supabase';
import {
  ProgramAssignment,
  WorkoutData,
  ProgramTemplate,
  CompletedWorkoutDate,
  getCurrentDayOfWeek,
} from '../types/workout';

/**
 * Get the athlete's assigned workout program
 * @param profileId The athlete's profile ID
 * @returns The program assignment with program details or null
 */
export const getAssignedProgram = async (
  profileId: string
): Promise<{ assignment: ProgramAssignment | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('assigned_plans')
      .select(`
        id,
        program_template_id,
        start_date,
        assigned_at,
        program_templates (
          id,
          name,
          description,
          version
        )
      `)
      .eq('athlete_id', profileId)
      .not('program_template_id', 'is', null)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching assigned program:', error);
      return { assignment: null, error: error.message };
    }

    return { assignment: data as ProgramAssignment | null };
  } catch (err: any) {
    console.error('Error in getAssignedProgram:', err);
    return { assignment: null, error: err.message };
  }
};

/**
 * Get workouts for a program template
 * @param programTemplateId The program template ID
 * @returns The workouts with exercise instances
 */
export const getProgramWorkouts = async (
  programTemplateId: string
): Promise<{ workouts: WorkoutData[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('program_templates')
      .select(`
        name,
        workouts (
          id,
          name,
          day_of_week,
          week_number,
          order_in_program,
          description,
          exercise_instances (
            id,
            exercise_db_id,
            exercise_name,
            sets,
            reps,
            rest_period_seconds,
            tempo,
            notes,
            order_in_workout,
            set_type,
            sets_data,
            group_id,
            group_type,
            group_order,
            is_bodyweight,
            each_side
          )
        )
      `)
      .eq('id', programTemplateId)
      .single();

    if (error) {
      console.error('Error fetching program workouts:', error);
      return { workouts: [], error: error.message };
    }

    return { workouts: (data?.workouts as WorkoutData[]) || [] };
  } catch (err: any) {
    console.error('Error in getProgramWorkouts:', err);
    return { workouts: [], error: err.message };
  }
};

/**
 * Get today's workout based on day of week
 * @param workouts All workouts in the program
 * @returns Today's workout or null if rest day
 */
export const getTodaysWorkout = (workouts: WorkoutData[]): WorkoutData | null => {
  const currentDayOfWeek = getCurrentDayOfWeek();
  return workouts.find((w) => w.day_of_week === currentDayOfWeek) || null;
};

/**
 * Check if a workout has been completed today
 * @param workoutId The workout ID
 * @param userId The user's auth ID
 * @returns Whether the workout is completed and completion time
 */
export const checkWorkoutCompletion = async (
  workoutId: string,
  userId: string
): Promise<{ isCompleted: boolean; completionTime: string | null; error?: string }> => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, end_time')
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .not('end_time', 'is', null)
      .gte('start_time', `${todayStr}T00:00:00`)
      .lte('start_time', `${todayStr}T23:59:59`)
      .order('end_time', { ascending: false });

    if (error) {
      console.error('Error checking workout completion:', error);
      return { isCompleted: false, completionTime: null, error: error.message };
    }

    if (data && data.length > 0) {
      return { isCompleted: true, completionTime: data[0].end_time };
    }

    return { isCompleted: false, completionTime: null };
  } catch (err: any) {
    console.error('Error in checkWorkoutCompletion:', err);
    return { isCompleted: false, completionTime: null, error: err.message };
  }
};

/**
 * Get completed workout dates for a month (for calendar display)
 * @param userId The user's auth ID
 * @param year The year
 * @param month The month (0-11)
 * @returns Array of completed workout dates
 */
export const getCompletedWorkoutDates = async (
  userId: string,
  year: number,
  month: number
): Promise<{ dates: CompletedWorkoutDate[]; error?: string }> => {
  try {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, workout_id, start_time, end_time')
      .eq('user_id', userId)
      .not('end_time', 'is', null)
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`);

    if (error) {
      console.error('Error fetching completed workout dates:', error);
      return { dates: [], error: error.message };
    }

    // Process the data to get unique dates with completed workouts
    const dateMap = new Map<string, string>();
    const uniqueDates: CompletedWorkoutDate[] = [];

    data?.forEach((session) => {
      const date = session.start_time.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, session.workout_id);
        uniqueDates.push({
          date,
          workoutId: session.workout_id,
        });
      }
    });

    return { dates: uniqueDates };
  } catch (err: any) {
    console.error('Error in getCompletedWorkoutDates:', err);
    return { dates: [], error: err.message };
  }
};

/**
 * Get full program details with all workouts
 * @param programTemplateId The program template ID
 * @returns The full program template with workouts
 */
export const getFullProgram = async (
  programTemplateId: string
): Promise<{ program: ProgramTemplate | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('program_templates')
      .select(`
        id,
        name,
        description,
        version,
        workouts (
          id,
          name,
          day_of_week,
          week_number,
          order_in_program,
          description,
          exercise_instances (
            id,
            exercise_db_id,
            exercise_name,
            sets,
            reps,
            rest_period_seconds,
            tempo,
            notes,
            order_in_workout,
            set_type,
            sets_data,
            group_id,
            group_type,
            group_order,
            is_bodyweight,
            each_side
          )
        )
      `)
      .eq('id', programTemplateId)
      .single();

    if (error) {
      console.error('Error fetching full program:', error);
      return { program: null, error: error.message };
    }

    return { program: data as ProgramTemplate };
  } catch (err: any) {
    console.error('Error in getFullProgram:', err);
    return { program: null, error: err.message };
  }
};
