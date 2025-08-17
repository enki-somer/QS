"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Building2,
  Users,
  X,
  Save,
  AlertTriangle,
  Info,
  DollarSign,
  Banknote,
  History,
  Eye,
  FileText,
  Lock,
  Edit3,
  CheckCircle,
  Menu,
  RefreshCw,
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
import { formatCurrency, formatDate } from "@/lib/utils";
import PageNavigation from "@/components/layout/PageNavigation";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import {
  FinancialDisplay,
  FinancialCard,
} from "@/components/ui/FinancialDisplay";
import { PermissionButton } from "@/components/ui/PermissionButton";
import RoleBasedNavigation from "@/components/ui/RoleBasedNavigation";
import { PermissionRoute } from "@/components/ui/PermissionRoute";
import { useResponsive } from "@/hooks/useResponsive";

const transactionTypeLabels = {
  funding: "تمويل الخزينة",
  invoice_payment: "دفعة فاتورة مشروع",
  salary_payment: "راتب موظف",
  general_expense: "مصروف عام",
};

const transactionIcons = {
  funding: <Banknote className="h-5 w-5 no-flip" />,
  invoice_payment: <Building2 className="h-5 w-5 no-flip" />,
  salary_payment: <Users className="h-5 w-5 no-flip" />,
  general_expense: <FileText className="h-5 w-5 no-flip" />,
};

