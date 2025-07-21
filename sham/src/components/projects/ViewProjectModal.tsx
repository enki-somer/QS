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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Project } from "@/types";
import { EnhancedInvoice } from "@/types/shared";

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
  if (!isOpen) return null;

  const totalInvoiced = invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  );
  const completionPercentage = Math.round(
    (totalInvoiced / project.budgetEstimate) * 100
  );
  const remainingBudget = project.budgetEstimate - totalInvoiced;

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
                        {formatCurrency(totalInvoiced)}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing">
                        المفوتر
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
