"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Building2,
  Users,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Printer,
  Eye,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
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
import { formatCurrency, formatDate } from "@/lib/utils";
import PageNavigation from "@/components/layout/PageNavigation";
import { useSafe } from "@/contexts/SafeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Project } from "@/types";

interface ExtendedProject extends Project {
  invoices?: Array<{
    id: string;
    totalAmount: number;
    status: string;
  }>;
}

interface ReportSummary {
  safeBalance: number;
  totalProjectBudgets: number;
  totalInvoicesAmount: number;
  totalEmployeeSalaries: number;
  totalGeneralExpenses: number;
  netCashFlow: number;
  activeProjects: number;
  completedProjects: number;
  totalEmployees: number;
  pendingInvoices: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  netFlow: number;
}

const availableReports = [
  {
    id: "project-summary",
    title: "تقرير المشاريع",
    description: "ملخص شامل لجميع المشاريع وحالتها المالية",
    icon: Building2,
    color: "bg-blue-500",
  },
  {
    id: "cash-flow",
    title: "تقرير التدفق النقدي",
    description: "تفاصيل الواردات والمصروفات النقدية",
    icon: Wallet,
    color: "bg-green-500",
  },
  {
    id: "payroll",
    title: "تقرير الرواتب",
    description: "كشوف رواتب الموظفين والمدفوعات",
    icon: Users,
    color: "bg-purple-500",
  },
  {
    id: "expenses",
    title: "تقرير المصروفات",
    description: "تحليل المصروفات العامة والتكاليف التشغيلية",
    icon: Receipt,
    color: "bg-orange-500",
  },
  {
    id: "profit-loss",
    title: "تقرير الأرباح والخسائر",
    description: "بيان شامل للأرباح والخسائر المالية",
    icon: TrendingUp,
    color: "bg-red-500",
  },
  {
    id: "financial-overview",
    title: "النظرة المالية العامة",
    description: "ملخص شامل لجميع الأنشطة المالية",
    icon: BarChart3,
    color: "bg-indigo-500",
  },
];

