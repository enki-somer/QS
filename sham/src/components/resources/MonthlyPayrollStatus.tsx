"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { Employee } from "@/types";
import { useEmployee } from "@/contexts/EmployeeContext";

interface MonthlyPayrollStatusProps {
  employees: Employee[];
  onRefresh?: () => void;
}

interface MonthlyStatus {
  currentMonth: string;
  monthName: string;
  totalEmployees: number;
  paidEmployees: number;
  unpaidEmployees: number;
  totalPayroll: number;
  paidAmount: number;
  remainingAmount: number;
  paymentProgress: number;
  isNewMonth: boolean;
  daysIntoMonth: number;
}

export function MonthlyPayrollStatus({
  employees,
  onRefresh,
}: MonthlyPayrollStatusProps) {
  const { calculateMonthlySalary, calculateRemainingSalary } = useEmployee();
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const calculateMonthlyStatus = async () => {
    setLoading(true);

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthName = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      const daysIntoMonth = now.getDate();

      // Check if it's a new month (first 3 days)
      const isNewMonth = daysIntoMonth <= 3;

      const activeEmployees = employees.filter(
        (emp) => emp.status === "active"
      );
      const totalEmployees = activeEmployees.length;

      // Calculate total payroll (base salaries)
      const totalPayroll = activeEmployees.reduce(
        (sum, emp) => sum + calculateMonthlySalary(emp),
        0
      );

      // Calculate actual remaining amounts for each employee using API
      const employeeRemainingSalaries = await Promise.all(
        activeEmployees.map(async (emp) => {
          try {
            const remainingSalary = await calculateRemainingSalary(emp);
            const baseSalary = calculateMonthlySalary(emp);
            const paidAmount = baseSalary - remainingSalary;
            return {
              employee: emp,
              baseSalary,
              remainingSalary,
              paidAmount,
              isFullyPaid: remainingSalary <= 0,
              isPartiallyPaid: paidAmount > 0 && remainingSalary > 0,
              isUnpaid: paidAmount <= 0,
            };
          } catch (error) {
            console.error(
              `Error calculating remaining salary for ${emp.name}:`,
              error
            );
            const baseSalary = calculateMonthlySalary(emp);
            return {
              employee: emp,
              baseSalary,
              remainingSalary: baseSalary, // Assume unpaid if error
              paidAmount: 0,
              isFullyPaid: false,
              isPartiallyPaid: false,
              isUnpaid: true,
            };
          }
        })
      );

      // Calculate accurate statistics
      const fullyPaidEmployees = employeeRemainingSalaries.filter(
        (e) => e.isFullyPaid
      ).length;
      const partiallyPaidEmployees = employeeRemainingSalaries.filter(
        (e) => e.isPartiallyPaid
      ).length;
      const unpaidEmployees = employeeRemainingSalaries.filter(
        (e) => e.isUnpaid
      ).length;

      const totalPaidAmount = employeeRemainingSalaries.reduce(
        (sum, e) => sum + e.paidAmount,
        0
      );
      const totalRemainingAmount = employeeRemainingSalaries.reduce(
        (sum, e) => sum + e.remainingSalary,
        0
      );

      const paymentProgress =
        totalPayroll > 0 ? (totalPaidAmount / totalPayroll) * 100 : 0;

      console.log("📊 Monthly Status Calculation:", {
        totalEmployees,
        fullyPaidEmployees,
        partiallyPaidEmployees,
        unpaidEmployees,
        totalPayroll,
        totalPaidAmount,
        totalRemainingAmount,
        paymentProgress: paymentProgress.toFixed(1) + "%",
      });

      setMonthlyStatus({
        currentMonth,
        monthName,
        totalEmployees,
        paidEmployees: fullyPaidEmployees + partiallyPaidEmployees, // Anyone who received any payment
        unpaidEmployees: unpaidEmployees, // Only completely unpaid employees
        totalPayroll,
        paidAmount: totalPaidAmount,
        remainingAmount: totalRemainingAmount,
        paymentProgress,
        isNewMonth,
        daysIntoMonth,
      });
    } catch (error) {
      console.error("Error calculating monthly status:", error);
      // Fallback to simple calculation
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthName = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      const daysIntoMonth = now.getDate();
      const isNewMonth = daysIntoMonth <= 3;
      const activeEmployees = employees.filter(
        (emp) => emp.status === "active"
      );
      const totalEmployees = activeEmployees.length;
      const totalPayroll = activeEmployees.reduce(
        (sum, emp) => sum + calculateMonthlySalary(emp),
        0
      );

      setMonthlyStatus({
        currentMonth,
        monthName,
        totalEmployees,
        paidEmployees: 0,
        unpaidEmployees: totalEmployees,
        totalPayroll,
        paidAmount: 0,
        remainingAmount: totalPayroll,
        paymentProgress: 0,
        isNewMonth,
        daysIntoMonth,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    calculateMonthlyStatus();
  }, [employees]);

  if (loading || !monthlyStatus) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (monthlyStatus.paymentProgress >= 100)
      return "text-green-600 bg-green-50 border-green-200";
    if (monthlyStatus.paymentProgress >= 50)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getStatusIcon = () => {
    if (monthlyStatus.paymentProgress >= 100) return CheckCircle;
    if (monthlyStatus.paymentProgress >= 50) return Clock;
    return AlertTriangle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-white no-flip" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing">
                حالة الرواتب الشهرية
              </h3>
              <p className="text-sm text-gray-600 arabic-spacing">
                {monthlyStatus.monthName} - اليوم {monthlyStatus.daysIntoMonth}
              </p>
            </div>
          </div>

          {monthlyStatus.isNewMonth && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium arabic-spacing">
              🆕 شهر جديد
            </div>
          )}

          {/* Refresh Button - Hidden to prevent overflow */}
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => {
              calculateMonthlyStatus();
              onRefresh?.();
            }}
            className="flex items-center space-x-2 space-x-reverse"
          >
            <RefreshCw className="h-4 w-4 no-flip" />
            <span className="arabic-spacing">تحديث</span>
          </Button> */}
        </div>
      </div>

      {/* Status Overview */}
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 arabic-spacing">
              تقدم دفع الرواتب
            </span>
            <span className="text-sm font-bold text-gray-900">
              {monthlyStatus.paymentProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                monthlyStatus.paymentProgress >= 100
                  ? "bg-green-500"
                  : monthlyStatus.paymentProgress >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(monthlyStatus.paymentProgress, 100)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Payment Status */}
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center space-x-2 space-x-reverse mb-2">
              <StatusIcon className="h-5 w-5" />
              <span className="font-medium arabic-spacing">حالة الدفع</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {monthlyStatus.paidEmployees}/{monthlyStatus.totalEmployees}
            </div>
            <div className="text-sm arabic-spacing">
              {monthlyStatus.unpaidEmployees > 0
                ? `${monthlyStatus.unpaidEmployees} موظف لم يتم دفع راتبه`
                : monthlyStatus.paidEmployees === monthlyStatus.totalEmployees
                ? "تم دفع جميع الرواتب"
                : `${monthlyStatus.paidEmployees} موظف تم دفع راتبه (كامل أو جزئي)`}
            </div>
          </div>

          {/* Financial Status */}
          <div className="p-4 rounded-lg border border-purple-200 bg-purple-50 text-purple-600">
            <div className="flex items-center space-x-2 space-x-reverse mb-2">
              <DollarSign className="h-5 w-5" />
              <span className="font-medium arabic-spacing">الوضع المالي</span>
            </div>
            <div className="text-lg font-bold mb-1">
              {formatCurrency(monthlyStatus.paidAmount)}
            </div>
            <div className="text-sm arabic-spacing">
              من أصل {formatCurrency(monthlyStatus.totalPayroll)}
            </div>
          </div>

          {/* Remaining Amount */}
          <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 text-orange-600">
            <div className="flex items-center space-x-2 space-x-reverse mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium arabic-spacing">المبلغ المتبقي</span>
            </div>
            <div className="text-lg font-bold mb-1">
              {formatCurrency(monthlyStatus.remainingAmount)}
            </div>
            <div className="text-sm arabic-spacing">
              {monthlyStatus.unpaidEmployees} موظف
            </div>
          </div>
        </div>

        {/* New Month Alert */}
        {monthlyStatus.isNewMonth &&
          monthlyStatus.unpaidEmployees === monthlyStatus.totalEmployees && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="bg-blue-500 p-1 rounded-full flex-shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4 text-white no-flip" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-800 arabic-spacing mb-1">
                    🎯 بداية شهر جديد - حالة نظيفة
                  </h4>
                  <p className="text-sm text-blue-700 arabic-spacing leading-relaxed">
                    لم يتم دفع أي رواتب بعد لهذا الشهر. جميع الموظفين (
                    {monthlyStatus.totalEmployees}) في انتظار دفع رواتبهم.
                    إجمالي المبلغ المطلوب:{" "}
                    {formatCurrency(monthlyStatus.totalPayroll)}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Completion Alert */}
        {monthlyStatus.paymentProgress >= 100 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3 space-x-reverse">
              <div className="bg-green-500 p-1 rounded-full flex-shrink-0 mt-0.5">
                <CheckCircle className="h-4 w-4 text-white no-flip" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 arabic-spacing mb-1">
                  ✅ تم إكمال دفع جميع الرواتب
                </h4>
                <p className="text-sm text-green-700 arabic-spacing">
                  تم دفع رواتب جميع الموظفين ({monthlyStatus.paidEmployees})
                  لشهر {monthlyStatus.monthName}. إجمالي المبلغ المدفوع:{" "}
                  {formatCurrency(monthlyStatus.paidAmount)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
