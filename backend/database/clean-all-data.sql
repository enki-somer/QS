-- ====================================
-- CLEAN ALL TEST DATA - START FRESH
-- ====================================
-- This script removes all user-generated data while preserving the schema
-- WARNING: This will delete ALL projects, invoices, assignments, and related data

-- Disable triggers temporarily to avoid conflicts during cleanup
SET session_replication_role = replica;

-- Clear all test data in dependency order (child tables first)
TRUNCATE TABLE audit_log CASCADE;
TRUNCATE TABLE invoice_attachments CASCADE;
TRUNCATE TABLE invoice_custom_fields CASCADE;
TRUNCATE TABLE invoice_line_items CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE project_category_assignments CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE general_expenses CASCADE;
TRUNCATE TABLE safe_transactions CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE contractors CASCADE;

-- Reset safe state to initial values
TRUNCATE TABLE safe_state CASCADE;
INSERT INTO safe_state (id, current_balance, total_funded, total_spent, last_updated) 
VALUES (1, 1000000.00, 1000000.00, 0.00, CURRENT_TIMESTAMP);

-- Keep users but clear their sessions
TRUNCATE TABLE user_sessions CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Reset sequences (if any auto-increment columns exist)
-- Note: UUIDs don't need sequence reset, but including for completeness
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname = 'public')
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.sequencename) || ' RESTART WITH 1';
    END LOOP;
END $$;

-- Verify cleanup
SELECT 
    'projects' as table_name, COUNT(*) as remaining_records FROM projects
UNION ALL
SELECT 'project_category_assignments', COUNT(*) FROM project_category_assignments
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'contractors', COUNT(*) FROM contractors
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'general_expenses', COUNT(*) FROM general_expenses
UNION ALL
SELECT 'safe_transactions', COUNT(*) FROM safe_transactions
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'safe_state', COUNT(*) FROM safe_state;

-- Show current safe balance
SELECT current_balance as safe_balance FROM safe_state WHERE id = 1;

-- Success messages
DO $$
BEGIN
    RAISE NOTICE '✅ Database cleanup completed successfully!';
    RAISE NOTICE '🔄 All test data has been removed';
    RAISE NOTICE '👤 User accounts preserved';
    RAISE NOTICE '💰 Safe balance reset to 1,000,000.00 IQD';
    RAISE NOTICE '🎯 Ready for fresh project creation';
END $$;