export default function FinancialReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [selectedReport, setSelectedReport] = useState("financial-overview");
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
    null
  );
  const [projects, setProjects] = useState<ExtendedProject[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [generalExpenses, setGeneralExpenses] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<
    ExpenseCategory[]
  >([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { safeState } = useSafe();
  const { hasPermission, isDataEntry } = useAuth();

  // Load and calculate data
  useEffect(() => {
    const loadReportData = () => {
      try {
        setIsLoading(true);

        // Load projects
        const storedProjects = localStorage.getItem("projects");
        const projectsData = storedProjects ? JSON.parse(storedProjects) : [];
        setProjects(projectsData);

        // Load employees
        const storedEmployees = localStorage.getItem("employees");
        const employeesData = storedEmployees
          ? JSON.parse(storedEmployees)
          : [];
        setEmployees(employeesData);

        // Load general expenses
        const storedExpenses = localStorage.getItem("generalExpenses");
        const expensesData = storedExpenses ? JSON.parse(storedExpenses) : [];
        setGeneralExpenses(expensesData);

        // Calculate summary
        const activeProjects = projectsData.filter(
          (p: ExtendedProject) => p.status === "active"
        ).length;
        const completedProjects = projectsData.filter(
          (p: ExtendedProject) => p.status === "completed"
        ).length;

        const totalProjectBudgets = projectsData.reduce(
          (sum: number, p: ExtendedProject) => sum + (p.budgetEstimate || 0),
          0
        );

        const totalInvoicesAmount = projectsData.reduce(
          (sum: number, p: ExtendedProject) => {
            return (
              sum +
              (p.invoices?.reduce(
                (invSum: number, inv: any) => invSum + (inv.totalAmount || 0),
                0
              ) || 0)
            );
          },
          0
        );

        const totalEmployeeSalaries = employeesData.reduce(
          (sum: number, emp: any) => sum + (emp.salary || 0),
          0
        );
        const totalGeneralExpenses = expensesData.reduce(
          (sum: number, exp: any) => sum + (exp.amount || 0),
          0
        );

        const netCashFlow = safeState.currentBalance;

        const summary: ReportSummary = {
          safeBalance: safeState.currentBalance,
          totalProjectBudgets,
          totalInvoicesAmount,
          totalEmployeeSalaries,
          totalGeneralExpenses,
          netCashFlow,
          activeProjects,
          completedProjects,
          totalEmployees: employeesData.length,
          pendingInvoices: projectsData.reduce(
            (sum: number, p: ExtendedProject) => {
              return (
                sum +
                (p.invoices?.filter((inv: any) => inv.status === "معلقة")
                  .length || 0)
              );
            },
            0
          ),
        };

        setReportSummary(summary);

        // Calculate expenses by category
        const categoryMap = new Map<
          string,
          { amount: number; transactions: number }
        >();

        // Add general expenses
        expensesData.forEach((exp: any) => {
          const existing = categoryMap.get(exp.category) || {
            amount: 0,
            transactions: 0,
          };
          categoryMap.set(exp.category, {
            amount: existing.amount + (exp.amount || 0),
            transactions: existing.transactions + 1,
          });
        });

        // Add salary expenses
        if (totalEmployeeSalaries > 0) {
          const existing = categoryMap.get("الرواتب والأجور") || {
            amount: 0,
            transactions: 0,
          };
          categoryMap.set("الرواتب والأجور", {
            amount: existing.amount + totalEmployeeSalaries,
            transactions: existing.transactions + employeesData.length,
          });
        }

        const totalExpenses = Array.from(categoryMap.values()).reduce(
          (sum, cat) => sum + cat.amount,
          0
        );

        const expenseCategories: ExpenseCategory[] = Array.from(
          categoryMap.entries()
        )
          .map(([category, data]) => ({
            category,
            amount: data.amount,
            percentage:
              totalExpenses > 0
                ? Math.round((data.amount / totalExpenses) * 100)
                : 0,
            transactions: data.transactions,
          }))
          .sort((a, b) => b.amount - a.amount);

        setExpensesByCategory(expenseCategories);

        // Calculate monthly trend from SAFE transactions
        const monthlyMap = new Map<
          string,
          { income: number; expenses: number }
        >();

        safeState.transactions.forEach((transaction) => {
          const date = new Date(transaction.date);
          const monthKey = date.toLocaleDateString("ar-IQ", {
            month: "long",
            year: "numeric",
          });

          const existing = monthlyMap.get(monthKey) || {
            income: 0,
            expenses: 0,
          };

          if (
            transaction.type === "funding" ||
            transaction.type === "invoice_payment"
          ) {
            existing.income += transaction.amount;
          } else {
            existing.expenses += transaction.amount;
          }

          monthlyMap.set(monthKey, existing);
        });

        const trends: MonthlyTrend[] = Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            month,
            income: data.income,
            expenses: data.expenses,
            netFlow: data.income - data.expenses,
          }))
          .slice(-6); // Last 6 months

        setMonthlyTrend(trends);
      } catch (error) {
        console.error("Error loading report data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [safeState]);

  const refreshData = () => {
    setIsLoading(true);
    // Trigger data reload
    window.location.reload();
  };

  if (isLoading || !reportSummary) {
    return (
      <div className="space-y-6 page-transition">
        <PageNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[#182C61] mx-auto mb-4" />
            <p className="text-gray-600 arabic-spacing">
              جاري تحميل التقارير المالية...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-transition">
      {/* Page Navigation */}
      <PageNavigation />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 arabic-spacing">
            التقارير المالية
          </h1>
          <p className="text-gray-600 mt-1 arabic-spacing">
            تحليل شامل للأداء المالي مع البيانات المحدثة من النظام
          </p>
        </div>
        <div className="flex items-center space-x-3 gap-2 space-x-reverse">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">تحديث</span>
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">طباعة</span>
          </Button>
          <Button>
            <Download className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">تصدير PDF</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center space-x-2 space-x-reverse">
              {/* <Filter className="h-4 w-4 text-gray-500 no-flip" /> */}
              <Select
                value={selectedPeriod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedPeriod(e.target.value)
                }
                icon={<Calendar className="h-4 w-4 text-gray-500 no-flip" />}
              >
                <option value="current-month">هذا الشهر</option>
                <option value="last-month">الشهر الماضي</option>
                <option value="quarter">هذا الربع</option>
                <option value="year">هذا العام</option>
                <option value="all">جميع البيانات</option>
              </Select>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="h-4 w-4 text-gray-500 no-flip" />
              <Select
                value={selectedReport}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedReport(e.target.value)
                }
                icon={<BarChart3 className="h-4 w-4 text-gray-500 no-flip" />}
              >
                {availableReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="h-4 w-4 text-gray-500 no-flip" />
              <span className="text-sm text-gray-600 arabic-spacing arabic-nums">
                التحديث الأخير: {formatDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* SAFE Balance - Only visible to admins */}
        {hasPermission("canViewSafe") && (
          <Card className="border-l-4 border-l-[#182C61]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 arabic-spacing">
                    رصيد الخزنة
                  </p>
                  <p className="text-3xl font-bold text-[#182C61] arabic-nums mt-2">
                    {formatCurrency(reportSummary.safeBalance)}
                  </p>
                  <div className="flex items-center mt-2">
                    <Wallet className="h-4 w-4 text-[#182C61] ml-1 no-flip" />
                    <span className="text-xs text-gray-500 arabic-spacing">
                      الرصيد الحالي
                    </span>
                  </div>
                </div>
                <div className="bg-[#182C61]/10 p-3 rounded-full">
                  <Wallet className="h-8 w-8 text-[#182C61] no-flip" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي الفواتير
                </p>
                <p className="text-3xl font-bold text-green-600 arabic-nums mt-2">
                  {formatCurrency(reportSummary.totalInvoicesAmount)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 ml-1 no-flip" />
                  <span className="text-xs text-gray-500 arabic-spacing">
                    إجمالي الإيرادات
                  </span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-green-600 no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي المصروفات
                </p>
                <p className="text-3xl font-bold text-red-600 arabic-nums mt-2">
                  {formatCurrency(
                    reportSummary.totalEmployeeSalaries +
                      reportSummary.totalGeneralExpenses
                  )}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="h-4 w-4 text-red-600 ml-1 no-flip" />
                  <span className="text-xs text-gray-500 arabic-spacing">
                    رواتب + مصروفات عامة
                  </span>
                </div>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <TrendingDown className="h-8 w-8 text-red-600 no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  المشاريع النشطة
                </p>
                <p className="text-3xl font-bold text-blue-600 arabic-nums mt-2">
                  {reportSummary.activeProjects}
                </p>
                <div className="flex items-center mt-2">
                  <Building2 className="h-4 w-4 text-blue-600 ml-1 no-flip" />
                  <span className="text-xs text-gray-500 arabic-spacing arabic-nums">
                    من أصل{" "}
                    {reportSummary.activeProjects +
                      reportSummary.completedProjects}
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Building2 className="h-8 w-8 text-blue-600 no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="bg-purple-100 p-4 rounded-full w-fit mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-600 no-flip" />
            </div>
            <p className="text-sm font-medium text-gray-600 arabic-spacing">
              إجمالي الموظفين
            </p>
            <p className="text-2xl font-bold text-purple-600 arabic-nums mt-2">
              {reportSummary.totalEmployees}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="bg-orange-100 p-4 rounded-full w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-orange-600 no-flip" />
            </div>
            <p className="text-sm font-medium text-gray-600 arabic-spacing">
              الفواتير المعلقة
            </p>
            <p className="text-2xl font-bold text-orange-600 arabic-nums mt-2">
              {reportSummary.pendingInvoices}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="bg-indigo-100 p-4 rounded-full w-fit mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-indigo-600 no-flip" />
            </div>
            <p className="text-sm font-medium text-gray-600 arabic-spacing">
              ميزانيات المشاريع
            </p>
            <p className="text-2xl font-bold text-indigo-600 arabic-nums mt-2">
              {formatCurrency(reportSummary.totalProjectBudgets)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <Building2 className="h-5 w-5 ml-2 no-flip" />
              ملخص المشاريع
            </CardTitle>
            <CardDescription className="arabic-spacing">
              الأداء المالي لجميع المشاريع من النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 arabic-spacing">
                  لا توجد مشاريع مسجلة بعد
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 arabic-spacing">
                        {project.name}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium arabic-spacing ${
                          project.status === "active"
                            ? "bg-green-100 text-green-800"
                            : project.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {project.status === "active"
                          ? "نشط"
                          : project.status === "completed"
                          ? "مكتمل"
                          : project.status === "planning"
                          ? "تخطيط"
                          : "ملغي"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          الميزانية:
                        </span>
                        <span className="font-semibold text-gray-900 arabic-nums mr-2">
                          {formatCurrency(project.budgetEstimate || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          الفواتير:
                        </span>
                        <span className="font-semibold text-green-600 arabic-nums mr-2">
                          {formatCurrency(
                            project.invoices?.reduce(
                              (sum, inv) => sum + (inv.totalAmount || 0),
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className="arabic-spacing">عدد الفواتير</span>
                        <span className="arabic-nums">
                          {project.invoices?.length || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#182C61] h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              project.budgetEstimate
                                ? Math.min(
                                    ((project.invoices?.reduce(
                                      (sum, inv) =>
                                        sum + (inv.totalAmount || 0),
                                      0
                                    ) || 0) /
                                      project.budgetEstimate) *
                                      100,
                                    100
                                  )
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}

                {projects.length > 5 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-500 arabic-spacing arabic-nums">
                      وعرض {projects.length - 5} مشروع إضافي...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <PieChart className="h-5 w-5 ml-2 no-flip" />
              تفصيل المصروفات
            </CardTitle>
            <CardDescription className="arabic-spacing">
              توزيع المصروفات حسب الفئات من النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 arabic-spacing">
                  لا توجد مصروفات مسجلة بعد
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {expensesByCategory.map((expense, index) => (
                  <div
                    key={expense.category}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: `hsl(${index * 45}, 70%, 60%)`,
                        }}
                      ></div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 arabic-spacing">
                          {expense.category}
                        </span>
                        <p className="text-xs text-gray-500 arabic-spacing arabic-nums">
                          {expense.transactions} معاملة
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-gray-900 arabic-nums">
                        {formatCurrency(expense.amount)}
                      </span>
                      <p className="text-xs text-gray-500 arabic-nums">
                        {expense.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <BarChart3 className="h-5 w-5 ml-2 no-flip" />
              الاتجاه الشهري
            </CardTitle>
            <CardDescription className="arabic-spacing">
              تطور التدفقات النقدية من معاملات الخزنة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyTrend.map((trend, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 hover:border-[#182C61] transition-colors"
                >
                  <h4 className="font-medium text-gray-900 arabic-spacing arabic-nums mb-3">
                    {trend.month}
                  </h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 arabic-spacing mb-1">
                        الواردات
                      </p>
                      <p className="text-lg font-semibold text-green-600 arabic-nums">
                        {formatCurrency(trend.income)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 arabic-spacing mb-1">
                        المصروفات
                      </p>
                      <p className="text-lg font-semibold text-red-600 arabic-nums">
                        {formatCurrency(trend.expenses)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 arabic-spacing mb-1">
                        صافي التدفق
                      </p>
                      <p
                        className={`text-lg font-bold arabic-nums ${
                          trend.netFlow >= 0 ? "text-[#182C61]" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(trend.netFlow)}
                      </p>
                    </div>
                  </div>

                  {/* Visual indicator */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          trend.netFlow >= 0 ? "bg-green-500" : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (Math.abs(trend.netFlow) /
                              Math.max(trend.income, trend.expenses)) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <FileText className="h-5 w-5 ml-2 no-flip" />
            التقارير المتاحة
          </CardTitle>
          <CardDescription className="arabic-spacing">
            اختر من التقارير التفصيلية المختلفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableReports.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  className="p-6 rounded-lg border border-gray-200 hover:border-[#182C61] hover:shadow-md cursor-pointer transition-all group"
                >
                  <div className="flex items-start space-x-4 space-x-reverse">
                    <div
                      className={`p-3 rounded-lg ${report.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="h-6 w-6 text-white no-flip" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 arabic-spacing mb-2">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600 arabic-spacing mb-4">
                        {report.description}
                      </p>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 ml-1 no-flip" />
                          <span className="arabic-spacing">عرض</span>
                        </Button>
                        <Button size="sm">
                          <Download className="h-4 w-4 ml-1 no-flip" />
                          <span className="arabic-spacing">تحميل</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <CheckCircle2 className="h-5 w-5 ml-2 text-green-600 no-flip" />
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600 no-flip" />
              </div>
              <div>
                <p className="font-medium text-gray-900 arabic-spacing">
                  البيانات محدثة
                </p>
                <p className="text-sm text-gray-600 arabic-spacing">
                  آخر تحديث: الآن
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-blue-100 p-2 rounded-full">
                <Wallet className="h-5 w-5 text-blue-600 no-flip" />
              </div>
              <div>
                <p className="font-medium text-gray-900 arabic-spacing">
                  الخزنة متصلة
                </p>
                <p className="text-sm text-gray-600 arabic-spacing arabic-nums">
                  {safeState.transactions.length} معاملة
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-purple-100 p-2 rounded-full">
                <BarChart3 className="h-5 w-5 text-purple-600 no-flip" />
              </div>
              <div>
                <p className="font-medium text-gray-900 arabic-spacing">
                  التقارير جاهزة
                </p>
                <p className="text-sm text-gray-600 arabic-spacing">
                  للتصدير والطباعة
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
