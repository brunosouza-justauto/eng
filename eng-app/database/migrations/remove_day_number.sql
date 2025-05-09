-- Migration to remove the day_number column from meals table

-- First ensure all functionality is covered by order_in_plan
-- This will be a safe migration as we've already updated the code to not use day_number

-- Remove the column
ALTER TABLE meals DROP COLUMN day_number;

-- Update any existing indexes that might reference this column (if any)
-- DROP INDEX IF EXISTS idx_meals_day_number;

-- Make a note in the migration history
INSERT INTO migration_history (migration_name, executed_at, description) 
VALUES (
  'remove_day_number', 
  NOW(), 
  'Removed day_number column from meals table as functionality is handled by order_in_plan'
); 