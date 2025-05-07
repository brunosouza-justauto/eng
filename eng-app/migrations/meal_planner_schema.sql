-- Meal Planner Schema Extensions
-- This file contains all the SQL needed to extend the database schema for the meal planning feature

-- 1. Add day_number and day_type to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS day_number INT NOT NULL DEFAULT 1;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS day_type TEXT; -- e.g., 'training', 'rest'

-- 2. Custom Recipes Table (specific to each coach)
CREATE TABLE IF NOT EXISTS recipes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    total_calories FLOAT8 CHECK (total_calories >= 0),
    total_protein FLOAT8 CHECK (total_protein >= 0),
    total_carbs FLOAT8 CHECK (total_carbs >= 0),
    total_fat FLOAT8 CHECK (total_fat >= 0),
    serving_size FLOAT8 CHECK (serving_size > 0),
    serving_unit TEXT DEFAULT 'g',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Recipe Ingredients Table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_item_id uuid NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    quantity FLOAT8 NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (recipe_id, food_item_id)
);

-- 4. Add recipe reference to meal_food_items
ALTER TABLE meal_food_items ADD COLUMN IF NOT EXISTS source_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL;

-- 5. Unit Conversion Table
CREATE TABLE IF NOT EXISTS unit_conversions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL, 
    food_category TEXT, -- optional, for specific food types
    conversion_factor FLOAT8 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (from_unit, to_unit, food_category)
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_coach_id ON recipes(coach_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_food_items_meal_id ON meal_food_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_food_items_source_recipe_id ON meal_food_items(source_recipe_id);
CREATE INDEX IF NOT EXISTS idx_meals_nutrition_plan_id ON meals(nutrition_plan_id);
CREATE INDEX IF NOT EXISTS idx_meals_day_number ON meals(nutrition_plan_id, day_number); 