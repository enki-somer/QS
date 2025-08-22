-- ========================================
-- HR MANAGEMENT SYSTEM - DATABASE SCHEMA ENHANCEMENT
-- قصر الشام للمقاولات العامة والإنشاءات
-- 
-- This script extends the existing employees table with comprehensive
-- HR management fields for salary tracking, installment management,
-- and automated payment notifications.
-- 
-- Created: 2025-01-15
-- Chunk: 1 - Database Schema Enhancement
-- ========================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- 1. ENHANCE EXISTING EMPLOYEES TABLE
-- ====================================

-- Add new columns to existing employees table for HR management
ALTER TABLE employees ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 16 AND age <= 70);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(15,2) DEFAULT 0 CHECK (monthly_salary >= 0);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_installments DECIMAL(15,2) DEFAULT 0 CHECK (salary_installments >= 0);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS remaining_installments INTEGER DEFAULT 0 CHECK (remaining_installments >= 0);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS next_payment_due DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'current' CHECK (payment_status IN ('current', 'warning', 'due', 'installment'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS installment_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_paid DECIMAL(15,2) DEFAULT 0 CHECK (total_paid >= 0);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]';

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_employees_payment_status ON employees(payment_status);
CREATE INDEX IF NOT EXISTS idx_employees_next_payment_due ON employees(next_payment_due);
CREATE INDEX IF NOT EXISTS idx_employees_mobile_number ON employees(mobile_number);
CREATE INDEX IF NOT EXISTS idx_employees_monthly_salary ON employees(monthly_salary);

-- ====================================
-- 2. SALARY PAYMENT TRACKING TABLE
-- ====================================

-- Create comprehensive salary payment tracking table
CREATE TABLE IF NOT EXISTS employee_salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payment_amount DECIMAL(15,2) NOT NULL CHECK (payment_amount > 0),
    installment_amount DECIMAL(15,2) DEFAULT 0 CHECK (installment_amount >= 0),
    payment_type VARCHAR(20) DEFAULT 'full' CHECK (payment_type IN ('full', 'installment', 'advance', 'bonus', 'deduction')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    notes TEXT,
    safe_transaction_id UUID, -- Link to safe transaction for audit trail
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one payment per employee per month for full payments
    CONSTRAINT unique_employee_month_full_payment 
        EXCLUDE (employee_id WITH =, month_year WITH =) 
        WHERE (payment_type = 'full')
);

-- Add indexes for salary payments table
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON employee_salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON employee_salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month_year ON employee_salary_payments(month_year);
CREATE INDEX IF NOT EXISTS idx_salary_payments_type ON employee_salary_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_salary_payments_safe_transaction ON employee_salary_payments(safe_transaction_id);

-- ====================================
-- 3. POSITIONS MANAGEMENT TABLE
-- ====================================

-- Create positions table for standardized job positions
CREATE TABLE IF NOT EXISTS employee_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_name VARCHAR(100) NOT NULL UNIQUE,
    position_name_ar VARCHAR(100) NOT NULL UNIQUE, -- Arabic name
    description TEXT,
    description_ar TEXT, -- Arabic description
    base_salary_range_min DECIMAL(15,2) DEFAULT 0,
    base_salary_range_max DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_salary_range CHECK (base_salary_range_max >= base_salary_range_min)
);

-- Insert common positions for construction company
INSERT INTO employee_positions (position_name, position_name_ar, description_ar, base_salary_range_min, base_salary_range_max) VALUES
('Site Manager', 'مدير موقع', 'مسؤول عن إدارة وتنسيق أعمال الموقع', 800000, 1200000),
('Construction Engineer', 'مهندس إنشائي', 'مهندس متخصص في الأعمال الإنشائية والتنفيذية', 600000, 900000),
('Foreman', 'رئيس عمال', 'مشرف على العمال وتنفيذ المهام اليومية', 400000, 600000),
('Electrician', 'كهربائي', 'متخصص في الأعمال الكهربائية', 350000, 550000),
('Plumber', 'سباك', 'متخصص في أعمال السباكة والصحيات', 300000, 500000),
('Mason', 'بناء', 'عامل متخصص في أعمال البناء والبلوك', 250000, 400000),
('Painter', 'دهان', 'متخصص في أعمال الدهان والتشطيب', 250000, 400000),
('Carpenter', 'نجار', 'متخصص في أعمال النجارة والخشب', 300000, 450000),
('Heavy Equipment Operator', 'سائق معدات ثقيلة', 'سائق ومشغل المعدات الثقيلة', 400000, 600000),
('Security Guard', 'حارس أمن', 'مسؤول عن أمن الموقع', 200000, 300000),
('Administrative Assistant', 'مساعد إداري', 'مسؤول عن الأعمال الإدارية والمكتبية', 300000, 450000),
('Accountant', 'محاسب', 'مسؤول عن الحسابات والأمور المالية', 500000, 750000)
ON CONFLICT (position_name) DO NOTHING;

