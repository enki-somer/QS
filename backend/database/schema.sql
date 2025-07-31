-- QS Financial Management System - PostgreSQL Database Schema
-- نظام الإدارة المالية المتكامل لشركة قصر الشام

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

-- User sessions for JWT invalidation (optional)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 2. PROJECTS MANAGEMENT
-- ====================================

-- Project status enum
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'cancelled');

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- Immutable project identifier
    location VARCHAR(200),
    budget_estimate DECIMAL(15,2) DEFAULT 0,
    client VARCHAR(150),
    start_date DATE,
    end_date DATE,
    status project_status DEFAULT 'planning',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 3. INVOICES MANAGEMENT
-- ====================================

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM ('pending_approval', 'approved', 'paid', 'rejected');

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    date DATE NOT NULL,
    due_date DATE,
    payment_terms TEXT,
    notes TEXT,
    status invoice_status DEFAULT 'pending_approval',
    -- Workflow tracking
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice custom fields
CREATE TABLE invoice_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    field_label VARCHAR(100) NOT NULL,
    field_value TEXT,
    field_type VARCHAR(20) DEFAULT 'text', -- text, number, date, textarea
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice attachments
CREATE TABLE invoice_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 4. CONTRACTORS MANAGEMENT
-- ====================================

-- Contractor category enum
CREATE TYPE contractor_category AS ENUM (
    'مقاول أساسي', 
    'مقاول فرعي', 
    'مورد مواد البناء', 
    'مورد معدات', 
    'خدمات نقل', 
    'استشاري هندسي',
    'خدمات فنية متخصصة',
    'أخرى'
);

-- Contractors table
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL UNIQUE, -- No duplicate names allowed
    phone_number VARCHAR(20) NOT NULL,
    category contractor_category NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 5. EMPLOYEES MANAGEMENT
-- ====================================

-- Employee status enum
CREATE TYPE employee_status AS ENUM ('active', 'inactive');

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(100),
    status employee_status DEFAULT 'active',
    base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    daily_bonus DECIMAL(10,2) DEFAULT 0,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    join_date DATE NOT NULL,
    assigned_project_id UUID REFERENCES projects(id),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 6. GENERAL EXPENSES
-- ====================================

-- Expense status enum
CREATE TYPE expense_status AS ENUM ('pending_approval', 'approved', 'paid', 'rejected');

-- General expenses table
CREATE TABLE general_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    receipt_url VARCHAR(500),
    notes TEXT,
    status expense_status DEFAULT 'pending_approval',
    -- Workflow tracking
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 7. SAFE/TREASURY SYSTEM
-- ====================================

-- Transaction types enum
CREATE TYPE transaction_type AS ENUM ('funding', 'invoice_payment', 'salary_payment', 'general_expense');

-- Safe transactions table
CREATE TABLE safe_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type transaction_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL, -- Positive for inflow, negative for outflow
    description TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Reference links (nullable - depends on transaction type)
    project_id UUID REFERENCES projects(id),
    project_name VARCHAR(200),
    invoice_id UUID REFERENCES invoices(id),
    invoice_number VARCHAR(50),
    employee_id UUID REFERENCES employees(id),
    employee_name VARCHAR(100),
    expense_id UUID REFERENCES general_expenses(id),
    
    -- Balance tracking
    previous_balance DECIMAL(15,2) NOT NULL,
    new_balance DECIMAL(15,2) NOT NULL,
    
    -- Funding source (for funding transactions)
    funding_source VARCHAR(100), -- مقاولات، إيجار، مصنع، etc.
    funding_notes TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safe state table (single row for current balance)
CREATE TABLE safe_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_funded DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    
    -- Ensure only one row exists
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- ====================================
-- 8. SYSTEM AUDIT LOG
-- ====================================

-- Audit actions enum
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'payment');

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 9. INDEXES FOR PERFORMANCE
-- ====================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Projects indexes
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- Invoices indexes
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_submitted_by ON invoices(submitted_by);

-- Contractors indexes
CREATE INDEX idx_contractors_category ON contractors(category);
CREATE INDEX idx_contractors_active ON contractors(is_active);
CREATE INDEX idx_contractors_name ON contractors(full_name);
CREATE INDEX idx_contractors_created_by ON contractors(created_by);

-- Employees indexes
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_project ON employees(assigned_project_id);
CREATE INDEX idx_employees_created_by ON employees(created_by);

-- Expenses indexes
CREATE INDEX idx_expenses_category ON general_expenses(category);
CREATE INDEX idx_expenses_status ON general_expenses(status);
CREATE INDEX idx_expenses_date ON general_expenses(date);
CREATE INDEX idx_expenses_submitted_by ON general_expenses(submitted_by);

-- Safe transactions indexes
CREATE INDEX idx_safe_transactions_type ON safe_transactions(type);
CREATE INDEX idx_safe_transactions_date ON safe_transactions(date);
CREATE INDEX idx_safe_transactions_project ON safe_transactions(project_id);
CREATE INDEX idx_safe_transactions_employee ON safe_transactions(employee_id);
CREATE INDEX idx_safe_transactions_expense ON safe_transactions(expense_id);
CREATE INDEX idx_safe_transactions_created_by ON safe_transactions(created_by);

-- Audit log indexes
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ====================================
-- 10. TRIGGERS AND FUNCTIONS
-- ====================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON general_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update safe state when transactions are added
CREATE OR REPLACE FUNCTION update_safe_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Update safe state totals
    IF NEW.type = 'funding' THEN
        UPDATE safe_state SET 
            current_balance = NEW.new_balance,
            total_funded = total_funded + NEW.amount,
            last_updated = CURRENT_TIMESTAMP,
            updated_by = NEW.created_by
        WHERE id = 1;
    ELSE
        UPDATE safe_state SET 
            current_balance = NEW.new_balance,
            total_spent = total_spent + ABS(NEW.amount),
            last_updated = CURRENT_TIMESTAMP,
            updated_by = NEW.created_by
        WHERE id = 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for safe state updates
CREATE TRIGGER update_safe_state_trigger 
    AFTER INSERT ON safe_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_safe_state();

-- ====================================
-- 11. INITIAL DATA
-- ====================================

-- Insert safe state initial record
INSERT INTO safe_state (id, current_balance, total_funded, total_spent) 
VALUES (1, 0, 0, 0);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, role, full_name, email) VALUES 
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgOUhCGH0rKgCKW', 'admin', 'المدير العام', 'admin@qs-financial.com');

-- Insert default data entry user (password: dataentry123)
INSERT INTO users (username, password_hash, role, full_name, email) VALUES 
('dataentry', '$2b$12$92IXUNpkjO0rOQ5byMNHQeGYTM0rOv20nkjXOEaIYmMDy4zGBGm', 'data_entry', 'موظف إدخال البيانات', 'dataentry@qs-financial.com'); 