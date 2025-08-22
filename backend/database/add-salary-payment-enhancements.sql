-- Add enhanced salary payment fields to employee_salary_payments table
-- This script adds support for installment payments and better tracking

-- Add new columns to employee_salary_payments table
ALTER TABLE employee_salary_payments 
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'full',
ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS is_full_payment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have default values
UPDATE employee_salary_payments 
SET payment_type = 'full', 
    is_full_payment = true,
    payment_date = created_at
WHERE payment_type IS NULL;

-- Add check constraint for payment_type
ALTER TABLE employee_salary_payments 
ADD CONSTRAINT chk_payment_type 
CHECK (payment_type IN ('full', 'installment'));

-- Create index for better performance on payment queries
CREATE INDEX IF NOT EXISTS idx_employee_salary_payments_employee_date 
ON employee_salary_payments(employee_id, payment_date DESC);

-- Create index for payment type queries
CREATE INDEX IF NOT EXISTS idx_employee_salary_payments_type 
ON employee_salary_payments(payment_type);

-- Add comment to table
COMMENT ON TABLE employee_salary_payments IS 'Enhanced salary payment tracking with installment support';
COMMENT ON COLUMN employee_salary_payments.payment_type IS 'Type of payment: full or installment';
COMMENT ON COLUMN employee_salary_payments.installment_amount IS 'Original installment amount if payment_type is installment';
COMMENT ON COLUMN employee_salary_payments.is_full_payment IS 'Whether this payment completes the salary obligation';
COMMENT ON COLUMN employee_salary_payments.payment_date IS 'Actual date when payment was processed';

-- Display current table structure
\d employee_salary_payments;

-- Test query to verify structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'employee_salary_payments' 
ORDER BY ordinal_position;






