"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Printer,
  Save,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { Project, ProjectCategoryAssignment } from "@/types";

interface InvoiceLineItem {
  id: string;
  description: string; // What (e.g., "اسمنت", "حديد")
  quantity: number; // Quantity (e.g., 15)
  unit: string; // Unit (e.g., "طن", "متر", "قطعة")
  unitPrice: number; // Price per unit
  total: number; // quantity * unitPrice
  details: string; // Additional details
}

interface EnhancedCategoryInvoiceData {
  invoiceNumber: string;
  date: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  contractorId: string;
  contractorName: string;
  categoryAssignmentId: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  notes: string;
  projectId?: string;
}

interface EnhancedCategoryInvoiceModalProps {
  isOpen: boolean;
  project: Project;
  category: any;
  assignmentData: ProjectCategoryAssignment[];
  onClose: () => void;
  onSubmit: (invoiceData: any) => void;
}

export default function EnhancedCategoryInvoiceModal({
  isOpen,
  project,
  category,
  assignmentData,
  onClose,
  onSubmit,
}: EnhancedCategoryInvoiceModalProps) {
  const [invoiceForm, setInvoiceForm] = useState<EnhancedCategoryInvoiceData>({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: category?.id || "",
    categoryName: category?.name || "",
    subcategoryName: "",
    contractorId: "",
    contractorName: "",
    categoryAssignmentId: "",
    lineItems: [
      {
        id: "1",
        description: "",
        quantity: 1,
        unit: "قطعة",
        unitPrice: 0,
        total: 0,
        details: "",
      },
    ],
    subtotal: 0,
    taxPercentage: 0,
    taxAmount: 0,
    discount: 0,
    totalAmount: 0,
    notes: "",
  });

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] =
    useState<ProjectCategoryAssignment | null>(null);
  const [availableContractors, setAvailableContractors] = useState<
    ProjectCategoryAssignment[]
  >([]);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Common units in Arabic
  const commonUnits = [
    "قطعة",
    "متر",
    "متر مربع",
    "متر مكعب",
    "طن",
    "كيلو",
    "لتر",
    "كيس",
    "علبة",
    "دلو",
    "صندوق",
  ];

  // Generate unique invoice number when modal opens
  useEffect(() => {
    if (isOpen && project) {
      console.log("🔍 Modal opened with data:", {
        project: project,
        category: category,
        assignmentData: assignmentData,
        assignmentDataLength: assignmentData?.length,
      });

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const timestamp = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
      const categoryCode = category?.id?.split("_")[0]?.toUpperCase() || "CAT";
      const invoiceNumber = `${project.code}-${categoryCode}-${year}${month}${day}-${timestamp}`;

      setInvoiceForm((prev) => ({
        ...prev,
        invoiceNumber,
      }));
    }
  }, [isOpen, project, category, assignmentData]);

  // Get unique subcategories
  const subcategories = useMemo(() => {
    if (!assignmentData || assignmentData.length === 0) {
      console.log("🔍 No assignment data available:", assignmentData);
      return [];
    }

    console.log("🔍 Processing assignments for subcategories:", assignmentData);

    const uniqueSubcategories = Array.from(
      new Set(
        assignmentData.map((assignment: any) => {
          const subcategory =
            assignment.subcategory ||
            assignment.sub_category ||
            assignment.subCategory;
          console.log("🔍 Assignment subcategory:", {
            id: assignment.id,
            subcategory: subcategory,
            contractorName: assignment.contractorName,
            allProps: Object.keys(assignment),
          });
          return subcategory;
        })
      )
    ).filter(Boolean);

    console.log("🔍 Final subcategories:", uniqueSubcategories);
    return uniqueSubcategories;
  }, [assignmentData]);

  // Handle subcategory selection
  const handleSubcategoryChange = (subcategory: string) => {
    console.log("🔍 Selected subcategory:", subcategory);
    setSelectedSubcategory(subcategory);
    setSelectedAssignment(null);
    setInvoiceForm((prev) => ({
      ...prev,
      subcategoryName: subcategory,
      contractorId: "",
      contractorName: "",
      categoryAssignmentId: "",
    }));

    // Filter contractors for this subcategory
    const contractors = assignmentData.filter((assignment: any) => {
      const assignmentSubcategory =
        assignment.subcategory ||
        assignment.sub_category ||
        assignment.subCategory;
      return assignmentSubcategory === subcategory;
    });

    console.log("🔍 Filtered contractors for subcategory:", contractors);
    setAvailableContractors(contractors);
  };

  // Handle contractor selection
  const handleContractorChange = (assignmentId: string) => {
    console.log("🔍 Selected assignment ID:", assignmentId);
    const assignment = availableContractors.find(
      (a: any) => a.id === assignmentId
    );

    if (assignment) {
      console.log("🔍 Found assignment:", assignment);
      console.log("🔍 Assignment properties:", Object.keys(assignment));
      console.log("🔍 Contractor name options:", {
        contractor_name: (assignment as any).contractor_name,
        contractorName: assignment.contractorName,
        name: (assignment as any).name,
      });

      setSelectedAssignment(assignment);
      setInvoiceForm((prev) => ({
        ...prev,
        contractorId: assignment.contractor_id || assignment.contractorId || "",
        contractorName:
          assignment.contractorName ||
          (assignment as any).contractor_name ||
          (assignment as any).name ||
          "",
        categoryAssignmentId: assignmentId,
      }));
    } else {
      console.log("🔍 Assignment not found for ID:", assignmentId);
    }
  };

  // Add new line item
  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unit: "قطعة",
      unitPrice: 0,
      total: 0,
      details: "",
    };
    setInvoiceForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (invoiceForm.lineItems.length > 1) {
      setInvoiceForm((prev) => ({
        ...prev,
        lineItems: prev.lineItems.filter((item) => item.id !== id),
      }));
    }
  };

  // Update line item
  const updateLineItem = (
    id: string,
    field: keyof InvoiceLineItem,
    value: any
  ) => {
    setInvoiceForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate total when quantity or unitPrice changes
          if (field === "quantity" || field === "unitPrice") {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  // Calculate totals
  useEffect(() => {
    const subtotal = invoiceForm.lineItems.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const taxAmount = (subtotal * invoiceForm.taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount - invoiceForm.discount;

    setInvoiceForm((prev) => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount,
    }));
  }, [invoiceForm.lineItems, invoiceForm.taxPercentage, invoiceForm.discount]);

  // Handle scroll events to show/hide scroll-to-top button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 200);
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedAssignment) {
      alert("يرجى اختيار المقاول");
      return;
    }

    if (invoiceForm.lineItems.some((item) => !item.description.trim())) {
      alert("يرجى إدخال وصف لجميع البنود");
      return;
    }

    if (
      invoiceForm.lineItems.some(
        (item) => item.quantity <= 0 || item.unitPrice <= 0
      )
    ) {
      alert("يرجى إدخال كمية وسعر صحيح لجميع البنود");
      return;
    }

    // Convert line items to a work description for backend compatibility
    const workDescription = invoiceForm.lineItems
      .map(
        (item) =>
          `${item.description} - ${item.quantity} ${
            item.unit
          } - ${formatCurrency(item.total)}`
      )
      .join(" | ");

    const backendInvoiceData = {
      ...invoiceForm,
      workDescription,
      amount: invoiceForm.totalAmount,
      description: workDescription,
    };

    onSubmit(backendInvoiceData);
  };

  // Handle print - create professional invoice template
  const handlePrint = () => {
    if (!selectedAssignment) {
      alert("يرجى اختيار المقاول أولاً");
      return;
    }

    setIsPrintMode(true);
    setTimeout(() => {
      // Create professional invoice content
      const invoiceContent = `
        <div class="invoice-header">
          <div class="company-info">
            <div class="logo">
              <div class="logo-circle">QS</div>
              <div class="company-details">
                <h1>Quantity Surveying</h1>
                <p class="subtitle">نظام إدارة الكميات المالية</p>
                <p class="tagline">إدارة شاملة للمشاريع الإنشائية</p>
              </div>
            </div>
            <div class="invoice-title">
              <h2>فاتورة</h2>
              <p>INVOICE</p>
            </div>
          </div>
        </div>

        <div class="invoice-details">
          <div class="details-section">
            <div class="detail-box">
              <strong>معلومات الشركة</strong>
              <p>الشركة: Quantity Surveying Co.</p>
              <p>العنوان: المنطقة التجارية، المدينة</p>
              <p>الهاتف: +966 XX XXX XXXX</p>
              <p>البريد الإلكتروني: info@qs-company.com</p>
            </div>
            <div class="detail-box">
              <strong>معلومات المشروع</strong>
              <p>اسم المشروع: ${project.name}</p>
              <p>الموقع: ${project.location}</p>
              <p>العميل: ${project.client}</p>
              <p>رمز المشروع: ${project.code}</p>
            </div>
          </div>
          
          <div class="invoice-meta">
            <div class="meta-item">
              <span>رقم الفاتورة</span>
              <strong>${invoiceForm.invoiceNumber}</strong>
            </div>
            <div class="meta-item">
              <span>تاريخ الفاتورة</span>
              <strong>${new Date(invoiceForm.date).toLocaleDateString(
                "en-US"
              )}</strong>
            </div>
            <div class="meta-item">
              <span>الفئة</span>
              <strong>${category?.name}</strong>
            </div>
          </div>
        </div>

        <div class="contractor-info">
          <strong>تفاصيل المقاول والعمل</strong>
          <div class="contractor-details">
            <div>اسم المقاول: ${
              selectedAssignment.contractorName || "غير محدد"
            }</div>
            <div>البند الفرعي: ${invoiceForm.subcategoryName}</div>
            <div>المبلغ المقدر للمقاول: ${formatCurrency(
              selectedAssignment.estimated_amount || 0
            )}</div>
          </div>
        </div>

        <div class="line-items">
          <h3>بنود الفاتورة</h3>
          <table>
            <thead>
              <tr>
                <th>البيان</th>
                <th>الكمية</th>
                <th>الوحدة</th>
                <th>السعر</th>
                <th>المجموع</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceForm.lineItems
                .map(
                  (item) => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total)}</td>
                  <td>${item.details}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="invoice-totals">
          <div class="totals-section">
            <div class="total-row">
              <span>المجموع الفرعي:</span>
              <span>${formatCurrency(invoiceForm.subtotal)}</span>
            </div>
            ${
              invoiceForm.taxPercentage > 0
                ? `
            <div class="total-row">
              <span>الضريبة (${invoiceForm.taxPercentage}%):</span>
              <span>${formatCurrency(invoiceForm.taxAmount)}</span>
            </div>
            `
                : ""
            }
            ${
              invoiceForm.discount > 0
                ? `
            <div class="total-row discount">
              <span>الخصم:</span>
              <span>-${formatCurrency(invoiceForm.discount)}</span>
            </div>
            `
                : ""
            }
            <div class="total-row final">
              <span>الإجمالي:</span>
              <span>${formatCurrency(invoiceForm.totalAmount)}</span>
            </div>
          </div>
        </div>

        ${
          invoiceForm.notes
            ? `
        <div class="notes-section">
          <h4>ملاحظات</h4>
          <p>${invoiceForm.notes}</p>
        </div>
        `
            : ""
        }

        <div class="invoice-footer">
          <p><strong>Quantity Surveying Co.</strong> - نظام إدارة الكميات المالية</p>
          <p>هذه فاتورة مُصدرة إلكترونياً ولا تحتاج لتوقيع أو ختم</p>
        </div>
      `;

      // Create professional print window with enhanced styling
      const printWindow = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>فاتورة - ${invoiceForm.invoiceNumber}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: white;
              -webkit-print-color-adjust: exact;
              max-width: 800px;
              margin: 0 auto;
              padding: 30px;
            }
            
            .invoice-header {
              border-b: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .company-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .logo {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .logo-circle {
              width: 60px;
              height: 60px;
              background: #2563eb;
              color: white;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
            }
            
            .company-details h1 {
              color: #1e3a8a;
              font-size: 28px;
              margin-bottom: 5px;
            }
            
            .subtitle {
              color: #4b5563;
              font-size: 16px;
              margin-bottom: 2px;
            }
            
            .tagline {
              color: #6b7280;
              font-size: 14px;
            }
            
            .invoice-title {
              text-align: right;
            }
            
            .invoice-title h2 {
              color: #1e3a8a;
              font-size: 36px;
              margin-bottom: 5px;
            }
            
            .invoice-title p {
              color: #6b7280;
              font-size: 14px;
            }
            
            .invoice-details {
              margin-bottom: 30px;
            }
            
            .details-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .detail-box {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .detail-box strong {
              display: block;
              color: #1f2937;
              font-size: 16px;
              margin-bottom: 10px;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 5px;
            }
            
            .detail-box p {
              margin: 5px 0;
              color: #374151;
              font-size: 14px;
            }
            
            .invoice-meta {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
              background: white;
              border: 2px solid #bfdbfe;
              border-radius: 8px;
              padding: 20px;
            }
            
            .meta-item {
              text-align: center;
            }
            
            .meta-item span {
              display: block;
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 5px;
            }
            
            .meta-item strong {
              color: #1e3a8a;
              font-size: 16px;
              font-family: monospace;
            }
            
            .contractor-info {
              background: #ecfdf5;
              border: 2px solid #d1fae5;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            
            .contractor-info > strong {
              display: block;
              color: #065f46;
              font-size: 18px;
              margin-bottom: 15px;
              border-bottom: 1px solid #34d399;
              padding-bottom: 5px;
            }
            
            .contractor-details {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
            }
            
            .contractor-details div {
              background: white;
              padding: 10px;
              border-radius: 6px;
              font-size: 14px;
              color: #374151;
            }
            
            .line-items {
              margin: 30px 0;
            }
            
            .line-items h3 {
              color: #1f2937;
              font-size: 20px;
              margin-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
            }
            
            th, td {
              border: 1px solid #d1d5db;
              padding: 12px 8px;
              text-align: center;
              font-size: 14px;
            }
            
            th {
              background: #f3f4f6;
              font-weight: 600;
              color: #374151;
            }
            
            tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .invoice-totals {
              margin: 30px 0;
              display: flex;
              justify-content: flex-end;
            }
            
            .totals-section {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              min-width: 300px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .total-row.discount {
              color: #059669;
            }
            
            .total-row.final {
              border-top: 2px solid #374151;
              border-bottom: none;
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              margin-top: 10px;
              padding-top: 15px;
            }
            
            .notes-section {
              margin: 30px 0;
              background: #fffbeb;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 20px;
            }
            
            .notes-section h4 {
              color: #92400e;
              margin-bottom: 10px;
            }
            
            .notes-section p {
              color: #451a03;
              line-height: 1.6;
            }
            
            .invoice-footer {
              margin-top: 50px;
              border-top: 2px solid #2563eb;
              padding-top: 20px;
              text-align: center;
              color: #6b7280;
            }
            
            .invoice-footer p:first-child {
              font-size: 16px;
              color: #1f2937;
              margin-bottom: 5px;
            }
            
            .invoice-footer p:last-child {
              font-size: 12px;
            }
            
            @media print {
              body { margin: 0; padding: 20px; }
              .details-section { display: block; }
              .detail-box { margin-bottom: 15px; }
              .invoice-meta { display: block; }
              .meta-item { display: inline-block; width: 32%; margin: 5px 1%; }
              .contractor-details { display: block; }
              .contractor-details div { margin: 5px 0; }
            }
          </style>
        </head>
        <body>
          ${invoiceContent}
        </body>
        </html>
      `;

      // Open new window and print
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(printWindow);
        newWindow.document.close();
        newWindow.focus();
        newWindow.print();
        newWindow.close();
      }
      setIsPrintMode(false);
    }, 100);
  };

  if (!isOpen) return null;

  // No longer needed - using separate print window

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4">
        <div className="h-full flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] shadow-2xl relative flex flex-col">
            {/* Simple Header - Data Entry Focused */}
            <div className="bg-white border-b border-gray-200 p-4 no-print flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    إنشاء فاتورة جديدة
                  </h2>
                  <p className="text-sm text-gray-600">
                    {project.name} - {category?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrint}
                    disabled={!selectedAssignment}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="h-4 w-4 ml-1" />
                    معاينة وطباعة
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 invoice-modal-scroll"
            >
              {/* Scroll to top button */}
              {showScrollTop && (
                <button
                  onClick={scrollToTop}
                  className="fixed bottom-20 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-20 no-print"
                  title="العودة للأعلى"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              )}

              {/* Hidden Professional Print Template */}
              <div id="invoice-print-area" className="print-area hidden">
                {/* This will only be visible when printing */}
              </div>

              {/* Simple Invoice Form - Data Entry */}
              <div className="space-y-6">
                {/* Basic Invoice Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    معلومات الفاتورة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رقم الفاتورة
                      </label>
                      <Input
                        value={invoiceForm.invoiceNumber}
                        readOnly
                        className="bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الفاتورة
                      </label>
                      <Input
                        type="date"
                        value={invoiceForm.date}
                        readOnly
                        className="bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الفئة
                      </label>
                      <Input
                        value={category?.name}
                        readOnly
                        className="bg-gray-100 text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Selection Steps */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 enhanced-invoice-modal">
                  {/* Subcategory Selection */}
                  <div className="bg-blue-50 rounded-xl p-4 border text-black border-blue-200 enhanced-dropdown">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 arabic-spacing flex items-center">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm ml-2">
                        1
                      </span>
                      اختيار البند الفرعي
                    </h3>
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className="w-full"
                    >
                      <option value="">-- اختر البند الفرعي --</option>
                      {subcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contractor Selection */}
                  {selectedSubcategory && (
                    <div className="bg-green-50 rounded-xl p-4 border text-black border-green-200 enhanced-dropdow ">
                      <h3 className="text-base font-semibold text-gray-900 mb-3 arabic-spacing flex items-center">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm ml-2">
                          2
                        </span>
                        اختيار المقاول
                      </h3>
                      <select
                        value={invoiceForm.categoryAssignmentId}
                        onChange={(e) => handleContractorChange(e.target.value)}
                        className="w-full"
                      >
                        <option value="">-- اختر المقاول --</option>
                        {availableContractors.map((assignment) => {
                          const contractorName =
                            assignment.contractorName ||
                            (assignment as any).contractor_name ||
                            (assignment as any).name ||
                            "مقاول غير محدد";
                          const estimatedAmount =
                            assignment.estimated_amount ||
                            assignment.estimatedAmount ||
                            0;
                          return (
                            <option key={assignment.id} value={assignment.id}>
                              {contractorName} - (
                              {formatCurrency(estimatedAmount)})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Contractor Info - Simple */}
                {selectedAssignment && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      معلومات المقاول المختار
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          اسم المقاول
                        </label>
                        <p className="text-gray-900 font-medium">
                          {selectedAssignment.contractorName ||
                            (selectedAssignment as any).contractor_name ||
                            (selectedAssignment as any).name ||
                            "غير محدد"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          البند الفرعي
                        </label>
                        <p className="text-gray-900 font-medium">
                          {invoiceForm.subcategoryName}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          المبلغ المقدر
                        </label>
                        <p className="text-green-600 font-medium">
                          {formatCurrency(
                            selectedAssignment.estimated_amount ||
                              selectedAssignment.estimatedAmount ||
                              0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Items - Data Entry */}
                {selectedAssignment && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        بنود الفاتورة
                      </h3>
                      <Button
                        onClick={addLineItem}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        إضافة بند
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden invoice-line-items">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                              البيان
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              الكمية
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              الوحدة
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              السعر
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              المجموع
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              تفاصيل
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 no-print">
                              إجراء
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceForm.lineItems.map((item, index) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-3">
                                <Input
                                  value={item.description}
                                  onChange={(e) =>
                                    updateLineItem(
                                      item.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  placeholder="وصف البند (مثال: اسمنت، حديد، بلوك)"
                                  className="w-full"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateLineItem(
                                      item.id,
                                      "quantity",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 text-center"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-4 py-3 text-black">
                                <select
                                  value={item.unit}
                                  onChange={(e) =>
                                    updateLineItem(
                                      item.id,
                                      "unit",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {commonUnits.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-black">
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    updateLineItem(
                                      item.id,
                                      "unitPrice",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-24 text-center"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-black">
                                {formatCurrency(item.total)}
                              </td>
                              <td className="px-4 py-3 text-black">
                                <Input
                                  value={item.details}
                                  onChange={(e) =>
                                    updateLineItem(
                                      item.id,
                                      "details",
                                      e.target.value
                                    )
                                  }
                                  placeholder="تفاصيل إضافية"
                                  className="w-full"
                                />
                              </td>
                              <td className="px-4 py-3 text-center no-print">
                                {invoiceForm.lineItems.length > 1 && (
                                  <Button
                                    onClick={() => removeLineItem(item.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Invoice Totals */}
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ضريبة (%)
                          </label>
                          <Input
                            type="number"
                            value={invoiceForm.taxPercentage}
                            onChange={(e) =>
                              setInvoiceForm((prev) => ({
                                ...prev,
                                taxPercentage: parseFloat(e.target.value) || 0,
                              }))
                            }
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            خصم
                          </label>
                          <Input
                            type="number"
                            value={invoiceForm.discount}
                            onChange={(e) =>
                              setInvoiceForm((prev) => ({
                                ...prev,
                                discount: parseFloat(e.target.value) || 0,
                              }))
                            }
                            min="0"
                            step="0.01"
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>المجموع الفرعي:</span>
                          <span className="font-medium">
                            {formatCurrency(invoiceForm.subtotal)}
                          </span>
                        </div>
                        {invoiceForm.taxPercentage > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>الضريبة ({invoiceForm.taxPercentage}%):</span>
                            <span className="font-medium">
                              {formatCurrency(invoiceForm.taxAmount)}
                            </span>
                          </div>
                        )}
                        {invoiceForm.discount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>الخصم:</span>
                            <span className="font-medium">
                              -{formatCurrency(invoiceForm.discount)}
                            </span>
                          </div>
                        )}
                        <div className="border-t pt-2">
                          <div className="flex justify-between text-base font-bold">
                            <span>الإجمالي:</span>
                            <span>
                              {formatCurrency(invoiceForm.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedAssignment && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ملاحظات إضافية
                    </label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="أدخل أي ملاحظات إضافية للفاتورة..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions - Simple */}
            <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-600">
                {selectedAssignment && (
                  <>
                    المبلغ المتبقي:
                    <span className="font-semibold text-green-600 ml-1">
                      {formatCurrency(
                        (selectedAssignment.estimated_amount ||
                          selectedAssignment.estimatedAmount ||
                          0) - invoiceForm.totalAmount
                      )}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={onClose} variant="outline" size="sm">
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !selectedAssignment ||
                    invoiceForm.lineItems.some(
                      (item) => !item.description.trim()
                    )
                  }
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 ml-1" />
                  حفظ الفاتورة
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
