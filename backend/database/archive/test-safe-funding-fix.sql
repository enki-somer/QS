-- Test Safe Funding Fix
-- This script tests that funding works correctly without double-counting

-- 1. Clean slate first
UPDATE safe_state 
SET 
    current_balance = 0,
    total_funded = 0,
    total_spent = 0
WHERE id = 1;

DELETE FROM safe_transactions;

SELECT 'Starting with clean safe state...' as status;
SELECT current_balance, total_funded, total_spent FROM safe_state WHERE id = 1;

-- 2. Test funding 100,000 IQD
INSERT INTO safe_transactions (
    type, amount, description, date,
    previous_balance, new_balance,
    funding_source, created_by
) VALUES (
    'funding',
    100000,
    'Test funding - 100,000 IQD',
    CURRENT_DATE,
    0,
    100000,
    'Test',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

SELECT 'After funding 100,000 IQD...' as status;
SELECT 
    current_balance as "Current Balance (should be 100,000)",
    total_funded as "Total Funded (should be 100,000)", 
    total_spent as "Total Spent (should be 0)"
FROM safe_state WHERE id = 1;

-- 3. Test another funding of 50,000 IQD
INSERT INTO safe_transactions (
    type, amount, description, date,
    previous_balance, new_balance,
    funding_source, created_by
) VALUES (
    'funding',
    50000,
    'Test funding - 50,000 IQD',
    CURRENT_DATE,
    100000,
    150000,
    'Test',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

SELECT 'After funding additional 50,000 IQD...' as status;
SELECT 
    current_balance as "Current Balance (should be 150,000)",
    total_funded as "Total Funded (should be 150,000)", 
    total_spent as "Total Spent (should be 0)"
FROM safe_state WHERE id = 1;

-- 4. Verify transactions
SELECT 'Safe Transactions:' as info;
SELECT type, amount, description, previous_balance, new_balance FROM safe_transactions ORDER BY created_at;

-- 5. Expected vs Actual Results
SELECT '=== VERIFICATION ===' as header;

SELECT 
    'Current Balance Check' as test,
    150000 as expected,
    current_balance as actual,
    CASE WHEN current_balance = 150000 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM safe_state WHERE id = 1

UNION ALL

SELECT 
    'Total Funded Check',
    150000,
    total_funded,
    CASE WHEN total_funded = 150000 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM safe_state WHERE id = 1

UNION ALL

SELECT 
    'Total Spent Check',
    0,
    total_spent,
    CASE WHEN total_spent = 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM safe_state WHERE id = 1;

SELECT 'Test completed! Check results above.' as final_message;

