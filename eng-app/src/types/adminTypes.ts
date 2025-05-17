// Shared types for Admin components

// Define set types for exercises
export enum SetType {
    REGULAR = 'regular',
    WARM_UP = 'warm_up',
    DROP_SET = 'drop_set',
    FAILURE = 'failure',
    BACKDOWN = 'backdown',
    TEMPO = 'tempo',
    SUPERSET = 'superset',
    CONTRAST = 'contrast',
    COMPLEX = 'complex',
    CLUSTER = 'cluster',
    PYRAMID = 'pyramid',
    PARTIAL = 'partial',
    BURNS = 'burns',
    PAUSE = 'pause',
    PULSE = 'pulse',
    NEGATIVE = 'negative',
    FORCED_REP = 'forced_rep',
    PRE_EXHAUST = 'pre_exhaust',
    POST_EXHAUST = 'post_exhaust'
}

// Define exercise grouping types
export enum ExerciseGroupType {
    NONE = 'none',
    SUPERSET = 'superset',     // Two alternating exercises
    BI_SET = 'bi_set',         // Two exercises performed back-to-back
    TRI_SET = 'tri_set',       // Three exercises performed back-to-back
    GIANT_SET = 'giant_set'    // Four or more exercises performed back-to-back
}

// Define individual set structure
export interface ExerciseSet {
    id?: string; // For existing sets
    set_order: number; // Position in the sequence
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
    each_side?: boolean; // Whether this exercise is performed on each side separately
    group_id?: string | null; // UUID that links related exercises in a group
    group_type?: ExerciseGroupType; // The type of group this exercise belongs to
    group_order?: number; // Order within the group
    is_bodyweight?: boolean; // Whether this exercise uses bodyweight instead of external weights
    // Fields for joined database exercise data
    exercises?: {
        id: string | number;
        name: string;
        primary_muscle_group?: string;
        secondary_muscle_groups?: string[];
        body_part?: string;
        target?: string;
    };
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