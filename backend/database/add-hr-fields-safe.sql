-- ========================================
-- SAFE HR FIELDS ADDITION - NO EXISTING DATA CHANGES
-- قصر الشام للمقاولات العامة والإنشاءات
-- 
-- This script SAFELY adds only the essential HR fields
-- WITHOUT modifying any existing data or functionality
-- 
-- Created: 2025-01-15
-- ========================================

-- Only add new columns if they don't exist (safe approach)
DO $$ 
BEGIN
    -- Add mobile_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'mobile_number') THEN
        ALTER TABLE employees ADD COLUMN mobile_number VARCHAR(20);
        RAISE NOTICE '✅ Added mobile_number column';
    ELSE
        RAISE NOTICE '⚠️ mobile_number column already exists, skipping';
    END IF;

    -- Add age column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'age') THEN
        ALTER TABLE employees ADD COLUMN age INTEGER;
        RAISE NOTICE '✅ Added age column';
    ELSE
        RAISE NOTICE '⚠️ age column already exists, skipping';
    END IF;

    -- Add monthly_salary column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'monthly_salary') THEN
        ALTER TABLE employees ADD COLUMN monthly_salary DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE '✅ Added monthly_salary column';
    ELSE
        RAISE NOTICE '⚠️ monthly_salary column already exists, skipping';
    END IF;

    -- Add last_payment_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'last_payment_date') THEN
        ALTER TABLE employees ADD COLUMN last_payment_date DATE;
        RAISE NOTICE '✅ Added last_payment_date column';
    ELSE
        RAISE NOTICE '⚠️ last_payment_date column already exists, skipping';
    END IF;

    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'payment_status') THEN
        ALTER TABLE employees ADD COLUMN payment_status VARCHAR(20) DEFAULT 'current';
        RAISE NOTICE '✅ Added payment_status column';
    ELSE
        RAISE NOTICE '⚠️ payment_status column already exists, skipping';
    END IF;

END $$;

-- Create salary payments table ONLY if it doesn't exist
CREATE TABLE IF NOT EXISTS employee_salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes only if table was created
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_salary_payments_employee') THEN
        CREATE INDEX idx_salary_payments_employee ON employee_salary_payments(employee_id);
        RAISE NOTICE '✅ Added salary payments index';
    END IF;
END $$;

-- Simple function to get employees (safe, no complex logic)
CREATE OR REPLACE FUNCTION get_all_employees_with_hr_data()
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(150),
    mobile_number VARCHAR(20),
    age INTEGER,
    monthly_salary DECIMAL(15,2),
    payment_status VARCHAR(20),
    last_payment_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.mobile_number,
        e.age,
        e.monthly_salary,
        e.payment_status,
        e.last_payment_date
    FROM employees e
    WHERE e.status = 'active'
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SAFE HR FIELDS ADDITION COMPLETE!';
    RAISE NOTICE '✅ New columns added to employees table';
    RAISE NOTICE '✅ Salary payments tracking table created';
    RAISE NOTICE '✅ Simple query function created';
    RAISE NOTICE '⚠️ NO existing data was modified';
    RAISE NOTICE '⚠️ NO existing functionality was changed';
    RAISE NOTICE '';
END $$;
