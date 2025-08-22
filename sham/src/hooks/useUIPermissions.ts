import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'data_entry' | 'partners';

// UI Permission types for granular control
export interface UIPermissions {
  // Financial Data Visibility
  canViewFinancialNumbers: boolean;
  canViewSafeBalance: boolean;
  canViewProjectBudgets: boolean;
  canViewInvoiceAmounts: boolean;
  
  // Interactive Elements
  canEditProjects: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  canApproveInvoices: boolean;
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canMakePayments: boolean;
  canManageSafe: boolean;
  canEditSafeTransactions: boolean;
  canAddFunding: boolean;
  
  // Navigation & Access
  canAccessSafePage: boolean;
  canAccessReports: boolean;
  canAccessEmployeeManagement: boolean;
  
  // UI States
  isViewOnlyMode: boolean;
  isDataEntryMode: boolean;
  isAdminMode: boolean;
}

// Role-based UI permissions mapping
const UI_PERMISSIONS: Record<UserRole, UIPermissions> = {
  admin: {
    // Financial Data Visibility
    canViewFinancialNumbers: true,
    canViewSafeBalance: true,
    canViewProjectBudgets: true,
    canViewInvoiceAmounts: true,
    
    // Interactive Elements
    canEditProjects: true,
    canCreateProjects: true,
    canDeleteProjects: true,
    canApproveInvoices: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canMakePayments: true,
    canManageSafe: true,
    canEditSafeTransactions: true,
    canAddFunding: true,
    
    // Navigation & Access
    canAccessSafePage: true,
    canAccessReports: true,
    canAccessEmployeeManagement: true,
    
    // UI States
    isViewOnlyMode: false,
    isDataEntryMode: false,
    isAdminMode: true,
  },
  
  data_entry: {
    // Financial Data Visibility - CRITICAL: NO FINANCIAL NUMBERS
    canViewFinancialNumbers: false,
    canViewSafeBalance: false,
    canViewProjectBudgets: false,
    canViewInvoiceAmounts: false,
    
    // Interactive Elements - Limited to data entry tasks
    canEditProjects: false, // Cannot edit projects
    canCreateProjects: false, // Cannot create projects
    canDeleteProjects: false,
    canApproveInvoices: false,
    canCreateInvoices: true, // Can create invoices
    canEditInvoices: true, // Can edit invoices
    canMakePayments: false,
    canManageSafe: false,
    canEditSafeTransactions: false,
    canAddFunding: false,
    
    // Navigation & Access
    canAccessSafePage: false, // Cannot access safe page
    canAccessReports: false, // Cannot access reports
    canAccessEmployeeManagement: false,
    
    // UI States
    isViewOnlyMode: false,
    isDataEntryMode: true,
    isAdminMode: false,
  },
  
  partners: {
    // Financial Data Visibility - Can see numbers but read-only
    canViewFinancialNumbers: true,
    canViewSafeBalance: true,
    canViewProjectBudgets: true,
    canViewInvoiceAmounts: true,
    
    // Interactive Elements - ALL DISABLED (view-only)
    canEditProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    canApproveInvoices: false,
    canCreateInvoices: false,
    canEditInvoices: false,
    canMakePayments: false,
    canManageSafe: false,
    canEditSafeTransactions: false,
    canAddFunding: false,
    
    // Navigation & Access
    canAccessSafePage: true, // Can view safe (read-only)
    canAccessReports: true, // Can view reports
    canAccessEmployeeManagement: false,
    
    // UI States
    isViewOnlyMode: true,
    isDataEntryMode: false,
    isAdminMode: false,
  },
};

/**
 * Hook to get UI permissions for the current user
 */
export const useUIPermissions = (): UIPermissions => {
  const { user } = useAuth();
  
  if (!user || !user.role) {
    // Default to most restrictive permissions for unauthenticated users
    return UI_PERMISSIONS.data_entry;
  }
  
  return UI_PERMISSIONS[user.role as UserRole] || UI_PERMISSIONS.data_entry;
};

/**
 * Hook to check specific UI permission
 */
export const useHasUIPermission = (permission: keyof UIPermissions): boolean => {
  const permissions = useUIPermissions();
  return permissions[permission];
};

/**
 * Utility function to mask financial numbers for data entry users
 */
export const maskFinancialNumber = (
  value: number | string | null | undefined,
  permissions: UIPermissions
): string => {
  if (!permissions.canViewFinancialNumbers) {
    return '*****';
  }
  
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  return typeof value === 'number' ? value.toLocaleString() : value.toString();
};

/**
 * Utility function to mask currency values
 */
export const maskCurrency = (
  value: number | string | null | undefined,
  permissions: UIPermissions,
  currency: string = 'د.ع'
): string => {
  if (!permissions.canViewFinancialNumbers) {
    return `***** ${currency}`;
  }
  
  if (value === null || value === undefined || value === '') {
    return `0 ${currency}`;
  }
  
  const numValue = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
  return `${numValue.toLocaleString()} ${currency}`;
};

/**
 * Component wrapper for conditional rendering based on permissions
 */
export const PermissionGate: React.FC<{
  permission: keyof UIPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, children, fallback = null }) => {
  const hasPermission = useHasUIPermission(permission);
  
  return hasPermission ? React.createElement(React.Fragment, null, children) : React.createElement(React.Fragment, null, fallback);
};

/**
 * Higher-order component for role-based component wrapping
 */
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: keyof UIPermissions
) => {
  const WrappedComponent = (props: P) => {
    const hasPermission = useHasUIPermission(requiredPermission);
    
    if (!hasPermission) {
      return null;
    }
    
    return React.createElement(Component, props);
  };
  
  return WrappedComponent;
};

export default useUIPermissions;
