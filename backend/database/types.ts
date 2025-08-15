// Database entity types for PostgreSQL integration
// نظام الإدارة المالية المتكامل لشركة قصر الشام

export type UserRole = 'admin' | 'data_entry' | 'partners';
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type InvoiceStatus = 'pending_approval' | 'approved' | 'paid' | 'rejected';
export type ContractorCategory = 'main_contractor' | 'sub_contractor' | 'building_materials_supplier' | 'equipment_supplier' | 'transport_services' | 'engineering_consultant' | 'specialized_technical_services' | 'other';

export type EmployeeStatus = 'active' | 'inactive';
export type ExpenseStatus = 'pending_approval' | 'approved' | 'paid' | 'rejected';
export type TransactionType = 'funding' | 'invoice_payment' | 'salary_payment' | 'general_expense';
export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'payment';

// User entity
export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  email?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// User permissions (derived from role)
export interface UserPermissions {
  canViewSafe: boolean;
  canEditSafe: boolean;
  canDeleteRecords: boolean;
  canMakePayments: boolean;
  canManageProjects: boolean;
  canManageEmployees: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  canManageExpenses: boolean;
}

// Project entity
export interface Project {
  id: string;
  name: string;
  code: string; // Immutable project identifier
  location?: string;
  area?: number; // Project area in square meters (m²)
  budget_estimate: number;
  allocated_budget?: number;  // Total budget allocated to contractor assignments
  available_budget?: number;  // Remaining budget available for new assignments
  spent_budget?: number;      // Total amount actually spent (approved invoices + expenses)
  client?: string;
  start_date?: Date;
  end_date?: Date;
  status: ProjectStatus;
  notes?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  
  // NEW FINANCIAL FIELDS
  price_per_meter?: number;    // Price per square meter for construction calculation
  owner_deal_price?: number;   // Total deal price agreed with project owner
  owner_paid_amount?: number;  // Amount paid by owner so far (updated from safe transactions)
  construction_cost?: number;  // Calculated: area * price_per_meter
  profit_margin?: number;      // Calculated: (owner_deal_price - construction_cost) / owner_deal_price * 100
  total_site_area?: number;    // Total area of the site (for comparison with construction area)
}

// Invoice entity
export interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  amount: number;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  date: Date;
  due_date?: Date;
  payment_terms?: string;
  notes?: string;
  status: InvoiceStatus;
  // Workflow tracking
  submitted_by?: string;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Invoice line item
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: Date;
}

// Invoice custom field
export interface InvoiceCustomField {
  id: string;
  invoice_id: string;
  field_label: string;
  field_value?: string;
  field_type: string; // text, number, date, textarea
  created_at: Date;
}

// Invoice attachment
export interface InvoiceAttachment {
  id: string;
  invoice_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  created_at: Date;
}

// Contractor entity
export interface Contractor {
  id: string;
  full_name: string;
  phone_number?: string;
  category?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// Project category assignment entity
export interface ProjectCategoryAssignment {
  id: string;
  project_id: string;
  main_category: string;
  subcategory: string;
  contractor_id?: string;
  contractor_name: string;
  estimated_amount: number;
  actual_amount?: number;
  notes?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  assignment_type?: 'contractor' | 'purchasing';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// DTOs for creating project category assignments
export interface CreateProjectCategoryAssignmentData {
  main_category: string;
  subcategory: string;
  contractor_id?: string;
  contractor_name: string;
  estimated_amount: number;
  notes?: string;
  assignment_type?: 'contractor' | 'purchasing';
}

// Project categories data structure
export interface ProjectCategory {
  id: string;
  name: string;
  subcategories: string[];
}

// Employee entity
export interface Employee {
  id: string;
  name: string;
  role?: string;
  status: EmployeeStatus;
  base_salary: number;
  daily_bonus: number;
  overtime_pay: number;
  deductions: number;
  join_date: Date;
  assigned_project_id?: string;
  notes?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// General expense entity
export interface GeneralExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: Date;
  receipt_url?: string;
  notes?: string;
  status: ExpenseStatus;
  // Workflow tracking
  submitted_by?: string;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Safe transaction entity
export interface SafeTransaction {
  id: string;
  type: TransactionType;
  amount: number; // Positive for inflow, negative for outflow
  description: string;
  date: Date;
  
  // Reference links (nullable - depends on transaction type)
  project_id?: string;
  project_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  employee_id?: string;
  employee_name?: string;
  expense_id?: string;
  
  // Balance tracking
  previous_balance: number;
  new_balance: number;
  
