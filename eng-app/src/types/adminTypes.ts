// Shared types for Admin components

// Define set types for exercises
export enum SetType {
    REGULAR = 'regular',
    WARM_UP = 'warm_up',
    DROP_SET = 'drop_set',
    FAILURE = 'failure'
}

// Define individual set structure
export interface ExerciseSet {
    id?: string; // For existing sets
    order: number; // Position in the sequence
    type: SetType; // The type of this specific set
    reps?: string; // Reps for this set (may differ between sets)
    weight?: string; // Weight for this set
    rest_seconds?: number; // Rest period after this set
    duration?: string; // For timed exercises
}

export interface ExerciseInstanceAdminData {
    id?: string;
    exercise_db_id: string | null;
    exercise_name: string;
    sets: string | null; // Keeping for backward compatibility - represents set count
    sets_data?: ExerciseSet[]; // New field to store individual set data
    reps: string | null; // Default reps for backward compatibility
    rest_period_seconds: number | null;
    tempo: string | null;
    notes: string | null;
    order_in_workout: number | null;
    set_type?: SetType | null; // Keeping for backward compatibility
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