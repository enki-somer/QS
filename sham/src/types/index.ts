// Core entity types for the financial management system

export interface Project {
  id: string;
  name: string;
  code: string; // Immutable after creation
  location: string;
  budgetEstimate: number;
  client: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
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

export interface Employee {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive";
  baseSalary: number;
  joinDate: string;
  dailyBonus?: number;
  overtimePay?: number;
  deductions?: number;
  assignedProjectId?: string;
  createdAt: string;
  updatedAt: string;
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
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  receiptImage?: string; // Alternative field name for backwards compatibility
  notes?: string; // Added optional notes field
  date: string;
  createdAt: string;
  updatedAt: string;
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