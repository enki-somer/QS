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
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";

interface ApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApprovalsModal({
  isOpen,
  onClose,
}: ApprovalsModalProps) {
  const { user } = useAuth();
  const { deductForInvoice, deductForExpense, hasBalance } = useSafe();
  const { addToast } = useToast();

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

  const loadPendingItems = () => {
    console.log("🔄 Loading pending items from localStorage...");

    // Load pending invoices
    const storedInvoices = localStorage.getItem("financial-invoices");
    if (storedInvoices) {
      try {
        const invoices: EnhancedInvoice[] = JSON.parse(storedInvoices);
        const pendingInvs = invoices.filter(
          (inv) => inv.status === "pending_approval"
        );
        console.log(
          `📋 Found ${invoices.length} total invoices, ${pendingInvs.length} pending`
        );
        setPendingInvoices(pendingInvs);
      } catch (error) {
        console.warn("Failed to load pending invoices:", error);
      }
    } else {
      console.log("📋 No invoices found in localStorage");
      setPendingInvoices([]);
    }

    // Load pending expenses
    const storedExpenses = localStorage.getItem("financial-expenses");
    if (storedExpenses) {
      try {
        const expenses: EnhancedGeneralExpense[] = JSON.parse(storedExpenses);
        const pendingExps = expenses.filter(
          (exp) => exp.status === "pending_approval"
        );
        console.log(
          `💰 Found ${expenses.length} total expenses, ${pendingExps.length} pending`
        );
        setPendingExpenses(pendingExps);
      } catch (error) {
        console.warn("Failed to load pending expenses:", error);
      }
    } else {
      console.log("💰 No expenses found in localStorage");
      setPendingExpenses([]);
    }
  };

  const approveInvoice = async (invoice: EnhancedInvoice) => {
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

    const success = deductForInvoice(
      invoice.amount,
      invoice.projectId,
      getProjectName(invoice.projectId),
      invoice.invoiceNumber
    );

    if (success) {
      updateInvoiceStatus(invoice.id, "paid");
      addToast({
        type: "success",
        title: "تم اعتماد الفاتورة",
        message: `تم اعتماد فاتورة ${
          invoice.invoiceNumber
        } ودفع ${formatCurrency(invoice.amount)}`,
      });
    }
  };

  const approveExpense = async (expense: EnhancedGeneralExpense) => {
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
        title: "تم اعتماد المصروف",
        message: `تم اعتماد مصروف ${expense.description} ودفع ${formatCurrency(
          expense.amount
        )}`,
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
      setPendingInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));

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
      setPendingExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));

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

  const confirmReject = () => {
    if (!itemToReject) return;

    const reason =
      rejectionReason.trim() || "تم الرفض من المدير - يرجى مراجعة البيانات";

    if (itemToReject.type === "invoice") {
      // Update with rejection reason
      const storedInvoices = localStorage.getItem("financial-invoices");
      if (storedInvoices) {
        const invoices: EnhancedInvoice[] = JSON.parse(storedInvoices);
        const updatedInvoices = invoices.map((inv) =>
          inv.id === itemToReject.id
            ? {
                ...inv,
                status: "rejected" as const,
                rejectionReason: reason,
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
        setPendingInvoices((prev) =>
          prev.filter((inv) => inv.id !== itemToReject.id)
        );
      }
    } else {
      // Update expense with rejection reason
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
        setPendingExpenses((prev) =>
          prev.filter((exp) => exp.id !== itemToReject.id)
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

    setShowRejectModal(false);
    setItemToReject(null);
    setRejectionReason("");
  };

  // Filter and combine items
  const allItems = [
    ...pendingInvoices.map((inv) => ({ ...inv, itemType: "invoice" as const })),
    ...pendingExpenses.map((exp) => ({ ...exp, itemType: "expense" as const })),
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      (item.itemType === "invoice" &&
        (item.invoiceNumber
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
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-2xl font-bold arabic-spacing">
                  اعتماد المعاملات المالية
                </h2>
                <p className="text-amber-100 arabic-spacing">
                  {filteredItems.length} عنصر بانتظار موافقتك • الإجمالي:{" "}
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPendingItems}
                className="h-10 w-10 p-0 text-white hover:bg-white/20"
                title="تحديث القائمة"
              >
                <RefreshCw className="h-5 w-5 no-flip" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 no-flip" />
                <Input
                  placeholder="البحث في الفواتير والمصروفات..."
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
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
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 no-flip" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-spacing">
                ممتاز! لا توجد عناصر معلقة
              </h3>
              <p className="text-gray-500 arabic-spacing">
                جميع المعاملات تم اعتمادها أو معالجتها
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <Card
                  key={`${item.itemType}-${item.id}`}
                  className="border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <CardContent className="p-4">
                    {/* Clickable area for details - positioned at top right */}
                    <div className="absolute top-2 right-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openItemDetailModal(item)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="عرض التفاصيل الكاملة"
                      >
                        <Eye className="h-4 w-4 no-flip" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 space-x-reverse mb-2">
                          <div
                            className={`p-2 rounded-full ${
                              item.itemType === "invoice"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {item.itemType === "invoice" ? (
                              <Building2 className="h-4 w-4 no-flip" />
                            ) : (
                              <Receipt className="h-4 w-4 no-flip" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-2 space-x-reverse mb-2">
                              <h4 className="font-semibold text-gray-900 arabic-spacing">
                                {item.itemType === "invoice"
                                  ? `فاتورة: ${
                                      (item as EnhancedInvoice).invoiceNumber
                                    }`
                                  : (item as EnhancedGeneralExpense)
                                      .description}
                              </h4>
                              <span
                                className={`text-xs px-2 py-1 rounded-full arabic-spacing ${
                                  item.itemType === "invoice"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {item.itemType === "invoice"
                                  ? getProjectName(
                                      (item as EnhancedInvoice).projectId
                                    )
                                  : (item as EnhancedGeneralExpense).category}
                              </span>
                            </div>

                            {/* Detailed Information */}
                            <div className="bg-gray-50 p-3 rounded-lg mb-3 space-y-2 text-sm">
                              {item.itemType === "invoice" ? (
                                // Invoice Details
                                <div className="space-y-1">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-gray-600 arabic-spacing">
                                        اسم المشروع:
                                      </span>
                                      <span className="font-medium mr-2 arabic-spacing bg-white text-gray-700">
                                        {getProjectName(
                                          (item as EnhancedInvoice).projectId
                                        )}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        تاريخ الاستحقاق:
                                      </span>
                                      <span className="font-medium mr-2 arabic-spacing text-gray-700">
                                        {(item as EnhancedInvoice).dueDate
                                          ? formatDate(
                                              (item as EnhancedInvoice).dueDate!
                                            )
                                          : "غير محدد"}
                                      </span>
                                    </div>
                                  </div>

                                  {(item as EnhancedInvoice).taxPercentage && (
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        نسبة الضريبة:
                                      </span>
                                      <span className="font-medium mr-2 arabic-nums">
                                        {
                                          (item as EnhancedInvoice)
                                            .taxPercentage
                                        }
                                        %
                                      </span>
                                    </div>
                                  )}

                                  {(item as EnhancedInvoice).discountAmount && (
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        قيمة الخصم:
                                      </span>
                                      <span className="font-medium mr-2 arabic-nums">
                                        {formatCurrency(
                                          (item as EnhancedInvoice)
                                            .discountAmount!
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {(item as EnhancedInvoice).paymentTerms && (
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        شروط الدفع:
                                      </span>
                                      <span className="font-medium mr-2 arabic-spacing">
                                        {(item as EnhancedInvoice).paymentTerms}
                                      </span>
                                    </div>
                                  )}

                                  {(item as EnhancedInvoice).notes && (
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        ملاحظات:
                                      </span>
                                      <span className="font-medium mr-2 arabic-spacing">
                                        {(item as EnhancedInvoice).notes}
                                      </span>
                                    </div>
                                  )}

                                  {(item as EnhancedInvoice).customFields &&
                                    (item as EnhancedInvoice).customFields!
                                      .length > 0 && (
                                      <div>
                                        <span className="text-gray-500 arabic-spacing">
                                          حقول إضافية:
                                        </span>
                                        <div className="mt-1 space-y-1">
                                          {(
                                            item as EnhancedInvoice
                                          ).customFields!.map(
                                            (field, index) => (
                                              <div
                                                key={index}
                                                className="text-xs bg-white p-2 rounded border"
                                              >
                                                <span className="text-gray-600 arabic-spacing">
                                                  {field.label}:
                                                </span>
                                                <span className="font-medium mr-2 arabic-spacing">
                                                  {field.value}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ) : (
                                // Expense Details
                                <div className="space-y-1">
                                  <div>
                                    <span className="text-gray-500 arabic-spacing">
                                      الوصف التفصيلي:
                                    </span>
                                    <span className="font-medium mr-2 arabic-spacing">
                                      {
                                        (item as EnhancedGeneralExpense)
                                          .description
                                      }
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 arabic-spacing">
                                      الفئة:
                                    </span>
                                    <span className="font-medium mr-2 arabic-spacing">
                                      {
                                        (item as EnhancedGeneralExpense)
                                          .category
                                      }
                                    </span>
                                  </div>

                                  {(item as EnhancedGeneralExpense).notes && (
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        ملاحظات إضافية:
                                      </span>
                                      <span className="font-medium mr-2 arabic-spacing">
                                        {(item as EnhancedGeneralExpense).notes}
                                      </span>
                                    </div>
                                  )}

                                  {(item as EnhancedGeneralExpense)
                                    .receiptImage && (
                                    <div>
                                      <span className="text-gray-500 arabic-spacing">
                                        إيصال مرفق:
                                      </span>
                                      <span className="text-green-600 mr-2 arabic-spacing">
                                        ✓ متوفر
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-4 space-x-reverse text-xs text-gray-500">
                              <div className="flex items-center space-x-1 space-x-reverse">
                                <UserIcon className="h-3 w-3 no-flip" />
                                <span className="arabic-spacing">
                                  تم الإدخال بواسطة: {item.submittedBy}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 space-x-reverse">
                                <Calendar className="h-3 w-3 no-flip" />
                                <span className="arabic-spacing">
                                  بتاريخ: {formatDate(item.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600 arabic-nums">
                            {formatCurrency(item.amount)}
                          </div>
                          <div className="text-xs text-gray-500 arabic-spacing">
                            {hasBalance(item.amount)
                              ? "رصيد كافي"
                              : "رصيد غير كافي"}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button
                            size="sm"
                            onClick={() =>
                              item.itemType === "invoice"
                                ? approveInvoice(item as EnhancedInvoice)
                                : approveExpense(item as EnhancedGeneralExpense)
                            }
                            disabled={!hasBalance(item.amount)}
                            className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
                          >
                            <CheckCircle className="h-4 w-4 ml-1 no-flip" />
                            <span className="arabic-spacing">اعتماد ودفع</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openRejectModal(
                                item.id,
                                item.itemType,
                                item.itemType === "invoice"
                                  ? `فاتورة ${
                                      (item as EnhancedInvoice).invoiceNumber
                                    }`
                                  : (item as EnhancedGeneralExpense).description
                              )
                            }
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 ml-1 no-flip" />
                            <span className="arabic-spacing">رفض</span>
                          </Button>
                        </div>
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
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 arabic-spacing">
                الإجمالي المحدد: {formatCurrency(totalAmount)} •{" "}
                {filteredItems.length} عنصر
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <Button variant="outline" onClick={onClose}>
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
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <span className="arabic-spacing">اعتماد الكل</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Confirmation Modal */}
      {showRejectModal && itemToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center space-x-3 space-x-reverse mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600 no-flip" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 arabic-spacing">
                    تأكيد رفض العنصر
                  </h3>
                  <p className="text-sm text-gray-600 arabic-spacing">
                    هل أنت متأكد من رفض {itemToReject.title}؟
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2 arabic-spacing">
                  سبب الرفض (اختياري)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب رفض هذا العنصر ليتم إبلاغ موظف الإدخال..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 arabic-spacing"
                  rows={3}
                />
              </div>

              <div className="bg-red-50 p-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <AlertTriangle className="h-4 w-4 text-red-600 no-flip" />
                  <p className="text-sm text-red-700 arabic-spacing">
                    <strong>تحذير:</strong> لا يمكن التراجع عن هذا الإجراء بعد
                    التأكيد
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setItemToReject(null);
                    setRejectionReason("");
                  }}
                >
                  <span className="arabic-spacing">إلغاء</span>
                </Button>
                <Button
                  onClick={confirmReject}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <XCircle className="h-4 w-4 ml-1 no-flip" />
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
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-white/20 p-2 rounded-lg">
                    {selectedItem.itemType === "invoice" ? (
                      <Building2 className="h-6 w-6 no-flip" />
                    ) : (
                      <Receipt className="h-6 w-6 no-flip" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold arabic-spacing">
                      {selectedItem.itemType === "invoice"
                        ? `تفاصيل الفاتورة: ${
                            (selectedItem as EnhancedInvoice).invoiceNumber
                          }`
                        : `تفاصيل المصروف: ${
                            (selectedItem as EnhancedGeneralExpense).description
                          }`}
                    </h2>
                    <p className="text-blue-100 arabic-spacing">
                      مُدخل بواسطة: {selectedItem.submittedBy} •{" "}
                      {formatDate(selectedItem.date)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeItemDetailModal}
                  className="h-10 w-10 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {selectedItem.itemType === "invoice" ? (
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
                          {(selectedItem as EnhancedInvoice).invoiceNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 arabic-spacing">
                          المبلغ الإجمالي:
                        </span>
                        <span className="font-bold mr-2 text-green-600 arabic-nums">
                          {formatCurrency(selectedItem.amount)}
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
                          {formatDate(selectedItem.date)}
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
                          {formatCurrency(selectedItem.amount)}
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
                          {formatDate(selectedItem.date)}
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
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 arabic-spacing">
                  الحالة:{" "}
                  <span className="font-medium text-yellow-600">
                    بانتظار الاعتماد
                  </span>
                </div>
                <div className="flex space-x-3 space-x-reverse">
                  <Button variant="outline" onClick={closeItemDetailModal}>
                    <span className="arabic-spacing">إغلاق</span>
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedItem.itemType === "invoice") {
                        approveInvoice(selectedItem as EnhancedInvoice);
                      } else {
                        approveExpense(selectedItem as EnhancedGeneralExpense);
                      }
                      closeItemDetailModal();
                    }}
                    disabled={!hasBalance(selectedItem.amount)}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
                  >
                    <CheckCircle className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">اعتماد ودفع</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      closeItemDetailModal();
                      openRejectModal(
                        selectedItem.id,
                        selectedItem.itemType,
                        selectedItem.itemType === "invoice"
                          ? `فاتورة ${
                              (selectedItem as EnhancedInvoice).invoiceNumber
                            }`
                          : (selectedItem as EnhancedGeneralExpense).description
                      );
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">رفض</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
