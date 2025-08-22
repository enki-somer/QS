"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "./AuthContext";

// Employee types for frontend
export interface Employee {
  id: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  mobile_number?: string;
  age?: number;
  hire_date?: string;
  monthly_salary?: number;
  status: "active" | "inactive" | "terminated";
  assigned_project_id?: string;
  last_payment_date?: string;
  payment_status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  project_name?: string; // From JOIN with projects table
}

export interface Position {
  id: string;
  position_name: string;
  position_name_ar: string;
  description?: string;
  description_ar?: string;
  base_salary_range_min?: number;
  base_salary_range_max?: number;
  is_active: boolean;
}

export interface CreateEmployeeData {
  name: string;
  mobile_number?: string;
  age?: number;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  hire_date?: string;
  monthly_salary?: number;
  status?: "active" | "inactive" | "terminated";
  assigned_project_id?: string;
  notes?: string;
}

export interface UpdateEmployeeData {
  name?: string;
  mobile_number?: string;
  age?: number;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  monthly_salary?: number;
  status?: "active" | "inactive" | "terminated";
  assigned_project_id?: string;
  notes?: string;
}

export interface SalaryPaymentData {
  amount: number;
  payment_type: "full" | "installment";
  installment_amount?: number;
  reason?: string;
  is_full_payment: boolean;
}

export interface SalaryPayment {
  id: string;
  employee_id: string;
  payment_amount: number;
  payment_date: string;
  month_year: string;
  notes?: string;
  employee_name?: string;
  created_at: string;
}

export interface EmployeeFilter {
  status?: string;
  position?: string;
  search?: string;
}

interface EmployeeContextType {
  // State
  employees: Employee[];
  positions: Position[];
  projects: any[]; // Simple project list for dropdown
  loading: boolean;
  error: string | null;

  // Actions
  fetchEmployees: (filter?: EmployeeFilter) => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  createEmployee: (data: CreateEmployeeData) => Promise<Employee>;
  updateEmployee: (id: string, data: UpdateEmployeeData) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<boolean>;
  getEmployeeById: (id: string) => Promise<Employee | null>;

  // Salary management
  processSalaryPayment: (
    employeeId: string,
    paymentData: SalaryPaymentData
  ) => Promise<SalaryPayment>;
  getPaymentHistory: (employeeId: string) => Promise<SalaryPayment[]>;
  getEmployeesDueForPayment: () => Promise<Employee[]>;

