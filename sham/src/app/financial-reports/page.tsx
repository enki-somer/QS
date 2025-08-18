"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Building2,
  Users,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Printer,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  Activity,
  Target,
  AlertTriangle,
  PieChart,
  LineChart,
  AreaChart,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Area,
  Bar,
  Pie,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import PageNavigation from "@/components/layout/PageNavigation";
import { useSafe } from "@/contexts/SafeContext";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
  percentage?: number;
}

interface TrendDataPoint {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  safeBalance: number;
}

interface ProjectPerformanceData {
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  completion: number;
  completionPercentage: number;
  estimatedCompletion: string;
  daysRemaining: number;
  status: "on_track" | "delayed" | "ahead" | "completed";
}

interface BudgetVarianceData {
  projectName: string;
  budgetEstimate: number;
  actualSpent: number;
  variance: number;
  variancePercentage: number;
  status: "under_budget" | "over_budget" | "on_budget";
  categoryBreakdown: {
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
  }[];
}

// Chart color palette
const COLORS = {
  primary: "#182C61",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  purple: "#8B5CF6",
  orange: "#F97316",
  teal: "#14B8A6",
  pink: "#EC4899",
  indigo: "#6366F1",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
  COLORS.orange,
  COLORS.teal,
];

export default function FinancialReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Chart data states
  const [expenseBreakdown, setExpenseBreakdown] = useState<ChartDataPoint[]>(
    []
  );
  const [fundingSourcesData, setFundingSourcesData] = useState<
    ChartDataPoint[]
  >([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [projectPerformance, setProjectPerformance] = useState<
    ProjectPerformanceData[]
  >([]);
  const [revenueByProject, setRevenueByProject] = useState<ChartDataPoint[]>(
    []
  );
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [budgetVarianceData, setBudgetVarianceData] = useState<
    BudgetVarianceData[]
  >([]);
  const [costBreakdownData, setCostBreakdownData] = useState<ChartDataPoint[]>(
    []
  );

  const { safeState } = useSafe();
  const { hasPermission, user, isAuthenticated } = useAuth();

  // API Data Fetching Functions
  const fetchProjectsData = async () => {
    try {
      console.log("📋 Fetching projects from API...");
      const response = await apiRequest("/projects");
      console.log("📋 Projects API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Projects API success:", data.length);
        return Array.isArray(data) ? data : [];
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.warn(
          "⚠️ Projects API failed with status:",
          response.status,
          errorData
        );
        throw new Error(
          `API failed: ${response.status} - ${errorData.message}`
        );
      }
    } catch (error) {
      console.warn("⚠️ Projects API failed, using localStorage:", error);
      const stored = localStorage.getItem("projects");
      return stored ? JSON.parse(stored) : [];
    }
  };

  const fetchEmployeesData = async () => {
    try {
      console.log("👥 Fetching employees from API...");
      const response = await apiRequest("/employees");
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          console.log("✅ Employees API success:", result.data.length);
          return result.data;
        }
      }
      throw new Error("API failed");
    } catch (error) {
      console.warn("⚠️ Employees API failed, using localStorage:", error);
      const stored = localStorage.getItem("employees");
      return stored ? JSON.parse(stored) : [];
    }
  };

  const fetchGeneralExpensesData = async () => {
    try {
      console.log("💰 Fetching general expenses from API...");
      // Get all general expenses from the new endpoint
      const response = await apiRequest("/general-expenses");
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Expenses API success:", data.expenses?.length || 0);
        console.log("📊 Sample expense data:", data.expenses?.[0]);
        return Array.isArray(data.expenses) ? data.expenses : [];
      }
      throw new Error("API failed");
    } catch (error) {
      console.warn("⚠️ Expenses API failed, using localStorage:", error);
      const stored = localStorage.getItem("generalExpenses");
      const parsedData = stored ? JSON.parse(stored) : [];
      console.log("📦 LocalStorage expenses data:", parsedData);
      console.log("📊 Sample localStorage expense:", parsedData[0]);
      return parsedData;
    }
  };

  const fetchCategoryInvoicesData = async () => {
    try {
      console.log("📄 Fetching category invoices from API...");
      const response = await apiRequest("/category-invoices");
      if (response.ok) {
        const data = await response.json();
        console.log(
          "✅ Category invoices API success:",
          data.invoices?.length || 0
        );
        return Array.isArray(data.invoices) ? data.invoices : [];
      }
      throw new Error("API failed");
    } catch (error) {
      console.warn(
        "⚠️ Category invoices API failed, extracting from projects:",
        error
      );
      // Fallback: extract invoices from projects
      const storedProjects = localStorage.getItem("projects");
      const projects = storedProjects ? JSON.parse(storedProjects) : [];

      const invoices: any[] = [];
      projects.forEach((project: any) => {
        if (project.invoices && Array.isArray(project.invoices)) {
          project.invoices.forEach((invoice: any) => {
            invoices.push({
              ...invoice,
              project_id: project.id,
              project_name: project.name,
              total_amount: invoice.totalAmount || invoice.amount || 0,
              status: invoice.status || "approved",
            });
          });
        }
      });

      console.log("📦 Extracted invoices from projects:", invoices.length);
      return invoices;
    }
  };

  // Comprehensive data fetching from APIs with localStorage fallback
  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 Loading comprehensive dashboard data...");
        console.log("🔐 Authentication status:", {
          isAuthenticated,
          user: user?.username,
        });

        // Debug: Check what's in localStorage
        const localProjects = localStorage.getItem("projects");
        const localEmployees = localStorage.getItem("employees");
        const localExpenses = localStorage.getItem("generalExpenses");
        console.log("💾 localStorage contents:", {
          projects: localProjects ? JSON.parse(localProjects).length : 0,
          employees: localEmployees ? JSON.parse(localEmployees).length : 0,
          expenses: localExpenses ? JSON.parse(localExpenses).length : 0,
        });

        // Check if user is authenticated before making API calls
        if (!isAuthenticated) {
          console.warn("⚠️ User not authenticated, using localStorage only");
          // Load from localStorage only
          const projectsData = JSON.parse(
            localStorage.getItem("projects") || "[]"
          );
          const employeesData = JSON.parse(
            localStorage.getItem("employees") || "[]"
          );
          const expensesData = JSON.parse(
            localStorage.getItem("generalExpenses") || "[]"
          );
          const categoryInvoicesData: any[] = [];

          console.log("📦 Loaded from localStorage:", {
            projects: projectsData.length,
            employees: employeesData.length,
            expenses: expensesData.length,
          });

          // Continue with data processing...
          const activeProjects = projectsData.filter(
            (p: any) => p.status === "active"
          ).length;
          const completedProjects = projectsData.filter(
            (p: any) => p.status === "completed"
          ).length;

          // Calculate summary with localStorage data
          const summary = {
            safeBalance: safeState.currentBalance,
            totalProjectBudgets: projectsData.reduce(
              (sum: number, p: any) => sum + (p.budgetEstimate || 0),
              0
            ),
            totalInvoicesAmount: projectsData.reduce((sum: number, p: any) => {
              return (
                sum +
                (p.invoices?.reduce(
                  (invSum: number, inv: any) => invSum + (inv.totalAmount || 0),
                  0
                ) || 0)
              );
            }, 0),
            totalEmployeeSalaries: employeesData.reduce(
              (sum: number, emp: any) =>
                sum + (emp.monthly_salary || emp.salary || 0),
              0
            ),
            totalGeneralExpenses: expensesData.reduce(
              (sum: number, exp: any) => sum + parseFloat(exp.cost || 0),
              0
            ),
            netCashFlow: safeState.currentBalance,
            activeProjects,
            completedProjects,
            totalEmployees: employeesData.length,
            pendingInvoices: 0,
          };

          setReportSummary(summary);
          generateChartData(
            projectsData,
            employeesData,
            expensesData,
            categoryInvoicesData,
            summary,
            { factory: 0, rental: 0, contracts: 0, general: 0, project: 0 } // Empty funding sources for localStorage fallback
          );
          return;
        }

        // Fetch data from multiple sources (authenticated)
        const [
          projectsData,
          employeesData,
          expensesData,
          categoryInvoicesData,
        ] = await Promise.all([
          fetchProjectsData(),
          fetchEmployeesData(),
          fetchGeneralExpensesData(),
          fetchCategoryInvoicesData(),
        ]);

        console.log("📊 Dashboard data loaded:", {
          projects: projectsData.length,
          employees: employeesData.length,
          expenses: expensesData.length,
          invoices: categoryInvoicesData.length,
        });

        // Calculate summary metrics
        const activeProjects = projectsData.filter(
          (p: any) => p.status === "active"
        ).length;
        const completedProjects = projectsData.filter(
          (p: any) => p.status === "completed"
        ).length;

        // 🏗️ CONSTRUCTION BUSINESS MODEL CALCULATIONS

        // 1. SAFE FUNDING SOURCES (Revenue to Safe)
        const fundingSources = {
          factory: 0,
          rental: 0,
          contracts: 0,
          general: 0,
          project: 0,
        };

        // Analyze safe transactions to categorize funding sources
        safeState.transactions
          .filter((transaction: any) => transaction.type === "funding")
          .forEach((transaction: any) => {
            const amount = parseFloat(transaction.amount || 0);
            const description = transaction.description?.toLowerCase() || "";

            // Categorize based on description keywords
            if (
              description.includes("مصنع") ||
              description.includes("factory")
            ) {
              fundingSources.factory += amount;
            } else if (
              description.includes("إيجار") ||
              description.includes("rent")
            ) {
              fundingSources.rental += amount;
            } else if (
              description.includes("عقد") ||
              description.includes("contract")
            ) {
              fundingSources.contracts += amount;
            } else if (
              description.includes("مشروع") ||
              description.includes("project") ||
              transaction.projectId
            ) {
              fundingSources.project += amount;
            } else {
              fundingSources.general += amount;
            }
          });

        const totalSafeFunding = Object.values(fundingSources).reduce(
          (sum, amount) => sum + amount,
          0
        );

        // 2. PROJECT REVENUE (What clients pay us)
        const totalProjectRevenue = projectsData.reduce(
          (sum: number, project: any) => {
            // Revenue = area * price_per_meter (what we charge client)
            const area = parseFloat(project.area || 0);
            const pricePerMeter = parseFloat(project.price_per_meter || 0);
            const revenue = area * pricePerMeter;
            return sum + revenue;
          },
          0
        );

        // 3. PROJECT COSTS (What projects actually cost us)
        const totalProjectCosts = projectsData.reduce(
          (sum: number, project: any) => {
            // Real construction cost = area * real_cost_per_meter
            const area = parseFloat(project.area || 0);
            const realCostPerMeter = parseFloat(
              project.real_cost_per_meter || 0
            );
            const realCost = area * realCostPerMeter;
            return sum + realCost;
          },
          0
        );

        // 4. ACTUAL SPENDING ON PROJECTS (Invoices + Assignments)
        const totalProjectSpending = projectsData.reduce(
          (sum: number, project: any) => {
            // Assignment spending (contractor payments)
            const assignmentSpending =
              project.categoryAssignments?.reduce(
                (assignmentSum: number, assignment: any) => {
                  return (
                    assignmentSum + parseFloat(assignment.actual_amount || 0)
                  );
                },
                0
              ) || 0;

            // Project-specific expenses (from general_expenses table where project_id matches)
            const projectExpenses = expensesData
              .filter((exp: any) => exp.project_id === project.id)
              .reduce((expSum: number, exp: any) => {
                return expSum + parseFloat(exp.cost || 0);
              }, 0);

            return sum + assignmentSpending + projectExpenses;
          },
          0
        );

        // 5. ESTIMATED PROJECT BUDGETS
        const totalProjectBudgets = projectsData.reduce(
          (sum: number, p: any) => sum + parseFloat(p.budget_estimate || 0),
          0
        );

        // 6. EMPLOYEE SALARIES (Cut directly from safe balance)
        const totalEmployeeSalaries = employeesData
          .filter((emp: any) => emp.status === "active")
          .reduce((sum: number, emp: any) => {
            return sum + parseFloat(emp.monthly_salary || emp.salary || 0);
          }, 0);

        // 7. GENERAL EXPENSES (Independent, cut directly from safe balance)

        const totalGeneralExpenses = expensesData
          .filter((exp: any) => !exp.project_id) // Only expenses NOT tied to projects
          .reduce((sum: number, exp: any) => {
            const cost = parseFloat(exp.cost || 0);
            // Safeguard against extremely large values (over 100 million)
            if (cost > 100000000) {
              console.warn(
                `⚠️ Suspiciously large expense detected: ${exp.expense_name} - ${cost}`
              );
              return sum; // Skip this expense
            }
            console.log(
              `💰 General Expense: ${exp.expense_name} - Cost: ${cost}`
            );
            return sum + cost;
          }, 0);

        // 8. CALCULATE PROFITS AND MARGINS
        const grossProjectProfit = totalProjectRevenue - totalProjectCosts; // Smart profit calculation
        const netProfit =
          totalSafeFunding -
          totalEmployeeSalaries -
          totalGeneralExpenses -
          totalProjectSpending; // What's left after all expenses

        console.log("🏗️ Construction Business Model Analysis:", {
          safeFunding: totalSafeFunding,
          fundingSources: fundingSources,
          projectRevenue: totalProjectRevenue,
          projectCosts: totalProjectCosts,
          projectSpending: totalProjectSpending,
          employeeSalaries: totalEmployeeSalaries,
          generalExpenses: totalGeneralExpenses,
          grossProjectProfit: grossProjectProfit,
          netProfit: netProfit,
          profitMargin:
            totalProjectRevenue > 0
              ? ((grossProjectProfit / totalProjectRevenue) * 100).toFixed(2) +
                "%"
              : "0%",
        });

        // Calculate pending invoices from category invoices
        const pendingInvoices = categoryInvoicesData.filter(
          (invoice: any) =>
            invoice.status === "pending" || invoice.status === "معلقة"
        ).length;

        // Fallback to projects if no category invoices
        const projectPendingInvoices = projectsData.reduce(
          (sum: number, p: any) => {
            return (
              sum +
              (p.invoices?.filter((inv: any) => inv.status === "معلقة")
                .length || 0)
            );
          },
          0
        );

        const finalPendingInvoices = Math.max(
          pendingInvoices,
          projectPendingInvoices
        );

        // Summary calculations are already done above

        const summary: ReportSummary = {
          safeBalance: safeState.currentBalance, // Current safe balance
          totalProjectBudgets, // Estimated project budgets
          totalInvoicesAmount: totalProjectRevenue, // What clients pay us (area * price_per_meter)
          totalEmployeeSalaries, // Monthly salaries (cut from safe)
          totalGeneralExpenses, // General expenses (cut from safe, not project-specific)
          netCashFlow: netProfit, // Net profit after all expenses
          activeProjects,
          completedProjects,
          totalEmployees: employeesData.filter(
            (emp: any) => emp.status === "active"
          ).length,
          pendingInvoices: finalPendingInvoices,
        };

        console.log("🏗️ Construction Business Model Financial Summary:", {
          projectRevenue: totalProjectRevenue, // area * price_per_meter (what clients pay)
          projectCosts: totalProjectCosts, // area * real_cost_per_meter (what it costs us)
          projectSpending: totalProjectSpending, // actual spending on projects (invoices + assignments)
          grossProjectProfit: grossProjectProfit, // Revenue - Real Costs
          employeeSalaries: totalEmployeeSalaries,
          generalExpenses: totalGeneralExpenses,
          netProfit: netProfit,
          profitMargin:
            totalProjectRevenue > 0
              ? ((grossProjectProfit / totalProjectRevenue) * 100).toFixed(2) +
                "%"
              : "0%",
        });

        setReportSummary(summary);

        // Generate chart data
        generateChartData(
          projectsData,
          employeesData,
          expensesData,
          categoryInvoicesData,
          summary,
          fundingSources
        );
      } catch (error) {
        console.error("Error loading report data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const generateChartData = (
      projectsData: any[],
      employeesData: any[],
      expensesData: any[],
      categoryInvoicesData: any[],
      summary: ReportSummary,
      fundingSources: any
    ) => {
      // 1. Expense Breakdown Pie Chart
      const expenseCategories = new Map<string, number>();

      expensesData.forEach((exp: any) => {
        const category = exp.category || "مصروفات عامة";
        const amount = exp.amount || exp.cost || 0;
        const existing = expenseCategories.get(category) || 0;
        expenseCategories.set(category, existing + amount);
      });

      if (summary.totalEmployeeSalaries > 0) {
        expenseCategories.set("الرواتب والأجور", summary.totalEmployeeSalaries);
      }

      // Add construction costs (area * real_cost_per_meter)
      const constructionCosts = projectsData.reduce(
        (sum: number, project: any) => {
          return sum + parseFloat(project.real_construction_cost || 0);
        },
        0
      );

      if (constructionCosts > 0) {
        expenseCategories.set("تكاليف البناء الفعلية", constructionCosts);
      }

      // Add contractor payments (actual invoices paid)
      const contractorPayments = projectsData.reduce(
        (sum: number, project: any) => {
          return (
            sum +
            (project.categoryAssignments?.reduce(
              (assignmentSum: number, assignment: any) => {
                return assignmentSum + (assignment.actual_amount || 0);
              },
              0
            ) || 0)
          );
        },
        0
      );

      if (contractorPayments > 0) {
        expenseCategories.set("مدفوعات المقاولين", contractorPayments);
      }

      const totalExpenses =
        summary.totalEmployeeSalaries +
        summary.totalGeneralExpenses +
        constructionCosts +
        contractorPayments;
      const expenseChartData: ChartDataPoint[] = Array.from(
        expenseCategories.entries()
      )
        .map(([category, amount], index) => ({
          name: category,
          value: amount,
          percentage:
            totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

      setExpenseBreakdown(expenseChartData);

      // 2. Funding Sources Breakdown
      const fundingChartData: ChartDataPoint[] = [
        {
          name: "إيرادات المصنع",
          value: fundingSources.factory,
          label: formatCurrency(fundingSources.factory),
        },
        {
          name: "إيرادات الإيجارات",
          value: fundingSources.rental,
          label: formatCurrency(fundingSources.rental),
        },
        {
          name: "عقود المشاريع",
          value: fundingSources.contracts,
          label: formatCurrency(fundingSources.contracts),
        },
        {
          name: "دفعات المشاريع",
          value: fundingSources.project,
          label: formatCurrency(fundingSources.project),
        },
        {
          name: "تمويل عام",
          value: fundingSources.general,
          label: formatCurrency(fundingSources.general),
        },
      ].filter((item) => item.value > 0); // Only show sources with funding

      setFundingSourcesData(fundingChartData);

      // 3. Revenue vs Expenses Trend (from SAFE transactions)
      const monthlyMap = new Map<
        string,
        { revenue: number; expenses: number; balance: number }
      >();

      safeState.transactions.forEach((transaction) => {
        const date = new Date(transaction.date);
        const monthKey = date.toLocaleDateString("ar-IQ", {
          month: "short",
          year: "numeric",
        });

        const existing = monthlyMap.get(monthKey) || {
          revenue: 0,
          expenses: 0,
          balance: 0,
        };

        if (
          transaction.type === "funding" ||
          transaction.type === "invoice_payment"
        ) {
          existing.revenue += transaction.amount;
        } else {
          existing.expenses += Math.abs(transaction.amount);
        }
        existing.balance = transaction.newBalance;

        monthlyMap.set(monthKey, existing);
      });

      const trendChartData: TrendDataPoint[] = Array.from(monthlyMap.entries())
        .map(([period, data]) => ({
          period,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
          safeBalance: data.balance,
        }))
        .slice(-6); // Last 6 months

      setTrendData(trendChartData);

      // 3. Project Performance Data (using category invoices for accuracy)
      const projectRevenueMap = new Map<string, number>();
      categoryInvoicesData.forEach((invoice: any) => {
        const projectId = invoice.project_id;
        const amount =
          invoice.total_amount || invoice.totalAmount || invoice.amount || 0;
        const existing = projectRevenueMap.get(projectId) || 0;
        projectRevenueMap.set(projectId, existing + amount);
      });

      const projectPerfData: ProjectPerformanceData[] = projectsData
        .filter((p) => p.budget_estimate && parseFloat(p.budget_estimate) > 0)
        .map((project) => {
          const budget = parseFloat(project.budget_estimate || 0);
          const spent = parseFloat(project.spent_budget || 0);
          const remaining = Math.max(0, budget - spent);
          const completion =
            budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

          // Calculate project progress based on dates and spending
          const startDate = project.start_date
            ? new Date(project.start_date)
            : new Date();
          const endDate = project.end_date
            ? new Date(project.end_date)
            : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Default 90 days
          const currentDate = new Date();

          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsedTime = currentDate.getTime() - startDate.getTime();
          const timeProgress =
            totalDuration > 0
              ? Math.min((elapsedTime / totalDuration) * 100, 100)
              : 0;

          // Calculate completion percentage (average of budget completion and time progress)
          const completionPercentage =
            project.status === "completed"
              ? 100
              : Math.min((completion + timeProgress) / 2, 100);

          // Calculate days remaining
          const daysRemaining = Math.max(
            0,
            Math.ceil(
              (endDate.getTime() - currentDate.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          );

          // Determine project status
          let status: "on_track" | "delayed" | "ahead" | "completed" =
            "on_track";
          if (project.status === "completed") {
            status = "completed";
          } else if (completion > timeProgress + 10) {
            status = "ahead";
          } else if (timeProgress > completion + 15) {
            status = "delayed";
          }

          // Estimate completion date based on current progress
          const progressRate = elapsedTime > 0 ? completion / timeProgress : 1;
          const estimatedDuration = totalDuration / Math.max(progressRate, 0.1);
          const estimatedCompletion = new Date(
            startDate.getTime() + estimatedDuration
          ).toLocaleDateString("ar-IQ");

          return {
            name:
              project.name.length > 15
                ? project.name.substring(0, 15) + "..."
                : project.name,
            budget,
            spent,
            remaining,
            completion,
            completionPercentage,
            estimatedCompletion,
            daysRemaining,
            status,
          };
        })
        .filter((p) => p.budget > 0) // Only show projects with budgets
        .sort((a, b) => b.completion - a.completion) // Sort by completion
        .slice(0, 8); // Top 8 projects

      setProjectPerformance(projectPerfData);

      // 4. Budget Variance Analysis
      const budgetVarianceAnalysis: BudgetVarianceData[] = projectsData
        .filter((p) => p.budget_estimate && parseFloat(p.budget_estimate) > 0)
        .map((project) => {
          const budgetEstimate = parseFloat(project.budget_estimate || 0);
          const actualSpent = parseFloat(project.spent_budget || 0);
          const variance = budgetEstimate - actualSpent;
          const variancePercentage =
            budgetEstimate > 0 ? (variance / budgetEstimate) * 100 : 0;

          let status: "under_budget" | "over_budget" | "on_budget" =
            "on_budget";
          if (Math.abs(variancePercentage) <= 5) {
            status = "on_budget";
          } else if (variancePercentage > 0) {
            status = "under_budget";
          } else {
            status = "over_budget";
          }

          // Calculate category breakdown from assignments
          const categoryBreakdown = (project.categoryAssignments || []).map(
            (assignment: any) => ({
              category: `${assignment.main_category} - ${assignment.subcategory}`,
              budgeted: parseFloat(assignment.estimated_amount || 0),
              actual: parseFloat(assignment.actual_amount || 0),
              variance:
                parseFloat(assignment.estimated_amount || 0) -
                parseFloat(assignment.actual_amount || 0),
            })
          );

          return {
            projectName: project.name,
            budgetEstimate,
            actualSpent,
            variance,
            variancePercentage,
            status,
            categoryBreakdown,
          };
        })
        .sort(
          (a, b) =>
            Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage)
        )
        .slice(0, 10); // Top 10 projects by variance

      setBudgetVarianceData(budgetVarianceAnalysis);

      // 5. Cost Breakdown Analysis by Category
      const categorySpendingMap = new Map<string, number>();

      // Aggregate spending from category assignments
      projectsData.forEach((project) => {
        (project.categoryAssignments || []).forEach((assignment: any) => {
          const category = assignment.main_category || "غير محدد";
          const amount = parseFloat(assignment.actual_amount || 0);
          const existing = categorySpendingMap.get(category) || 0;
          categorySpendingMap.set(category, existing + amount);
        });
      });

      // Add general expenses by category
      expensesData.forEach((expense: any) => {
        const category = expense.category || "مصروفات عامة";
        const amount = parseFloat(expense.cost || expense.amount || 0);
        const existing = categorySpendingMap.get(category) || 0;
        categorySpendingMap.set(category, existing + amount);
      });

      const costBreakdownData = Array.from(categorySpendingMap.entries())
        .map(([category, amount]) => ({
          name: category,
          value: amount,
          label: formatCurrency(amount),
          percentage: 0, // Will be calculated after sorting
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8 categories

      // Calculate percentages
      const totalCategorySpending = costBreakdownData.reduce(
        (sum, item) => sum + item.value,
        0
      );
      costBreakdownData.forEach((item) => {
        item.percentage =
          totalCategorySpending > 0
            ? (item.value / totalCategorySpending) * 100
            : 0;
      });

      setCostBreakdownData(costBreakdownData);

      // 6. Revenue by Project (construction revenue: area * price_per_meter)
      const revenueChartData: ChartDataPoint[] = projectsData
        .map((project, index) => {
          const revenue = parseFloat(project.construction_cost || 0);
          return {
            name:
              project.name.length > 12
                ? project.name.substring(0, 12) + "..."
                : project.name,
            value: revenue,
            color: CHART_COLORS[index % CHART_COLORS.length],
          };
        })
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8 revenue projects

      setRevenueByProject(revenueChartData);

      // 5. Monthly Comparison Data (construction company model)
      // Use construction revenue (area * price_per_meter) based on project start dates
      const monthlyData = new Map<
        string,
        { revenue: number; expenses: number }
      >();

      projectsData.forEach((project: any) => {
        if (project.start_date && project.construction_cost) {
          const date = new Date(project.start_date);
          const monthKey = date.toLocaleDateString("ar-IQ", {
            month: "long",
            year: "numeric",
          });
          const revenue = parseFloat(project.construction_cost || 0);

          const existing = monthlyData.get(monthKey) || {
            revenue: 0,
            expenses: 0,
          };
          existing.revenue += revenue;
          monthlyData.set(monthKey, existing);
        }
      });

      // Get last 6 months of data
      const monthlyCompData = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: Math.round(
            (constructionCosts +
              contractorPayments +
              summary.totalEmployeeSalaries +
              summary.totalGeneralExpenses) /
              6
          ),
          profit:
            data.revenue -
            Math.round(
              (constructionCosts +
                contractorPayments +
                summary.totalEmployeeSalaries +
                summary.totalGeneralExpenses) /
                6
            ),
        }))
        .slice(-6); // Last 6 months

      // If no monthly data, create basic structure
      if (monthlyCompData.length === 0) {
        const currentMonth = new Date().getMonth();
        for (let i = 0; i < 6; i++) {
          const monthIndex = (currentMonth - 5 + i + 12) % 12;
          const monthName = new Date(2024, monthIndex).toLocaleDateString(
            "ar-IQ",
            { month: "long" }
          );
          monthlyCompData.push({
            month: monthName,
            revenue: Math.round(summary.totalInvoicesAmount / 6), // Client payments
            expenses: Math.round(
              (constructionCosts +
                contractorPayments +
                summary.totalEmployeeSalaries +
                summary.totalGeneralExpenses) /
                6
            ),
            profit: Math.round(
              (summary.totalInvoicesAmount -
                constructionCosts -
                contractorPayments -
                summary.totalEmployeeSalaries -
                summary.totalGeneralExpenses) /
                6
            ),
          });
        }
      }

      setMonthlyComparison(monthlyCompData);

      console.log("📊 Chart data generated:", {
        expenseBreakdown: expenseChartData.length,
        trendData: trendChartData.length,
        projectPerformance: projectPerfData.length,
        revenueByProject: revenueChartData.length,
        monthlyComparison: monthlyCompData.length,
      });
    };

    // Add delay to ensure authentication is loaded
    const timer = setTimeout(() => {
      loadReportData();
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [safeState, isAuthenticated, user]);

  const refreshData = () => {
    setIsLoading(true);
    window.location.reload();
  };

  const clearCachedData = () => {
    console.log("🗑️ Clearing cached data...");
    localStorage.removeItem("generalExpenses");
    localStorage.removeItem("projects");
    localStorage.removeItem("employees");
    localStorage.removeItem("categoryInvoices");
    refreshData();
  };

  // Comprehensive Excel Export Function
  const exportToExcel = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Starting comprehensive data export...");

      // Fetch all data from APIs
      const [
        projectsData,
        employeesData,
        expensesData,
        categoryInvoicesData,
        contractorsData,
      ] = await Promise.all([
        fetchProjectsData(),
        fetchEmployeesData(),
        fetchGeneralExpensesData(),
        fetchCategoryInvoicesData(),
        fetchContractorsData(),
      ]);

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // 1. Projects Sheet
      const projectsSheet = XLSX.utils.json_to_sheet(
        projectsData.map((project: any) => ({
          "اسم المشروع": project.name,
          "كود المشروع": project.code,
          الموقع: project.location,
          المساحة: project.area,
          "الميزانية المقدرة": project.budget_estimate,
          العميل: project.client,
          "تاريخ البداية": project.start_date
            ? new Date(project.start_date).toLocaleDateString("ar-IQ")
            : "",
          "تاريخ النهاية": project.end_date
            ? new Date(project.end_date).toLocaleDateString("ar-IQ")
            : "",
          الحالة: project.status,
          "سعر المتر": project.price_per_meter,
          "التكلفة الحقيقية للمتر": project.real_cost_per_meter,
          "سعر الصفقة مع المالك": project.owner_deal_price,
          "المبلغ المدفوع من المالك": project.owner_paid_amount,
          "تكلفة البناء": project.construction_cost,
          "التكلفة الحقيقية للبناء": project.real_construction_cost,
          "الربح الإجمالي": project.gross_profit,
          "هامش الربح": project.profit_margin,
          "المساحة الإجمالية للموقع": project.total_site_area,
          "الميزانية المخصصة": project.allocated_budget,
          "الميزانية المتاحة": project.available_budget,
          "الميزانية المنفقة": project.spent_budget,
          "تاريخ الإنشاء": project.created_at
            ? new Date(project.created_at).toLocaleDateString("en-US")
            : "",
          "تاريخ التحديث": project.updated_at
            ? new Date(project.updated_at).toLocaleDateString("en-US")
            : "",
        }))
      );
      XLSX.utils.book_append_sheet(workbook, projectsSheet, "المشاريع");

      // 2. Employees Sheet
      const employeesSheet = XLSX.utils.json_to_sheet(
        employeesData.map((employee: any) => ({
          "اسم الموظف": employee.name,
          المنصب: employee.position,
          القسم: employee.department,
          "رقم الهاتف": employee.phone,
          "رقم الموبايل": employee.mobile_number,
          "البريد الإلكتروني": employee.email,
          "تاريخ التوظيف": employee.hire_date
            ? new Date(employee.hire_date).toLocaleDateString("ar-IQ")
            : "",
          الراتب: employee.salary,
          "الراتب الشهري": employee.monthly_salary,
          العمر: employee.age,
          الحالة: employee.status,
          "تاريخ آخر دفعة": employee.last_payment_date
            ? new Date(employee.last_payment_date).toLocaleDateString("ar-IQ")
            : "",
          "حالة الدفع": employee.payment_status,
          "المشروع المخصص": employee.project_name,
          ملاحظات: employee.notes,
          "تاريخ الإنشاء": employee.created_at
            ? new Date(employee.created_at).toLocaleDateString("ar-IQ")
            : "",
          "تاريخ التحديث": employee.updated_at
            ? new Date(employee.updated_at).toLocaleDateString("ar-IQ")
            : "",
        }))
      );
      XLSX.utils.book_append_sheet(workbook, employeesSheet, "الموظفين");

      // 3. General Expenses Sheet
      const expensesSheet = XLSX.utils.json_to_sheet(
        expensesData.map((expense: any) => ({
          الوصف: expense.description,
          الفئة: expense.category,
          المبلغ: expense.amount || expense.cost,
          التاريخ: expense.date
            ? new Date(expense.date).toLocaleDateString("en-US")
            : "",
          ملاحظات: expense.notes,
          "تاريخ الإنشاء": expense.created_at
            ? new Date(expense.created_at).toLocaleDateString("en-US")
            : "",
        }))
      );
      XLSX.utils.book_append_sheet(workbook, expensesSheet, "المصروفات العامة");

      // 4. Category Invoices Sheet (if available)
      if (categoryInvoicesData.length > 0) {
        const invoicesSheet = XLSX.utils.json_to_sheet(
          categoryInvoicesData.map((invoice: any) => ({
            "رقم الفاتورة": invoice.invoice_number,
            المشروع: invoice.project_name,
            "الفئة الرئيسية": invoice.main_category,
            "الفئة الفرعية": invoice.subcategory,
            "اسم المقاول": invoice.contractor_name,
            "المبلغ الإجمالي":
              invoice.total_amount || invoice.totalAmount || invoice.amount,
            الحالة: invoice.status,
            التاريخ: invoice.date
              ? new Date(invoice.date).toLocaleDateString("en-US")
              : "",
            "تاريخ الإنشاء": invoice.created_at
              ? new Date(invoice.created_at).toLocaleDateString("en-US")
              : "",
          }))
        );
        XLSX.utils.book_append_sheet(workbook, invoicesSheet, "فواتير الفئات");
      }

      // 5. Project Category Assignments Sheet
      const assignmentsData: any[] = [];
      projectsData.forEach((project: any) => {
        if (
          project.categoryAssignments &&
          project.categoryAssignments.length > 0
        ) {
          project.categoryAssignments.forEach((assignment: any) => {
            assignmentsData.push({
              "اسم المشروع": project.name,
              "كود المشروع": project.code,
              "الفئة الرئيسية": assignment.main_category,
              "الفئة الفرعية": assignment.subcategory,
              "اسم المقاول": assignment.contractor_name,
              "المبلغ المقدر": assignment.estimated_amount,
              "المبلغ الفعلي": assignment.actual_amount,
              الحالة: assignment.status,
              "نوع التخصيص": assignment.assignment_type,
              "يوجد فاتورة معتمدة": assignment.has_approved_invoice
                ? "نعم"
                : "لا",
              "الميزانية مستنفدة": assignment.budget_exhausted ? "نعم" : "لا",
              "عدد الفواتير": assignment.invoice_count,
              "تاريخ آخر فاتورة": assignment.last_invoice_date,
              "إجمالي الفواتير": assignment.total_invoices,
              "الفواتير المعلقة": assignment.pending_invoices,
              "الفواتير المعتمدة": assignment.approved_invoices,
              "الفواتير المدفوعة": assignment.paid_invoices,
              ملاحظات: assignment.notes,
            });
          });
        }
      });

      if (assignmentsData.length > 0) {
        const assignmentsSheet = XLSX.utils.json_to_sheet(assignmentsData);
        XLSX.utils.book_append_sheet(
          workbook,
          assignmentsSheet,
          "تخصيصات فئات المشاريع"
        );
      }

      // 6. Safe Transactions Sheet
      const transactionsSheet = XLSX.utils.json_to_sheet(
        safeState.transactions.map((transaction: any) => ({
          النوع: transaction.type,
          المبلغ: transaction.amount,
          الوصف: transaction.description,
          "الرصيد الجديد": transaction.newBalance,
          التاريخ: new Date(transaction.date).toLocaleDateString("en-US"),
          المشروع: transaction.project,
          الفئة: transaction.category,
        }))
      );
      XLSX.utils.book_append_sheet(
        workbook,
        transactionsSheet,
        "معاملات الخزنة"
      );

      // 7. Financial Summary Sheet
      const summarySheet = XLSX.utils.json_to_sheet([
        {
          البيان: "رصيد الخزنة الحالي",
          القيمة: reportSummary?.safeBalance || 0,
          العملة: "دينار عراقي",
        },
        {
          البيان: "إجمالي ميزانيات المشاريع",
          القيمة: reportSummary?.totalProjectBudgets || 0,
          العملة: "دينار عراقي",
        },
        {
          البيان: "إجمالي الإيرادات",
          القيمة: reportSummary?.totalInvoicesAmount || 0,
          العملة: "دينار عراقي",
        },
        {
          البيان: "إجمالي رواتب الموظفين",
          القيمة: reportSummary?.totalEmployeeSalaries || 0,
          العملة: "دينار عراقي",
        },
        {
          البيان: "إجمالي المصروفات العامة",
          القيمة: reportSummary?.totalGeneralExpenses || 0,
          العملة: "دينار عراقي",
        },
        {
          البيان: "صافي التدفق النقدي",
          القيمة: reportSummary?.netCashFlow || 0,
          العملة: "دينار عراقي",
        },
        {
          البيان: "عدد المشاريع النشطة",
          القيمة: reportSummary?.activeProjects || 0,
          العملة: "مشروع",
        },
        {
          البيان: "عدد المشاريع المكتملة",
          القيمة: reportSummary?.completedProjects || 0,
          العملة: "مشروع",
        },
        {
          البيان: "إجمالي الموظفين",
          القيمة: reportSummary?.totalEmployees || 0,
          العملة: "موظف",
        },
        {
          البيان: "الفواتير المعلقة",
          القيمة: reportSummary?.pendingInvoices || 0,
          العملة: "فاتورة",
        },
      ]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "الملخص المالي");

      // Generate filename with current date
      const currentDate = new Date()
        .toLocaleDateString("ar-IQ")
        .replace(/\//g, "-");
      const filename = `نسخة_احتياطية_شاملة_${currentDate}.xlsx`;

      // Write and save file
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(data, filename);

      console.log("✅ Excel export completed successfully!");
    } catch (error) {
      console.error("❌ Excel export failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contractors data for export
  const fetchContractorsData = async () => {
    try {
      console.log("👷 Fetching contractors from API...");
      const response = await apiRequest("/contractors");
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Contractors API success:", data.length);
        return Array.isArray(data) ? data : [];
      }
      throw new Error("API failed");
    } catch (error) {
      console.warn("⚠️ Contractors API failed, using empty array:", error);
      return [];
    }
  };

  // Show authentication required message if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="space-y-6 page-transition">
        <PageNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 arabic-spacing mb-2">
              تسجيل الدخول مطلوب
            </h2>
            <p className="text-gray-600 arabic-spacing mb-4">
              يجب تسجيل الدخول للوصول إلى لوحة التحكم التنفيذية
            </p>
            <Button
              onClick={() => (window.location.href = "/login")}
              className="bg-[#182C61] hover:bg-[#0F1B3C]"
            >
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !reportSummary) {
    return (
      <div className="space-y-6 page-transition">
        <PageNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[#182C61] mx-auto mb-4" />
            <p className="text-gray-600 arabic-spacing mb-2">
              جاري تحميل لوحة التحكم التنفيذية...
            </p>
            <p className="text-sm text-gray-500 arabic-spacing">
              تحميل المشاريع، الموظفين، المصروفات، والفواتير من قاعدة البيانات
            </p>
            {isAuthenticated && (
              <p className="text-xs text-green-600 arabic-spacing mt-2">
                ✅ تم تسجيل الدخول بنجاح - {user?.username}
              </p>
            )}
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
          <h1 className="text-4xl font-bold text-gray-900 arabic-spacing">
            لوحة التحكم التنفيذية
          </h1>
          <p className="text-gray-600 mt-2 arabic-spacing">
            نظرة شاملة على الأداء المالي والتشغيلي مع مخططات تفاعلية متقدمة
          </p>
        </div>
        <div className="flex items-center space-x-3 gap-2 space-x-reverse">
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 ml-2 no-flip ${
                isLoading ? "animate-spin" : ""
              }`}
            />
            <span className="arabic-spacing">تحديث</span>
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={isLoading}
            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
          >
            <Download className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">
              {isLoading ? "جاري التصدير..." : "نسخة احتياطية شاملة"}
            </span>
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">طباعة</span>
          </Button>
          <Button
            variant="outline"
            onClick={clearCachedData}
            className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
          >
            <RefreshCw className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">مسح البيانات المؤقتة</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center space-x-2 space-x-reverse">
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

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <BarChart3 className="h-5 w-5 ml-2 no-flip" />
            الملخص المالي
          </CardTitle>
          <CardDescription className="arabic-spacing">
            نظرة عامة على الوضع المالي الحالي للشركة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                إجمالي الإيرادات
              </p>
              <p className="text-2xl font-bold text-green-600 arabic-nums">
                {formatCurrency(reportSummary.totalInvoicesAmount)}
              </p>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                إجمالي المصروفات
              </p>
              <p className="text-2xl font-bold text-red-600 arabic-nums">
                {formatCurrency(
                  reportSummary.totalEmployeeSalaries +
                    reportSummary.totalGeneralExpenses
                )}
              </p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                صافي الربح
              </p>
              <p
                className={`text-2xl font-bold arabic-nums ${
                  reportSummary.totalInvoicesAmount -
                    reportSummary.totalEmployeeSalaries -
                    reportSummary.totalGeneralExpenses >=
                  0
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(
                  reportSummary.totalInvoicesAmount -
                    reportSummary.totalEmployeeSalaries -
                    reportSummary.totalGeneralExpenses
                )}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                هامش الربح
              </p>
              <p
                className={`text-2xl font-bold arabic-nums ${
                  reportSummary.totalInvoicesAmount > 0 &&
                  ((reportSummary.totalInvoicesAmount -
                    reportSummary.totalEmployeeSalaries -
                    reportSummary.totalGeneralExpenses) /
                    reportSummary.totalInvoicesAmount) *
                    100 >=
                    0
                    ? "text-purple-600"
                    : "text-red-600"
                }`}
              >
                {reportSummary.totalInvoicesAmount > 0
                  ? `${(
                      ((reportSummary.totalInvoicesAmount -
                        reportSummary.totalEmployeeSalaries -
                        reportSummary.totalGeneralExpenses) /
                        reportSummary.totalInvoicesAmount) *
                      100
                    ).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                متوسط نسبة الإنجاز
              </p>
              <p className="text-2xl font-bold text-orange-600 arabic-nums">
                {projectPerformance.length > 0
                  ? `${(
                      projectPerformance.reduce(
                        (sum, p) => sum + p.completionPercentage,
                        0
                      ) / projectPerformance.length
                    ).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Alerts Section */}
      {(budgetVarianceData.filter((p) => p.status === "over_budget").length >
        0 ||
        projectPerformance.filter((p) => p.status === "delayed").length >
          0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 ml-2 no-flip" />
              تنبيهات الأداء
            </CardTitle>
            <CardDescription className="arabic-spacing text-red-600">
              مشاريع تحتاج إلى انتباه فوري
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Over Budget Projects */}
              {budgetVarianceData.filter((p) => p.status === "over_budget")
                .length > 0 && (
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-700 arabic-spacing mb-3">
                    🚨 مشاريع تجاوزت الميزانية
                  </h4>
                  <div className="space-y-2">
                    {budgetVarianceData
                      .filter((p) => p.status === "over_budget")
                      .slice(0, 3)
                      .map((project, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-red-50 rounded"
                        >
                          <span className="font-medium arabic-spacing">
                            {project.projectName}
                          </span>
                          <span className="text-red-600 font-bold arabic-nums">
                            {project.variancePercentage.toFixed(1)}% تجاوز
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Delayed Projects */}
              {projectPerformance.filter((p) => p.status === "delayed").length >
                0 && (
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-700 arabic-spacing mb-3">
                    ⏰ مشاريع متأخرة عن الجدول الزمني
                  </h4>
                  <div className="space-y-2">
                    {projectPerformance
                      .filter((p) => p.status === "delayed")
                      .slice(0, 3)
                      .map((project, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-orange-50 rounded"
                        >
                          <span className="font-medium arabic-spacing text-black">
                            {project.name}
                          </span>
                          <span className="text-orange-600 font-bold arabic-nums">
                            {project.daysRemaining} يوم متبقي
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Projects Ahead of Schedule */}
              {projectPerformance.filter((p) => p.status === "ahead").length >
                0 && (
                <div className="p-4 bg-white rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-700 arabic-spacing mb-3">
                    ✅ مشاريع متقدمة عن الجدول
                  </h4>
                  <div className="space-y-2">
                    {projectPerformance
                      .filter((p) => p.status === "ahead")
                      .slice(0, 2)
                      .map((project, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-green-50 rounded"
                        >
                          <span className="font-medium arabic-spacing text-black">
                            {project.name}
                          </span>
                          <span className="text-green-600 font-bold arabic-nums">
                            {project.completionPercentage.toFixed(1)}% مكتمل
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue vs Expenses Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <LineChart className="h-5 w-5 ml-2 no-flip" />
              اتجاه الإيرادات والمصروفات
            </CardTitle>
            <CardDescription className="arabic-spacing">
              تطور الأداء المالي خلال الأشهر الماضية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), ""]}
                  labelStyle={{ textAlign: "right" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  name="الإيرادات"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke={COLORS.danger}
                  strokeWidth={3}
                  name="المصروفات"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  name="صافي الربح"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Funding Sources Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <DollarSign className="h-5 w-5 ml-2 no-flip" />
              مصادر تمويل الخزنة
            </CardTitle>
            <CardDescription className="arabic-spacing">
              توزيع مصادر الأموال الواردة للخزنة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={fundingSourcesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fundingSourcesData.map((entry: any, index: number) => (
                    <Cell
                      key={`funding-cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), "المبلغ"]}
                  labelStyle={{ direction: "rtl" }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <BarChart3 className="h-5 w-5 ml-2 no-flip" />
              تفصيل التكاليف حسب الفئة
            </CardTitle>
            <CardDescription className="arabic-spacing">
              أعلى فئات الإنفاق في المشاريع والمصروفات العامة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart
                data={costBreakdownData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), "المبلغ"]}
                  labelStyle={{ direction: "rtl" }}
                />
                <Bar dataKey="value" fill={COLORS.primary} />
              </RechartsBarChart>
            </ResponsiveContainer>

            {/* Category Summary */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {costBreakdownData.slice(0, 4).map((category, index) => (
                <div key={index} className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 arabic-spacing truncate">
                    {category.name}
                  </p>
                  <p className="text-sm font-bold text-gray-800 arabic-nums">
                    {(category.percentage || 0).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <PieChart className="h-5 w-5 ml-2 no-flip" />
              توزيع المصروفات
            </CardTitle>
            <CardDescription className="arabic-spacing">
              تفصيل المصروفات حسب الفئات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), ""]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <BarChart3 className="h-5 w-5 ml-2 no-flip" />
              أداء المشاريع
            </CardTitle>
            <CardDescription className="arabic-spacing">
              مقارنة الميزانية مع المصروف الفعلي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={projectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), ""]}
                  labelStyle={{ textAlign: "right" }}
                />
                <Legend />
                <Bar dataKey="budget" fill={COLORS.info} name="الميزانية" />
                <Bar dataKey="spent" fill={COLORS.warning} name="المصروف" />
                <Bar dataKey="remaining" fill={COLORS.success} name="المتبقي" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Project Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <AreaChart className="h-5 w-5 ml-2 no-flip" />
              الإيرادات حسب المشروع
            </CardTitle>
            <CardDescription className="arabic-spacing">
              توزيع الإيرادات على المشاريع المختلفة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsAreaChart data={revenueByProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "الإيرادات",
                  ]}
                  labelStyle={{ textAlign: "right" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.info}
                  fill={COLORS.info}
                  fillOpacity={0.6}
                />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budget Variance Analysis Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <TrendingUp className="h-5 w-5 ml-2 no-flip" />
            تحليل انحراف الميزانية
          </CardTitle>
          <CardDescription className="arabic-spacing">
            مقارنة الميزانية المقدرة مع المصروف الفعلي لكل مشروع
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart
              data={budgetVarianceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="projectName"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === "budgetEstimate")
                    return [formatCurrency(value), "الميزانية المقدرة"];
                  if (name === "actualSpent")
                    return [formatCurrency(value), "المصروف الفعلي"];
                  if (name === "variance")
                    return [formatCurrency(value), "الانحراف"];
                  return [value, name];
                }}
                labelStyle={{ direction: "rtl" }}
              />
              <Legend />
              <Bar
                dataKey="budgetEstimate"
                fill={COLORS.primary}
                name="الميزانية المقدرة"
              />
              <Bar
                dataKey="actualSpent"
                fill={COLORS.warning}
                name="المصروف الفعلي"
              />
              <Bar dataKey="variance" fill={COLORS.info} name="الانحراف" />
            </RechartsBarChart>
          </ResponsiveContainer>

          {/* Budget Status Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                تحت الميزانية
              </p>
              <p className="text-2xl font-bold text-green-600 arabic-nums">
                {
                  budgetVarianceData.filter((p) => p.status === "under_budget")
                    .length
                }
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                ضمن الميزانية
              </p>
              <p className="text-2xl font-bold text-yellow-600 arabic-nums">
                {
                  budgetVarianceData.filter((p) => p.status === "on_budget")
                    .length
                }
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 arabic-spacing mb-2">
                تجاوز الميزانية
              </p>
              <p className="text-2xl font-bold text-red-600 arabic-nums">
                {
                  budgetVarianceData.filter((p) => p.status === "over_budget")
                    .length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <BarChart3 className="h-5 w-5 ml-2 no-flip" />
            المقارنة الشهرية
          </CardTitle>
          <CardDescription className="arabic-spacing">
            مقارنة الأداء المالي عبر الأشهر الماضية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelStyle={{ textAlign: "right" }}
              />
              <Legend />
              <Bar dataKey="revenue" fill={COLORS.success} name="الإيرادات" />
              <Bar dataKey="expenses" fill={COLORS.danger} name="المصروفات" />
              <Line
                type="monotone"
                dataKey="profit"
                stroke={COLORS.primary}
                strokeWidth={3}
                name="صافي الربح"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Safe Balance Trend */}
      {hasPermission("canViewSafe") && (
        <Card>
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <Wallet className="h-5 w-5 ml-2 no-flip" />
              تطور رصيد الخزنة
            </CardTitle>
            <CardDescription className="arabic-spacing">
              تتبع رصيد الخزنة عبر الزمن
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsAreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "رصيد الخزنة",
                  ]}
                  labelStyle={{ textAlign: "right" }}
                />
                <Area
                  type="monotone"
                  dataKey="safeBalance"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.3}
                />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Project Completion Radial Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <Target className="h-5 w-5 ml-2 no-flip" />
            نسب إنجاز المشاريع
          </CardTitle>
          <CardDescription className="arabic-spacing">
            نسبة الإنجاز لكل مشروع بناءً على المصروف
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="10%"
              outerRadius="80%"
              data={projectPerformance.map((project, index) => ({
                ...project,
                fill: CHART_COLORS[index % CHART_COLORS.length],
              }))}
            >
              <RadialBar dataKey="completion" fill={COLORS.primary} />
              <Legend
                iconSize={10}
                layout="vertical"
                verticalAlign="middle"
                align="right"
              />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toFixed(1)}%`,
                  "نسبة الإنجاز",
                ]}
              />
            </RadialBarChart>
          </ResponsiveContainer>
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
                  آخر تحديث: {formatDate(new Date().toISOString())}
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
