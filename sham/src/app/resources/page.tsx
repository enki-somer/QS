"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Building2,
  Wallet,
  AlertTriangle,
  CreditCard,
  Lock,
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
import { Employee } from "@/types";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { AddEmployeeModal } from "@/components/resources/AddEmployeeModal";
import { EmployeesTable } from "@/components/resources/EmployeesTable";
import { useAuth } from "@/contexts/AuthContext";

export default function ResourcesPage() {
  const { addToast } = useToast();
  const { safeState, deductForSalary, hasBalance } = useSafe();
  const { hasPermission, isDataEntry } = useAuth();
  const router = useRouter();

  // Redirect silently if user doesn't have employee management access (navigation should prevent this)
  useEffect(() => {
    if (!hasPermission("canManageEmployees")) {
      router.replace("/");
    }
  }, [hasPermission, router]);

  // Don't render if user doesn't have access
  if (!hasPermission("canManageEmployees")) {
    return null;
  }

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  // Load employees from localStorage on mount
  useEffect(() => {
    const storedEmployees = localStorage.getItem("financial-employees");
    if (storedEmployees) {
      try {
        setEmployees(JSON.parse(storedEmployees));
      } catch (error) {
        console.warn("Failed to load employees from localStorage:", error);
      }
    }
  }, []);

  // Save to localStorage whenever employees change
  useEffect(() => {
    localStorage.setItem("financial-employees", JSON.stringify(employees));
  }, [employees]);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeEmployees = employees.filter(
    (emp) => emp.status === "active"
  ).length;

  const calculateMonthlySalary = (employee: Employee) => {
    const baseSalary = employee.baseSalary;
    const bonuses = (employee.dailyBonus || 0) * 22; // Assuming 22 working days
    const overtime = (employee.overtimePay || 0) * 10; // Assuming 10 overtime hours
    const deductions = employee.deductions || 0;
    return baseSalary + bonuses + overtime - deductions;
  };

  const totalPayroll = employees.reduce(
    (sum, emp) => sum + calculateMonthlySalary(emp),
    0
  );

  const avgSalary = employees.length > 0 ? totalPayroll / employees.length : 0;

  const handlePaySalary = (employee: Employee) => {
    const salaryAmount = calculateMonthlySalary(employee);

    if (!hasBalance(salaryAmount)) {
      addToast({
        type: "error",
        title: "رصيد الخزينة غير كافي",
        message: `راتب ${employee.name} يتطلب ${formatCurrency(
          salaryAmount
        )} لكن الرصيد المتاح ${formatCurrency(safeState.currentBalance)}`,
      });
      return;
    }

    const paymentSuccess = deductForSalary(salaryAmount, employee.name);

    if (paymentSuccess) {
      addToast({
        type: "success",
        title: "تم دفع الراتب بنجاح",
        message: `تم دفع راتب ${employee.name} بمبلغ ${formatCurrency(
          salaryAmount
        )} من الخزينة`,
      });
    } else {
      addToast({
        type: "error",
        title: "فشل في دفع الراتب",
        message: "حدث خطأ أثناء دفع الراتب، يرجى المحاولة مرة أخرى",
      });
    }
  };

  return (
    <div className="space-y-6 page-transition">
      {/* Page Navigation */}
      <PageNavigation />

      {/* Page Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 arabic-spacing">
            الموارد البشرية
          </h1>
          <p className="text-gray-600 arabic-spacing leading-relaxed">
            إدارة الموظفين مع دفع الرواتب من الخزينة مباشرة
          </p>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
            <span className="flex items-center space-x-1 space-x-reverse">
              <Wallet className="h-4 w-4 no-flip" />
              <span className="arabic-spacing">
                رصيد الخزينة: {formatCurrency(safeState.currentBalance)}
              </span>
            </span>
            <span className="flex items-center space-x-1 space-x-reverse">
              <Users className="h-4 w-4 no-flip" />
              <span className="arabic-spacing">{employees.length} موظف</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 gap-2 space-x-reverse">
          <Button variant="outline">
            <Calendar className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">كشف الرواتب</span>
          </Button>
          <Button onClick={() => setShowEmployeeModal(true)}>
            <Plus className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">موظف جديد</span>
          </Button>
        </div>
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

      {/* HR Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي الموظفين
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {employees.length}
                </p>
                <div className="flex items-center text-sm text-blue-600">
                  <Users className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">موظف مسجل</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-lg">
                <Users className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  الموظفون النشطون
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {activeEmployees}
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <Users className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">يستلم راتب</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-xl shadow-lg">
                <Users className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي الرواتب المطلوبة
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(totalPayroll)}
                </p>
                <div className="flex items-center text-sm text-purple-600">
                  <DollarSign className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">شهرياً مطلوب</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-4 rounded-xl shadow-lg">
                <DollarSign className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  القدرة على الدفع
                </p>
                <p
                  className={`text-3xl font-bold ${
                    safeState.currentBalance >= totalPayroll
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {safeState.currentBalance >= totalPayroll ? "✓" : "✗"}
                </p>
                <div className="flex items-center text-sm">
                  <Wallet className="h-4 w-4 ml-1 no-flip" />
                  <span
                    className={`arabic-spacing ${
                      safeState.currentBalance >= totalPayroll
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {safeState.currentBalance >= totalPayroll
                      ? "رصيد كافي"
                      : `نقص ${formatCurrency(
                          totalPayroll - safeState.currentBalance
                        )}`}
                  </span>
                </div>
              </div>
              <div
                className={`p-4 rounded-xl shadow-lg ${
                  safeState.currentBalance >= totalPayroll
                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                    : "bg-gradient-to-br from-red-500 to-red-600"
                }`}
              >
                {safeState.currentBalance >= totalPayroll ? (
                  <DollarSign className="h-8 w-8 text-white no-flip" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-white no-flip" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
            <div className="flex items-center space-x-4 space-x-reverse">
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
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">إنشاء كشف راتب</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <EmployeesTable
          employees={filteredEmployees}
          onViewEmployee={(employee) => {
            // Will implement view modal later
            console.log("View employee:", employee);
          }}
          onEditEmployee={(employee) => {
            // Will implement edit modal later
            console.log("Edit employee:", employee);
          }}
          onDeleteEmployee={(employee) => {
            if (confirm(`هل أنت متأكد من حذف ${employee.name}؟`)) {
              setEmployees(employees.filter((e) => e.id !== employee.id));
              addToast({
                type: "success",
                title: "تم حذف الموظف",
                message: `تم حذف ${employee.name} من قائمة الموظفين`,
              });
            }
          }}
          onPaySalary={handlePaySalary}
          canPaySalary={hasBalance}
        />
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <Card className="shadow-lg border-0">
          <CardContent className="p-16 text-center">
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
        <AddEmployeeModal
          onClose={() => setShowEmployeeModal(false)}
          onSave={(newEmployee) => {
            setEmployees([...employees, newEmployee]);
            setShowEmployeeModal(false);
            addToast({
              type: "success",
              title: "تمت إضافة الموظف",
              message: `تم إضافة ${newEmployee.name} بنجاح إلى قائمة الموظفين`,
            });
          }}
        />
      )}
    </div>
  );
}
