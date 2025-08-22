/**
 * @deprecated ViewProjectModal is no longer used
 *
 * This component has been replaced by the ProjectDetailClient page.
 * All project viewing now happens via navigation to /projects/[id]
 * instead of opening this modal.
 *
 * See: sham/src/app/projects/[id]/ProjectDetailClient.tsx
 *
 * This file can be safely removed in the future.
 */

import React from "react";
import {
  X,
  Edit,
  Plus,
  Printer,
  Eye,
  FileText,
  Calendar,
  MapPin,
  User,
  DollarSign,
  Building2,
  Clock,
  Ruler,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Project } from "@/types";
import { EnhancedInvoice } from "@/types/shared";
import { useSafe } from "@/contexts/SafeContext";

interface ViewProjectModalProps {
  isOpen: boolean;
  project: Project;
  invoices: EnhancedInvoice[];
  onClose: () => void;
  onEdit: () => void;
  onCreateInvoice: () => void;
  onPrintInvoice: (invoice: EnhancedInvoice) => void;
  onPreviewInvoice: (invoice: EnhancedInvoice) => void;
}

const statusColors = {
  planning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  planning: "في مرحلة التخطيط",
  active: "نشط ومستمر",
  completed: "مكتمل بنجاح",
  cancelled: "ملغي أو متوقف",
};

