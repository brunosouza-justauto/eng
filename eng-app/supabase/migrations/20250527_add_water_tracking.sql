-- Create water_goals table for tracking athletes' daily water intake goals
CREATE TABLE IF NOT EXISTS water_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  water_goal_ml INTEGER NOT NULL DEFAULT 2500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create water_tracking table for logging daily water intake
CREATE TABLE IF NOT EXISTS water_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create RLS policies for water_tracking table
ALTER TABLE water_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own water tracking entries
CREATE POLICY "Users can view their own water tracking" 
ON water_tracking FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to insert their own water tracking entries
CREATE POLICY "Users can insert their own water tracking" 
ON water_tracking FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own water tracking entries
CREATE POLICY "Users can update their own water tracking" 
ON water_tracking FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for admins to view all water tracking entries
CREATE POLICY "Admins can view all water tracking" 
ON water_tracking FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy for admins to update all water tracking entries
CREATE POLICY "Admins can update all water tracking" 
ON water_tracking FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS water_tracking_user_id_idx ON water_tracking(user_id);
CREATE INDEX IF NOT EXISTS water_tracking_date_idx ON water_tracking(date);

-- Enable RLS for water_goals table
ALTER TABLE water_goals ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own water goal
CREATE POLICY "Users can view their own water goal" 
ON water_goals FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to insert their own water goal
CREATE POLICY "Users can insert their own water goal" 
ON water_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own water goal
CREATE POLICY "Users can update their own water goal" 
ON water_goals FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for admins to view all water goals
CREATE POLICY "Admins can view all water goals" 
ON water_goals FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy for admins to update all water goals
CREATE POLICY "Admins can update all water goals" 
ON water_goals FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add index for water_goals
CREATE INDEX IF NOT EXISTS water_goals_user_id_idx ON water_goals(user_id);
