import { Invoice } from './index';

export interface CustomFieldType {
  id: string;
  label: string;
  value: string;
  type: "text" | "number" | "date" | "textarea";
}

export interface EnhancedInvoice extends Invoice {
  customFields?: CustomFieldType[];
  taxPercentage?: number;
  discountAmount?: number;
  paymentTerms?: string;
  dueDate?: string;
  attachmentUrl?: string; // For handwritten invoice file (company use only)
  lineItems?: InvoiceLineItem[]; // Detailed line items for invoice
  status?: 'pending_approval' | 'approved' | 'paid' | 'rejected';
  // Approval workflow fields
  submittedBy?: string; // User who created it
  approvedBy?: string; // Admin who approved it
  approvedAt?: string; // Approval timestamp
  rejectionReason?: string; // If rejected, why
}

// Enhanced GeneralExpense with approval workflow
export interface EnhancedGeneralExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  receiptImage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Approval workflow fields
  status?: 'pending_approval' | 'approved' | 'paid' | 'rejected';
  submittedBy?: string; // User who created it
  approvedBy?: string; // Admin who approved it
  approvedAt?: string; // Approval timestamp
  rejectionReason?: string; // If rejected, why
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  date: string;
  notes: string;
  taxPercentage: string;
  discountAmount: string;
  paymentTerms: string;
  dueDate: string;
  attachmentFile?: File; // For handwritten invoice upload
  customFields: CustomFieldType[];
  lineItems: InvoiceLineItem[];
}

export interface ExpenseFormData {
  description: string;
  category: string;
  amount: string;
  date: string;
  notes: string;
  receiptImage?: string;
} 