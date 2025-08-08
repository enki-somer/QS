-- Add unique constraint to prevent duplicate assignments
-- This ensures one contractor per (main_category + subcategory) per project
-- This prevents money calculation crashes

ALTER TABLE project_category_assignments 
ADD CONSTRAINT unique_project_category_contractor 
UNIQUE (project_id, main_category, subcategory, contractor_id);

-- Note: This constraint prevents the same contractor from being assigned
-- multiple times to the same subcategory within the same project
-- Different contractors can work on the same subcategory (that's allowed)
-- Same contractor can work on different subcategories (that's allowed)
-- But same contractor + same subcategory = NOT ALLOWED (prevents calculation errors)