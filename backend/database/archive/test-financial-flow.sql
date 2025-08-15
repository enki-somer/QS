-- Test Financial Flow Script
-- This script tests the corrected financial flow with sample data

-- 1. Setup: Clear existing test data (optional - uncomment if needed)
-- DELETE FROM safe_transactions WHERE description LIKE '%TEST%';
-- DELETE FROM invoices WHERE invoice_number LIKE 'TEST%';
-- DELETE FROM project_category_assignments WHERE notes LIKE '%TEST%';
-- DELETE FROM projects WHERE name LIKE '%TEST%';

-- 2. Create test user (if not exists)
INSERT INTO users (id, username, password_hash, role, full_name, email) 
SELECT 
    'test-user-id-123'::UUID,
    'testuser', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgOUhCGH0rKgCKW', 
    'admin', 
    'Test User', 
    'test@example.com'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'testuser');

-- 3. Fund the safe with 1,000,000 IQD
INSERT INTO safe_transactions (
    type, amount, description, date,
    previous_balance, new_balance, 
    funding_source, created_by
) VALUES (
    'funding',
    1000000,
    'TEST: Initial funding',
    CURRENT_DATE,
    0,
    1000000,
    'TEST',
    'test-user-id-123'::UUID
);

-- Update safe state
UPDATE safe_state 
SET 
    current_balance = 1000000,
    total_funded = total_funded + 1000000,
    last_updated = CURRENT_TIMESTAMP,
    updated_by = 'test-user-id-123'::UUID
WHERE id = 1;

-- 4. Create test project with 200,000 IQD budget
INSERT INTO projects (
    id, name, code, budget_estimate, 
    status, notes, created_by
) VALUES (
    'test-project-123'::UUID,
    'TEST Project',
    'TEST-001',
    200000,
    'active',
    'TEST project for financial flow',
    'test-user-id-123'::UUID
);

-- 5. Create test contractor
INSERT INTO contractors (
    id, full_name, phone_number, category, 
    notes, is_active, created_by
) 
SELECT 
    'test-contractor-123'::UUID,
    'TEST Contractor',
    '1234567890',
    'main_contractor',
    'TEST contractor',
    true,
    'test-user-id-123'::UUID
WHERE NOT EXISTS (SELECT 1 FROM contractors WHERE full_name = 'TEST Contractor');

-- 6. Create contractor assignment with 50,000 IQD budget
-- This should automatically update project allocated_budget and available_budget
INSERT INTO project_category_assignments (
    id, project_id, main_category, subcategory,
    contractor_id, contractor_name, estimated_amount,
    notes, status, created_by
) VALUES (
    'test-assignment-123'::UUID,
    'test-project-123'::UUID,
    'أعمال تنفيذية وإنشائية',
    'TEST Category',
    'test-contractor-123'::UUID,
    'TEST Contractor',
    50000,
    'TEST assignment',
    'planned',
    'test-user-id-123'::UUID
);

-- 7. Check project budget allocation after assignment
SELECT 
    'After Assignment Creation' as step,
    name,
    budget_estimate,
    allocated_budget,
    available_budget,
    spent_budget
FROM projects 
WHERE name = 'TEST Project';

-- 8. Create invoice for 25,000 IQD
INSERT INTO invoices (
    id, project_id, category_assignment_id,
    invoice_number, amount, subtotal, date,
    notes, status, submitted_by
) VALUES (
    'test-invoice-123'::UUID,
    'test-project-123'::UUID,
    'test-assignment-123'::UUID,
    'TEST-INV-001',
    25000,
    25000,
    CURRENT_DATE,
    'TEST invoice',
    'pending_approval',
    'test-user-id-123'::UUID
);

-- 9. Approve the invoice (this should update assignment actual_amount and project spent_budget)
UPDATE invoices 
SET 
    status = 'approved',
    approved_by = 'test-user-id-123'::UUID,
    approved_at = CURRENT_TIMESTAMP
WHERE id = 'test-invoice-123'::UUID;

-- 10. Deduct from safe using the database function
SELECT deduct_from_safe_for_invoice(
    25000,
    'test-project-123'::UUID,
    'TEST Project',
    'test-invoice-123'::UUID,
    'TEST-INV-001',
    'test-user-id-123'::UUID
) as safe_deduction_success;

-- 11. Add a general expense for 10,000 IQD
INSERT INTO general_expenses (
    id, project_id, expense_name, cost,
    details, expense_date, status,
    created_by, approved_by, approved_at
) VALUES (
    'test-expense-123'::UUID,
    'test-project-123'::UUID,
    'TEST General Expense',
    10000,
    'TEST expense details',
    CURRENT_DATE,
    'approved',
    'test-user-id-123'::UUID,
    'test-user-id-123'::UUID,
    CURRENT_TIMESTAMP
);

-- 12. Final verification - check all balances
SELECT '=== FINAL FINANCIAL STATE ===' as title;

-- Safe state
SELECT 
    'Safe Balance' as type,
    current_balance,
    total_funded,
    total_spent
FROM safe_state WHERE id = 1;

-- Project financial overview
SELECT 
    'Project Overview' as type,
    name,
    budget_estimate as "Total Budget",
    allocated_budget as "Allocated to Contractors",
    available_budget as "Available for New Assignments",
    spent_budget as "Actually Spent"
FROM projects 
WHERE name = 'TEST Project';

-- Assignment details
SELECT 
    'Assignment Details' as type,
    main_category,
    subcategory,
    contractor_name,
    estimated_amount as "Estimated",
    actual_amount as "Actual Spent",
    (estimated_amount - COALESCE(actual_amount, 0)) as "Remaining"
FROM project_category_assignments 
WHERE project_id = 'test-project-123'::UUID;

-- Safe transactions for this project
SELECT 
    'Safe Transactions' as type,
    type as transaction_type,
    amount,
    description,
    date
FROM safe_transactions 
WHERE project_id = 'test-project-123'::UUID 
   OR description LIKE '%TEST%'
ORDER BY created_at;

-- Financial flow validation
SELECT * FROM project_financial_flow 
WHERE project_id = 'test-project-123'::UUID;

-- 13. Expected Results Summary
SELECT '=== EXPECTED RESULTS ===' as title;
SELECT 'Safe Balance: 965,000 IQD (1,000,000 - 25,000 - 10,000)' as expectation
UNION ALL
SELECT 'Project Total Budget: 200,000 IQD' 
UNION ALL
SELECT 'Project Allocated Budget: 50,000 IQD (to contractor)'
UNION ALL
SELECT 'Project Available Budget: 150,000 IQD (200,000 - 50,000)'
UNION ALL
SELECT 'Project Spent Budget: 35,000 IQD (25,000 invoice + 10,000 expense)'
UNION ALL
SELECT 'Assignment Remaining: 25,000 IQD (50,000 - 25,000)'
UNION ALL
SELECT 'Project Remaining: 165,000 IQD (200,000 - 35,000)';

-- 14. Success message
SELECT 'Financial flow test completed!' as status;
SELECT 'Review the results above to verify correct calculations' as instruction;
