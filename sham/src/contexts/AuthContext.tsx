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
export type UserRole = "admin" | "data_entry" | "partners";

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load authentication state on app start
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      const storedUser = getAuthUser();

      if (token && storedUser) {
        try {
          // Verify token with backend
          const response = await apiRequest("/auth/profile", {
            method: "GET",
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setUser(storedUser);
              setPermissions(result.permissions);
            } else {
              // Token invalid, clear auth
              removeAuthToken();
              removeAuthUser();
            }
          } else {
            // Token invalid, clear auth
            removeAuthToken();
            removeAuthUser();
          }
        } catch (error) {
          console.error("Auth verification failed:", error);
          removeAuthToken();
          removeAuthUser();
        }
      }

      setIsLoading(false);
    };

    initAuth();
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
  const login = async (
    credentials: LoginCredentials
  ): Promise<LoginResponse> => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (result.success && result.user && result.token) {
        // Store auth data
        setAuthToken(result.token);
        setAuthUser(result.user);
        setUser(result.user);

        // Fetch user permissions
        await fetchUserProfile(result.token);

        return result;
      } else {
        return {
          success: false,
          message: result.message || "فشل تسجيل الدخول",
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "خطأ في الاتصال بالخادم",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
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
    return user?.role === "data_entry" || user?.role === "dataentry";
  };

  const isAuthenticated = !!user && !!getAuthToken();

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
