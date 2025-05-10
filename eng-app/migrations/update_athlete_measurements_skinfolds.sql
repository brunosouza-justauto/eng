-- Migration to update athlete measurements table
-- Rename circumference columns for clarity and add new skinfold measurement columns

-- Add new skinfold measurement columns
ALTER TABLE athlete_measurements
ADD COLUMN chest_mm NUMERIC(5,2),
ADD COLUMN abdominal_mm NUMERIC(5,2),
ADD COLUMN thigh_mm NUMERIC(5,2);

-- Migrate any existing data from circumference to skinfold
-- Only if the rows exist and are being used for skinfold calculations
UPDATE athlete_measurements
SET 
  chest_mm = chest_cm,
  abdominal_mm = abdominal_cm,
  thigh_mm = thigh_cm
WHERE
  calculation_method IN ('jackson_pollock_3', 'jackson_pollock_7', 'parrillo')
  AND (chest_cm IS NOT NULL OR abdominal_cm IS NOT NULL OR thigh_cm IS NOT NULL);

-- Rename existing columns to make them more specific (if they need to remain)
-- Uncomment these if you want to rename rather than keep both sets of columns
/*
ALTER TABLE athlete_measurements 
RENAME COLUMN chest_cm TO chest_circumference_cm;

ALTER TABLE athlete_measurements 
RENAME COLUMN abdominal_cm TO abdominal_circumference_cm;

ALTER TABLE athlete_measurements 
RENAME COLUMN thigh_cm TO thigh_circumference_cm;
*/

-- Or simply drop them if you don't need circumference measurements for these areas
-- Uncomment if you want to completely replace these columns with skinfold versions
/*
ALTER TABLE athlete_measurements
DROP COLUMN chest_cm,
DROP COLUMN abdominal_cm,
DROP COLUMN thigh_cm;
*/ 