-- Enhanced Invoice System for Category-Based Invoices
-- This script extends the existing invoice system to support category assignments

-- Add category assignment reference to invoices table
DO $$
BEGIN
    -- Add new columns to invoices table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'category_assignment_id') THEN
        ALTER TABLE invoices ADD COLUMN category_assignment_id UUID REFERENCES project_category_assignments(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'category_name') THEN
        ALTER TABLE invoices ADD COLUMN category_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'subcategory_name') THEN
        ALTER TABLE invoices ADD COLUMN subcategory_name VARCHAR(200);
    END IF;
END $$;

-- Create index for category assignment lookup
CREATE INDEX IF NOT EXISTS idx_invoices_category_assignment ON invoices(category_assignment_id);

-- Add invoice status to project category assignments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_category_assignments' AND column_name = 'has_approved_invoice') THEN
        ALTER TABLE project_category_assignments ADD COLUMN has_approved_invoice BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_category_assignments' AND column_name = 'invoice_count') THEN
        ALTER TABLE project_category_assignments ADD COLUMN invoice_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_category_assignments' AND column_name = 'last_invoice_date') THEN
        ALTER TABLE project_category_assignments ADD COLUMN last_invoice_date DATE;
    END IF;
END $$;

-- Create function to update category assignment status when invoice is approved
CREATE OR REPLACE FUNCTION update_category_assignment_on_invoice_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is approved or paid, update the category assignment
    IF NEW.status IN ('approved', 'paid') AND OLD.status = 'pending_approval' THEN
        UPDATE project_category_assignments 
        SET 
            has_approved_invoice = TRUE,
            invoice_count = invoice_count + 1,
            last_invoice_date = NEW.date,
            actual_amount = COALESCE(actual_amount, 0) + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.category_assignment_id;
    END IF;
    
    -- When invoice is rejected, don't update category assignment
    -- This allows for re-submission
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice approval
DROP TRIGGER IF EXISTS trg_invoice_approval_update_category ON invoices;
CREATE TRIGGER trg_invoice_approval_update_category
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_category_assignment_on_invoice_approval();

-- Create view for category invoice status
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
    pca.status as assignment_status,
    CASE 
        WHEN pca.has_approved_invoice THEN 'locked'
        ELSE 'editable'
    END as edit_status,
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
    pca.status;

-- Create function to prevent editing of approved category assignments
CREATE OR REPLACE FUNCTION prevent_approved_category_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent editing if category has approved invoices
    IF OLD.has_approved_invoice = TRUE THEN
        RAISE EXCEPTION 'Cannot edit category assignment with approved invoices. Assignment ID: %', OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent editing approved categories
DROP TRIGGER IF EXISTS trg_prevent_approved_category_edit ON project_category_assignments;
CREATE TRIGGER trg_prevent_approved_category_edit
    BEFORE UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_approved_category_edit();

-- Add comment for documentation
COMMENT ON COLUMN invoices.category_assignment_id IS 'Links invoice to specific project category assignment';
COMMENT ON COLUMN project_category_assignments.has_approved_invoice IS 'Prevents editing when TRUE - financial protection';
COMMENT ON VIEW category_invoice_status IS 'Comprehensive view of category assignment invoice status for UI';