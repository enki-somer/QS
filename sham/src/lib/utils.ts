import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting for Iraqi context with Arabic numerals
export function formatCurrency(amount: number | null | undefined): string {
  // Handle invalid values
  if (amount == null || isNaN(Number(amount))) {
    return "0 د.ع";
  }
  
  const numericAmount = Number(amount);
  
  // Format using Intl but replace the currency symbol
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount) + " د.ع";
}

// Date formatting for Arabic context but with English numerals
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "غير محدد";
  }
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return "تاريخ غير صالح";
  }
  
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Keep track of generated IDs to ensure uniqueness
const generatedIds = new Set<string>();
let counter = 0;

export function generateId(prefix: string = ''): string {
  // Increment counter to ensure uniqueness even within the same millisecond
  counter = (counter + 1) % 1000000;
  
  // Combine timestamp, counter, and random string for maximum uniqueness
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const id = `${prefix}${timestamp}_${counter}_${random}`;
  
  // In the extremely unlikely case of a collision, try again
  if (generatedIds.has(id)) {
    return generateId(prefix);
  }
  
  generatedIds.add(id);
  return id;
}

// Generate transaction-specific IDs
export function generateTransactionId(): string {
  return generateId('txn_');
}

// Generate employee-specific IDs
export function generateEmployeeId(): string {
  return generateId('emp_');
}

// Generate project-specific IDs
export function generateProjectId(): string {
  return generateId('prj_');
}

// Format UUID to clean, readable format
export function formatId(id: string | null | undefined, prefix: string = ''): string {
  if (!id) return 'غير محدد';
  
  // If it's already a clean format (not UUID), return as is
  if (!id.includes('-') || id.length < 30) {
    return id;
  }
  
  // Extract meaningful parts from UUID
  const parts = id.split('-');
  if (parts.length >= 2) {
    // Use first 4 chars of first part + last 4 chars of last part
    const shortId = `${parts[0].substring(0, 4)}${parts[parts.length - 1].substring(-4)}`.toUpperCase();
    return prefix ? `${prefix}${shortId}` : shortId;
  }
  
  // Fallback: just use first 8 characters
  return (prefix + id.substring(0, 8)).toUpperCase();
}

// Format invoice number for display
export function formatInvoiceNumber(invoiceNumber: string | null | undefined): string {
  return formatId(invoiceNumber, 'INV-');
}

// Format project ID for display
export function formatProjectId(projectId: string | null | undefined): string {
  return formatId(projectId, 'PRJ-');
} 