import { supabase } from '../lib/supabase';
import {
  ProgramAssignment,
  WorkoutData,
  ProgramTemplate,
  CompletedWorkoutDate,
  getCurrentDayOfWeek,
} from '../types/workout';
import { getLocalDateString } from '../utils/date';

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
    const todayStr = getLocalDateString();

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

    const startDate = getLocalDateString(firstDay);
    const endDate = getLocalDateString(lastDay);

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

// =============================================================================
// WORKOUT SESSION FUNCTIONS
// =============================================================================

/**
 * Get a single workout with all exercise instances
 * @param workoutId The workout ID
 * @returns The workout with exercises
 */
export const getWorkoutById = async (
  workoutId: string
): Promise<{ workout: WorkoutData | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
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
      `)
      .eq('id', workoutId)
      .single();

    if (error) {
      console.error('Error fetching workout:', error);
      return { workout: null, error: error.message };
    }

    // Sort exercises by order
    if (data?.exercise_instances) {
      data.exercise_instances.sort(
        (a: any, b: any) => (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0)
      );
    }

    return { workout: data as WorkoutData };
  } catch (err: any) {
    console.error('Error in getWorkoutById:', err);
    return { workout: null, error: err.message };
  }
};

/**
 * Start a new workout session
 * @param workoutId The workout ID
 * @param userId The user's auth ID
 * @returns The created session ID
 */
export const startWorkoutSession = async (
  workoutId: string,
  userId: string
): Promise<{ sessionId: string | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        workout_id: workoutId,
        user_id: userId,
        start_time: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error starting workout session:', error);
      return { sessionId: null, error: error.message };
    }

    return { sessionId: data.id };
  } catch (err: any) {
    console.error('Error in startWorkoutSession:', err);
    return { sessionId: null, error: err.message };
  }
};

/**
 * Complete a workout session
 * @param sessionId The session ID
 * @param durationSeconds Total duration in seconds
 * @returns Success status
 */
export const completeWorkoutSession = async (
  sessionId: string,
  durationSeconds: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error completing workout session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in completeWorkoutSession:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Cancel a workout session (delete session and completed sets)
 * @param sessionId The session ID
 * @returns Success status
 */
export const cancelWorkoutSession = async (
  sessionId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Delete completed sets first
    await supabase
      .from('completed_exercise_sets')
      .delete()
      .eq('workout_session_id', sessionId);

    // Delete the session
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error canceling workout session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in cancelWorkoutSession:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Save a completed set
 * @param sessionId The session ID
 * @param exerciseInstanceId The exercise instance ID
 * @param setOrder The set order (1-based)
 * @param weight Weight used (null for bodyweight)
 * @param reps Number of reps performed
 * @returns Success status
 */
export const saveCompletedSet = async (
  sessionId: string,
  exerciseInstanceId: string,
  setOrder: number,
  weight: number | null,
  reps: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if this set already exists
    const { data: existing } = await supabase
      .from('completed_exercise_sets')
      .select('id')
      .eq('workout_session_id', sessionId)
      .eq('exercise_instance_id', exerciseInstanceId)
      .eq('set_order', setOrder)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      const { error } = await supabase
        .from('completed_exercise_sets')
        .update({
          weight: weight,
          reps: reps,
          is_completed: true,
        })
        .eq('id', existing[0].id);

      if (error) {
        console.error('Error updating completed set:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('completed_exercise_sets')
        .insert({
          workout_session_id: sessionId,
          exercise_instance_id: exerciseInstanceId,
          set_order: setOrder,
          weight: weight,
          reps: reps,
          is_completed: true,
        });

      if (error) {
        console.error('Error saving completed set:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in saveCompletedSet:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Remove a completed set (uncomplete)
 * @param sessionId The session ID
 * @param exerciseInstanceId The exercise instance ID
 * @param setOrder The set order (1-based)
 * @returns Success status
 */
export const removeCompletedSet = async (
  sessionId: string,
  exerciseInstanceId: string,
  setOrder: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('completed_exercise_sets')
      .delete()
      .eq('workout_session_id', sessionId)
      .eq('exercise_instance_id', exerciseInstanceId)
      .eq('set_order', setOrder);

    if (error) {
      console.error('Error removing completed set:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in removeCompletedSet:', err);
    return { success: false, error: err.message };
  }
};

// =============================================================================
// SESSION RECOVERY FUNCTIONS
// =============================================================================

export interface PendingSession {
  id: string;
  workoutId: string;
  startTime: string;
  isFromToday: boolean;
}

export interface CompletedSetRecord {
  exerciseInstanceId: string;
  setOrder: number;
  weight: number | null;
  reps: number;
}

/**
 * Check for an incomplete (pending) session for a workout
 * @param workoutId The workout ID
 * @param userId The user's auth ID
 * @returns The pending session if found, with info about whether it's from today
 */
export const getPendingSession = async (
  workoutId: string,
  userId: string
): Promise<{ session: PendingSession | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, workout_id, start_time')
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking pending session:', error);
      return { session: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { session: null };
    }

    const sessionData = data[0];
    const sessionDate = new Date(sessionData.start_time).toDateString();
    const today = new Date().toDateString();
    const isFromToday = sessionDate === today;

    return {
      session: {
        id: sessionData.id,
        workoutId: sessionData.workout_id,
        startTime: sessionData.start_time,
        isFromToday,
      },
    };
  } catch (err: any) {
    console.error('Error in getPendingSession:', err);
    return { session: null, error: err.message };
  }
};

/**
 * Get all completed sets for a session
 * @param sessionId The session ID
 * @returns Array of completed set records
 */
export const getCompletedSetsForSession = async (
  sessionId: string
): Promise<{ sets: CompletedSetRecord[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('completed_exercise_sets')
      .select('exercise_instance_id, set_order, weight, reps')
      .eq('workout_session_id', sessionId)
      .eq('is_completed', true);

    if (error) {
      console.error('Error fetching completed sets:', error);
      return { sets: [], error: error.message };
    }

    const sets: CompletedSetRecord[] = (data || []).map((row) => ({
      exerciseInstanceId: row.exercise_instance_id,
      setOrder: row.set_order,
      weight: row.weight,
      reps: row.reps,
    }));

    return { sets };
  } catch (err: any) {
    console.error('Error in getCompletedSetsForSession:', err);
    return { sets: [], error: err.message };
  }
};

/**
 * Delete a pending session and its completed sets
 * @param sessionId The session ID
 * @returns Success status
 */
export const deletePendingSession = async (
  sessionId: string
): Promise<{ success: boolean; error?: string }> => {
  return cancelWorkoutSession(sessionId);
};

// =============================================================================
// PREVIOUS WORKOUT DATA FUNCTIONS
// =============================================================================

export interface PreviousSetData {
  exerciseInstanceId: string;
  setOrder: number;
  weight: number | null;
  reps: number;
}

/**
 * Get the most recent completed session's sets for a workout
 * This is used to pre-fill weights from the last workout
 * @param workoutId The workout ID
 * @param userId The user's auth ID
 * @returns Map of exercise instance ID to array of previous set data
 */
export const getLastWorkoutSets = async (
  workoutId: string,
  userId: string
): Promise<{ sets: Map<string, PreviousSetData[]>; error?: string }> => {
  try {
    // Find the most recent completed session for this workout
    const { data: sessionData, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .not('end_time', 'is', null)
      .order('end_time', { ascending: false })
      .limit(1);

    if (sessionError) {
      console.error('Error fetching last session:', sessionError);
      return { sets: new Map(), error: sessionError.message };
    }

    if (!sessionData || sessionData.length === 0) {
      // No previous completed session found
      return { sets: new Map() };
    }

    const lastSessionId = sessionData[0].id;

    // Get all completed sets from that session
    const { data: setsData, error: setsError } = await supabase
      .from('completed_exercise_sets')
      .select('exercise_instance_id, set_order, weight, reps')
      .eq('workout_session_id', lastSessionId)
      .eq('is_completed', true)
      .order('set_order', { ascending: true });

    if (setsError) {
      console.error('Error fetching last workout sets:', setsError);
      return { sets: new Map(), error: setsError.message };
    }

    // Group sets by exercise instance ID
    const setsMap = new Map<string, PreviousSetData[]>();

    (setsData || []).forEach((row) => {
      const exerciseId = row.exercise_instance_id;
      const existingSets = setsMap.get(exerciseId) || [];
      existingSets.push({
        exerciseInstanceId: exerciseId,
        setOrder: row.set_order,
        weight: row.weight,
        reps: row.reps,
      });
      setsMap.set(exerciseId, existingSets);
    });

    return { sets: setsMap };
  } catch (err: any) {
    console.error('Error in getLastWorkoutSets:', err);
    return { sets: new Map(), error: err.message };
  }
};

// =============================================================================
// EXERCISE FEEDBACK FUNCTIONS
// =============================================================================

import {
  ExerciseFeedback,
  FeedbackRecommendation,
} from '../types/workoutSession';

/**
 * Save exercise feedback
 * @param feedback The feedback data to save
 * @returns Success status and the saved feedback ID
 */
export const saveExerciseFeedback = async (
  feedback: Omit<ExerciseFeedback, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; feedbackId?: string; error?: string }> => {
  try {
    // Check if feedback already exists for this session/exercise
    const { data: existing } = await supabase
      .from('exercise_feedback')
      .select('id')
      .eq('workout_session_id', feedback.workout_session_id)
      .eq('exercise_instance_id', feedback.exercise_instance_id)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing feedback
      const { data, error } = await supabase
        .from('exercise_feedback')
        .update({
          pain_level: feedback.pain_level,
          pump_level: feedback.pump_level,
          workload_level: feedback.workload_level,
          notes: feedback.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .select('id')
        .single();

      if (error) {
        console.error('Error updating exercise feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, feedbackId: data?.id };
    } else {
      // Insert new feedback
      const { data, error } = await supabase
        .from('exercise_feedback')
        .insert({
          workout_session_id: feedback.workout_session_id,
          exercise_instance_id: feedback.exercise_instance_id,
          pain_level: feedback.pain_level,
          pump_level: feedback.pump_level,
          workload_level: feedback.workload_level,
          notes: feedback.notes,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting exercise feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, feedbackId: data?.id };
    }
  } catch (err: any) {
    console.error('Error in saveExerciseFeedback:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get feedback for current session
 * @param sessionId The workout session ID
 * @returns Map of exercise instance ID to feedback
 */
export const getSessionFeedback = async (
  sessionId: string
): Promise<{ feedback: Map<string, ExerciseFeedback>; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('exercise_feedback')
      .select('*')
      .eq('workout_session_id', sessionId);

    if (error) {
      console.error('Error fetching session feedback:', error);
      return { feedback: new Map(), error: error.message };
    }

    const feedbackMap = new Map<string, ExerciseFeedback>();
    (data || []).forEach((row) => {
      feedbackMap.set(row.exercise_instance_id, {
        id: row.id,
        workout_session_id: row.workout_session_id,
        exercise_instance_id: row.exercise_instance_id,
        pain_level: row.pain_level,
        pump_level: row.pump_level,
        workload_level: row.workload_level,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    });

    return { feedback: feedbackMap };
  } catch (err: any) {
    console.error('Error in getSessionFeedback:', err);
    return { feedback: new Map(), error: err.message };
  }
};

/**
 * Get previous feedback for an exercise to generate recommendations
 * @param exerciseInstanceId The exercise instance ID
 * @param userId The user ID
 * @returns The most recent feedback and generated recommendations
 */
export const getPreviousFeedback = async (
  exerciseInstanceId: string,
  userId: string
): Promise<{
  feedback: ExerciseFeedback | null;
  recommendations: FeedbackRecommendation[];
  error?: string;
}> => {
  try {
    // Get the most recent feedback for this exercise from a completed session
    const { data, error } = await supabase
      .from('exercise_feedback')
      .select(`
        *,
        workout_sessions!inner (
          id,
          user_id,
          end_time
        )
      `)
      .eq('exercise_instance_id', exerciseInstanceId)
      .eq('workout_sessions.user_id', userId)
      .not('workout_sessions.end_time', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching previous feedback:', error);
      return { feedback: null, recommendations: [], error: error.message };
    }

    if (!data || data.length === 0) {
      return { feedback: null, recommendations: [] };
    }

    const feedbackData = data[0];
    const feedback: ExerciseFeedback = {
      id: feedbackData.id,
      workout_session_id: feedbackData.workout_session_id,
      exercise_instance_id: feedbackData.exercise_instance_id,
      pain_level: feedbackData.pain_level,
      pump_level: feedbackData.pump_level,
      workload_level: feedbackData.workload_level,
      notes: feedbackData.notes,
      created_at: feedbackData.created_at,
      updated_at: feedbackData.updated_at,
    };

    // Generate recommendations based on feedback
    const recommendations = generateRecommendations(feedback);

    return { feedback, recommendations };
  } catch (err: any) {
    console.error('Error in getPreviousFeedback:', err);
    return { feedback: null, recommendations: [], error: err.message };
  }
};

/**
 * Generate recommendations based on feedback
 */
export const generateRecommendations = (
  feedback: ExerciseFeedback
): FeedbackRecommendation[] => {
  const recommendations: FeedbackRecommendation[] = [];

  // Pain level recommendations (highest priority)
  if (feedback.pain_level && feedback.pain_level >= 4) {
    recommendations.push({
      type: 'pain',
      message: 'High pain reported last session. Consider modifying or replacing this exercise.',
      action: 'change_exercise',
    });
  } else if (feedback.pain_level && feedback.pain_level === 3) {
    recommendations.push({
      type: 'pain',
      message: 'Moderate discomfort reported. Monitor form and reduce weight if needed.',
      action: 'decrease_weight',
    });
  }

  // Workload level recommendations
  if (feedback.workload_level && feedback.workload_level <= 2) {
    recommendations.push({
      type: 'workload',
      message: 'Last session felt too easy. Consider increasing weight.',
      action: 'increase_weight',
    });
  } else if (feedback.workload_level && feedback.workload_level >= 5) {
    recommendations.push({
      type: 'workload',
      message: 'Last session was very heavy. Consider reducing weight for better form.',
      action: 'decrease_weight',
    });
  }

  // Pump level recommendations
  if (feedback.pump_level && feedback.pump_level <= 2) {
    recommendations.push({
      type: 'pump',
      message: 'Low muscle pump reported. Try increasing reps or slowing tempo.',
      action: 'adjust_reps',
    });
  }

  return recommendations;
};
