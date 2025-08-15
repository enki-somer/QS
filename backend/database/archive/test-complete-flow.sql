-- COMPLETE FINANCIAL FLOW TEST
-- This script tests the entire financial logic with fresh data

-- 1. Ensure we have the budget allocation columns
\i backend/database/add-budget-columns.sql

-- 2. Clear all existing data first
\i backend/database/reset-all-data.sql

-- 3. Verify we start with clean state
SELECT 'Starting with clean state...' as status;
SELECT current_balance, total_funded, total_spent FROM safe_state WHERE id = 1;

-- 4. Test the complete financial flow
SELECT '=== TESTING COMPLETE FINANCIAL FLOW ===' as test_header;

-- Step 1: Fund the safe with 1,000,000 IQD
INSERT INTO safe_transactions (
    type, amount, description, date,
    previous_balance, new_balance, 
    funding_source, created_by
) VALUES (
    'funding',
    1000000,
    'Initial funding for testing',
    CURRENT_DATE,
    0,
    1000000,
    'Test Source',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- Update safe state
UPDATE safe_state 
SET 
    current_balance = 1000000,
    total_funded = 1000000,
    last_updated = CURRENT_TIMESTAMP
WHERE id = 1;

SELECT 'Step 1 Complete: Safe funded with 1,000,000 IQD' as step;

-- Step 2: Create a project with 200,000 IQD budget
INSERT INTO projects (
    id, name, code, budget_estimate, 
    allocated_budget, available_budget, spent_budget,
    status, notes, created_by
) VALUES (
    'test-project-flow'::UUID,
    'Test Project - Complete Flow',
    'TEST-FLOW-001',
    200000,
    0,  -- Initially no budget allocated
    200000,  -- All budget available initially
    0,  -- No spending yet
    'active',
    'Testing complete financial flow',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

SELECT 'Step 2 Complete: Project created with 200,000 IQD budget' as step;

-- Step 3: Create a contractor
INSERT INTO contractors (
    id, full_name, phone_number, category, 
    notes, is_active, created_by
) VALUES (
    'test-contractor-flow'::UUID,
    'Test Contractor - Flow',
    '1234567890',
    'main_contractor',
    'Testing contractor',
    true,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

SELECT 'Step 3 Complete: Contractor created' as step;

-- Step 4: Create contractor assignment with 50,000 IQD
-- This should reduce available budget from 200,000 to 150,000
INSERT INTO project_category_assignments (
    id, project_id, main_category, subcategory,
    contractor_id, contractor_name, estimated_amount,
    actual_amount, notes, status, created_by
) VALUES (
    'test-assignment-flow'::UUID,
    'test-project-flow'::UUID,
    'أعمال تنفيذية وإنشائية',
    'Test Category Assignment',
    'test-contractor-flow'::UUID,
    'Test Contractor - Flow',
    50000,
    0,  -- No actual spending yet
    'Testing assignment',
    'planned',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

SELECT 'Step 4 Complete: Assignment created with 50,000 IQD budget' as step;

-- Check project budget allocation after assignment
SELECT 
    'After Assignment:' as checkpoint,
    budget_estimate as "Total Budget",
    allocated_budget as "Allocated",
    available_budget as "Available",
    spent_budget as "Spent"
FROM projects WHERE id = 'test-project-flow'::UUID;

-- Step 5: Create invoice for 25,000 IQD (half of assignment budget)
INSERT INTO invoices (
    id, project_id, category_assignment_id,
    invoice_number, amount, subtotal, date,
    notes, status, submitted_by
) VALUES (
    'test-invoice-flow'::UUID,
    'test-project-flow'::UUID,
    'test-assignment-flow'::UUID,
    'TEST-FLOW-INV-001',
    25000,
    25000,
    CURRENT_DATE,
    'Test invoice for 25,000 IQD',
    'pending_approval',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

SELECT 'Step 5 Complete: Invoice created for 25,000 IQD' as step;

-- Step 6: Approve the invoice (this should update assignment actual_amount)
UPDATE invoices 
SET 
    status = 'approved',
    approved_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    approved_at = CURRENT_TIMESTAMP
WHERE id = 'test-invoice-flow'::UUID;

SELECT 'Step 6 Complete: Invoice approved' as step;

-- Step 7: Deduct from safe (simulate the API call)
SELECT deduct_from_safe_for_invoice(
    25000,
    'test-project-flow'::UUID,
    'Test Project - Complete Flow',
    'test-invoice-flow'::UUID,
    'TEST-FLOW-INV-001',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
) as "Safe Deduction Success";

SELECT 'Step 7 Complete: Safe deduction processed' as step;

-- Step 8: Add a general expense for 10,000 IQD
INSERT INTO general_expenses (
    id, project_id, expense_name, cost,
    details, expense_date, status,
    created_by, approved_by, approved_at
) VALUES (
    'test-expense-flow'::UUID,
    'test-project-flow'::UUID,
    'Test General Expense',
    10000,
    'Testing general expense flow',
    CURRENT_DATE,
    'approved',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    CURRENT_TIMESTAMP
);

SELECT 'Step 8 Complete: General expense added for 10,000 IQD' as step;

-- Final Results Verification
SELECT '=== FINAL VERIFICATION ===' as verification_header;

-- Safe state should show: Balance = 975,000 (1,000,000 - 25,000)
SELECT 
    'Safe State' as item,
    current_balance as "Current Balance",
    total_funded as "Total Funded", 
    total_spent as "Total Spent"
FROM safe_state WHERE id = 1;

-- Project should show proper budget allocation and spending
SELECT 
    'Project Budget' as item,
    budget_estimate as "Total Budget (200,000)",
    allocated_budget as "Allocated to Contractors (50,000)",
    available_budget as "Available for New Assignments (150,000)",
    spent_budget as "Actually Spent (35,000)"
FROM projects WHERE id = 'test-project-flow'::UUID;

-- Assignment should show spending progress
SELECT 
    'Assignment Progress' as item,
    estimated_amount as "Estimated (50,000)",
    actual_amount as "Actual Spent (25,000)",
    (estimated_amount - COALESCE(actual_amount, 0)) as "Remaining (25,000)"
FROM project_category_assignments WHERE id = 'test-assignment-flow'::UUID;

-- Safe transactions for this project
SELECT 
    'Safe Transactions' as item,
    type,
    amount,
    description
FROM safe_transactions 
WHERE project_id = 'test-project-flow'::UUID 
   OR description LIKE '%testing%'
ORDER BY created_at;

-- Expected vs Actual Results
SELECT '=== EXPECTED VS ACTUAL ===' as comparison;

SELECT 
    'Safe Balance' as metric,
    975000 as expected,
    current_balance as actual,
    CASE WHEN current_balance = 975000 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM safe_state WHERE id = 1

UNION ALL

SELECT 
    'Project Available Budget',
    150000,
    available_budget,
    CASE WHEN available_budget = 150000 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM projects WHERE id = 'test-project-flow'::UUID

UNION ALL

SELECT 
    'Project Spent Budget',
    35000,
    spent_budget,
    CASE WHEN spent_budget = 35000 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM projects WHERE id = 'test-project-flow'::UUID

UNION ALL

SELECT 
    'Assignment Remaining',
    25000,
    (estimated_amount - COALESCE(actual_amount, 0)),
    CASE WHEN (estimated_amount - COALESCE(actual_amount, 0)) = 25000 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM project_category_assignments WHERE id = 'test-assignment-flow'::UUID;

SELECT 'Financial flow test complete! Check results above.' as final_message;
