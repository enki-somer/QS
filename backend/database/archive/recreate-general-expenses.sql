-- Drop and recreate general_expenses table with correct schema

-- First, check if there are any foreign key references and handle them
-- Check safe_transactions reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'safe_transactions_expense_id_fkey') THEN
        ALTER TABLE safe_transactions DROP CONSTRAINT safe_transactions_expense_id_fkey;
    END IF;
END $$;

-- Drop the existing table
DROP TABLE IF EXISTS general_expenses CASCADE;

-- Drop existing enum type if it exists
DROP TYPE IF EXISTS expense_status CASCADE;

-- Create general_expenses table with correct schema
CREATE TABLE general_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  cost DECIMAL(15,2) NOT NULL CHECK (cost >= 0),
  details TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_general_expenses_project_id ON general_expenses(project_id);
CREATE INDEX idx_general_expenses_status ON general_expenses(status);
CREATE INDEX idx_general_expenses_expense_date ON general_expenses(expense_date);
CREATE INDEX idx_general_expenses_created_at ON general_expenses(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_general_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_general_expenses_updated_at
  BEFORE UPDATE ON general_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_general_expenses_updated_at();

-- Create trigger to automatically set approved_at when status changes to approved
CREATE OR REPLACE FUNCTION set_general_expense_approval_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing to approved, set approved_at
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.approved_at = CURRENT_TIMESTAMP;
  END IF;
  
  -- If status is changing away from approved, clear approved_at
  IF NEW.status != 'approved' AND OLD.status = 'approved' THEN
    NEW.approved_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_general_expense_approval_timestamp
  BEFORE UPDATE ON general_expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_general_expense_approval_timestamp();

-- Add comments for documentation
COMMENT ON TABLE general_expenses IS 'Stores general expenses for projects that are deducted directly from project budget';
COMMENT ON COLUMN general_expenses.expense_name IS 'Name/description of the expense (e.g., Office supplies, Fuel, Tools)';
COMMENT ON COLUMN general_expenses.cost IS 'Cost of the expense in Iraqi Dinars';
COMMENT ON COLUMN general_expenses.details IS 'Additional details about the expense';
COMMENT ON COLUMN general_expenses.expense_date IS 'Date when the expense occurred';
COMMENT ON COLUMN general_expenses.status IS 'Approval status: pending, approved, or rejected';
COMMENT ON COLUMN general_expenses.approved_by IS 'User who approved the expense';
COMMENT ON COLUMN general_expenses.approved_at IS 'Timestamp when the expense was approved';