export default function SafePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { safeState, addFunding, getTransactionHistory } = useSafe();
  const { hasPermission, user } = useAuth();
  const permissions = useUIPermissions();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Debug: Log user info and permissions
  useEffect(() => {
    console.log("🔐 Current user:", user);
    console.log("🔐 Can edit safe:", hasPermission("canEditSafe"));
    console.log("🔐 Can make payments:", hasPermission("canMakePayments"));
  }, [user, hasPermission]);

  // Redirect silently if user doesn't have safe access (navigation should prevent this)
  useEffect(() => {
    if (!hasPermission("canViewSafe")) {
      router.replace("/");
    }
  }, [hasPermission, router]);

  // Don't render if user doesn't have access
  if (!hasPermission("canViewSafe")) {
    return null;
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingForm, setFundingForm] = useState({
    amount: "",
    description: "",
    source: "",
  });

  // Edit transaction state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    description: "",
    funding_source: "",
    funding_notes: "",
    edit_reason: "",
  });

  // Dynamic funding sources state
  const [fundingSources, setFundingSources] = useState<any[]>([
    { value: "مقاولات", label: "مقاولات" },
    { value: "بدل ايجار", label: "بدل ايجار" },
    { value: "مصنع", label: "مصنع" },
    { value: "بيع وشراء عقار", label: "بيع وشراء عقار" },
    { value: "ديون", label: "ديون" },
    { value: "اخرى", label: "اخرى" },
  ]);
  const [selectedFundingSource, setSelectedFundingSource] = useState<any>(null);

  // Enhanced dropdown state
  const [fundingSourceSearch, setFundingSourceSearch] = useState("");
  const [showFundingSourceDropdown, setShowFundingSourceDropdown] =
    useState(false);

  // Mobile-specific state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const transactions = getTransactionHistory();

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (transaction.projectName &&
        transaction.projectName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAddFunding = async () => {
    const amount = parseFloat(fundingForm.amount);

    if (!amount || amount <= 0) {
      addToast({
        type: "error",
        title: "مبلغ غير صحيح",
        message: "يرجى إدخال مبلغ صحيح أكبر من الصفر",
      });
      return;
    }

    if (!fundingForm.description) {
      addToast({
        type: "error",
        title: "مصدر التمويل مطلوب",
        message: "يرجى اختيار مصدر التمويل",
      });
      return;
    }

    if (fundingForm.description === "اخرى" && !fundingForm.source.trim()) {
      addToast({
        type: "error",
        title: "الوصف مطلوب",
        message: "يرجى إدخال وصف لمصدر التمويل عند اختيار 'اخرى'",
      });
      return;
    }

    const fullDescription = fundingForm.source
      ? `${fundingForm.description} - ملاحظات: ${fundingForm.source}`
      : fundingForm.description;

    try {
      // If a project source is selected, we need to call the API directly with project info
      if (selectedFundingSource?.type === "project") {
        const response = await apiRequest("/safe/funding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            description: selectedFundingSource.value,
            funding_source: selectedFundingSource.value,
            funding_notes: fundingForm.source,
            project_id: selectedFundingSource.projectId,
            project_name: selectedFundingSource.label
              .split(" - ")[0]
              .replace("مشروع ", ""),
            batch_number: selectedFundingSource.batchNumber,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add project funding");
        }

        // Refresh safe state manually since we bypassed the context
        window.location.reload();
      } else {
        await addFunding(amount, fullDescription);
      }

      addToast({
        type: "success",
        title: "تم تمويل الخزينة بنجاح",
        message: `تم إضافة ${formatCurrency(amount)} إلى الخزينة بنجاح`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "فشل في تمويل الخزينة",
        message: "حدث خطأ أثناء إضافة التمويل، يرجى المحاولة مرة أخرى",
      });
      return;
    }

    setFundingForm({ amount: "", description: "", source: "" });
    setShowFundingModal(false);
  };

  const closeFundingModal = () => {
    setFundingForm({ amount: "", description: "", source: "" });
    setSelectedFundingSource(null);
    setFundingSourceSearch("");
    setShowFundingSourceDropdown(false);
    setShowFundingModal(false);
  };

  // Load dynamic funding sources
  const loadFundingSources = async () => {
    try {
      const response = await apiRequest("/safe/funding-sources");
      if (response.ok) {
        const data = await response.json();
        console.log("📦 Funding sources loaded:", data.fundingSources);
        setFundingSources(data.fundingSources);
      } else {
        console.error("Failed to load funding sources");
      }
    } catch (error) {
      console.error("Error loading funding sources:", error);
    }
  };

  // Load funding sources when component mounts
  useEffect(() => {
    loadFundingSources();
  }, []);

  // Filter funding sources based on search
  const filteredGeneralSources = useMemo(() => {
    return fundingSources
      .filter((source) => source.type !== "project")
      .filter(
        (source) =>
          fundingSourceSearch === "" ||
          source.label.toLowerCase().includes(fundingSourceSearch.toLowerCase())
      );
  }, [fundingSources, fundingSourceSearch]);

  const filteredProjectSources = useMemo(() => {
    return fundingSources
      .filter((source) => source.type === "project")
      .filter(
        (source) =>
          fundingSourceSearch === "" ||
          source.label.toLowerCase().includes(fundingSourceSearch.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by remaining amount (highest first), then by name
        if (a.remainingAmount !== b.remainingAmount) {
          return (b.remainingAmount || 0) - (a.remainingAmount || 0);
        }
        return a.label.localeCompare(b.label, "ar");
      });
  }, [fundingSources, fundingSourceSearch]);

  // Select funding source function
  const selectFundingSource = (source: any) => {
    setSelectedFundingSource(source);
    setFundingForm({
      ...fundingForm,
      description: source.value,
    });
    setFundingSourceSearch(source.label);
    setShowFundingSourceDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".funding-source-dropdown")) {
        setShowFundingSourceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Edit transaction functions
  const openEditModal = async (transaction: any) => {
    try {
      console.log("🔍 Fetching transaction details for:", transaction.id);

      const response = await apiRequest(`/safe/transactions/${transaction.id}`);

      if (response.ok) {
        const data = await response.json();
        console.log("📦 Transaction data received:", data);

        setEditingTransaction(data.data);
        setEditForm({
          amount: data.data.amount.toString(),
          description: data.data.description || "",
          funding_source: data.data.funding_source || "",
          funding_notes: data.data.funding_notes || "",
          edit_reason: "",
        });
        setShowEditModal(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API Error:", response.status, errorData);

        addToast({
          type: "error",
          title: "خطأ في الوصول",
          message:
            errorData.message ||
            `فشل في جلب تفاصيل المعاملة (${response.status})`,
        });
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      addToast({
        type: "error",
        title: "خطأ في الاتصال",
        message: "حدث خطأ أثناء الاتصال بالخادم",
      });
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
    setEditForm({
      amount: "",
      description: "",
      funding_source: "",
      funding_notes: "",
      edit_reason: "",
    });
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction || !editForm.edit_reason.trim()) {
      addToast({
        type: "error",
        title: "خطأ في البيانات",
        message: "سبب التعديل مطلوب",
      });
      return;
    }

    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      addToast({
        type: "error",
        title: "خطأ في المبلغ",
        message: "المبلغ يجب أن يكون أكبر من الصفر",
      });
      return;
    }

    try {
      const response = await apiRequest(
        `/safe/transactions/${editingTransaction.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(editForm.amount),
            description: editForm.description.trim(),
            funding_source: editForm.funding_source.trim(),
            funding_notes: editForm.funding_notes.trim(),
            edit_reason: editForm.edit_reason.trim(),
          }),
        }
      );

      if (response.ok) {
        addToast({
          type: "success",
          title: "تم التعديل بنجاح",
          message: "تم تعديل المعاملة بنجاح",
        });
        closeEditModal();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const errorData = await response.json();
        addToast({
          type: "error",
          title: "فشل في التعديل",
          message: errorData.message || "فشل في تعديل المعاملة",
        });
      }
    } catch (error) {
      console.error("Error editing transaction:", error);
      addToast({
        type: "error",
        title: "خطأ في الاتصال",
        message: "حدث خطأ أثناء الاتصال بالخادم",
      });
    }
  };

  // Pull-to-refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate refresh delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Reload the page to get fresh data
      window.location.reload();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mobile Layout Component
  const MobileLayout = () => (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Wallet className="h-6 w-6 text-blue-600 no-flip" />
            <h1 className="text-lg font-bold text-gray-900 arabic-spacing">
              الخزينة
            </h1>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw
                className={`h-4 w-4 no-flip ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </Button>
            <PermissionButton
              permission="canAddFunding"
              onClick={() => setShowFundingModal(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1"
              viewOnlyTooltip="غير متاح - وضع العرض فقط"
            >
              <Plus className="h-4 w-4 no-flip" />
            </PermissionButton>
          </div>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-center space-x-2 space-x-reverse text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin no-flip" />
            <span className="text-sm arabic-spacing">جاري التحديث...</span>
          </div>
        </div>
      )}

      {/* Balance Alert */}
      {safeState.currentBalance <= 0 && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <AlertTriangle className="h-6 w-6 text-red-600 no-flip flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-800 arabic-spacing">
                الخزينة فارغة
              </h3>
              <p className="text-red-700 arabic-spacing text-sm mt-1">
                يحتاج تمويل فوري لإنشاء الفواتير
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Balance Card */}
      <div className="p-4">
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-blue-100 arabic-spacing mb-2">الرصيد الحالي</p>
              <p className="text-3xl font-bold mb-4">
                <FinancialDisplay value={safeState.currentBalance} />
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-blue-100 arabic-spacing">إجمالي التمويل</p>
                  <p className="font-bold">
                    <FinancialDisplay value={safeState.totalFunded} />
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-blue-100 arabic-spacing">إجمالي الإنفاق</p>
                  <p className="font-bold">
                    <FinancialDisplay value={safeState.totalSpent} />
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="h-12 justify-center"
          >
            <Filter className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">فلترة</span>
          </Button>
          <Button variant="outline" className="h-12 justify-center">
            <Calendar className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">التقرير</span>
          </Button>
        </div>
      </div>

      {/* Mobile Filters */}
      {showMobileFilters && (
        <div className="mx-4 mb-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <Input
                placeholder="ابحث في المعاملات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 text-base arabic-spacing"
              />
            </div>
            <div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-12 w-full text-base arabic-spacing"
              >
                <option value="all">جميع المعاملات</option>
                <option value="funding">التمويل فقط</option>
                <option value="invoice_payment">الفواتير فقط</option>
                <option value="salary_payment">الرواتب فقط</option>
                <option value="general_expense">المصروفات فقط</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Transactions List */}
      <div className="px-4">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 arabic-spacing">
                سجل المعاملات
              </h3>
              <span className="text-sm text-gray-500 arabic-spacing">
                {filteredTransactions.length} معاملة
              </span>
            </div>
          </div>

          {filteredTransactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <div
                      className={`p-2 rounded-full flex-shrink-0 ${
                        transaction.amount > 0
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transactionIcons[transaction.type] || (
                        <FileText className="h-4 w-4 no-flip" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 arabic-spacing truncate">
                          {transaction.description}
                        </h4>
                        <p
                          className={`text-lg font-bold ${
                            transaction.amount > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          <FinancialDisplay
                            value={Math.abs(transaction.amount)}
                          />
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 arabic-spacing">
                          {transactionTypeLabels[transaction.type]}
                        </span>
                        {transaction.is_edited && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 arabic-spacing">
                            معدل
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 arabic-spacing">
                        {formatDate(transaction.date)}
                        {transaction.projectName && (
                          <span className="mr-2">
                            • {transaction.projectName}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>
                          السابق: {formatCurrency(transaction.previousBalance)}
                        </span>
                        <span>
                          الجديد: {formatCurrency(transaction.newBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Edit Button */}
                  {(hasPermission("canEditSafe") ||
                    hasPermission("canMakePayments")) &&
                    transaction.type === "funding" && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(transaction)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit3 className="h-3 w-3 ml-1 no-flip" />
                          <span className="arabic-spacing text-xs">تعديل</span>
                        </Button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8 text-gray-400 no-flip" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-spacing">
                {searchQuery || typeFilter !== "all"
                  ? "لا توجد معاملات تطابق البحث"
                  : "لا توجد معاملات بعد"}
              </h3>
              <p className="text-gray-500 arabic-spacing text-sm mb-4">
                {searchQuery || typeFilter !== "all"
                  ? "جرب تعديل معايير البحث"
                  : "ابدأ بتمويل الخزينة"}
              </p>
              {!searchQuery && typeFilter === "all" && (
                <PermissionButton
                  permission="canAddFunding"
                  onClick={() => setShowFundingModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  viewOnlyTooltip="غير متاح - وضع العرض فقط"
                >
                  <Plus className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">تمويل الخزينة</span>
                </PermissionButton>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-20 left-4 z-30">
        <PermissionButton
          permission="canAddFunding"
          onClick={() => setShowFundingModal(true)}
          className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
          viewOnlyTooltip="غير متاح - وضع العرض فقط"
        >
          <Plus className="h-6 w-6 no-flip" />
        </PermissionButton>
      </div>
    </div>
  );

  // Tablet Layout Component
  const TabletLayout = () => (
    <div className="space-y-6 p-6">
      {/* Tablet Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-spacing">
              إدارة الخزينة
            </h1>
            <p className="text-gray-600 arabic-spacing mt-1">
              مركز التحكم المالي - {transactions.length} معاملة
            </p>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ml-2 no-flip ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="arabic-spacing">تحديث</span>
            </Button>
            <PermissionButton
              permission="canAddFunding"
              onClick={() => setShowFundingModal(true)}
              className="bg-green-600 hover:bg-green-700"
              viewOnlyTooltip="غير متاح - وضع العرض فقط"
            >
              <Plus className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">تمويل الخزينة</span>
            </PermissionButton>
          </div>
        </div>
      </div>

      {/* Balance Alert */}
      {safeState.currentBalance <= 0 && (
        <Card className="shadow-lg border-0 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 no-flip" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 arabic-spacing mb-2">
                  الخزينة فارغة - يحتاج تمويل فوري
                </h3>
                <p className="text-red-700 arabic-spacing leading-relaxed">
                  لا يمكن إنشاء فواتير أو دفع رواتب أو مصروفات بدون رصيد في
                  الخزينة.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tablet Financial Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  الرصيد الحالي
                </p>
                <p
                  className={`text-2xl font-bold ${
                    safeState.currentBalance > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <FinancialDisplay value={safeState.currentBalance} />
                </p>
                <div className="flex items-center text-sm">
                  <Wallet className="h-4 w-4 ml-1 no-flip" />
                  <span
                    className={`arabic-spacing ${
                      safeState.currentBalance > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {safeState.currentBalance > 0
                      ? "متاح للإنفاق"
                      : "يحتاج تمويل"}
                  </span>
                </div>
              </div>
              <div
                className={`p-3 rounded-xl shadow-lg ${
                  safeState.currentBalance > 0
                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                    : "bg-gradient-to-br from-red-500 to-red-600"
                }`}
              >
                <DollarSign className="h-6 w-6 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي التمويل
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  <FinancialDisplay value={safeState.totalFunded} />
                </p>
                <div className="flex items-center text-sm text-blue-600">
                  <ArrowUpRight className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">أموال مضافة</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <TrendingUp className="h-6 w-6 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي الإنفاق
                </p>
                <p className="text-2xl font-bold text-red-600">
                  <FinancialDisplay value={safeState.totalSpent} />
                </p>
                <div className="flex items-center text-sm text-red-600">
                  <ArrowDownRight className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">مبالغ منفقة</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl shadow-lg">
                <TrendingDown className="h-6 w-6 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  عدد المعاملات
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {transactions.length}
                </p>
                <div className="flex items-center text-sm text-purple-600">
                  <History className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">جميع المعاملات</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-3 rounded-xl shadow-lg">
                <History className="h-6 w-6 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tablet Filters */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 no-flip" />
                <Input
                  placeholder="ابحث في المعاملات والمشاريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 h-12 text-base arabic-spacing"
                />
              </div>
            </div>
            <div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-12 w-full text-base arabic-spacing"
              >
                <option value="all">جميع المعاملات</option>
                <option value="funding">التمويل فقط</option>
                <option value="invoice_payment">الفواتير فقط</option>
                <option value="salary_payment">الرواتب فقط</option>
                <option value="general_expense">المصروفات فقط</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tablet Transactions */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <History className="h-6 w-6 ml-2 text-blue-600 no-flip" />
            سجل المعاملات المالية
          </CardTitle>
          <CardDescription className="arabic-spacing">
            جميع حركات الأموال الداخلة والخارجة من الخزينة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div
                      className={`p-3 rounded-full ${
                        transaction.amount > 0
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transactionIcons[transaction.type] || (
                        <FileText className="h-5 w-5 no-flip" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <h4 className="font-semibold text-gray-900 arabic-spacing">
                          {transaction.description}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 arabic-spacing">
                          {transactionTypeLabels[transaction.type]}
                        </span>
                        {transaction.is_edited && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 arabic-spacing flex items-center space-x-1 space-x-reverse">
                            <Edit3 className="h-3 w-3 no-flip" />
                            <span>معدل</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                        <span className="arabic-nums">
                          {formatDate(transaction.date)}
                        </span>
                        {transaction.projectName && (
                          <span className="arabic-spacing">
                            المشروع: {transaction.projectName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left flex items-center space-x-3 space-x-reverse">
                    <div>
                      <p
                        className={`text-xl font-bold ${
                          transaction.amount > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        <FinancialDisplay
                          value={Math.abs(transaction.amount)}
                        />
                      </p>
                    </div>
                    {(hasPermission("canEditSafe") ||
                      hasPermission("canMakePayments")) &&
                      transaction.type === "funding" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(transaction)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit3 className="h-4 w-4 ml-1 no-flip" />
                          <span className="arabic-spacing">تعديل</span>
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="h-10 w-10 text-gray-400 no-flip" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 arabic-spacing">
                {searchQuery || typeFilter !== "all"
                  ? "لا توجد معاملات تطابق البحث"
                  : "لا توجد معاملات بعد"}
              </h3>
              <p className="text-gray-500 mb-6 arabic-spacing">
                {searchQuery || typeFilter !== "all"
                  ? "جرب تعديل معايير البحث أو الفلاتر"
                  : "ابدأ بتمويل الخزينة لتتمكن من إنشاء الفواتير"}
              </p>
              {!searchQuery && typeFilter === "all" && (
                <PermissionButton
                  permission="canAddFunding"
                  onClick={() => setShowFundingModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                  viewOnlyTooltip="غير متاح - وضع العرض فقط"
                >
                  <Plus className="h-5 w-5 ml-2 no-flip" />
                  <span className="arabic-spacing">تمويل الخزينة الآن</span>
                </PermissionButton>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Shared Modal Components
  const FundingModalContent = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse text-white">
              <div className="bg-white/20 p-2 rounded-lg">
                <Banknote className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h3 className="text-xl font-bold arabic-spacing">
                  تمويل الخزينة
                </h3>
                <p className="text-green-100 arabic-spacing text-sm">
                  إضافة أموال جديدة إلى الخزينة مع تسجيل كامل
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeFundingModal}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 no-flip" />
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-6 flex-1 overflow-y-auto scroll-smooth">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 space-x-reverse text-blue-800">
              <Info className="h-5 w-5 no-flip" />
              <span className="font-medium arabic-spacing">الرصيد الحالي:</span>
              <span className="font-bold">
                <FinancialDisplay value={safeState.currentBalance} />
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                مبلغ التمويل (بالدينار العراقي) *
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={fundingForm.amount}
                onChange={(e) =>
                  setFundingForm({
                    ...fundingForm,
                    amount: e.target.value,
                  })
                }
                className="h-12 text-base"
                placeholder="1000000"
              />
              {fundingForm.amount && (
                <p className="text-green-600 text-sm font-medium">
                  💰{" "}
                  {new Intl.NumberFormat("en-US").format(
                    Number(fundingForm.amount)
                  )}{" "}
                  دينار عراقي
                </p>
              )}
              {fundingForm.amount && (
                <p className="text-blue-600 text-sm">
                  الرصيد بعد التمويل:{" "}
                  {formatCurrency(
                    safeState.currentBalance +
                      (parseFloat(fundingForm.amount) || 0)
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                مصدر التمويل *
              </label>

              {/* Enhanced Funding Source Selector */}
              <div className="relative funding-source-dropdown">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث عن مصدر التمويل أو اختر من القائمة..."
                    value={fundingSourceSearch}
                    onChange={(e) => setFundingSourceSearch(e.target.value)}
                    onFocus={() => setShowFundingSourceDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setShowFundingSourceDropdown(false);
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const allSources = [
                          ...filteredGeneralSources,
                          ...filteredProjectSources,
                        ];
                        if (allSources.length === 1) {
                          selectFundingSource(allSources[0]);
                        }
                      }
                    }}
                    className="w-full h-12 px-4 pr-10 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 arabic-spacing"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>

                {/* Dropdown Results */}
                {showFundingSourceDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {/* General Sources Section */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 arabic-spacing">
                        مصادر عامة
                      </div>
                      {filteredGeneralSources.map((source) => (
                        <button
                          key={source.value}
                          type="button"
                          onClick={() => selectFundingSource(source)}
                          className="w-full text-right p-2 hover:bg-gray-50 rounded-md flex items-center space-x-2 space-x-reverse"
                        >
                          <span className="text-2xl">💰</span>
                          <span className="text-sm font-medium text-gray-900 arabic-spacing">
                            {source.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Project Sources Section */}
                    {filteredProjectSources.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 arabic-spacing">
                          مشاريع ({filteredProjectSources.length})
                        </div>
                        {filteredProjectSources.map((source) => (
                          <button
                            key={source.value}
                            type="button"
                            onClick={() => selectFundingSource(source)}
                            className={`w-full text-right p-3 rounded-md border mb-1 transition-colors ${
                              source.isAvailable
                                ? "hover:bg-blue-50 border-transparent hover:border-blue-200"
                                : "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                            }`}
                            disabled={!source.isAvailable}
                          >
                            <div className="flex items-start space-x-3 space-x-reverse">
                              <span className="text-2xl">🏗️</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 arabic-spacing truncate">
                                  {source.label
                                    .split(" - ")[0]
                                    .replace("مشروع ", "")}
                                </div>
                                <div className="text-xs text-gray-500 arabic-spacing">
                                  <span>الدفعة {source.batchNumber}</span>
                                  {source.projectCode && (
                                    <span className="mr-2">
                                      • {source.projectCode}
                                    </span>
                                  )}
                                  {source.projectLocation && (
                                    <span className="mr-2">
                                      • {source.projectLocation}
                                    </span>
                                  )}
                                </div>
                                {source.remainingAmount !== undefined && (
                                  <div className="text-xs mt-1">
                                    <span
                                      className={`font-medium ${
                                        source.isAvailable
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      متبقي:{" "}
                                      {new Intl.NumberFormat("en-US").format(
                                        source.remainingAmount
                                      )}{" "}
                                      د.ع
                                    </span>
                                    <span className="text-gray-400 mr-2">
                                      من أصل{" "}
                                      {new Intl.NumberFormat("en-US").format(
                                        source.totalDealPrice || 0
                                      )}{" "}
                                      د.ع
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                                {source.isAvailable ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    متاح
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    مكتمل
                                  </span>
                                )}
                                {source.projectStatus && (
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      source.projectStatus === "active"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {source.projectStatus === "active"
                                      ? "نشط"
                                      : "تخطيط"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {filteredGeneralSources.length === 0 &&
                      filteredProjectSources.length === 0 && (
                        <div className="p-4 text-center text-gray-500 arabic-spacing">
                          لا توجد نتائج مطابقة للبحث
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Selected Source Display */}
              {selectedFundingSource && (
                <div
                  className={`border rounded-lg p-3 mt-2 ${
                    selectedFundingSource.type === "project"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-xl">
                        {selectedFundingSource.type === "project" ? "🏗️" : "💰"}
                      </span>
                      <span className="font-medium text-gray-900 arabic-spacing">
                        {selectedFundingSource.type === "project"
                          ? selectedFundingSource.label
                              .split(" - ")[0]
                              .replace("مشروع ", "")
                          : selectedFundingSource.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFundingSource(null);
                        setFundingForm({
                          ...fundingForm,
                          description: "",
                        });
                        setFundingSourceSearch("");
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {selectedFundingSource.type === "project" && (
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div className="text-blue-700">
                        <span className="font-medium">📦 رقم الدفعة:</span>
                        <span className="mr-1">
                          {selectedFundingSource.batchNumber}
                        </span>
                      </div>
                      {selectedFundingSource.remainingAmount !== undefined && (
                        <div className="text-blue-700">
                          <span className="font-medium">
                            💰 المبلغ المتبقي:
                          </span>
                          <span className="mr-1">
                            {new Intl.NumberFormat("en-US").format(
                              selectedFundingSource.remainingAmount
                            )}{" "}
                            د.ع
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                ملاحظات إضافية (اختياري)
              </label>
              <Input
                value={fundingForm.source}
                onChange={(e) =>
                  setFundingForm({
                    ...fundingForm,
                    source: e.target.value,
                  })
                }
                className="h-12 text-base arabic-spacing"
                placeholder="مثال: تفاصيل إضافية حول مصدر التمويل"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="h-5 w-5 text-amber-600 no-flip flex-shrink-0 mt-0.5" />
              <div className="text-amber-800 text-sm arabic-spacing leading-relaxed">
                <p className="font-medium mb-1">تنبيه مهم:</p>
                <p>
                  سيتم تسجيل هذا التمويل بشكل دائم في سجل المعاملات مع التاريخ
                  والوقت. تأكد من صحة المبلغ والوصف قبل الحفظ.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 arabic-spacing">
              <span className="font-medium">ملاحظة:</span> ستتم إضافة المبلغ
              فوراً إلى رصيد الخزينة
            </div>

            <div className="flex space-x-4 space-x-reverse">
              <Button
                variant="outline"
                onClick={closeFundingModal}
                className="px-6 py-3 text-base"
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>

              <Button
                onClick={handleAddFunding}
                disabled={
                  !fundingForm.amount ||
                  !fundingForm.description ||
                  (fundingForm.description === "اخرى" &&
                    !fundingForm.source.trim())
                }
                className="px-6 py-3 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5 ml-2 no-flip" />
                <span className="arabic-spacing">تأكيد التمويل</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EditModalContent = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white/20 p-2 rounded-lg">
                <Edit3 className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h3 className="text-xl font-bold arabic-spacing">
                  تعديل معاملة مالية
                </h3>
                <p className="text-blue-100 text-sm arabic-spacing mt-1">
                  تعديل بيانات المعاملة مع الاحتفاظ بسجل التعديل
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditModal}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 no-flip" />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Original Transaction Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 arabic-spacing mb-3">
              معلومات المعاملة الأصلية:
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">المبلغ الأصلي:</span>
                <span className="font-medium text-green-600 mr-2 pr-2">
                  {formatCurrency(editingTransaction.amount)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">التاريخ:</span>
                <span className="font-medium mr-2 text-gray-800 pr-2">
                  {formatDate(editingTransaction.date)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">الوصف الأصلي:</span>
                <span className="font-medium mr-2 text-gray-800 pr-2">
                  {editingTransaction.description}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                المبلغ الجديد *
              </label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm({ ...editForm, amount: e.target.value })
                }
                className="h-12 text-base arabic-spacing"
                placeholder="أدخل المبلغ الجديد"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                الوصف الجديد
              </label>
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    description: e.target.value,
                  })
                }
                className="h-12 text-base arabic-spacing"
                placeholder="أدخل الوصف الجديد"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                مصدر التمويل
              </label>
              <Select
                value={editForm.funding_source}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    funding_source: e.target.value,
                  })
                }
                className="h-12 text-base arabic-spacing"
              >
                <option value="">اختر مصدر التمويل</option>
                {fundingSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                ملاحظات إضافية
              </label>
              <Input
                value={editForm.funding_notes}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    funding_notes: e.target.value,
                  })
                }
                className="h-12 text-base arabic-spacing"
                placeholder="ملاحظات إضافية حول التعديل"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                سبب التعديل * (مطلوب للمراجعة)
              </label>
              <Input
                value={editForm.edit_reason}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    edit_reason: e.target.value,
                  })
                }
                className="h-12 text-base arabic-spacing"
                placeholder="أدخل سبب التعديل (مثال: تصحيح خطأ في المبلغ)"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="h-5 w-5 text-amber-600 no-flip flex-shrink-0 mt-0.5" />
              <div className="text-amber-800 text-sm arabic-spacing leading-relaxed">
                <p className="font-medium mb-1">تنبيه مهم:</p>
                <p>
                  سيتم تسجيل هذا التعديل في سجل المراجعة مع اسم المستخدم والوقت
                  وسبب التعديل. تأكد من صحة البيانات قبل الحفظ.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 arabic-spacing">
              <span className="font-medium">ملاحظة:</span> سيتم تعديل رصيد
              الخزينة تلقائياً
            </div>

            <div className="flex space-x-4 space-x-reverse">
              <Button
                variant="outline"
                onClick={closeEditModal}
                className="px-6 py-3 text-base"
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>

              <Button
                onClick={handleEditTransaction}
                disabled={
                  !editForm.amount ||
                  !editForm.edit_reason.trim() ||
                  parseFloat(editForm.amount) <= 0
                }
                className="px-6 py-3 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5 ml-2 no-flip" />
                <span className="arabic-spacing">تأكيد التعديل</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Responsive Layout Selection
  if (isMobile) {
    return (
      <PermissionRoute requiredPermission="canAccessSafePage">
        <div>
          <MobileLayout />
          {/* Include modals for mobile */}
          {showFundingModal && <FundingModalContent />}
          {showEditModal && editingTransaction && <EditModalContent />}
        </div>
      </PermissionRoute>
    );
  }

  if (isTablet) {
    return (
      <PermissionRoute requiredPermission="canAccessSafePage">
        <div>
          <TabletLayout />
          {/* Include modals for tablet */}
          {showFundingModal && <FundingModalContent />}
          {showEditModal && editingTransaction && <EditModalContent />}
        </div>
      </PermissionRoute>
    );
  }

  // Desktop Layout (existing)
  return (
    <PermissionRoute requiredPermission="canAccessSafePage">
      <div className="space-y-8">
        {/* Role-Based Navigation */}
        <RoleBasedNavigation />

        {/* Page Header */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 arabic-spacing">
              إدارة الخزينة
            </h1>
            <p className="text-gray-600 arabic-spacing leading-relaxed">
              مركز التحكم المالي - جميع المعاملات والأموال تمر عبر الخزينة
            </p>
            <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
              <span className="flex items-center space-x-1 space-x-reverse">
                <History className="h-4 w-4 no-flip" />
                <span className="arabic-spacing">
                  {transactions.length} معاملة
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 gap-2 space-x-reverse">
            <Button variant="outline">
              <Calendar className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">التقرير الشهري</span>
            </Button>
            <PermissionButton
              permission="canAddFunding"
              onClick={() => setShowFundingModal(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              viewOnlyTooltip="غير متاح - وضع العرض فقط"
            >
              <Plus className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">تمويل الخزينة</span>
            </PermissionButton>
          </div>
        </div>

        {/* Balance Alert */}
        {safeState.currentBalance <= 0 && (
          <Card className="shadow-lg border-0 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600 no-flip" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-800 arabic-spacing mb-2">
                    الخزينة فارغة - يحتاج تمويل فوري
                  </h3>
                  <p className="text-red-700 arabic-spacing mb-4 leading-relaxed">
                    لا يمكن إنشاء فواتير أو دفع رواتب أو مصروفات بدون رصيد في
                    الخزينة. قم بتمويل الخزينة أولاً.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 arabic-spacing">
                    الرصيد الحالي
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      safeState.currentBalance > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <FinancialDisplay value={safeState.currentBalance} />
                  </p>
                  <div className="flex items-center text-sm">
                    <Wallet className="h-4 w-4 ml-1 no-flip" />
                    <span
                      className={`arabic-spacing ${
                        safeState.currentBalance > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {safeState.currentBalance > 0
                        ? "متاح للإنفاق"
                        : "يحتاج تمويل"}
                    </span>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-xl shadow-lg ${
                    safeState.currentBalance > 0
                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                      : "bg-gradient-to-br from-red-500 to-red-600"
                  }`}
                >
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
                    إجمالي التمويل
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    <FinancialDisplay value={safeState.totalFunded} />
                  </p>
                  <div className="flex items-center text-sm text-blue-600">
                    <ArrowUpRight className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">أموال مضافة</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-lg">
                  <TrendingUp className="h-8 w-8 text-white no-flip" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 arabic-spacing">
                    إجمالي الإنفاق
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    <FinancialDisplay value={safeState.totalSpent} />
                  </p>
                  <div className="flex items-center text-sm text-red-600">
                    <ArrowDownRight className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">مبالغ منفقة</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg">
                  <TrendingDown className="h-8 w-8 text-white no-flip" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 arabic-spacing">
                    عدد المعاملات
                  </p>
                  <p className="text-3xl font-bold text-purple-600">
                    {transactions.length}
                  </p>
                  <div className="flex items-center text-sm text-purple-600">
                    <History className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">جميع المعاملات</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-4 rounded-xl shadow-lg">
                  <History className="h-8 w-8 text-white no-flip" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 no-flip" />
                  <Input
                    placeholder="ابحث في المعاملات والمشاريع..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-12 h-12 text-base arabic-spacing border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Filter className="h-5 w-5 text-gray-500 no-flip" />
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-12 rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 arabic-spacing min-w-[180px]"
                  >
                    <option value="all">جميع المعاملات</option>
                    <option value="funding">التمويل فقط</option>
                    <option value="invoice_payment">الفواتير فقط</option>
                    <option value="salary_payment">الرواتب فقط</option>
                    <option value="general_expense">المصروفات فقط</option>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="arabic-spacing flex items-center">
              <History className="h-6 w-6 ml-2 text-blue-600 no-flip" />
              سجل المعاملات المالية
            </CardTitle>
            <CardDescription className="arabic-spacing">
              جميع حركات الأموال الداخلة والخارجة من الخزينة مع التفاصيل الكاملة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-6 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div
                        className={`p-3 rounded-full ${
                          transaction.amount > 0
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {transactionIcons[transaction.type] || (
                          <FileText className="h-5 w-5 no-flip" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                          <h4 className="font-semibold text-gray-900 arabic-spacing">
                            {transaction.description}
                          </h4>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 arabic-spacing">
                            {transactionTypeLabels[transaction.type]}
                          </span>
                          {transaction.is_edited && (
                            <span
                              className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 arabic-spacing flex items-center space-x-1 space-x-reverse"
                              title={`معدل: ${
                                transaction.edit_reason || "غير محدد"
                              }`}
                            >
                              <Edit3 className="h-3 w-3 no-flip" />
                              <span>معدل</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                          <span className="arabic-nums">
                            {formatDate(transaction.date)}
                          </span>
                          {transaction.projectName && (
                            <span className="arabic-spacing">
                              المشروع: {transaction.projectName}
                            </span>
                          )}
                          {transaction.invoiceNumber && (
                            <span className="arabic-spacing">
                              فاتورة: {transaction.invoiceNumber}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span className="arabic-spacing">
                            الرصيد السابق:{" "}
                            {formatCurrency(transaction.previousBalance)}
                          </span>
                          <span className="arabic-spacing">
                            الرصيد الجديد:{" "}
                            {formatCurrency(transaction.newBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left flex items-center space-x-3 space-x-reverse">
                      <div>
                        <p
                          className={`text-2xl font-bold ${
                            transaction.amount > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          <FinancialDisplay
                            value={Math.abs(transaction.amount)}
                          />
                        </p>
                      </div>
                      {(hasPermission("canEditSafe") ||
                        hasPermission("canMakePayments")) &&
                        transaction.type === "funding" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(transaction)}
                            className="h-10 px-3 text-blue-600 border-blue-200 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium"
                            title="تعديل المعاملة"
                          >
                            <Edit3 className="h-4 w-4 ml-1 no-flip" />
                            <span className="arabic-spacing">تعديل</span>
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="h-12 w-12 text-gray-400 no-flip" />
                </div>
                <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
                  {searchQuery || typeFilter !== "all"
                    ? "لا توجد معاملات تطابق البحث"
                    : "لا توجد معاملات بعد"}
                </h3>
                <p className="text-gray-500 mb-8 arabic-spacing text-lg leading-relaxed max-w-md mx-auto">
                  {searchQuery || typeFilter !== "all"
                    ? "جرب تعديل معايير البحث أو الفلاتر"
                    : "ابدأ بتمويل الخزينة لتتمكن من إنشاء الفواتير ودفع الرواتب والمصروفات"}
                </p>
                {!searchQuery && typeFilter === "all" && (
                  <PermissionButton
                    permission="canAddFunding"
                    onClick={() => setShowFundingModal(true)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    viewOnlyTooltip="غير متاح - وضع العرض فقط"
                  >
                    <Plus className="h-5 w-5 ml-2 no-flip" />
                    <span className="arabic-spacing">تمويل الخزينة الآن</span>
                  </PermissionButton>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funding Modal */}
        {showFundingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse text-white">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Banknote className="h-6 w-6 no-flip" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold arabic-spacing">
                        تمويل الخزينة
                      </h3>
                      <p className="text-green-100 arabic-spacing text-sm">
                        إضافة أموال جديدة إلى الخزينة مع تسجيل كامل
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeFundingModal}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4 no-flip" />
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-6 flex-1 overflow-y-auto scroll-smooth">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 space-x-reverse text-blue-800">
                    <Info className="h-5 w-5 no-flip" />
                    <span className="font-medium arabic-spacing">
                      الرصيد الحالي:
                    </span>
                    <span className="font-bold">
                      <FinancialDisplay value={safeState.currentBalance} />
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      مبلغ التمويل (بالدينار العراقي) *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={fundingForm.amount}
                      onChange={(e) =>
                        setFundingForm({
                          ...fundingForm,
                          amount: e.target.value,
                        })
                      }
                      className="h-12 text-base"
                      placeholder="1000000"
                    />
                    {fundingForm.amount && (
                      <p className="text-green-600 text-sm font-medium">
                        💰{" "}
                        {new Intl.NumberFormat("en-US").format(
                          Number(fundingForm.amount)
                        )}{" "}
                        دينار عراقي
                      </p>
                    )}
                    {fundingForm.amount && (
                      <p className="text-blue-600 text-sm">
                        الرصيد بعد التمويل:{" "}
                        {formatCurrency(
                          safeState.currentBalance +
                            (parseFloat(fundingForm.amount) || 0)
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      مصدر التمويل *
                    </label>

                    {/* Enhanced Funding Source Selector */}
                    <div className="relative funding-source-dropdown">
                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="ابحث عن مصدر التمويل أو اختر من القائمة..."
                          value={fundingSourceSearch}
                          onChange={(e) =>
                            setFundingSourceSearch(e.target.value)
                          }
                          onFocus={() => setShowFundingSourceDropdown(true)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setShowFundingSourceDropdown(false);
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              const allSources = [
                                ...filteredGeneralSources,
                                ...filteredProjectSources,
                              ];
                              if (allSources.length === 1) {
                                selectFundingSource(allSources[0]);
                              }
                            }
                          }}
                          className="w-full h-12 px-4 pr-10 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 arabic-spacing"
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>

                      {/* Dropdown Results */}
                      {showFundingSourceDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                          {/* General Sources Section */}
                          <div className="p-2 border-b border-gray-100">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 arabic-spacing">
                              مصادر عامة
                            </div>
                            {filteredGeneralSources.map((source) => (
                              <button
                                key={source.value}
                                type="button"
                                onClick={() => selectFundingSource(source)}
                                className="w-full text-right p-2 hover:bg-gray-50 rounded-md flex items-center space-x-2 space-x-reverse"
                              >
                                <span className="text-2xl">💰</span>
                                <span className="text-sm font-medium text-gray-900 arabic-spacing">
                                  {source.label}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Project Sources Section */}
                          {filteredProjectSources.length > 0 && (
                            <div className="p-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 arabic-spacing">
                                مشاريع ({filteredProjectSources.length})
                              </div>
                              {filteredProjectSources.map((source) => (
                                <button
                                  key={source.value}
                                  type="button"
                                  onClick={() => selectFundingSource(source)}
                                  className={`w-full text-right p-3 rounded-md border mb-1 transition-colors ${
                                    source.isAvailable
                                      ? "hover:bg-blue-50 border-transparent hover:border-blue-200"
                                      : "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                                  }`}
                                  disabled={!source.isAvailable}
                                >
                                  <div className="flex items-start space-x-3 space-x-reverse">
                                    <span className="text-2xl">🏗️</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 arabic-spacing truncate">
                                        {source.label
                                          .split(" - ")[0]
                                          .replace("مشروع ", "")}
                                      </div>
                                      <div className="text-xs text-gray-500 arabic-spacing">
                                        <span>الدفعة {source.batchNumber}</span>
                                        {source.projectCode && (
                                          <span className="mr-2">
                                            • {source.projectCode}
                                          </span>
                                        )}
                                        {source.projectLocation && (
                                          <span className="mr-2">
                                            • {source.projectLocation}
                                          </span>
                                        )}
                                      </div>
                                      {source.remainingAmount !== undefined && (
                                        <div className="text-xs mt-1">
                                          <span
                                            className={`font-medium ${
                                              source.isAvailable
                                                ? "text-green-600"
                                                : "text-red-600"
                                            }`}
                                          >
                                            متبقي:{" "}
                                            {new Intl.NumberFormat(
                                              "en-US"
                                            ).format(
                                              source.remainingAmount
                                            )}{" "}
                                            د.ع
                                          </span>
                                          <span className="text-gray-400 mr-2">
                                            من أصل{" "}
                                            {new Intl.NumberFormat(
                                              "en-US"
                                            ).format(
                                              source.totalDealPrice || 0
                                            )}{" "}
                                            د.ع
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                                      {source.isAvailable ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          متاح
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          مكتمل
                                        </span>
                                      )}
                                      {source.projectStatus && (
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            source.projectStatus === "active"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-yellow-100 text-yellow-800"
                                          }`}
                                        >
                                          {source.projectStatus === "active"
                                            ? "نشط"
                                            : "تخطيط"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* No Results */}
                          {filteredGeneralSources.length === 0 &&
                            filteredProjectSources.length === 0 && (
                              <div className="p-4 text-center text-gray-500 arabic-spacing">
                                لا توجد نتائج مطابقة للبحث
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Selected Source Display */}
                    {selectedFundingSource && (
                      <div
                        className={`border rounded-lg p-3 mt-2 ${
                          selectedFundingSource.type === "project"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-xl">
                              {selectedFundingSource.type === "project"
                                ? "🏗️"
                                : "💰"}
                            </span>
                            <span className="font-medium text-gray-900 arabic-spacing">
                              {selectedFundingSource.type === "project"
                                ? selectedFundingSource.label
                                    .split(" - ")[0]
                                    .replace("مشروع ", "")
                                : selectedFundingSource.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFundingSource(null);
                              setFundingForm({
                                ...fundingForm,
                                description: "",
                              });
                              setFundingSourceSearch("");
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {selectedFundingSource.type === "project" && (
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div className="text-blue-700">
                              <span className="font-medium">
                                📦 رقم الدفعة:
                              </span>
                              <span className="mr-1">
                                {selectedFundingSource.batchNumber}
                              </span>
                            </div>
                            {selectedFundingSource.remainingAmount !==
                              undefined && (
                              <div className="text-blue-700">
                                <span className="font-medium">
                                  💰 المبلغ المتبقي:
                                </span>
                                <span className="mr-1">
                                  {new Intl.NumberFormat("en-US").format(
                                    selectedFundingSource.remainingAmount
                                  )}{" "}
                                  د.ع
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      ملاحظات إضافية (اختياري)
                    </label>
                    <Input
                      value={fundingForm.source}
                      onChange={(e) =>
                        setFundingForm({
                          ...fundingForm,
                          source: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="مثال: تفاصيل إضافية حول مصدر التمويل"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <AlertTriangle className="h-5 w-5 text-amber-600 no-flip flex-shrink-0 mt-0.5" />
                    <div className="text-amber-800 text-sm arabic-spacing leading-relaxed">
                      <p className="font-medium mb-1">تنبيه مهم:</p>
                      <p>
                        سيتم تسجيل هذا التمويل بشكل دائم في سجل المعاملات مع
                        التاريخ والوقت. تأكد من صحة المبلغ والوصف قبل الحفظ.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 arabic-spacing">
                    <span className="font-medium">ملاحظة:</span> ستتم إضافة
                    المبلغ فوراً إلى رصيد الخزينة
                  </div>

                  <div className="flex space-x-4 space-x-reverse">
                    <Button
                      variant="outline"
                      onClick={closeFundingModal}
                      className="px-6 py-3 text-base"
                    >
                      <span className="arabic-spacing">إلغاء</span>
                    </Button>

                    <Button
                      onClick={handleAddFunding}
                      disabled={
                        !fundingForm.amount ||
                        !fundingForm.description ||
                        (fundingForm.description === "اخرى" &&
                          !fundingForm.source.trim())
                      }
                      className="px-6 py-3 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                    >
                      <Save className="h-5 w-5 ml-2 no-flip" />
                      <span className="arabic-spacing">تأكيد التمويل</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {showEditModal && editingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Edit3 className="h-6 w-6 no-flip" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold arabic-spacing">
                        تعديل معاملة مالية
                      </h3>
                      <p className="text-blue-100 text-sm arabic-spacing mt-1">
                        تعديل بيانات المعاملة مع الاحتفاظ بسجل التعديل
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeEditModal}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4 no-flip" />
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Original Transaction Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 arabic-spacing mb-3">
                    معلومات المعاملة الأصلية:
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">المبلغ الأصلي:</span>
                      <span className="font-medium text-green-600 mr-2 pr-2">
                        {formatCurrency(editingTransaction.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">التاريخ:</span>
                      <span className="font-medium mr-2 text-gray-800 pr-2">
                        {formatDate(editingTransaction.date)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">الوصف الأصلي:</span>
                      <span className="font-medium mr-2 text-gray-800 pr-2">
                        {editingTransaction.description}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      المبلغ الجديد *
                    </label>
                    <Input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, amount: e.target.value })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="أدخل المبلغ الجديد"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      الوصف الجديد
                    </label>
                    <Input
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="أدخل الوصف الجديد"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      مصدر التمويل
                    </label>
                    <Select
                      value={editForm.funding_source}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          funding_source: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                    >
                      <option value="">اختر مصدر التمويل</option>
                      {fundingSources.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      ملاحظات إضافية
                    </label>
                    <Input
                      value={editForm.funding_notes}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          funding_notes: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="ملاحظات إضافية حول التعديل"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      سبب التعديل * (مطلوب للمراجعة)
                    </label>
                    <Input
                      value={editForm.edit_reason}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          edit_reason: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="أدخل سبب التعديل (مثال: تصحيح خطأ في المبلغ)"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <AlertTriangle className="h-5 w-5 text-amber-600 no-flip flex-shrink-0 mt-0.5" />
                    <div className="text-amber-800 text-sm arabic-spacing leading-relaxed">
                      <p className="font-medium mb-1">تنبيه مهم:</p>
                      <p>
                        سيتم تسجيل هذا التعديل في سجل المراجعة مع اسم المستخدم
                        والوقت وسبب التعديل. تأكد من صحة البيانات قبل الحفظ.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 arabic-spacing">
                    <span className="font-medium">ملاحظة:</span> سيتم تعديل رصيد
                    الخزينة تلقائياً
                  </div>

                  <div className="flex space-x-4 space-x-reverse">
                    <Button
                      variant="outline"
                      onClick={closeEditModal}
                      className="px-6 py-3 text-base"
                    >
                      <span className="arabic-spacing">إلغاء</span>
                    </Button>

                    <Button
                      onClick={handleEditTransaction}
                      disabled={
                        !editForm.amount ||
                        !editForm.edit_reason.trim() ||
                        parseFloat(editForm.amount) <= 0
                      }
                      className="px-6 py-3 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-5 w-5 ml-2 no-flip" />
                      <span className="arabic-spacing">تأكيد التعديل</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionRoute>
  );
}
