-- Add the goal_type column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_type TEXT CHECK (goal_type IN ('fat_loss', 'muscle_gain', 'both', 'maintenance'));

-- Add the goal_target_fat_loss_kg column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_target_fat_loss_kg DECIMAL;

-- Add the goal_target_muscle_gain_kg column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_target_muscle_gain_kg DECIMAL;

-- Add the goal_timeframe_weeks column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_timeframe_weeks INTEGER;

-- Add the goal_target_weight_kg column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_target_weight_kg DECIMAL;

-- Add the goal_physique_details column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_physique_details TEXT;