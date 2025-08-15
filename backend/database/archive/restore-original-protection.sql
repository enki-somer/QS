-- ========================================
-- RESTORE ORIGINAL STRICT INVOICE PROTECTION
-- ========================================
-- This restores the original working system that completely
-- prevented ANY editing of assignments with approved invoices

-- 1. Remove the "smart" trigger that was causing issues
DROP TRIGGER IF EXISTS trg_prevent_user_category_edit ON project_category_assignments;
DROP FUNCTION IF EXISTS prevent_user_category_edit();

-- 2. Restore the original STRICT protection function
CREATE OR REPLACE FUNCTION prevent_approved_category_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent ANY editing if category has approved invoices
    -- This is the original strict protection that was working perfectly
    IF OLD.has_approved_invoice = TRUE THEN
        RAISE EXCEPTION 'Cannot edit category assignment with approved invoices. Assignment ID: %', OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Restore the original STRICT trigger
DROP TRIGGER IF EXISTS trg_prevent_approved_category_edit ON project_category_assignments;
CREATE TRIGGER trg_prevent_approved_category_edit
    BEFORE UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_approved_category_edit();

-- 4. Add documentation
COMMENT ON FUNCTION prevent_approved_category_edit() IS 'STRICT: Prevents ANY editing of assignments with approved invoices - original working system';
COMMENT ON TRIGGER trg_prevent_approved_category_edit ON project_category_assignments IS 'STRICT: Complete protection against editing approved assignments';

SELECT 'Original strict invoice protection system restored!' as status;
SELECT 'Assignments with approved invoices are now completely protected from editing!' as protection;
