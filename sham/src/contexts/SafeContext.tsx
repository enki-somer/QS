"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { generateTransactionId } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

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
  addFunding: (amount: number, description: string) => void;
  deductForInvoice: (
    amount: number,
    projectId: string,
    projectName: string,
    invoiceNumber: string
  ) => boolean;
  deductForSalary: (amount: number, employeeName: string) => boolean;
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
  // Initialize with empty state - no hardcoded data
  const [safeState, setSafeState] = useState<SafeState>({
    currentBalance: 0,
    transactions: [],
    totalFunded: 0,
    totalSpent: 0,
  });

  // Load safe state from database API
  useEffect(() => {
    const loadSafeState = async () => {
      try {
        // Load safe state and transactions from database
        const response = await apiRequest("/safe/state");
        if (response.ok) {
          const data = await response.json();
          setSafeState({
            currentBalance: data.current_balance || 0,
            totalFunded: data.total_funded || 0,
            totalSpent: data.total_spent || 0,
            transactions: data.transactions || [],
          });
          console.log("✅ Safe state loaded from database:", data);
        } else {
          console.warn(
            "Failed to load safe state from API, using localStorage fallback"
          );
          // Fallback to localStorage if API fails
          const stored = localStorage.getItem("financial-safe-state");
          if (stored) {
            const parsedState = JSON.parse(stored);
            setSafeState(parsedState);
          }
        }
      } catch (error) {
        console.warn("Error loading safe state from API:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem("financial-safe-state");
        if (stored) {
          try {
            const parsedState = JSON.parse(stored);
            setSafeState(parsedState);
          } catch (localError) {
            console.warn(
              "Failed to load SAFE state from localStorage:",
              localError
            );
          }
        }
      }
    };

    loadSafeState();
  }, []);

  // Method to refresh safe state (for use after transactions)
  const refreshSafeState = async () => {
    try {
      const response = await apiRequest("/safe/state");
      if (response.ok) {
        const data = await response.json();
        setSafeState({
          currentBalance: data.current_balance || 0,
          totalFunded: data.total_funded || 0,
          totalSpent: data.total_spent || 0,
          transactions: data.transactions || [],
        });
        console.log("✅ Safe state refreshed from database");
      }
    } catch (error) {
      console.warn("Error refreshing safe state:", error);
    }
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("financial-safe-state", JSON.stringify(safeState));
  }, [safeState]);

  const addFunding = (amount: number, description: string) => {
    const transaction: SafeTransaction = {
      id: generateTransactionId(),
      type: "funding",
      amount,
      description,
      date: new Date().toISOString().split("T")[0],
      previousBalance: safeState.currentBalance,
      newBalance: safeState.currentBalance + amount,
      createdAt: new Date().toISOString(),
    };

    setSafeState((prev) => ({
      currentBalance: prev.currentBalance + amount,
      transactions: [transaction, ...prev.transactions],
      totalFunded: prev.totalFunded + amount,
      totalSpent: prev.totalSpent,
    }));
  };

  const deductForInvoice = (
    amount: number,
    projectId: string,
    projectName: string,
    invoiceNumber: string
  ): boolean => {
    if (safeState.currentBalance < amount) {
      return false; // Insufficient funds
    }

    const transaction: SafeTransaction = {
      id: generateTransactionId(),
      type: "invoice_payment",
      amount: -amount,
      description: `دفعة فاتورة للمشروع: ${projectName}`,
      date: new Date().toISOString().split("T")[0],
      projectId,
      projectName,
      invoiceNumber,
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

  const deductForSalary = (amount: number, employeeName: string): boolean => {
    if (safeState.currentBalance < amount) {
      return false;
    }

    const transaction: SafeTransaction = {
      id: generateTransactionId(),
      type: "salary_payment",
      amount: -amount,
      description: `راتب الموظف: ${employeeName}`,
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
    return safeState.currentBalance >= amount;
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
