"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { generateTransactionId } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface SafeTransaction {
  id: string;
  type: "funding" | "invoice_payment" | "salary_payment" | "general_expense";
  amount: number;
  description: string;
  date: string;
  projectId?: string;
  projectName?: string;
  invoiceNumber?: string;
  previousBalance: number;
  newBalance: number;
  createdAt: string;

  // Audit trail fields
  is_edited?: boolean;
  edit_reason?: string;
  edited_by?: string;
  edited_at?: string;

  // Project linking and batch tracking
  batch_number?: number;

  // Funding metadata (for funding transactions)
  funding_source?: string;
  funding_notes?: string;
}

interface FundingSource {
  type: "general" | "rental" | "factory" | "contracts" | "project";
  label: string;
  value: string;
  projectId?: string;
  batchNumber?: number;
  remainingAmount?: number;
}

interface SafeState {
  currentBalance: number;
  transactions: SafeTransaction[];
  totalFunded: number;
  totalSpent: number;
}

interface SafeContextType {
  safeState: SafeState;
  refreshSafeState: () => Promise<void>;
  addFunding: (
    amount: number,
    description: string,
    extras?: { funding_source?: string; funding_notes?: string }
  ) => Promise<void>;
  deductForInvoice: (
    amount: number,
    projectId: string,
    projectName: string,
    invoiceNumber: string,
    invoiceId?: string
  ) => Promise<boolean>;
  deductForSalary: (
    amount: number,
    employeeName: string,
    reason?: string,
    employeeId?: string
  ) => Promise<boolean>;
  deductForExpense: (
    amount: number,
    description: string,
    category: string
  ) => boolean;
  getTransactionHistory: () => SafeTransaction[];
  hasBalance: (amount: number) => boolean;
}

const SafeContext = createContext<SafeContextType | undefined>(undefined);

