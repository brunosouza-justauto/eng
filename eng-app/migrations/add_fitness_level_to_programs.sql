-- Add fitness_level column to program_templates table
ALTER TABLE program_templates 
    ADD COLUMN IF NOT EXISTS fitness_level TEXT;

-- Create index for efficient filtering by fitness level
CREATE INDEX IF NOT EXISTS idx_program_templates_fitness_level ON program_templates (fitness_level);

-- Update existing templates (set to a default value if needed)
UPDATE program_templates
SET fitness_level = 'Intermediate'
WHERE fitness_level IS NULL;

-- Add comment to document the field's purpose
COMMENT ON COLUMN program_templates.fitness_level IS 'The target fitness level for this program: Beginner, Intermediate, Advanced, or Athlete'; 