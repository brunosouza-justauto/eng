import { SetType } from './workout';

// Interface for tracking completed set data during a session
export interface CompletedSetData {
  exerciseInstanceId: string;
  setOrder: number;
  weight: string;
  reps: number;
  isCompleted: boolean;
}

// Interface for tracking set input state
export interface SetInputState {
  weight: string;
  reps: string;
}

// Interface for workout session from database
export interface WorkoutSessionData {
  id: string;
  workout_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

// Interface for workout session with details (for history)
export interface WorkoutSessionWithDetails extends WorkoutSessionData {
  workouts?: {
    id: string;
    name: string;
    description: string | null;
  };
  completed_exercise_sets?: CompletedExerciseSet[];
}

// Interface for completed exercise set from database
export interface CompletedExerciseSet {
  id: string;
  workout_session_id: string;
  exercise_instance_id: string;
  set_order: number;
  weight: number | null;
  reps: number;
  is_completed: boolean;
  exercise_instances?: {
    exercise_name: string;
    is_bodyweight: boolean;
  };
}

// Helper to get label for a set type
export const getSetTypeLabel = (type: SetType | string | null | undefined): string => {
  switch (type) {
    case SetType.WARMUP:
    case 'WARMUP':
      return 'Warm-up';
    case SetType.WORKING:
    case 'WORKING':
      return 'Working';
    case SetType.DROPSET:
    case 'DROPSET':
      return 'Drop Set';
    case SetType.FAILURE:
    case 'FAILURE':
      return 'To Failure';
    case SetType.AMRAP:
    case 'AMRAP':
      return 'AMRAP';
    case SetType.REST_PAUSE:
    case 'REST_PAUSE':
      return 'Rest-Pause';
    default:
      return 'Regular';
  }
};

// =============================================================================
// EXERCISE FEEDBACK TYPES
// =============================================================================

// Interface for exercise feedback data
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

// Interface for feedback recommendation
export interface FeedbackRecommendation {
  type: 'pain' | 'pump' | 'workload';
  message: string;
  action: 'increase_weight' | 'decrease_weight' | 'change_exercise' | 'adjust_reps' | 'no_change';
}

// Interface for feedback form input
export interface FeedbackFormInput {
  painLevel: number | null;
  pumpLevel: number | null;
  workloadLevel: number | null;
  notes: string;
}
