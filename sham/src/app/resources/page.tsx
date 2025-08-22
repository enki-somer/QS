"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import PageNavigation from "@/components/layout/PageNavigation";
import { Employee, Position } from "@/types";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { EnhancedAddEmployeeModal } from "@/components/resources/EnhancedAddEmployeeModal";
import { EnhancedEmployeesTable } from "@/components/resources/EnhancedEmployeesTable";
import { EmployeeViewModal } from "@/components/resources/EmployeeViewModal";
import { SalaryPaymentModal } from "@/components/resources/SalaryPaymentModal";
import { PayrollReportModal } from "@/components/resources/PayrollReportModal";
import { MonthlyPayrollStatus } from "@/components/resources/MonthlyPayrollStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployee } from "@/contexts/EmployeeContext";
import { useResponsive } from "@/hooks/useResponsive";

export default function ResourcesPage() {
  const { addToast } = useToast();
  const { safeState, deductForSalary, hasBalance } = useSafe();
  const { hasPermission, isDataEntry } = useAuth();
  const { isMobile } = useResponsive();
  const {
    employees,
    positions,
    projects,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    processSalaryPayment,
    calculateMonthlySalary,
    getPaymentStatusColor,
  } = useEmployee();
  const router = useRouter();

  // Redirect silently if user doesn't have employee management access (navigation should prevent this)
  useEffect(() => {
    if (!hasPermission("canManageEmployees")) {
      router.replace("/");
    }
  }, [hasPermission, router]);

  // Permission check moved after hooks to satisfy Rules of Hooks

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSalaryPaymentModal, setShowSalaryPaymentModal] = useState(false);
  const [showPayrollReportModal, setShowPayrollReportModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  // Guard rendering after all hooks are declared
  if (!hasPermission("canManageEmployees")) {
    return null;
  }

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.position &&
        employee.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employee.mobile_number && employee.mobile_number.includes(searchQuery));
    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePaySalary = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowSalaryPaymentModal(true);
  };

  const handleSalaryPaymentComplete = () => {
    // Refresh employees data after payment
    fetchEmployees();
    setShowSalaryPaymentModal(false);
    setSelectedEmployee(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6 page-transition">
        {/* PageNavigation hidden - using hamburger menu */}
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 arabic-spacing">
              جاري تحميل بيانات الموظفين...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Page Navigation - Hidden on mobile, using hamburger menu instead */}
      <PageNavigation />

      {/* Monthly Payroll Status */}
      <MonthlyPayrollStatus
        employees={employees}
        onRefresh={() => fetchEmployees()}
      />
      {/* Page Header */}
      <div
        className={`bg-blue-950 rounded-xl text-white shadow-sm border border-gray-200 p-4 md:p-6 ${
          isMobile ? "space-y-4" : "flex items-center justify-between"
        }`}
      >
        <div className="space-y-2">
          <h1
            className={`font-bold text-white arabic-spacing ${
              isMobile ? "text-xl" : "text-3xl"
            }`}
          >
            الموارد البشرية
          </h1>
          {!isMobile && (
            <p className="text-white arabic-spacing leading-relaxed">
              إدارة الموظفين مع دفع الرواتب من الخزينة مباشرة
            </p>
          )}
          <div
            className={`flex items-center text-sm text-gray-500 ${
              isMobile
                ? "flex-col space-y-2 items-start"
                : "space-x-4 space-x-reverse"
            }`}
          >
            <span className="flex items-center space-x-1 space-x-reverse">
              <Wallet className="h-4 w-4 no-flip text-white" />
              <span className="arabic-spacing text-emerald-300 pr-1 pl-1">
                رصيد الخزينة: {formatCurrency(safeState.currentBalance)}
              </span>
            </span>
            <span className="flex items-center space-x-1 space-x-reverse">
              <Users className="h-4 w-4 no-flip text-white" />
              <span className="arabic-spacing text-amber-300">
                {employees.length} موظف
              </span>
            </span>
          </div>
        </div>

        {!isMobile && (
          <div className="flex items-center space-x-4 gap-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setShowPayrollReportModal(true)}
              className="border-white text-black hover:bg-white hover:text-blue-950"
            >
              <Calendar className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">كشف الرواتب</span>
            </Button>
            <Button
              onClick={() => setShowEmployeeModal(true)}
              className="bg-white text-blue-950 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">موظف جديد</span>
            </Button>
          </div>
        )}
      </div>

      {/* SAFE Balance Alert */}
      {safeState.currentBalance <= 0 && (
        <Card className="shadow-lg border-0 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 no-flip" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 arabic-spacing mb-2">
                  لا يمكن دفع الرواتب - الخزينة فارغة
                </h3>
                <p className="text-red-700 arabic-spacing mb-4 leading-relaxed">
                  يجب تمويل الخزينة أولاً قبل تتمكن من دفع رواتب الموظفين. انتقل
                  إلى صفحة الخزينة لإضافة الأموال.
                </p>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => {
                    window.location.href = "/safe";
                  }}
                >
                  <Wallet className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">انتقل لتمويل الخزينة</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className={`${isMobile ? "p-4" : "p-6"}`}>
          <div
            className={`${
              isMobile ? "space-y-3" : "flex flex-col sm:flex-row gap-4"
            }`}
          >
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 no-flip" />
                <Input
                  placeholder="البحث عن الموظفين أو المناصب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 arabic-spacing"
                />
              </div>
            </div>
            <div
              className={`flex items-center ${
                isMobile ? "justify-between" : "space-x-4 space-x-reverse"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <Filter className="h-4 w-4 text-gray-500 no-flip" />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">جميع الموظفين</option>
                  <option value="active">النشطون فقط</option>
                  <option value="inactive">غير النشطين</option>
                </Select>
              </div>
              {/* Extra payroll report button (kept hidden on mobile to avoid overflow) */}
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPayrollReportModal(true)}
                >
                  <Calendar className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">إنشاء كشف راتب</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Employee Cards - Show on mobile only */}
      <div className="block md:hidden">
        <MobileEmployeeCards
          employees={filteredEmployees}
          positions={positions}
        />
      </div>

      {/* Desktop Employee Table - Show on desktop only */}
      <div className="hidden md:block">
        <EnhancedEmployeesTable
          employees={filteredEmployees}
          onViewEmployee={(employee) => {
            setSelectedEmployee(employee);
            setShowViewModal(true);
          }}
          onEditEmployee={(employee) => {
            setSelectedEmployee(employee);
            setShowEmployeeModal(true);
          }}
          onDeleteEmployee={async (employee) => {
            if (confirm(`هل أنت متأكد من حذف ${employee.name}؟`)) {
              await deleteEmployee(employee.id);
            }
          }}
          onPaySalary={handlePaySalary}
          canPaySalary={hasBalance}
        />
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <Card className="shadow-lg border-0">
          <CardContent className={`text-center ${isMobile ? "p-8" : "p-16"}`}>
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-12 w-12 text-gray-400 no-flip" />
            </div>
            <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
              {searchQuery || statusFilter !== "all"
                ? "لا توجد نتائج"
                : "لا يوجد موظفون بعد"}
            </h3>
            <p className="text-gray-500 mb-8 arabic-spacing text-lg leading-relaxed max-w-md mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "جرب تعديل معايير البحث أو الفلاتر"
                : "أضف الموظفين لإدارة الرواتب. الرواتب ستُدفع مباشرة من الخزينة مع تسجيل كامل"}
            </p>
            <div className="space-y-4">
              {/* Add Employee Button */}
              <Button onClick={() => setShowEmployeeModal(true)}>
                <Plus className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">إضافة موظف جديد</span>
              </Button>

              {/* HR Flow Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto mt-6">
                <h4 className="font-semibold text-blue-800 arabic-spacing mb-2">
                  💼 نظام إدارة الرواتب:
                </h4>
                <ol className="text-sm text-blue-700 arabic-spacing space-y-1 text-right">
                  <li>1. إضافة الموظفين مع تفاصيل الراتب</li>
                  <li>2. حساب الراتب الشهري (أساسي + علاوات - خصومات)</li>
                  <li>3. دفع الرواتب من الخزينة مباشرة</li>
                  <li>4. تسجيل جميع المدفوعات في سجل المعاملات</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <EnhancedAddEmployeeModal
          employee={selectedEmployee}
          positions={positions}
          projects={projects}
          onClose={() => {
            setShowEmployeeModal(false);
            setSelectedEmployee(null);
          }}
          onSave={async (employeeData) => {
            try {
              if (selectedEmployee) {
                // Update existing employee
                await updateEmployee(selectedEmployee.id, employeeData);
              } else {
                // Create new employee
                await createEmployee(employeeData);
              }
              setShowEmployeeModal(false);
              setSelectedEmployee(null);
            } catch (error) {
              // Error handling is done in the EmployeeContext
              console.error("Employee save error:", error);
            }
          }}
        />
      )}

      {/* Employee View Modal */}
      {showViewModal && selectedEmployee && (
        <EmployeeViewModal
          employee={selectedEmployee}
          onClose={() => {
            setShowViewModal(false);
            setSelectedEmployee(null);
          }}
          onEdit={() => {
            setShowViewModal(false);
            setShowEmployeeModal(true);
            // selectedEmployee is already set
          }}
        />
      )}

      {/* Salary Payment Modal */}
      {showSalaryPaymentModal && selectedEmployee && (
        <SalaryPaymentModal
          employee={selectedEmployee}
          onClose={() => {
            setShowSalaryPaymentModal(false);
            setSelectedEmployee(null);
          }}
          onPaymentComplete={handleSalaryPaymentComplete}
        />
      )}

      {/* Payroll Report Modal */}
      {showPayrollReportModal && (
        <PayrollReportModal
          employees={employees}
          onClose={() => setShowPayrollReportModal(false)}
        />
      )}
    </div>
  );
}

// Mobile Employee Cards Component
function MobileEmployeeCards({
  employees,
  positions,
}: {
  employees: Employee[];
  positions: Position[];
}) {
  // If no employees, return null to let empty state show
  if (!employees || employees.length === 0) {
    return null;
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "bg-emerald-500",
          textColor: "text-white",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
          text: "نشط",
          icon: "✓",
        };
      case "inactive":
        return {
          color: "bg-red-500",
          textColor: "text-white",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          text: "غير نشط",
          icon: "⏸",
        };
      case "terminated":
        return {
          color: "bg-gray-500",
          textColor: "text-white",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          text: "منتهي الخدمة",
          icon: "✕",
        };
      default:
        return {
          color: "bg-blue-500",
          textColor: "text-white",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          text: status,
          icon: "?",
        };
    }
  };

  const getPaymentStatusConfig = (paymentStatus: string | undefined) => {
    // Handle undefined, null, empty string, or literal "undefined"/"null" strings
    if (
      !paymentStatus ||
      paymentStatus === "undefined" ||
      paymentStatus === "null" ||
      paymentStatus.trim() === "" ||
      paymentStatus === "غير محدد"
    ) {
      return {
        color: "text-blue-600",
        bg: "bg-blue-100",
        text: "لم يتم تحديده",
      };
    }

    const status = paymentStatus.toLowerCase().trim();
    switch (status) {
      case "paid":
      case "مدفوع":
        return { color: "text-green-600", bg: "bg-green-100", text: "مدفوع" };
      case "pending":
      case "معلق":
        return { color: "text-orange-600", bg: "bg-orange-100", text: "معلق" };
      case "overdue":
      case "متأخر":
        return { color: "text-red-600", bg: "bg-red-100", text: "متأخر" };
      case "unpaid":
      case "غير مدفوع":
        return { color: "text-red-600", bg: "bg-red-100", text: "غير مدفوع" };
      case "current":
      case "جاري":
        return { color: "text-blue-600", bg: "bg-blue-100", text: "جاري" };
      case "partial":
      case "جزئي":
        return { color: "text-yellow-600", bg: "bg-yellow-100", text: "جزئي" };
      default:
        // Return a default status without console log to prevent infinite loops
        return {
          color: "text-blue-600",
          bg: "bg-blue-100",
          text: "لم يتم تحديده",
        };
    }
  };

  return (
    <div className="space-y-4">
      {employees.map((employee) => {
        const statusConfig = getStatusConfig(employee.status);
        const paymentConfig = getPaymentStatusConfig(employee.payment_status);

        return (
          <div
            key={employee.id}
            className={`bg-white rounded-2xl border-2 ${statusConfig.borderColor} overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300`}
          >
            {/* Employee Header with Status */}
            <div
              className={`${statusConfig.bgColor} p-4 border-b ${statusConfig.borderColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div
                    className={`${statusConfig.color} p-3 rounded-full shadow-md`}
                  >
                    <Users className="h-5 w-5 text-white no-flip" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 arabic-spacing">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-gray-600 arabic-spacing font-medium">
                      {employee.position || "غير محدد"}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`${statusConfig.color} px-3 py-1.5 rounded-full shadow-sm`}
                >
                  <span
                    className={`text-xs font-bold ${statusConfig.textColor} arabic-spacing`}
                  >
                    {statusConfig.icon} {statusConfig.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Details */}
            <div className="p-4 space-y-4">
              {/* Contact Information */}
              <div className="grid grid-cols-1 gap-3">
                {employee.mobile_number && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <span className="text-blue-600 text-sm font-bold">
                        📞
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 arabic-spacing">
                        رقم الهاتف
                      </p>
                      <p className="text-sm font-semibold text-gray-900 arabic-nums">
                        {employee.mobile_number}
                      </p>
                    </div>
                  </div>
                )}

                {employee.department && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <span className="text-purple-600 text-sm font-bold">
                        🏢
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 arabic-spacing">
                        القسم
                      </p>
                      <p className="text-sm font-semibold text-gray-900 arabic-spacing">
                        {employee.department}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Information */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-green-600 text-lg">💰</span>
                    <span className="text-sm font-medium text-green-800 arabic-spacing">
                      الراتب الشهري
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(employee.monthly_salary || 0)}
                  </span>
                </div>

                {/* Payment Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 arabic-spacing">
                    حالة الدفع:
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${paymentConfig.bg} ${paymentConfig.color}`}
                  >
                    {paymentConfig.text}
                  </span>
                </div>
              </div>

              {/* Employment Details */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                {employee.hire_date && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 arabic-spacing mb-1">
                      تاريخ التوظيف
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(employee.hire_date)}
                    </p>
                  </div>
                )}

                {employee.last_payment_date && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 arabic-spacing mb-1">
                      آخر دفعة
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(employee.last_payment_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Project Assignment */}
              {employee.project_name && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-blue-600 text-sm">🏗️</span>
                    <div className="flex-1">
                      <p className="text-xs text-blue-600 arabic-spacing font-medium">
                        معين على مشروع
                      </p>
                      <p className="text-sm font-semibold text-blue-900 arabic-spacing">
                        {employee.project_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {employee.notes && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 arabic-spacing mb-1">
                    ملاحظات
                  </p>
                  <p className="text-sm text-gray-700 arabic-spacing leading-relaxed">
                    {employee.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
