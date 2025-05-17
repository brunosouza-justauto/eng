-- SQL to create a proper exercise_instances to exercises relation

-- 1. First, modify the exercise_db_id column to be an integer (if it's currently text/varchar)
ALTER TABLE exercise_instances 
  ALTER COLUMN exercise_db_id TYPE integer USING (exercise_db_id::integer);

-- 2. Create a foreign key constraint that links exercise_instances.exercise_db_id to exercises.id
ALTER TABLE exercise_instances
  ADD CONSTRAINT fk_exercise_instance_exercise
  FOREIGN KEY (exercise_db_id) 
  REFERENCES exercises(id);

-- 3. Optionally create an index to improve join performance
CREATE INDEX idx_exercise_instances_exercise_db_id ON exercise_instances(exercise_db_id);

-- Run this SQL in the Supabase SQL Editor to establish the relationship.
-- After these changes, you'll be able to use the nested join syntax:
--
-- .select(`
--     *, 
--     exercise_instances(
--         *,
--         exercises(
--             id,
--             name,
--             primary_muscle_group,
--             secondary_muscle_groups,
--             body_part,
--             target
--         )
--     )
-- `)
--
-- Note: This assumes that:
-- 1. The 'id' column in the exercises table is an integer
-- 2. All values in exercise_db_id can be converted to integers
-- 3. All values in exercise_db_id exist in the exercises.id column 