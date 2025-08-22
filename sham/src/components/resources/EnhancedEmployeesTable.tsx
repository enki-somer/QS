"use client";

import React, { useState } from "react";
import {
  User,
  Phone,
  Calendar,
  DollarSign,
  Building2,
  Eye,
  Edit,
  Trash2,
  Wallet,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Employee } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useEmployee } from "@/contexts/EmployeeContext";
import { useUIPermissions } from "@/hooks/useUIPermissions";

interface EnhancedEmployeesTableProps {
  employees: Employee[];
  onViewEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onPaySalary: (employee: Employee) => void;
  canPaySalary: (amount: number) => boolean;
}

type SortField =
  | "name"
  | "position"
  | "monthly_salary"
  | "status"
  | "last_payment_date";
type SortDirection = "asc" | "desc";

export function EnhancedEmployeesTable({
  employees,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onPaySalary,
  canPaySalary,
}: EnhancedEmployeesTableProps) {
  const {
    calculateMonthlySalary,
    getPaymentStatusColor,
    calculateRemainingSalary,
  } = useEmployee();
  const permissions = useUIPermissions();
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [remainingSalaries, setRemainingSalaries] = useState<
    Record<string, number>
  >({});

  // Create a stable dependency signature to avoid infinite loops when parent passes a new array instance
  const employeeDependency = React.useMemo(
    () =>
      employees
        .map(
          (emp) =>
            `${emp.id}-${emp.last_payment_date || "none"}-${
              emp.monthly_salary || 0
            }-${emp.status}-${emp.payment_status || ""}`
        )
        .join("|"),
    [employees]
  );

  // Calculate remaining salaries for all employees (only for users with payment permissions)
  React.useEffect(() => {
    let isCancelled = false;

    const calculateAllRemainingSalaries = async () => {
      if (isCancelled) return;

      const remainingMap: Record<string, number> = {};

      // Skip salary calculations for view-only users (partners)
      if (permissions.isViewOnlyMode) {
        // For view-only users, just show the full monthly salary as remaining
        for (const employee of employees) {
          if (isCancelled) break;
          remainingMap[employee.id] = calculateMonthlySalary(employee);
        }
        if (!isCancelled) {
          setRemainingSalaries(remainingMap);
        }
        return;
      }

      for (const employee of employees) {
        if (isCancelled) break;

        if (employee.status === "active") {
          try {
            const remaining = await calculateRemainingSalary(employee);
            console.log(
              `🔍 Table: Remaining salary for ${employee.name}:`,
              remaining
            );
            if (!isCancelled) {
              remainingMap[employee.id] = remaining;
            }
          } catch (error) {
            console.error(
              `❌ Table: Error calculating remaining salary for ${employee.name}:`,
              error
            );
            if (!isCancelled) {
              const fallbackSalary = calculateMonthlySalary(employee);
              remainingMap[employee.id] = fallbackSalary; // Fallback to full salary
              console.log(
                `🔄 Table: Using fallback salary for ${employee.name}:`,
                fallbackSalary
              );
            }
          }
        } else {
          // For inactive employees, set to 0
          remainingMap[employee.id] = 0;
        }
      }

      if (!isCancelled) {
        console.log("📊 Table: Setting remaining salaries:", remainingMap);
        setRemainingSalaries(remainingMap);
      }
    };

    if (employees.length > 0) {
      calculateAllRemainingSalaries();
    }

    return () => {
      isCancelled = true;
    };
  }, [employeeDependency, permissions.isViewOnlyMode]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle special cases
    if (sortField === "monthly_salary") {
      aValue = calculateMonthlySalary(a);
      bValue = calculateMonthlySalary(b);
    }

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || "";
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: "نشط",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      inactive: {
        label: "غير نشط",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      terminated: {
        label: "منتهي الخدمة",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
      >
        <Icon className="h-3 w-3 ml-1 no-flip" />
        <span className="arabic-spacing">{config.label}</span>
      </span>
    );
  };

  const getPaymentStatusBadge = (employee: Employee) => {
    const salary = calculateMonthlySalary(employee);
    const remainingSalary = remainingSalaries[employee.id];
    const canPay = canPaySalary(remainingSalary || salary);

    // Determine actual payment status based on remaining salary
    let actualStatus = "due"; // Default to due

    // If we don't have remaining salary data yet, use simple logic
    if (remainingSalary === undefined) {
      if (employee.last_payment_date) {
        // Check if payment was made this month
        const paymentDate = new Date(employee.last_payment_date);
        const currentMonth = new Date().toISOString().slice(0, 7);
        const paymentMonth = paymentDate.toISOString().slice(0, 7);

        if (paymentMonth === currentMonth) {
          actualStatus = "partial"; // Assume partial until we get exact data
        } else {
          actualStatus = "due"; // Payment from previous month
        }
      } else {
        actualStatus = "due"; // No payment yet
      }
    } else {
      // We have exact remaining salary data
      if (remainingSalary <= 0) {
        actualStatus = "current"; // Fully paid
      } else if (employee.last_payment_date && remainingSalary < salary) {
        actualStatus = "partial"; // Partially paid
      } else {
        actualStatus = "due"; // Still due
      }
    }

    const statusConfig = {
      current: {
        label: "مدفوع بالكامل",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      partial: {
        label: "دفع جزئي",
        className: "bg-orange-100 text-orange-800 border-orange-200",
        icon: CreditCard,
      },
      due: {
        label: "مستحق",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      },
      installment: {
        label: "أقساط",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CreditCard,
      },
    };

    const config =
      statusConfig[actualStatus as keyof typeof statusConfig] ||
      statusConfig.due;
    const Icon = config.icon;

    return (
      <div className="space-y-1">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
        >
          <Icon className="h-3 w-3 ml-1 no-flip" />
          <span className="arabic-spacing">{config.label}</span>
        </span>
        {actualStatus === "partial" && (
          <div className="text-xs text-orange-600 arabic-spacing">
            {remainingSalary !== undefined && remainingSalary > 0
              ? `متبقي: ${(remainingSalary / 1000).toFixed(0)}k`
              : "يتم حساب المتبقي..."}
          </div>
        )}
        {/* Reserve insufficiency checks for the payment modal where the amount is chosen */}
      </div>
    );
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 space-x-reverse hover:text-blue-600 transition-colors"
    >
      <span>{children}</span>
      <ArrowUpDown className="h-3 w-3 no-flip" />
    </button>
  );

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4 no-flip" />
        <p className="text-gray-500 arabic-spacing">لا يوجد موظفون لعرضهم</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="w-full">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[20%]">
                <SortButton field="name">
                  <span className="text-sm font-bold text-slate-800 arabic-spacing">
                    الموظف
                  </span>
                </SortButton>
              </th>
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[15%]">
                <SortButton field="position">
                  <span className="text-sm font-bold text-slate-800 arabic-spacing">
                    المنصب
                  </span>
                </SortButton>
              </th>
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[12%]">
                <span className="text-sm font-bold text-slate-800 arabic-spacing">
                  الاتصال
                </span>
              </th>
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[12%]">
                <SortButton field="monthly_salary">
                  <span className="text-sm font-bold text-slate-800 arabic-spacing">
                    الراتب
                  </span>
                </SortButton>
              </th>
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[10%]">
                <SortButton field="status">
                  <span className="text-sm font-bold text-slate-800 arabic-spacing">
                    الحالة
                  </span>
                </SortButton>
              </th>
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[11%]">
                <span className="text-sm font-bold text-slate-800 arabic-spacing">
                  حالة الراتب
                </span>
              </th>
              <th className="py-5 px-3 text-right border-r border-slate-200 w-[12%]">
                <SortButton field="last_payment_date">
                  <span className="text-sm font-bold text-slate-800 arabic-spacing">
                    آخر دفعة
                  </span>
                </SortButton>
              </th>
              <th className="py-5 px-3 text-center w-[8%]">
                <span className="text-sm font-bold text-slate-800 arabic-spacing">
                  الإجراءات
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((employee, index) => {
              const salary = calculateMonthlySalary(employee);
              const remainingSalary = remainingSalaries[employee.id];
              const effectiveRemaining =
                remainingSalary !== undefined ? remainingSalary : salary;
              // If remaining is not yet calculated, don't block the action button.
              const canPay =
                remainingSalary !== undefined
                  ? canPaySalary(effectiveRemaining)
                  : true;
              const hasRemainingBalance = effectiveRemaining > 0;

              return (
                <tr
                  key={employee.id}
                  className={`border-b border-slate-200 hover:bg-slate-50 transition-all duration-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-25"
                  }`}
                >
                  {/* Employee Info */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                        <User className="h-3 w-3 text-white no-flip" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 arabic-spacing text-sm leading-tight truncate">
                          {employee.name}
                        </div>
                        {employee.hire_date && (
                          <div className="text-xs text-slate-500 arabic-spacing leading-tight mt-1 truncate">
                            {new Date(employee.hire_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "2-digit",
                              }
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Position */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900 arabic-spacing leading-tight truncate">
                        {employee.position || "غير محدد"}
                      </div>
                      {employee.department && (
                        <div className="text-xs text-slate-600 arabic-spacing truncate">
                          {employee.department}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="space-y-1">
                      {employee.mobile_number ? (
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <Phone className="h-3 w-3 text-green-600 no-flip flex-shrink-0" />
                          <span className="font-mono text-xs text-slate-900 truncate">
                            {employee.mobile_number}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 arabic-spacing">
                          لا يوجد
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Salary */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="text-sm font-bold text-green-700 leading-tight">
                      {formatCurrency(salary)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="flex justify-center">
                      {getStatusBadge(employee.status)}
                    </div>
                  </td>

                  {/* Payment Status */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="flex justify-center">
                      {getPaymentStatusBadge(employee)}
                    </div>
                  </td>

                  {/* Last Payment */}
                  <td className="py-4 px-3 border-r border-slate-200 align-top">
                    <div className="space-y-1">
                      {employee.last_payment_date ? (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900">
                            {new Date(
                              employee.last_payment_date
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          {(() => {
                            const remainingSalary =
                              remainingSalaries[employee.id];
                            const salary = calculateMonthlySalary(employee);

                            if (remainingSalary === undefined) {
                              // Check if payment was made this month
                              const paymentDate = new Date(
                                employee.last_payment_date
                              );
                              const currentMonth = new Date()
                                .toISOString()
                                .slice(0, 7);
                              const paymentMonth = paymentDate
                                .toISOString()
                                .slice(0, 7);

                              if (paymentMonth === currentMonth) {
                                return (
                                  <div className="text-xs text-orange-600 arabic-spacing">
                                    ⚡ جزئي
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="text-xs text-blue-600 arabic-spacing">
                                    📝 مسجل
                                  </div>
                                );
                              }
                            } else if (remainingSalary <= 0) {
                              return (
                                <div className="text-xs text-green-600 arabic-spacing">
                                  ✓ مكتمل
                                </div>
                              );
                            } else if (remainingSalary < salary) {
                              return (
                                <div className="text-xs text-orange-600 arabic-spacing">
                                  ⚡ جزئي
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-xs text-blue-600 arabic-spacing">
                                  📝 مسجل
                                </div>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 arabic-spacing">
                            لم يدفع
                          </div>
                          <div className="text-xs text-orange-600 arabic-spacing">
                            ⚠ انتظار
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-2 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewEmployee(employee)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded p-1 transition-all duration-200"
                          title="عرض"
                        >
                          <Eye className="h-3 w-3 no-flip" />
                        </Button>
                        {!permissions.isViewOnlyMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditEmployee(employee)}
                            className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded p-1 transition-all duration-200"
                            title="تعديل"
                          >
                            <Edit className="h-3 w-3 no-flip" />
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!permissions.isViewOnlyMode &&
                          employee.status === "active" &&
                          hasRemainingBalance && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPaySalary(employee)}
                              disabled={
                                !hasRemainingBalance ||
                                employee.status !== "active"
                              }
                              className={`rounded p-1 transition-all duration-200 ${
                                hasRemainingBalance &&
                                employee.status === "active"
                                  ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                  : "text-slate-400 cursor-not-allowed opacity-50"
                              }`}
                              title={
                                hasRemainingBalance &&
                                employee.status === "active"
                                  ? "دفع الراتب"
                                  : "غير متاح"
                              }
                            >
                              <Wallet className="h-3 w-3 no-flip" />
                            </Button>
                          )}
                        {!permissions.isViewOnlyMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteEmployee(employee)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-all duration-200"
                            title="حذف"
                          >
                            <Trash2 className="h-3 w-3 no-flip" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-t-2 border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {employees.length}
            </div>
            <div className="text-slate-600 arabic-spacing text-sm font-medium">
              إجمالي الموظفين
            </div>
          </div>
          <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-green-200">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {employees.filter((emp) => emp.status === "active").length}
            </div>
            <div className="text-slate-600 arabic-spacing text-sm font-medium">
              الموظفون النشطون
            </div>
          </div>
          <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-blue-200">
            <div className="text-lg font-bold text-blue-600 mb-1">
              {formatCurrency(
                employees
                  .filter((emp) => emp.status === "active")
                  .reduce((sum, emp) => {
                    // If remaining is undefined, use full salary, else use remaining
                    return calculateMonthlySalary(emp);
                  }, 0)
              )}
            </div>
            <div className="text-slate-600 arabic-spacing text-sm font-medium">
              إجمالي الرواتب
            </div>
          </div>
          <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-purple-200">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {
                employees.filter((emp) => {
                  const remaining = remainingSalaries[emp.id];
                  return remaining !== undefined && remaining <= 0;
                }).length
              }
            </div>
            <div className="text-slate-600 arabic-spacing text-sm font-medium">
              مكتملة الدفع
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
