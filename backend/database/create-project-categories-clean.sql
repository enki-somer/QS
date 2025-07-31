-- Clean version: Create project_category_assignments table without encoding issues
-- No Arabic characters to avoid WIN1252/UTF8 conversion problems

-- Drop table if exists (to start fresh)
DROP TABLE IF EXISTS project_category_assignments CASCADE;

-- Create the table
CREATE TABLE project_category_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    main_category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(200) NOT NULL,
    contractor_id UUID,
    contractor_name VARCHAR(150),
    estimated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'planned',
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_project_categories_project ON project_category_assignments(project_id);
CREATE INDEX idx_project_categories_main ON project_category_assignments(main_category);
CREATE INDEX idx_project_categories_contractor ON project_category_assignments(contractor_id);
CREATE INDEX idx_project_categories_status ON project_category_assignments(status);
CREATE INDEX idx_project_categories_created_by ON project_category_assignments(created_by);

-- Add foreign key constraint for contractor_id (if contractors table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractors') THEN
        ALTER TABLE project_category_assignments 
        ADD CONSTRAINT fk_project_categories_contractor 
        FOREIGN KEY (contractor_id) REFERENCES contractors(id);
    END IF;
END $$;

-- Add foreign key constraint for created_by (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE project_category_assignments 
        ADD CONSTRAINT fk_project_categories_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END $$;

-- Create trigger for updated_at (if the function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_project_categories_updated_at 
        BEFORE UPDATE ON project_category_assignments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verify table was created
SELECT 'project_category_assignments table created successfully!' as status;
\d project_category_assignments