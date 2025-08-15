-- Create trigger to update project spent_budget when assignments are updated
CREATE OR REPLACE FUNCTION update_project_spending_on_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the project's spent_budget when assignment actual_amount changes
    IF TG_OP = 'UPDATE' AND (OLD.actual_amount IS DISTINCT FROM NEW.actual_amount) THEN
        UPDATE projects 
        SET 
            spent_budget = (
                SELECT COALESCE(SUM(actual_amount), 0) 
                FROM project_category_assignments 
                WHERE project_id = NEW.project_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.project_id;
        
        RETURN NEW;
    END IF;
    
    -- Handle INSERT (new assignment with actual_amount)
    IF TG_OP = 'INSERT' AND NEW.actual_amount > 0 THEN
        UPDATE projects 
        SET 
            spent_budget = (
                SELECT COALESCE(SUM(actual_amount), 0) 
                FROM project_category_assignments 
                WHERE project_id = NEW.project_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.project_id;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' AND OLD.actual_amount > 0 THEN
        UPDATE projects 
        SET 
            spent_budget = (
                SELECT COALESCE(SUM(actual_amount), 0) 
                FROM project_category_assignments 
                WHERE project_id = OLD.project_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.project_id;
        
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_project_spending ON project_category_assignments;
CREATE TRIGGER trg_update_project_spending
    AFTER INSERT OR UPDATE OR DELETE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending_on_assignment_change();

SELECT 'Project spending trigger created successfully!' as status;

