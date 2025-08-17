// Core entity types for the financial management system

export interface Project {
  [x: string]: any;
  id: string;
  name: string;
  code: string; // Immutable after creation
  location: string;
  area?: number; // Project area in square meters (m²)
  budgetEstimate: number;
  allocatedBudget?: number;  // Total budget allocated to contractor assignments
  availableBudget?: number;  // Remaining budget available for new assignments  
  spentBudget?: number;      // Total amount actually spent (approved invoices + expenses)
  client: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  
  // NEW FINANCIAL FIELDS
  pricePerMeter?: number;         // Deal price per square meter (what we charge client)
  realCostPerMeter?: number;      // Actual cost per square meter (our expenses)
  ownerDealPrice?: number;        // Total deal price agreed with project owner
  ownerPaidAmount?: number;       // Amount paid by owner so far (updated from safe transactions)
  constructionCost?: number;      // Calculated: area * pricePerMeter (revenue)
  realConstructionCost?: number;  // Calculated: area * realCostPerMeter (our costs)
  grossProfit?: number;           // Calculated: constructionCost - realConstructionCost
  profitMargin?: number;          // Calculated: (pricePerMeter - realCostPerMeter) / pricePerMeter * 100
  totalSiteArea?: number;         // Total area of the site (for comparison with construction area)
}

export interface Invoice {
  id: string;
  projectId: string; // Foreign key to Project
  invoiceNumber: string;
  amount: number;
  date: string; // ISO date string
  notes: string;
  attachments: string[]; // Array of file URLs/paths
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Contractor {
  id: string;
  full_name: string;
  phone_number: string;
  category: 'main_contractor' | 'sub_contractor' | 'building_materials_supplier' | 'equipment_supplier' | 'transport_services' | 'engineering_consultant' | 'specialized_technical_services' | 'other';
  notes?: string;
  is_active: boolean;
  created_at: string; // Backend uses snake_case
  updated_at: string; // Backend uses snake_case
}

export interface Employee {
  id: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  mobile_number?: string;
  age?: number;
  hire_date?: string;
  monthly_salary?: number;
  status: 'active' | 'inactive' | 'terminated';
  assigned_project_id?: string;
  last_payment_date?: string;
  payment_status?: string; // Allow any string to match backend
  notes?: string;
  created_at: string;
  updated_at: string;
  project_name?: string; // From JOIN with projects table
}

export interface Position {
  id: string;
  position_name: string;
  position_name_ar: string;
  description?: string;
  description_ar?: string;
  base_salary_range_min?: number;
  base_salary_range_max?: number;
  is_active?: boolean;
  created_at?: string;
}



export interface Transaction {
  id: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description: string;
  date: string;
  referenceType: 'project' | 'resource' | 'general' | 'general_expense' | 'other';
  referenceId: string;
  referenceName: string;
  paymentMethod: 'cash' | 'transfer' | 'cheque' | 'card' | 'other';
  notes?: string; // Added optional notes field
  createdAt: string;
  updatedAt: string;
}

export interface GeneralExpense {
  id: string;
  project_id: string;
  expense_name: string;
  category: string;
  cost: number;
  details?: string;
  expense_date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

// Utility types for reports and filtering
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilter {
  dateRange?: DateRange;
  projectId?: string;
  employeeId?: string;
  expenseCategory?: string;
  transactionType?: 'inflow' | 'outflow';
}

export interface Summary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  projectCount: number;
  employeeCount: number;
  period: DateRange;
}

// Navigation and UI types
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  description?: string;
}

export interface Modal {
  isOpen: boolean;
  title: string;
  type?: 'create' | 'edit' | 'delete' | 'view';
}

// Form types
export interface ProjectFormData {
  name: string;
  code: string;
  location: string;
  budgetEstimate: string;
  client: string;
  startDate: string;
  endDate: string;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  amount: string;
  date: string;
  notes: string;
  attachments: File[];
}

export interface TransactionFormData {
  type: 'inflow' | 'outflow';
  amount: string;
  description: string;
  referenceType: 'project' | 'resource' | 'general_expense' | 'other';
  referenceId: string;
  paymentMethod: 'cash' | 'transfer' | 'cheque' | 'card' | 'other';
  date: string;
  notes: string;
}

export interface ContractorFormData {
  full_name: string;
  phone_number: string;
  category: string;
  notes: string;
}

// Project category assignment types (frontend)
export interface ProjectCategoryAssignment {
  contractor_id: string | undefined;
  actual_amount: number | undefined;
  estimated_amount: number;
  main_category: string;
  id: string;
  projectId: string;
  mainCategory: string;
  subcategory: string;
  contractorId?: string;
  contractorName: string;
  estimatedAmount: number;
  actualAmount?: number;
  notes?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  assignment_type?: 'contractor' | 'purchasing';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCategoryAssignmentFormData {
  mainCategory: string;
  subcategory: string;
  contractors: Array<{
    contractorId?: string;
    contractorName: string;
    estimatedAmount: string; // String for form input
    notes?: string;
  }>;
}

// Enhanced project form data to include category assignments
export interface EnhancedProjectFormData {
  name: string;
  location: string;
  area: string;
  budgetEstimate: string;
  client: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  categoryAssignments: ProjectCategoryAssignmentFormData[];
  
  // NEW FINANCIAL FIELDS
  pricePerMeter: string;        // Deal price per square meter (what we charge client)
  realCostPerMeter: string;     // Actual cost per square meter (our expenses)
  ownerDealPrice: string;
  ownerPaidAmount: string;
  totalSiteArea: string;
}

export interface EmployeeFormData {
  name: string;
  role: string;
  joinDate: string;
  baseSalary: string;
  dailyBonus: string;
  overtimePay: string;
  deductions: string;
  assignedProjectId: string;
} 