  // Funding source (for funding transactions)
  funding_source?: string; // مقاولات، إيجار، مصنع، etc.
  funding_notes?: string;
  
  // Metadata
  created_by?: string;
  created_at: Date;
  
  // Audit trail (for edited transactions)
  is_edited?: boolean;
  edit_reason?: string;
  edited_by?: string;
  edited_at?: Date;
  
  // Project linking and batch tracking
  batch_number?: number;
}

// Safe state entity
export interface SafeState {
  id: number; // Always 1 (single row)
  current_balance: number;
  total_funded: number;
  total_spent: number;
  last_updated: Date;
  updated_by?: string;
}

// Audit log entity
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data?: any; // JSONB
  new_data?: any; // JSONB
  user_id?: string;
  user_name?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Query result interfaces
export interface SafeSummary {
  current_balance: number;
  total_funded: number;
  total_spent: number;
  transaction_count: number;
}

export interface ProjectSummary extends Project {
  invoice_count: number;
  total_invoiced: number;
  total_paid: number;
  pending_amount: number;
}

export interface EmployeeSummary extends Employee {
  monthly_salary: number;
  total_paid: number;
  last_payment_date?: Date;
}

// Database operation result types
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rowCount?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter and query types
export interface SafeTransactionFilter {
  type?: TransactionType;
  date_from?: Date;
  date_to?: Date;
  project_id?: string;
  employee_id?: string;
  expense_id?: string;
}

export interface ProjectFilter {
  status?: ProjectStatus;
  created_by?: string;
  date_from?: Date;
  date_to?: Date;
}

export interface InvoiceFilter {
  project_id?: string;
  status?: InvoiceStatus;
  date_from?: Date;
  date_to?: Date;
  submitted_by?: string;
}

export interface ContractorFilter {
  category?: ContractorCategory;
  is_active?: boolean;
  search?: string; // For searching by name or phone
}

export interface EmployeeFilter {
  status?: EmployeeStatus;
  assigned_project_id?: string;
}

export interface ExpenseFilter {
  category?: string;
  status?: ExpenseStatus;
  date_from?: Date;
  date_to?: Date;
  submitted_by?: string;
}

// Form data types (from frontend)
export interface CreateUserData {
  username: string;
  password: string;
  role: UserRole;
  full_name: string;
  email?: string;
}

export interface CreateProjectData {
  name: string;
  code: string;
  location?: string;
  area?: number;
  budget_estimate: number;
  client?: string;
  start_date?: Date;
  end_date?: Date;
  status?: ProjectStatus;
  notes?: string;
  
  // NEW FINANCIAL FIELDS
  price_per_meter?: number;
  owner_deal_price?: number;
  owner_paid_amount?: number;
}

export interface CreateInvoiceData {
  project_id: string;
  invoice_number: string;
  amount: number;
  subtotal?: number;
  tax_percentage?: number;
  discount_amount?: number;
  date: Date;
  due_date?: Date;
  payment_terms?: string;
  notes?: string;
  line_items?: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'created_at'>[];
  custom_fields?: Omit<InvoiceCustomField, 'id' | 'invoice_id' | 'created_at'>[];
}

export interface CreateContractorData {
  full_name: string;
  phone_number?: string;
  category?: string;
  notes?: string;
}

export interface CreateEmployeeData {
  name: string;
  role?: string;
  base_salary: number;
  daily_bonus?: number;
  overtime_pay?: number;
  deductions?: number;
  join_date: Date;
  assigned_project_id?: string;
  notes?: string;
}

export interface CreateExpenseData {
  description: string;
  category: string;
  amount: number;
  date: Date;
  receipt_url?: string;
  notes?: string;
}

export interface CreateSafeTransactionData {
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  project_id?: string;
  project_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  employee_id?: string;
  employee_name?: string;
  expense_id?: string;
  funding_source?: string;
  funding_notes?: string;
  batch_number?: number;
}

// Data for editing safe transactions (admin only)
export interface EditSafeTransactionData {
  amount?: number;
  description?: string;
  funding_source?: string;
  funding_notes?: string;
  edit_reason: string; // Required for audit trail
}

// Funding source options for dynamic dropdown
export interface FundingSource {
  type: 'general' | 'rental' | 'factory' | 'contracts' | 'project';
  label: string;
  value: string;
  projectId?: string;
  projectCode?: string;
  projectLocation?: string;
  projectClient?: string;
  projectStatus?: string;
  batchNumber?: number;
  remainingAmount?: number;
  totalDealPrice?: number;
  paidAmount?: number;
  isAvailable?: boolean;
} 