export const SafeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading: authLoading } = useAuth();

  // Initialize with empty state - no hardcoded data
  const [safeState, setSafeState] = useState<SafeState>({
    currentBalance: 0,
    transactions: [],
    totalFunded: 0,
    totalSpent: 0,
  });

  // Load safe state from database API ONLY when user is authenticated AND has safe access
  useEffect(() => {
    // Don't load if auth is still loading or user is not authenticated
    if (authLoading || !user) {
      console.log("⏳ Waiting for authentication before loading safe state...");
      return;
    }

    // Don't load safe state for data_entry users - they don't have permission
    if (user.role === "data_entry") {
      console.log("🚫 Data entry user - skipping safe state loading");
      return;
    }

    const loadSafeState = async () => {
      try {
        console.log(
          "🔄 Loading safe state from database for authenticated user..."
        );
        const response = await apiRequest("/safe/state");
        if (response.ok) {
          const data = await response.json();
          setSafeState({
            currentBalance: parseFloat(data.current_balance || 0),
            totalFunded: parseFloat(data.total_funded || 0),
            totalSpent: parseFloat(data.total_spent || 0),
            transactions: data.transactions || [],
          });
          console.log("✅ Safe state loaded from database:", data);
          console.log("🔍 Loaded SafeState details:", {
            currentBalance: data.current_balance,
            totalFunded: data.total_funded,
            totalSpent: data.total_spent,
            transactionsCount: data.transactions?.length || 0,
          });
        } else {
          console.error("❌ Failed to load safe state from database API");
          if (response.status === 401) {
            console.error("❌ User not authenticated for safe access");
          }
          throw new Error("Database API connection failed");
        }
      } catch (error) {
        console.error("❌ Error loading safe state from database:", error);
        // Keep the empty initial state - do not use localStorage
        setSafeState({
          currentBalance: 0,
          transactions: [],
          totalFunded: 0,
          totalSpent: 0,
        });
      }
    };

    loadSafeState();
  }, [user, authLoading]); // Depend on user and authLoading state

  // Method to refresh safe state (for use after transactions)
  const refreshSafeState = async () => {
    // Don't refresh if user is not authenticated
    if (!user) {
      console.warn("❌ Cannot refresh safe state - user not authenticated");
      return;
    }

    try {
      const response = await apiRequest("/safe/state");
      if (response.ok) {
        const data = await response.json();
        setSafeState({
          currentBalance: parseFloat(data.current_balance || 0),
          totalFunded: parseFloat(data.total_funded || 0),
          totalSpent: parseFloat(data.total_spent || 0),
          transactions: data.transactions || [],
        });
        console.log("✅ Safe state refreshed from database");
      }
    } catch (error) {
      console.warn("Error refreshing safe state:", error);
    }
  };

  // Database-only mode - no localStorage saving

  const addFunding = async (
    amount: number,
    description: string,
    extras?: { funding_source?: string; funding_notes?: string }
  ) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("💰 Adding funding to database:", { amount, description });
      const response = await apiRequest("/safe/funding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description,
          funding_source: extras?.funding_source || description || "manual",
          funding_notes: extras?.funding_notes || "",
        }),
      });

      if (response.ok) {
        console.log("✅ Funding added successfully");
        // Refresh the safe state from database
        await refreshSafeState();
      } else {
        console.error("❌ Failed to add funding");
        throw new Error("Failed to add funding to database");
      }
    } catch (error) {
      console.error("❌ Error adding funding:", error);
      throw error;
    }
  };

  const deductForInvoice = async (
    amount: number,
    projectId: string,
    projectName: string,
    invoiceNumber: string,
    invoiceId?: string
  ): Promise<boolean> => {
    if (!user) {
      console.error("❌ User not authenticated for invoice deduction");
      return false;
    }

    try {
      // Check if sufficient funds first
      if (safeState.currentBalance < amount) {
        console.warn("❌ Insufficient funds for invoice payment");
        return false;
      }

      const finalInvoiceId =
        invoiceId || `invoice-${invoiceNumber}-${Date.now()}`;

      console.log("💸 Deducting for invoice from database:", {
        amount,
        projectId,
        projectName,
        invoiceNumber,
        invoiceId: finalInvoiceId,
      });

      const response = await apiRequest("/safe/deduct/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          projectId,
          projectName,
          invoiceNumber,
          invoiceId: finalInvoiceId,
        }),
      });

      if (response.ok) {
        console.log("✅ Invoice payment deducted successfully");
        // Refresh the safe state from database
        await refreshSafeState();
        return true;
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        console.error("❌ Failed to deduct for invoice:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestBody: {
            amount,
            projectId,
            projectName,
            invoiceNumber,
            invoiceId: invoiceId || `invoice-${invoiceNumber}-${Date.now()}`,
          },
        });
        return false;
      }
    } catch (error) {
      console.error("❌ Error deducting for invoice:", error);
      return false;
    }
  };

  const deductForSalary = async (
    amount: number,
    employeeName: string,
    reason?: string,
    employeeId?: string
  ): Promise<boolean> => {
    if (safeState.currentBalance < amount) {
      return false;
    }

    const description = reason
      ? `راتب الموظف: ${employeeName} - ${reason}`
      : `راتب الموظف: ${employeeName}`;

    try {
      // Save transaction to backend
      const response = await apiRequest("/safe/deduct/salary", {
        method: "POST",
        body: JSON.stringify({
          amount,
          employeeId: employeeId || "unknown",
          employeeName,
          description,
          reason,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state with backend response
          setSafeState((prev) => ({
            currentBalance: result.data.newBalance,
            transactions: [result.data.transaction, ...prev.transactions],
            totalFunded: prev.totalFunded,
            totalSpent: prev.totalSpent + amount,
          }));
          return true;
        }
      }

      // If backend fails, still update local state for immediate feedback
      const transaction: SafeTransaction = {
        id: generateTransactionId(),
        type: "salary_payment",
        amount: -amount,
        description,
        date: new Date().toISOString().split("T")[0],
        previousBalance: safeState.currentBalance,
        newBalance: safeState.currentBalance - amount,
        createdAt: new Date().toISOString(),
      };

      setSafeState((prev) => ({
        currentBalance: prev.currentBalance - amount,
        transactions: [transaction, ...prev.transactions],
        totalFunded: prev.totalFunded,
        totalSpent: prev.totalSpent + amount,
      }));

      return true;
    } catch (error) {
      console.error("Error saving salary transaction to backend:", error);

      // Fallback to local state update
      const transaction: SafeTransaction = {
        id: generateTransactionId(),
        type: "salary_payment",
        amount: -amount,
        description,
        date: new Date().toISOString().split("T")[0],
        previousBalance: safeState.currentBalance,
        newBalance: safeState.currentBalance - amount,
        createdAt: new Date().toISOString(),
      };

      setSafeState((prev) => ({
        currentBalance: prev.currentBalance - amount,
        transactions: [transaction, ...prev.transactions],
        totalFunded: prev.totalFunded,
        totalSpent: prev.totalSpent + amount,
      }));

      return true;
    }
  };

  const deductForExpense = (
    amount: number,
    description: string,
    category: string
  ): boolean => {
    if (safeState.currentBalance < amount) {
      return false;
    }

    const transaction: SafeTransaction = {
      id: generateTransactionId(),
      type: "general_expense",
      amount: -amount,
      description: `${category}: ${description}`,
      date: new Date().toISOString().split("T")[0],
      previousBalance: safeState.currentBalance,
      newBalance: safeState.currentBalance - amount,
      createdAt: new Date().toISOString(),
    };

    setSafeState((prev) => ({
      currentBalance: prev.currentBalance - amount,
      transactions: [transaction, ...prev.transactions],
      totalFunded: prev.totalFunded,
      totalSpent: prev.totalSpent + amount,
    }));

    return true;
  };

  const getTransactionHistory = (): SafeTransaction[] => {
    return safeState.transactions;
  };

  const hasBalance = (amount: number): boolean => {
    // Ensure both values are numbers for proper comparison
    const currentBalance =
      typeof safeState.currentBalance === "number"
        ? safeState.currentBalance
        : parseFloat(safeState.currentBalance);
    const requiredAmount =
      typeof amount === "number" ? amount : parseFloat(amount);
    const hasEnough = currentBalance >= requiredAmount;

    return hasEnough;
  };

  const contextValue: SafeContextType = {
    safeState,
    refreshSafeState,
    addFunding,
    deductForInvoice,
    deductForSalary,
    deductForExpense,
    getTransactionHistory,
    hasBalance,
  };

  return (
    <SafeContext.Provider value={contextValue}>{children}</SafeContext.Provider>
  );
};

export const useSafe = (): SafeContextType => {
  const context = useContext(SafeContext);
  if (context === undefined) {
    throw new Error("useSafe must be used within a SafeProvider");
  }
  return context;
};
