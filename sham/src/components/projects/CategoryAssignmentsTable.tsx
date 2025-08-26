"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Receipt,
  User,
  DollarSign,
  Calendar,
  FileText,
  Eye,
  Edit,
  Trash2,
  Package,
  Users,
  Settings,
  Briefcase,
  ShoppingCart,
  Clock,
  Snowflake,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Layers,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { FinancialDisplay } from "@/components/ui/FinancialDisplay";
import { PermissionButton } from "@/components/ui/PermissionButton";
import { useResponsive } from "@/hooks/useResponsive";

interface CategoryAssignment {
  id: string;
  main_category: string;
  subcategory: string;
  contractor_name: string;
  estimated_amount: number;
  actual_amount?: number;
  invoice_count: number;
  has_approved_invoice: boolean;
  budget_exhausted?: boolean;
  status: string;
  last_invoice_date?: string;
  total_invoices: number;
  pending_invoices: number;
  approved_invoices: number;
  paid_invoices: number;
  assignment_type?: "contractor" | "purchasing";
  // New assignment management fields
  frozen_at?: string;
  frozen_by?: string;
  freeze_reason?: string;
  returned_budget?: number;
  original_amount?: number;
  spent_amount?: number;
  pending_amount?: number;
  available_amount?: number;
}

