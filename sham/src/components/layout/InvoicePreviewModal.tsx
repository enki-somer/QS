"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Building2,
  User as UserIcon,
  Calendar,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EnhancedInvoice } from "@/types/shared";
import {
  formatCurrency,
  formatDate,
  formatInvoiceNumber,
  formatProjectId,
} from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { useResponsive } from "@/hooks/useResponsive";

interface InvoicePreviewModalProps {
  invoice: EnhancedInvoice;
  onClose: () => void;
  onApprove: (invoice: EnhancedInvoice, reason?: string) => void;
  onReject: (invoice: EnhancedInvoice, reason: string) => void;
}

export default function InvoicePreviewModal({
  invoice,
  onClose,
  onApprove,
  onReject,
}: InvoicePreviewModalProps) {
  const { user } = useAuth();
  const { hasBalance } = useSafe();
  const { addToast } = useToast();
  const { isMobile, isTablet } = useResponsive();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

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

  const handleApprove = () => {
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
    onApprove(invoice);
    onClose();
  };

  const handleReject = () => {
    const reason =
      rejectionReason.trim() || "تم الرفض من المدير - يرجى مراجعة البيانات";
    onReject(invoice, reason);
    setShowRejectModal(false);
    setRejectionReason("");
    onClose();
  };

  // Check if invoice has attachment data
  const hasAttachment =
    !!(invoice as any).attachmentData ||
    !!(invoice as any).customerInvoiceNumber;

  // Debug log to verify attachment data
  console.log("🔍 Invoice Preview Debug:", {
    invoiceId: invoice.id,
    hasAttachmentData: !!(invoice as any).attachmentData,
    hasCustomerInvoiceNumber: !!(invoice as any).customerInvoiceNumber,
    attachmentType: (invoice as any).attachmentType,
    attachmentSize: (invoice as any).attachmentSize,
    customerInvoiceNumber: (invoice as any).customerInvoiceNumber,
    fullInvoiceObject: invoice, // Log the entire invoice object to see all fields
  });

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className={`bg-white rounded-xl w-full overflow-hidden shadow-2xl ${
            isMobile ? "max-w-full max-h-[98vh] mx-1" : "max-w-5xl max-h-[95vh]"
          }`}
        >
          {/* Header */}
          <div
            className={`bg-gradient-to-r from-blue-600 to-indigo-700 text-white ${
              isMobile ? "p-4" : "p-6"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div
                  className={`bg-white/20 rounded-lg ${
                    isMobile ? "p-2" : "p-3"
                  }`}
                >
                  <Building2
                    className={`no-flip ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
                  />
                </div>
                <div className="flex-1">
                  <h2
                    className={`font-bold arabic-spacing ${
                      isMobile ? "text-lg" : "text-2xl"
                    }`}
                  >
                    معاينة الفاتورة للاعتماد
                  </h2>
                  <p
                    className={`text-blue-100 arabic-spacing ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    فاتورة رقم: {formatInvoiceNumber(invoice.invoiceNumber)} •{" "}
                    {formatCurrency(invoice.amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                {hasAttachment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAttachmentModal(true)}
                    className={`text-white hover:bg-white/20 ${
                      isMobile ? "h-8 px-2 text-xs" : "h-10 px-3"
                    }`}
                    title="عرض المرفقات"
                  >
                    <ImageIcon
                      className={`no-flip ${
                        isMobile ? "h-4 w-4 ml-1" : "h-5 w-5 ml-1"
                      }`}
                    />
                    {!isMobile && (
                      <span className="arabic-spacing">المرفقات</span>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className={`p-0 text-white hover:bg-white/20 ${
                    isMobile ? "h-8 w-8" : "h-10 w-10"
                  }`}
                >
                  <X className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                </Button>
              </div>
            </div>
          </div>

          {/* Content - Exact Print Layout Preview */}
          <div
            className={`flex-1 overflow-y-auto ${
              isMobile ? "max-h-[70vh]" : "max-h-[60vh]"
            }`}
          >
            <div className={isMobile ? "p-3" : "p-6"}>
              {/* Exact Print Layout - Non-Printable Preview */}
              <div
                className={`bg-white border-2 border-gray-200 rounded-lg mx-auto shadow-sm ${
                  isMobile ? "max-w-full" : "max-w-4xl"
                }`}
                style={{
                  fontFamily:
                    "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  lineHeight: "1.6",
                  color: "#1a202c",
                  direction: "rtl",
                  textAlign: "right",
                  padding: isMobile ? "15px" : "30px",
                }}
              >
                {/* Invoice Header - Exact Match */}
                <div
                  className={isMobile ? "mb-4" : "mb-6"}
                  style={{
                    background:
                      "linear-gradient(135deg, #2e3192 0%, #4338ca 100%)",
                    color: "white",
                    padding: isMobile ? "20px" : "30px",
                    borderRadius: "12px",
                    boxShadow: "0 8px 25px rgba(46, 49, 146, 0.15)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: isMobile ? "15px" : "30px",
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        flex: "1",
                      }}
                    >
                      <div
                        style={{
                          width: "70px",
                          height: "70px",
                          background: "rgba(255, 255, 255, 0.15)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          flexShrink: "0",
                          padding: "8px",
                        }}
                      >
                        <Building2
                          className="h-8 w-8 text-white no-flip"
                          style={{ filter: "brightness(0) invert(1)" }}
                        />
                      </div>
                      <div>
                        <h1
                          style={{
                            fontSize: isMobile ? "20px" : "26px",
                            fontWeight: "700",
                            marginBottom: "8px",
                            textAlign: "right",
                          }}
                        >
                          قصر الشام للمشاريع الإنشائية
                        </h1>
                        <p
                          style={{
                            fontSize: "14px",
                            opacity: "0.9",
                            marginBottom: "6px",
                            textAlign: "right",
                          }}
                        >
                          Qasr Al-Sham Construction Projects
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            opacity: "0.8",
                            marginBottom: "3px",
                            textAlign: "right",
                          }}
                        >
                          العراق - بغداد | +964 XXX XXX XXXX
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            opacity: "0.8",
                            marginBottom: "3px",
                            textAlign: "right",
                          }}
                        >
                          info@qasralsham.com
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: isMobile ? "8px" : "12px",
                        minWidth: isMobile ? "100%" : "250px",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            opacity: "0.8",
                            fontWeight: "500",
                          }}
                        >
                          رقم الفاتورة
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            fontFamily: "'Cairo', monospace",
                          }}
                        >
                          {formatInvoiceNumber(invoice.invoiceNumber)}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            opacity: "0.8",
                            fontWeight: "500",
                          }}
                        >
                          تاريخ الفاتورة
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            fontFamily: "'Cairo', monospace",
                          }}
                        >
                          {formatDate(invoice.date)}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            opacity: "0.8",
                            fontWeight: "500",
                          }}
                        >
                          الفئة
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            fontFamily: "'Cairo', monospace",
                          }}
                        >
                          {(invoice as any).categoryName || "غير محدد"}
                        </span>
                      </div>

                      {(invoice as any).customerInvoiceNumber && (
                        <div
                          style={{
                            background: "rgba(255, 215, 0, 0.2)",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            border: "1px solid rgba(255, 215, 0, 0.4)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              opacity: "0.8",
                              fontWeight: "500",
                            }}
                          >
                            رقم فاتورة العميل
                          </span>
                          <span
                            style={{
                              fontSize: "16px",
                              fontWeight: "700",
                              fontFamily: "'Cairo', monospace",
                            }}
                          >
                            {(invoice as any).customerInvoiceNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div style={{ marginBottom: isMobile ? "20px" : "30px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: isMobile ? "15px" : "25px",
                    }}
                  >
                    {/* Project Card */}
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                        border: "2px solid #22c55e",
                        borderRadius: "12px",
                        padding: isMobile ? "15px" : "25px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <h3
                        style={{
                          color: "#1e293b",
                          fontSize: isMobile ? "16px" : "18px",
                          fontWeight: "700",
                          marginBottom: isMobile ? "15px" : "20px",
                          textAlign: "right",
                          borderBottom: "2px solid currentColor",
                          paddingBottom: "8px",
                        }}
                      >
                        تفاصيل المشروع
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#374151",
                            flex: "1",
                          }}
                        >
                          اسم المشروع:
                        </span>
                        <span
                          style={{
                            color: "#1f2937",
                            fontWeight: "500",
                            textAlign: "left",
                            flex: "1.5",
                          }}
                        >
                          {(invoice as any).projectName ||
                            getProjectName(invoice.projectId)}
                        </span>
                      </div>
                      {(invoice as any).categoryName && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              flex: "1",
                            }}
                          >
                            الفئة:
                          </span>
                          <span
                            style={{
                              color: "#1f2937",
                              fontWeight: "500",
                              textAlign: "left",
                              flex: "1.5",
                            }}
                          >
                            {(invoice as any).categoryName}
                          </span>
                        </div>
                      )}
                      {(invoice as any).subcategoryName && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              flex: "1",
                            }}
                          >
                            البند الفرعي:
                          </span>
                          <span
                            style={{
                              color: "#1f2937",
                              fontWeight: "500",
                              textAlign: "left",
                              flex: "1.5",
                            }}
                          >
                            {(invoice as any).subcategoryName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contractor Card */}
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        border: "2px solid #f59e0b",
                        borderRadius: "12px",
                        padding: isMobile ? "15px" : "25px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <h3
                        style={{
                          color: "#1e293b",
                          fontSize: isMobile ? "16px" : "18px",
                          fontWeight: "700",
                          marginBottom: isMobile ? "15px" : "20px",
                          textAlign: "right",
                          borderBottom: "2px solid currentColor",
                          paddingBottom: "8px",
                        }}
                      >
                        تفاصيل المقاول
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#374151",
                            flex: "1",
                          }}
                        >
                          اسم المقاول:
                        </span>
                        <span
                          style={{
                            color: "#1f2937",
                            fontWeight: "500",
                            textAlign: "left",
                            flex: "1.5",
                          }}
                        >
                          {(invoice as any).contractorName || "غير محدد"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#374151",
                            flex: "1",
                          }}
                        >
                          تاريخ الإنشاء:
                        </span>
                        <span
                          style={{
                            color: "#1f2937",
                            fontWeight: "500",
                            textAlign: "left",
                            flex: "1.5",
                          }}
                        >
                          {formatDate(invoice.date)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0",
                          padding: "8px 0",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#374151",
                            flex: "1",
                          }}
                        >
                          مُدخل بواسطة:
                        </span>
                        <span
                          style={{
                            color: "#1f2937",
                            fontWeight: "500",
                            textAlign: "left",
                            flex: "1.5",
                          }}
                        >
                          {invoice.submittedBy || "غير محدد"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div
                  style={{
                    margin: isMobile ? "20px 0" : "40px 0",
                    display: "flex",
                    justifyContent: isMobile ? "center" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: isMobile ? "15px" : "25px",
                      minWidth: isMobile ? "100%" : "350px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <div
                      style={{
                        borderTop: "3px solid #2e3192",
                        marginTop: "15px",
                        paddingTop: "20px",
                        background:
                          "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        borderRadius: "8px",
                        padding: "20px 15px",
                        margin: "15px -10px 0 -10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: isMobile ? "16px" : "18px",
                            fontWeight: "800",
                            color: "#1e3a8a",
                          }}
                        >
                          إجمالي المبلغ المستحق:
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? "18px" : "22px",
                            fontWeight: "800",
                            color: "#1e40af",
                            fontFamily: "'Cairo', monospace",
                          }}
                        >
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {invoice.notes && (
                  <div
                    style={{
                      margin: isMobile ? "20px 0" : "30px 0",
                      background:
                        "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                      border: "2px solid #f59e0b",
                      borderRadius: "12px",
                      padding: isMobile ? "15px" : "25px",
                    }}
                  >
                    <h4
                      style={{
                        color: "#92400e",
                        fontSize: isMobile ? "14px" : "16px",
                        fontWeight: "700",
                        marginBottom: isMobile ? "10px" : "15px",
                        textAlign: "right",
                      }}
                    >
                      ملاحظات
                    </h4>
                    <p
                      style={{
                        color: "#451a03",
                        lineHeight: "1.7",
                        fontSize: isMobile ? "12px" : "14px",
                        textAlign: "right",
                      }}
                    >
                      {invoice.notes}
                    </p>
                  </div>
                )}

                {/* Customer Invoice Attachment - Enhanced for Comparison */}
                {(invoice as any).attachmentData && (
                  <Card className="border-orange-200 mb-6 bg-orange-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-orange-700 text-lg arabic-spacing">
                          📎 صورة فاتورة العميل الأصلية
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAttachmentModal(true)}
                          className="text-orange-600 hover:bg-orange-100 border-orange-300"
                        >
                          <Eye className="h-4 w-4 ml-1 no-flip" />
                          <span className="arabic-spacing">
                            عرض بالحجم الكامل
                          </span>
                        </Button>
                      </div>

                      <div className="bg-white p-4 rounded-lg border-2 border-orange-300 shadow-sm">
                        <div className="text-center mb-3">
                          <div className="inline-flex items-center bg-orange-100 px-3 py-1 rounded-full text-sm font-medium text-orange-800 arabic-spacing">
                            <ImageIcon className="h-4 w-4 ml-1" />
                            للمقارنة والتحقق من صحة البيانات
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <img
                            src={`data:${
                              (invoice as any).attachmentType
                            };base64,${(invoice as any).attachmentData}`}
                            alt="فاتورة العميل الأصلية"
                            className="max-w-full max-h-80 object-contain border-2 border-orange-200 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => setShowAttachmentModal(true)}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                              (
                                e.target as HTMLImageElement
                              ).nextElementSibling!.classList.remove("hidden");
                            }}
                            title="انقر لعرض الصورة بالحجم الكامل"
                          />
                          <div className="hidden text-center text-orange-600 py-8">
                            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-orange-400" />
                            <p className="text-lg font-medium arabic-spacing mb-2">
                              لا يمكن عرض الصورة
                            </p>
                            <p className="text-sm text-orange-500 arabic-spacing">
                              تأكد من صحة بيانات المرفق
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 arabic-spacing">
                                نوع الملف:
                              </span>
                              <span className="font-medium mr-2 text-gray-800">
                                {(invoice as any).attachmentType}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 arabic-spacing">
                                حجم الملف:
                              </span>
                              <span className="font-medium mr-2 text-gray-800">
                                {(invoice as any).attachmentSize
                                  ? `${Math.round(
                                      (invoice as any).attachmentSize / 1024
                                    )} KB`
                                  : "غير محدد"}
                              </span>
                            </div>
                            {(invoice as any).customerInvoiceNumber && (
                              <div className="col-span-2">
                                <span className="text-gray-600 arabic-spacing">
                                  رقم الفاتورة على الصورة:
                                </span>
                                <span className="font-bold mr-2 bg-yellow-200 px-2 py-1 rounded text-gray-800 arabic-spacing">
                                  {(invoice as any).customerInvoiceNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 text-center">
                          <p className="text-xs text-orange-600 arabic-spacing">
                            💡 يرجى التحقق من تطابق البيانات المدخلة مع الفاتورة
                            الأصلية
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Show message if no attachment */}
                {!(invoice as any).attachmentData && (
                  <Card className="border-gray-200 mb-6">
                    <CardContent className="p-4">
                      <div className="text-center py-6 text-gray-500">
                        <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm arabic-spacing">
                          لم يتم إرفاق صورة لفاتورة العميل
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Status and Balance Check */}
                <Card className="border-amber-200">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-amber-700 mb-3 arabic-spacing">
                      حالة الاعتماد
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-amber-700 font-medium arabic-spacing">
                          بانتظار اعتماد المدير
                        </span>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium arabic-spacing ${
                            hasBalance(invoice.amount)
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {hasBalance(invoice.amount)
                            ? "✓ رصيد الخزينة كافي"
                            : "⚠️ رصيد الخزينة غير كافي"}
                        </div>
                        <div className="text-xs text-gray-500 arabic-spacing">
                          المبلغ المطلوب: {formatCurrency(invoice.amount)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer - Action Buttons */}
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
                <div className="flex items-center space-x-2 space-x-reverse">
                  <AlertTriangle
                    className={`text-amber-500 ${
                      isMobile ? "h-3 w-3" : "h-4 w-4"
                    }`}
                  />
                  <span>يرجى مراجعة جميع التفاصيل قبل الاعتماد</span>
                </div>
              </div>
              <div
                className={`flex items-center space-x-3 space-x-reverse ${
                  isMobile ? "w-full" : ""
                }`}
              >
                <Button
                  variant="outline"
                  onClick={onClose}
                  className={`arabic-spacing ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  {isMobile ? "إغلاق" : "إغلاق المعاينة"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(true)}
                  className={`border-red-300 text-red-600 hover:bg-red-50 arabic-spacing ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  <XCircle
                    className={`no-flip ${
                      isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                    }`}
                  />
                  {isMobile ? "رفض" : "رفض الفاتورة"}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={!hasBalance(invoice.amount)}
                  className={`bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 arabic-spacing ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  <CheckCircle
                    className={`no-flip ${
                      isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                    }`}
                  />
                  {isMobile ? "اعتماد" : "اعتماد ودفع"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Attachment Full View Modal for Comparison */}
      {showAttachmentModal && (invoice as any).attachmentData && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4">
          <div
            className={`bg-white rounded-xl overflow-hidden shadow-2xl ${
              isMobile
                ? "max-w-full max-h-[98vh] mx-1"
                : "max-w-6xl max-h-[95vh]"
            }`}
          >
            {/* Enhanced Header */}
            <div
              className={`bg-gradient-to-r from-orange-600 to-red-600 text-white ${
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
                    <ImageIcon
                      className={`no-flip ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-bold arabic-spacing ${
                        isMobile ? "text-base" : "text-xl"
                      }`}
                    >
                      📎 فاتورة العميل الأصلية - للمقارنة والتحقق
                    </h3>
                    <p
                      className={`text-orange-100 arabic-spacing ${
                        isMobile ? "text-xs" : "text-base"
                      }`}
                    >
                      رقم الفاتورة: {formatInvoiceNumber(invoice.invoiceNumber)}{" "}
                      • رقم فاتورة العميل:{" "}
                      {(invoice as any).customerInvoiceNumber || "غير محدد"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAttachmentModal(false)}
                  className={`p-0 text-white hover:bg-white/20 ${
                    isMobile ? "h-8 w-8" : "h-10 w-10"
                  }`}
                  title="إغلاق"
                >
                  <X className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                </Button>
              </div>
            </div>

            {/* Enhanced Content */}
            <div
              className={`overflow-auto bg-gray-50 ${
                isMobile ? "p-3 max-h-[85vh]" : "p-6 max-h-[80vh]"
              }`}
            >
              {/* Comparison Instructions */}
              <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="mr-3">
                    <h4 className="text-sm font-medium text-orange-800 arabic-spacing">
                      تعليمات المقارنة والتحقق
                    </h4>
                    <div className="mt-1 text-sm text-orange-700 arabic-spacing">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          تحقق من تطابق المبلغ: {formatCurrency(invoice.amount)}
                        </li>
                        <li>
                          تحقق من رقم فاتورة العميل:{" "}
                          {(invoice as any).customerInvoiceNumber || "غير محدد"}
                        </li>
                        <li>
                          تحقق من تاريخ الفاتورة: {formatDate(invoice.date)}
                        </li>
                        <li>تحقق من بيانات المقاول والمشروع</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Display */}
              <div className="bg-white p-6 rounded-lg border-2 border-orange-200 shadow-sm">
                <img
                  src={`data:${(invoice as any).attachmentType};base64,${
                    (invoice as any).attachmentData
                  }`}
                  alt="فاتورة العميل الأصلية"
                  className="max-w-full h-auto mx-auto border border-gray-300 rounded-lg shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (
                      e.target as HTMLImageElement
                    ).nextElementSibling!.classList.remove("hidden");
                  }}
                />
                <div className="hidden text-center text-gray-600 py-12">
                  <ImageIcon className="h-20 w-20 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl font-medium arabic-spacing mb-2">
                    لا يمكن عرض الصورة
                  </p>
                  <p className="text-sm text-gray-500 arabic-spacing">
                    تأكد من صحة بيانات الصورة المرفقة أو اتصل بموظف الإدخال
                  </p>
                </div>
              </div>

              {/* File Information */}
              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3 arabic-spacing">
                  معلومات الملف
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600 arabic-spacing block">
                      نوع الملف:
                    </span>
                    <span className="font-medium text-gray-800">
                      {(invoice as any).attachmentType}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600 arabic-spacing block">
                      حجم الملف:
                    </span>
                    <span className="font-medium text-gray-800">
                      {(invoice as any).attachmentSize
                        ? `${Math.round(
                            (invoice as any).attachmentSize / 1024
                          )} KB`
                        : "غير محدد"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600 arabic-spacing block">
                      تاريخ الرفع:
                    </span>
                    <span className="font-medium text-gray-800 arabic-spacing">
                      {formatDate(invoice.createdAt || invoice.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Footer */}
            <div className={`bg-gray-100 border-t ${isMobile ? "p-3" : "p-4"}`}>
              <div
                className={`flex items-center justify-between ${
                  isMobile ? "flex-col space-y-2" : ""
                }`}
              >
                <div
                  className={`text-gray-600 arabic-spacing ${
                    isMobile ? "text-xs text-center" : "text-sm"
                  }`}
                >
                  💡 استخدم عجلة الماوس أو إيماءات اللمس للتكبير والتصغير
                </div>
                <Button
                  onClick={() => setShowAttachmentModal(false)}
                  className={`bg-orange-600 hover:bg-orange-700 text-white arabic-spacing ${
                    isMobile ? "w-full text-sm h-9" : ""
                  }`}
                >
                  {isMobile ? "إغلاق" : "إغلاق المعاينة"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
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
                    تأكيد رفض الفاتورة
                  </h3>
                  <p
                    className={`text-gray-600 arabic-spacing ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    فاتورة رقم: {formatInvoiceNumber(invoice.invoiceNumber)}
                  </p>
                </div>
              </div>

              <div className={isMobile ? "mb-3" : "mb-4"}>
                <label
                  className={`block font-semibold text-gray-700 mb-2 arabic-spacing ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                >
                  سبب الرفض (مطلوب)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب رفض هذه الفاتورة ليتم إبلاغ موظف الإدخال..."
                  className={`w-full border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 arabic-spacing ${
                    isMobile ? "p-2 text-sm" : "p-3"
                  }`}
                  rows={isMobile ? 2 : 3}
                  required
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
                    <strong>تحذير:</strong> سيتم إشعار موظف الإدخال بسبب الرفض
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
                    setRejectionReason("");
                  }}
                  className={`arabic-spacing ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className={`bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 arabic-spacing ${
                    isMobile ? "flex-1 text-sm h-9" : ""
                  }`}
                >
                  <XCircle
                    className={`no-flip ${
                      isMobile ? "h-3 w-3 ml-1" : "h-4 w-4 ml-1"
                    }`}
                  />
                  تأكيد الرفض
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
