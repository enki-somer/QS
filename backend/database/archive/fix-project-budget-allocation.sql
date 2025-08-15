-- Fix Project Budget Allocation System
-- This script fixes the financial flow to properly track budget allocation vs spending

-- 1. Add budget allocation tracking to projects table
DO $$
BEGIN
    -- Add allocated_budget column to track how much budget is assigned to contractors
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'allocated_budget') THEN
        ALTER TABLE projects ADD COLUMN allocated_budget DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.allocated_budget IS 'Total budget allocated to contractor assignments';
    END IF;
    
    -- Add available_budget column for easy calculation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'available_budget') THEN
        ALTER TABLE projects ADD COLUMN available_budget DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.available_budget IS 'Remaining budget available for new assignments (budget_estimate - allocated_budget)';
    END IF;
    
    -- Add spent_budget column to track actual spending
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'spent_budget') THEN
        ALTER TABLE projects ADD COLUMN spent_budget DECIMAL(15,2) DEFAULT 0;
        COMMENT ON COLUMN projects.spent_budget IS 'Total amount actually spent (approved invoices + approved expenses)';
    END IF;
END $$;

-- 2. Create function to update project budget allocation when assignments are created/updated
CREATE OR REPLACE FUNCTION update_project_budget_allocation()
RETURNS TRIGGER AS $$
DECLARE
    total_allocated DECIMAL(15,2);
    project_budget DECIMAL(15,2);
BEGIN
    -- Get the project's total budget
    SELECT budget_estimate INTO project_budget 
    FROM projects 
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Calculate total allocated budget for this project
    SELECT COALESCE(SUM(estimated_amount), 0) INTO total_allocated
    FROM project_category_assignments 
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Update project allocation tracking
    UPDATE projects 
    SET 
        allocated_budget = total_allocated,
        available_budget = project_budget - total_allocated,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Create triggers for assignment changes
DROP TRIGGER IF EXISTS trg_update_project_allocation_insert ON project_category_assignments;
CREATE TRIGGER trg_update_project_allocation_insert
    AFTER INSERT ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_budget_allocation();

DROP TRIGGER IF EXISTS trg_update_project_allocation_update ON project_category_assignments;
CREATE TRIGGER trg_update_project_allocation_update
    AFTER UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_budget_allocation();

DROP TRIGGER IF EXISTS trg_update_project_allocation_delete ON project_category_assignments;
CREATE TRIGGER trg_update_project_allocation_delete
    AFTER DELETE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_budget_allocation();

-- 4. Create function to update project spending when invoices/expenses are approved
CREATE OR REPLACE FUNCTION update_project_spending()
RETURNS TRIGGER AS $$
DECLARE
    project_id_to_update UUID;
    total_spent DECIMAL(15,2);
BEGIN
    -- Determine which project to update
    IF TG_TABLE_NAME = 'invoices' THEN
        project_id_to_update = NEW.project_id;
    ELSIF TG_TABLE_NAME = 'general_expenses' THEN
        project_id_to_update = NEW.project_id;
    END IF;
    
    -- Only update spending when status changes to approved/paid
    IF TG_TABLE_NAME = 'invoices' AND NEW.status IN ('approved', 'paid') AND OLD.status = 'pending_approval' THEN
        -- Calculate total spent from approved invoices and expenses for this project
        SELECT COALESCE(
            (SELECT SUM(amount) FROM invoices WHERE project_id = project_id_to_update AND status IN ('approved', 'paid')) +
            (SELECT SUM(cost) FROM general_expenses WHERE project_id = project_id_to_update AND status = 'approved'),
            0
        ) INTO total_spent;
        
        -- Update project spending
        UPDATE projects 
        SET 
            spent_budget = total_spent,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = project_id_to_update;
        
    ELSIF TG_TABLE_NAME = 'general_expenses' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Calculate total spent from approved invoices and expenses for this project
        SELECT COALESCE(
            (SELECT SUM(amount) FROM invoices WHERE project_id = project_id_to_update AND status IN ('approved', 'paid')) +
            (SELECT SUM(cost) FROM general_expenses WHERE project_id = project_id_to_update AND status = 'approved'),
            0
        ) INTO total_spent;
        
        -- Update project spending
        UPDATE projects 
        SET 
            spent_budget = total_spent,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = project_id_to_update;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for spending updates
DROP TRIGGER IF EXISTS trg_update_project_spending_invoices ON invoices;
CREATE TRIGGER trg_update_project_spending_invoices
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending();

DROP TRIGGER IF EXISTS trg_update_project_spending_expenses ON general_expenses;
CREATE TRIGGER trg_update_project_spending_expenses
    AFTER UPDATE ON general_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending();

-- 6. Initialize existing project budgets
UPDATE projects SET 
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
    ), 0);

-- 7. Create view for easy project financial overview
CREATE OR REPLACE VIEW project_financial_overview AS
SELECT 
    p.id,
    p.name,
    p.code,
    p.budget_estimate,
    p.allocated_budget,
    p.available_budget,
    p.spent_budget,
    -- Calculate remaining budget (what's left after actual spending)
    (p.budget_estimate - p.spent_budget) as remaining_budget,
    -- Calculate allocation vs spending ratio
    CASE 
        WHEN p.allocated_budget > 0 THEN ROUND((p.spent_budget / p.allocated_budget) * 100, 2)
        ELSE 0 
    END as allocation_utilization_percent,
    -- Calculate overall budget utilization
    CASE 
        WHEN p.budget_estimate > 0 THEN ROUND((p.spent_budget / p.budget_estimate) * 100, 2)
        ELSE 0 
    END as budget_utilization_percent,
    -- Status indicators
    CASE 
        WHEN p.spent_budget > p.budget_estimate THEN 'over_budget'
        WHEN p.allocated_budget > p.budget_estimate THEN 'over_allocated'
        WHEN p.available_budget < (p.budget_estimate * 0.1) THEN 'low_available'
        ELSE 'healthy'
    END as budget_status
FROM projects p;

-- 8. Success message
SELECT 'Project budget allocation system fixed successfully!' as status;
SELECT 'Projects now properly track: allocated_budget, available_budget, spent_budget' as feature;
SELECT 'Triggers automatically update budget tracking' as automation;
