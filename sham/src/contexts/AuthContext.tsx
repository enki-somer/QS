"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  apiRequest,
  getAuthToken,
  getAuthUser,
  setAuthToken,
  setAuthUser,
  removeAuthToken,
  removeAuthUser,
} from "@/lib/api";

// Types from backend (keep in sync)
export type UserRole = "admin" | "data_entry";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  email?: string;
}

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

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message: string;
}

interface AuthContextType {
  user: AuthUser | null;
  permissions: RolePermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  isAdmin: () => boolean;
  isDataEntry: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dynamic API base URL - works for both development and production
const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side: use current domain for production, localhost for development
    const { hostname, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000/api";
    }
    return `${protocol}//${hostname}/api`;
  }
  // Server-side: fallback to localhost for SSR
  return "http://localhost:8000/api";
};

const API_BASE_URL = getApiBaseUrl();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // TEMPORARY: Bypass authentication for testing
  const [user, setUser] = useState<AuthUser | null>({
    id: "1",
    username: "admin",
    role: "admin",
    fullName: "مدير النظام",
    email: "admin@example.com",
  });
  const [permissions, setPermissions] = useState<RolePermissions | null>({
    canViewSafe: true,
    canEditSafe: true,
    canDeleteRecords: true,
    canMakePayments: true,
    canManageProjects: true,
    canManageEmployees: true,
    canViewReports: true,
    canExportReports: true,
    canManageExpenses: true,
  });
  const [isLoading, setIsLoading] = useState(false); // No loading needed

  // TEMPORARY: Skip authentication loading for testing
  useEffect(() => {
    // Authentication is bypassed - user is already set above
    console.log("🚧 Authentication bypassed for testing");
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await apiRequest("/auth/profile", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.permissions) {
          setPermissions(result.permissions);
        }
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };
  // TODO: Add backend login
  const login = async (
    credentials: LoginCredentials
  ): Promise<LoginResponse> => {
    // TEMPORARY: Mock successful login for testing

    console.log("🚧 Mock login for testing:", credentials.username);

    return {
      success: true,
      user: {
        id: "1",
        username: credentials.username,
        role: "admin",
        fullName: "مدير النظام",
        email: "admin@example.com",
      },
      token: "mock-token-for-testing",
      message: "تم تسجيل الدخول بنجاح (وضع التجربة)",
    };
  };

  const logout = () => {
    // TEMPORARY: Mock logout for testing
    console.log("🚧 Mock logout for testing");
    // Don't actually clear auth in testing mode - just reload page
    window.location.href = "/login";
  };

  const clearAuth = () => {
    removeAuthToken();
    removeAuthUser();
    setUser(null);
    setPermissions(null);
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions ? permissions[permission] : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const isDataEntry = (): boolean => {
    return user?.role === "data_entry";
  };

  const isAuthenticated = !!user; // TODO: Add backend check

  const contextValue: AuthContextType = {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    isAdmin,
    isDataEntry,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
