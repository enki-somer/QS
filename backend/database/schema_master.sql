-- ========================================
-- QS FINANCIAL MANAGEMENT SYSTEM - MASTER SCHEMA
-- شركة قصر الشام للمقاولات العامة والإنشاءات
-- 
-- This is the SINGLE master schema file containing all working components
-- Created: 2025-01-10
-- ========================================

-- Drop existing database objects if they exist (for clean reinstall)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS safe_transactions CASCADE;
DROP TABLE IF EXISTS safe_state CASCADE;
DROP TABLE IF EXISTS general_expenses CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS invoice_attachments CASCADE;
DROP TABLE IF EXISTS invoice_custom_fields CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS project_category_assignments CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop types if they exist
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS expense_status CASCADE;
DROP TYPE IF EXISTS employee_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================
-- 1. USERS & AUTHENTICATION
-- ====================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'data_entry');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'data_entry',
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- ====================================
-- 2. CONTRACTORS MANAGEMENT
-- ====================================

CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    specialization TEXT,
    license_number VARCHAR(50),
    tax_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ====================================
-- 3. PROJECTS MANAGEMENT
-- ====================================

CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'cancelled');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    location VARCHAR(200),
    area DECIMAL(10,2),
    client VARCHAR(150) NOT NULL,
    budget_estimate DECIMAL(15,2) NOT NULL DEFAULT 0,
    allocated_budget DECIMAL(15,2) DEFAULT 0,
    available_budget DECIMAL(15,2) DEFAULT 0,
    spent_budget DECIMAL(15,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status project_status DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ====================================
-- 4. PROJECT CATEGORY ASSIGNMENTS
-- ====================================

CREATE TABLE project_category_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    main_category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(200) NOT NULL,
    contractor_id UUID REFERENCES contractors(id),
    contractor_name VARCHAR(150),
    estimated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'planned',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    has_approved_invoice BOOLEAN DEFAULT false,
    invoice_count INTEGER DEFAULT 0,
    last_invoice_date DATE,
    budget_exhausted BOOLEAN DEFAULT false,
    CONSTRAINT unique_project_category_contractor UNIQUE (project_id, main_category, subcategory, contractor_id)
);

-- ====================================
-- 5. INVOICES MANAGEMENT
-- ====================================

CREATE TYPE invoice_status AS ENUM ('pending_approval', 'approved', 'paid', 'rejected');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_assignment_id UUID REFERENCES project_category_assignments(id),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(200),
    invoice_number VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    notes TEXT,
    status invoice_status DEFAULT 'pending_approval',
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 6. SAFE MANAGEMENT
-- ====================================

CREATE TYPE transaction_type AS ENUM ('funding', 'invoice_payment', 'salary_payment', 'general_expense');

-- Safe state table (single record)
CREATE TABLE safe_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_balance DECIMAL(15,2) DEFAULT 0,
    total_funded DECIMAL(15,2) DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Safe transactions table
CREATE TABLE safe_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type transaction_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_id UUID REFERENCES projects(id),
    project_name VARCHAR(200),
    invoice_id UUID REFERENCES invoices(id),
    invoice_number VARCHAR(50),
    employee_id UUID,
    employee_name VARCHAR(150),
    expense_id UUID,
    funding_source VARCHAR(100),
    funding_notes TEXT,
    previous_balance DECIMAL(15,2),
    new_balance DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ====================================
-- 7. GENERAL EXPENSES
-- ====================================

CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE general_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    expense_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    cost DECIMAL(15,2) NOT NULL,
    details TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status expense_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT
);

-- ====================================
-- 8. EMPLOYEES (if needed)
-- ====================================

CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'terminated');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(15,2),
    status employee_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ====================================
-- 9. AUDIT LOG
-- ====================================

CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action audit_action NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 10. INDEXES FOR PERFORMANCE
-- ====================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Projects indexes
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Contractors indexes
CREATE INDEX idx_contractors_name ON contractors(name);
CREATE INDEX idx_contractors_active ON contractors(is_active);

-- Project category assignments indexes
CREATE INDEX idx_project_categories_project ON project_category_assignments(project_id);
CREATE INDEX idx_project_categories_contractor ON project_category_assignments(contractor_id);
CREATE INDEX idx_project_categories_main ON project_category_assignments(main_category);
CREATE INDEX idx_project_categories_status ON project_category_assignments(status);
CREATE INDEX idx_project_categories_created_by ON project_category_assignments(created_by);

-- Invoices indexes
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_category_assignment ON invoices(category_assignment_id);
CREATE INDEX idx_invoices_date ON invoices(date);

