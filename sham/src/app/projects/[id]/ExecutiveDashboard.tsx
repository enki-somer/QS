"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wallet,
  Building2,
  Receipt,
  Target,
  Activity,
  PieChart,
  BarChart3,
  Zap,
  Shield,
} from "lucide-react";
import { FinancialDisplay } from "@/components/ui/FinancialDisplay";
import { formatCurrency } from "@/lib/utils";

interface ExecutiveDashboardProps {
  project: any;
  safeTotal: number;
  allocatedBudget: number;
  safeSpending: number;
  transformedAssignments: any[];
  projectExpenses: any[];
}

export default function ExecutiveDashboard({
  project,
  safeTotal,
  allocatedBudget,
  safeSpending,
  transformedAssignments,
  projectExpenses,
}: ExecutiveDashboardProps) {
  // Calculate key metrics
  const remainingBudget = Math.max(0, safeTotal - safeSpending);
  const budgetUtilization =
    safeTotal > 0 ? (safeSpending / safeTotal) * 100 : 0;
  const totalAssignments = transformedAssignments.length;
  const activeAssignments = transformedAssignments.filter(
    (a) => a.status === "active"
  ).length;
  const frozenAssignments = transformedAssignments.filter(
    (a) => a.status === "frozen"
  ).length;
  const totalInvoices = transformedAssignments.reduce(
    (sum, a) => sum + (a.total_invoices || 0),
    0
  );
  const pendingInvoices = transformedAssignments.reduce(
    (sum, a) => sum + (a.pending_invoices || 0),
    0
  );

  // Risk assessment
  const riskLevel =
    budgetUtilization > 90 ? "high" : budgetUtilization > 70 ? "medium" : "low";
  const riskColor =
    riskLevel === "high"
      ? "text-red-600"
      : riskLevel === "medium"
      ? "text-amber-600"
      : "text-green-600";
  const riskBg =
    riskLevel === "high"
      ? "bg-red-50 border-red-200"
      : riskLevel === "medium"
      ? "bg-amber-50 border-amber-200"
      : "bg-green-50 border-green-200";

  return (
    <div className="space-y-6">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Budget */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                <FinancialDisplay value={safeTotal} />
              </div>
              <div className="text-blue-200 text-sm">إجمالي الميزانية</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-blue-200 text-sm">الحالة</div>
            <div className="flex items-center space-x-1 space-x-reverse">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm">مُعتمد</span>
            </div>
          </div>
        </div>

        {/* Spent Amount */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                <FinancialDisplay value={safeSpending} />
              </div>
              <div className="text-purple-200 text-sm">المصروف الفعلي</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-purple-200 text-sm">معدل الإنفاق</div>
            <div className="text-sm font-semibold">
              {budgetUtilization.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Target className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                <FinancialDisplay value={remainingBudget} />
              </div>
              <div className="text-emerald-200 text-sm">المتبقي</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-emerald-200 text-sm">نسبة المتبقي</div>
            <div className="text-sm font-semibold">
              {(100 - budgetUtilization).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div
          className={`bg-gradient-to-br ${
            riskLevel === "high"
              ? "from-red-600 to-red-700"
              : riskLevel === "medium"
              ? "from-amber-600 to-amber-700"
              : "from-green-600 to-green-700"
          } rounded-2xl p-6 text-white shadow-xl`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {riskLevel === "high"
                  ? "عالي"
                  : riskLevel === "medium"
                  ? "متوسط"
                  : "منخفض"}
              </div>
              <div
                className={`${
                  riskLevel === "high"
                    ? "text-red-200"
                    : riskLevel === "medium"
                    ? "text-amber-200"
                    : "text-green-200"
                } text-sm`}
              >
                مستوى المخاطر
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div
              className={`${
                riskLevel === "high"
                  ? "text-red-200"
                  : riskLevel === "medium"
                  ? "text-amber-200"
                  : "text-green-200"
              } text-sm`}
            >
              التقييم
            </div>
            <div className="flex items-center space-x-1 space-x-reverse">
              {riskLevel === "high" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : riskLevel === "medium" ? (
                <Clock className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {riskLevel === "high"
                  ? "يتطلب انتباه"
                  : riskLevel === "medium"
                  ? "مراقبة"
                  : "مستقر"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 arabic-spacing">
            تقدم المشروع المالي
          </h3>
          <div className="text-2xl font-bold text-gray-800">
            {budgetUtilization.toFixed(1)}%
          </div>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-1000 ${
                budgetUtilization > 90
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : budgetUtilization > 70
                  ? "bg-gradient-to-r from-amber-500 to-amber-600"
                  : "bg-gradient-to-r from-green-500 to-green-600"
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {totalAssignments}
              </div>
              <div className="text-sm text-gray-600">إجمالي التعيينات</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-green-100 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {activeAssignments}
              </div>
              <div className="text-sm text-gray-600">تعيينات نشطة</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Receipt className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {totalInvoices}
              </div>
              <div className="text-sm text-gray-600">إجمالي الفواتير</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {pendingInvoices}
              </div>
              <div className="text-sm text-gray-600">فواتير معلقة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Section */}
      {(budgetUtilization > 80 ||
        frozenAssignments > 0 ||
        pendingInvoices > 5) && (
        <div className={`${riskBg} border rounded-2xl p-6`}>
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <AlertTriangle className={`h-6 w-6 ${riskColor}`} />
            <h3 className={`text-lg font-bold ${riskColor} arabic-spacing`}>
              تنبيهات مالية
            </h3>
          </div>
          <div className="space-y-3">
            {budgetUtilization > 80 && (
              <div className="flex items-center space-x-2 space-x-reverse text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">
                  نسبة الإنفاق عالية ({budgetUtilization.toFixed(1)}%)
                </span>
              </div>
            )}
            {frozenAssignments > 0 && (
              <div className="flex items-center space-x-2 space-x-reverse text-sm">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                <span className="text-gray-700">
                  {frozenAssignments} تعيين مجمد
                </span>
              </div>
            )}
            {pendingInvoices > 5 && (
              <div className="flex items-center space-x-2 space-x-reverse text-sm">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-gray-700">
                  {pendingInvoices} فاتورة تحتاج اعتماد
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
