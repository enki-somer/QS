-- Project Employees and Salary Payments Schema (idempotent)

-- Table: project_employees
CREATE TABLE IF NOT EXISTS project_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  monthly_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_employees_project_id ON project_employees(project_id);
-- Prevent duplicate employees per project by name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_project_employees_project_name'
  ) THEN
    CREATE UNIQUE INDEX uq_project_employees_project_name ON project_employees(project_id, name);
  END IF;
END$$;

-- Link project employees to contractors table (dropdown selection) and prevent duplicates per project
ALTER TABLE project_employees
  ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_project_employees_project_contractor'
  ) THEN
    CREATE UNIQUE INDEX uq_project_employees_project_contractor ON project_employees(project_id, contractor_id);
  END IF;
END$$;

-- Table: project_employee_salary_payments
CREATE TABLE IF NOT EXISTS project_employee_salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_employee_id UUID NOT NULL REFERENCES project_employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_amount NUMERIC(14,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('full','installment')),
  installment_amount NUMERIC(14,2),
  month_year TEXT NOT NULL, -- YYYY-MM
  is_full_payment BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proj_emp_salary_month ON project_employee_salary_payments(project_id, month_year);

-- Extend safe_transactions type information if needed (project salary)
-- We will use existing safe_transactions table and insert type 'project_salary'
-- Ensure application logic supports this type; no schema change required if 'type' is TEXT


