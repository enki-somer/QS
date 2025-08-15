-- Create trigger to update project allocated_budget and available_budget when assignments change
CREATE OR REPLACE FUNCTION update_project_allocation_on_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the project's allocated_budget and available_budget when assignment estimated_amount changes
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        UPDATE projects 
        SET 
            allocated_budget = (
                SELECT COALESCE(SUM(estimated_amount), 0) 
                FROM project_category_assignments 
                WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
            ),
            available_budget = (
                budget_estimate - (
                    SELECT COALESCE(SUM(estimated_amount), 0) 
                    FROM project_category_assignments 
                    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
                )
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (runs after spending trigger)
DROP TRIGGER IF EXISTS trg_update_project_allocation ON project_category_assignments;
CREATE TRIGGER trg_update_project_allocation
    AFTER INSERT OR UPDATE OR DELETE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_allocation_on_assignment_change();

-- Update existing projects to have correct allocation values
UPDATE projects 
SET 
    allocated_budget = (
        SELECT COALESCE(SUM(estimated_amount), 0) 
        FROM project_category_assignments 
        WHERE project_id = projects.id
    ),
    available_budget = (
        budget_estimate - (
            SELECT COALESCE(SUM(estimated_amount), 0) 
            FROM project_category_assignments 
            WHERE project_id = projects.id
        )
    )
WHERE EXISTS (
    SELECT 1 FROM project_category_assignments 
    WHERE project_id = projects.id
);

SELECT 'Project allocation trigger created and existing data updated!' as status;
