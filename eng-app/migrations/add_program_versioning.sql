-- Add versioning to program templates

-- Add version field to program_templates table
ALTER TABLE program_templates 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Add parent_template_id to track versions of the same program
ALTER TABLE program_templates 
ADD COLUMN parent_template_id UUID REFERENCES program_templates(id) NULL;

-- Add is_latest_version flag to identify the latest version
ALTER TABLE program_templates 
ADD COLUMN is_latest_version BOOLEAN NOT NULL DEFAULT TRUE;

-- Create indexes for performance
CREATE INDEX idx_program_templates_parent_id ON program_templates(parent_template_id);
CREATE INDEX idx_program_templates_is_latest ON program_templates(is_latest_version);

-- Create a view that only returns the latest versions of templates
CREATE OR REPLACE VIEW latest_program_templates AS
SELECT * FROM program_templates WHERE is_latest_version = TRUE;

-- Function to update is_latest_version when a new version is created
CREATE OR REPLACE FUNCTION update_program_template_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new version of an existing template (has parent_template_id)
    IF NEW.parent_template_id IS NOT NULL THEN
        -- Set all previous versions to not be the latest
        UPDATE program_templates
        SET is_latest_version = FALSE
        WHERE (id = NEW.parent_template_id OR parent_template_id = NEW.parent_template_id)
        AND id != NEW.id;
        
        -- Make sure this new one is the latest
        NEW.is_latest_version = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run this function
CREATE TRIGGER program_template_version_trigger
BEFORE INSERT OR UPDATE ON program_templates
FOR EACH ROW EXECUTE FUNCTION update_program_template_versions(); 