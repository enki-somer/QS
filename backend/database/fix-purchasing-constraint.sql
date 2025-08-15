-- Fix unique constraint to allow multiple purchasing assignments
-- while preventing duplicate contractor assignments

-- Drop the existing constraint
ALTER TABLE project_category_assignments 
DROP CONSTRAINT IF EXISTS unique_project_category_contractor;

-- Add a partial unique index that handles purchasing assignments properly
-- This allows multiple NULL contractor_id values (purchasing) but prevents duplicate contractor assignments
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_category_contractor_not_null 
ON project_category_assignments (project_id, main_category, subcategory, contractor_id) 
WHERE contractor_id IS NOT NULL;

-- Add a field to differentiate purchasing assignments from contractor assignments
-- This helps with better data organization
ALTER TABLE project_category_assignments 
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) DEFAULT 'contractor';

-- Update existing records to set assignment_type
UPDATE project_category_assignments 
SET assignment_type = CASE 
    WHEN contractor_id IS NULL THEN 'purchasing'
    ELSE 'contractor'
END;

-- Add constraint to ensure assignment_type is valid
ALTER TABLE project_category_assignments 
ADD CONSTRAINT valid_assignment_type 
CHECK (assignment_type IN ('contractor', 'purchasing'));

-- Add index for better performance on assignment_type queries
CREATE INDEX IF NOT EXISTS idx_assignment_type ON project_category_assignments(assignment_type);

-- Add index for better performance on purchasing queries
CREATE INDEX IF NOT EXISTS idx_purchasing_assignments ON project_category_assignments(project_id, main_category, subcategory) 
WHERE assignment_type = 'purchasing';

-- Comment for clarity
COMMENT ON COLUMN project_category_assignments.assignment_type IS 'Type of assignment: contractor (has contractor_id) or purchasing (no contractor_id)';
