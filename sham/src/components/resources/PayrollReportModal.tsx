"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Wallet,
  Calculator,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { Employee } from "@/types";
import { useEmployee } from "@/contexts/EmployeeContext";
import { useSafe } from "@/contexts/SafeContext";
import { useResponsive } from "@/hooks/useResponsive";

interface PayrollReportModalProps {
  employees: Employee[];
  onClose: () => void;
}

export function PayrollReportModal({
  employees,
  onClose,
}: PayrollReportModalProps) {
  const { calculateMonthlySalary } = useEmployee();
  const { safeState } = useSafe();
  const { isMobile } = useResponsive();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [reportType, setReportType] = useState<"summary" | "detailed">(
    "summary"
  );

  // Calculate report data
  const activeEmployees = employees.filter((emp) => emp.status === "active");
  const totalEmployees = employees.length;
  const totalActiveEmployees = activeEmployees.length;
  const totalPayroll = activeEmployees.reduce(
    (sum, emp) => sum + calculateMonthlySalary(emp),
    0
  );
  const averageSalary =
    totalActiveEmployees > 0 ? totalPayroll / totalActiveEmployees : 0;
  const highestSalary = Math.max(
    ...activeEmployees.map((emp) => calculateMonthlySalary(emp)),
    0
  );
  const lowestSalary = Math.min(
    ...activeEmployees.map((emp) => calculateMonthlySalary(emp)),
    0
  );

  // Payment status analysis
  const paidEmployees = employees.filter((emp) => emp.last_payment_date).length;
  const unpaidEmployees = totalActiveEmployees - paidEmployees;
  const paymentCoverage =
    totalActiveEmployees > 0 ? (paidEmployees / totalActiveEmployees) * 100 : 0;

  // Safe analysis
  const canPayAll = safeState.currentBalance >= totalPayroll;
  const shortfall = Math.max(0, totalPayroll - safeState.currentBalance);

  // Department breakdown
  const departmentStats = activeEmployees.reduce((acc, emp) => {
    const dept = emp.department || "غير محدد";
    if (!acc[dept]) {
      acc[dept] = { count: 0, totalSalary: 0 };
    }
    acc[dept].count++;
    acc[dept].totalSalary += calculateMonthlySalary(emp);
    return acc;
  }, {} as Record<string, { count: number; totalSalary: number }>);

  const handlePrintReport = () => {
    const reportDate = new Date().toLocaleDateString("en-US");
    const monthName = new Date(selectedMonth + "-01").toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
      }
    );

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف الرواتب - ${monthName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            direction: rtl; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #1e40af; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .company-name { 
            font-size: 2.5rem; 
            font-weight: bold; 
            color: #1e40af; 
            margin-bottom: 10px; 
          }
          .report-title { 
            font-size: 1.5rem; 
            color: #374151; 
            margin-bottom: 5px; 
          }
          .report-date { 
            color: #6b7280; 
            font-size: 1rem; 
          }
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .summary-card { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
          }
          .summary-card h3 { 
            color: #1e40af; 
            font-size: 1.1rem; 
            margin-bottom: 10px; 
          }
          .summary-card .value { 
            font-size: 1.8rem; 
            font-weight: bold; 
            color: #111827; 
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
          }
          .table th, .table td { 
            border: 1px solid #d1d5db; 
            padding: 12px; 
            text-align: right; 
          }
          .table th { 
            background: #1e40af; 
            color: white; 
            font-weight: bold; 
          }
          .table tr:nth-child(even) { 
            background: #f9fafb; 
          }
          .department-section { 
            margin-bottom: 30px; 
          }
          .department-title { 
            font-size: 1.3rem; 
            color: #1e40af; 
            margin-bottom: 15px; 
            border-bottom: 2px solid #e2e8f0; 
            padding-bottom: 5px; 
          }
          .footer { 
            text-align: center; 
            color: #6b7280; 
            font-size: 0.9rem; 
            border-top: 1px solid #e2e8f0; 
            padding-top: 20px; 
            margin-top: 40px; 
          }
          @media print {
            body { print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="company-name">شركة قصر الشام</h1>
          <h2 class="report-title">كشف الرواتب الشهري</h2>
          <p class="report-date">شهر: ${monthName} | تاريخ الإصدار: ${reportDate}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <h3>إجمالي الموظفين</h3>
            <div class="value">${totalEmployees}</div>
          </div>
          <div class="summary-card">
            <h3>الموظفون النشطون</h3>
            <div class="value">${totalActiveEmployees}</div>
          </div>
          <div class="summary-card">
            <h3>إجمالي الرواتب</h3>
            <div class="value">${formatCurrency(totalPayroll)}</div>
          </div>
          <div class="summary-card">
            <h3>متوسط الراتب</h3>
            <div class="value">${formatCurrency(averageSalary)}</div>
          </div>
          <div class="summary-card">
            <h3>رصيد الخزينة</h3>
            <div class="value">${formatCurrency(safeState.currentBalance)}</div>
          </div>
          <div class="summary-card">
            <h3>حالة التغطية</h3>
            <div class="value" style="color: ${
              canPayAll ? "#059669" : "#dc2626"
            }">${canPayAll ? "كافي" : "غير كافي"}</div>
          </div>
        </div>

        ${
          reportType === "detailed"
            ? `
        <h2 class="department-title">تفاصيل الموظفين</h2>
        <table class="table">
          <thead>
            <tr>
              <th>اسم الموظف</th>
              <th>المنصب</th>
              <th>القسم</th>
              <th>الراتب الشهري</th>
              <th>الحالة</th>
              <th>آخر دفعة</th>
            </tr>
          </thead>
          <tbody>
            ${activeEmployees
              .map(
                (emp) => `
              <tr>
                <td>${emp.name}</td>
                <td>${emp.position || "غير محدد"}</td>
                <td>${emp.department || "غير محدد"}</td>
                <td>${formatCurrency(calculateMonthlySalary(emp))}</td>
                <td>${emp.status === "active" ? "نشط" : "غير نشط"}</td>
                <td>${
                  emp.last_payment_date
                    ? new Date(emp.last_payment_date).toLocaleDateString(
                        "en-US"
                      )
                    : "لم يتم الدفع"
                }</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        `
            : ""
        }

        <h2 class="department-title">تحليل الأقسام</h2>
        <table class="table">
          <thead>
            <tr>
              <th>القسم</th>
              <th>عدد الموظفين</th>
              <th>إجمالي الرواتب</th>
              <th>متوسط الراتب</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(departmentStats)
              .map(
                ([dept, stats]) => `
              <tr>
                <td>${dept}</td>
                <td>${stats.count}</td>
                <td>${formatCurrency(stats.totalSalary)}</td>
                <td>${formatCurrency(stats.totalSalary / stats.count)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية - شركة قصر الشام</p>
          <p>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden ${
          isMobile
            ? "max-w-full max-h-[95vh] rounded-t-2xl rounded-b-none mt-auto"
            : "max-w-6xl max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r from-blue-600 to-indigo-700 text-white ${
            isMobile ? "p-4" : "p-6"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <FileText
                  className={`no-flip text-blue-950 ${
                    isMobile ? "h-5 w-5" : "h-6 w-6"
                  }`}
                />
              </div>
              <div className="pr-2">
                <h2
                  className={`font-bold arabic-spacing ${
                    isMobile ? "text-lg" : "text-2xl"
                  }`}
                >
                  كشف الرواتب الشهري
                </h2>
                {!isMobile && (
                  <p className="text-blue-100 arabic-spacing">
                    تقرير شامل عن رواتب الموظفين والإحصائيات المالية
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
            >
              <X className="h-5 w-5 no-flip" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div
          className={`border-b border-gray-200 bg-gray-50 ${
            isMobile ? "p-4" : "p-6"
          }`}
        >
          <div
            className={`gap-4 items-start justify-between ${
              isMobile
                ? "space-y-4"
                : "flex flex-col sm:flex-row sm:items-center"
            }`}
          >
            <div
              className={`gap-4 ${
                isMobile ? "space-y-3" : "flex flex-col sm:flex-row"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="h-4 w-4 text-gray-500 no-flip" />
                <label className="text-sm font-medium text-gray-700 arabic-spacing">
                  الشهر:
                </label>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={isMobile ? "flex-1" : "min-w-[150px]"}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = `${date.getFullYear()}-${String(
                      date.getMonth() + 1
                    ).padStart(2, "0")}`;
                    const label = date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    });
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <FileText className="h-4 w-4 text-gray-500 no-flip" />
                <label className="text-sm font-medium text-gray-700 arabic-spacing">
                  نوع التقرير:
                </label>
                <Select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as "summary" | "detailed")
                  }
                  className={isMobile ? "flex-1" : "min-w-[120px]"}
                >
                  <option value="summary">ملخص</option>
                  <option value="detailed">تفصيلي</option>
                </Select>
              </div>
            </div>
            {!isMobile && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Button
                  onClick={handlePrintReport}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="h-4 w-4 ml-2 no-flip" />
                  طباعة التقرير
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className={`overflow-y-auto ${
            isMobile
              ? "p-4 max-h-[calc(95vh-140px)]"
              : "p-6 max-h-[calc(90vh-200px)]"
          }`}
        >
          {/* Summary Statistics */}
          <div
            className={`grid gap-4 mb-6 ${
              isMobile
                ? "grid-cols-1"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            }`}
          >
            <div
              className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 ${
                isMobile ? "p-4" : "p-6"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`font-medium text-blue-700 arabic-spacing mb-1 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    إجمالي الموظفين
                  </p>
                  <p
                    className={`font-bold text-blue-900 ${
                      isMobile ? "text-2xl" : "text-3xl"
                    }`}
                  >
                    {totalEmployees}
                  </p>
                  <p className="text-xs text-blue-600 arabic-spacing">
                    موظف مسجل
                  </p>
                </div>
                <div
                  className={`bg-blue-500 rounded-lg ${
                    isMobile ? "p-2" : "p-3"
                  }`}
                >
                  <Users
                    className={`text-white no-flip ${
                      isMobile ? "h-5 w-5" : "h-6 w-6"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div
              className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 ${
                isMobile ? "p-4" : "p-6"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 arabic-spacing mb-1">
                    الموظفون النشطون
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {totalActiveEmployees}
                  </p>
                  <p className="text-xs text-green-600 arabic-spacing">
                    يستلم راتب
                  </p>
                </div>
                <div className="bg-green-500 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white no-flip" />
                </div>
              </div>
            </div>

            <div
              className={`bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 ${
                isMobile ? "p-4" : "p-6"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 arabic-spacing mb-1">
                    إجمالي الرواتب
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(totalPayroll)}
                  </p>
                  <p className="text-xs text-purple-600 arabic-spacing">
                    شهرياً مطلوب
                  </p>
                </div>
                <div className="bg-purple-500 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white no-flip" />
                </div>
              </div>
            </div>

            <div
              className={`bg-gradient-to-br rounded-xl border ${
                isMobile ? "p-4" : "p-6"
              } ${
                canPayAll
                  ? "from-emerald-50 to-emerald-100 border-emerald-200"
                  : "from-red-50 to-red-100 border-red-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium arabic-spacing mb-1 ${
                      canPayAll ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    حالة التغطية
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      canPayAll ? "text-emerald-900" : "text-red-900"
                    }`}
                  >
                    {canPayAll ? "✓" : "✗"}
                  </p>
                  <p
                    className={`text-xs arabic-spacing ${
                      canPayAll ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {canPayAll
                      ? "رصيد كافي"
                      : `نقص ${formatCurrency(shortfall)}`}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    canPayAll ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {canPayAll ? (
                    <Wallet className="h-6 w-6 text-white no-flip" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-white no-flip" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Statistics */}
          <div
            className={`grid gap-4 mb-6 ${
              isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            }`}
          >
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4 flex items-center">
                <Calculator className="h-5 w-5 ml-2 text-blue-600 no-flip" />
                إحصائيات الرواتب
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    متوسط الراتب:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(averageSalary)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    أعلى راتب:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(highestSalary)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    أقل راتب:
                  </span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(lowestSalary)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4 flex items-center">
                <Clock className="h-5 w-5 ml-2 text-orange-600 no-flip" />
                حالة المدفوعات
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    تم الدفع:
                  </span>
                  <span className="font-semibold text-green-600">
                    {paidEmployees} موظف
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    في الانتظار:
                  </span>
                  <span className="font-semibold text-orange-600">
                    {unpaidEmployees} موظف
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    نسبة التغطية:
                  </span>
                  <span className="font-semibold text-blue-600">
                    {paymentCoverage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4 flex items-center">
                <Wallet className="h-5 w-5 ml-2 text-green-600 no-flip" />
                حالة الخزينة
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    الرصيد الحالي:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(safeState.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    المطلوب للرواتب:
                  </span>
                  <span className="font-semibold text-purple-600">
                    {formatCurrency(totalPayroll)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 arabic-spacing">
                    الفائض/النقص:
                  </span>
                  <span
                    className={`font-semibold ${
                      canPayAll ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {canPayAll ? "+" : "-"}
                    {formatCurrency(
                      Math.abs(safeState.currentBalance - totalPayroll)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <Building2 className="h-5 w-5 ml-2 text-indigo-600 no-flip" />
                تحليل الأقسام
              </h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                        القسم
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                        عدد الموظفين
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                        إجمالي الرواتب
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                        متوسط الراتب
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                        النسبة من الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(departmentStats).map(([dept, stats]) => (
                      <tr
                        key={dept}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900 arabic-spacing">
                          {dept}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {stats.count}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {formatCurrency(stats.totalSalary)}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {formatCurrency(stats.totalSalary / stats.count)}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {((stats.totalSalary / totalPayroll) * 100).toFixed(
                            1
                          )}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Employee List (if detailed report) */}
          {reportType === "detailed" && (
            <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                  <Users className="h-5 w-5 ml-2 text-blue-600 no-flip" />
                  تفاصيل الموظفين
                </h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                          اسم الموظف
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                          المنصب
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                          القسم
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                          الراتب الشهري
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                          الحالة
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 arabic-spacing">
                          آخر دفعة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 font-medium text-gray-900 arabic-spacing">
                            {employee.name}
                          </td>
                          <td className="py-3 px-4 text-gray-700 arabic-spacing">
                            {employee.position || "غير محدد"}
                          </td>
                          <td className="py-3 px-4 text-gray-700 arabic-spacing">
                            {employee.department || "غير محدد"}
                          </td>
                          <td className="py-3 px-4 text-gray-700 font-medium">
                            {formatCurrency(calculateMonthlySalary(employee))}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                employee.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {employee.status === "active" ? "نشط" : "غير نشط"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {employee.last_payment_date
                              ? new Date(
                                  employee.last_payment_date
                                ).toLocaleDateString("en-US")
                              : "لم يتم الدفع"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