-- Add indexes for positions table
CREATE INDEX IF NOT EXISTS idx_positions_name ON employee_positions(position_name);
CREATE INDEX IF NOT EXISTS idx_positions_name_ar ON employee_positions(position_name_ar);
CREATE INDEX IF NOT EXISTS idx_positions_active ON employee_positions(is_active);

-- ====================================
-- 4. DATABASE FUNCTIONS FOR AUTOMATION
-- ====================================

-- Function to calculate next payment due date
CREATE OR REPLACE FUNCTION calculate_next_payment_due(employee_id UUID)
RETURNS DATE AS $$
DECLARE
    last_payment DATE;
    next_due DATE;
BEGIN
    -- Get the most recent payment date for this employee
    SELECT MAX(payment_date) INTO last_payment 
    FROM employee_salary_payments 
    WHERE employee_salary_payments.employee_id = calculate_next_payment_due.employee_id
    AND payment_type IN ('full', 'installment');
    
    -- If no payment history, use hire date or current date
    IF last_payment IS NULL THEN
        SELECT COALESCE(hire_date, CURRENT_DATE) INTO last_payment
        FROM employees 
        WHERE id = calculate_next_payment_due.employee_id;
    END IF;
    
    -- Calculate next due date (30 days from last payment)
    next_due := last_payment + INTERVAL '30 days';
    
    RETURN next_due;
END;
$$ LANGUAGE plpgsql;

-- Function to update employee payment status automatically
CREATE OR REPLACE FUNCTION update_employee_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update next payment due date
    NEW.next_payment_due := calculate_next_payment_due(NEW.id);
    
    -- Update payment status based on due date and installment status
    IF NEW.remaining_installments > 0 THEN
        NEW.payment_status := 'installment';
    ELSIF NEW.next_payment_due <= CURRENT_DATE THEN
        NEW.payment_status := 'due';
    ELSIF NEW.next_payment_due <= CURRENT_DATE + INTERVAL '7 days' THEN
        NEW.payment_status := 'warning';
    ELSE
        NEW.payment_status := 'current';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to process salary payment and update employee record
