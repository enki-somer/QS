-- RESET ALL DATA - Start Fresh
-- This script drops all data and resets the system to initial state
-- WARNING: This will delete ALL your data!

-- 1. Drop all data from tables (in correct order to avoid FK constraints)
TRUNCATE TABLE safe_transactions CASCADE;
TRUNCATE TABLE invoice_line_items CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE project_category_assignments CASCADE;
TRUNCATE TABLE general_expenses CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE contractors CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE audit_log CASCADE;

-- 2. Reset safe state to zero
UPDATE safe_state 
SET 
    current_balance = 0,
    total_funded = 0,
    total_spent = 0,
    last_updated = CURRENT_TIMESTAMP,
    updated_by = NULL
WHERE id = 1;

-- 3. Reset sequences (if any exist)
-- This ensures IDs start from 1 again for any serial columns

-- 4. Keep users table intact (don't delete admin user)
-- Only reset if you want to start with fresh users too
-- TRUNCATE TABLE users CASCADE;

-- 5. Verify clean state
SELECT 'Data Reset Complete!' as status;

-- Show table counts to verify everything is empty
SELECT 
    'safe_transactions' as table_name, 
    COUNT(*) as record_count 
FROM safe_transactions
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'contractors', COUNT(*) FROM contractors
UNION ALL
SELECT 'project_category_assignments', COUNT(*) FROM project_category_assignments
UNION ALL
SELECT 'general_expenses', COUNT(*) FROM general_expenses
UNION ALL
SELECT 'employees', COUNT(*) FROM employees;

-- Show safe state
SELECT 
    'Safe State' as info,
    current_balance,
    total_funded,
    total_spent
FROM safe_state WHERE id = 1;

SELECT 'System ready for fresh testing!' as message;
