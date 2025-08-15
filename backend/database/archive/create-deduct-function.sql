-- Create the deduct_from_safe_for_invoice function
CREATE OR REPLACE FUNCTION deduct_from_safe_for_invoice(
    invoice_amount DECIMAL(15,2),
    project_id_param UUID,
    project_name_param VARCHAR(200),
    invoice_id_param UUID,
    invoice_number_param VARCHAR(50),
    user_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(15,2);
    new_balance DECIMAL(15,2);
BEGIN
    -- Get current safe balance
    SELECT current_balance INTO current_balance 
    FROM safe_state WHERE id = 1;
    
    -- Check if sufficient funds
    IF current_balance < invoice_amount THEN
        RAISE EXCEPTION 'Insufficient safe balance. Current: %, Required: %', current_balance, invoice_amount;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - invoice_amount;
    
    -- Insert safe transaction
    INSERT INTO safe_transactions (
        type, amount, description, date,
        project_id, project_name, invoice_id, invoice_number,
        previous_balance, new_balance, created_by
    ) VALUES (
        'invoice_payment',
        invoice_amount,
        'Invoice payment for ' || project_name_param,
        NOW(),
        project_id_param,
        project_name_param,
        invoice_id_param,
        invoice_number_param,
        current_balance,
        new_balance,
        user_id_param
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

SELECT 'Function deduct_from_safe_for_invoice created successfully!' as status;

