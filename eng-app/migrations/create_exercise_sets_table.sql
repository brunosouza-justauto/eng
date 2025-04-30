-- Create exercise_sets table if it doesn't exist
CREATE TABLE IF NOT EXISTS exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_instance_id UUID NOT NULL REFERENCES exercise_instances(id) ON DELETE CASCADE,
    set_order INTEGER NOT NULL,
    type TEXT NOT NULL,
    reps TEXT,
    weight TEXT,
    rest_seconds INTEGER,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_instance_id ON exercise_sets(exercise_instance_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_order ON exercise_sets(set_order);

-- Add RLS policies (similar to other tables)
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

-- Allow normal users to read their own exercise sets
CREATE POLICY read_exercise_sets ON exercise_sets 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM exercise_instances ei
            JOIN workouts w ON ei.workout_id = w.id
            JOIN program_templates pt ON w.program_template_id = pt.id
            WHERE ei.id = exercise_sets.exercise_instance_id
            AND pt.coach_id = auth.uid()
        )
    );

-- Allow normal users to insert their own exercise sets
CREATE POLICY insert_exercise_sets ON exercise_sets 
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exercise_instances ei
            JOIN workouts w ON ei.workout_id = w.id
            JOIN program_templates pt ON w.program_template_id = pt.id
            WHERE ei.id = exercise_sets.exercise_instance_id
            AND pt.coach_id = auth.uid()
        )
    );

-- Allow normal users to update their own exercise sets
CREATE POLICY update_exercise_sets ON exercise_sets 
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM exercise_instances ei
            JOIN workouts w ON ei.workout_id = w.id
            JOIN program_templates pt ON w.program_template_id = pt.id
            WHERE ei.id = exercise_sets.exercise_instance_id
            AND pt.coach_id = auth.uid()
        )
    );

-- Allow normal users to delete their own exercise sets
CREATE POLICY delete_exercise_sets ON exercise_sets 
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM exercise_instances ei
            JOIN workouts w ON ei.workout_id = w.id
            JOIN program_templates pt ON w.program_template_id = pt.id
            WHERE ei.id = exercise_sets.exercise_instance_id
            AND pt.coach_id = auth.uid()
        )
    );

-- Add trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exercise_sets_modtime
BEFORE UPDATE ON exercise_sets
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column(); 