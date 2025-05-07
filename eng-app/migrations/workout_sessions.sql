-- Create workout_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    workout_id UUID NOT NULL REFERENCES workouts(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create completed_exercise_sets table for tracking workout progress
CREATE TABLE IF NOT EXISTS completed_exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_instance_id UUID NOT NULL REFERENCES exercise_instances(id),
    set_order INTEGER NOT NULL,
    weight TEXT,
    reps INTEGER,
    is_completed BOOLEAN DEFAULT false,
    notes TEXT,
    set_type TEXT, -- Store the set type (regular, warm_up, failure, drop_set, backdown, tempo, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index on set_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_completed_sets_set_type ON completed_exercise_sets(set_type);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_id ON workout_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_completed_sets_workout_session_id ON completed_exercise_sets(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_completed_sets_exercise_instance_id ON completed_exercise_sets(exercise_instance_id);

-- Add RLS policies for workout sessions
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own workout sessions
CREATE POLICY read_own_workout_sessions ON workout_sessions 
    FOR SELECT 
    USING (user_id = auth.uid());

-- Allow users to insert their own workout sessions
CREATE POLICY insert_own_workout_sessions ON workout_sessions 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own workout sessions
CREATE POLICY update_own_workout_sessions ON workout_sessions 
    FOR UPDATE 
    USING (user_id = auth.uid());

-- Allow coaches to read their athletes' workout sessions
CREATE POLICY read_athletes_workout_sessions ON workout_sessions 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = workout_sessions.user_id 
            AND profiles.coach_id = auth.uid()
        )
    );

-- Add RLS policies for completed exercise sets
ALTER TABLE completed_exercise_sets ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own completed sets
CREATE POLICY read_own_completed_sets ON completed_exercise_sets 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions 
            WHERE workout_sessions.id = completed_exercise_sets.workout_session_id 
            AND workout_sessions.user_id = auth.uid()
        )
    );

-- Allow users to insert their own completed sets
CREATE POLICY insert_own_completed_sets ON completed_exercise_sets 
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions 
            WHERE workout_sessions.id = completed_exercise_sets.workout_session_id 
            AND workout_sessions.user_id = auth.uid()
        )
    );

-- Allow users to update their own completed sets
CREATE POLICY update_own_completed_sets ON completed_exercise_sets 
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions 
            WHERE workout_sessions.id = completed_exercise_sets.workout_session_id 
            AND workout_sessions.user_id = auth.uid()
        )
    );

-- Allow coaches to read their athletes' completed sets
CREATE POLICY read_athletes_completed_sets ON completed_exercise_sets 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions 
            JOIN profiles ON profiles.user_id = workout_sessions.user_id 
            WHERE workout_sessions.id = completed_exercise_sets.workout_session_id 
            AND profiles.coach_id = auth.uid()
        )
    ); 