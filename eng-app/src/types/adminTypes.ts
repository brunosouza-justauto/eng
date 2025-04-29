// Shared types for Admin components

export interface ExerciseInstanceAdminData {
    id?: string;
    exercise_db_id: string | null;
    exercise_name: string;
    sets: string | null;
    reps: string | null;
    rest_period_seconds: number | null;
    tempo: string | null;
    notes: string | null;
    order_in_workout: number | null;
}

export interface WorkoutAdminData {
    id?: string;
    program_template_id?: string;
    name: string;
    day_of_week: number | null;
    week_number: number | null;
    order_in_program: number | null;
    description: string | null;
    exercise_instances: ExerciseInstanceAdminData[];
}

// Add other shared admin types here later if needed 