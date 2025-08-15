-- FIX: Invoice Approval Trigger Logic
-- This script fixes the database trigger conflicts that prevent multiple invoices per assignment

-- ====================================
-- 1. DROP EXISTING PROBLEMATIC TRIGGER
-- ====================================

DROP TRIGGER IF EXISTS trg_prevent_approved_category_edit ON project_category_assignments;

-- ====================================
-- 2. CREATE SMARTER ASSIGNMENT PROTECTION FUNCTION
-- ====================================

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
        
        -- Allow system updates for:
        -- - actual_amount (invoice tracking)
        -- - invoice_count (invoice tracking) 
        -- - last_invoice_date (invoice tracking)
        -- - updated_at (system timestamp)
        -- - notes (admin can still add notes)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- 3. CREATE NEW SMART TRIGGER
-- ====================================

CREATE TRIGGER trg_prevent_user_category_edit
    BEFORE UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_category_edit();

-- ====================================
-- 4. UPDATE TRIGGER COMMENTS
-- ====================================

COMMENT ON FUNCTION prevent_user_category_edit() IS 'Prevents user edits of critical fields but allows system updates for invoice tracking';
COMMENT ON COLUMN project_category_assignments.has_approved_invoice IS 'Indicates assignment has approved invoices - protects business fields only';

-- ====================================
-- 5. ADD BUDGET EXHAUSTION LOGIC
-- ====================================

-- Add column to track if assignment budget is fully exhausted
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_category_assignments' AND column_name = 'budget_exhausted') THEN
        ALTER TABLE project_category_assignments ADD COLUMN budget_exhausted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ====================================
-- 6. ENHANCED INVOICE APPROVAL TRIGGER
-- ====================================

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
        
        -- Log the update for debugging
        RAISE NOTICE 'Updated assignment % - new actual_amount: %, estimated_amount: %', 
            NEW.category_assignment_id, 
            (SELECT COALESCE(actual_amount, 0) + NEW.amount FROM project_category_assignments WHERE id = NEW.category_assignment_id),
            (SELECT estimated_amount FROM project_category_assignments WHERE id = NEW.category_assignment_id);
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

-- ====================================
-- 7. UPDATE VIEW FOR BUDGET STATUS
-- ====================================

CREATE OR REPLACE VIEW category_invoice_status AS
SELECT 
    pca.id as assignment_id,
    pca.project_id,
    pca.main_category,
    pca.subcategory,
    pca.contractor_name,
    pca.estimated_amount,
    pca.actual_amount,
    pca.has_approved_invoice,
    pca.invoice_count,
    pca.last_invoice_date,
    pca.budget_exhausted,
    pca.status as assignment_status,
    CASE 
        WHEN pca.budget_exhausted THEN 'budget_exhausted'
        WHEN pca.has_approved_invoice THEN 'has_invoices'
        ELSE 'available'
    END as availability_status,
    CASE 
        WHEN pca.budget_exhausted THEN 'locked'
        ELSE 'editable'
    END as edit_status,
    (pca.estimated_amount - COALESCE(pca.actual_amount, 0)) as remaining_budget,
    COUNT(i.id) as total_invoices,
    SUM(CASE WHEN i.status = 'pending_approval' THEN 1 ELSE 0 END) as pending_invoices,
    SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved_invoices,
    SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
    SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected_invoices
FROM project_category_assignments pca
LEFT JOIN invoices i ON pca.id = i.category_assignment_id
GROUP BY 
    pca.id, pca.project_id, pca.main_category, pca.subcategory, 
    pca.contractor_name, pca.estimated_amount, pca.actual_amount, 
    pca.has_approved_invoice, pca.invoice_count, pca.last_invoice_date, 
    pca.budget_exhausted, pca.status;

COMMENT ON VIEW category_invoice_status IS 'Enhanced view showing budget status and invoice availability for assignments';

-- ====================================
-- 8. SUCCESS MESSAGE
-- ====================================

DO $$
BEGIN
    RAISE NOTICE '✅ Invoice trigger logic fixed successfully!';
    RAISE NOTICE '🔄 Assignments now support multiple invoices until budget exhausted';
    RAISE NOTICE '🛡️ Critical fields still protected from user edits';
    RAISE NOTICE '📊 Added budget_exhausted tracking for better UX';
    RAISE NOTICE '🎯 System ready for unlimited invoices per assignment';
END $$;