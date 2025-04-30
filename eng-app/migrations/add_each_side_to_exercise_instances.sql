-- Add each_side column to exercise_instances if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercise_instances' AND column_name = 'each_side'
    ) THEN
        ALTER TABLE exercise_instances ADD COLUMN each_side BOOLEAN DEFAULT false;
    END IF;
END
$$; 