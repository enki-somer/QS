"use client";

import React from "react";
import {
  X,
  Download,
  Printer,
  Calendar,
  User,
  Building2,
  Receipt,
  Banknote,
  FileText,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Employee } from "@/types";

interface SalaryPaymentInvoiceProps {
  employee: Employee;
  paymentData: {
    amount: number;
    payment_type: "full" | "installment";
    installment_amount?: number;
    reason?: string;
    is_full_payment: boolean;
    payment_date: string;
    invoice_number: string;
  };
  onClose: () => void;
}

export function SalaryPaymentInvoice({
  employee,
  paymentData,
  onClose,
}: SalaryPaymentInvoiceProps) {
  // Format currency for display
  const formatCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "0 د.ع";
    }
    return amount.toLocaleString("en-US") + " د.ع";
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Print invoice
  const handlePrint = () => {
    // Add a small delay to ensure modal is fully rendered
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Download invoice as PDF using browser print
  const handleDownload = () => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const element = document.getElementById("salary-invoice-content");
    if (!element) return;

    // Get the invoice content
    const invoiceContent = element.innerHTML;

    // Create print-friendly HTML
    const printHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة راتب - ${employee.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
          .print-container { max-width: 800px; margin: 20px auto; padding: 20px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 1.125rem; }
          .text-xl { font-size: 1.25rem; }
          .text-2xl { font-size: 1.5rem; }
          .text-3xl { font-size: 1.875rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .p-4 { padding: 1rem; }
          .border { border: 1px solid #e5e7eb; }
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .rounded-lg { border-radius: 0.5rem; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-green-50 { background-color: #f0fdf4; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-900 { color: #111827; }
          .text-green-700 { color: #15803d; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-6 { gap: 1.5rem; }
          .space-y-3 > * + * { margin-top: 0.75rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          @media print {
            body { print-color-adjust: exact; }
            .print-container { margin: 0; max-width: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${invoiceContent}
        </div>
      </body>
      </html>
    `;

    // Write content and print
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative pointer-events-auto"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Receipt className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-xl font-bold arabic-spacing">
                  فاتورة دفع راتب
                </h2>
                <p className="text-blue-100 text-sm arabic-spacing">
                  رقم الفاتورة: {paymentData.invoice_number}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <Printer className="h-5 w-5 no-flip" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <Download className="h-5 w-5 no-flip" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="h-5 w-5 no-flip" />
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice Content */}
        <div
          id="salary-invoice-content"
          className="p-8 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto pointer-events-auto"
          style={{ maxHeight: "calc(90vh - 140px)" }}
        >
          {/* Company Header */}
          <div className="text-center border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 arabic-spacing mb-2">
              شركة قصر الشام
            </h1>
            <p className="text-gray-600 arabic-spacing">
              نظام إدارة الموارد البشرية والمالية
            </p>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
              <div className="flex items-center space-x-2 space-x-reverse">
                <CheckCircle className="h-5 w-5 text-green-600 no-flip" />
                <span className="text-green-700 font-medium arabic-spacing">
                  تم الدفع بنجاح
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - Employee Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <User className="h-5 w-5 ml-2 text-blue-600 no-flip" />
                بيانات الموظف
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">الاسم:</span>
                  <span className="font-medium">{employee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المنصب:</span>
                  <span className="font-medium">
                    {employee.position || "غير محدد"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">القسم:</span>
                  <span className="font-medium">
                    {employee.department || "غير محدد"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الموظف:</span>
                  <span className="font-medium">{employee.id.slice(-8)}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <Calendar className="h-5 w-5 ml-2 text-green-600 no-flip" />
                تفاصيل الدفع
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الفاتورة:</span>
                  <span className="font-medium">
                    {paymentData.invoice_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ الدفع:</span>
                  <span className="font-medium">
                    {formatDate(paymentData.payment_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع الدفع:</span>
                  <span className="font-medium">
                    {paymentData.payment_type === "full" ? "دفع كامل" : "قسط"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">حالة الدفع:</span>
                  <span className="font-medium text-green-600">
                    {paymentData.is_full_payment ? "مكتمل" : "جزئي"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <Banknote className="h-5 w-5 ml-2 text-green-600 no-flip" />
              تفاصيل المبلغ
            </h3>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="text-gray-700 font-medium">
                    الراتب الشهري:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(employee.monthly_salary || 0)}
                  </span>
                </div>

                {paymentData.payment_type === "installment" && (
                  <div className="flex justify-between items-center py-2 border-b border-green-200">
                    <span className="text-gray-700 font-medium">
                      مبلغ القسط:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(paymentData.installment_amount || 0)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 bg-green-100 rounded-lg px-4 border-2 border-green-300">
                  <span className="text-green-700 font-bold text-lg">
                    💰 إجمالي المبلغ المدفوع:
                  </span>
                  <span className="font-bold text-green-700 text-2xl">
                    {formatCurrency(paymentData.amount)}
                  </span>
                </div>

                {!paymentData.is_full_payment && (
                  <div className="flex justify-between items-center py-2 text-orange-600">
                    <span className="font-medium">المبلغ المتبقي:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        (employee.monthly_salary || 0) - paymentData.amount
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Reason */}
          {paymentData.reason && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <FileText className="h-5 w-5 ml-2 text-blue-600 no-flip" />
                ملاحظات الدفع
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 arabic-spacing">
                  {paymentData.reason}
                </p>
              </div>
            </div>
          )}

          {/* Print Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 print:hidden">
            <div className="flex items-center justify-center space-x-4 space-x-reverse">
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
              >
                <Printer className="h-5 w-5 ml-2 no-flip" />
                طباعة الفاتورة الآن
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 text-lg"
              >
                <Download className="h-5 w-5 ml-2 no-flip" />
                تحميل PDF
              </Button>
            </div>
            <p className="text-center text-sm text-blue-600 mt-2 arabic-spacing">
              اضغط على "طباعة الفاتورة الآن" لطباعة هذه الفاتورة
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-8">
                  <p className="text-sm text-gray-600 arabic-spacing">
                    توقيع المحاسب
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-8">
                  <p className="text-sm text-gray-600 arabic-spacing">
                    توقيع الموظف
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-6 text-xs text-gray-500 arabic-spacing">
              <p>
                تم إنشاء هذه الفاتورة تلقائياً بواسطة نظام قصر الشام للإدارة
                المالية
              </p>
              <p>تاريخ الإنشاء: {new Date().toLocaleString("en-US")}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="h-4 w-4 ml-2 no-flip" />
              طباعة الفاتورة
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 ml-2 no-flip" />
              تحميل PDF
            </Button>
          </div>
          <Button onClick={onClose} variant="outline">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
