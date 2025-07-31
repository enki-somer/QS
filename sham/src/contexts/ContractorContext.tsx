"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Contractor, ContractorFormData } from "@/types";
import { apiRequest } from "@/lib/api";

interface ContractorContextType {
  contractors: Contractor[];
  isLoading: boolean;
  error: string | null;
  addContractor: (contractorData: ContractorFormData) => Promise<boolean>;
  updateContractor: (
    id: string,
    contractorData: Partial<ContractorFormData>
  ) => Promise<boolean>;
  deleteContractor: (id: string) => Promise<boolean>;
  activateContractor: (id: string) => Promise<boolean>;
  getContractorById: (id: string) => Contractor | undefined;
  getContractorsByCategory: (category: string) => Contractor[];
  searchContractors: (query: string) => Contractor[];
  refreshContractors: () => Promise<void>;
}

const ContractorContext = createContext<ContractorContextType | undefined>(
  undefined
);

export const ContractorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contractors from API on component mount
  useEffect(() => {
    refreshContractors();
  }, []);

  // Refresh contractors from API
  const refreshContractors = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("/contractors");

      if (!response.ok) {
        throw new Error("Failed to fetch contractors");
      }

      const result = await response.json();
      // Backend returns: { success: true, data: { data: [...], total, page, limit, totalPages } }
      setContractors(result.data?.data || []);
    } catch (error: any) {
      console.error("Error loading contractors:", error);
      setError("فشل في جلب بيانات المقاولين");
      setContractors([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new contractor
  const addContractor = async (
    contractorData: ContractorFormData
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("/contractors", {
        method: "POST",
        body: JSON.stringify(contractorData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (
          response.status === 400 &&
          errorData.message?.includes("already exists")
        ) {
          setError("يوجد مقاول بهذا الاسم مسبقاً");
        } else {
          setError(errorData.message || "حدث خطأ أثناء إضافة المقاول");
        }
        return false;
      }

      const result = await response.json();
      // Backend returns: { success: true, data: contractor }
      setContractors((prev) => [result.data, ...prev]);
      return true;
    } catch (error: any) {
      console.error("Error adding contractor:", error);
      setError("حدث خطأ أثناء الاتصال بالخادم");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing contractor
  const updateContractor = async (
    id: string,
    contractorData: Partial<ContractorFormData>
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest(`/contractors/${id}`, {
        method: "PUT",
        body: JSON.stringify(contractorData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (
          response.status === 400 &&
          errorData.message?.includes("already exists")
        ) {
          setError("يوجد مقاول بهذا الاسم مسبقاً");
        } else {
          setError(errorData.message || "حدث خطأ أثناء تحديث المقاول");
        }
        return false;
      }

      const result = await response.json();
      // Backend returns: { success: true, data: contractor }
      setContractors((prev) =>
        prev.map((contractor) =>
          contractor.id === id ? result.data : contractor
        )
      );
      return true;
    } catch (error: any) {
      console.error("Error updating contractor:", error);
      setError("حدث خطأ أثناء الاتصال بالخادم");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Soft delete a contractor (mark as inactive)
  const deleteContractor = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest(`/contractors/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "حدث خطأ أثناء حذف المقاول");
        return false;
      }

      // Remove from local state (soft delete - just filter out)
      setContractors((prev) =>
        prev.map((contractor) =>
          contractor.id === id
            ? { ...contractor, is_active: false }
            : contractor
        )
      );
      return true;
    } catch (error: any) {
      console.error("Error deleting contractor:", error);
      setError("حدث خطأ أثناء الاتصال بالخادم");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Activate a contractor
  const activateContractor = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest(`/contractors/${id}/activate`, {
        method: "PUT",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "حدث خطأ أثناء تفعيل المقاول");
        return false;
      }

      const result = await response.json();
      // Backend returns: { success: true, data: contractor }
      setContractors((prev) =>
        prev.map((contractor) =>
          contractor.id === id ? result.data : contractor
        )
      );
      return true;
    } catch (error: any) {
      console.error("Error activating contractor:", error);
      setError("حدث خطأ أثناء الاتصال بالخادم");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get contractor by ID
  const getContractorById = (id: string): Contractor | undefined => {
    return contractors.find((contractor) => contractor.id === id);
  };

  // Get contractors by category
  const getContractorsByCategory = (category: string): Contractor[] => {
    return contractors.filter(
      (contractor) => contractor.category === category && contractor.is_active
    );
  };

  // Search contractors
  const searchContractors = (query: string): Contractor[] => {
    if (!query.trim()) return contractors.filter((c) => c.is_active);

    const searchTerm = query.toLowerCase();
    return contractors.filter(
      (contractor) =>
        contractor.is_active &&
        (contractor.full_name.toLowerCase().includes(searchTerm) ||
          contractor.phone_number.includes(searchTerm) ||
          contractor.category.toLowerCase().includes(searchTerm))
    );
  };

  const contextValue: ContractorContextType = {
    contractors: contractors.filter((c) => c.is_active), // Only show active contractors by default
    isLoading,
    error,
    addContractor,
    updateContractor,
    deleteContractor,
    activateContractor,
    getContractorById,
    getContractorsByCategory,
    searchContractors,
    refreshContractors,
  };

  return (
    <ContractorContext.Provider value={contextValue}>
      {children}
    </ContractorContext.Provider>
  );
};

export const useContractors = (): ContractorContextType => {
  const context = useContext(ContractorContext);
  if (context === undefined) {
    throw new Error("useContractors must be used within a ContractorProvider");
  }
  return context;
};
