-- Create enum for body fat calculation methods
CREATE TYPE bf_calculation_method AS ENUM (
  'jackson_pollock_3',
  'jackson_pollock_4',
  'jackson_pollock_7',
  'durnin_womersley',
  'parrillo',
  'navy_tape'
);

-- Create table for athlete measurements
CREATE TABLE IF NOT EXISTS athlete_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  weight_change_kg NUMERIC(5,2),
  
  -- Circumference measurements (cm)
  waist_cm NUMERIC(5,2),
  neck_cm NUMERIC(5,2),
  hips_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  abdominal_cm NUMERIC(5,2),
  thigh_cm NUMERIC(5,2),
  
  -- Skinfold measurements (mm)
  tricep_mm NUMERIC(5,2),
  subscapular_mm NUMERIC(5,2),
  suprailiac_mm NUMERIC(5,2),
  midaxillary_mm NUMERIC(5,2),
  bicep_mm NUMERIC(5,2),
  lower_back_mm NUMERIC(5,2),
  calf_mm NUMERIC(5,2),
  
  -- Body composition calculations
  body_fat_percentage NUMERIC(5,2),
  body_fat_override NUMERIC(5,2),  -- Manual override if needed
  lean_body_mass_kg NUMERIC(5,2),
  fat_mass_kg NUMERIC(5,2),
  basal_metabolic_rate NUMERIC(6,2),
  
  -- Calculation method used
  calculation_method bf_calculation_method,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(user_id),
  
  -- Ensure we can't have duplicate entries for the same user on the same date
  UNIQUE(user_id, measurement_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_athlete_measurements_user_id ON athlete_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_measurements_date ON athlete_measurements(measurement_date);

-- Add RLS policies
ALTER TABLE athlete_measurements ENABLE ROW LEVEL SECURITY;

-- Coaches can view and edit all athlete measurements
CREATE POLICY coach_measurement_policy ON athlete_measurements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- Athletes can only view their own measurements
CREATE POLICY athlete_view_own_measurements ON athlete_measurements
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Add tables to public schema for Supabase access
GRANT ALL ON athlete_measurements TO service_role; 