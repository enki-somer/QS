"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import {
  Banknote,
  Calendar,
  FileText,
  Printer,
  X,
  History,
  DollarSign,
  User,
} from "lucide-react";

interface FundingReceiptModalProps {
  isOpen: boolean;
  transaction: any; // Safe funding transaction object
  onClose: () => void;
}

const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null || isNaN(Number(amount)))
    return "0 د.ع";
  try {
    return `${Number(amount).toLocaleString("en-US")} د.ع`;
  } catch {
    return `${amount} د.ع`;
  }
};

const formatDate = (date: string | Date) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function FundingReceiptModal({
  isOpen,
  transaction,
  onClose,
}: FundingReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const invoiceNumber = `FUND-${(transaction.date
    ? new Date(transaction.date)
    : new Date()
  )
    .toISOString()
    .slice(0, 10)}-${String(transaction.id || "")
    .slice(-6)
    .toUpperCase()}`;

  const buildPrintHTML = (): string => {
    const dateStr = formatDate(transaction.date || new Date());
    const projectRow = transaction.projectName
      ? `<div class=\"row\"><span>المشروع:</span><strong>${transaction.projectName}</strong></div>`
      : "";
    const hasProject = Boolean(
      transaction.projectName || (transaction as any).project_id
    );
    const batchRow =
      hasProject && transaction.batch_number
        ? `<div class=\"row\"><span>رقم الدفعة:</span><strong>${transaction.batch_number}</strong></div>`
        : "";
    const sourceRow = transaction.funding_source
      ? `<div class=\"row\"><span>مصدر التمويل:</span><strong>${transaction.funding_source}</strong></div>`
      : "";
    const notesRow = transaction.funding_notes
      ? `<div class=\"row\"><span>ملاحظات:</span><strong>${transaction.funding_notes}</strong></div>`
      : "";

    return `<!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>سند تمويل الخزينة - ${invoiceNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; color: #111827; }
          .container { max-width: 860px; margin: 32px auto; padding: 0 16px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); overflow: hidden; }
          .card-body { padding: 28px; }
          .header { text-align: center; padding: 24px 0 12px; }
          .title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
          .subtitle { color: #4b5563; }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 10px; padding: 8px 12px; margin-top: 14px; font-weight: 600; }
          .section { margin-top: 20px; }
          .section-title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #111827; margin-bottom: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .panel { border: 1px solid #e5e7eb; background: #f9fafb; border-radius: 12px; padding: 16px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; }
          .row:last-child { border-bottom: 0; }
          .row span { color: #6b7280; }
          .row strong { color: #111827; }
          .amount { color: #065f46; font-weight: 800; font-size: 18px; }
          .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .sign { text-align: center; padding-top: 18px; border-top: 1px solid #9ca3af; color: #6b7280; }
          .foot { margin-top: 18px; text-align: center; color: #6b7280; font-size: 12px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .container { margin: 0; max-width: 100%; }
            .card { box-shadow: none; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">شركة قصر الشام</div>
            <div class="subtitle">نظام إدارة الموارد المالية</div>
            <div class="badge">تم إضافة التمويل إلى الخزينة</div>
          </div>
          <div class="card">
            <div class="card-body">
              <div class="grid">
                <div class="section">
                  <div class="section-title">تفاصيل السند</div>
                  <div class="panel">
                    <div class="row"><span>رقم السند:</span><strong>${invoiceNumber}</strong></div>
                    <div class="row"><span>تاريخ التمويل:</span><strong>${dateStr}</strong></div>
                    ${projectRow}
                    ${batchRow}
                  </div>
                </div>
                <div class="section">
                  <div class="section-title">تفاصيل المبلغ</div>
                  <div class="panel">
                    <div class="row"><span>المبلغ المضاف:</span><strong class="amount">${formatCurrency(
                      transaction.amount
                    )}</strong></div>
                    <div class="row"><span>الرصيد السابق:</span><strong>${formatCurrency(
                      transaction.previousBalance ||
                        transaction.previous_balance
                    )}</strong></div>
                    <div class="row"><span>الرصيد الجديد:</span><strong>${formatCurrency(
                      transaction.newBalance || transaction.new_balance
                    )}</strong></div>
                  </div>
                </div>
              </div>
              <div class="section">
                <div class="section-title">وصف التمويل ومصدره</div>
                <div class="panel">
                  <div class="row"><span>الوصف:</span><strong>${
                    transaction.description || "-"
                  }</strong></div>
                  ${sourceRow}
                </div>
              </div>
              ${
                transaction.funding_notes
                  ? `
              <div class="section">
                <div class="section-title">ملاحظات التمويل</div>
                <div class="panel" style="background:#ffffff; border-color:#fde68a;">
                  <div style="white-space:pre-wrap; line-height:1.8; color:#111827;">${transaction.funding_notes}</div>
                </div>
              </div>`
                  : ""
              }
              <div class="signs">
                <div class="sign">توقيع المحاسب</div>
                <div class="sign">توقيع المدير المالي</div>
              </div>
              <div class="foot">تم إنشاء هذا السند تلقائياً بواسطة نظام قصر الشام للإدارة المالية<br/>تاريخ الإنشاء: ${new Date().toLocaleString(
                "en-US"
              )}</div>
            </div>
          </div>
        </div>
      </body>
    </html>`;
  };

  const openPrintWindow = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildPrintHTML());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      // Close after print in most browsers
      try {
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      } catch {}
    }, 300);
  };

  const handlePrint = () => {
    openPrintWindow();
  };

  // Download option removed per request

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative pointer-events-auto"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 text-white print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Banknote className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-xl font-bold arabic-spacing">
                  سند تمويل الخزينة
                </h2>
                <p className="text-green-100 text-sm arabic-spacing">
                  رقم السند: {invoiceNumber}
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
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="h-5 w-5 no-flip" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          id="funding-receipt-content"
          className="p-8 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto pointer-events-auto"
          style={{ maxHeight: "calc(90vh - 140px)" }}
        >
          {/* Company Header */}
          <div className="text-center border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 arabic-spacing mb-2">
              شركة قصر الشام
            </h1>
            <p className="text-gray-600 arabic-spacing">
              نظام إدارة الموارد المالية
            </p>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
              <div className="flex items-center space-x-2 space-x-reverse">
                <DollarSign className="h-5 w-5 text-green-600 no-flip" />
                <span className="text-green-700 font-medium arabic-spacing">
                  تم إضافة التمويل إلى الخزينة
                </span>
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <Calendar className="h-5 w-5 ml-2 text-blue-600 no-flip" />
                تفاصيل السند
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم السند:</span>
                  <span className="font-medium text-black">
                    {invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ التمويل:</span>
                  <span className="font-medium text-black">
                    {formatDate(transaction.date || new Date())}
                  </span>
                </div>
                {transaction.projectName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">المشروع:</span>
                    <span className="font-medium text-black">
                      {transaction.projectName}
                    </span>
                  </div>
                )}
                {Boolean(
                  transaction.projectName ||
                    (transaction as any).projectId ||
                    (transaction as any).project_id
                ) &&
                  transaction.batch_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">رقم الدفعة:</span>
                      <span className="font-medium text-black">
                        {transaction.batch_number}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <Banknote className="h-5 w-5 ml-2 text-green-600 no-flip" />
                تفاصيل المبلغ
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">المبلغ المضاف:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الرصيد السابق:</span>
                  <span className="font-medium text-black">
                    {formatCurrency(
                      transaction.previousBalance ||
                        transaction.previous_balance
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الرصيد الجديد:</span>
                  <span className="font-medium text-black">
                    {formatCurrency(
                      transaction.newBalance || transaction.new_balance
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <FileText className="h-5 w-5 ml-2 text-blue-600 no-flip" />
              وصف التمويل ومصدره
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">الوصف:</span>
                <span className="font-medium text-gray-900">
                  {transaction.description}
                </span>
              </div>
            </div>
            {transaction.funding_notes && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                  <FileText className="h-5 w-5 ml-2 text-amber-600 no-flip" />
                  ملاحظات التمويل
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap arabic-spacing">
                    {transaction.funding_notes}
                  </p>
                </div>
              </div>
            )}
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
                    توقيع المدير المالي
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-6 text-xs text-gray-500 arabic-spacing">
              <p>
                تم إنشاء هذا السند تلقائياً بواسطة نظام قصر الشام للإدارة
                المالية
              </p>
              <p>تاريخ الإنشاء: {new Date().toLocaleString("en-US")}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Printer className="h-4 w-4 ml-2 no-flip" />
              طباعة السند
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
