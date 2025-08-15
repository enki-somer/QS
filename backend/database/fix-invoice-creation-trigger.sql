-- ========================================
-- FIX: Allow Invoice Creation for Approved Assignments
-- ========================================
-- The current trigger prevents ALL updates to assignments with approved invoices,
-- but we need to allow system updates for invoice tracking while still preventing user edits

-- 1. Replace the strict trigger with a smarter one
DROP TRIGGER IF EXISTS trg_prevent_approved_category_edit ON project_category_assignments;
DROP FUNCTION IF EXISTS prevent_approved_category_edit();

-- 2. Create a smarter function that allows system updates
CREATE OR REPLACE FUNCTION prevent_user_category_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only prevent editing of critical business fields when assignment has approved invoices
    -- Allow system updates for invoice tracking (invoice_count, actual_amount, updated_at)
    
    IF OLD.has_approved_invoice = TRUE THEN
        -- Check if critical business fields are being changed (user edits)
        IF (OLD.contractor_id IS DISTINCT FROM NEW.contractor_id) OR 
           (OLD.main_category IS DISTINCT FROM NEW.main_category) OR 
           (OLD.subcategory IS DISTINCT FROM NEW.subcategory) OR 
           (OLD.estimated_amount != NEW.estimated_amount) OR
           (OLD.contractor_name IS DISTINCT FROM NEW.contractor_name) THEN
            RAISE EXCEPTION 'Cannot edit contractor, category, or budget for assignment with approved invoices. Assignment ID: %', OLD.id;
        END IF;
        
        -- Allow system updates for:
        -- - invoice_count (invoice tracking)
        -- - actual_amount (invoice approval tracking) 
        -- - updated_at (system timestamp)
        -- - notes (admin can still add notes)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the new smart trigger
CREATE TRIGGER trg_prevent_user_category_edit
    BEFORE UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_category_edit();

-- 4. Add documentation
COMMENT ON FUNCTION prevent_user_category_edit() IS 'SMART: Prevents user edits but allows system updates for invoice tracking';
COMMENT ON TRIGGER trg_prevent_user_category_edit ON project_category_assignments IS 'SMART: Protects business fields while allowing system updates';

SELECT 'Smart invoice protection system updated!' as status;
SELECT 'Invoice creation now allowed for assignments with approved invoices!' as result;
