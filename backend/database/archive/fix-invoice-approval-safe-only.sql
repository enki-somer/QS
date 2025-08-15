-- Fix Invoice Approval Flow - Safe Deduction Only
-- This script ensures invoice approval only affects the safe balance
-- Project budget allocation is handled when assignments are created

-- 1. Update the invoice approval trigger to focus only on assignment tracking
CREATE OR REPLACE FUNCTION update_category_assignment_on_invoice_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is approved or paid, update the category assignment actual spending
    IF NEW.status IN ('approved', 'paid') AND OLD.status = 'pending_approval' THEN
        UPDATE project_category_assignments 
        SET 
            has_approved_invoice = TRUE,
            invoice_count = COALESCE(invoice_count, 0) + 1,
            last_invoice_date = NEW.date,
            actual_amount = COALESCE(actual_amount, 0) + NEW.amount,
            budget_exhausted = (COALESCE(actual_amount, 0) + NEW.amount >= estimated_amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.category_assignment_id;
        
        -- This will trigger the project spending update automatically via the existing trigger
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a separate function for safe deduction that should be called from the application
CREATE OR REPLACE FUNCTION deduct_from_safe_for_invoice(
    invoice_amount DECIMAL(15,2),
    project_id_param UUID,
    project_name_param VARCHAR(200),
    invoice_id_param UUID,
    invoice_number_param VARCHAR(50),
    user_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(15,2);
    new_balance DECIMAL(15,2);
BEGIN
    -- Get current safe balance
    SELECT current_balance INTO current_balance 
    FROM safe_state WHERE id = 1;
    
    -- Check if sufficient funds
    IF current_balance < invoice_amount THEN
        RAISE EXCEPTION 'Insufficient safe balance. Current: %, Required: %', current_balance, invoice_amount;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - invoice_amount;
    
    -- Insert safe transaction
    INSERT INTO safe_transactions (
        type, amount, description, date,
        project_id, project_name, invoice_id, invoice_number,
        previous_balance, new_balance, created_by
    ) VALUES (
        'invoice_payment',
        -invoice_amount, -- Negative for outflow
        'دفعة فاتورة للمشروع: ' || project_name_param,
        CURRENT_DATE,
        project_id_param,
        project_name_param,
        invoice_id_param,
        invoice_number_param,
        current_balance,
        new_balance,
        user_id_param
    );
    
    -- Update safe state
    UPDATE safe_state 
    SET 
        current_balance = new_balance,
        total_spent = total_spent + invoice_amount,
        last_updated = CURRENT_TIMESTAMP,
        updated_by = user_id_param
    WHERE id = 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to validate invoice against assignment budget
CREATE OR REPLACE FUNCTION validate_invoice_against_assignment(
    assignment_id_param UUID,
    invoice_amount_param DECIMAL(15,2)
) RETURNS TABLE (
    is_valid BOOLEAN,
    message TEXT,
    estimated_amount DECIMAL(15,2),
    actual_amount DECIMAL(15,2),
    remaining_budget DECIMAL(15,2)
) AS $$
DECLARE
    assignment_record RECORD;
    remaining DECIMAL(15,2);
BEGIN
    -- Get assignment details
    SELECT * INTO assignment_record
    FROM project_category_assignments 
    WHERE id = assignment_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Assignment not found', 0::DECIMAL(15,2), 0::DECIMAL(15,2), 0::DECIMAL(15,2);
        RETURN;
    END IF;
    
    -- Calculate remaining budget
    remaining := assignment_record.estimated_amount - COALESCE(assignment_record.actual_amount, 0);
    
    -- Check if invoice amount exceeds remaining budget
    IF invoice_amount_param > remaining THEN
        RETURN QUERY SELECT 
            FALSE, 
            'Invoice amount exceeds remaining assignment budget',
            assignment_record.estimated_amount,
            COALESCE(assignment_record.actual_amount, 0),
            remaining;
    ELSE
        RETURN QUERY SELECT 
            TRUE, 
            'Invoice amount is within budget',
            assignment_record.estimated_amount,
            COALESCE(assignment_record.actual_amount, 0),
            remaining;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create comprehensive financial flow view
CREATE OR REPLACE VIEW project_financial_flow AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.code as project_code,
    p.budget_estimate,
    p.allocated_budget,
    p.available_budget,
    p.spent_budget,
    -- Safe transactions for this project
    COALESCE(safe_totals.total_safe_deducted, 0) as total_safe_deducted,
    -- Assignment details
    assignment_totals.total_assignments,
    assignment_totals.total_estimated,
    assignment_totals.total_actual,
    assignment_totals.assignments_with_invoices,
    -- General expenses
    COALESCE(expense_totals.total_approved_expenses, 0) as total_approved_expenses,
    -- Validation flags
    CASE 
        WHEN p.spent_budget != COALESCE(safe_totals.total_safe_deducted, 0) THEN 'MISMATCH'
        ELSE 'OK'
    END as safe_spending_match,
    CASE 
        WHEN p.allocated_budget != COALESCE(assignment_totals.total_estimated, 0) THEN 'MISMATCH'
        ELSE 'OK'
    END as allocation_match
FROM projects p
LEFT JOIN (
    SELECT 
        project_id,
        SUM(ABS(amount)) as total_safe_deducted
    FROM safe_transactions 
    WHERE type IN ('invoice_payment', 'general_expense')
    GROUP BY project_id
) safe_totals ON p.id = safe_totals.project_id
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) as total_assignments,
        SUM(estimated_amount) as total_estimated,
        SUM(COALESCE(actual_amount, 0)) as total_actual,
        COUNT(CASE WHEN has_approved_invoice THEN 1 END) as assignments_with_invoices
    FROM project_category_assignments
    GROUP BY project_id
) assignment_totals ON p.id = assignment_totals.project_id
LEFT JOIN (
    SELECT 
        project_id,
        SUM(cost) as total_approved_expenses
    FROM general_expenses 
    WHERE status = 'approved'
    GROUP BY project_id
) expense_totals ON p.id = expense_totals.project_id;

-- 5. Success message
SELECT 'Invoice approval flow fixed - safe deduction only!' as status;
SELECT 'Project budget allocation handled separately from spending' as flow;
SELECT 'New validation functions available for budget checking' as validation;
