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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";

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
}

interface CategoryAssignmentsTableProps {
  projectId: string;
  assignments: CategoryAssignment[];
  onAddInvoice: (assignment: CategoryAssignment) => void;
  onEditAssignment: (assignment: CategoryAssignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onViewInvoices: (assignment: CategoryAssignment) => void;
  onAddAssignment?: () => void;
}

const categoryIcons = {
  "أعمال تنفيذية وإنشائية": Package,
  "تجهيز مواد البناء والتشطيب": Briefcase,
  "أعمال متخصصة وتنفيذ متكامل": Settings,
  "إدارية وتشغيلية": Users,
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels = {
  active: "نشط",
  completed: "مكتمل",
  pending: "في الانتظار",
  cancelled: "ملغي",
};

export default function CategoryAssignmentsTable({
  projectId,
  assignments,
  onAddInvoice,
  onEditAssignment,
  onDeleteAssignment,
  onViewInvoices,
  onAddAssignment,
}: CategoryAssignmentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "category" | "contractor" | "amount" | "invoices"
  >("category");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assignments, searchTerm, categoryFilter, statusFilter]);

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

  const getCategoryIcon = (category: string) => {
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
              <Button
                onClick={onAddAssignment}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs rounded font-medium shadow-sm hover:shadow transition-all duration-200"
              >
                <Plus className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">جديد</span>
              </Button>
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

        {/* Enhanced Table */}
        <div className="overflow-x-auto">
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
                <Button
                  onClick={onAddAssignment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded font-medium shadow-sm hover:shadow transition-all duration-200"
                >
                  <Plus className="h-4 w-4 ml-1 no-flip" />
                  إضافة تعيين جديد
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing border-r border-gray-200 min-w-48">
                    الفئة والتفاصيل
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing border-r border-gray-200 min-w-36">
                    المقاول
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing border-r border-gray-200 min-w-24">
                    الميزانية المقدرة
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing border-r border-gray-200 min-w-24">
                    المبلغ الفعلي
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing border-r border-gray-200 min-w-20">
                    عدد الفواتير
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing border-r border-gray-200 min-w-16">
                    الحالة
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 arabic-spacing min-w-40">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAssignments.map((assignment, index) => {
                  const IconComponent = getCategoryIcon(
                    assignment.main_category
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
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 ${
                        isEditDeleteProtected ? "bg-red-50/50" : ""
                      }`}
                    >
                      {/* Category & Subcategory */}
                      <td className="px-3 py-2 border-r border-gray-200 ">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center mr-2 ${
                              isEditDeleteProtected
                                ? "bg-red-100"
                                : "bg-blue-100"
                            }`}
                          >
                            <IconComponent
                              className={`h-3 w-3 no-flip ${
                                isEditDeleteProtected
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
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center mr-2">
                            <User className="h-3 w-3 text-green-600 no-flip" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 arabic-spacing truncate">
                              {assignment.contractor_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estimated Budget */}
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs text-gray-900 arabic-spacing text-right">
                          {formatCurrency(assignment.estimated_amount)}
                        </div>
                      </td>

                      {/* Actual Amount */}
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs text-gray-900 arabic-spacing text-right">
                          {assignment.actual_amount &&
                          assignment.actual_amount > 0
                            ? formatCurrency(assignment.actual_amount)
                            : "-"}
                        </div>
                      </td>

                      {/* Invoices Count */}
                      <td className="px-3 py-2 border-r border-gray-200 text-center">
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
                      <td className="px-3 py-2 border-r border-gray-200 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            statusColors[
                              assignment.status as keyof typeof statusColors
                            ] || statusColors.active
                          }`}
                        >
                          {statusLabels[
                            assignment.status as keyof typeof statusLabels
                          ] || assignment.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center space-x-1 space-x-reverse">
                          {/* Add Invoice */}
                          <Button
                            onClick={() =>
                              !isInvoiceButtonDisabled &&
                              onAddInvoice(assignment)
                            }
                            className={`w-7 h-7 p-0 rounded border transition-colors ${
                              isInvoiceButtonDisabled
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                            }`}
                            disabled={isInvoiceButtonDisabled}
                            title={
                              isInvoiceButtonDisabled
                                ? "الميزانية مستنفدة"
                                : "إضافة فاتورة"
                            }
                          >
                            <Receipt className="h-3 w-3 no-flip" />
                          </Button>

                          {/* View Invoices */}
                          <Button
                            onClick={() => onViewInvoices(assignment)}
                            className="w-7 h-7 p-0 rounded border bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="عرض الفواتير"
                          >
                            <Eye className="h-3 w-3 no-flip" />
                          </Button>

                          {/* Edit */}
                          <Button
                            onClick={() =>
                              !isEditDeleteProtected &&
                              onEditAssignment(assignment)
                            }
                            className={`w-7 h-7 p-0 rounded border transition-colors ${
                              isEditDeleteProtected
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                            }`}
                            disabled={isEditDeleteProtected}
                            title={
                              isEditDeleteProtected
                                ? "لا يمكن التعديل"
                                : "تعديل"
                            }
                          >
                            <Edit className="h-3 w-3 no-flip" />
                          </Button>

                          {/* Delete */}
                          <Button
                            onClick={() =>
                              !isEditDeleteProtected &&
                              onDeleteAssignment(assignment.id)
                            }
                            className={`w-7 h-7 p-0 rounded border transition-colors ${
                              isEditDeleteProtected
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                            }`}
                            disabled={isEditDeleteProtected}
                            title={
                              isEditDeleteProtected ? "لا يمكن الحذف" : "حذف"
                            }
                          >
                            <Trash2 className="h-3 w-3 no-flip" />
                          </Button>
                        </div>
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
                    {formatCurrency(
                      sortedAssignments.reduce(
                        (sum, a) => sum + a.estimated_amount,
                        0
                      )
                    )}
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
                    {formatCurrency(
                      sortedAssignments.reduce(
                        (sum, a) =>
                          sum + (a.estimated_amount - (a.actual_amount || 0)),
                        0
                      )
                    )}
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
                  {Math.round(
                    (sortedAssignments.reduce(
                      (sum, a) => sum + (a.actual_amount || 0),
                      0
                    ) /
                      sortedAssignments.reduce(
                        (sum, a) => sum + a.estimated_amount,
                        0
                      )) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (sortedAssignments.reduce(
                          (sum, a) => sum + (a.actual_amount || 0),
                          0
                        ) /
                          sortedAssignments.reduce(
                            (sum, a) => sum + a.estimated_amount,
                            0
                          )) *
                          100
                      )
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
