-- Quick Fix: Add Missing Budget Columns to Projects Table
-- Run this script first to fix the 500 error

-- Add the missing columns to projects table
DO $$
BEGIN
    -- Add allocated_budget column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'allocated_budget') THEN
        ALTER TABLE projects ADD COLUMN allocated_budget DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.allocated_budget IS 'Total budget allocated to contractor assignments';
        RAISE NOTICE 'Added allocated_budget column';
    ELSE
        RAISE NOTICE 'allocated_budget column already exists';
    END IF;
    
    -- Add available_budget column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'available_budget') THEN
        ALTER TABLE projects ADD COLUMN available_budget DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.available_budget IS 'Remaining budget available for new assignments';
        RAISE NOTICE 'Added available_budget column';
    ELSE
        RAISE NOTICE 'available_budget column already exists';
    END IF;
    
    -- Add spent_budget column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'spent_budget') THEN
        ALTER TABLE projects ADD COLUMN spent_budget DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.spent_budget IS 'Total amount actually spent (approved invoices + approved expenses)';
        RAISE NOTICE 'Added spent_budget column';
    ELSE
        RAISE NOTICE 'spent_budget column already exists';
    END IF;
END $$;

-- Initialize the budget values for existing projects
UPDATE projects 
SET 
    allocated_budget = COALESCE((
        SELECT SUM(estimated_amount) 
        FROM project_category_assignments 
        WHERE project_id = projects.id
    ), 0),
    available_budget = budget_estimate - COALESCE((
        SELECT SUM(estimated_amount) 
        FROM project_category_assignments 
        WHERE project_id = projects.id
    ), 0),
    spent_budget = COALESCE((
        SELECT SUM(amount) FROM invoices 
        WHERE project_id = projects.id AND status IN ('approved', 'paid')
    ), 0) + COALESCE((
        SELECT SUM(cost) FROM general_expenses 
        WHERE project_id = projects.id AND status = 'approved'
    ), 0)
WHERE allocated_budget IS NULL OR available_budget IS NULL OR spent_budget IS NULL;

SELECT 'Budget columns added successfully!' as status;
SELECT 'Projects API should now work without 500 errors' as result;