  // Utilities
  calculateMonthlySalary: (employee: Employee) => number;
  calculateRemainingSalary: (employee: Employee) => Promise<number>;
  getPaymentStatusColor: (status: string) => string;
  refreshEmployees: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(
  undefined
);

interface EmployeeProviderProps {
  children: ReactNode;
}

export const EmployeeProvider: React.FC<EmployeeProviderProps> = ({
  children,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch all employees with optional filtering
  const fetchEmployees = async (filter?: EmployeeFilter) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filter?.status) queryParams.append("status", filter.status);
      if (filter?.position) queryParams.append("position", filter.position);
      if (filter?.search) queryParams.append("search", filter.search);

      const response = await apiRequest(
        `/employees?${queryParams.toString()}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEmployees(result.data || []);
        } else {
          throw new Error(result.message || "فشل في جلب بيانات الموظفين");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في جلب بيانات الموظفين");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في جلب بيانات الموظفين";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "خطأ في جلب البيانات",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch available positions
  const fetchPositions = async () => {
    try {
      const response = await apiRequest("/employees/positions", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPositions(result.data || []);
        } else {
          throw new Error(result.message || "فشل في جلب المناصب");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في جلب المناصب");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في جلب المناصب";
      console.error("Error fetching positions:", errorMessage);
    }
  };

  // Fetch available projects for dropdown
  const fetchProjects = async () => {
    try {
      console.log("🔄 Fetching projects...");
      const response = await apiRequest("/employees/projects", {
        method: "GET",
      });

      console.log("📡 Projects API response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("📊 Projects API result:", result);
        if (result.success) {
          console.log(
            "✅ Projects fetched successfully:",
            result.data?.length || 0,
            "projects"
          );
          setProjects(result.data || []);
        } else {
          throw new Error(result.message || "فشل في جلب المشاريع");
        }
      } else {
        const errorData = await response.json();
        console.error("❌ Projects API error response:", errorData);
        throw new Error(errorData.message || "فشل في جلب المشاريع");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في جلب المشاريع";
      console.error("❌ Error fetching projects:", errorMessage);
      console.error("Full error:", err);
    }
  };

  // Create new employee
  const createEmployee = async (
    data: CreateEmployeeData
  ): Promise<Employee> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest("/employees", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const newEmployee = result.data;
          setEmployees((prev) => [...prev, newEmployee]);

          addToast({
            type: "success",
            title: "تم إضافة الموظف",
            message: `تم إضافة ${newEmployee.name} بنجاح`,
          });

          return newEmployee;
        } else {
          throw new Error(result.message || "فشل في إضافة الموظف");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في إضافة الموظف");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في إضافة الموظف";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "فشل في إضافة الموظف",
        message: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update employee
  const updateEmployee = async (
    id: string,
    data: UpdateEmployeeData
  ): Promise<Employee> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest(`/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const updatedEmployee = result.data;
          setEmployees((prev) =>
            prev.map((emp) => (emp.id === id ? updatedEmployee : emp))
          );

          addToast({
            type: "success",
            title: "تم تحديث البيانات",
            message: `تم تحديث بيانات ${updatedEmployee.name} بنجاح`,
          });

          return updatedEmployee;
        } else {
          throw new Error(result.message || "فشل في تحديث بيانات الموظف");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في تحديث بيانات الموظف");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في تحديث بيانات الموظف";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "فشل في التحديث",
        message: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete employee
  const deleteEmployee = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const employee = employees.find((emp) => emp.id === id);
      const response = await apiRequest(`/employees/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEmployees((prev) => prev.filter((emp) => emp.id !== id));

          addToast({
            type: "success",
            title: "تم حذف الموظف",
            message: `تم حذف ${employee?.name || "الموظف"} بنجاح`,
          });

          return true;
        } else {
          throw new Error(result.message || "فشل في حذف الموظف");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في حذف الموظف");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في حذف الموظف";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "فشل في الحذف",
        message: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get employee by ID
  const getEmployeeById = async (id: string): Promise<Employee | null> => {
    try {
      const response = await apiRequest(`/employees/${id}`, {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.message || "فشل في جلب بيانات الموظف");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في جلب بيانات الموظف");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في جلب بيانات الموظف";
      console.error("Error fetching employee:", errorMessage);
      return null;
    }
  };

  // Process salary payment
  const processSalaryPayment = async (
    employeeId: string,
    paymentData: SalaryPaymentData
  ): Promise<SalaryPayment> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest(`/employees/${employeeId}/pay-salary`, {
        method: "POST",
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh employees to get updated payment status
          await fetchEmployees();

          addToast({
            type: "success",
            title: "تم دفع الراتب",
            message: result.message || "تم دفع الراتب بنجاح",
          });

          return result.data.payment;
        } else {
          throw new Error(result.message || "فشل في دفع الراتب");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في دفع الراتب");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في دفع الراتب";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "فشل في دفع الراتب",
        message: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get employee payment history
  const getPaymentHistory = async (
    employeeId: string
  ): Promise<SalaryPayment[]> => {
    try {
      const response = await apiRequest(
        `/employees/${employeeId}/payment-history`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.data || [];
        } else {
          throw new Error(result.message || "فشل في جلب تاريخ المدفوعات");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في جلب تاريخ المدفوعات");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "خطأ في جلب تاريخ المدفوعات";
      console.error("Error fetching payment history:", errorMessage);
      return [];
    }
  };

  // Get employees due for payment
  const getEmployeesDueForPayment = async (): Promise<Employee[]> => {
    try {
      const response = await apiRequest("/employees/due-payments", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.data || [];
        } else {
          throw new Error(
            result.message || "فشل في جلب الموظفين المستحقين للراتب"
          );
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "فشل في جلب الموظفين المستحقين للراتب"
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "خطأ في جلب الموظفين المستحقين للراتب";
      console.error("Error fetching employees due for payment:", errorMessage);
      return [];
    }
  };

  // Calculate monthly salary (for display purposes)
  const calculateMonthlySalary = (employee: Employee): number => {
    const raw = (employee as any).monthly_salary;
    const salary = typeof raw === "string" ? parseFloat(raw) : raw || 0;
    return isNaN(Number(salary)) ? 0 : Number(salary);
  };

  // Calculate remaining salary amount (considering previous payments) - using backend API
  const calculateRemainingSalary = useCallback(
    async (employee: Employee): Promise<number> => {
      const baseSalary = employee.monthly_salary || 0;

      // Validate base salary
      if (!baseSalary || isNaN(baseSalary) || baseSalary <= 0) {
        console.warn(
          "Invalid base salary for employee:",
          employee.name,
          baseSalary
        );
        return 0;
      }

      try {
        // Use backend API to calculate remaining salary
        const response = await apiRequest(
          `/employees/${employee.id}/remaining-salary`,
          {
            method: "GET",
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const remainingSalary = result.data?.remainingSalary || 0;
            console.log(`💰 Remaining salary for ${employee.name}:`, {
              baseSalary,
              totalPaidThisMonth: result.data?.totalPaidThisMonth || 0,
              remainingSalary,
              rawData: result.data,
            });
            return Math.max(
              0,
              isNaN(remainingSalary) ? baseSalary : remainingSalary
            );
          } else {
            throw new Error(result.message || "فشل في حساب الراتب المتبقي");
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "فشل في حساب الراتب المتبقي");
        }
      } catch (error) {
        console.error(
          "Error calculating remaining salary for",
          employee.name,
          ":",
          error
        );

        // Fallback: return full base salary to avoid misleading partial assumptions
        return baseSalary;
      }
    },
    []
  ); // Empty dependency array since it only uses the employee parameter

  // Get payment status color
  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case "current":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "due":
        return "text-red-600 bg-red-50";
      case "installment":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Refresh employees (alias for fetchEmployees)
  const refreshEmployees = async () => {
    await fetchEmployees();
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      // Don't load if not authenticated
      if (!isAuthenticated) {
        console.log(
          "🔍 Debug: Skipping employee data load - user not authenticated"
        );
        return;
      }

      try {
        console.log("🚀 Loading initial data...");
        await fetchEmployees();
        await fetchPositions();
        await fetchProjects();
        console.log("✅ Initial data loading complete");
      } catch (error) {
        console.warn(
          "⚠️ Failed to load initial data (likely authentication issue):",
          error
        );
        // Don't throw error to prevent blocking the app
      }
    };

    // Only load data if authenticated
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]); // Depend on authentication status instead of timer

  const contextValue: EmployeeContextType = {
    // State
    employees,
    positions,
    projects,
    loading,
    error,

    // Actions
    fetchEmployees,
    fetchPositions,
    fetchProjects,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,

    // Salary management
    processSalaryPayment,
    getPaymentHistory,
    getEmployeesDueForPayment,

    // Utilities
    calculateMonthlySalary,
    calculateRemainingSalary,
    getPaymentStatusColor,
    refreshEmployees,
  };

  return (
    <EmployeeContext.Provider value={contextValue}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = (): EmployeeContextType => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error("useEmployee must be used within an EmployeeProvider");
  }
  return context;
};
