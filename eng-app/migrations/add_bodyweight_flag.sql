-- Add is_bodyweight column to exercise_instances table
DO $$
BEGIN
    -- Add is_bodyweight column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercise_instances' AND column_name = 'is_bodyweight'
    ) THEN
        ALTER TABLE exercise_instances ADD COLUMN is_bodyweight BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update existing indexes and comment
COMMENT ON COLUMN exercise_instances.is_bodyweight IS 'Flag to indicate if this exercise uses bodyweight instead of external weights'; 