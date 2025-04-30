-- Add columns for exercise grouping to enable supersets, bi-sets, tri-sets, etc.
DO $$
BEGIN
    -- Add group_id column if it doesn't exist
    -- This will store a UUID that links related exercises
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercise_instances' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE exercise_instances ADD COLUMN group_id UUID;
        
        -- Add index for better performance
        CREATE INDEX IF NOT EXISTS idx_exercise_instances_group_id ON exercise_instances(group_id);
    END IF;
    
    -- Add group_type column if it doesn't exist
    -- This will store what type of group it is (superset, bi-set, tri-set, giant-set, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercise_instances' AND column_name = 'group_type'
    ) THEN
        -- Create an enum type for group types if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'exercise_group_type'
        ) THEN
            CREATE TYPE exercise_group_type AS ENUM (
                'none',            -- Not part of a group
                'superset',        -- Two alternating exercises
                'bi_set',          -- Two exercises performed back-to-back
                'tri_set',         -- Three exercises performed back-to-back
                'giant_set'        -- Four or more exercises performed back-to-back
            );
        END IF;
        
        -- Add the column with none as default
        ALTER TABLE exercise_instances ADD COLUMN group_type exercise_group_type DEFAULT 'none';
    END IF;
    
    -- Add group_order column if it doesn't exist
    -- This determines the order of exercises within a group
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercise_instances' AND column_name = 'group_order'
    ) THEN
        ALTER TABLE exercise_instances ADD COLUMN group_order INTEGER DEFAULT 0;
    END IF;
END
$$; 