CREATE OR REPLACE FUNCTION process_salary_payment(
    p_employee_id UUID,
    p_payment_amount DECIMAL(15,2),
    p_installment_amount DECIMAL(15,2) DEFAULT 0,
    p_payment_type VARCHAR(20) DEFAULT 'full',
    p_month_year VARCHAR(7) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_safe_transaction_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    payment_id UUID;
    current_month_year VARCHAR(7);
BEGIN
    -- Generate month_year if not provided
    IF p_month_year IS NULL THEN
        current_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    ELSE
        current_month_year := p_month_year;
    END IF;
    
    -- Insert payment record
    INSERT INTO employee_salary_payments (
        employee_id, payment_amount, installment_amount, payment_type,
        payment_date, month_year, notes, safe_transaction_id, created_by
    ) VALUES (
        p_employee_id, p_payment_amount, p_installment_amount, p_payment_type,
        CURRENT_DATE, current_month_year, p_notes, p_safe_transaction_id, p_created_by
    ) RETURNING id INTO payment_id;
    
    -- Update employee record
    UPDATE employees SET
        last_payment_date = CURRENT_DATE,
        total_paid = total_paid + p_payment_amount,
        remaining_installments = CASE 
            WHEN p_payment_type = 'installment' AND remaining_installments > 0 
            THEN remaining_installments - 1 
            ELSE remaining_installments 
        END,
        payment_history = payment_history || jsonb_build_object(
            'payment_id', payment_id,
            'amount', p_payment_amount,
            'date', CURRENT_DATE,
            'type', p_payment_type
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_employee_id;
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to setup installment plan for employee
CREATE OR REPLACE FUNCTION setup_installment_plan(
    p_employee_id UUID,
    p_installment_amount DECIMAL(15,2),
    p_number_of_installments INTEGER,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate inputs
    IF p_installment_amount <= 0 OR p_number_of_installments <= 0 THEN
        RAISE EXCEPTION 'Invalid installment parameters';
    END IF;
    
    -- Update employee with installment plan
    UPDATE employees SET
        salary_installments = p_installment_amount,
        remaining_installments = p_number_of_installments,
        installment_reason = p_reason,
        payment_status = 'installment',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_employee_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get employees due for payment
CREATE OR REPLACE FUNCTION get_employees_due_for_payment()
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(150),
    position VARCHAR(100),
    monthly_salary DECIMAL(15,2),
    payment_status VARCHAR(20),
    next_payment_due DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e."position",
        e.monthly_salary,
        e.payment_status,
        e.next_payment_due,
        CASE 
            WHEN e.next_payment_due < CURRENT_DATE 
            THEN EXTRACT(DAY FROM CURRENT_DATE - e.next_payment_due)::INTEGER
            ELSE 0
        END as days_overdue
    FROM employees e
    WHERE e.status = 'active'
    AND (e.payment_status IN ('due', 'warning') OR e.next_payment_due <= CURRENT_DATE + INTERVAL '7 days')
    ORDER BY e.next_payment_due ASC, e.name ASC;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- 5. TRIGGERS FOR AUTOMATION
-- ====================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS employee_payment_status_trigger ON employees;

-- Create trigger for automatic payment status updates
CREATE TRIGGER employee_payment_status_trigger
    BEFORE INSERT OR UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_payment_status();

-- Trigger to update employee record when payment is made
CREATE OR REPLACE FUNCTION update_employee_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update employee's last payment date and total paid
    UPDATE employees SET
        last_payment_date = NEW.payment_date,
        total_paid = total_paid + NEW.payment_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.employee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment updates
DROP TRIGGER IF EXISTS update_employee_on_payment_trigger ON employee_salary_payments;
CREATE TRIGGER update_employee_on_payment_trigger
    AFTER INSERT ON employee_salary_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_on_payment();

-- ====================================
-- 6. VIEWS FOR REPORTING
-- ====================================

-- View for employee financial summary
CREATE OR REPLACE VIEW employee_financial_summary AS
SELECT 
    e.id,
    e.name,
    e."position",
    e.monthly_salary,
    e.total_paid,
    e.payment_status,
    e.next_payment_due,
    e.remaining_installments,
    e.salary_installments,
    COALESCE(recent_payments.payments_this_year, 0) as payments_this_year,
    COALESCE(recent_payments.last_payment_amount, 0) as last_payment_amount,
    recent_payments.last_payment_date,
    CASE 
        WHEN e.next_payment_due < CURRENT_DATE 
        THEN EXTRACT(DAY FROM CURRENT_DATE - e.next_payment_due)::INTEGER
        ELSE 0
    END as days_overdue
FROM employees e
LEFT JOIN (
    SELECT 
        employee_id,
        SUM(payment_amount) as payments_this_year,
        MAX(payment_amount) as last_payment_amount,
        MAX(payment_date) as last_payment_date
    FROM employee_salary_payments
    WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY employee_id
) recent_payments ON e.id = recent_payments.employee_id
WHERE e.status = 'active';

-- View for payroll summary by month
CREATE OR REPLACE VIEW monthly_payroll_summary AS
SELECT 
    month_year,
    COUNT(DISTINCT employee_id) as employees_paid,
    SUM(payment_amount) as total_paid,
    AVG(payment_amount) as average_payment,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN payment_type = 'installment' THEN 1 END) as installment_payments
FROM employee_salary_payments
GROUP BY month_year
ORDER BY month_year DESC;

-- ====================================
-- 7. SAMPLE DATA FOR TESTING (Optional)
-- ====================================

-- Update existing employees with sample HR data (if any exist)
-- This is optional and can be removed in production
DO $$
DECLARE
    emp_record RECORD;
BEGIN
    -- Only update if there are existing employees without HR data
    FOR emp_record IN 
        SELECT id, name FROM employees 
        WHERE monthly_salary IS NULL OR monthly_salary = 0
        LIMIT 5
    LOOP
        UPDATE employees SET
            mobile_number = '07' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
            age = 25 + FLOOR(RANDOM() * 20)::INTEGER,
            monthly_salary = 300000 + FLOOR(RANDOM() * 500000),
            payment_status = 'current',
            next_payment_due = CURRENT_DATE + INTERVAL '30 days'
        WHERE id = emp_record.id;
    END LOOP;
END $$;

-- ====================================
-- 8. COMMENTS AND DOCUMENTATION
-- ====================================

-- Add comments to tables and columns for documentation
COMMENT ON TABLE employee_salary_payments IS 'Tracks all salary payments made to employees with full audit trail';
COMMENT ON TABLE employee_positions IS 'Standardized job positions with salary ranges for the construction company';

COMMENT ON COLUMN employees.mobile_number IS 'Employee mobile phone number for contact';
COMMENT ON COLUMN employees.age IS 'Employee age (16-70 years)';
COMMENT ON COLUMN employees.monthly_salary IS 'Base monthly salary amount';
COMMENT ON COLUMN employees.salary_installments IS 'Monthly installment amount if on payment plan';
COMMENT ON COLUMN employees.remaining_installments IS 'Number of remaining installment payments';
COMMENT ON COLUMN employees.payment_status IS 'Current payment status: current, warning, due, installment';
COMMENT ON COLUMN employees.next_payment_due IS 'Date when next salary payment is due';
COMMENT ON COLUMN employees.total_paid IS 'Total amount paid to employee to date';
COMMENT ON COLUMN employees.payment_history IS 'JSON array of payment history for quick access';

-- ====================================
-- SCHEMA ENHANCEMENT COMPLETE
-- ====================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '✅ HR Management Schema Enhancement Complete!';
    RAISE NOTICE '📊 Tables Enhanced: employees, employee_salary_payments, employee_positions';
    RAISE NOTICE '🔧 Functions Created: 4 automation functions';
    RAISE NOTICE '⚡ Triggers Created: 2 automatic update triggers';
    RAISE NOTICE '📈 Views Created: 2 reporting views';
    RAISE NOTICE '🎯 Ready for HR management system implementation!';
END $$;