export default function ViewProjectModal({
  isOpen,
  project,
  invoices,
  onClose,
  onEdit,
  onCreateInvoice,
  onPrintInvoice,
  onPreviewInvoice,
}: ViewProjectModalProps) {
  const { safeState } = useSafe();

  if (!isOpen) return null;

  // Calculate actual amounts from category assignments (approved invoices)
  const actualSpent = project.categoryAssignments
    ? project.categoryAssignments.reduce(
        (sum: number, assignment: any) => sum + (assignment.actual_amount || 0),
        0
      )
    : 0;

  const completionPercentage = Math.round(
    (actualSpent / project.budgetEstimate) * 100
  );
  const remainingBudget = project.budgetEstimate - actualSpent;

  // Calculate project's impact on safe
  const projectTransactions = safeState.transactions.filter(
    (transaction) => transaction.projectId === project.id
  );
  const projectTotalSpent = projectTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0
  );
  const safeImpactPercentage =
    safeState.totalSpent > 0
      ? Math.round((projectTotalSpent / safeState.totalSpent) * 100)
      : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Enhanced Header */}
        <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-[#182C61] to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse text-white">
              <div className="bg-white/20 p-3 rounded-xl">
                <Building2 className="h-8 w-8 no-flip" />
              </div>
              <div>
                <h3 className="text-2xl font-bold arabic-spacing">
                  {project.name}
                </h3>
                <p className="text-blue-100 arabic-spacing mt-1">
                  كود المشروع: {project.code}
                </p>
                <div className="flex items-center space-x-4 space-x-reverse mt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      statusColors[project.status]
                    } bg-white/90`}
                  >
                    {statusLabels[project.status]}
                  </span>
                  <span className="text-blue-200 text-sm arabic-spacing">
                    آخر تحديث: {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse ">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="text-black border-white/30 hover:bg-white/20 hover:text-white"
                title="تعديل معلومات المشروع"
              >
                <Edit className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">تعديل المشروع</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 text-white hover:bg-white/20"
                title="إغلاق النافذة"
              >
                <X className="h-5 w-5 no-flip" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Project Information */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                <h4 className="text-xl font-bold text-gray-800 arabic-spacing mb-6 flex items-center">
                  <Building2 className="h-6 w-6 ml-2 text-[#182C61] no-flip" />
                  معلومات المشروع
                </h4>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <MapPin className="h-5 w-5 text-[#182C61] no-flip" />
                        <label className="text-sm font-medium text-gray-600 arabic-spacing">
                          الموقع
                        </label>
                      </div>
                      <p className="text-gray-900 font-medium arabic-spacing">
                        {project.location}
                      </p>
                    </div>

                    {project.area && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                          <Ruler className="h-5 w-5 text-[#182C61] no-flip" />
                          <label className="text-sm font-medium text-gray-600 arabic-spacing">
                            المساحة
                          </label>
                        </div>
                        <p className="text-gray-900 font-medium">
                          📐{" "}
                          {new Intl.NumberFormat("ar-IQ", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(project.area)}{" "}
                          متر مربع
                        </p>
                      </div>
                    )}

                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <User className="h-5 w-5 text-[#182C61] no-flip" />
                        <label className="text-sm font-medium text-gray-600 arabic-spacing">
                          العميل
                        </label>
                      </div>
                      <p className="text-gray-900 font-medium arabic-spacing">
                        {project.client}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <Calendar className="h-5 w-5 text-[#182C61] no-flip" />
                        <label className="text-sm font-medium text-gray-600 arabic-spacing">
                          تاريخ البدء
                        </label>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {formatDate(project.startDate)}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <Calendar className="h-5 w-5 text-[#182C61] no-flip" />
                        <label className="text-sm font-medium text-gray-600 arabic-spacing">
                          تاريخ الانتهاء
                        </label>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {formatDate(project.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <DollarSign className="h-5 w-5 text-[#182C61] no-flip" />
                      <label className="text-sm font-medium text-gray-600 arabic-spacing">
                        الميزانية المقدرة
                      </label>
                    </div>
                    <p className="text-2xl font-bold text-[#182C61]">
                      {formatCurrency(project.budgetEstimate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Project Category Assignments */}
              {project.categoryAssignments &&
                project.categoryAssignments.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
                    <h4 className="text-xl font-bold text-gray-800 arabic-spacing mb-6 flex items-center">
                      <Building2 className="h-6 w-6 ml-2 text-green-600 no-flip" />
                      فئات المشروع والمقاولون
                    </h4>

                    <div className="space-y-4">
                      {/* Group assignments by subcategory */}
                      {(() => {
                        const groupedAssignments: { [key: string]: any[] } = {};
                        project.categoryAssignments.forEach(
                          (assignment: any) => {
                            const key = `${assignment.main_category}-${assignment.subcategory}`;
                            if (!groupedAssignments[key]) {
                              groupedAssignments[key] = [];
                            }
                            groupedAssignments[key].push(assignment);
                          }
                        );

                        return Object.entries(groupedAssignments).map(
                          ([key, assignments], index) => {
                            const firstAssignment = assignments[0];
                            const totalAmount = assignments.reduce(
                              (sum, a) => sum + (a.estimated_amount || 0),
                              0
                            );

                            // Color scheme for each category
                            const colorSchemes = [
                              {
                                bg: "bg-blue-50",
                                border: "border-blue-200",
                                text: "text-blue-800",
                                dot: "bg-blue-500",
                              },
                              {
                                bg: "bg-purple-50",
                                border: "border-purple-200",
                                text: "text-purple-800",
                                dot: "bg-purple-500",
                              },
                              {
                                bg: "bg-orange-50",
                                border: "border-orange-200",
                                text: "text-orange-800",
                                dot: "bg-orange-500",
                              },
                              {
                                bg: "bg-teal-50",
                                border: "border-teal-200",
                                text: "text-teal-800",
                                dot: "bg-teal-500",
                              },
                              {
                                bg: "bg-pink-50",
                                border: "border-pink-200",
                                text: "text-pink-800",
                                dot: "bg-pink-500",
                              },
                              {
                                bg: "bg-indigo-50",
                                border: "border-indigo-200",
                                text: "text-indigo-800",
                                dot: "bg-indigo-500",
                              },
                            ];
                            const colorScheme =
                              colorSchemes[index % colorSchemes.length];

                            return (
                              <div
                                key={key}
                                className={`${colorScheme.bg} ${colorScheme.border} border rounded-xl p-4 relative`}
                              >
                                {/* Decorative accent */}
                                <div
                                  className={`absolute top-0 left-0 w-1 h-full ${colorScheme.dot} rounded-r`}
                                ></div>

                                {/* Category Header */}
                                <div className="flex justify-between items-start mb-3 pr-3">
                                  <div className="flex-1">
                                    <h5
                                      className={`font-bold text-lg ${colorScheme.text} arabic-spacing`}
                                    >
                                      {firstAssignment.subcategory}
                                    </h5>
                                    <p
                                      className={`text-sm ${colorScheme.text} opacity-75 arabic-spacing mt-1`}
                                    >
                                      📋 {firstAssignment.main_category}
                                    </p>
                                  </div>
                                  <div className="text-left">
                                    <p
                                      className={`text-lg font-bold ${colorScheme.text}`}
                                    >
                                      {new Intl.NumberFormat("ar-IQ").format(
                                        totalAmount
                                      )}{" "}
                                      د.ع
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      إجمالي تقديري
                                    </p>
                                  </div>
                                </div>

                                {/* Contractors List */}
                                <div className="space-y-2">
                                  {assignments.map(
                                    (assignment, contractorIndex) => (
                                      <div
                                        key={contractorIndex}
                                        className="bg-white/80 rounded-lg p-3 flex items-center justify-between"
                                      >
                                        <div className="flex items-center space-x-3 space-x-reverse">
                                          <div
                                            className={`w-3 h-3 ${colorScheme.dot} rounded-full`}
                                          ></div>
                                          <div>
                                            <span className="font-semibold text-gray-900 arabic-spacing">
                                              {assignment.contractor_name}
                                            </span>
                                            {assignment.notes && (
                                              <p className="text-xs text-gray-600 arabic-spacing mt-1">
                                                📝 {assignment.notes}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-left">
                                          <span className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded text-sm">
                                            {new Intl.NumberFormat(
                                              "ar-IQ"
                                            ).format(
                                              assignment.estimated_amount
                                            )}{" "}
                                            د.ع
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>

                                {/* Summary for this subcategory */}
                                <div className="mt-3 pt-3 border-t border-white/50">
                                  <div className="flex justify-between items-center text-sm">
                                    <span
                                      className={`${colorScheme.text} arabic-spacing`}
                                    >
                                      المقاولون: {assignments.length}
                                    </span>
                                    <span
                                      className={`font-bold ${colorScheme.text}`}
                                    >
                                      المجموع:{" "}
                                      {new Intl.NumberFormat("ar-IQ").format(
                                        totalAmount
                                      )}{" "}
                                      د.ع
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        );
                      })()}

                      {/* Overall Summary */}
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 border-2 border-green-300">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <DollarSign className="h-5 w-5 text-green-700 no-flip" />
                            <span className="font-bold text-green-800 arabic-spacing">
                              إجمالي تقديرات المقاولين
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-green-800">
                            {new Intl.NumberFormat("ar-IQ").format(
                              project.categoryAssignments.reduce(
                                (sum: number, assignment: any) =>
                                  sum + (assignment.estimated_amount || 0),
                                0
                              )
                            )}{" "}
                            د.ع
                          </span>
                        </div>
                        <p className="text-sm text-green-700 arabic-spacing mt-2">
                          هذه تقديرات أولية للمقاولين - المبالغ الفعلية ستُحدث
                          عند إنشاء الفواتير
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Project Progress */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                <h4 className="text-xl font-bold text-gray-800 arabic-spacing mb-6 flex items-center">
                  <Clock className="h-6 w-6 ml-2 text-blue-600 no-flip" />
                  تقدم المشروع
                </h4>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700 arabic-spacing">
                      نسبة الإنجاز
                    </span>
                    <span className="text-3xl font-bold text-blue-600">
                      {completionPercentage}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-800 h-4 rounded-full transition-all duration-700 shadow-sm"
                      style={{
                        width: `${Math.min(completionPercentage, 100)}%`,
                      }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(actualSpent)}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing">
                        المنفذ فعلياً
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(remainingBudget)}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing">
                        المتبقي
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {invoices.length}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing">
                        فاتورة
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simplified Financial Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                <h4 className="text-xl font-bold text-gray-800 arabic-spacing mb-6 flex items-center">
                  <Wallet className="h-6 w-6 ml-2 text-blue-600 no-flip" />
                  الملخص المالي للمشروع
                </h4>

                {/* Key Financial Metrics - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xl font-bold text-blue-600 mb-1">
                      {formatCurrency(project.budgetEstimate)}
                    </div>
                    <div className="text-sm text-gray-600 arabic-spacing">
                      الميزانية المعتمدة
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xl font-bold text-green-600 mb-1">
                      {formatCurrency(actualSpent)}
                    </div>
                    <div className="text-sm text-gray-600 arabic-spacing">
                      المنفذ فعلياً
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xl font-bold text-orange-600 mb-1">
                      {formatCurrency(remainingBudget)}
                    </div>
                    <div className="text-sm text-gray-600 arabic-spacing">
                      المتبقي
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xl font-bold text-purple-600 mb-1">
                      {completionPercentage}%
                    </div>
                    <div className="text-sm text-gray-600 arabic-spacing">
                      نسبة الإنجاز
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 arabic-spacing">
                      تقدم المشروع
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(completionPercentage, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Safe Impact & Assignment Stats - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/70 rounded-xl p-4">
                    <h6 className="font-semibold text-gray-800 arabic-spacing mb-3 flex items-center">
                      <Wallet className="h-4 w-4 ml-2 text-emerald-600 no-flip" />
                      تأثير على الخزينة
                    </h6>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 arabic-spacing">
                          المنصرف من الخزينة:
                        </span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(projectTotalSpent)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 arabic-spacing">
                          رصيد الخزينة الحالي:
                        </span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(safeState.currentBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/70 rounded-xl p-4">
                    <h6 className="font-semibold text-gray-800 arabic-spacing mb-3 flex items-center">
                      <Building2 className="h-4 w-4 ml-2 text-blue-600 no-flip" />
                      إحصائيات المشروع
                    </h6>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 arabic-spacing">
                          إجمالي التعيينات:
                        </span>
                        <span className="font-bold text-blue-600">
                          {project.categoryAssignments?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 arabic-spacing">
                          الفواتير:
                        </span>
                        <span className="font-bold text-green-600">
                          {invoices.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget Status Alert */}
                {(() => {
                  const categoryEstimated = project.categoryAssignments
                    ? project.categoryAssignments.reduce(
                        (sum: number, assignment: any) =>
                          sum + (assignment.estimated_amount || 0),
                        0
                      )
                    : 0;
                  const budgetDifference =
                    project.budgetEstimate - categoryEstimated;
                  const isOverBudget = budgetDifference < 0;

                  return (
                    <div
                      className={`mt-4 p-3 rounded-lg flex items-center justify-between ${
                        isOverBudget
                          ? "bg-red-50 border border-red-200"
                          : "bg-green-50 border border-green-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {isOverBudget ? (
                          <AlertTriangle className="h-5 w-5 text-red-600 no-flip" />
                        ) : (
                          <Shield className="h-5 w-5 text-green-600 no-flip" />
                        )}
                        <span
                          className={`text-sm font-medium arabic-spacing ${
                            isOverBudget ? "text-red-700" : "text-green-700"
                          }`}
                        >
                          {isOverBudget
                            ? "تجاوز في التقديرات"
                            : "التقديرات ضمن الميزانية"}
                        </span>
                      </div>
                      <span
                        className={`font-bold ${
                          isOverBudget ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isOverBudget ? "-" : "+"}
                        {formatCurrency(Math.abs(budgetDifference))}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Invoices Section */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-gray-800 arabic-spacing flex items-center">
                    <FileText className="h-6 w-6 ml-2 text-green-600 no-flip" />
                    الفواتير ({invoices.length})
                  </h4>
                  <Button
                    size="sm"
                    onClick={onCreateInvoice}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    title="إنشاء فاتورة جديدة لهذا المشروع"
                  >
                    <Plus className="h-4 w-4 ml-2 no-flip" />
                    <span className="arabic-spacing">فاتورة جديدة</span>
                  </Button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {invoices.length > 0 ? (
                    invoices
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .map((invoice) => {
                        const subtotal = invoice.amount;
                        const tax = invoice.taxPercentage
                          ? (subtotal * invoice.taxPercentage) / 100
                          : 0;
                        const discount = invoice.discountAmount || 0;
                        const total = subtotal + tax - discount;

                        return (
                          <div
                            key={invoice.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <div className="bg-green-100 p-2 rounded-lg">
                                  <FileText className="h-4 w-4 text-green-600 no-flip" />
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">
                                    {invoice.invoiceNumber}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatDate(invoice.date)}
                                  </div>
                                </div>
                              </div>

                              <div className="text-left">
                                <div className="text-xl font-bold text-green-600">
                                  {formatCurrency(total)}
                                </div>
                                {(tax > 0 || discount > 0) && (
                                  <div className="text-xs text-gray-500">
                                    أساسي: {formatCurrency(subtotal)}
                                  </div>
                                )}
                                {/* Status indicator */}
                                <div className="mt-1">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full arabic-spacing ${
                                      invoice.status === "pending_approval"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : invoice.status === "paid"
                                        ? "bg-green-100 text-green-700"
                                        : invoice.status === "approved"
                                        ? "bg-blue-100 text-blue-700"
                                        : invoice.status === "rejected"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {invoice.status === "pending_approval"
                                      ? "بانتظار الموافقة"
                                      : invoice.status === "paid"
                                      ? "تم الدفع"
                                      : invoice.status === "approved"
                                      ? "معتمد"
                                      : invoice.status === "rejected"
                                      ? "مرفوض"
                                      : "تم الإنشاء"}
                                  </span>
                                  {/* Attachment indicator - company use only */}
                                  {invoice.attachmentUrl && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 mr-1 arabic-spacing">
                                      📎 مرفق
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className="text-gray-700 text-sm arabic-spacing mb-3 line-clamp-2">
                              {invoice.notes}
                            </p>

                            {/* Additional Invoice Details */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {invoice.taxPercentage && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  ضريبة {invoice.taxPercentage}%
                                </span>
                              )}
                              {invoice.discountAmount && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                  خصم {formatCurrency(invoice.discountAmount)}
                                </span>
                              )}
                              {invoice.paymentTerms && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full arabic-spacing">
                                  {invoice.paymentTerms}
                                </span>
                              )}
                              {invoice.customFields &&
                                invoice.customFields.length > 0 && (
                                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                    {invoice.customFields.length} حقل مخصص
                                  </span>
                                )}
                            </div>

                            <div className="flex space-x-2 space-x-reverse pt-3 border-t border-gray-100">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPreviewInvoice(invoice)}
                                className="flex-1 hover:border-blue-500 hover:text-blue-600"
                                title="معاينة الفاتورة"
                              >
                                <Eye className="h-4 w-4 ml-1 no-flip" />
                                <span className="arabic-spacing">معاينة</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPrintInvoice(invoice)}
                                className="flex-1 hover:border-green-500 hover:text-green-600"
                                title="طباعة الفاتورة"
                              >
                                <Printer className="h-4 w-4 ml-1 no-flip" />
                                <span className="arabic-spacing">طباعة</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 no-flip" />
                      <p className="text-lg arabic-spacing">
                        لا توجد فواتير بعد
                      </p>
                      <p className="text-sm arabic-spacing">
                        اضغط "فاتورة جديدة" لإنشاء أول فاتورة
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="p-8 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 arabic-spacing">
              <span className="font-medium">تم إنشاء المشروع:</span>{" "}
              {formatDate(project.createdAt)}
            </div>

            <div className="flex space-x-4 space-x-reverse">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-8 py-3 text-base"
              >
                <span className="arabic-spacing">إغلاق</span>
              </Button>

              <Button
                onClick={onEdit}
                className="px-8 py-3 text-base bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700"
              >
                <Edit className="h-5 w-5 ml-2 no-flip" />
                <span className="arabic-spacing">تعديل المشروع</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