interface CategoryAssignmentsTableProps {
  projectId: string;
  assignments: CategoryAssignment[];
  onAddInvoice: (assignment: CategoryAssignment) => void;
  onEditAssignment: (assignment: CategoryAssignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onViewInvoices: (assignment: CategoryAssignment) => void;
  onAddAssignment?: () => void;
  // New assignment management callbacks
  onFreezeAssignment?: (assignmentId: string, reason: string) => void;
  onUnfreezeAssignment?: (assignmentId: string) => void;
  onEditAssignmentAmount?: (
    assignmentId: string,
    newAmount: number,
    reason?: string
  ) => void;
}

const categoryIcons = {
  "أعمال تنفيذية وإنشائية": Package,
  "تجهيز مواد البناء والتشطيب": Briefcase,
  "أعمال متخصصة وتنفيذ متكامل": Settings,
  "إدارية وتشغيلية": Users,
};

const statusColors = {
  active: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border border-blue-200",
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  cancelled: "bg-red-100 text-red-800 border border-red-200",
  frozen:
    "bg-gradient-to-r from-cyan-100 via-blue-100 to-cyan-100 text-cyan-900 border border-cyan-200 shadow-sm backdrop-blur-sm",
};

const statusLabels = {
  active: "نشط",
  completed: "مكتمل",
  pending: "في الانتظار",
  cancelled: "ملغي",
  frozen: "مجمد",
};

export default function CategoryAssignmentsTable({
  projectId,
  assignments,
  onAddInvoice,
  onEditAssignment,
  onDeleteAssignment,
  onViewInvoices,
  onAddAssignment,
  onFreezeAssignment,
  onUnfreezeAssignment,
  onEditAssignmentAmount,
}: CategoryAssignmentsTableProps) {
  const permissions = useUIPermissions();
  const { isMobile } = useResponsive();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "category" | "contractor" | "amount" | "invoices"
  >("category");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Assignment management modal states
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<CategoryAssignment | null>(null);

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(assignments.map((a) => a.main_category))];
    return categories.filter(Boolean);
  }, [assignments]);

  // Filter and search assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesSearch =
        assignment.main_category
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        assignment.subcategory
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        assignment.contractor_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || assignment.main_category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || assignment.status === statusFilter;

      const matchesAssignmentType =
        assignmentTypeFilter === "all" ||
        (assignmentTypeFilter === "contractor" &&
          assignment.assignment_type !== "purchasing") ||
        (assignmentTypeFilter === "purchasing" &&
          assignment.assignment_type === "purchasing");

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesAssignmentType
      );
    });
  }, [
    assignments,
    searchTerm,
    categoryFilter,
    statusFilter,
    assignmentTypeFilter,
  ]);

  // Sort assignments
  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "category":
          aValue = `${a.main_category} ${a.subcategory}`;
          bValue = `${b.main_category} ${b.subcategory}`;
          break;
        case "contractor":
          aValue = a.contractor_name;
          bValue = b.contractor_name;
          break;
        case "amount":
          aValue = a.estimated_amount;
          bValue = b.estimated_amount;
          break;
        case "invoices":
          aValue = a.total_invoices;
          bValue = b.total_invoices;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAssignments, sortBy, sortOrder]);

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  const getCategoryIcon = (category: string, isPurchasing?: boolean) => {
    if (isPurchasing) {
      return ShoppingCart;
    }
    const IconComponent =
      categoryIcons[category as keyof typeof categoryIcons] || Package;
    return IconComponent;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 arabic-spacing mb-2">
          فئات المشروع والمقاولين
        </h2>
        <p className="text-sm text-gray-600 arabic-spacing max-w-2xl mx-auto">
          إدارة شاملة لجميع التعيينات والفواتير لكل فئة ومقاول
        </p>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Microsoft Lists Style Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <FileText className="h-5 w-5 text-gray-600 no-flip" />
              <div>
                <h3 className="text-sm font-semibold text-gray-800 arabic-spacing">
                  تعيينات الفئات والمقاولين
                </h3>
                <p className="text-xs text-gray-500 arabic-spacing">
                  {sortedAssignments.length} عنصر •{" "}
                  {sortedAssignments.reduce(
                    (sum, a) => sum + a.total_invoices,
                    0
                  )}{" "}
                  فاتورة
                </p>
              </div>
            </div>

            {onAddAssignment && (
              <PermissionButton
                permission="canEditProjects"
                onClick={onAddAssignment}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-xs rounded font-medium shadow-sm hover:shadow transition-all duration-200"
                viewOnlyTooltip="غير متاح - وضع العرض فقط"
              >
                <Plus className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">جديد</span>
              </PermissionButton>
            )}
          </div>
        </div>

        {/* Microsoft Lists Style Filters */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 no-flip" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث..."
                className="pr-10 h-8 text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 arabic-spacing"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-32"
              >
                <option value="all">كل الفئات</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-28"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="completed">مكتمل</option>
                <option value="pending">انتظار</option>
                <option value="cancelled">ملغي</option>
              </Select>

              <Select
                value={assignmentTypeFilter}
                onChange={(e) => setAssignmentTypeFilter(e.target.value)}
                className="h-10 text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-32"
              >
                <option value="all">كل الأنواع</option>
                <option value="contractor">مقاولين</option>
                <option value="purchasing">مشتريات</option>
              </Select>

              <Select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split("-");
                  setSortBy(newSortBy as typeof sortBy);
                  setSortOrder(newSortOrder as typeof sortOrder);
                }}
                className="h-10 text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-36"
              >
                <option value="category-asc">الفئة (أ-ي)</option>
                <option value="category-desc">الفئة (ي-أ)</option>
                <option value="contractor-asc">المقاول (أ-ي)</option>
                <option value="contractor-desc">المقاول (ي-أ)</option>
                <option value="amount-desc">المبلغ (الأعلى)</option>
                <option value="amount-asc">المبلغ (الأقل)</option>
                <option value="invoices-desc">الفواتير (الأكثر)</option>
                <option value="invoices-asc">الفواتير (الأقل)</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Enhanced Table / Mobile Cards */}
        <div className={isMobile ? "" : "overflow-x-auto"}>
          {sortedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400 no-flip" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2 arabic-spacing">
                {searchTerm ||
                categoryFilter !== "all" ||
                statusFilter !== "all"
                  ? "لا توجد نتائج مطابقة"
                  : "لا توجد تعيينات للفئات"}
              </h3>
              <p className="text-sm text-gray-500 arabic-spacing max-w-md mx-auto mb-4">
                {searchTerm ||
                categoryFilter !== "all" ||
                statusFilter !== "all"
                  ? "جرب تغيير معايير البحث"
                  : "ابدأ بإضافة تعيينات جديدة"}
              </p>
              {onAddAssignment && (
                <PermissionButton
                  permission="canEditProjects"
                  onClick={onAddAssignment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded font-medium shadow-sm hover:shadow transition-all duration-200"
                  viewOnlyTooltip="غير متاح - وضع العرض فقط"
                >
                  <Plus className="h-4 w-4 ml-1 no-flip" />
                  إضافة تعيين جديد
                </PermissionButton>
              )}
            </div>
          ) : isMobile ? (
            <MobileCategoryAssignmentsCards
              sortedAssignments={sortedAssignments}
              onAddInvoice={onAddInvoice}
              onEditAssignment={onEditAssignment}
              onDeleteAssignment={onDeleteAssignment}
              onViewInvoices={onViewInvoices}
              onFreezeAssignment={onFreezeAssignment}
              onUnfreezeAssignment={onUnfreezeAssignment}
              onEditAssignmentAmount={onEditAssignmentAmount}
              getCategoryIcon={getCategoryIcon}
            />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-gray-100 border-b-2 border-gray-300">
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing border-r border-gray-300 min-w-48">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Layers className="h-4 w-4 text-gray-600" />
                      <span>الفئة والتفاصيل</span>
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing border-r border-gray-300 min-w-36">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="h-4 w-4 text-gray-600" />
                      <span>المقاول</span>
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing border-r border-gray-300 min-w-24">
                    <div className="flex items-center justify-end space-x-2 space-x-reverse">
                      <DollarSign className="h-4 w-4 text-gray-600" />
                      <span>الميزانية المقدرة</span>
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing border-r border-gray-300 min-w-24">
                    <div className="flex items-center justify-end space-x-2 space-x-reverse">
                      <TrendingUp className="h-4 w-4 text-gray-600" />
                      <span>المبلغ الفعلي</span>
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing border-r border-gray-300 min-w-20">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span>عدد الفواتير</span>
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing border-r border-gray-300 min-w-16">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <Activity className="h-4 w-4 text-gray-600" />
                      <span>الحالة</span>
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 arabic-spacing min-w-40">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <Settings className="h-4 w-4 text-gray-600" />
                      <span>الإجراءات</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAssignments.map((assignment, index) => {
                  const isPurchasing =
                    assignment.assignment_type === "purchasing";
                  const IconComponent = getCategoryIcon(
                    assignment.main_category,
                    isPurchasing
                  );
                  // Different protection logic for different actions:
                  // - Edit/Delete: Protected if has any approved invoice
                  // - Add Invoice: Protected only if budget is exhausted
                  const isEditDeleteProtected = assignment.has_approved_invoice;
                  const isInvoiceButtonDisabled =
                    assignment.budget_exhausted || false;

                  return (
                    <tr
                      key={assignment.id}
                      className={`border-b border-gray-200 transition-all duration-200 hover:shadow-sm ${
                        assignment.status === "frozen"
                          ? "bg-gradient-to-r from-cyan-50/60 via-blue-50/40 to-cyan-50/60 hover:from-cyan-100/60 hover:via-blue-100/40 hover:to-cyan-100/60 border-l-4 border-l-cyan-300"
                          : isPurchasing
                          ? "bg-emerald-50/40 hover:bg-emerald-50/60 border-l-4 border-l-emerald-300"
                          : isEditDeleteProtected
                          ? "bg-red-50/40 hover:bg-red-50/60 border-l-4 border-l-red-300"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Category & Subcategory */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center mr-2 ${
                              isPurchasing
                                ? "bg-green-100"
                                : isEditDeleteProtected
                                ? "bg-red-100"
                                : "bg-blue-100"
                            }`}
                          >
                            <IconComponent
                              className={`h-3 w-3 no-flip ${
                                isPurchasing
                                  ? "text-green-600"
                                  : isEditDeleteProtected
                                  ? "text-red-600"
                                  : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 arabic-spacing truncate">
                              {assignment.main_category}
                            </div>
                            <div className="text-xs text-gray-500 arabic-spacing truncate">
                              {assignment.subcategory}
                            </div>
                            {isEditDeleteProtected && (
                              <div className="flex items-center space-x-1 space-x-reverse mt-1">
                                <svg
                                  className="h-3 w-3 text-red-500 no-flip"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs text-red-500 arabic-spacing">
                                  محمي
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contractor */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center mr-2 ${
                              isPurchasing ? "bg-green-100" : "bg-blue-100"
                            }`}
                          >
                            {isPurchasing ? (
                              <ShoppingCart className="h-3 w-3 text-green-600 no-flip" />
                            ) : (
                              <User className="h-3 w-3 text-blue-600 no-flip" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-xs font-medium arabic-spacing truncate ${
                                isPurchasing
                                  ? "text-green-700"
                                  : "text-gray-900"
                              }`}
                            >
                              {assignment.contractor_name}
                            </div>
                            {isPurchasing && (
                              <div className="text-xs text-green-600 arabic-spacing">
                                تعيين مشتريات
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Estimated Budget */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        <div className="text-xs text-gray-900 arabic-spacing text-right">
                          <FinancialDisplay
                            value={assignment.estimated_amount}
                          />
                        </div>
                      </td>

                      {/* Actual Amount */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        <div className="text-xs text-gray-900 arabic-spacing text-right">
                          {assignment.actual_amount &&
                          assignment.actual_amount > 0 ? (
                            <FinancialDisplay
                              value={assignment.actual_amount}
                            />
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>

                      {/* Invoices Count */}
                      <td className="px-4 py-3 border-r border-gray-300 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="text-xs font-semibold text-gray-900">
                            {assignment.total_invoices}
                          </div>
                          <div className="flex space-x-1 space-x-reverse">
                            {assignment.pending_invoices > 0 && (
                              <span className="bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded text-xs leading-none">
                                {assignment.pending_invoices}
                              </span>
                            )}
                            {assignment.approved_invoices > 0 && (
                              <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs leading-none">
                                {assignment.approved_invoices}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 border-r border-gray-300 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            statusColors[
                              assignment.status as keyof typeof statusColors
                            ] || statusColors.active
                          }`}
                        >
                          {assignment.status === "frozen" && (
                            <>
                              {/* Ice crystal effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-cyan-200/20 pointer-events-none" />
                              <div className="absolute top-0 left-0 w-1 h-1 bg-white/40 rounded-full" />
                              <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-cyan-300/60 rounded-full" />
                              <div className="absolute bottom-0 left-1/2 w-0.5 h-0.5 bg-blue-200/50 rounded-full" />
                            </>
                          )}
                          <span className="relative z-10 flex items-center space-x-1 space-x-reverse">
                            {assignment.status === "frozen" && (
                              <svg
                                className="w-3 h-3 text-cyan-700"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 2L13 8h4l-3 2 1 4-5-3-5 3 1-4-3-2h4l3-6z" />
                              </svg>
                            )}
                            <span>
                              {statusLabels[
                                assignment.status as keyof typeof statusLabels
                              ] || assignment.status}
                            </span>
                          </span>
                        </span>
                      </td>

                      {/* Actions / Freeze Reason */}
                      <td className="px-4 py-3">
                        {assignment.status === "frozen" ? (
                          /* Freeze Reason Display */
                          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Snowflake className="h-4 w-4 text-cyan-600 mr-1" />
                              <span className="text-xs font-semibold text-cyan-800 arabic-spacing">
                                مجمد
                              </span>
                            </div>
                            <div
                              className="text-xs text-cyan-700 arabic-spacing leading-relaxed"
                              title={assignment.freeze_reason}
                            >
                              {assignment.freeze_reason ||
                                "تم تجميد هذا التعيين"}
                            </div>
                            {assignment.frozen_at && (
                              <div className="text-xs text-cyan-600 arabic-spacing mt-1 opacity-75">
                                {new Date(
                                  assignment.frozen_at
                                ).toLocaleDateString("ar-EG")}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Regular Action Buttons */
                          <div className="flex items-center justify-center space-x-1 space-x-reverse">
                            {/* Add Invoice */}
                            <PermissionButton
                              permission="canCreateInvoices"
                              onClick={() =>
                                !isInvoiceButtonDisabled &&
                                assignment.status === "active" &&
                                onAddInvoice(assignment)
                              }
                              className={`w-7 h-7 p-0 rounded border transition-colors ${
                                isInvoiceButtonDisabled ||
                                assignment.status !== "active"
                                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                              }`}
                              disabled={
                                isInvoiceButtonDisabled ||
                                assignment.status !== "active"
                              }
                              title={
                                assignment.status !== "active"
                                  ? "التعيين غير نشط"
                                  : isInvoiceButtonDisabled
                                  ? "الميزانية مستنفدة"
                                  : "إضافة فاتورة"
                              }
                              viewOnlyTooltip="غير متاح - وضع العرض فقط"
                            >
                              <Receipt className="h-3 w-3 no-flip" />
                            </PermissionButton>

                            {/* Edit Amount */}
                            {onEditAssignmentAmount && (
                              <PermissionButton
                                permission="canEditProjects"
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setShowEditModal(true);
                                }}
                                className={`w-7 h-7 p-0 rounded border transition-colors ${
                                  assignment.status !== "active"
                                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                }`}
                                disabled={assignment.status !== "active"}
                                title={
                                  assignment.status !== "active"
                                    ? "لا يمكن التعديل - التعيين غير نشط"
                                    : "تعديل المبلغ"
                                }
                                viewOnlyTooltip="غير متاح - وضع العرض فقط"
                              >
                                <Edit className="h-3 w-3 no-flip" />
                              </PermissionButton>
                            )}

                            {/* Freeze Only (No Unfreeze) */}
                            {onFreezeAssignment &&
                              assignment.status === "active" && (
                                <PermissionButton
                                  permission="canEditProjects"
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setShowFreezeModal(true);
                                  }}
                                  className="w-7 h-7 p-0 rounded border transition-colors bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100"
                                  title="تجميد التعيين"
                                  viewOnlyTooltip="غير متاح - وضع العرض فقط"
                                >
                                  <Snowflake className="h-3 w-3 no-flip" />
                                </PermissionButton>
                              )}

                            {/* Frozen Status Indicator (No Action) */}
                            {assignment.status === "frozen" && (
                              <div className="w-7 h-7 p-0 rounded border bg-gradient-to-br from-cyan-100 via-blue-100 to-cyan-100 border-cyan-200 flex items-center justify-center relative overflow-hidden">
                                {/* Ice crystal effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-cyan-200/30 pointer-events-none" />
                                <div className="absolute top-0 left-0 w-1 h-1 bg-white/50 rounded-full" />
                                <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-cyan-400/70 rounded-full" />
                                <div className="absolute bottom-0 left-1/2 w-0.5 h-0.5 bg-blue-300/60 rounded-full" />
                                <Snowflake className="h-3 w-3 no-flip text-cyan-700 relative z-10" />
                              </div>
                            )}

                            {/* Delete */}
                            <PermissionButton
                              permission="canEditProjects"
                              onClick={() => {
                                if (
                                  !isEditDeleteProtected &&
                                  assignment.status !== "frozen"
                                ) {
                                  setSelectedAssignment(assignment);
                                  setShowDeleteConfirm(true);
                                }
                              }}
                              className={`w-7 h-7 p-0 rounded border transition-colors ${
                                isEditDeleteProtected ||
                                assignment.status === "frozen"
                                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                              }`}
                              disabled={
                                isEditDeleteProtected ||
                                assignment.status === "frozen"
                              }
                              title={
                                assignment.status === "frozen"
                                  ? "لا يمكن الحذف - التعيين مجمد"
                                  : isEditDeleteProtected
                                  ? "محمي - لا يمكن الحذف (يوجد فواتير معتمدة)"
                                  : "حذف التعيين"
                              }
                              viewOnlyTooltip="غير متاح - وضع العرض فقط"
                            >
                              <Trash2 className="h-3 w-3 no-flip" />
                            </PermissionButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Enhanced Status Footer */}
        {sortedAssignments.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Assignment Count */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600 no-flip" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 arabic-spacing">
                    {sortedAssignments.length}
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    إجمالي التعيينات
                  </div>
                </div>
              </div>

              {/* Total Invoices */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-amber-600 no-flip" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 arabic-spacing">
                    {sortedAssignments.reduce(
                      (sum, a) => sum + a.total_invoices,
                      0
                    )}
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    إجمالي الفواتير
                  </div>
                </div>
              </div>

              {/* Budget Exhausted */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-red-600 no-flip"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-red-600 arabic-spacing">
                    {sortedAssignments.filter((a) => a.budget_exhausted).length}
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    ميزانية مستنفدة
                  </div>
                </div>
              </div>

              {/* Protected Assignments */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-orange-600 no-flip"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-orange-600 arabic-spacing">
                    {
                      sortedAssignments.filter((a) => a.has_approved_invoice)
                        .length
                    }
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    تعيين محمي
                  </div>
                </div>
              </div>

              {/* Total Budget */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-600 no-flip" />
                </div>
                <div>
                  <div className="text-sm font-bold text-green-600 arabic-spacing">
                    <FinancialDisplay
                      value={sortedAssignments.reduce((sum, a) => {
                        // If assignment is frozen, only count the returned_budget (if present), else use estimated_amount
                        if (a.status === "frozen") {
                          // If returned_budget is defined, add it; else, treat as 0
                          return (
                            sum +
                            (typeof a.returned_budget === "number"
                              ? a.returned_budget
                              : 0)
                          );
                        }
                        return sum + a.estimated_amount;
                      }, 0)}
                    />
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    إجمالي المقدر
                  </div>
                </div>
              </div>

              {/* Remaining Budget */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-emerald-600 no-flip"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-600 arabic-spacing">
                    <FinancialDisplay
                      value={sortedAssignments.reduce((sum, a) => {
                        // If assignment is frozen, only count the returned_budget (if present), else use estimated - actual
                        if (a.status === "frozen") {
                          // If returned_budget is defined, add it; else, treat as 0
                          return (
                            sum +
                            (typeof a.returned_budget === "number"
                              ? a.returned_budget
                              : 0)
                          );
                        }
                        return (
                          sum + (a.estimated_amount - (a.actual_amount || 0))
                        );
                      }, 0)}
                    />
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    المتبقي
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 arabic-spacing">
                  تقدم المشروع
                </span>
                <span className="text-xs text-gray-600 arabic-spacing">
                  {(() => {
                    const actualTotal = sortedAssignments.reduce(
                      (sum, a) => sum + (a.actual_amount || 0),
                      0
                    );
                    const estimatedTotal = sortedAssignments.reduce(
                      (sum, a) => sum + (a.estimated_amount || 0),
                      0
                    );

                    if (estimatedTotal === 0) return "0";

                    const percentage = Math.round(
                      (actualTotal / estimatedTotal) * 100
                    );
                    return isNaN(percentage) ? "0" : percentage;
                  })()}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(() => {
                      const actualTotal = sortedAssignments.reduce(
                        (sum, a) => sum + (a.actual_amount || 0),
                        0
                      );
                      const estimatedTotal = sortedAssignments.reduce(
                        (sum, a) => sum + (a.estimated_amount || 0),
                        0
                      );

                      if (estimatedTotal === 0) return 0;

                      const percentage = Math.round(
                        (actualTotal / estimatedTotal) * 100
                      );
                      const safePercentage = isNaN(percentage) ? 0 : percentage;
                      return Math.min(100, safePercentage);
                    })()}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Freeze Assignment Modal */}
      {showFreezeModal && selectedAssignment && (
        <FreezeAssignmentModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowFreezeModal(false);
            setSelectedAssignment(null);
          }}
          onConfirm={(reason) => {
            if (onFreezeAssignment) {
              onFreezeAssignment(selectedAssignment.id, reason);
            }
            setShowFreezeModal(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      {/* Edit Assignment Amount Modal */}
      {showEditModal && selectedAssignment && (
        <EditAssignmentModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
          onConfirm={(newAmount, reason) => {
            if (onEditAssignmentAmount) {
              onEditAssignmentAmount(selectedAssignment.id, newAmount, reason);
            }
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      {/* Delete Assignment Confirmation Modal */}
      {showDeleteConfirm && selectedAssignment && (
        <DeleteAssignmentConfirm
          assignment={selectedAssignment}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedAssignment(null);
          }}
          onConfirm={() => {
            onDeleteAssignment(selectedAssignment.id);
            setShowDeleteConfirm(false);
            setSelectedAssignment(null);
          }}
        />
      )}
    </div>
  );
}

// Freeze Assignment Modal Component
function FreezeAssignmentModal({
  assignment,
  onClose,
  onConfirm,
}: {
  assignment: CategoryAssignment;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="bg-cyan-100 p-2 rounded-lg">
            <Snowflake className="h-6 w-6 text-cyan-600 no-flip" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing">
              تجميد التعيين
            </h3>
            <p className="text-sm text-gray-600 arabic-spacing">
              {assignment.contractor_name} - {assignment.main_category}
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-cyan-50 rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse mb-2">
            <AlertTriangle className="h-4 w-4 text-cyan-600 no-flip" />
            <span className="text-sm font-medium text-cyan-800 arabic-spacing">
              معلومات مهمة
            </span>
          </div>
          <ul className="text-xs text-cyan-700 arabic-spacing space-y-1">
            <li>• سيتم إرجاع الرصيد غير المستخدم إلى المشروع</li>
            <li>• لن يتمكن المقاول من إنشاء فواتير جديدة</li>
            <li>• يمكن إلغاء التجميد لاحقاً إذا لزم الأمر</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
              سبب التجميد *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب تجميد هذا التعيين..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none arabic-spacing text-black"
              rows={3}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <Button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 ml-2 animate-spin no-flip" />
                  <span className="arabic-spacing">جاري التجميد...</span>
                </>
              ) : (
                <>
                  <Snowflake className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">تجميد التعيين</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              <span className="arabic-spacing">إلغاء</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Assignment Amount Modal Component
function EditAssignmentModal({
  assignment,
  onClose,
  onConfirm,
}: {
  assignment: CategoryAssignment;
  onClose: () => void;
  onConfirm: (newAmount: number, reason?: string) => void;
}) {
  const [newAmount, setNewAmount] = useState(
    assignment.estimated_amount.toString()
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm(amount, reason.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountDifference = parseFloat(newAmount) - assignment.estimated_amount;
  const isIncreasing = amountDifference > 0;
  const isDecreasing = amountDifference < 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Edit className="h-6 w-6 text-amber-600 no-flip" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing">
              تعديل مبلغ التعيين
            </h3>
            <p className="text-sm text-gray-600 arabic-spacing">
              {assignment.contractor_name} - {assignment.main_category}
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 arabic-spacing mb-1">
            المبلغ الحالي:
          </div>
          <div className="text-lg font-semibold text-gray-900 arabic-nums">
            {formatCurrency(assignment.estimated_amount)}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
              المبلغ الجديد *
            </label>
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="أدخل المبلغ الجديد"
              min="0"
              step="0.01"
              required
              disabled={isSubmitting}
              className="arabic-nums"
            />
            {amountDifference !== 0 && (
              <div
                className={`mt-2 text-sm ${
                  isIncreasing ? "text-red-600" : "text-green-600"
                }`}
              >
                {isIncreasing ? "↗️" : "↘️"} التغيير:{" "}
                {formatCurrency(Math.abs(amountDifference))}
                {isIncreasing
                  ? " (سيتم خصمه من رصيد المشروع)"
                  : " (سيتم إرجاعه لرصيد المشروع)"}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
              سبب التعديل (اختياري)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب تعديل المبلغ..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none arabic-spacing"
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <Button
              type="submit"
              disabled={
                !newAmount || parseFloat(newAmount) <= 0 || isSubmitting
              }
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 ml-2 animate-spin no-flip" />
                  <span className="arabic-spacing">جاري التحديث...</span>
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">تحديث المبلغ</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              <span className="arabic-spacing">إلغاء</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Assignment Confirmation Modal Component
function DeleteAssignmentConfirm({
  assignment,
  onClose,
  onConfirm,
}: {
  assignment: CategoryAssignment;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="bg-red-100 p-2 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 no-flip" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing">
              تأكيد حذف التعيين
            </h3>
            <p className="text-sm text-gray-600 arabic-spacing">
              هذا الإجراء لا يمكن التراجع عنه
            </p>
          </div>
        </div>

        <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm text-red-800 arabic-spacing mb-2">
            <strong>سيتم حذف:</strong>
          </div>
          <div className="text-sm text-red-700 arabic-spacing">
            • المقاول: {assignment.contractor_name}
          </div>
          <div className="text-sm text-red-700 arabic-spacing">
            • الفئة: {assignment.main_category}
          </div>
          <div className="text-sm text-red-700 arabic-spacing">
            • المبلغ: {formatCurrency(assignment.estimated_amount)}
          </div>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2 space-x-reverse mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 no-flip" />
            <span className="text-sm font-medium text-yellow-800 arabic-spacing">
              تنبيه مهم
            </span>
          </div>
          <div className="text-xs text-yellow-700 arabic-spacing">
            سيتم إرجاع المبلغ غير المستخدم إلى رصيد المشروع تلقائياً
          </div>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Clock className="h-4 w-4 ml-2 animate-spin no-flip" />
                <span className="arabic-spacing">جاري الحذف...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">نعم، احذف التعيين</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            <span className="arabic-spacing">إلغاء</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mobile Category Assignments Cards Component
function MobileCategoryAssignmentsCards({
  sortedAssignments,
  onAddInvoice,
  onEditAssignment,
  onDeleteAssignment,
  onViewInvoices,
  onFreezeAssignment,
  onUnfreezeAssignment,
  onEditAssignmentAmount,
  getCategoryIcon,
}: {
  sortedAssignments: CategoryAssignment[];
  onAddInvoice: (assignment: CategoryAssignment) => void;
  onEditAssignment: (assignment: CategoryAssignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onViewInvoices: (assignment: CategoryAssignment) => void;
  onFreezeAssignment?: (assignmentId: string, reason: string) => void;
  onUnfreezeAssignment?: (assignmentId: string) => void;
  onEditAssignmentAmount?: (
    assignmentId: string,
    newAmount: number,
    reason?: string
  ) => void;
  getCategoryIcon: (
    category: string,
    isPurchasing?: boolean
  ) => React.ComponentType<any>;
}) {
  const permissions = useUIPermissions();

  return (
    <div className="space-y-4">
      {sortedAssignments.map((assignment, index) => {
        const isPurchasing = assignment.assignment_type === "purchasing";
        const IconComponent = getCategoryIcon(
          assignment.main_category,
          isPurchasing
        );
        const isEditDeleteProtected = assignment.has_approved_invoice;
        const isInvoiceButtonDisabled = assignment.budget_exhausted || false;

        return (
          <div
            key={assignment.id}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${
              assignment.status === "frozen"
                ? "bg-gradient-to-r from-cyan-50/60 via-blue-50/40 to-cyan-50/60 border-l-4 border-l-cyan-300"
                : isPurchasing
                ? "bg-emerald-50/40 border-l-4 border-l-emerald-300"
                : isEditDeleteProtected
                ? "bg-red-50/40 border-l-4 border-l-red-300"
                : ""
            }`}
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center ${
                      isPurchasing
                        ? "bg-green-100"
                        : isEditDeleteProtected
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <IconComponent
                      className={`h-4 w-4 no-flip ${
                        isPurchasing
                          ? "text-green-600"
                          : isEditDeleteProtected
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 arabic-spacing">
                      {assignment.main_category}
                    </h3>
                    <p className="text-xs text-gray-600 arabic-spacing">
                      {assignment.subcategory}
                    </p>
                    {isEditDeleteProtected && (
                      <div className="flex items-center space-x-1 space-x-reverse mt-1">
                        <svg
                          className="h-3 w-3 text-red-500 no-flip"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-xs text-red-500 arabic-spacing">
                          محمي
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                    statusColors[
                      assignment.status as keyof typeof statusColors
                    ] || statusColors.active
                  }`}
                >
                  {assignment.status === "frozen" && (
                    <svg
                      className="w-3 h-3 text-cyan-700 ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2L13 8h4l-3 2 1 4-5-3-5 3 1-4-3-2h4l3-6z" />
                    </svg>
                  )}
                  {statusLabels[
                    assignment.status as keyof typeof statusLabels
                  ] || assignment.status}
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4">
              {/* Contractor Info */}
              <div className="flex items-center space-x-2 space-x-reverse mb-3">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center ${
                    isPurchasing ? "bg-green-100" : "bg-blue-100"
                  }`}
                >
                  {isPurchasing ? (
                    <ShoppingCart className="h-3 w-3 text-green-600 no-flip" />
                  ) : (
                    <User className="h-3 w-3 text-blue-600 no-flip" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium arabic-spacing ${
                      isPurchasing ? "text-green-700" : "text-gray-900"
                    }`}
                  >
                    {assignment.contractor_name}
                  </p>
                  {isPurchasing && (
                    <p className="text-xs text-green-600 arabic-spacing">
                      تعيين مشتريات
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 arabic-spacing mb-1">
                    الميزانية المقدرة
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    <FinancialDisplay value={assignment.estimated_amount} />
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 arabic-spacing mb-1">
                    المبلغ الفعلي
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {assignment.actual_amount &&
                    assignment.actual_amount > 0 ? (
                      <FinancialDisplay value={assignment.actual_amount} />
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
              </div>

              {/* Invoice Count */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <FileText className="h-4 w-4 text-gray-500 no-flip" />
                  <span className="text-sm text-gray-600 arabic-spacing">
                    عدد الفواتير: {assignment.total_invoices}
                  </span>
                </div>
                <div className="flex space-x-1 space-x-reverse">
                  {assignment.pending_invoices > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                      {assignment.pending_invoices} معلقة
                    </span>
                  )}
                  {assignment.approved_invoices > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      {assignment.approved_invoices} معتمدة
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {assignment.status === "frozen" ? (
                /* Frozen Assignment - Show Unfreeze Option */
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Snowflake className="h-4 w-4 text-cyan-600 mr-1" />
                      <span className="text-sm font-semibold text-cyan-800 arabic-spacing">
                        مجمد
                      </span>
                    </div>
                    <div className="text-xs text-cyan-700 arabic-spacing leading-relaxed">
                      {assignment.freeze_reason || "تم تجميد هذا التعيين"}
                    </div>
                    {assignment.frozen_at && (
                      <div className="text-xs text-cyan-600 arabic-spacing mt-1 opacity-75">
                        {new Date(assignment.frozen_at).toLocaleDateString(
                          "ar-EG"
                        )}
                      </div>
                    )}
                  </div>
                  {/* No actions available for frozen assignments in mobile */}
                  <div className="text-center py-2">
                    <span className="text-xs text-cyan-600 arabic-spacing">
                      التعيين مجمد - لا توجد إجراءات متاحة
                    </span>
                  </div>
                </div>
              ) : permissions.canEditProjects ? (
                <div className="grid grid-cols-2 gap-2">
                  {/* Row 1: Add Invoice & Edit */}
                  <PermissionButton
                    permission="canCreateInvoices"
                    onClick={() =>
                      !isInvoiceButtonDisabled &&
                      assignment.status === "active" &&
                      onAddInvoice(assignment)
                    }
                    className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      isInvoiceButtonDisabled || assignment.status !== "active"
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                    disabled={
                      isInvoiceButtonDisabled || assignment.status !== "active"
                    }
                    title={
                      assignment.status !== "active"
                        ? "التعيين غير نشط"
                        : isInvoiceButtonDisabled
                        ? "الميزانية مستنفدة"
                        : "إضافة فاتورة"
                    }
                    viewOnlyTooltip="غير متاح - وضع العرض فقط"
                  >
                    <Receipt className="h-4 w-4 ml-1 no-flip" />
                    فاتورة
                  </PermissionButton>

                  <PermissionButton
                    permission="canEditProjects"
                    onClick={() => onEditAssignment(assignment)}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      isEditDeleteProtected || assignment.status !== "active"
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                    disabled={
                      isEditDeleteProtected || assignment.status !== "active"
                    }
                    title={
                      assignment.status !== "active"
                        ? "لا يمكن التعديل - التعيين غير نشط"
                        : isEditDeleteProtected
                        ? "محمي - لا يمكن التعديل (يوجد فواتير معتمدة)"
                        : "تعديل التعيين"
                    }
                    viewOnlyTooltip="غير متاح - وضع العرض فقط"
                  >
                    <Edit className="h-4 w-4 ml-1 no-flip" />
                    تعديل
                  </PermissionButton>

                  {/* Row 2: Freeze/Delete & View Invoices */}
                  {/* Freeze Button - Always show for active assignments */}
                  {assignment.status === "active" && onFreezeAssignment ? (
                    <PermissionButton
                      permission="canEditProjects"
                      onClick={() => {
                        // Mobile view - freeze without asking for reason
                        onFreezeAssignment(
                          assignment.id,
                          "تم التجميد من الجوال"
                        );
                      }}
                      className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors touch-manipulation"
                      viewOnlyTooltip="غير متاح - وضع العرض فقط"
                    >
                      <Snowflake className="h-4 w-4 ml-1 no-flip" />
                      تجميد
                    </PermissionButton>
                  ) : !isEditDeleteProtected &&
                    assignment.status === "active" ? (
                    // If not protected and active, show delete option
                    <PermissionButton
                      permission="canEditProjects"
                      onClick={() => onDeleteAssignment(assignment.id)}
                      className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors touch-manipulation"
                      viewOnlyTooltip="غير متاح - وضع العرض فقط"
                    >
                      <Trash2 className="h-4 w-4 ml-1 no-flip" />
                      حذف
                    </PermissionButton>
                  ) : (
                    // Fallback: Show protected status
                    <div className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400">
                      <Snowflake className="h-4 w-4 ml-1 no-flip" />
                      محمي
                    </div>
                  )}

                  {/* Admin Only: Additional Action Slot */}
                  {permissions.canEditProjects ? (
                    <div className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-500">
                      <Settings className="h-4 w-4 ml-1 no-flip" />
                      إدارة
                    </div>
                  ) : (
                    <div className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400">
                      <span className="text-xs">غير متاح</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Non-Admin Users - No Actions Available */
                <div className="text-center py-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <span className="text-sm text-gray-500 arabic-spacing">
                      الإجراءات متاحة للمدراء فقط
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
