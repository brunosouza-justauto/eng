import { SetType } from './adminTypes';

// Interface for exercise instance data
export interface ExerciseInstanceData {
  id: string;
  exercise_db_id: string | null;
  exercise_name: string;
  sets: string | null;
  reps: string | null;
  rest_period_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  order_in_workout: number | null;
  set_type?: SetType | null;
  sets_data?: ExerciseSet[]; // Support for individual set data
  superset_group_id?: string | null; // Added field for superset group ID
  is_bodyweight?: boolean; // Added field for bodyweight exercises
  each_side?: boolean; // Added field for each side exercises
}

// Interface for database exercise set
export interface DatabaseExerciseSet {
  id: string;
  exercise_instance_id: string;
  set_order: number;
  type: SetType;
  reps: string;
  weight?: string | null;
  rest_seconds?: number | null;
  duration?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Interface for workout data
export interface WorkoutData {
  id: string;
  name: string;
  day_of_week: number | null;
  week_number: number | null;
  order_in_program: number | null;
  description: string | null;
  exercise_instances: ExerciseInstanceData[];
}

// Interface for tracking completed sets
export interface CompletedSetData {
  exerciseInstanceId: string;
  setOrder: number;
  weight: string;
  reps: number;
  isCompleted: boolean;
  notes: string;
  setType?: SetType | null;
}

// Interface for the database record of completed sets
export interface CompletedSetRecord {
  workout_session_id: string;
  exercise_instance_id: string;
  set_order: number;
  weight: string;
  reps: number;
  is_completed: boolean;
  notes: string;
  set_type?: SetType | null;
}

// Exercise set interface from admin types
export interface ExerciseSet {
  id?: string; // For existing sets
  set_order: number; // Position in the sequence
  type: SetType; // The type of this specific set
  reps?: string; // Reps for this set (may differ between sets)
  weight?: string; // Weight for this set
  rest_seconds?: number; // Rest period after this set
  duration?: string; // For timed exercises
}

// Interface for exercise feedback
export interface ExerciseFeedback {
  id?: string;
  workout_session_id: string;
  exercise_instance_id: string;
  pain_level: number | null;
  pump_level: number | null;
  workload_level: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

// Interface for feedback recommendations
export interface FeedbackRecommendation {
  type: 'pain' | 'pump' | 'workload';
  message: string;
  action: 'increase_weight' | 'decrease_weight' | 'change_exercise' | 'adjust_reps' | 'no_change';
}

// Interface for workout session params
export interface WorkoutSessionParams extends Record<string, string | undefined> {
  workoutId: string;
}
