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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage and verify token on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("financial-auth-token");
        const storedUser = localStorage.getItem("financial-auth-user");

        if (!token || !storedUser) {
          setIsLoading(false);
          return;
        }

        // Verify token with backend
        const response = await apiRequest("/auth/verify", {
          method: "POST",
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setUser(result.user);
            // Get user permissions
            await fetchUserProfile(token);
          } else {
            // Invalid token, clear storage
            clearAuth();
          }
        } else {
          // Token expired or invalid
          clearAuth();
        }
      } catch (error) {
        console.error("Auth verification error:", error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
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

      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      const result: LoginResponse = await response.json();

      if (result.success && result.user && result.token) {
        // Store auth data
        setAuthToken(result.token);
        setAuthUser(result.user);

        // Set state
        setUser(result.user);

        // Fetch permissions
        await fetchUserProfile(result.token);
      }

      return result;
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "حدث خطأ في الاتصال بالخادم",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Call backend logout endpoint
    apiRequest("/auth/logout", {
      method: "POST",
    }).catch((error) => console.error("Logout error:", error));

    clearAuth();
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

  const isAuthenticated = !!user;

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
