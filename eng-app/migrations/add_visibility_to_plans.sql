-- Add visibility control (public/private) to program_templates and nutrition_plans
-- This migration adds the is_public flag to both tables to control visibility to athletes

-- Add is_public column to program_templates table
ALTER TABLE program_templates 
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_public column to nutrition_plans table
ALTER TABLE nutrition_plans 
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for efficient filtering by visibility
CREATE INDEX IF NOT EXISTS idx_program_templates_is_public ON program_templates (is_public);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_is_public ON nutrition_plans (is_public);

-- Create or update RLS policies for program_templates

-- Coaches can see all their own programs (public or private)
CREATE POLICY IF NOT EXISTS "coaches_access_own_programs" 
    ON program_templates FOR ALL 
    USING (coach_id = auth.uid());

-- Athletes can view public programs OR programs assigned specifically to them
CREATE POLICY IF NOT EXISTS "athletes_view_accessible_programs" 
    ON program_templates FOR SELECT 
    USING (
        is_public OR 
        EXISTS (
            SELECT 1 FROM assigned_plans 
            WHERE assigned_plans.program_template_id = program_templates.id 
            AND assigned_plans.athlete_id = auth.uid()
        )
    );

-- Create or update RLS policies for nutrition_plans

-- Coaches can see all their own nutrition plans (public or private)
CREATE POLICY IF NOT EXISTS "coaches_access_own_nutrition_plans" 
    ON nutrition_plans FOR ALL 
    USING (coach_id = auth.uid());

-- Athletes can view public nutrition plans OR plans assigned specifically to them
CREATE POLICY IF NOT EXISTS "athletes_view_accessible_nutrition_plans" 
    ON nutrition_plans FOR SELECT 
    USING (
        is_public OR 
        EXISTS (
            SELECT 1 FROM assigned_plans 
            WHERE assigned_plans.nutrition_plan_id = nutrition_plans.id 
            AND assigned_plans.athlete_id = auth.uid()
        )
    ); 