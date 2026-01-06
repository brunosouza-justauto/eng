// Set type enum matching the database
export enum SetType {
  WARMUP = 'WARMUP',
  WORKING = 'WORKING',
  DROPSET = 'DROPSET',
  SUPERSET = 'SUPERSET',
  GIANT_SET = 'GIANT_SET',
  REST_PAUSE = 'REST_PAUSE',
  AMRAP = 'AMRAP',
  FAILURE = 'FAILURE',
}

// Exercise group type enum matching the database
export enum ExerciseGroupType {
  NONE = 'none',
  SUPERSET = 'superset',
  BI_SET = 'bi_set',
  TRI_SET = 'tri_set',
  GIANT_SET = 'giant_set',
}

// Interface for individual set data
export interface ExerciseSet {
  id?: string;
  set_order: number;
  type: SetType;
  reps?: string;
  weight?: string;
  rest_seconds?: number;
  duration?: string;
}

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
  sets_data?: ExerciseSet[];
  group_id?: string | null;
  group_type?: ExerciseGroupType | null;
  group_order?: number | null;
  is_bodyweight?: boolean;
  each_side?: boolean;
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

// Interface for program template
export interface ProgramTemplate {
  id: string;
  name: string;
  description: string | null;
  version?: number;
  workouts: WorkoutData[];
}

// Interface for program assignment
export interface ProgramAssignment {
  id: string;
  program_template_id: string;
  start_date: string;
  assigned_at?: string;
  program_templates?: {
    id: string;
    name: string;
    description: string | null;
    version?: number;
  };
}

// Interface for workout session (completed workout)
export interface WorkoutSession {
  id: string;
  workout_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
}

// Interface for completed workout date (for calendar)
export interface CompletedWorkoutDate {
  date: string; // ISO date string YYYY-MM-DD
  workoutId: string;
}

// Helper to get the name of the day from the day_of_week number (1-7)
export const getDayName = (dayOfWeek: number | null): string => {
  if (dayOfWeek === null) return '';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[(dayOfWeek - 1) % 7];
};

// Helper to get the current day of the week (1 for Monday, 7 for Sunday)
export const getCurrentDayOfWeek = (): number => {
  const today = new Date();
  // getDay returns 0 for Sunday, 1 for Monday, etc.
  // We want 1 for Monday through 7 for Sunday
  return today.getDay() === 0 ? 7 : today.getDay();
};

// Helper function to clean exercise names from gender and version indicators
export const cleanExerciseName = (name: string): string => {
  if (!name) return name;
  return name
    .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .trim();
};