-- Safe transactions indexes
CREATE INDEX idx_safe_transactions_type ON safe_transactions(type);
CREATE INDEX idx_safe_transactions_date ON safe_transactions(date);
CREATE INDEX idx_safe_transactions_project ON safe_transactions(project_id);

-- General expenses indexes
CREATE INDEX idx_expenses_project ON general_expenses(project_id);
CREATE INDEX idx_expenses_status ON general_expenses(status);
CREATE INDEX idx_expenses_category ON general_expenses(category);
CREATE INDEX idx_expenses_date ON general_expenses(expense_date);

-- ====================================
-- 11. TRIGGERS AND FUNCTIONS
-- ====================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_category_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON general_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Safe state update trigger
CREATE OR REPLACE FUNCTION update_safe_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Update safe_state whenever a transaction is added
    UPDATE safe_state 
    SET 
        current_balance = current_balance + NEW.amount,
        total_funded = CASE 
            WHEN NEW.type = 'funding' THEN total_funded + NEW.amount
            ELSE total_funded
        END,
        total_spent = CASE 
            WHEN NEW.type != 'funding' THEN total_spent + ABS(NEW.amount)
            ELSE total_spent
        END,
        last_updated = CURRENT_TIMESTAMP,
        updated_by = NEW.created_by
    WHERE id = 1;
    
    -- Insert initial record if it doesn't exist
    INSERT INTO safe_state (id, current_balance, total_funded, total_spent, updated_by)
    SELECT 1, NEW.amount, 
           CASE WHEN NEW.type = 'funding' THEN NEW.amount ELSE 0 END,
           CASE WHEN NEW.type != 'funding' THEN ABS(NEW.amount) ELSE 0 END,
           NEW.created_by
    WHERE NOT EXISTS (SELECT 1 FROM safe_state WHERE id = 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_safe_state_trigger
    AFTER INSERT ON safe_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_state();

-- Assignment protection trigger (STRICT - prevents ANY editing when invoices approved)
CREATE OR REPLACE FUNCTION prevent_approved_category_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent ANY editing if category has approved invoices
    IF OLD.has_approved_invoice = TRUE THEN
        RAISE EXCEPTION 'Cannot edit category assignment with approved invoices. Assignment ID: %', OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_approved_category_edit
    BEFORE UPDATE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_approved_category_edit();

-- Invoice approval trigger (updates assignment when invoice approved)
CREATE OR REPLACE FUNCTION update_category_assignment_on_invoice_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is approved or paid, update the category assignment
    IF NEW.status IN ('approved', 'paid') AND OLD.status = 'pending_approval' THEN
        UPDATE project_category_assignments 
        SET 
            has_approved_invoice = TRUE,
            invoice_count = COALESCE(invoice_count, 0) + 1,
            last_invoice_date = NEW.date,
            actual_amount = COALESCE(actual_amount, 0) + NEW.amount,
            budget_exhausted = (COALESCE(actual_amount, 0) + NEW.amount >= estimated_amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.category_assignment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_approval_update_category
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_category_assignment_on_invoice_approval();

-- Project spending update trigger (updates project spent_budget when assignments change)
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

CREATE TRIGGER trg_update_project_spending
    AFTER INSERT OR UPDATE OR DELETE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending_on_assignment_change();

-- Project allocation update trigger (updates allocated_budget and available_budget)
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

CREATE TRIGGER trg_update_project_allocation
    AFTER INSERT OR UPDATE OR DELETE ON project_category_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_allocation_on_assignment_change();

-- Safe deduction function for invoice payments
CREATE OR REPLACE FUNCTION deduct_from_safe_for_invoice(
    invoice_amount DECIMAL(15,2),
    project_id_param UUID,
    project_name_param VARCHAR(200),
    invoice_id_param UUID,
    invoice_number_param VARCHAR(50),
    user_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    safe_current_balance DECIMAL(15,2);
    safe_new_balance DECIMAL(15,2);
BEGIN
    -- Get current safe balance
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

-- ====================================
-- 12. INITIAL DATA
-- ====================================

-- Insert initial safe state
INSERT INTO safe_state (id, current_balance, total_funded, total_spent) 
VALUES (1, 0, 0, 0) 
ON CONFLICT (id) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, role, full_name, email, is_active)
VALUES (
    'admin',
    crypt('admin123', gen_salt('bf')),
    'admin',
    'System Administrator',
    'admin@qasrsham.com',
    true
) ON CONFLICT (username) DO NOTHING;

-- ====================================
-- SUCCESS MESSAGE
-- ====================================

SELECT 'QS Financial Management System - Master Schema Created Successfully!' as status;
SELECT 'All tables, triggers, functions, and initial data have been set up.' as info;
SELECT 'Default admin user: admin / admin123' as login_info;
