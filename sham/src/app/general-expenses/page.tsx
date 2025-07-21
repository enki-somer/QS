"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  PieChart,
  Building,
  Zap,
  Car,
  Coffee,
  Phone,
  Edit,
  Eye,
  Trash2,
  Wallet,
  AlertTriangle,
  X,
  Save,
  CreditCard,
  CheckCircle,
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
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import { GeneralExpense } from "@/types";
import { EnhancedGeneralExpense, ExpenseFormData } from "@/types/shared";
import PageNavigation from "@/components/layout/PageNavigation";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";

// No hardcoded data - start with empty state for real testing

const categoryIcons = {
  "إيجار المكتب": Building,
  "كهرباء وماء": Zap,
  "وقود ومواصلات": Car,
  اتصالات: Phone,
  "مكتبية وقرطاسية": FileText,
  ضيافة: Coffee,
  أخرى: Receipt,
};

const categoryColors = {
  "إيجار المكتب": "bg-purple-100 text-purple-600",
  "كهرباء وماء": "bg-yellow-100 text-yellow-600",
  "وقود ومواصلات": "bg-blue-100 text-blue-600",
  اتصالات: "bg-green-100 text-green-600",
  "مكتبية وقرطاسية": "bg-red-100 text-red-600",
  ضيافة: "bg-orange-100 text-orange-600",
  أخرى: "bg-gray-100 text-gray-600",
};

