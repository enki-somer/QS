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
  Upload,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { Project, ProjectCategoryAssignment } from "@/types";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { FinancialDisplay } from "@/components/ui/FinancialDisplay";

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
  // New fields for attachments and fraud prevention
  customerInvoiceNumber: string;
  attachmentData?: string; // Base64 encoded image
  attachmentFilename?: string;
  attachmentSize?: number;
  attachmentType?: string;
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
  const { addToast } = useToast();
  const permissions = useUIPermissions();
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
    // New fields for attachments and fraud prevention
    customerInvoiceNumber: "",
    attachmentData: undefined,
    attachmentFilename: undefined,
    attachmentSize: undefined,
    attachmentType: undefined,
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

  // New state for attachments and fraud prevention
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Utility function to compress image
  const compressImage = (
    file: File,
    maxWidth: number = 800,
    quality: number = 0.7
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Check for duplicate customer invoice numbers
  const checkDuplicateInvoiceNumber = async (customerInvoiceNumber: string) => {
    if (!customerInvoiceNumber.trim()) {
      setDuplicateWarning("");
      return;
    }

    setIsDuplicateChecking(true);
    try {
      // Check database for existing invoices with same customer invoice number
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/category-invoices/check-duplicate?customerInvoiceNumber=${encodeURIComponent(
          customerInvoiceNumber.trim()
        )}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "financial-auth-token"
            )}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.isDuplicate) {
          setDuplicateWarning(
            `⚠️ رقم الفاتورة "${customerInvoiceNumber}" مستخدم مسبقاً في المشروع: ${
              data.projectName || "غير محدد"
            } - المقاول: ${data.contractorName || "غير محدد"}`
          );
        } else {
          setDuplicateWarning("");
        }
      } else {
        // If API fails, fall back to localStorage check for legacy invoices
        console.warn(
          "API duplicate check failed, falling back to localStorage"
        );
        const existingInvoices = JSON.parse(
          localStorage.getItem("financial-invoices") || "[]"
        );
        const duplicate = existingInvoices.find(
          (inv: any) =>
            inv.customerInvoiceNumber === customerInvoiceNumber.trim()
        );

        if (duplicate) {
          setDuplicateWarning(
            `⚠️ رقم الفاتورة "${customerInvoiceNumber}" مستخدم مسبقاً في المشروع: ${
              duplicate.projectName || "غير محدد"
            }`
          );
        } else {
          setDuplicateWarning("");
        }
      }
    } catch (error) {
      console.error("Error checking duplicate invoice:", error);
      // Clear warning on error to not block user unnecessarily
      setDuplicateWarning("");
    } finally {
      setIsDuplicateChecking(false);
    }
  };

  // Handle file upload for invoice attachment
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      addToast({
        type: "error",
        title: "نوع ملف غير صحيح",
        message: "يرجى اختيار ملف صورة (JPG, PNG, إلخ)",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast({
        type: "error",
        title: "حجم الملف كبير جداً",
        message: "يرجى اختيار صورة أصغر من 10 ميجابايت",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Compress the image
      const compressedDataUrl = await compressImage(file, 800, 0.7);

      // Extract only the base64 part (remove data:image/jpeg;base64, prefix)
      const base64Data = compressedDataUrl.split(",")[1];

      // Calculate compressed size
      const compressedSize = Math.round((base64Data.length * 3) / 4); // Approximate base64 size

      // Update form with attachment data
      setInvoiceForm((prev) => ({
        ...prev,
        attachmentData: base64Data, // Store only base64 data, not the full data URL
        attachmentFilename: file.name,
        attachmentSize: compressedSize,
        attachmentType: file.type,
      }));

      addToast({
        type: "success",
        title: "تم رفع المرفق بنجاح",
        message: `تم ضغط الصورة من ${Math.round(
          file.size / 1024
        )}KB إلى ${Math.round(compressedSize / 1024)}KB`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      addToast({
        type: "error",
        title: "خطأ في رفع الملف",
        message: "حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Remove attachment
  const removeAttachment = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      attachmentData: undefined,
      attachmentFilename: undefined,
      attachmentSize: undefined,
      attachmentType: undefined,
    }));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
          (assignment as any).contractor_name ||
          assignment.contractorName ||
          (assignment as any).name ||
          (assignment.assignment_type === "purchasing"
            ? "مشتريات"
            : "غير محدد"),
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
      addToast({
        type: "error",
        title: "بيانات ناقصة",
        message: "يرجى اختيار المقاول",
      });
      return;
    }

    // Customer invoice number is now optional
    // If provided, it will be checked for duplicates

    // Check for duplicate warning
    if (duplicateWarning) {
      addToast({
        type: "error",
        title: "رقم فاتورة مكرر",
        message:
          "لا يمكن إنشاء فاتورة برقم مستخدم مسبقاً. يرجى التحقق من رقم فاتورة العميل",
      });
      return;
    }

    if (invoiceForm.lineItems.some((item) => !item.description.trim())) {
      addToast({
        type: "error",
        title: "بيانات ناقصة",
        message: "يرجى إدخال وصف لجميع البنود",
      });
      return;
    }

    if (
      invoiceForm.lineItems.some(
        (item) => item.quantity <= 0 || item.unitPrice <= 0
      )
    ) {
      addToast({
        type: "error",
        title: "بيانات غير صحيحة",
        message: "يرجى إدخال كمية وسعر صحيح لجميع البنود",
      });
      return;
    }

    // Budget validation - check if invoice amount exceeds assignment remaining budget
    const assignmentEstimatedAmount = Number(
      selectedAssignment.estimated_amount ||
        selectedAssignment.estimatedAmount ||
        0
    );
    const assignmentActualAmount = Number(
      selectedAssignment.actual_amount || selectedAssignment.actualAmount || 0
    );
    const remainingAssignmentBudget =
      assignmentEstimatedAmount - assignmentActualAmount;

    // Only validate if there's a remaining budget (negative means over-budget already)
    if (remainingAssignmentBudget <= 0) {
      addToast({
        type: "error",
        title: "ميزانية التعيين مستنفدة",
        message: `التعيين قد تم استنفاذ ميزانيته بالكامل. الميزانية المقدرة: ${formatCurrency(
          assignmentEstimatedAmount
        )}, المبلغ المنفق: ${formatCurrency(assignmentActualAmount)}`,
      });
      return;
    }

    if (invoiceForm.totalAmount > remainingAssignmentBudget) {
      addToast({
        type: "error",
        title: "تجاوز ميزانية التعيين",
        message: `مبلغ الفاتورة (${formatCurrency(
          invoiceForm.totalAmount
        )}) يتجاوز الميزانية المتبقية للتعيين (${formatCurrency(
          remainingAssignmentBudget
        )}). الميزانية المقدرة: ${formatCurrency(
          assignmentEstimatedAmount
        )}, المنفق حالياً: ${formatCurrency(assignmentActualAmount)}`,
      });
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

  // Validate and sanitize base64 data
  const validateBase64Image = (base64Data: string, mimeType: string) => {
    try {
      // Remove any whitespace and newlines
      const cleanBase64 = base64Data.replace(/\s/g, "");

      // Check if it's valid base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanBase64)) {
        console.error("Invalid base64 characters detected");
        return null;
      }

      // Validate MIME type
      const validMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validMimeTypes.includes(mimeType.toLowerCase())) {
        console.error("Invalid MIME type:", mimeType);
        return null;
      }

      // Try to decode to verify it's valid
      try {
        atob(cleanBase64);
      } catch (e) {
        console.error("Failed to decode base64:", e);
        return null;
      }

      return cleanBase64;
    } catch (error) {
      console.error("Error validating base64 image:", error);
      return null;
    }
  };

  // Handle print - create professional invoice template
  const handlePrint = () => {
    if (!selectedAssignment) {
      addToast({
        type: "warning",
        title: "بيانات ناقصة",
        message: "يرجى اختيار المقاول أولاً",
      });
      return;
    }

    // Prevent printing if duplicate is detected
    if (duplicateWarning) {
      addToast({
        type: "error",
        title: "لا يمكن الطباعة",
        message:
          "لا يمكن طباعة الفاتورة عند وجود تكرار في رقم فاتورة العميل. يرجى تصحيح الرقم أولاً.",
      });
      return;
    }

    setIsPrintMode(true);
    setTimeout(() => {
      // Validate attachment data if present
      let validatedAttachmentData = invoiceForm.attachmentData;
      let hasValidImage = false;

      if (invoiceForm.attachmentData && invoiceForm.attachmentType) {
        const validBase64 = validateBase64Image(
          invoiceForm.attachmentData,
          invoiceForm.attachmentType
        );
        if (validBase64) {
          validatedAttachmentData = validBase64;
          hasValidImage = true;
          console.log("✅ Image validation passed for printing");
        } else {
          console.error("❌ Image validation failed - will show error message");
          hasValidImage = false;
        }
      }

      // Create professional Arabic invoice content
      const invoiceContent = `
<div class="invoice-header">
  <div class="header-content">
    <div class="company-section">
      <div class="logo-container">
      <img src="/QS-WHITE.svg" alt="logo"/>
      </div>
      <div class="company-details">
        <h1>قصر الشام للمشاريع الإنشائية</h1>
        <p class="subtitle">Qasr Al-Sham Construction Projects</p>
        <p class="company-address">العراق - بغداد | +964 XXX XXX XXXX</p>
        <p class="company-email">info@qasralsham.com</p>
      </div>
    </div>
    
    <div class="invoice-info">
      <div class="invoice-number">
        <span class="label">رقم الفاتورة</span>
        <span class="value">${invoiceForm.invoiceNumber}</span>
      </div>
      ${
        invoiceForm.customerInvoiceNumber
          ? `
      <div class="customer-invoice-number">
        <span class="label">رقم فاتورة العميل</span>
        <span class="value">${invoiceForm.customerInvoiceNumber}</span>
      </div>
      `
          : ""
      }
      <div class="invoice-date">
        <span class="label">التاريخ</span>
        <span class="value">${new Date(invoiceForm.date).toLocaleDateString(
          "en-US"
        )}</span>
      </div>
      <div class="invoice-category">
        <span class="label">الفئة</span>
        <span class="value">${category?.name}</span>
      </div>
    </div>
  </div>
</div>

<div class="main-details">
  <div class="details-grid">
    <div class="detail-card project-card">
      <h3>تفاصيل المشروع</h3>
      <div class="detail-item">
        <span class="label">اسم المشروع:</span>
        <span class="value">${project.name}</span>
      </div>
      <div class="detail-item">
        <span class="label">الموقع:</span>
        <span class="value">${project.location}</span>
      </div>
      <div class="detail-item">
        <span class="label">العميل:</span>
        <span class="value">${project.client}</span>
      </div>
      <div class="detail-item">
        <span class="label">رمز المشروع:</span>
        <span class="value">${project.code}</span>
      </div>
    </div>
    
    <div class="detail-card contractor-card">
      <h3>تفاصيل المقاول</h3>
             <div class="detail-item">
         <span class="label">اسم المقاول:</span>
         <span class="value">${
           (selectedAssignment as any).contractor_name ||
           selectedAssignment.contractorName ||
           (selectedAssignment.assignment_type === "purchasing"
             ? "مشتريات"
             : "غير محدد")
         }</span>
       </div>
      <div class="detail-item">
        <span class="label">البند الفرعي:</span>
        <span class="value">${invoiceForm.subcategoryName}</span>
      </div>
      <div class="detail-item">
        <span class="label">المبلغ المقدر:</span>
        <span class="value">${formatCurrency(
          selectedAssignment.estimated_amount || 0
        )}</span>
      </div>
      
    </div>
  </div>
</div>

<div class="line-items">
  <h3>بنود الفاتورة التفصيلية</h3>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>البيان والوصف</th>
          <th>الكمية</th>
          <th>الوحدة</th>
          <th>السعر الوحدة</th>
          <th>إجمالي المبلغ</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceForm.lineItems
          .map(
            (item) => `
          <tr>
            <td class="description-cell">
              <strong>${item.description}</strong>
              ${item.details ? `<br><small>${item.details}</small>` : ""}
            </td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td class="amount-cell">${formatCurrency(item.total)}</td>
            <td>${item.details || "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
</div>

<div class="invoice-summary">
  <div class="summary-section">
    <div class="summary-row">
      <span class="summary-label">المجموع الفرعي:</span>
      <span class="summary-value">${formatCurrency(invoiceForm.subtotal)}</span>
    </div>
    ${
      invoiceForm.taxPercentage > 0
        ? `
      <div class="summary-row">
        <span class="summary-label">ضريبة القيمة المضافة (${
          invoiceForm.taxPercentage
        }%):</span>
        <span class="summary-value">${formatCurrency(
          invoiceForm.taxAmount
        )}</span>
      </div>
      `
        : ""
    }
    ${
      invoiceForm.discount > 0
        ? `
      <div class="summary-row discount-row">
        <span class="summary-label">الخصم المطبق:</span>
        <span class="summary-value">-${formatCurrency(
          invoiceForm.discount
        )}</span>
      </div>
      `
        : ""
    }
    <div class="summary-row total-row">
      <span class="summary-label">إجمالي المبلغ المستحق:</span>
      <span class="summary-value">${formatCurrency(
        invoiceForm.totalAmount
      )}</span>
    </div>
  </div>
</div>

${
  invoiceForm.notes
    ? `
  <div class="notes-section">
    <h4>ملاحظات إضافية</h4>
    <p>${invoiceForm.notes}</p>
  </div>
  `
    : ""
}

${
  invoiceForm.attachmentData
    ? `
  <div class="attachment-section">
    <h4>صورة فاتورة العميل</h4>
    <div class="attachment-container">
      ${
        hasValidImage
          ? `
      <img src="data:${invoiceForm.attachmentType};base64,${validatedAttachmentData}" 
           alt="فاتورة العميل" 
           class="customer-invoice-image print-image" 
           onload="console.log('Customer invoice image loaded successfully'); this.style.display='block';"
           onerror="console.error('Failed to load customer invoice image after validation');"
           style="max-width: 400px; max-height: 300px; border: 2px solid #0ea5e9; border-radius: 8px; margin: 10px 0; display: block; page-break-inside: avoid;" />
      `
          : `
      <div style="padding: 20px; border: 2px dashed #dc2626; border-radius: 8px; background: #fef2f2; color: #dc2626; text-align: center;">
        <p><strong>⚠️ خطأ في تحميل الصورة</strong></p>
        <p>لا يمكن عرض صورة فاتورة العميل بسبب خطأ في البيانات</p>
        <p style="font-size: 12px;">نوع الملف: ${invoiceForm.attachmentType}</p>
        <p style="font-size: 12px;">حجم البيانات: ${
          invoiceForm.attachmentData ? invoiceForm.attachmentData.length : 0
        } حرف</p>
      </div>
      `
      }
      <div style="font-size: 10px; color: #666; margin-top: 5px;">
        نوع الملف: ${invoiceForm.attachmentType} | حجم البيانات: ${
        invoiceForm.attachmentData ? invoiceForm.attachmentData.length : 0
      } حرف
      </div>
      <p class="attachment-info">اسم الملف: ${
        invoiceForm.attachmentFilename
      }</p>
      <p class="attachment-info">حجم الملف: ${Math.round(
        (invoiceForm.attachmentSize || 0) / 1024
      )} كيلوبايت</p>
    </div>
  </div>
  `
    : ""
}

<div class="invoice-footer">
 
    
  
  </div>
  
  <div class="footer-signature">
    <div class="signature-section">
      <div class="signature-line">
        <div class="signature-box">
          <p>توقيع المدير المالي</p>
          <div class="signature-space"></div>
        </div>
        <div class="signature-box">
          <p>ختم الشركة</p>
          <div class="signature-space"></div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="footer-note">
    <p>هذه فاتورة مُصدرة إلكترونياً من نظام إدارة المشاريع المالية - قصر الشام</p>
    <p>جميع الحقوق محفوظة © 2024 قصر الشام للمشاريع الإنشائية</p>

  </div>
</div>
`;

      // Create professional print window with complete RTL Arabic styling
      const printWindow = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <title>فاتورة ${invoiceForm.invoiceNumber} - قصر الشام</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap');
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1a202c; 
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
      max-width: 900px;
      margin: 0 auto;
      padding: 30px;
      direction: rtl;
      text-align: right;
    }
    
    /* Force image display in all browsers */
    img {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
      display: block !important;
      visibility: visible !important;
    }
    
    /* Header Styles */
    .invoice-header {
      background: linear-gradient(135deg, #2e3192 0%, #4338ca 100%);
      color: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(46, 49, 146, 0.15);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
    }
    
    .company-section {
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;
    }
    
         .logo-container {
       width: 70px;
       height: 70px;
       background: rgba(255, 255, 255, 0.15);
       border-radius: 12px;
       display: flex;
       align-items: center;
       justify-content: center;
       backdrop-filter: blur(10px);
       border: 1px solid rgba(255, 255, 255, 0.2);
       flex-shrink: 0;
       padding: 8px;
     }
     
     .logo-container img {
       width: 100%;
       height: 100%;
       object-fit: contain;
       filter: brightness(0) invert(1);
     }
    
    .company-details h1 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 8px;
      text-align: right;
    }
    
    .subtitle {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 6px;
      text-align: right;
    }
    
    .company-address, .company-email {
      font-size: 13px;
      opacity: 0.8;
      margin-bottom: 3px;
      text-align: right;
    }
    
    .invoice-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 250px;
    }
    
    .invoice-number, .invoice-date, .invoice-category, .customer-invoice-number {
      background: rgba(255, 255, 255, 0.1);
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .customer-invoice-number {
      background: rgba(255, 215, 0, 0.2);
      border-color: rgba(255, 215, 0, 0.4);
    }
    
    .invoice-info .label {
      font-size: 14px;
      opacity: 0.8;
      font-weight: 500;
    }
    
    .invoice-info .value {
      font-size: 16px;
      font-weight: 700;
      font-family: 'Cairo', monospace;
    }
    
    /* Main Details */
    .main-details {
      margin-bottom: 30px;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }
    
    .detail-card {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .project-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-color: #22c55e;
    }
    
    .contractor-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-color: #f59e0b;
    }
    
    .detail-card h3 {
      color: #1e293b;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      text-align: right;
      border-bottom: 2px solid currentColor;
      padding-bottom: 8px;
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    
    .detail-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    .detail-item .label {
      font-weight: 600;
      color: #374151;
      flex: 1;
    }
    
    .detail-item .value {
      color: #1f2937;
      font-weight: 500;
      text-align: left;
      flex: 1.5;
    }
    
    /* Table Styles */
    .line-items {
      margin: 40px 0;
    }
    
    .line-items h3 {
      color: #1e293b;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      text-align: right;
      border-bottom: 3px solid #2e3192;
      padding-bottom: 10px;
    }
    
    .table-container {
      overflow-x: auto;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      direction: rtl;
    }
    
         th {
       background: linear-gradient(135deg, #2e3192 0%, #4338ca 100%);
       color: white;
       padding: 16px 12px;
       font-weight: 700;
       font-size: 14px;
       text-align: right;
       border-bottom: 3px solid #1e40af;
       border-left: 1px solid rgba(255, 255, 255, 0.2);
     }
     
     th:first-child {
       border-top-right-radius: 12px;
       border-left: none;
     }
     
     th:last-child {
       border-top-left-radius: 12px;
     }
     
     td {
       padding: 14px 12px;
       border-bottom: 1px solid #e5e7eb;
       border-left: 1px solid #e5e7eb;
       text-align: right;
       font-size: 14px;
       vertical-align: top;
     }
     
     td:first-child {
       border-left: none;
     }
     
     tbody tr:last-child td:first-child {
       border-bottom-right-radius: 12px;
     }
     
     tbody tr:last-child td:last-child {
       border-bottom-left-radius: 12px;
     }
    
    .description-cell {
      min-width: 200px;
    }
    
    .description-cell strong {
      color: #1f2937;
      font-weight: 600;
    }
    
    .description-cell small {
      color: #6b7280;
      font-size: 12px;
      line-height: 1.4;
    }
    
    .amount-cell {
      font-weight: 700;
      color: #059669;
      font-family: 'Cairo', monospace;
    }
    
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    
    tbody tr:hover {
      background: #f1f5f9;
    }
    
    /* Summary Styles */
    .invoice-summary {
      margin: 40px 0;
      display: flex;
      justify-content: flex-start;
    }
    
    .summary-section {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      min-width: 350px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 15px;
    }
    
    .summary-row:last-child {
      border-bottom: none;
    }
    
    .summary-label {
      font-weight: 600;
      color: #374151;
    }
    
    .summary-value {
      font-weight: 700;
      font-family: 'Cairo', monospace;
      color: #1f2937;
    }
    
    .discount-row .summary-value {
      color: #dc2626;
    }
    
    .total-row {
      border-top: 3px solid #2e3192 !important;
      margin-top: 15px;
      padding-top: 20px !important;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 8px;
      padding: 20px 15px !important;
      margin: 15px -10px 0 -10px;
    }
    
    .total-row .summary-label {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
    }
    
    .total-row .summary-value {
      font-size: 22px;
      font-weight: 800;
      color: #1e40af;
    }
    
    /* Notes Section */
    .notes-section {
      margin: 30px 0;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
    }
    
    .notes-section h4 {
      color: #92400e;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 15px;
      text-align: right;
    }
    
    .notes-section p {
      color: #451a03;
      line-height: 1.7;
      font-size: 14px;
      text-align: right;
    }
    
    /* Attachment Section */
    .attachment-section {
      margin: 30px 0;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      text-align: center;
    }
    
    .attachment-section h4 {
      color: #0c4a6e;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 15px;
      text-align: right;
    }
    
    .attachment-container {
      text-align: center;
    }
    
    .customer-invoice-image {
      max-width: 400px;
      max-height: 300px;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      margin: 10px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: block;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    @media print {
      .customer-invoice-image {
        max-width: 350px;
        max-height: 250px;
        border: 2px solid #000 !important;
        box-shadow: none;
        page-break-inside: avoid;
        display: block !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .attachment-section {
        page-break-inside: avoid;
        margin: 20px 0;
        border: 2px solid #000 !important;
        background: white !important;
      }
    }
    
    .attachment-info {
      color: #0c4a6e;
      font-size: 12px;
      margin-top: 8px;
      font-style: italic;
    }
    
    /* Footer Styles */
    .invoice-footer {
      margin-top: 50px;
      border-top: 4px solid #2e3192;
      padding-top: 30px;
    }
    
    .footer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .payment-terms, .bank-details {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
    }
    
    .payment-terms h4, .bank-details h4 {
      color: #1e293b;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 15px;
      text-align: right;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
    }
    
    .payment-terms p, .bank-details p {
      color: #374151;
      font-size: 14px;
      margin-bottom: 8px;
      text-align: right;
      line-height: 1.6;
    }
    
    .footer-signature {
      margin-bottom: 30px;
    }
    
    .signature-line {
      display: flex;
      justify-content: space-around;
      gap: 40px;
    }
    
    .signature-box {
      text-align: center;
      flex: 1;
    }
    
    .signature-box p {
      color: #374151;
      font-weight: 600;
      margin-bottom: 15px;
      font-size: 14px;
    }
    
    .signature-space {
      height: 60px;
      border-bottom: 2px solid #6b7280;
      margin: 0 20px;
    }
    
    .footer-note {
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    
    .footer-note p {
      color: #64748b;
      font-size: 12px;
      margin: 5px 0;
      line-height: 1.5;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      body {
        padding: 20px 15px;
      }
      
      .header-content {
        flex-direction: column;
        gap: 20px;
      }
      
      .invoice-info {
        width: 100%;
      }
      
      .details-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .footer-info {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .signature-line {
        flex-direction: column;
        gap: 30px;
      }
      
      .table-container {
        overflow-x: scroll;
      }
      
      table {
        min-width: 600px;
      }
    }
    
    @media print {
      body { 
        margin: 0; 
        padding: 15px; 
        font-size: 12px;
      }
      
      .invoice-header {
        margin-bottom: 20px;
      }
      
      .details-grid {
        grid-template-columns: 1fr 1fr;
      }
      
      .footer-info {
        grid-template-columns: 1fr 1fr;
      }
      
      .table-container {
        overflow: visible;
      }
      
      .signature-space {
        height: 40px;
      }
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

        // Wait for images to load before printing
        if (invoiceForm.attachmentData) {
          const images = newWindow.document.querySelectorAll(
            ".customer-invoice-image"
          );
          let imagesLoaded = 0;
          const totalImages = images.length;

          if (totalImages > 0) {
            const checkImagesLoaded = () => {
              imagesLoaded++;
              if (imagesLoaded === totalImages) {
                // All images loaded, now print
                setTimeout(() => {
                  newWindow.focus();
                  newWindow.print();
                  setTimeout(() => {
                    newWindow.close();
                    setIsPrintMode(false);
                  }, 1000);
                }, 500);
              }
            };

            images.forEach((img) => {
              if ((img as HTMLImageElement).complete) {
                checkImagesLoaded();
              } else {
                (img as HTMLImageElement).onload = checkImagesLoaded;
                (img as HTMLImageElement).onerror = () => {
                  console.error(
                    "Failed to load customer invoice image for printing"
                  );
                  checkImagesLoaded(); // Continue even if image fails
                };
              }
            });
          } else {
            // No images, print immediately
            newWindow.focus();
            newWindow.print();
            setTimeout(() => {
              newWindow.close();
              setIsPrintMode(false);
            }, 1000);
          }
        } else {
          // No attachment, print immediately
          newWindow.focus();
          newWindow.print();
          setTimeout(() => {
            newWindow.close();
            setIsPrintMode(false);
          }, 1000);
        }
      } else {
        setIsPrintMode(false);
      }
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

                {/* Customer Invoice & Attachment Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="h-5 w-5 ml-2 text-blue-600 no-flip" />
                    فاتورة العميل والمرفقات
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Customer Invoice Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رقم فاتورة العميل (اختياري)
                        <span className="text-xs text-gray-500 block">
                          لمنع التكرار والاحتيال إذا تم إدخاله
                        </span>
                      </label>
                      <div className="relative">
                        <Input
                          value={invoiceForm.customerInvoiceNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            setInvoiceForm((prev) => ({
                              ...prev,
                              customerInvoiceNumber: value,
                            }));
                            // Check for duplicates with debounce
                            setTimeout(
                              () => checkDuplicateInvoiceNumber(value),
                              500
                            );
                          }}
                          placeholder="أدخل رقم فاتورة العميل المكتوبة بخط اليد"
                          className={`${
                            duplicateWarning ? "border-red-300 bg-red-50" : ""
                          }`}
                        />
                        {isDuplicateChecking && (
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                      {duplicateWarning && (
                        <div className="mt-1 flex items-center text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4 ml-1 no-flip" />
                          <span>{duplicateWarning}</span>
                        </div>
                      )}
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        صورة الفاتورة
                        <span className="text-xs text-gray-500 block">
                          للمقارنة والتحقق عند الحاجة
                        </span>
                      </label>

                      {!invoiceForm.attachmentData ? (
                        <div className="relative">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center"
                          >
                            {isUploading ? (
                              <>
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                                <span className="text-sm text-gray-600">
                                  جاري الرفع...
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-6 w-6 text-gray-400 mb-2 no-flip" />
                                <span className="text-sm text-gray-600">
                                  اضغط لرفع صورة الفاتورة
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg p-3 bg-green-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <ImageIcon className="h-5 w-5 text-green-600 ml-2 no-flip" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {invoiceForm.attachmentFilename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {Math.round(
                                    (invoiceForm.attachmentSize || 0) / 1024
                                  )}
                                  KB - تم الضغط
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeAttachment}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 no-flip" />
                            </Button>
                          </div>

                          {/* Preview thumbnail */}
                          <div className="mt-2">
                            <img
                              src={`data:${invoiceForm.attachmentType};base64,${invoiceForm.attachmentData}`}
                              alt="معاينة الفاتورة"
                              className="max-w-full h-20 object-cover rounded border"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 ml-2 mt-0.5 no-flip" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">نصائح مهمة:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>
                            رقم فاتورة العميل اختياري لكنه يساعد في منع الدفع
                            المتكرر لنفس الفاتورة
                          </li>
                          <li>
                            صورة الفاتورة اختيارية لكنها مفيدة للمراجعة والتحقق
                          </li>
                          <li>سيتم ضغط الصورة تلقائياً لتوفير مساحة التخزين</li>
                        </ul>
                      </div>
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
                        مقاول / مشتريات
                      </h3>
                      <select
                        value={invoiceForm.categoryAssignmentId}
                        onChange={(e) => handleContractorChange(e.target.value)}
                        className="w-full"
                      >
                        <option value="">-- اختر --</option>
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
                          // Format amount based on permissions - avoid span in option
                          const formattedAmount =
                            permissions.canViewProjectBudgets
                              ? estimatedAmount.toLocaleString() + " د.ع"
                              : "*****";
                          return (
                            <option key={assignment.id} value={assignment.id}>
                              {contractorName} - ({formattedAmount})
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
                          <FinancialDisplay
                            value={
                              selectedAssignment.estimated_amount ||
                              selectedAssignment.estimatedAmount ||
                              0
                            }
                          />
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
                                <FinancialDisplay value={item.total} />
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
                            <FinancialDisplay value={invoiceForm.subtotal} />
                          </span>
                        </div>
                        {invoiceForm.taxPercentage > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>الضريبة ({invoiceForm.taxPercentage}%):</span>
                            <span className="font-medium">
                              <FinancialDisplay value={invoiceForm.taxAmount} />
                            </span>
                          </div>
                        )}
                        {invoiceForm.discount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>الخصم:</span>
                            <span className="font-medium">
                              -<FinancialDisplay value={invoiceForm.discount} />
                            </span>
                          </div>
                        )}
                        <div className="border-t pt-2">
                          <div className="flex justify-between text-base font-bold">
                            <span>الإجمالي:</span>
                            <span>
                              <FinancialDisplay
                                value={invoiceForm.totalAmount}
                              />
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
                      <FinancialDisplay
                        value={
                          (selectedAssignment.estimated_amount ||
                            selectedAssignment.estimatedAmount ||
                            0) - invoiceForm.totalAmount
                        }
                      />
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
                    !!duplicateWarning ||
                    isDuplicateChecking ||
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
