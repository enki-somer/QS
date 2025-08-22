--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'payment'
);


ALTER TYPE public.audit_action OWNER TO postgres;

--
-- Name: contractor_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contractor_category AS ENUM (
    'main_contractor',
    'sub_contractor',
    'building_materials_supplier',
    'equipment_supplier',
    'transport_services',
    'engineering_consultant',
    'specialized_technical_services',
    'other'
);


ALTER TYPE public.contractor_category OWNER TO postgres;

--
-- Name: employee_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.employee_status AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public.employee_status OWNER TO postgres;

--
-- Name: expense_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expense_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.expense_status OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_status AS ENUM (
    'pending_approval',
    'approved',
    'paid',
    'rejected'
);


ALTER TYPE public.invoice_status OWNER TO postgres;

--
-- Name: project_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE public.project_status OWNER TO postgres;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transaction_type AS ENUM (
    'funding',
    'invoice_payment',
    'salary_payment',
    'general_expense'
);


ALTER TYPE public.transaction_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'data_entry'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: deduct_from_safe_for_invoice(numeric, uuid, character varying, uuid, character varying, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.deduct_from_safe_for_invoice(invoice_amount numeric, project_id_param uuid, project_name_param character varying, invoice_id_param uuid, invoice_number_param character varying, user_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.deduct_from_safe_for_invoice(invoice_amount numeric, project_id_param uuid, project_name_param character varying, invoice_id_param uuid, invoice_number_param character varying, user_id_param uuid) OWNER TO postgres;

--
-- Name: prevent_approved_category_edit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_approved_category_edit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Prevent ANY editing if category has approved invoices
    -- This is the original strict protection that was working perfectly
    IF OLD.has_approved_invoice = TRUE THEN
        RAISE EXCEPTION 'Cannot edit category assignment with approved invoices. Assignment ID: %', OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_approved_category_edit() OWNER TO postgres;

--
-- Name: FUNCTION prevent_approved_category_edit(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.prevent_approved_category_edit() IS 'STRICT: Prevents ANY editing of assignments with approved invoices - original working system';


--
-- Name: set_general_expense_approval_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_general_expense_approval_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If status is changing to approved, set approved_at
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = CURRENT_TIMESTAMP;
  END IF;
  
  -- If status is changing away from approved, clear approved_at
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    NEW.approved_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_general_expense_approval_timestamp() OWNER TO postgres;

--
-- Name: update_category_assignment_on_invoice_approval(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_category_assignment_on_invoice_approval() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When invoice is approved or paid, update the category assignment actual spending
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
        
        -- This will trigger the project spending update automatically via the existing trigger
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_category_assignment_on_invoice_approval() OWNER TO postgres;

--
-- Name: update_general_expenses_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_general_expenses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_general_expenses_updated_at() OWNER TO postgres;

--
-- Name: update_project_allocation_on_assignment_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_project_allocation_on_assignment_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_project_allocation_on_assignment_change() OWNER TO postgres;

--
-- Name: update_project_spending_on_assignment_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_project_spending_on_assignment_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_project_spending_on_assignment_change() OWNER TO postgres;

--
-- Name: update_safe_state(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_safe_state() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
$$;


ALTER FUNCTION public.update_safe_state() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_invoice_against_assignment(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_invoice_against_assignment(assignment_id_param uuid, invoice_amount_param numeric) RETURNS TABLE(is_valid boolean, message text, estimated_amount numeric, actual_amount numeric, remaining_budget numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
    assignment_record RECORD;
    remaining DECIMAL(15,2);
BEGIN
    -- Get assignment details
    SELECT * INTO assignment_record
    FROM project_category_assignments 
    WHERE id = assignment_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Assignment not found', 0::DECIMAL(15,2), 0::DECIMAL(15,2), 0::DECIMAL(15,2);
        RETURN;
    END IF;
    
    -- Calculate remaining budget
    remaining := assignment_record.estimated_amount - COALESCE(assignment_record.actual_amount, 0);
    
    -- Check if invoice amount exceeds remaining budget
    IF invoice_amount_param > remaining THEN
        RETURN QUERY SELECT 
            FALSE, 
            'Invoice amount exceeds remaining assignment budget',
            assignment_record.estimated_amount,
            COALESCE(assignment_record.actual_amount, 0),
            remaining;
    ELSE
        RETURN QUERY SELECT 
            TRUE, 
            'Invoice amount is within budget',
            assignment_record.estimated_amount,
            COALESCE(assignment_record.actual_amount, 0),
            remaining;
    END IF;
END;
$$;


ALTER FUNCTION public.validate_invoice_against_assignment(assignment_id_param uuid, invoice_amount_param numeric) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id uuid NOT NULL,
    action public.audit_action NOT NULL,
    old_data jsonb,
    new_data jsonb,
    user_id uuid,
    user_name character varying(100),
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid,
    invoice_number character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    subtotal numeric(15,2) DEFAULT 0,
    tax_percentage numeric(5,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    date date NOT NULL,
    due_date date,
    payment_terms text,
    notes text,
    status public.invoice_status DEFAULT 'pending_approval'::public.invoice_status,
    submitted_by uuid,
    approved_by uuid,
    approved_at timestamp without time zone,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category_assignment_id uuid,
    category_name character varying(100),
    subcategory_name character varying(200)
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: COLUMN invoices.category_assignment_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.category_assignment_id IS 'Links invoice to specific project category assignment';


--
-- Name: project_category_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_category_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid,
    main_category character varying(100) NOT NULL,
    subcategory character varying(200) NOT NULL,
    contractor_id uuid,
    contractor_name character varying(150),
    estimated_amount numeric(15,2) DEFAULT 0 NOT NULL,
    actual_amount numeric(15,2) DEFAULT 0,
    notes text,
    status character varying(20) DEFAULT 'planned'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    has_approved_invoice boolean DEFAULT false,
    invoice_count integer DEFAULT 0,
    last_invoice_date date,
    budget_exhausted boolean DEFAULT false
);


ALTER TABLE public.project_category_assignments OWNER TO postgres;

--
-- Name: COLUMN project_category_assignments.has_approved_invoice; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_category_assignments.has_approved_invoice IS 'Indicates assignment has approved invoices - protects business fields only';


--
-- Name: category_invoice_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.category_invoice_status AS
 SELECT pca.id AS assignment_id,
    pca.project_id,
    pca.main_category,
    pca.subcategory,
    pca.contractor_name,
    pca.estimated_amount,
    pca.actual_amount,
    pca.has_approved_invoice,
    pca.invoice_count,
    pca.last_invoice_date,
    pca.status AS assignment_status,
        CASE
            WHEN pca.has_approved_invoice THEN 'locked'::text
            ELSE 'editable'::text
        END AS edit_status,
    count(i.id) AS total_invoices,
    sum(
        CASE
            WHEN (i.status = 'pending_approval'::public.invoice_status) THEN 1
            ELSE 0
        END) AS pending_invoices,
    sum(
        CASE
            WHEN (i.status = 'approved'::public.invoice_status) THEN 1
            ELSE 0
        END) AS approved_invoices,
    sum(
        CASE
            WHEN (i.status = 'paid'::public.invoice_status) THEN 1
            ELSE 0
        END) AS paid_invoices,
    sum(
        CASE
            WHEN (i.status = 'rejected'::public.invoice_status) THEN 1
            ELSE 0
        END) AS rejected_invoices
   FROM (public.project_category_assignments pca
     LEFT JOIN public.invoices i ON ((pca.id = i.category_assignment_id)))
  GROUP BY pca.id, pca.project_id, pca.main_category, pca.subcategory, pca.contractor_name, pca.estimated_amount, pca.actual_amount, pca.has_approved_invoice, pca.invoice_count, pca.last_invoice_date, pca.status;


ALTER VIEW public.category_invoice_status OWNER TO postgres;

--
-- Name: VIEW category_invoice_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.category_invoice_status IS 'Enhanced view showing budget status and invoice availability for assignments';


--
-- Name: contractors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contractors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(150) NOT NULL,
    phone_number character varying(20) NOT NULL,
    category public.contractor_category NOT NULL,
    notes text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contractors OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(100),
    status public.employee_status DEFAULT 'active'::public.employee_status,
    base_salary numeric(12,2) DEFAULT 0 NOT NULL,
    daily_bonus numeric(10,2) DEFAULT 0,
    overtime_pay numeric(10,2) DEFAULT 0,
    deductions numeric(10,2) DEFAULT 0,
    join_date date NOT NULL,
    assigned_project_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: general_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.general_expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    expense_name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    cost numeric(15,2) NOT NULL,
    details text,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    receipt_url character varying(500),
    status public.expense_status DEFAULT 'pending'::public.expense_status,
    submitted_by uuid,
    approved_by uuid,
    approved_at timestamp without time zone,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT general_expenses_cost_check CHECK ((cost >= (0)::numeric))
);


ALTER TABLE public.general_expenses OWNER TO postgres;

--
-- Name: TABLE general_expenses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.general_expenses IS 'Stores general expenses for projects that are deducted from safe when approved';


--
-- Name: COLUMN general_expenses.project_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.project_id IS 'Links expense to specific project for budget tracking';


--
-- Name: COLUMN general_expenses.expense_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.expense_name IS 'Name/description of the expense (e.g., Office supplies, Fuel, Tools)';


--
-- Name: COLUMN general_expenses.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.category IS 'Category of expense (e.g., Materials, Transportation, Equipment)';


--
-- Name: COLUMN general_expenses.cost; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.cost IS 'Cost of the expense in Iraqi Dinars';


--
-- Name: COLUMN general_expenses.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.details IS 'Additional details about the expense';


--
-- Name: COLUMN general_expenses.expense_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.expense_date IS 'Date when the expense occurred';


--
-- Name: COLUMN general_expenses.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.status IS 'Approval status: pending, approved, or rejected';


--
-- Name: COLUMN general_expenses.approved_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.approved_by IS 'User who approved the expense';


--
-- Name: COLUMN general_expenses.approved_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.general_expenses.approved_at IS 'Timestamp when the expense was approved';


--
-- Name: invoice_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoice_attachments OWNER TO postgres;

--
-- Name: invoice_custom_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_custom_fields (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid,
    field_label character varying(100) NOT NULL,
    field_value text,
    field_type character varying(20) DEFAULT 'text'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoice_custom_fields OWNER TO postgres;

--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_line_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid,
    description text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoice_line_items OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    location character varying(200),
    area numeric(10,2),
    budget_estimate numeric(15,2) DEFAULT 0,
    client character varying(150),
    start_date date,
    end_date date,
    status public.project_status DEFAULT 'planning'::public.project_status,
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    allocated_budget numeric(15,2) DEFAULT 0,
    available_budget numeric(15,2) DEFAULT 0,
    spent_budget numeric(15,2) DEFAULT 0
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: COLUMN projects.allocated_budget; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.allocated_budget IS 'Total budget allocated to contractor assignments';


--
-- Name: COLUMN projects.available_budget; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.available_budget IS 'Remaining budget available for new assignments';


--
-- Name: COLUMN projects.spent_budget; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.spent_budget IS 'Total amount actually spent (approved invoices + approved expenses)';


--
-- Name: safe_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.safe_state (
    id integer DEFAULT 1 NOT NULL,
    current_balance numeric(15,2) DEFAULT 0 NOT NULL,
    total_funded numeric(15,2) DEFAULT 0 NOT NULL,
    total_spent numeric(15,2) DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    CONSTRAINT single_row_check CHECK ((id = 1))
);


ALTER TABLE public.safe_state OWNER TO postgres;

--
-- Name: safe_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.safe_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.transaction_type NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    project_id uuid,
    project_name character varying(200),
    invoice_id uuid,
    invoice_number character varying(50),
    employee_id uuid,
    employee_name character varying(100),
    expense_id uuid,
    previous_balance numeric(15,2) NOT NULL,
    new_balance numeric(15,2) NOT NULL,
    funding_source character varying(100),
    funding_notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.safe_transactions OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'data_entry'::public.user_role NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(100),
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, table_name, record_id, action, old_data, new_data, user_id, user_name, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: contractors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contractors (id, full_name, phone_number, category, notes, is_active, created_by, created_at, updated_at) FROM stdin;
e5c19cab-7ef5-46a7-b8c2-ad7ce6f84b91	ali	305803847323	main_contractor	\N	t	\N	2025-08-09 16:24:39.097155	2025-08-09 16:24:39.097155
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, name, role, status, base_salary, daily_bonus, overtime_pay, deductions, join_date, assigned_project_id, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: general_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.general_expenses (id, project_id, expense_name, category, cost, details, expense_date, receipt_url, status, submitted_by, approved_by, approved_at, rejection_reason, created_at, updated_at) FROM stdin;
b863b46a-f829-4b95-ab96-d61e525546d5	5d8b732b-ed50-4faf-916c-7e5b0d730869	dataentry	Office Equipment	20000.00	\N	2025-08-09	\N	approved	e2eb7265-be28-446f-9e8f-c66ee25644f9	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:48:08.476457	\N	2025-08-09 16:47:47.385486	2025-08-09 16:48:08.476457
7f03712b-7bfd-43f2-ba48-6b5da549e7b5	f9449dca-a408-4c30-be80-50ce34d0cc76	dinner	Project Expense	25000.00	\N	2025-08-09	\N	approved	e2eb7265-be28-446f-9e8f-c66ee25644f9	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:58:28.667661	\N	2025-08-09 16:58:20.838359	2025-08-09 16:58:28.667661
\.


--
-- Data for Name: invoice_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_attachments (id, invoice_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_custom_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_custom_fields (id, invoice_id, field_label, field_value, field_type, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_line_items (id, invoice_id, description, quantity, unit_price, total, created_at) FROM stdin;
403f7172-e360-47d1-af1d-c02b67b972c1	6fb7f428-2567-4109-a6ef-977cf86e7fd6	qqq - 1 قطعة - 10,000 د.ع	1.00	10000.00	10000.00	2025-08-09 16:26:22.059024
8cc0b200-f3f7-41f3-8829-9f4b851b37f1	7aaeee1f-c77d-4773-9167-4a54991198d1	nnn - 1 قطعة - 5,000 د.ع	1.00	5000.00	5000.00	2025-08-09 16:31:02.422434
f7e2ad82-f26f-4fe3-8846-5c6e86464170	c17ee3bf-da8e-468a-b021-1f55c234d3c6	bbb - 1 قطعة - 25,000 د.ع	1.00	25000.00	25000.00	2025-08-09 16:57:54.478618
fd447ff3-1373-4f9a-80c6-ef144614d24b	d9c17ded-c6e3-4c0a-866f-934a6e09a89b	أعمال تنفيذية وإنشائية - 1 قطعة - 30,000 د.ع	1.00	30000.00	30000.00	2025-08-09 17:01:13.083561
7c6a1a77-b249-4ebe-b152-f41ab2ef0018	b20b7863-3b9a-410b-aac5-1c35219d4ae4	GGG - 1 قطعة - 40,000 د.ع	1.00	40000.00	40000.00	2025-08-09 17:13:03.460917
35bbc80e-0d00-4c21-affd-8a188cf3a9a7	277128ad-287d-486c-b60a-4ba6a29dd0ff	assss - 1 قطعة - 30,000 د.ع	1.00	30000.00	30000.00	2025-08-10 11:22:42.341046
19aa97ad-0244-4422-930a-9ece0987f927	eda971a2-e821-4765-b965-672c8f2bdbc8	xxx - 1 قطعة - 10,000 د.ع	1.00	10000.00	10000.00	2025-08-10 11:33:32.93392
67ba035e-0d85-42f1-abf9-34834d3784e5	98ffa152-e60a-4bf4-b01a-df5386f894bd	عباس - 1 قطعة - 15,000 د.ع	1.00	15000.00	15000.00	2025-08-10 11:34:54.04335
be148db5-605d-42c0-8ad2-680ab0405951	e9e69ea5-3f85-4087-94b1-f19b0092b3b6	ss - 1 قطعة - 10,000 د.ع	1.00	10000.00	10000.00	2025-08-10 11:42:44.100773
72415715-b1d6-4dc9-bccd-c3a354d3987e	7e121971-5374-4afb-826a-1d1ceced8c2e	newww - 1 قطعة - 10,000 د.ع	1.00	10000.00	10000.00	2025-08-10 11:46:09.353552
e3efb911-ffe9-4729-ab31-adda96434b92	179e852d-fe85-4748-bc3d-4e60f4c70904	ww - 1 قطعة - 12,000 د.ع	1.00	12000.00	12000.00	2025-08-10 11:57:40.634033
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, project_id, invoice_number, amount, subtotal, tax_percentage, tax_amount, discount_amount, date, due_date, payment_terms, notes, status, submitted_by, approved_by, approved_at, rejection_reason, created_at, updated_at, category_assignment_id, category_name, subcategory_name) FROM stdin;
6fb7f428-2567-4109-a6ef-977cf86e7fd6	5d8b732b-ed50-4faf-916c-7e5b0d730869	PRJ-202508-001-أعمال-20250809-16269	10000.00	10000.00	0.00	0.00	0.00	2025-08-09	\N	\N		approved	e2eb7265-be28-446f-9e8f-c66ee25644f9	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:26:25.962286	\N	2025-08-09 16:26:22.059024	2025-08-09 16:26:25.962286	9ced45db-07a5-4994-b971-85af66131026	أعمال تنفيذية وإنشائية	تنفيذ الجلي
7aaeee1f-c77d-4773-9167-4a54991198d1	5d8b732b-ed50-4faf-916c-7e5b0d730869	PRJ-202508-001-أعمال-20250809-163045	5000.00	5000.00	0.00	0.00	0.00	2025-08-09	\N	\N		approved	e2eb7265-be28-446f-9e8f-c66ee25644f9	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:31:07.013417	\N	2025-08-09 16:31:02.422434	2025-08-09 16:31:07.013417	9ced45db-07a5-4994-b971-85af66131026	أعمال تنفيذية وإنشائية	تنفيذ الجلي
c17ee3bf-da8e-468a-b021-1f55c234d3c6	f9449dca-a408-4c30-be80-50ce34d0cc76	PRJ-202508-002-أعمال-20250809-165739	25000.00	25000.00	0.00	0.00	0.00	2025-08-09	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-09 16:57:54.478618	2025-08-09 16:57:54.478618	c3ddc8fc-0bef-4ae3-9eb6-632545311407	أعمال تنفيذية وإنشائية	تنفيذ اللبخ
d9c17ded-c6e3-4c0a-866f-934a6e09a89b	f9449dca-a408-4c30-be80-50ce34d0cc76	PRJ-202508-002-أعمال-20250809-17057	30000.00	30000.00	0.00	0.00	0.00	2025-08-09	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-09 17:01:13.083561	2025-08-09 17:01:13.083561	c3ddc8fc-0bef-4ae3-9eb6-632545311407	أعمال تنفيذية وإنشائية	تنفيذ اللبخ
b20b7863-3b9a-410b-aac5-1c35219d4ae4	f9449dca-a408-4c30-be80-50ce34d0cc76	PRJ-202508-002-أعمال-20250809-171249	40000.00	40000.00	0.00	0.00	0.00	2025-08-09	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-09 17:13:03.460917	2025-08-09 17:13:03.460917	c3ddc8fc-0bef-4ae3-9eb6-632545311407	أعمال تنفيذية وإنشائية	تنفيذ اللبخ
277128ad-287d-486c-b60a-4ba6a29dd0ff	f9449dca-a408-4c30-be80-50ce34d0cc76	PRJ-202508-002-أعمال-20250810-112219	30000.00	30000.00	0.00	0.00	0.00	2025-08-10	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-10 11:22:42.341046	2025-08-10 11:22:42.341046	c3ddc8fc-0bef-4ae3-9eb6-632545311407	أعمال تنفيذية وإنشائية	تنفيذ اللبخ
eda971a2-e821-4765-b965-672c8f2bdbc8	f9449dca-a408-4c30-be80-50ce34d0cc76	PRJ-202508-002-أعمال-20250810-113321	10000.00	10000.00	0.00	0.00	0.00	2025-08-10	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-10 11:33:32.93392	2025-08-10 11:33:32.93392	c3ddc8fc-0bef-4ae3-9eb6-632545311407	أعمال تنفيذية وإنشائية	تنفيذ اللبخ
98ffa152-e60a-4bf4-b01a-df5386f894bd	f9449dca-a408-4c30-be80-50ce34d0cc76	PRJ-202508-002-تجهيز-20250810-113418	15000.00	15000.00	0.00	0.00	0.00	2025-08-10	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-10 11:34:54.04335	2025-08-10 11:34:54.04335	75f9bc4f-a56b-4586-ba40-e2f9ba277cff	تجهيز مواد البناء والتشطيب	تجهيز مادة الرمل
e9e69ea5-3f85-4087-94b1-f19b0092b3b6	5d8b732b-ed50-4faf-916c-7e5b0d730869	PRJ-202508-001-أعمال-20250810-114230	10000.00	10000.00	0.00	0.00	0.00	2025-08-10	\N	\N		pending_approval	e2eb7265-be28-446f-9e8f-c66ee25644f9	\N	\N	\N	2025-08-10 11:42:44.100773	2025-08-10 11:42:44.100773	903d6a0c-a4d0-408a-b59e-6de3f44a4ed5	أعمال متخصصة وتنفيذ متكامل	تجهيز وتنفيذ الألمنيوم الداخلية والأبواب
7e121971-5374-4afb-826a-1d1ceced8c2e	5d8b732b-ed50-4faf-916c-7e5b0d730869	PRJ-202508-001-أعمال-20250810-114556	10000.00	10000.00	0.00	0.00	0.00	2025-08-10	\N	\N		approved	e2eb7265-be28-446f-9e8f-c66ee25644f9	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:46:12.571968	\N	2025-08-10 11:46:09.353552	2025-08-10 11:46:12.571968	903d6a0c-a4d0-408a-b59e-6de3f44a4ed5	أعمال متخصصة وتنفيذ متكامل	تجهيز وتنفيذ الألمنيوم الداخلية والأبواب
179e852d-fe85-4748-bc3d-4e60f4c70904	5d8b732b-ed50-4faf-916c-7e5b0d730869	PRJ-202508-001-أعمال-20250810-115727	12000.00	12000.00	0.00	0.00	0.00	2025-08-10	\N	\N		approved	e2eb7265-be28-446f-9e8f-c66ee25644f9	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:57:43.80137	\N	2025-08-10 11:57:40.634033	2025-08-10 11:57:43.80137	290727e8-8325-40d9-8e20-94407c273865	أعمال متخصصة وتنفيذ متكامل	تجهيز وتنفيذ محولة الكهرباء
\.


--
-- Data for Name: project_category_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_category_assignments (id, project_id, main_category, subcategory, contractor_id, contractor_name, estimated_amount, actual_amount, notes, status, created_by, created_at, updated_at, has_approved_invoice, invoice_count, last_invoice_date, budget_exhausted) FROM stdin;
9ced45db-07a5-4994-b971-85af66131026	5d8b732b-ed50-4faf-916c-7e5b0d730869	أعمال تنفيذية وإنشائية	تنفيذ الجلي	e5c19cab-7ef5-46a7-b8c2-ad7ce6f84b91	ali	50000.00	15000.00	\N	planned	\N	2025-08-09 16:25:05.282204	2025-08-09 16:31:07.013417	t	4	2025-08-09	f
c3ddc8fc-0bef-4ae3-9eb6-632545311407	f9449dca-a408-4c30-be80-50ce34d0cc76	أعمال تنفيذية وإنشائية	تنفيذ اللبخ	e5c19cab-7ef5-46a7-b8c2-ad7ce6f84b91	ali	100000.00	0.00	\N	planned	\N	2025-08-09 16:57:37.230321	2025-08-10 11:33:32.93392	f	5	\N	f
75f9bc4f-a56b-4586-ba40-e2f9ba277cff	f9449dca-a408-4c30-be80-50ce34d0cc76	تجهيز مواد البناء والتشطيب	تجهيز مادة الرمل	e5c19cab-7ef5-46a7-b8c2-ad7ce6f84b91	ali	20000.00	0.00	\N	planned	\N	2025-08-10 11:34:12.42507	2025-08-10 11:34:54.04335	f	1	\N	f
903d6a0c-a4d0-408a-b59e-6de3f44a4ed5	5d8b732b-ed50-4faf-916c-7e5b0d730869	أعمال متخصصة وتنفيذ متكامل	تجهيز وتنفيذ الألمنيوم الداخلية والأبواب	e5c19cab-7ef5-46a7-b8c2-ad7ce6f84b91	ali	20000.00	10000.00	\N	planned	\N	2025-08-10 11:42:20.093699	2025-08-10 11:46:12.571968	t	3	2025-08-10	f
290727e8-8325-40d9-8e20-94407c273865	5d8b732b-ed50-4faf-916c-7e5b0d730869	أعمال متخصصة وتنفيذ متكامل	تجهيز وتنفيذ محولة الكهرباء	e5c19cab-7ef5-46a7-b8c2-ad7ce6f84b91	ali	44000.00	12000.00	\N	planned	\N	2025-08-10 11:57:24.943585	2025-08-10 11:57:43.80137	t	2	2025-08-10	f
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, code, location, area, budget_estimate, client, start_date, end_date, status, notes, created_by, created_at, updated_at, allocated_budget, available_budget, spent_budget) FROM stdin;
f9449dca-a408-4c30-be80-50ce34d0cc76	sas	PRJ-202508-002	dorah	20000.00	200000.00	ahmed	2025-08-09	2025-09-06	planning	\N	\N	2025-08-09 16:56:46.389763	2025-08-10 11:55:28.936987	120000.00	80000.00	0.00
5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	PRJ-202508-001	بسكت	20000.00	100000.00	ahmed	2025-08-09	2025-09-06	planning	\N	\N	2025-08-09 16:24:13.91573	2025-08-10 11:57:43.80137	114000.00	-14000.00	37000.00
\.


--
-- Data for Name: safe_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.safe_state (id, current_balance, total_funded, total_spent, last_updated, updated_by) FROM stdin;
1	757000.00	1000000.00	415000.00	2025-08-10 11:57:43.819807	e2eb7265-be28-446f-9e8f-c66ee25644f9
\.


--
-- Data for Name: safe_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.safe_transactions (id, type, amount, description, date, project_id, project_name, invoice_id, invoice_number, employee_id, employee_name, expense_id, previous_balance, new_balance, funding_source, funding_notes, created_by, created_at) FROM stdin;
7dc0d54c-8176-4f14-a18f-acaa54c2e46f	funding	1000000.00	ديون	2025-08-09	\N	\N	\N	\N	\N	\N	\N	0.00	1000000.00	manual	ديون	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:23:42.420527
65797cd1-ac49-4616-adba-76440221ecad	invoice_payment	1000.00	Invoice payment for kissy	2025-08-09	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	6fb7f428-2567-4109-a6ef-977cf86e7fd6	TEST-INV-001	\N	\N	\N	1000000.00	999000.00	\N	\N	1f083362-3b40-4129-b6b6-4985aa90ca52	2025-08-09 16:46:19.018774
264a57d9-f32d-4130-bee9-9100aeb8a12d	invoice_payment	10000.00	Invoice payment for kissy	2025-08-09	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	6fb7f428-2567-4109-a6ef-977cf86e7fd6	PRJ-202508-001-أعمال-20250809-16269	\N	\N	\N	999000.00	989000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:46:37.112073
4f6ddcab-2bc3-45b6-9526-f17573f925cb	invoice_payment	5000.00	Invoice payment for kissy	2025-08-09	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	7aaeee1f-c77d-4773-9167-4a54991198d1	PRJ-202508-001-أعمال-20250809-163045	\N	\N	\N	989000.00	984000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:46:40.968372
e88ac743-1eea-4d80-a61d-47b679c0177b	general_expense	-20000.00	Office Equipment: dataentry - kissy	2025-08-09	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	\N	\N	\N	\N	b863b46a-f829-4b95-ab96-d61e525546d5	984000.00	964000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:48:08.476457
ef64fd83-ec17-473d-9955-7a18bef49f82	invoice_payment	25000.00	Invoice payment for مشروع f9449dca-a408-4c30-be80-50ce34d0cc76	2025-08-09	f9449dca-a408-4c30-be80-50ce34d0cc76	مشروع f9449dca-a408-4c30-be80-50ce34d0cc76	c17ee3bf-da8e-468a-b021-1f55c234d3c6	PRJ-202508-002-أعمال-20250809-165739	\N	\N	\N	964000.00	939000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:57:57.953276
8f82525f-c4e2-47ac-abcb-505b7e2c1f47	general_expense	-25000.00	Project Expense: dinner - sas	2025-08-09	f9449dca-a408-4c30-be80-50ce34d0cc76	sas	\N	\N	\N	\N	7f03712b-7bfd-43f2-ba48-6b5da549e7b5	939000.00	914000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 16:58:28.667661
7e6044ee-38cb-4fe4-bfb9-3ba289a03ef5	invoice_payment	30000.00	Invoice payment for sas	2025-08-09	f9449dca-a408-4c30-be80-50ce34d0cc76	sas	d9c17ded-c6e3-4c0a-866f-934a6e09a89b	PRJ-202508-002-أعمال-20250809-17057	\N	\N	\N	914000.00	884000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 17:01:20.404169
6940f626-a515-4605-8ebb-40ae8239a4d2	invoice_payment	-40000.00	Invoice payment for sas	2025-08-09	f9449dca-a408-4c30-be80-50ce34d0cc76	sas	b20b7863-3b9a-410b-aac5-1c35219d4ae4	PRJ-202508-002-أعمال-20250809-171249	\N	\N	\N	884000.00	844000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-09 17:13:06.969944
221519d4-fe0d-423f-b951-dbbb4a910af3	invoice_payment	-30000.00	Invoice payment for sas	2025-08-10	f9449dca-a408-4c30-be80-50ce34d0cc76	sas	277128ad-287d-486c-b60a-4ba6a29dd0ff	PRJ-202508-002-أعمال-20250810-112219	\N	\N	\N	844000.00	814000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:22:45.993335
05087171-aada-4950-8709-344a86d56882	invoice_payment	-10000.00	Invoice payment for sas	2025-08-10	f9449dca-a408-4c30-be80-50ce34d0cc76	sas	eda971a2-e821-4765-b965-672c8f2bdbc8	PRJ-202508-002-أعمال-20250810-113321	\N	\N	\N	814000.00	804000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:33:36.383242
0f7d642a-14b9-4930-ad24-498fed4ee463	invoice_payment	-15000.00	Invoice payment for sas	2025-08-10	f9449dca-a408-4c30-be80-50ce34d0cc76	sas	98ffa152-e60a-4bf4-b01a-df5386f894bd	PRJ-202508-002-تجهيز-20250810-113418	\N	\N	\N	804000.00	789000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:35:09.984514
ac28ec50-2dbd-4e4e-85d3-430271f7b9f5	invoice_payment	-10000.00	Invoice payment for kissy	2025-08-10	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	e9e69ea5-3f85-4087-94b1-f19b0092b3b6	PRJ-202508-001-أعمال-20250810-114230	\N	\N	\N	789000.00	779000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:42:51.016043
25e83ca5-ab93-4655-82ed-7914d02e36d0	invoice_payment	-10000.00	Invoice payment for kissy	2025-08-10	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	7e121971-5374-4afb-826a-1d1ceced8c2e	PRJ-202508-001-أعمال-20250810-114556	\N	\N	\N	779000.00	769000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:46:12.594168
f3f120b7-24de-4ece-9fd5-02dc8599fb36	invoice_payment	-12000.00	Invoice payment for kissy	2025-08-10	5d8b732b-ed50-4faf-916c-7e5b0d730869	kissy	179e852d-fe85-4748-bc3d-4e60f4c70904	PRJ-202508-001-أعمال-20250810-115727	\N	\N	\N	769000.00	757000.00	\N	\N	e2eb7265-be28-446f-9e8f-c66ee25644f9	2025-08-10 11:57:43.819807
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, token_hash, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, role, full_name, email, is_active, last_login, created_at, updated_at) FROM stdin;
1f083362-3b40-4129-b6b6-4985aa90ca52	dataentry	$2a$12$tJkMr9SflBcHd8LkZSXovOWQKlCDUrv8A10fu7fOmql6oByQv4efO	data_entry	Data Entry User	dataentry@financial-system.com	t	2025-08-03 10:46:36.815135	2025-07-31 15:41:21.322064	2025-08-03 10:46:36.815135
e2eb7265-be28-446f-9e8f-c66ee25644f9	admin	$2a$12$TDT98j5czg5cWUv4gUv8IOESFaFCh69SHUOH14YfupfkzZM.dVGxi	admin	Administrator	admin@qs-financial.com	t	2025-08-10 11:56:38.358927	2025-07-30 21:43:48.568039	2025-08-10 11:56:38.358927
\.


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: contractors contractors_full_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_full_name_key UNIQUE (full_name);


--
-- Name: contractors contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: general_expenses general_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.general_expenses
    ADD CONSTRAINT general_expenses_pkey PRIMARY KEY (id);


--
-- Name: invoice_attachments invoice_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_attachments
    ADD CONSTRAINT invoice_attachments_pkey PRIMARY KEY (id);


--
-- Name: invoice_custom_fields invoice_custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_custom_fields
    ADD CONSTRAINT invoice_custom_fields_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: project_category_assignments project_category_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_category_assignments
    ADD CONSTRAINT project_category_assignments_pkey PRIMARY KEY (id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: safe_state safe_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_state
    ADD CONSTRAINT safe_state_pkey PRIMARY KEY (id);


--
-- Name: safe_transactions safe_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_transactions
    ADD CONSTRAINT safe_transactions_pkey PRIMARY KEY (id);


--
-- Name: project_category_assignments unique_project_category_contractor; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_category_assignments
    ADD CONSTRAINT unique_project_category_contractor UNIQUE (project_id, main_category, subcategory, contractor_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_table_record ON public.audit_log USING btree (table_name, record_id);


--
-- Name: idx_audit_log_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_user ON public.audit_log USING btree (user_id);


--
-- Name: idx_contractors_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contractors_active ON public.contractors USING btree (is_active);


--
-- Name: idx_contractors_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contractors_category ON public.contractors USING btree (category);


--
-- Name: idx_contractors_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contractors_created_by ON public.contractors USING btree (created_by);


--
-- Name: idx_contractors_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contractors_name ON public.contractors USING btree (full_name);


--
-- Name: idx_employees_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_created_by ON public.employees USING btree (created_by);


--
-- Name: idx_employees_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_project ON public.employees USING btree (assigned_project_id);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_general_expenses_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_general_expenses_category ON public.general_expenses USING btree (category);


--
-- Name: idx_general_expenses_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_general_expenses_created_at ON public.general_expenses USING btree (created_at);


--
-- Name: idx_general_expenses_expense_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_general_expenses_expense_date ON public.general_expenses USING btree (expense_date);


--
-- Name: idx_general_expenses_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_general_expenses_project_id ON public.general_expenses USING btree (project_id);


--
-- Name: idx_general_expenses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_general_expenses_status ON public.general_expenses USING btree (status);


--
-- Name: idx_general_expenses_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_general_expenses_submitted_by ON public.general_expenses USING btree (submitted_by);


--
-- Name: idx_invoices_category_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_category_assignment ON public.invoices USING btree (category_assignment_id);


--
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_date ON public.invoices USING btree (date);


--
-- Name: idx_invoices_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);


--
-- Name: idx_invoices_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_submitted_by ON public.invoices USING btree (submitted_by);


--
-- Name: idx_project_categories_contractor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_categories_contractor ON public.project_category_assignments USING btree (contractor_id);


--
-- Name: idx_project_categories_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_categories_created_by ON public.project_category_assignments USING btree (created_by);


--
-- Name: idx_project_categories_main; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_categories_main ON public.project_category_assignments USING btree (main_category);


--
-- Name: idx_project_categories_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_categories_project ON public.project_category_assignments USING btree (project_id);


--
-- Name: idx_project_categories_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_categories_status ON public.project_category_assignments USING btree (status);


--
-- Name: idx_projects_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_code ON public.projects USING btree (code);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_projects_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_dates ON public.projects USING btree (start_date, end_date);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_safe_transactions_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safe_transactions_created_by ON public.safe_transactions USING btree (created_by);


--
-- Name: idx_safe_transactions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safe_transactions_date ON public.safe_transactions USING btree (date);


--
-- Name: idx_safe_transactions_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safe_transactions_employee ON public.safe_transactions USING btree (employee_id);


--
-- Name: idx_safe_transactions_expense; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safe_transactions_expense ON public.safe_transactions USING btree (expense_id);


--
-- Name: idx_safe_transactions_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safe_transactions_project ON public.safe_transactions USING btree (project_id);


--
-- Name: idx_safe_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safe_transactions_type ON public.safe_transactions USING btree (type);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: general_expenses trg_general_expense_approval_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_general_expense_approval_timestamp BEFORE UPDATE ON public.general_expenses FOR EACH ROW EXECUTE FUNCTION public.set_general_expense_approval_timestamp();


--
-- Name: general_expenses trg_general_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_general_expenses_updated_at BEFORE UPDATE ON public.general_expenses FOR EACH ROW EXECUTE FUNCTION public.update_general_expenses_updated_at();


--
-- Name: invoices trg_invoice_approval_update_category; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_invoice_approval_update_category AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_category_assignment_on_invoice_approval();


--
-- Name: project_category_assignments trg_prevent_approved_category_edit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_approved_category_edit BEFORE UPDATE ON public.project_category_assignments FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_category_edit();


--
-- Name: TRIGGER trg_prevent_approved_category_edit ON project_category_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trg_prevent_approved_category_edit ON public.project_category_assignments IS 'STRICT: Complete protection against editing approved assignments';


--
-- Name: project_category_assignments trg_update_project_allocation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_project_allocation AFTER INSERT OR DELETE OR UPDATE ON public.project_category_assignments FOR EACH ROW EXECUTE FUNCTION public.update_project_allocation_on_assignment_change();


--
-- Name: project_category_assignments trg_update_project_spending; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_project_spending AFTER INSERT OR DELETE OR UPDATE ON public.project_category_assignments FOR EACH ROW EXECUTE FUNCTION public.update_project_spending_on_assignment_change();


--
-- Name: contractors update_contractors_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_category_assignments update_project_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON public.project_category_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: safe_transactions update_safe_state_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_safe_state_trigger AFTER INSERT ON public.safe_transactions FOR EACH ROW EXECUTE FUNCTION public.update_safe_state();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employees employees_assigned_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_assigned_project_id_fkey FOREIGN KEY (assigned_project_id) REFERENCES public.projects(id);


--
-- Name: employees employees_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: project_category_assignments fk_project_categories_contractor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_category_assignments
    ADD CONSTRAINT fk_project_categories_contractor FOREIGN KEY (contractor_id) REFERENCES public.contractors(id);


--
-- Name: project_category_assignments fk_project_categories_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_category_assignments
    ADD CONSTRAINT fk_project_categories_created_by FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: general_expenses general_expenses_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.general_expenses
    ADD CONSTRAINT general_expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: general_expenses general_expenses_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.general_expenses
    ADD CONSTRAINT general_expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: general_expenses general_expenses_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.general_expenses
    ADD CONSTRAINT general_expenses_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: invoice_attachments invoice_attachments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_attachments
    ADD CONSTRAINT invoice_attachments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_attachments invoice_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_attachments
    ADD CONSTRAINT invoice_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: invoice_custom_fields invoice_custom_fields_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_custom_fields
    ADD CONSTRAINT invoice_custom_fields_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_line_items invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_category_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_category_assignment_id_fkey FOREIGN KEY (category_assignment_id) REFERENCES public.project_category_assignments(id);


--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: project_category_assignments project_category_assignments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_category_assignments
    ADD CONSTRAINT project_category_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: safe_state safe_state_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_state
    ADD CONSTRAINT safe_state_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: safe_transactions safe_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_transactions
    ADD CONSTRAINT safe_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: safe_transactions safe_transactions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_transactions
    ADD CONSTRAINT safe_transactions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: safe_transactions safe_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_transactions
    ADD CONSTRAINT safe_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: safe_transactions safe_transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safe_transactions
    ADD CONSTRAINT safe_transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

