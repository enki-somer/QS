-- Debug Current Balance Issue
-- This script will help us see exactly what's happening

-- 1. Check current safe state
SELECT '=== CURRENT SAFE STATE ===' as debug_header;
SELECT 
    current_balance,
    total_funded,
    total_spent,
    last_updated,
    updated_by
FROM safe_state WHERE id = 1;

-- 2. Check recent safe transactions
SELECT '=== RECENT SAFE TRANSACTIONS ===' as debug_header;
SELECT 
    type,
    amount,
    description,
    previous_balance,
    new_balance,
    created_at
FROM safe_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if trigger exists and is active
SELECT '=== TRIGGER STATUS ===' as debug_header;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'update_safe_state_trigger';

-- 4. Test manual trigger execution
SELECT '=== MANUAL TRIGGER TEST ===' as debug_header;

-- Let's see what the trigger function returns
DO $$
DECLARE
    test_record safe_transactions;
BEGIN
    -- Get the latest funding transaction
    SELECT * INTO test_record 
    FROM safe_transactions 
    WHERE type = 'funding' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'Latest funding transaction: type=%, amount=%, new_balance=%', 
            test_record.type, test_record.amount, test_record.new_balance;
        
        -- Check what the trigger should set
        RAISE NOTICE 'Trigger should set current_balance to: %', test_record.new_balance;
    ELSE
        RAISE NOTICE 'No funding transactions found';
    END IF;
END $$;

-- 5. Check for any other triggers that might interfere
SELECT '=== ALL TRIGGERS ON SAFE_TRANSACTIONS ===' as debug_header;
SELECT 
    trigger_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'safe_transactions';

-- 6. Check for any other triggers on safe_state
SELECT '=== ALL TRIGGERS ON SAFE_STATE ===' as debug_header;
SELECT 
    trigger_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'safe_state';

-- 7. Manual test: Insert a test transaction and see what happens
SELECT '=== MANUAL TRANSACTION TEST ===' as debug_header;

-- Store current state
CREATE TEMP TABLE temp_before_state AS 
SELECT current_balance, total_funded, total_spent FROM safe_state WHERE id = 1;

-- Insert a test transaction
INSERT INTO safe_transactions (
    type, amount, description, date,
    previous_balance, new_balance,
    funding_source, created_by
) VALUES (
    'funding',
    1000,
    'DEBUG: Manual test transaction',
    CURRENT_DATE,
    (SELECT current_balance FROM safe_state WHERE id = 1),
    (SELECT current_balance FROM safe_state WHERE id = 1) + 1000,
    'DEBUG',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- Check state after insert
SELECT 'Before manual test:' as timing, * FROM temp_before_state;
SELECT 'After manual test:' as timing, current_balance, total_funded, total_spent FROM safe_state WHERE id = 1;

-- Clean up test transaction
DELETE FROM safe_transactions WHERE description = 'DEBUG: Manual test transaction';

SELECT 'Debug analysis complete!' as final_message;

