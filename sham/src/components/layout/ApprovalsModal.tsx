"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Building2,
  Receipt,
  Clock,
  DollarSign,
  Search,
  Filter,
  User as UserIcon,
  Calendar,
  FileText,
  AlertTriangle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EnhancedInvoice, EnhancedGeneralExpense } from "@/types/shared";
import {
  formatCurrency,
  formatDate,
  formatInvoiceNumber,
  formatProjectId,
} from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { apiRequest } from "@/lib/api";
import { useResponsive } from "@/hooks/useResponsive";
import InvoicePreviewModal from "./InvoicePreviewModal";

interface ApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApprovalsModal({
  isOpen,
  onClose,
}: ApprovalsModalProps) {
  const { user } = useAuth();
  const { deductForInvoice, deductForExpense, hasBalance, refreshSafeState } =
    useSafe();
  const { addToast } = useToast();
  const { isMobile, isTablet } = useResponsive();

  const [pendingInvoices, setPendingInvoices] = useState<EnhancedInvoice[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<
    EnhancedGeneralExpense[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [itemToReject, setItemToReject] = useState<{
    id: string;
    type: "invoice" | "expense";
    title: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    | ((EnhancedInvoice | EnhancedGeneralExpense) & {
        itemType: "invoice" | "expense";
      })
    | null
  >(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] =
    useState<EnhancedInvoice | null>(null);

  // Helper function to get project name by ID
  const getProjectName = (projectId: string): string => {
    try {
      const storedProjects = localStorage.getItem("financial-projects");
      if (storedProjects) {
        const projects = JSON.parse(storedProjects);
        const project = projects.find((p: any) => p.id === projectId);
        if (project) {
          return project.name || `مشروع ${project.code || project.id}`;
        }
      }
    } catch (error) {
      console.warn("Failed to load project details:", error);
    }
    return `مشروع ${projectId}`;
  };

  // Helper function to convert user ID to user-friendly name
  const getUserFriendlyName = (userId: string | undefined): string => {
    if (!userId) return "غير محدد";

    // If it's a UUID, return generic role-based names
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(userId)) {
      // Check if current user is the one who submitted (for better labeling)
      if (user?.id === userId) {
        return user.role === "admin" ? "الإدارة" : "مدخل البيانات";
      }
      // Generic role-based naming for other users
      return "مدخل البيانات";
    }

    // If it's already a friendly name, return as is
    return userId;
  };

  // Load pending items
  useEffect(() => {
    if (isOpen) {
      loadPendingItems();
    }
  }, [isOpen]);

  // Listen for localStorage changes to refresh pending items
  useEffect(() => {
    const handleStorageChange = () => {
      if (isOpen) {
        loadPendingItems();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isOpen]);

  const openItemDetailModal = (
    item: (EnhancedInvoice | EnhancedGeneralExpense) & {
      itemType: "invoice" | "expense";
    }
  ) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
  };

  const closeItemDetailModal = () => {
    setSelectedItem(null);
    setShowItemDetailModal(false);
  };

  const openInvoicePreview = (invoice: EnhancedInvoice) => {
    setSelectedInvoiceForPreview(invoice);
    setShowInvoicePreview(true);
  };

  const closeInvoicePreview = () => {
    setSelectedInvoiceForPreview(null);
    setShowInvoicePreview(false);
  };

  const handlePreviewApprove = async (
    invoice: EnhancedInvoice,
    reason?: string
  ) => {
    await approveInvoice(invoice);
    closeInvoicePreview();
  };

  const handlePreviewReject = async (
    invoice: EnhancedInvoice,
    reason: string
  ) => {
    try {
      const response = await apiRequest(
        `/category-invoices/${invoice.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({
            rejectionReason: reason,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Database invoice rejected successfully");
        setPendingInvoices((prev: any) =>
          prev.filter((inv: any) => inv.id !== invoice.id)
        );

        addToast({
          type: "success",
          title: "تم رفض الفاتورة",
          message: `تم رفض فاتورة ${formatInvoiceNumber(
            invoice.invoiceNumber
          )} مع تسجيل السبب`,
        });

        // Reload pending items to refresh the list
        await loadPendingItems();

        // Trigger notification refresh
        window.dispatchEvent(new CustomEvent("approvalStateChanged"));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject invoice");
      }
    } catch (error: any) {
      console.error("Error rejecting invoice:", error);
      addToast({
        type: "error",
        title: "فشل في رفض الفاتورة",
        message: error.message || "حدث خطأ أثناء رفض الفاتورة",
      });
    }
    closeInvoicePreview();
  };

  const loadPendingItems = async () => {
    console.log("🔄 Loading pending items from database...");

    let allPendingInvoices: EnhancedInvoice[] = [];

    // Load pending category invoices from database (unified invoice storage)
    try {
      console.log("🔍 Calling /category-invoices/pending API...");
      const response = await apiRequest("/category-invoices/pending");

      if (response.ok) {
        const data = await response.json();
        const pendingCategoryInvoices = data.invoices || [];
        console.log(
          `📋 Found ${pendingCategoryInvoices.length} pending database category invoices`
        );

        if (pendingCategoryInvoices.length > 0) {
          // Convert database invoices to EnhancedInvoice format
          const formattedCategoryInvoices: EnhancedInvoice[] =
            pendingCategoryInvoices.map((inv: any) => ({
              id: inv.id,
              projectId: inv.projectId,
              invoiceNumber: inv.invoiceNumber,
              amount: inv.amount,
              date: inv.date,
              notes: inv.notes || "",
              status: inv.status,
              submittedBy: inv.submittedByName || "Unknown",
              createdAt: inv.createdAt,
              updatedAt: inv.updatedAt,
              // Additional fields for display
              projectName: inv.projectName,
              categoryName: inv.categoryName,
              subcategoryName: inv.subcategoryName,
              contractorName: inv.contractorName,
              // Attachment fields for fraud prevention and comparison
              customerInvoiceNumber: inv.customerInvoiceNumber,
              attachmentData: inv.attachmentData,
              attachmentFilename: inv.attachmentFilename,
              attachmentSize: inv.attachmentSize,
              attachmentType: inv.attachmentType,
              // Mark as database invoice
              isDatabaseInvoice: true,
            }));

          allPendingInvoices.push(...formattedCategoryInvoices);
        }
      }
    } catch (error) {
      console.warn("Error loading pending category invoices:", error);
    }

    console.log(`📋 Total pending invoices: ${allPendingInvoices.length}`);
    setPendingInvoices(allPendingInvoices);

    // Load pending global expenses (localStorage)
    const storedExpenses = localStorage.getItem("financial-expenses");
    let localPendingExpenses: EnhancedGeneralExpense[] = [];
    if (storedExpenses) {
      try {
        const expenses: EnhancedGeneralExpense[] = JSON.parse(storedExpenses);
        localPendingExpenses = expenses.filter(
          (exp) => exp.status === "pending_approval"
        );
        console.log(
          `💰 Found ${expenses.length} total global expenses, ${localPendingExpenses.length} pending`
        );
      } catch (error) {
        console.warn("Failed to load pending global expenses:", error);
      }
    } else {
      console.log("💰 No global expenses found in localStorage");
    }

    // Load pending project expenses (database API)
    let projectPendingExpenses: any[] = [];
    try {
      const response = await apiRequest("/general-expenses/pending");
      if (response.ok) {
        const data = await response.json();
        projectPendingExpenses = data.expenses || [];
        console.log(
          `🏗️ Found ${projectPendingExpenses.length} pending project expenses from database`
        );
      }
    } catch (error) {
      console.warn("Failed to load pending project expenses:", error);
    }

    // Combine both types of expenses
    const allPendingExpenses = [
      ...localPendingExpenses,
      ...projectPendingExpenses.map((exp: any) => ({
        id: exp.id,
        description: exp.expense_name,
        category: exp.category,
        amount: exp.cost,
        date: exp.expense_date,
        notes: exp.details || "",
        createdAt: exp.created_at,
        updatedAt: exp.updated_at,
        status: "pending_approval" as const,
        submittedBy: exp.submitted_by_name || "مجهول",
        isProjectExpense: true, // Flag to distinguish project expenses
        projectId: exp.project_id,
      })),
    ];

    setPendingExpenses(allPendingExpenses);
    console.log(
      `💰 Total pending expenses: ${allPendingExpenses.length} (${localPendingExpenses.length} global + ${projectPendingExpenses.length} project)`
    );
  };

  const approveInvoice = async (invoice: EnhancedInvoice) => {
    // Check if user has admin permissions
    if (!user || user.role !== "admin") {
      addToast({
        type: "error",
        title: "صلاحية غير كافية",
        message: "فقط المدير يمكنه اعتماد الفواتير",
      });
      return;
    }

    if (!hasBalance(invoice.amount)) {
      addToast({
        type: "error",
        title: "رصيد الخزينة غير كافي",
        message: `المبلغ المطلوب ${formatCurrency(
          invoice.amount
        )} أكبر من الرصيد المتاح`,
      });
      return;
    }

    try {
      console.log(
        "💰 Attempting to approve invoice:",
        invoice.id,
        "Status:",
        invoice.status
      );

      // Check if this invoice exists in the database by trying to approve it
      // If the API call succeeds, it's a database invoice
      // If it fails with 404, it's a frontend-only invoice
      let isDatabaseInvoice = false;

      try {
        // Call backend API to approve the invoice and lock the assignment
        const response = await apiRequest(
          `/category-invoices/${invoice.id}/approve`,
          {
            method: "POST",
          }
        );

        if (response.ok) {
          isDatabaseInvoice = true;
          console.log("✅ Database invoice approved successfully");
        } else {
          const errorData = await response.json();
          if (response.status === 404) {
            isDatabaseInvoice = false;
            console.log(
              "📄 Invoice not found in database - treating as frontend-only invoice"
            );
          } else {
            console.error("Backend approval failed:", errorData);
            throw new Error(
              errorData.error || "Failed to approve invoice in database"
            );
          }
        }
      } catch (error: any) {
        if (error.message && error.message.includes("not found")) {
          isDatabaseInvoice = false;
          console.log(
            "📄 Invoice not found in database - treating as frontend-only invoice"
          );
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Only deduct from safe for frontend-only invoices
      // Database invoices already handle deduction in the backend
      if (!isDatabaseInvoice) {
        const success = await deductForInvoice(
          invoice.amount,
          invoice.projectId,
          getProjectName(invoice.projectId),
          invoice.invoiceNumber,
          invoice.id
        );

        if (!success) {
          throw new Error("Failed to deduct from safe");
        }
      }

      // Update invoice status
      updateInvoiceStatus(invoice.id, "paid");

      addToast({
        type: "success",
        title: "تم اعتماد الفاتورة",
        message: `تم اعتماد فاتورة ${formatInvoiceNumber(
          invoice.invoiceNumber
        )} ودفع ${formatCurrency(invoice.amount)}`,
      });

      // Reload pending items to reflect the change
      await loadPendingItems();

      // Trigger notification refresh
      window.dispatchEvent(new CustomEvent("approvalStateChanged"));

      // Trigger a page refresh to update assignment protection status
      // This ensures the project detail page shows updated has_approved_invoice flags
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Error approving invoice:", error);
      addToast({
        type: "error",
        title: "فشل في اعتماد الفاتورة",
        message: error.message || "حدث خطأ أثناء اعتماد الفاتورة",
      });
    }
  };

  const approveExpense = async (
    expense: EnhancedGeneralExpense & {
      isProjectExpense?: boolean;
      projectId?: string;
    }
  ) => {
    // Check if user has admin permissions
    if (!user || user.role !== "admin") {
      addToast({
        type: "error",
        title: "صلاحية غير كافية",
        message: "فقط المدير يمكنه اعتماد المصروفات",
      });
      return;
    }

    try {
      if (expense.isProjectExpense) {
        // Handle project expenses via API
        const response = await apiRequest(
          `/general-expenses/${expense.id}/approve`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.userMessage || "Failed to approve project expense"
          );
        }

        // Remove from pending list
        setPendingExpenses((prev: any) =>
          prev.filter((exp: any) => exp.id !== expense.id)
        );

        // Refresh safe state to reflect the transaction
        await refreshSafeState();

        addToast({
          type: "success",
          title: "تم اعتماد مصروف المشروع",
          message: `تم اعتماد مصروف "${
            expense.description
          }" ودفع ${formatCurrency(expense.amount)} من الخزينة`,
        });

        // Reload pending items to reflect the change
        await loadPendingItems();

        // Trigger notification refresh
        window.dispatchEvent(new CustomEvent("approvalStateChanged"));

        // Trigger a page refresh to update project expense status and budget calculations
        // This ensures the project detail page shows updated expense status and spending
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Handle global expenses via localStorage (existing logic)
        if (!hasBalance(expense.amount)) {
          addToast({
            type: "error",
            title: "رصيد الخزينة غير كافي",
            message: `المبلغ المطلوب ${formatCurrency(
              expense.amount
            )} أكبر من الرصيد المتاح`,
          });
          return;
        }

        const success = deductForExpense(
          expense.amount,
          expense.description,
          expense.category
        );

        if (success) {
          updateExpenseStatus(expense.id, "paid");
          addToast({
            type: "success",
            title: "تم اعتماد المصروف العام",
            message: `تم اعتماد مصروف ${
              expense.description
            } ودفع ${formatCurrency(expense.amount)}`,
          });

          // Reload pending items to reflect the change
          await loadPendingItems();

          // Trigger notification refresh
          window.dispatchEvent(new CustomEvent("approvalStateChanged"));
        }
      }
    } catch (error: any) {
      console.error("Error approving expense:", error);
      addToast({
        type: "error",
        title: "خطأ في اعتماد المصروف",
        message: error.message || "حدث خطأ أثناء اعتماد المصروف",
      });
    }
  };

  const updateInvoiceStatus = (
    invoiceId: string,
    status: "paid" | "rejected"
  ) => {
    const storedInvoices = localStorage.getItem("financial-invoices");
    if (storedInvoices) {
      const invoices: EnhancedInvoice[] = JSON.parse(storedInvoices);
      const updatedInvoices = invoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: status,
              approvedBy: user?.fullName || "المدير",
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : inv
      );
      localStorage.setItem(
        "financial-invoices",
        JSON.stringify(updatedInvoices)
      );
      setPendingInvoices((prev: any) =>
        prev.filter((inv: any) => inv.id !== invoiceId)
      );

      // Trigger a storage event to update notification count in MainLayout
      window.dispatchEvent(new Event("storage"));
    }
  };

  const updateExpenseStatus = (
    expenseId: string,
    status: "paid" | "rejected"
  ) => {
    const storedExpenses = localStorage.getItem("financial-expenses");
    if (storedExpenses) {
      const expenses: EnhancedGeneralExpense[] = JSON.parse(storedExpenses);
      const updatedExpenses = expenses.map((exp) =>
        exp.id === expenseId
          ? {
              ...exp,
              status: status,
              approvedBy: user?.fullName || "المدير",
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : exp
      );
      localStorage.setItem(
        "financial-expenses",
        JSON.stringify(updatedExpenses)
      );
      setPendingExpenses((prev: any) =>
        prev.filter((exp: any) => exp.id !== expenseId)
      );

      // Trigger a storage event to update notification count in MainLayout
      window.dispatchEvent(new Event("storage"));
    }
  };

  const openRejectModal = (
    id: string,
    type: "invoice" | "expense",
    title: string
  ) => {
    setItemToReject({ id, type, title });
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!itemToReject) return;

    const reason =
      rejectionReason.trim() || "تم الرفض من المدير - يرجى مراجعة البيانات";

    try {
      if (itemToReject.type === "invoice") {
        // All invoices are now in database - reject via backend API
        console.log(
          "🔍 Attempting to reject database invoice:",
          itemToReject.id,
          "with reason:",
          reason
        );

        const response = await apiRequest(
          `/category-invoices/${itemToReject.id}/reject`,
          {
            method: "POST",
            body: JSON.stringify({
              rejectionReason: reason,
            }),
          }
        );

        if (response.ok) {
          console.log("✅ Database invoice rejected successfully");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to reject invoice");
        }

        // Remove from pending invoices list
        console.log("🔍 Removing invoice from pending list:", itemToReject.id);
        setPendingInvoices((prev: any) => {
          const filtered = prev.filter(
            (inv: any) => inv.id !== itemToReject.id
          );
          console.log("🔍 Pending invoices after removal:", filtered.length);
          return filtered;
        });
      } else {
        // Handle expense rejection (existing logic)
        const storedExpenses = localStorage.getItem("financial-expenses");
        if (storedExpenses) {
          const expenses: EnhancedGeneralExpense[] = JSON.parse(storedExpenses);
          const updatedExpenses = expenses.map((exp) =>
            exp.id === itemToReject.id
              ? {
                  ...exp,
                  status: "rejected" as const,
                  rejectionReason: reason,
                  approvedBy: user?.fullName || "المدير",
                  approvedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : exp
          );
          localStorage.setItem(
            "financial-expenses",
            JSON.stringify(updatedExpenses)
          );
          setPendingExpenses((prev: any) =>
            prev.filter((exp: any) => exp.id !== itemToReject.id)
          );
        }
      }

      // Trigger storage event for notification update
      window.dispatchEvent(new Event("storage"));

      addToast({
        type: "success",
        title: "تم رفض العنصر",
        message: `تم رفض ${itemToReject.title} مع تسجيل السبب`,
      });

      // Reload pending items to refresh the list
      await loadPendingItems();

      // Trigger notification refresh
      window.dispatchEvent(new CustomEvent("approvalStateChanged"));
    } catch (error: any) {
      console.error("Error rejecting item:", error);
      addToast({
        type: "error",
        title: "فشل في رفض العنصر",
        message: error.message || "حدث خطأ أثناء رفض العنصر",
      });
    }

    setShowRejectModal(false);
    setItemToReject(null);
    setRejectionReason("");
  };

  // Filter and combine items
  const allItems = [
    ...pendingInvoices.map((inv: any) => ({
      ...inv,
      itemType: "invoice" as const,
    })),
    ...pendingExpenses.map((exp: any) => ({
      ...exp,
      itemType: "expense" as const,
    })),
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      (item.itemType === "invoice" &&
        (formatInvoiceNumber(item.invoiceNumber)
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
          item.notes?.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (item.itemType === "expense" &&
        (item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "invoices" && item.itemType === "invoice") ||
      (typeFilter === "expenses" && item.itemType === "expense");

    return matchesSearch && matchesType;
  });

  const totalAmount = filteredItems.reduce((sum, item) => sum + item.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-xl w-full overflow-hidden shadow-2xl ${
          isMobile ? "max-w-full max-h-[95vh] mx-2" : "max-w-4xl max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r from-amber-500 to-orange-500 text-white ${
            isMobile ? "p-4" : "p-6"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock
                  className={`${isMobile ? "h-5 w-5" : "h-6 w-6"} no-flip`}
                />
              </div>
              <div>
                <h2
                  className={`${
                    isMobile ? "text-lg" : "text-2xl"
                  } font-bold arabic-spacing`}
                >
                  اعتماد المعاملات المالية
                </h2>
                <p
                  className={`text-amber-100 arabic-spacing ${
                    isMobile ? "text-sm" : "text-base"
                  }`}
                >
                  {filteredItems.length} عنصر • {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPendingItems}
                className={`${
                  isMobile ? "h-8 w-8" : "h-10 w-10"
                } p-0 text-white hover:bg-white/20`}
                title="تحديث القائمة"
              >
                <RefreshCw
                  className={`${isMobile ? "h-4 w-4" : "h-5 w-5"} no-flip`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`${
                  isMobile ? "h-8 w-8" : "h-10 w-10"
                } p-0 text-white hover:bg-white/20`}
              >
                <X className={`${isMobile ? "h-4 w-4" : "h-5 w-5"}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className={`border-b border-gray-200 bg-gray-50 ${
            isMobile ? "p-3" : "p-4"
          }`}
        >
          <div
            className={`flex gap-4 ${
              isMobile ? "flex-col" : "flex-col sm:flex-row"
            }`}
          >
            <div className="flex-1">
              <div className="relative">
                <Search
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 no-flip ${
                    isMobile ? "h-4 w-4" : "h-4 w-4"
                  }`}
                />
                <Input
                  placeholder="البحث في الفواتير والمصروفات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pr-10 arabic-spacing ${
                    isMobile ? "text-sm h-10" : ""
                  }`}
                />
              </div>
            </div>
            <div
              className={`flex items-center ${
                isMobile
                  ? "justify-center space-x-2 space-x-reverse"
                  : "space-x-4 space-x-reverse"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <Filter
                  className={`text-gray-500 no-flip ${
                    isMobile ? "h-4 w-4" : "h-4 w-4"
                  }`}
                />
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={isMobile ? "text-sm" : ""}
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="invoices">الفواتير فقط</option>
                  <option value="expenses">المصروفات فقط</option>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className={`overflow-y-auto ${
            isMobile ? "p-3 max-h-[65vh]" : "p-6 max-h-[60vh]"
          }`}
        >
          {filteredItems.length === 0 ? (
            <div className={`text-center ${isMobile ? "py-8" : "py-12"}`}>
              <div
                className={`bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isMobile ? "w-12 h-12" : "w-16 h-16"
                }`}
              >
                <CheckCircle
                  className={`text-green-600 no-flip ${
                    isMobile ? "h-6 w-6" : "h-8 w-8"
                  }`}
                />
              </div>
              <h3
                className={`font-medium text-gray-900 mb-2 arabic-spacing ${
                  isMobile ? "text-base" : "text-lg"
                }`}
              >
                ممتاز! لا توجد عناصر معلقة
              </h3>
              <p
                className={`text-gray-500 arabic-spacing ${
                  isMobile ? "text-sm" : "text-base"
                }`}
              >
                جميع المعاملات تم اعتمادها أو معالجتها
              </p>
            </div>
          ) : (
            <div className={isMobile ? "space-y-3" : "space-y-4"}>
              {filteredItems.map((item) => (
                <Card
                  key={`${item.itemType}-${item.id}`}
                  className={`border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-shadow relative ${
                    isMobile ? "" : ""
                  }`}
                >
                  <CardContent className={isMobile ? "p-3" : "p-4"}>
                    <div
                      className={`flex items-center justify-between ${
                        isMobile ? "flex-col space-y-3" : ""
                      }`}
                    >
                      <div className="flex-1 w-full">
                        <div
                          className={`flex items-center mb-2 ${
                            isMobile
                              ? "space-x-2 space-x-reverse"
                              : "space-x-3 space-x-reverse"
                          }`}
                        >
                          <div
                            className={`rounded-full ${
                              item.itemType === "invoice"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-orange-100 text-orange-600"
                            } ${isMobile ? "p-1.5" : "p-2"}`}
                          >
                            {item.itemType === "invoice" ? (
                              <Building2
                                className={`no-flip ${
                                  isMobile ? "h-3 w-3" : "h-4 w-4"
                                }`}
                              />
                            ) : (
                              <Receipt
                                className={`no-flip ${
                                  isMobile ? "h-3 w-3" : "h-4 w-4"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1">
                            {/* Clean Header */}
                            <div
                              className={`flex items-center justify-between ${
                                isMobile ? "mb-2" : "mb-3"
                              }`}
                            >
                              <div className="flex items-center space-x-2 space-x-reverse flex-1">
                                <h4
                                  className={`font-semibold text-gray-900 arabic-spacing ${
                                    isMobile ? "text-sm" : "text-base"
                                  } truncate`}
                                >
                                  {item.itemType === "invoice"
                                    ? formatInvoiceNumber(
                                        (item as EnhancedInvoice).invoiceNumber
                                      )
                                    : (item as EnhancedGeneralExpense)
                                        .description}
                                </h4>
                                {/* Attachment Indicator */}
                                {item.itemType === "invoice" &&
                                  ((item as any).customerInvoiceNumber ||
                                    (item as any).attachmentData) && (
                                    <div
                                      className={`flex items-center bg-orange-100 text-orange-700 rounded-full ${
                                        isMobile
                                          ? "text-xs px-1.5 py-0.5"
                                          : "text-xs px-2 py-1"
                                      }`}
                                    >
                                      <FileText
                                        className={`ml-1 ${
                                          isMobile ? "h-2.5 w-2.5" : "h-3 w-3"
                                        }`}
                                      />
                                    </div>
                                  )}
                              </div>
                              <span
                                className={`font-bold text-green-600 arabic-spacing ${
                                  isMobile ? "text-base ml-2" : "text-lg"
                                }`}
                              >
                                {formatCurrency(item.amount)}
                              </span>
                            </div>

                            {/* Essential Info - Single Clean Line */}
                            <div
                              className={`flex items-center justify-between text-gray-600 mb-2 ${
                                isMobile
                                  ? "text-xs flex-col items-start space-y-1"
                                  : "text-sm"
                              }`}
                            >
                              <div
                                className={`flex items-center ${
                                  isMobile
                                    ? "space-x-2 space-x-reverse"
                                    : "space-x-4 space-x-reverse"
                                }`}
                              >
                                {item.itemType === "invoice" ? (
                                  <>
                                    <span
                                      className={`arabic-spacing ${
                                        isMobile ? "truncate max-w-[200px]" : ""
                                      }`}
                                    >
                                      {(item as any).projectName ||
                                        getProjectName(
                                          (item as EnhancedInvoice).projectId
                                        )}
                                    </span>
                                    {(item as any).contractorName && (
                                      <span
                                        className={`text-orange-700 arabic-spacing ${
                                          isMobile ? "hidden" : ""
                                        }`}
                                      >
                                        • {(item as any).contractorName}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="arabic-spacing">
                                    {(item as EnhancedGeneralExpense).category}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-gray-500 arabic-spacing ${
                                  isMobile ? "text-xs" : "text-xs"
                                }`}
                              >
                                {formatDate(item.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex items-center ${
                          isMobile
                            ? "w-full space-x-1 space-x-reverse"
                            : "space-x-2 space-x-reverse"
                        }`}
                      >
                        {/* Preview Button for Invoices - Primary Action */}
                        {item.itemType === "invoice" && (
                          <Button
                            size={isMobile ? "sm" : "sm"}
                            onClick={() =>
                              openInvoicePreview(item as EnhancedInvoice)
                            }
                            className={`bg-blue-600 hover:bg-blue-700 text-white ${
                              isMobile ? "flex-1 text-xs h-8" : ""
                            }`}
                            title="معاينة شاملة للفاتورة مع إمكانية الاعتماد"
                          >
                            <Eye
                              className={`no-flip ${
                                isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                              }`}
                            />
                            <span className="arabic-spacing">
                              {isMobile ? "معاينة" : "معاينة واعتماد"}
                            </span>
                          </Button>
                        )}

                        {/* Quick Actions for Expenses */}
                        {item.itemType === "expense" && (
                          <>
                            <Button
                              size={isMobile ? "sm" : "sm"}
                              onClick={() =>
                                approveExpense(item as EnhancedGeneralExpense)
                              }
                              disabled={!hasBalance(item.amount)}
                              className={`bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 ${
                                isMobile ? "flex-1 text-xs h-8" : ""
                              }`}
                            >
                              <CheckCircle
                                className={`no-flip ${
                                  isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                                }`}
                              />
                              <span className="arabic-spacing">اعتماد</span>
                            </Button>
                            <Button
                              size={isMobile ? "sm" : "sm"}
                              variant="outline"
                              onClick={() =>
                                openRejectModal(
                                  item.id,
                                  item.itemType,
                                  (item as EnhancedGeneralExpense).description
                                )
                              }
                              className={`border-red-300 text-red-600 hover:bg-red-50 ${
                                isMobile ? "flex-1 text-xs h-8" : ""
                              }`}
                            >
                              <XCircle
                                className={`no-flip ${
                                  isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                                }`}
                              />
                              <span className="arabic-spacing">رفض</span>
                            </Button>
                          </>
                        )}

                        {/* Quick Reject for Invoices */}
                        {item.itemType === "invoice" && (
                          <Button
                            size={isMobile ? "sm" : "sm"}
                            variant="outline"
                            onClick={() =>
                              openRejectModal(
                                item.id,
                                item.itemType,
                                `فاتورة ${formatInvoiceNumber(
                                  (item as EnhancedInvoice).invoiceNumber
                                )}`
                              )
                            }
                            className={`border-red-300 text-red-600 hover:bg-red-50 ${
                              isMobile ? "flex-1 text-xs h-8" : ""
                            }`}
                            title="رفض سريع بدون معاينة"
                          >
                            <XCircle
                              className={`no-flip ${
                                isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                              }`}
                            />
                            <span className="arabic-spacing">رفض</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredItems.length > 0 && (
          <div
            className={`border-t border-gray-200 bg-gray-50 ${
              isMobile ? "p-3" : "p-4"
            }`}
          >
            <div
              className={`flex items-center justify-between ${
                isMobile ? "flex-col space-y-3" : ""
              }`}
            >
              <div
                className={`text-gray-600 arabic-spacing ${
                  isMobile ? "text-xs text-center" : "text-sm"
                }`}
              >
                الإجمالي المحدد: {formatCurrency(totalAmount)} •{" "}
                {filteredItems.length} عنصر
              </div>
              <div
                className={`flex ${
                  isMobile
                    ? "w-full space-x-2 space-x-reverse"
                    : "space-x-2 space-x-reverse"
                }`}
              >
                <Button
                  variant="outline"
                  onClick={onClose}
                  className={isMobile ? "flex-1 text-sm h-9" : ""}
                >
                  <span className="arabic-spacing">إغلاق</span>
                </Button>
                <Button
                  onClick={() => {
                    // Bulk approve functionality could be added here
                    addToast({
                      type: "info",
                      title: "ميزة قادمة",
                      message: "الاعتماد المجمع سيتوفر قريباً",
                    });
                  }}
                  disabled={
                    !filteredItems.every((item) => hasBalance(item.amount))
                  }
                  className={`bg-green-600 hover:bg-green-700 text-white ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  <span className="arabic-spacing">
                    {isMobile ? "اعتماد الكل" : "اعتماد الكل"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Confirmation Modal */}
      {showRejectModal && itemToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div
            className={`bg-white rounded-xl w-full shadow-2xl ${
              isMobile ? "max-w-full mx-2" : "max-w-md"
            }`}
          >
            <div className={isMobile ? "p-4" : "p-6"}>
              <div
                className={`flex items-center space-x-3 space-x-reverse ${
                  isMobile ? "mb-3" : "mb-4"
                }`}
              >
                <div
                  className={`bg-red-100 rounded-full ${
                    isMobile ? "p-1.5" : "p-2"
                  }`}
                >
                  <AlertTriangle
                    className={`text-red-600 no-flip ${
                      isMobile ? "h-4 w-4" : "h-5 w-5"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`font-bold text-gray-900 arabic-spacing ${
                      isMobile ? "text-base" : "text-lg"
                    }`}
                  >
                    تأكيد رفض العنصر
                  </h3>
                  <p
                    className={`text-gray-600 arabic-spacing ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    هل أنت متأكد من رفض {itemToReject?.title}؟
                  </p>
                </div>
              </div>

              <div className={isMobile ? "mb-3" : "mb-4"}>
                <label
                  className={`block font-semibold text-gray-700 mb-2 arabic-spacing ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                >
                  سبب الرفض (اختياري)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب رفض هذا العنصر ليتم إبلاغ موظف الإدخال..."
                  className={`w-full border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 arabic-spacing ${
                    isMobile ? "p-2 text-sm" : "p-3"
                  }`}
                  rows={isMobile ? 2 : 3}
                />
              </div>

              <div
                className={`bg-red-50 rounded-lg ${
                  isMobile ? "p-2 mb-3" : "p-3 mb-4"
                }`}
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <AlertTriangle
                    className={`text-red-600 no-flip ${
                      isMobile ? "h-3 w-3" : "h-4 w-4"
                    }`}
                  />
                  <p
                    className={`text-red-700 arabic-spacing ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    <strong>تحذير:</strong> لا يمكن التراجع عن هذا الإجراء بعد
                    التأكيد
                  </p>
                </div>
              </div>

              <div
                className={`flex space-x-3 space-x-reverse ${
                  isMobile ? "w-full" : "justify-end"
                }`}
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setItemToReject(null);
                    setRejectionReason("");
                  }}
                  className={isMobile ? "flex-1 text-sm h-9" : ""}
                >
                  <span className="arabic-spacing">إلغاء</span>
                </Button>
                <Button
                  onClick={confirmReject}
                  className={`bg-red-600 hover:bg-red-700 text-white ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  <XCircle
                    className={`no-flip ${
                      isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                    }`}
                  />
                  <span className="arabic-spacing">تأكيد الرفض</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Item Detail Modal */}
      {showItemDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div
            className={`bg-white rounded-xl w-full overflow-hidden shadow-2xl ${
              isMobile
                ? "max-w-full max-h-[95vh] mx-2"
                : "max-w-3xl max-h-[90vh]"
            }`}
          >
            {/* Header */}
            <div
              className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white ${
                isMobile ? "p-4" : "p-6"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div
                    className={`bg-white/20 rounded-lg ${
                      isMobile ? "p-1.5" : "p-2"
                    }`}
                  >
                    {selectedItem?.itemType === "invoice" ? (
                      <Building2
                        className={`no-flip ${
                          isMobile ? "h-5 w-5" : "h-6 w-6"
                        }`}
                      />
                    ) : (
                      <Receipt
                        className={`no-flip ${
                          isMobile ? "h-5 w-5" : "h-6 w-6"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2
                      className={`font-bold arabic-spacing ${
                        isMobile ? "text-base" : "text-2xl"
                      }`}
                    >
                      {selectedItem?.itemType === "invoice"
                        ? `تفاصيل الفاتورة: ${formatInvoiceNumber(
                            (selectedItem as EnhancedInvoice).invoiceNumber
                          )}`
                        : `تفاصيل المصروف: ${
                            (selectedItem as EnhancedGeneralExpense).description
                          }`}
                    </h2>
                    <p
                      className={`text-blue-100 arabic-spacing ${
                        isMobile ? "text-xs" : "text-base"
                      }`}
                    >
                      مُدخل بواسطة:{" "}
                      {getUserFriendlyName(selectedItem?.submittedBy)} •{" "}
                      {formatDate(selectedItem?.date)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeItemDetailModal}
                  className={`p-0 text-white hover:bg-white/20 ${
                    isMobile ? "h-8 w-8" : "h-10 w-10"
                  }`}
                >
                  <X className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div
              className={`overflow-y-auto ${
                isMobile ? "p-4 max-h-[65vh]" : "p-6 max-h-[60vh]"
              }`}
            >
              {selectedItem?.itemType === "invoice" ? (
                // Invoice Details
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-blue-800 mb-3 arabic-spacing">
                      معلومات الفاتورة
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          رقم الفاتورة:
                        </span>
                        <span className="font-bold mr-2 text-blue-800 arabic-spacing">
                          {formatInvoiceNumber(
                            (selectedItem as EnhancedInvoice).invoiceNumber
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          المبلغ الإجمالي:
                        </span>
                        <span className="font-bold mr-2 text-green-600 arabic-nums">
                          {formatCurrency(selectedItem?.amount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          اسم المشروع:
                        </span>
                        <span className="font-bold mr-2 arabic-spacing">
                          {getProjectName(
                            (selectedItem as EnhancedInvoice).projectId
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          تاريخ الإنشاء:
                        </span>
                        <span className="font-bold mr-2 arabic-spacing">
                          {formatDate(selectedItem?.date)}
                        </span>
                      </div>
                      {(selectedItem as EnhancedInvoice).dueDate && (
                        <div>
                          <span className="text-gray-600 arabic-spacing">
                            تاريخ الاستحقاق:
                          </span>
                          <span className="font-bold mr-2 arabic-spacing">
                            {formatDate(
                              (selectedItem as EnhancedInvoice).dueDate!
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {((selectedItem as EnhancedInvoice).taxPercentage ||
                    (selectedItem as EnhancedInvoice).discountAmount) && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-bold text-yellow-800 mb-3 arabic-spacing">
                        التفاصيل المالية
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(selectedItem as EnhancedInvoice).taxPercentage && (
                          <div>
                            <span className="text-gray-600 arabic-spacing">
                              نسبة الضريبة:
                            </span>
                            <span className="font-bold mr-2 text-yellow-800 arabic-nums">
                              {(selectedItem as EnhancedInvoice).taxPercentage}%
                            </span>
                          </div>
                        )}
                        {(selectedItem as EnhancedInvoice).discountAmount && (
                          <div>
                            <span className="text-gray-600 arabic-spacing">
                              قيمة الخصم:
                            </span>
                            <span className="font-bold mr-2 text-yellow-800 arabic-nums">
                              {formatCurrency(
                                (selectedItem as EnhancedInvoice)
                                  .discountAmount!
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedItem as EnhancedInvoice).paymentTerms && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-bold text-green-800 mb-2 arabic-spacing">
                        شروط الدفع
                      </h3>
                      <p className="text-sm text-green-700 arabic-spacing">
                        {(selectedItem as EnhancedInvoice).paymentTerms}
                      </p>
                    </div>
                  )}

                  {(selectedItem as EnhancedInvoice).notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-800 mb-2 arabic-spacing">
                        ملاحظات
                      </h3>
                      <p className="text-sm text-gray-700 arabic-spacing">
                        {(selectedItem as EnhancedInvoice).notes}
                      </p>
                    </div>
                  )}

                  {(selectedItem as EnhancedInvoice).customFields &&
                    (selectedItem as EnhancedInvoice).customFields!.length >
                      0 && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-bold text-purple-800 mb-3 arabic-spacing">
                          حقول إضافية
                        </h3>
                        <div className="space-y-2">
                          {(selectedItem as EnhancedInvoice).customFields!.map(
                            (field, index) => (
                              <div
                                key={index}
                                className="bg-white p-3 rounded border border-purple-200"
                              >
                                <div className="text-sm">
                                  <span className="text-gray-600 arabic-spacing">
                                    {field.label}:
                                  </span>
                                  <span className="font-medium mr-2 text-purple-800 arabic-spacing">
                                    {field.value}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                // Expense Details
                <div className="space-y-6">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-bold text-orange-800 mb-3 arabic-spacing">
                      معلومات المصروف
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          الوصف:
                        </span>
                        <span className="font-bold mr-2 text-orange-800 arabic-spacing">
                          {(selectedItem as EnhancedGeneralExpense).description}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          المبلغ:
                        </span>
                        <span className="font-bold mr-2 text-green-600 arabic-nums">
                          {formatCurrency(selectedItem?.amount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          الفئة:
                        </span>
                        <span className="font-bold mr-2 text-orange-800 arabic-spacing">
                          {(selectedItem as EnhancedGeneralExpense).category}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          تاريخ الإنشاء:
                        </span>
                        <span className="font-bold mr-2 arabic-spacing">
                          {formatDate(selectedItem?.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(selectedItem as EnhancedGeneralExpense).notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-800 mb-2 arabic-spacing">
                        ملاحظات إضافية
                      </h3>
                      <p className="text-sm text-gray-700 arabic-spacing">
                        {(selectedItem as EnhancedGeneralExpense).notes}
                      </p>
                    </div>
                  )}

                  {(selectedItem as EnhancedGeneralExpense).receiptImage && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-bold text-green-800 mb-2 arabic-spacing">
                        إيصال مرفق
                      </h3>
                      <p className="text-sm text-green-700 arabic-spacing">
                        ✓ تم إرفاق إيصال لهذا المصروف
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`border-t border-gray-200 bg-gray-50 ${
                isMobile ? "p-4" : "p-6"
              }`}
            >
              <div
                className={`flex items-center justify-between ${
                  isMobile ? "flex-col space-y-3" : ""
                }`}
              >
                <div
                  className={`text-gray-600 arabic-spacing ${
                    isMobile ? "text-xs text-center" : "text-sm"
                  }`}
                >
                  الحالة:{" "}
                  <span className="font-medium text-yellow-600">
                    بانتظار الاعتماد
                  </span>
                </div>
                <div
                  className={`flex space-x-3 space-x-reverse ${
                    isMobile ? "w-full" : ""
                  }`}
                >
                  <Button
                    variant="outline"
                    onClick={closeItemDetailModal}
                    className={isMobile ? "flex-1 text-sm h-9" : ""}
                  >
                    <span className="arabic-spacing">إغلاق</span>
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedItem?.itemType === "invoice") {
                        approveInvoice(selectedItem as EnhancedInvoice);
                      } else {
                        approveExpense(selectedItem as EnhancedGeneralExpense);
                      }
                      closeItemDetailModal();
                    }}
                    disabled={!hasBalance(selectedItem?.amount || 0)}
                    className={`bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 ${
                      isMobile ? "flex-1 text-sm h-9" : ""
                    }`}
                  >
                    <CheckCircle
                      className={`no-flip ${
                        isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                      }`}
                    />
                    <span className="arabic-spacing">
                      {isMobile ? "اعتماد" : "اعتماد ودفع"}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      closeItemDetailModal();
                      openRejectModal(
                        selectedItem?.id || "",
                        selectedItem?.itemType || "invoice",
                        selectedItem?.itemType === "invoice"
                          ? `فاتورة ${formatInvoiceNumber(
                              (selectedItem as EnhancedInvoice).invoiceNumber
                            )}`
                          : (selectedItem as EnhancedGeneralExpense).description
                      );
                    }}
                    className={`border-red-300 text-red-600 hover:bg-red-50 ${
                      isMobile ? "flex-1 text-sm h-9" : ""
                    }`}
                  >
                    <XCircle
                      className={`no-flip ${
                        isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                      }`}
                    />
                    <span className="arabic-spacing">رفض</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Invoice Preview Modal */}
      {showInvoicePreview && selectedInvoiceForPreview && (
        <InvoicePreviewModal
          invoice={selectedInvoiceForPreview!}
          onClose={closeInvoicePreview}
          onApprove={handlePreviewApprove}
          onReject={handlePreviewReject}
        />
      )}
    </div>
  );
}
