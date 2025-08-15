-- Create trigger function for automatic project payment updates
CREATE OR REPLACE FUNCTION update_project_payments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for funding transactions linked to projects
    IF NEW.type = 'funding' AND NEW.project_id IS NOT NULL THEN
        UPDATE projects
        SET owner_paid_amount = COALESCE(owner_paid_amount, 0) + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_project_payments ON safe_transactions;
CREATE TRIGGER trigger_update_project_payments
    AFTER INSERT ON safe_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_project_payments();

-- Add comment
COMMENT ON FUNCTION update_project_payments() IS 'Automatically updates project owner_paid_amount when funding transactions are linked to projects';
