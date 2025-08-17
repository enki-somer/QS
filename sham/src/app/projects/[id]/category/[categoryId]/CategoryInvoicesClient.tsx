"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Calendar,
  DollarSign,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Project, ProjectCategoryAssignment } from "@/types";
import { PROJECT_CATEGORIES } from "@/constants/projectCategories";
import { useToast } from "@/components/ui/Toast";
import EnhancedCategoryInvoiceModal from "@/components/projects/EnhancedCategoryInvoiceModal";
import { apiRequest } from "@/lib/api";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  date: string;
  status: "pending_approval" | "approved" | "rejected";
  notes?: string;
  category_name: string;
  subcategory_name: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  pending_approval: "في انتظار الموافقة",
  approved: "مُوافق عليه",
  rejected: "مرفوض",
};

const statusIcons = {
  pending_approval: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function CategoryInvoicesClient() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();

  const projectId = params.id as string;
  const categoryId = params.categoryId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [categoryInvoiceModal, setCategoryInvoiceModal] = useState<{
    isOpen: boolean;
    category?: any;
    assignmentData?: any[];
  }>({ isOpen: false });

  // Find the category details
  const categoryDetails = useMemo(() => {
    return PROJECT_CATEGORIES.find((cat) => cat.id === categoryId);
  }, [categoryId]);

  // Get category assignments for this specific category
  const categoryAssignments = useMemo(() => {
    if (!project?.categoryAssignments) return [];

    const categoryNameToId: Record<string, string> = {
      "أعمال تنفيذية وإنشائية": "implementation_construction",
      "تجهيز مواد البناء والتشطيب": "materials_supply",
      "أعمال متخصصة وتنفيذ متكامل": "specialized_works",
      "إدارية وتشغيلية": "administrative_operational",
    };

    return project.categoryAssignments.filter(
      (assignment: ProjectCategoryAssignment) => {
        const arabicCategoryName =
          assignment.main_category || assignment.mainCategory;
        const englishCategoryId =
          categoryNameToId[arabicCategoryName] || arabicCategoryName;
        return englishCategoryId === categoryId;
      }
    );
  }, [project?.categoryAssignments, categoryId]);

  // Filtered invoices based on search and filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        invoice.invoice_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        invoice.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.subcategory_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        invoice.amount.toString().includes(searchTerm);

      // Status filter
      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      // Date filter
      const matchesDate =
        dateFilter === "all" ||
        (() => {
          const invoiceDate = new Date(invoice.date);
          const now = new Date();

          switch (dateFilter) {
            case "today":
              return invoiceDate.toDateString() === now.toDateString();
            case "week":
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return invoiceDate >= weekAgo;
            case "month":
              const monthAgo = new Date(
                now.getTime() - 30 * 24 * 60 * 60 * 1000
              );
              return invoiceDate >= monthAgo;
            default:
              return true;
          }
        })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  // Load project and invoice data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch project data
        const projectResponse = await apiRequest(`/projects/${projectId}`);
        if (!projectResponse.ok) throw new Error("Project not found");
        const projectData = await projectResponse.json();

        const formattedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          code: projectData.code,
          location: projectData.location,
          area: projectData.area,
          budgetEstimate: projectData.budget_estimate,
          client: projectData.client,
          startDate: projectData.start_date?.split("T")[0] || "",
          endDate: projectData.end_date?.split("T")[0] || "",
          status: projectData.status,
          createdAt: projectData.created_at,
          updatedAt: projectData.updated_at,
          categoryAssignments: projectData.categoryAssignments || [],
        };
        setProject(formattedProject);

        // Fetch invoices for this specific category
        const invoicesResponse = await apiRequest(
          `/category-invoices/project/${projectId}/category/${categoryId}`,
          {
            method: "GET",
          }
        );

        if (invoicesResponse.ok) {
          const invoicesData = await invoicesResponse.json();
          setInvoices(invoicesData);
        } else {
          console.warn("Failed to fetch category invoices");
          setInvoices([]);
        }
      } catch (error) {
        console.error("Error loading category invoices data:", error);
        setError("فشل في تحميل بيانات الفواتير");
        setTimeout(() => {
          addToast({
            type: "error",
            message: "فشل في تحميل بيانات الفواتير",
            title: "خطأ",
          });
        }, 0);
      } finally {
        setLoading(false);
      }
    };

    if (projectId && categoryId) {
      loadData();
    }
  }, [projectId, categoryId, addToast]);

  const handleCreateInvoice = () => {
    if (categoryAssignments.length === 0) {
      setTimeout(
        () =>
          addToast({
            title: "خطأ",
            message: "لا توجد تعيينات لهذه الفئة",
            type: "error",
          }),
        0
      );
      return;
    }

    setCategoryInvoiceModal({
      isOpen: true,
      category: categoryDetails,
      assignmentData: categoryAssignments,
    });
  };

  const closeCategoryInvoiceModal = () => {
    setCategoryInvoiceModal({ isOpen: false });
  };

  const handleInvoiceSubmit = async (invoiceData: any) => {
    try {
      const response = await apiRequest("/category-invoices", {
        method: "POST",
        body: JSON.stringify({
          ...invoiceData,
          projectId: project?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Invoice creation failed:", errorData);
        const userMessage =
          errorData.userMessage ||
          errorData.error ||
          "Failed to create invoice";
        throw new Error(userMessage);
      }

      const result = await response.json();
      console.log("Invoice created successfully:", result);

      closeCategoryInvoiceModal();

      // Reload invoices
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      setTimeout(
        () =>
          addToast({
            title: "نجح",
            message: "تم إنشاء الفاتورة بنجاح وإرسالها للموافقة",
            type: "success",
            duration: 5000,
          }),
        0
      );
    } catch (error) {
      console.error("Error creating invoice:", error);
      setTimeout(
        () =>
          addToast({
            title: "خطأ",
            message:
              error instanceof Error ? error.message : "فشل في إنشاء الفاتورة",
            type: "error",
            duration: 5000,
          }),
        0
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الفواتير...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.back()} variant="outline">
            العودة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/projects/${projectId}`)}
                className="flex items-center space-x-2 rtl:space-x-reverse hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة إلى المشروع</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  فواتير {categoryDetails?.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {project?.name} - {project?.code}
                </p>
              </div>
            </div>
            <Button
              onClick={handleCreateInvoice}
              className="flex items-center space-x-2 rtl:space-x-reverse bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>إنشاء فاتورة جديدة</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="البحث في الفواتير (رقم الفاتورة، المبلغ، الملاحظات...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending_approval">في انتظار الموافقة</option>
                <option value="approved">مُوافق عليه</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">جميع التواريخ</option>
                <option value="today">اليوم</option>
                <option value="week">الأسبوع الماضي</option>
                <option value="month">الشهر الماضي</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              عرض {filteredInvoices.length} من أصل {invoices.length} فاتورة
            </span>
            <span>
              إجمالي المبلغ:{" "}
              {formatCurrency(
                filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0)
              )}
            </span>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {invoices.length === 0 ? "لا توجد فواتير" : "لا توجد نتائج"}
            </h3>
            <p className="text-gray-500 mb-6">
              {invoices.length === 0
                ? "لم يتم إنشاء أي فواتير لهذه الفئة بعد"
                : "لا توجد فواتير تطابق معايير البحث المحددة"}
            </p>
            {invoices.length === 0 && (
              <Button onClick={handleCreateInvoice}>إنشاء أول فاتورة</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => {
              const StatusIcon = statusIcons[invoice.status];
              return (
                <div
                  key={invoice.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 rtl:space-x-reverse mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invoice.invoice_number}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            statusColors[invoice.status]
                          }`}
                        >
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusLabels[invoice.status]}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span>المبلغ: {formatCurrency(invoice.amount)}</span>
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>التاريخ: {formatDate(invoice.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            تم الإنشاء: {formatDate(invoice.created_at)}
                          </span>
                        </div>
                      </div>

                      {invoice.subcategory_name && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">الفئة الفرعية:</span>{" "}
                          {invoice.subcategory_name}
                        </div>
                      )}

                      {invoice.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">ملاحظات:</span>{" "}
                          {invoice.notes}
                        </div>
                      )}

                      {invoice.rejection_reason && (
                        <div className="mt-2 p-3 bg-red-50 rounded-lg">
                          <span className="text-sm font-medium text-red-800">
                            سبب الرفض:
                          </span>
                          <p className="text-sm text-red-700 mt-1">
                            {invoice.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(invoice.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Category Invoice Modal */}
      {categoryInvoiceModal.isOpen && project && categoryDetails && (
        <EnhancedCategoryInvoiceModal
          isOpen={categoryInvoiceModal.isOpen}
          project={project}
          category={categoryDetails}
          assignmentData={categoryInvoiceModal.assignmentData || []}
          onClose={closeCategoryInvoiceModal}
          onSubmit={handleInvoiceSubmit}
        />
      )}
    </div>
  );
}
