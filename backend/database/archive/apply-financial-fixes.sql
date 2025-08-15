-- Master Script: Apply All Financial Flow Fixes
-- This script applies all the fixes for the financial calculation issues
-- Run this script to fix the project budget allocation and spending tracking

-- 1. Apply project budget allocation fixes
\echo 'Applying project budget allocation fixes...'
\i backend/database/fix-project-budget-allocation.sql

-- 2. Apply invoice approval flow fixes  
\echo 'Applying invoice approval flow fixes...'
\i backend/database/fix-invoice-approval-safe-only.sql

-- 3. Apply the simplified invoice trigger fixes
\echo 'Applying invoice trigger fixes...'
\i backend/database/fix-invoice-trigger-simple.sql

-- 4. Ensure general expenses are properly handled
\echo 'Ensuring general expenses update project spending...'

-- Update the general expense approval trigger to work with new budget tracking
CREATE OR REPLACE FUNCTION update_project_spending_on_expense_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When general expense is approved, it should update project spent_budget
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- The existing update_project_spending() trigger will handle this
        -- Just ensure the trigger fires
        UPDATE projects 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for general expense approval
DROP TRIGGER IF EXISTS trg_update_project_spending_on_expense_approval ON general_expenses;
CREATE TRIGGER trg_update_project_spending_on_expense_approval
    AFTER UPDATE ON general_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending_on_expense_approval();

-- 5. Create a comprehensive view for financial monitoring
CREATE OR REPLACE VIEW financial_health_check AS
SELECT 
    p.id,
    p.name,
    p.code,
    -- Budget Overview
    p.budget_estimate as total_budget,
    p.allocated_budget,
    p.available_budget,
    p.spent_budget,
    -- Calculations
    ROUND((p.allocated_budget / NULLIF(p.budget_estimate, 0)) * 100, 2) as allocation_percentage,
    ROUND((p.spent_budget / NULLIF(p.budget_estimate, 0)) * 100, 2) as spending_percentage,
    -- Remaining budgets
    (p.budget_estimate - p.spent_budget) as remaining_total_budget,
    -- Assignment summary
    assignment_stats.total_assignments,
    assignment_stats.assignments_with_invoices,
    assignment_stats.total_invoice_amount,
    -- Safe transaction summary
    COALESCE(safe_stats.total_safe_deducted, 0) as total_safe_deducted,
    -- Health indicators
    CASE 
        WHEN p.spent_budget > p.budget_estimate THEN 'OVER_BUDGET'
        WHEN p.allocated_budget > p.budget_estimate THEN 'OVER_ALLOCATED'
        WHEN p.available_budget < (p.budget_estimate * 0.1) THEN 'LOW_AVAILABLE'
        WHEN p.spent_budget != COALESCE(safe_stats.total_safe_deducted, 0) THEN 'SAFE_MISMATCH'
        ELSE 'HEALTHY'
    END as health_status
FROM projects p
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN has_approved_invoice THEN 1 END) as assignments_with_invoices,
        SUM(COALESCE(actual_amount, 0)) as total_invoice_amount
    FROM project_category_assignments
    GROUP BY project_id
) assignment_stats ON p.id = assignment_stats.project_id
LEFT JOIN (
    SELECT 
        project_id,
        SUM(ABS(amount)) as total_safe_deducted
    FROM safe_transactions 
    WHERE type IN ('invoice_payment', 'general_expense')
    GROUP BY project_id
) safe_stats ON p.id = safe_stats.project_id;

-- 6. Create function to recalculate all project budgets (for data cleanup)
CREATE OR REPLACE FUNCTION recalculate_all_project_budgets()
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR(200),
    old_allocated DECIMAL(15,2),
    new_allocated DECIMAL(15,2),
    old_spent DECIMAL(15,2),
    new_spent DECIMAL(15,2)
) AS $$
BEGIN
    -- Store old values and update all projects
    RETURN QUERY
    WITH old_values AS (
        SELECT 
            p.id,
            p.name,
            p.allocated_budget as old_allocated,
            p.spent_budget as old_spent
        FROM projects p
    ),
    recalculated AS (
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
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        RETURNING 
            id,
            name,
            allocated_budget as new_allocated,
            spent_budget as new_spent
    )
    SELECT 
        ov.id,
        ov.name,
        ov.old_allocated,
        r.new_allocated,
        ov.old_spent,
        r.new_spent
    FROM old_values ov
    JOIN recalculated r ON ov.id = r.id;
END;
$$ LANGUAGE plpgsql;

-- 7. Apply the recalculation to fix existing data
SELECT 'Recalculating existing project budgets...' as status;
SELECT * FROM recalculate_all_project_budgets();

-- 8. Final verification
SELECT 'Financial flow fixes applied successfully!' as status;
SELECT 'Checking financial health of all projects...' as next_step;

-- Show financial health of all projects
SELECT * FROM financial_health_check ORDER BY name;

-- Show summary statistics
SELECT 
    'SUMMARY STATISTICS' as title,
    COUNT(*) as total_projects,
    SUM(total_budget) as total_budget_all_projects,
    SUM(allocated_budget) as total_allocated_all_projects,
    SUM(spent_budget) as total_spent_all_projects,
    COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END) as healthy_projects,
    COUNT(CASE WHEN health_status != 'HEALTHY' THEN 1 END) as projects_needing_attention
FROM financial_health_check;

\echo 'All financial flow fixes have been applied!'
\echo 'The system now properly tracks:'
\echo '1. Project budget allocation (when assignments are created)'
\echo '2. Project spending (when invoices/expenses are approved)'
\echo '3. Safe balance (only affected by actual payments)'
\echo '4. Remaining budgets (calculated correctly)'
