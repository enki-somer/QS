-- FIX: Invoice Approval Trigger Logic (Simple Version)
-- This script fixes the database trigger conflicts that prevent multiple invoices per assignment

-- 1. DROP EXISTING PROBLEMATIC TRIGGER
DROP TRIGGER IF EXISTS trg_prevent_approved_category_edit ON project_category_assignments;

-- 2. CREATE SMARTER ASSIGNMENT PROTECTION FUNCTION
CREATE OR REPLACE FUNCTION prevent_user_category_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only prevent editing of critical business fields when assignment has approved invoices
    -- Allow system updates for invoice tracking (actual_amount, invoice_count, etc.)
    
    IF OLD.has_approved_invoice = TRUE THEN
        -- Check if critical business fields are being changed (user edits)
        IF (OLD.contractor_id IS DISTINCT FROM NEW.contractor_id) OR 
           (OLD.main_category IS DISTINCT FROM NEW.main_category) OR 
           (OLD.subcategory IS DISTINCT FROM NEW.subcategory) OR 
           (OLD.estimated_amount != NEW.estimated_amount) THEN
            RAISE EXCEPTION 'Cannot edit contractor, category, or budget for assignment with approved invoices. Assignment ID: %', OLD.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CREATE NEW SMART TRIGGER
CREATE TRIGGER trg_prevent_user_category_edit
    BEFORE UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_category_edit();

-- 4. ADD BUDGET EXHAUSTION COLUMN
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_category_assignments' AND column_name = 'budget_exhausted') THEN
        ALTER TABLE project_category_assignments ADD COLUMN budget_exhausted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 5. ENHANCED INVOICE APPROVAL TRIGGER
CREATE OR REPLACE FUNCTION update_category_assignment_on_invoice_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is approved or paid, update the category assignment
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_invoice_approval_update_category ON invoices;
CREATE TRIGGER trg_invoice_approval_update_category
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_category_assignment_on_invoice_approval();

-- 6. SUCCESS MESSAGES
SELECT 'Invoice trigger logic fixed successfully!' as status;
SELECT 'Assignments now support multiple invoices until budget exhausted' as feature;
SELECT 'Critical fields still protected from user edits' as protection;
SELECT 'System ready for unlimited invoices per assignment' as ready;