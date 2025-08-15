export interface User {
  id: string;
  username: string;
  password: string; // hashed
  role: UserRole;
  fullName: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export type UserRole = 'admin' | 'data_entry' | 'partners';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    role: UserRole;
    fullName: string;
    email?: string;
  };
  token?: string;
  message: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  email?: string;
}

export interface JWTPayload {
  id: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Role permissions
export interface RolePermissions {
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

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewSafe: true,
    canEditSafe: true,
    canDeleteRecords: true,
    canMakePayments: true,
    canManageProjects: true,
    canManageEmployees: true,
    canViewReports: true,
    canExportReports: true,
    canManageExpenses: true,
  },
  data_entry: {
    canViewSafe: false, // Important: data entry cannot see SAFE
    canEditSafe: false,
    canDeleteRecords: false, // Cannot remove anything
    canMakePayments: false, // Cannot pay anything
    canManageProjects: true, // Can enter invoices for projects
    canManageEmployees: false, // Cannot manage employees
    canViewReports: true, // Can generate reports
    canExportReports: true, // Can export reports
    canManageExpenses: true, // Can enter general expenses
  },
  partners: {
    canViewSafe: true, // Partners can see safe balance and transactions
    canEditSafe: false, // But cannot edit or add funding
    canDeleteRecords: false, // Cannot delete anything
    canMakePayments: false, // Cannot make payments
    canManageProjects: false, // Cannot create/edit projects (view-only)
    canManageEmployees: false, // Cannot manage employees
    canViewReports: true, // Can view all reports
    canExportReports: true, // Can export reports for analysis
    canManageExpenses: false, // Cannot create/edit expenses (view-only)
  },
}; 