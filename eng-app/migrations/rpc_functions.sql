-- RPC Functions for efficient retrieval of distinct values
-- Run these in the Supabase SQL Editor to create the functions

-- Function to get all distinct muscle groups
CREATE OR REPLACE FUNCTION get_distinct_muscle_groups()
RETURNS TABLE (value text)
LANGUAGE SQL
AS $$
  -- Combine results from multiple columns that could contain muscle groups
  WITH combined_sources AS (
    SELECT primary_muscle_group AS value FROM exercises WHERE primary_muscle_group IS NOT NULL
    UNION
    SELECT UNNEST(secondary_muscle_groups) AS value FROM exercises 
      WHERE secondary_muscle_groups IS NOT NULL AND array_length(secondary_muscle_groups, 1) > 0
  )
  SELECT DISTINCT TRIM(value) as value
  FROM combined_sources 
  WHERE value != '' 
  ORDER BY value;
$$;

-- Function to get all distinct equipment types
CREATE OR REPLACE FUNCTION get_distinct_equipment()
RETURNS TABLE (value text)
LANGUAGE SQL
AS $$
  -- Get distinct equipment values
  SELECT DISTINCT TRIM(equipment)  as value
  FROM exercises 
  WHERE equipment IS NOT NULL AND equipment != ''
  ORDER BY value;
$$;

-- Function to get all distinct categories (target)
CREATE OR REPLACE FUNCTION get_distinct_categories()
RETURNS TABLE (value text)
LANGUAGE SQL
AS $$
  -- Get distinct target/categories
  SELECT DISTINCT TRIM(target) as value
  FROM exercises 
  WHERE target IS NOT NULL AND target != ''
  ORDER BY value;
$$;

-- Function to get all distinct gender values
CREATE OR REPLACE FUNCTION get_distinct_gender()
RETURNS TABLE (value text)
LANGUAGE SQL
AS $$
  -- Get distinct gender values
  SELECT DISTINCT TRIM(gender)  as value
  FROM exercises 
  WHERE gender IS NOT NULL AND gender != ''
  ORDER BY value;
$$;

-- Function to get a count of records per category
CREATE OR REPLACE FUNCTION get_category_counts()
RETURNS TABLE (category text, count bigint)
LANGUAGE SQL
AS $$
  -- Get the count of exercises per category
  SELECT target as category, COUNT(*) as count
  FROM exercises
  WHERE target IS NOT NULL
  GROUP BY target
  ORDER BY count DESC;
$$;

-- Function to get a count of records per equipment type
CREATE OR REPLACE FUNCTION get_equipment_counts()
RETURNS TABLE (equipment text, count bigint)
LANGUAGE SQL
AS $$
  -- Get the count of exercises per equipment type
  SELECT equipment, COUNT(*) as count
  FROM exercises
  WHERE equipment IS NOT NULL
  GROUP BY equipment
  ORDER BY count DESC;
$$;