-- Migration: Add i18n columns for multilingual support (English and Portuguese)
-- Run this against your Supabase database

-- =====================================================
-- EXERCISES TABLE
-- =====================================================
-- Add i18n columns for exercise names and descriptions
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Copy existing name to English column
UPDATE exercises
SET name_en = name
WHERE name_en IS NULL AND name IS NOT NULL;

-- Note: 'instructions' is an array type, so description_en can be populated
-- later via the AI translation script which handles this properly

-- =====================================================
-- FOOD_ITEMS TABLE
-- =====================================================
-- Add i18n columns for food item names
ALTER TABLE food_items
  ADD COLUMN IF NOT EXISTS food_name_en TEXT,
  ADD COLUMN IF NOT EXISTS food_name_pt TEXT;

-- Copy existing values to English columns
UPDATE food_items
SET food_name_en = food_name
WHERE food_name_en IS NULL;

-- =====================================================
-- MEALS TABLE
-- =====================================================
-- Add i18n columns for meal names and notes
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS notes_en TEXT,
  ADD COLUMN IF NOT EXISTS notes_pt TEXT;

-- Copy existing values to English columns
UPDATE meals
SET
  name_en = name,
  notes_en = notes
WHERE name_en IS NULL;

-- =====================================================
-- SUPPLEMENTS TABLE
-- =====================================================
-- Add i18n columns for supplement names
ALTER TABLE supplements
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT;

-- Copy existing values to English columns
UPDATE supplements
SET name_en = name
WHERE name_en IS NULL;

-- =====================================================
-- EXERCISE_INSTANCES TABLE (Coach notes per exercise)
-- =====================================================
ALTER TABLE exercise_instances
  ADD COLUMN IF NOT EXISTS notes_en TEXT,
  ADD COLUMN IF NOT EXISTS notes_pt TEXT;

-- Copy existing notes to English columns
UPDATE exercise_instances
SET notes_en = notes
WHERE notes_en IS NULL AND notes IS NOT NULL;

-- =====================================================
-- PROGRAM_TEMPLATES TABLE (Program-level description)
-- =====================================================
ALTER TABLE program_templates
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Copy existing description to English columns
UPDATE program_templates
SET description_en = description
WHERE description_en IS NULL AND description IS NOT NULL;

-- =====================================================
-- NUTRITION_PLANS TABLE (Plan-level description)
-- =====================================================
ALTER TABLE nutrition_plans
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Copy existing description to English columns
UPDATE nutrition_plans
SET description_en = description
WHERE description_en IS NULL AND description IS NOT NULL;

-- =====================================================
-- WORKOUTS TABLE (Workout names and descriptions)
-- =====================================================
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Copy existing values to English columns
UPDATE workouts
SET
  name_en = name,
  description_en = description
WHERE name_en IS NULL;

-- =====================================================
-- INDEXES for faster lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_exercises_name_en ON exercises(name_en);
CREATE INDEX IF NOT EXISTS idx_exercises_name_pt ON exercises(name_pt);
CREATE INDEX IF NOT EXISTS idx_food_items_name_en ON food_items(food_name_en);
CREATE INDEX IF NOT EXISTS idx_food_items_name_pt ON food_items(food_name_pt);
CREATE INDEX IF NOT EXISTS idx_supplements_name_en ON supplements(name_en);
CREATE INDEX IF NOT EXISTS idx_supplements_name_pt ON supplements(name_pt);
CREATE INDEX IF NOT EXISTS idx_workouts_name_en ON workouts(name_en);
CREATE INDEX IF NOT EXISTS idx_workouts_name_pt ON workouts(name_pt);

-- =====================================================
-- VERIFY MIGRATION
-- =====================================================
-- Run these queries to verify the migration was successful:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'exercises' AND (column_name LIKE '%_en' OR column_name LIKE '%_pt');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'food_items' AND (column_name LIKE '%_en' OR column_name LIKE '%_pt');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'meals' AND (column_name LIKE '%_en' OR column_name LIKE '%_pt');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'workouts' AND (column_name LIKE '%_en' OR column_name LIKE '%_pt');
