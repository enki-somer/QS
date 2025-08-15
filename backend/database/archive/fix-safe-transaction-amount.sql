-- Fix the deduct_from_safe_for_invoice function to use negative amounts
CREATE OR REPLACE FUNCTION deduct_from_safe_for_invoice(
    invoice_amount DECIMAL(15,2),
    project_id_param UUID,
    project_name_param VARCHAR(200),
    invoice_id_param UUID,
    invoice_number_param VARCHAR(50),
    user_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    safe_current_balance DECIMAL(15,2);  -- Renamed to avoid ambiguity
    safe_new_balance DECIMAL(15,2);      -- Renamed to avoid ambiguity
BEGIN
    -- Get current safe balance (use table alias to be explicit)
    SELECT s.current_balance INTO safe_current_balance 
    FROM safe_state s WHERE s.id = 1;
    
    -- Check if sufficient funds
    IF safe_current_balance < invoice_amount THEN
        RAISE EXCEPTION 'Insufficient safe balance. Current: %, Required: %', safe_current_balance, invoice_amount;
    END IF;
    
    -- Calculate new balance
    safe_new_balance := safe_current_balance - invoice_amount;
    
    -- Insert safe transaction with NEGATIVE amount for deduction
    INSERT INTO safe_transactions (
        type, amount, description, date,
        project_id, project_name, invoice_id, invoice_number,
        previous_balance, new_balance, created_by
    ) VALUES (
        'invoice_payment',
        -invoice_amount,  -- NEGATIVE for outflow/deduction
        'Invoice payment for ' || project_name_param,
        NOW(),
        project_id_param,
        project_name_param,
        invoice_id_param,
        invoice_number_param,
        safe_current_balance,
        safe_new_balance,
        user_id_param
    );
    
    -- Update safe state (this should be handled by triggers, but let's be explicit)
    UPDATE safe_state 
    SET 
        current_balance = safe_new_balance,
        total_spent = total_spent + invoice_amount,
        last_updated = CURRENT_TIMESTAMP,
        updated_by = user_id_param
    WHERE id = 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

SELECT 'Safe transaction amount fixed - invoices will now show as negative (deductions)!' as status;

