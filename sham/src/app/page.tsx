"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Wallet,
  Users,
  Receipt,
  BarChart3,
  ArrowLeft,
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  Bell,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedInvoice, EnhancedGeneralExpense } from "@/types/shared";
import { formatCurrency } from "@/lib/utils";

const moduleCards = [
  {
    id: "projects",
    title: "المشاريع",
    description: "إدارة مشاريع البناء والتشييد وتتبع الفواتير والمدفوعات",
    href: "/projects",
    icon: Building2,
    color: "from-[#182C61] to-blue-600",
    iconBg: "bg-blue-100",
    iconColor: "text-[#182C61]",
    stats: "8 مشاريع نشطة",
  },
  {
    id: "safe",
    title: "الخزينة",
    description:
      "إدارة التدفق النقدي وتسجيل جميع المعاملات المالية الواردة والصادرة",
    href: "/safe",
    icon: Wallet,
    color: "from-green-500 to-emerald-600",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    stats: "دفعات آمنة",
  },
  {
    id: "resources",
    title: "الموارد البشرية",
    description: "إدارة الموظفين والرواتب وكشوف الأجور الشهرية والعلاوات",
    href: "/resources",
    icon: Users,
    color: "from-purple-500 to-violet-600",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    stats: "25 موظف",
  },
  {
    id: "expenses",
    title: "المصروفات العامة",
    description:
      "تسجيل وإدارة التكاليف التشغيلية العامة غير المرتبطة بالمشاريع",
    href: "/general-expenses",
    icon: Receipt,
    color: "from-orange-500 to-red-600",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    stats: "تتبع دقيق",
  },
  {
    id: "reports",
    title: "التقارير المالية",
    description: "إنشاء وتصدير التقارير المالية التفصيلية والملخصة",
    href: "/financial-reports",
    icon: BarChart3,
    color: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    stats: "تحليل شامل",
  },
];

export default function HomePage() {
  const { hasPermission, isDataEntry, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  // Load pending items count for summary display (Admin only)
  useEffect(() => {
    if (hasPermission("canMakePayments")) {
      const loadPendingCounts = () => {
        let totalCount = 0;
        let totalAmount = 0;

        // Load pending invoices
        const storedInvoices = localStorage.getItem("financial-invoices");
        if (storedInvoices) {
          try {
            const invoices: EnhancedInvoice[] = JSON.parse(storedInvoices);
            const pendingInvoices = invoices.filter(
              (inv) => inv.status === "pending_approval"
            );
            totalCount += pendingInvoices.length;
            totalAmount += pendingInvoices.reduce(
              (sum, inv) => sum + inv.amount,
              0
            );
          } catch (error) {
            console.warn("Failed to load pending invoices:", error);
          }
        }

        // Load pending expenses
        const storedExpenses = localStorage.getItem("financial-expenses");
        if (storedExpenses) {
          try {
            const expenses: EnhancedGeneralExpense[] =
              JSON.parse(storedExpenses);
            const pendingExpenses = expenses.filter(
              (exp) => exp.status === "pending_approval"
            );
            totalCount += pendingExpenses.length;
            totalAmount += pendingExpenses.reduce(
              (sum, exp) => sum + exp.amount,
              0
            );
          } catch (error) {
            console.warn("Failed to load pending expenses:", error);
          }
        }

        setPendingCount(totalCount);
        setPendingAmount(totalAmount);
      };

      loadPendingCounts();

      // Refresh every 30 seconds
      const interval = setInterval(loadPendingCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [hasPermission]);

  // Filter modules based on user permissions
  const visibleModules = moduleCards.filter((module) => {
    if (isDataEntry()) {
      // Data entry users cannot access SAFE and HR modules
      return !["safe", "resources"].includes(module.id);
    }
    return hasPermission("canViewSafe") || module.id !== "safe";
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-8 page-transition">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-2xl p-8 shadow-xl border-0 mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-[#182C61] to-blue-600 p-3 rounded-full">
                <img
                  src="/QS-WHITE.svg"
                  alt="Logo"
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#182C61] to-blue-600 bg-clip-text text-transparent mb-4 arabic-spacing">
              نظام الإدارة المالية
            </h1>
            <p className="text-xl text-gray-600 mb-6 arabic-spacing">
              {isDataEntry()
                ? `مرحباً ${
                    user?.fullName || "موظف الإدخال"
                  } • نظام إدخال البيانات المالية`
                : `مرحباً ${user?.fullName || "المدير"} • لوحة التحكم الرئيسية`}
            </p>
            <div className="flex items-center justify-center space-x-6 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse text-green-600">
                <Target className="h-5 w-5 no-flip" />
                <span className="font-semibold arabic-spacing">
                  {isDataEntry() ? "إدخال البيانات" : "إدارة شاملة"}
                </span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-blue-600">
                <TrendingUp className="h-5 w-5 no-flip" />
                <span className="font-semibold arabic-spacing">
                  {isDataEntry() ? "دقة عالية" : "تحكم كامل"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals Summary - Admin Only */}
        {hasPermission("canMakePayments") && pendingCount > 0 && (
          <Card className="shadow-lg border-0 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-500 mb-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-amber-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-amber-600 no-flip animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-800 arabic-spacing mb-1">
                      {pendingCount} عنصر بانتظار الاعتماد
                    </h3>
                    <p className="text-sm text-amber-700 arabic-spacing">
                      فواتير ومصروفات تحتاج موافقتك •
                      <span className="font-medium">
                        {" "}
                        انقر على جرس الإشعارات للمراجعة والاعتماد
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600 arabic-nums">
                      {formatCurrency(pendingAmount)}
                    </div>
                    <div className="text-xs text-amber-600 arabic-spacing">
                      المبلغ الإجمالي المطلوب
                    </div>
                  </div>
                  <div className="bg-amber-500 text-white px-3 py-2 rounded-full flex items-center space-x-1 space-x-reverse">
                    <Bell className="h-4 w-4 no-flip" />
                    <span className="text-sm font-bold arabic-nums">
                      {pendingCount}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modules Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center arabic-spacing">
            {isDataEntry() ? "وحدات إدخال البيانات" : "وحدات النظام"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleModules.map((module) => (
              <Link key={module.id} href={module.href}>
                <Card className="group card-hover border-0 shadow-xl bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className={`h-32 bg-gradient-to-br ${module.color} flex items-center justify-center relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-black/10"></div>
                      <module.icon className="h-16 w-16 text-white no-flip relative z-10" />
                      <div className="absolute top-4 left-4">
                        <div className="text-white/80 text-sm font-medium arabic-spacing">
                          {module.stats}
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <CardTitle className="text-xl font-bold text-gray-900 arabic-spacing">
                          {module.title}
                        </CardTitle>
                        <div className={`${module.iconBg} p-2 rounded-full`}>
                          <module.icon
                            className={`h-5 w-5 ${module.iconColor} no-flip`}
                          />
                        </div>
                      </div>
                      <CardDescription className="text-gray-600 text-sm leading-relaxed arabic-spacing mb-4">
                        {isDataEntry() &&
                        (module.id === "projects" || module.id === "expenses")
                          ? module.description
                              .replace("إدارة", "إدخال بيانات")
                              .replace("وتتبع", "ومتابعة")
                          : module.description}
                      </CardDescription>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 group-hover:text-blue-600 transition-colors"
                        >
                          <span className="arabic-spacing ml-2">
                            {isDataEntry() ? "إدخال البيانات" : "إدارة"}
                          </span>
                          <ArrowLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
