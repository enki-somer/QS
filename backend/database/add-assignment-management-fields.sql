-- Add assignment management fields to project_category_assignments table
-- This enables freeze, delete, and edit functionality with smart budget recalculation

-- Add status and audit fields
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP;
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS frozen_by UUID REFERENCES users(id);
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

-- Add budget return tracking
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS returned_budget DECIMAL(15,2) DEFAULT 0;
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS budget_return_date TIMESTAMP;
ALTER TABLE project_category_assignments ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15,2);

-- Update existing records to set original_amount and ensure valid status
UPDATE project_category_assignments 
SET original_amount = estimated_amount 
WHERE original_amount IS NULL;

-- Update any invalid status values to 'active'
UPDATE project_category_assignments 
SET status = 'active' 
WHERE status NOT IN ('active', 'frozen', 'cancelled') OR status IS NULL;

-- Add constraints
ALTER TABLE project_category_assignments ADD CONSTRAINT check_status 
    CHECK (status IN ('active', 'frozen', 'cancelled'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_status ON project_category_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_frozen_by ON project_category_assignments(frozen_by);
CREATE INDEX IF NOT EXISTS idx_assignments_budget_return_date ON project_category_assignments(budget_return_date);

-- Create function for smart budget recalculation
CREATE OR REPLACE FUNCTION recalculate_assignment_budget(
  assignment_id UUID,
  new_status VARCHAR(20),
  new_amount DECIMAL(15,2) DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  user_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  assignment_record RECORD;
  spent_amount DECIMAL(15,2);
  return_amount DECIMAL(15,2);
  result JSON;
  project_budget_before DECIMAL(15,2);
  project_budget_after DECIMAL(15,2);
BEGIN
  -- Get assignment details
  SELECT * INTO assignment_record
  FROM project_category_assignments
  WHERE id = assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- Get project budget before changes
  SELECT available_budget INTO project_budget_before
  FROM projects WHERE id = assignment_record.project_id;

  -- Calculate spent amount from approved invoices
  SELECT COALESCE(SUM(amount), 0) INTO spent_amount
  FROM invoices
  WHERE category_assignment_id = assignment_id
  AND status = 'approved';

  -- Calculate return amount based on operation
  IF new_status = 'frozen' OR new_status = 'cancelled' THEN
    -- Return unused budget (original amount - spent amount)
    return_amount := assignment_record.estimated_amount - spent_amount;
  ELSIF new_amount IS NOT NULL THEN
    -- Return difference between old and new amount (if reducing)
    return_amount := assignment_record.estimated_amount - new_amount;
    -- If increasing, return_amount will be negative (taking from project budget)
  ELSE
    return_amount := 0;
  END IF;

  -- Prevent negative project budget
  IF (project_budget_before + return_amount) < 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient project budget',
      'userMessage', 'لا يوجد رصيد كافي في المشروع لهذه العملية'
    );
  END IF;

  -- Update project budget
  UPDATE projects
  SET available_budget = available_budget + return_amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = assignment_record.project_id;

  -- Get updated project budget
  SELECT available_budget INTO project_budget_after
  FROM projects WHERE id = assignment_record.project_id;

  -- Update assignment based on operation
  IF new_status = 'frozen' THEN
    UPDATE project_category_assignments
    SET status = new_status,
        returned_budget = return_amount,
        budget_return_date = CURRENT_TIMESTAMP,
        frozen_at = CURRENT_TIMESTAMP,
        frozen_by = user_id,
        freeze_reason = reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = assignment_id;
  ELSIF new_status = 'cancelled' THEN
    -- For deletion, we'll handle the actual deletion in the application
    UPDATE project_category_assignments
    SET status = new_status,
        returned_budget = return_amount,
        budget_return_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = assignment_id;
  ELSIF new_amount IS NOT NULL THEN
    -- Edit operation
    UPDATE project_category_assignments
    SET estimated_amount = new_amount,
        returned_budget = assignment_record.returned_budget + return_amount,
        budget_return_date = CASE WHEN return_amount != 0 THEN CURRENT_TIMESTAMP ELSE budget_return_date END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = assignment_id;
  END IF;

  -- Build result
  result := json_build_object(
    'success', true,
    'assignment_id', assignment_id,
    'old_amount', assignment_record.estimated_amount,
    'new_amount', COALESCE(new_amount, assignment_record.estimated_amount),
    'spent_amount', spent_amount,
    'returned_amount', return_amount,
    'project_budget_before', project_budget_before,
    'project_budget_after', project_budget_after,
    'operation', new_status,
    'timestamp', CURRENT_TIMESTAMP
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get assignment financial summary
CREATE OR REPLACE FUNCTION get_assignment_financial_summary(assignment_id UUID)
RETURNS JSON AS $$
DECLARE
  assignment_record RECORD;
  spent_amount DECIMAL(15,2);
  pending_amount DECIMAL(15,2);
  available_amount DECIMAL(15,2);
  result JSON;
BEGIN
  -- Get assignment details
  SELECT pca.*, c.full_name as contractor_full_name
  INTO assignment_record
  FROM project_category_assignments pca
  LEFT JOIN contractors c ON pca.contractor_id = c.id
  WHERE pca.id = assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- Calculate spent amount (approved invoices)
  SELECT COALESCE(SUM(amount), 0) INTO spent_amount
  FROM invoices
  WHERE category_assignment_id = assignment_id
  AND status = 'approved';

  -- Calculate pending amount (pending_approval invoices)
  SELECT COALESCE(SUM(amount), 0) INTO pending_amount
  FROM invoices
  WHERE category_assignment_id = assignment_id
  AND status = 'pending_approval';

  -- Calculate available amount
  available_amount := assignment_record.estimated_amount - spent_amount - pending_amount;

  result := json_build_object(
    'success', true,
    'assignment_id', assignment_id,
    'contractor_name', assignment_record.contractor_full_name,
    'category_name', assignment_record.main_category,
    'subcategory', assignment_record.subcategory,
    'status', assignment_record.status,
    'estimated_amount', assignment_record.estimated_amount,
    'original_amount', assignment_record.original_amount,
    'spent_amount', spent_amount,
    'pending_amount', pending_amount,
    'available_amount', available_amount,
    'returned_budget', assignment_record.returned_budget,
    'frozen_at', assignment_record.frozen_at,
    'freeze_reason', assignment_record.freeze_reason,
    'can_delete', CASE WHEN spent_amount = 0 AND pending_amount = 0 THEN true ELSE false END,
    'can_edit', CASE WHEN assignment_record.status = 'active' THEN true ELSE false END,
    'can_freeze', CASE WHEN assignment_record.status = 'active' THEN true ELSE false END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN project_category_assignments.status IS 'Assignment status: active, frozen, cancelled';
COMMENT ON COLUMN project_category_assignments.frozen_at IS 'Timestamp when assignment was frozen';
COMMENT ON COLUMN project_category_assignments.frozen_by IS 'User who froze the assignment';
COMMENT ON COLUMN project_category_assignments.freeze_reason IS 'Reason for freezing the assignment';
COMMENT ON COLUMN project_category_assignments.returned_budget IS 'Amount returned to project budget';
COMMENT ON COLUMN project_category_assignments.budget_return_date IS 'When budget was returned';
COMMENT ON COLUMN project_category_assignments.original_amount IS 'Original assignment amount before edits';

COMMENT ON FUNCTION recalculate_assignment_budget IS 'Smart budget recalculation for assignment operations';
COMMENT ON FUNCTION get_assignment_financial_summary IS 'Get comprehensive financial summary for an assignment';