export default function GeneralExpensesPage() {
  const { addToast } = useToast();
  const { safeState, deductForExpense, hasBalance } = useSafe();
  const { hasPermission, isDataEntry, user } = useAuth();

  const [expenses, setExpenses] = useState<EnhancedGeneralExpense[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExpense, setSelectedExpense] =
    useState<EnhancedGeneralExpense | null>(null);

  // Form state for new expenses
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Function to reload data from localStorage
  const reloadDataFromStorage = () => {
    const storedExpenses = localStorage.getItem("financial-expenses");
    if (storedExpenses) {
      try {
        setExpenses(JSON.parse(storedExpenses));
      } catch (error) {
        console.warn("Failed to load expenses from localStorage:", error);
      }
    }
  };

  // Load expenses from localStorage on mount
  useEffect(() => {
    reloadDataFromStorage();
  }, []);

  // Listen for localStorage changes (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "financial-expenses") {
        reloadDataFromStorage();
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener("storage", handleStorageChange);

    // Listen for manual storage events from same tab
    window.addEventListener("storage", reloadDataFromStorage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storage", reloadDataFromStorage);
    };
  }, []);

  // Note: Removed auto-save for expenses to prevent data overwrites
  // Expenses are now saved only when explicitly created/updated

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0];
  const categories = [...new Set(expenses.map((exp) => exp.category))];

  // Create new expense
  const handleCreateExpense = () => {
    const expenseAmount = parseFloat(expenseForm.amount) || 0;

    if (
      !expenseForm.description.trim() ||
      !expenseForm.category.trim() ||
      expenseAmount <= 0
    ) {
      addToast({
        type: "error",
        title: "بيانات غير مكتملة",
        message: "يرجى ملء جميع الحقول المطلوبة",
      });
      return;
    }

    const newExpense: EnhancedGeneralExpense = {
      id: generateId(),
      description: expenseForm.description,
      category: expenseForm.category,
      amount: expenseAmount,
      date: expenseForm.date,
      notes: expenseForm.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Workflow tracking
      status: isDataEntry() ? "pending_approval" : "approved",
      submittedBy: user?.fullName || user?.username || "مستخدم غير معروف",
    };

    // Admin users: Process payment through SAFE immediately
    if (hasPermission("canMakePayments") && !isDataEntry()) {
      if (!hasBalance(expenseAmount)) {
        addToast({
          type: "error",
          title: "رصيد الخزينة غير كافي",
          message: `المصروف يتطلب ${formatCurrency(
            expenseAmount
          )} لكن الرصيد المتاح ${formatCurrency(safeState.currentBalance)}`,
        });
        return;
      }

      const paymentSuccess = deductForExpense(
        expenseAmount,
        expenseForm.description,
        expenseForm.category
      );

      if (!paymentSuccess) {
        addToast({
          type: "error",
          title: "فشل في دفع المصروف",
          message: "حدث خطأ أثناء دفع المصروف، يرجى المحاولة مرة أخرى",
        });
        return;
      }

      newExpense.status = "paid";
      newExpense.approvedBy = user?.fullName || user?.username || "المدير";
      newExpense.approvedAt = new Date().toISOString();
    }

    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);

    // Explicitly save to localStorage
    localStorage.setItem("financial-expenses", JSON.stringify(updatedExpenses));
    console.log(
      `✅ Expense created and saved: ${newExpense.description} (Status: ${newExpense.status})`
    );

    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new Event("storage"));

    setShowExpenseModal(false);

    // Reset form
    setExpenseForm({
      description: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });

    // Different success messages based on user role
    if (isDataEntry()) {
      addToast({
        type: "success",
        title: "تم إدخال المصروف بنجاح",
        message: `مصروف ${newExpense.description} تم إدخاله وهو بانتظار مراجعة المدير`,
      });
    } else {
      addToast({
        type: "success",
        title: "تم إنشاء المصروف ودفعه",
        message: `تم دفع مصروف ${newExpense.description} بمبلغ ${formatCurrency(
          expenseAmount
        )} من الخزينة`,
      });
    }
  };

  // Handle payment for already created expenses (admin approval)
  const handlePayExpense = (expense: EnhancedGeneralExpense) => {
    if (!hasBalance(expense.amount)) {
      addToast({
        type: "error",
        title: "رصيد الخزينة غير كافي",
        message: `المصروف يتطلب ${formatCurrency(
          expense.amount
        )} لكن الرصيد المتاح ${formatCurrency(safeState.currentBalance)}`,
      });
      return;
    }

    const paymentSuccess = deductForExpense(
      expense.amount,
      expense.description,
      expense.category
    );

    if (paymentSuccess) {
      // Update expense status
      const updatedExpenses = expenses.map((exp) =>
        exp.id === expense.id
          ? {
              ...exp,
              status: "paid" as const,
              approvedBy: user?.fullName || user?.username || "المدير",
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : exp
      );

      setExpenses(updatedExpenses);

      // Explicitly save to localStorage
      localStorage.setItem(
        "financial-expenses",
        JSON.stringify(updatedExpenses)
      );

      // Trigger storage event for cross-tab sync
      window.dispatchEvent(new Event("storage"));

      addToast({
        type: "success",
        title: "تم دفع المصروف بنجاح",
        message: `تم دفع مصروف ${expense.description} بمبلغ ${formatCurrency(
          expense.amount
        )} من الخزينة`,
      });
    } else {
      addToast({
        type: "error",
        title: "فشل في دفع المصروف",
        message: "حدث خطأ أثناء دفع المصروف، يرجى المحاولة مرة أخرى",
      });
    }
  };

  const openPaymentModal = (expense: EnhancedGeneralExpense) => {
    setSelectedExpense(expense);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setSelectedExpense(null);
    setShowPaymentModal(false);
  };

  return (
    <div className="space-y-6 page-transition">
      {/* Page Navigation */}
      <PageNavigation />

      {/* Page Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 arabic-spacing">
            المصروفات العامة
          </h1>
          <p className="text-gray-600 arabic-spacing leading-relaxed">
            إدارة المصروفات التشغيلية مع دفع من الخزينة مباشرة
          </p>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
            {hasPermission("canViewSafe") && (
              <span className="flex items-center space-x-1 space-x-reverse">
                <Wallet className="h-4 w-4 no-flip" />
                <span className="arabic-spacing">
                  رصيد الخزينة: {formatCurrency(safeState.currentBalance)}
                </span>
              </span>
            )}
            <span className="flex items-center space-x-1 space-x-reverse">
              <Receipt className="h-4 w-4 no-flip" />
              <span className="arabic-spacing">{expenses.length} مصروف</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 gap-2 space-x-reverse">
          <Button variant="outline">
            <PieChart className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">تقرير الفئات</span>
          </Button>
          <Button onClick={() => setShowExpenseModal(true)}>
            <Plus className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">مصروف جديد</span>
          </Button>
        </div>
      </div>

      {/* SAFE Balance Alert - Admin only */}
      {hasPermission("canViewSafe") && safeState.currentBalance <= 0 && (
        <Card className="shadow-lg border-0 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 no-flip" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 arabic-spacing mb-2">
                  لا يمكن دفع المصروفات - الخزينة فارغة
                </h3>
                <p className="text-red-700 arabic-spacing mb-4 leading-relaxed">
                  يجب تمويل الخزينة أولاً قبل تتمكن من دفع المصروفات العامة.
                  انتقل إلى صفحة الخزينة لإضافة الأموال.
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

      {/* Expenses Summary */}
      <div
        className={`grid gap-6 ${
          isDataEntry()
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-4"
        }`}
      >
        {/* Total expenses - Admin only */}
        {!isDataEntry() && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 arabic-spacing">
                    إجمالي المصروفات
                  </p>
                  <p className="text-3xl font-bold text-red-600 arabic-nums">
                    {formatCurrency(totalExpenses)}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-red-600 ml-1 no-flip" />
                    <span className="text-sm text-red-600 arabic-spacing">
                      هذا الشهر
                    </span>
                  </div>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <Receipt className="h-6 w-6 text-red-600 no-flip" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Count - Always visible */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  عدد المصروفات
                </p>
                <p className="text-3xl font-bold text-blue-600 arabic-nums">
                  {expenses.length}
                </p>
                <div className="flex items-center mt-2">
                  <FileText className="h-4 w-4 text-blue-600 ml-1 no-flip" />
                  <span className="text-sm text-blue-600 arabic-spacing">
                    {isDataEntry() ? "مُدخلة" : "معاملة"}
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-600 no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top category - Always visible but hide amount for data entry */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  أعلى فئة
                </p>
                <p className="text-2xl font-bold text-purple-600 arabic-spacing">
                  {topCategory?.[0] || "غير محدد"}
                </p>
                <div className="flex items-center mt-2">
                  <PieChart className="h-4 w-4 text-purple-600 ml-1 no-flip" />
                  <span className="text-sm text-purple-600 arabic-nums">
                    {isDataEntry()
                      ? "الأكثر تكراراً"
                      : topCategory
                      ? formatCurrency(topCategory[1])
                      : "0"}
                  </span>
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <PieChart className="h-6 w-6 text-purple-600 no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average - Admin only */}
        {!isDataEntry() && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 arabic-spacing">
                    متوسط المصروف
                  </p>
                  <p className="text-3xl font-bold text-orange-600 arabic-nums">
                    {formatCurrency(totalExpenses / (expenses.length || 1))}
                  </p>
                  <div className="flex items-center mt-2">
                    <DollarSign className="h-4 w-4 text-orange-600 ml-1 no-flip" />
                    <span className="text-sm text-orange-600 arabic-spacing">
                      للمعاملة
                    </span>
                  </div>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-orange-600 no-flip" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 no-flip" />
                <Input
                  placeholder="البحث في المصروفات أو الفئات..."
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 arabic-spacing"
                >
                  <option value="all">جميع الفئات</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">تصفية بالتاريخ</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-spacing">سجل المصروفات</CardTitle>
          <CardDescription className="arabic-spacing">
            جميع المصروفات العامة مرتبة حسب التاريخ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExpenses.map((expense) => {
              const CategoryIcon =
                categoryIcons[expense.category as keyof typeof categoryIcons] ||
                Receipt;
              const categoryColor =
                categoryColors[
                  expense.category as keyof typeof categoryColors
                ] || categoryColors["أخرى"];

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className={`p-3 rounded-full ${categoryColor}`}>
                      <CategoryIcon className="h-5 w-5 no-flip" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <h4 className="font-semibold text-gray-900 arabic-spacing">
                          {expense.description}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 arabic-spacing">
                          {expense.category}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 space-x-4 space-x-reverse text-sm text-gray-600">
                        <span className="arabic-nums">
                          {formatDate(expense.date)}
                        </span>
                        {expense.receiptImage && (
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <ImageIcon className="h-3 w-3 no-flip" />
                            <span className="arabic-spacing">مرفق</span>
                          </div>
                        )}
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-gray-500 mt-1 arabic-spacing">
                          {expense.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {/* Amount and Status display */}
                    <div className="text-left">
                      <p className="text-xl font-bold text-red-600 arabic-nums">
                        {formatCurrency(expense.amount)}
                      </p>
                      {/* Status indicator for all users */}
                      <span
                        className={`text-xs px-2 py-1 rounded-full arabic-spacing mt-1 inline-block ${
                          expense.status === "pending_approval"
                            ? "bg-yellow-100 text-yellow-700"
                            : expense.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : expense.status === "approved"
                            ? "bg-blue-100 text-blue-700"
                            : expense.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {expense.status === "pending_approval"
                          ? "بانتظار الموافقة"
                          : expense.status === "paid"
                          ? "تم الدفع"
                          : expense.status === "approved"
                          ? "معتمد"
                          : expense.status === "rejected"
                          ? "مرفوض"
                          : "تم الإدخال"}
                      </span>
                    </div>

                    <div className="flex space-x-1 space-x-reverse">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4 no-flip" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4 no-flip" />
                      </Button>

                      {/* Payment button - Admin only */}
                      {hasPermission("canMakePayments") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPaymentModal(expense)}
                          disabled={!hasBalance(expense.amount)}
                          className={`h-8 w-8 p-0 ${
                            !hasBalance(expense.amount)
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }`}
                        >
                          <Wallet className="h-4 w-4 no-flip" />
                        </Button>
                      )}

                      {/* Delete button - Admin only */}
                      {hasPermission("canDeleteRecords") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 no-flip" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredExpenses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4 no-flip" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-spacing">
              لا توجد مصروفات
            </h3>
            <p className="text-gray-500 mb-6 arabic-spacing">
              {searchQuery
                ? "جرب تعديل معايير البحث"
                : "ابدأ بتسجيل مصروفك الأول"}
            </p>
            <Button onClick={() => setShowExpenseModal(true)}>
              <Plus className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">إضافة مصروف</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Expense Form Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 arabic-spacing">
                إضافة مصروف جديد
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExpenseModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 arabic-spacing">
                  وصف المصروف *
                </label>
                <Input
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="أدخل وصف المصروف"
                  className="arabic-spacing"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 arabic-spacing">
                  الفئة *
                </label>
                <Select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full"
                >
                  <option value="">اختر الفئة</option>
                  <option value="إيجار المكتب">إيجار المكتب</option>
                  <option value="كهرباء وماء">كهرباء وماء</option>
                  <option value="وقود ومواصلات">وقود ومواصلات</option>
                  <option value="اتصالات">اتصالات</option>
                  <option value="مكتبية وقرطاسية">مكتبية وقرطاسية</option>
                  <option value="ضيافة">ضيافة</option>
                  <option value="أخرى">أخرى</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 arabic-spacing">
                  المبلغ (د.ع) *
                </label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 arabic-spacing">
                  التاريخ *
                </label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 arabic-spacing">
                  ملاحظات
                </label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 arabic-spacing"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <Button
                variant="outline"
                onClick={() => setShowExpenseModal(false)}
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>
              <Button onClick={handleCreateExpense}>
                <Save className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">
                  {isDataEntry() ? "إدخال المصروف" : "إنشاء ودفع"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
