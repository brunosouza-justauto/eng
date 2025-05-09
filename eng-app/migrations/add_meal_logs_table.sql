-- Add meal_logs table for tracking athlete meal completion
CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
    nutrition_plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    day_type VARCHAR(100) NOT NULL,
    notes TEXT,
    is_extra_meal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX idx_meal_logs_date ON meal_logs(date);
CREATE INDEX idx_meal_logs_meal_id ON meal_logs(meal_id);

-- Table for extra meal food items (only used for meals not in the plan)
CREATE TABLE IF NOT EXISTS extra_meal_food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_log_id UUID NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_extra_meal_food_items_meal_log_id ON extra_meal_food_items(meal_log_id);

-- Add RLS policies for meal_logs
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

-- Coaches can see their athletes' meal logs
CREATE POLICY coach_read_athlete_meal_logs ON meal_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_coaches ac
            WHERE ac.athlete_id = meal_logs.user_id
            AND ac.coach_id = auth.uid()
        )
    );

-- Athletes can see and manage their own meal logs
CREATE POLICY athlete_manage_own_meal_logs ON meal_logs
    FOR ALL
    USING (user_id = auth.uid());

-- Add RLS policies for extra_meal_food_items
ALTER TABLE extra_meal_food_items ENABLE ROW LEVEL SECURITY;

-- Coaches can see their athletes' extra meal food items
CREATE POLICY coach_read_athlete_extra_meal_food_items ON extra_meal_food_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM meal_logs ml
            JOIN athlete_coaches ac ON ac.athlete_id = ml.user_id
            WHERE ml.id = extra_meal_food_items.meal_log_id
            AND ac.coach_id = auth.uid()
        )
    );

-- Athletes can see and manage their own extra meal food items
CREATE POLICY athlete_manage_own_extra_meal_food_items ON extra_meal_food_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM meal_logs ml
            WHERE ml.id = extra_meal_food_items.meal_log_id
            AND ml.user_id = auth.uid()
        )
    );

-- Add this migration to the migration history
INSERT INTO migration_history (name, applied_at)
VALUES ('add_meal_logs_table', NOW()); 