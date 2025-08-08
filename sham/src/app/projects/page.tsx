"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  User,
  Clock,
  X,
  Save,
  Upload,
  Trash2,
  Printer,
  Download,
  Settings,
  Info,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import {
  Project,
  Invoice,
  EnhancedProjectFormData,
  ProjectCategoryAssignmentFormData,
} from "@/types";
import PageNavigation from "@/components/layout/PageNavigation";
import { useToast } from "@/components/ui/Toast";
import EnhancedProjectModal from "@/components/projects/EnhancedProjectModal";

import ProjectsTable from "@/components/projects/ProjectsTable";
import { EnhancedInvoice, InvoiceFormData } from "@/types/shared";
import { useSafe } from "@/contexts/SafeContext";
import { useAuth } from "@/contexts/AuthContext";

// No hardcoded data - start with empty state for real testing

const statusColors = {
  planning: "bg-yellow-100 text-yellow-800 border-yellow-200 text-color ",
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

// Auto-generate project code
const generateProjectCode = (existingProjects: Project[]): string => {
  const currentYear = new Date().getFullYear();
  const existingCodes = existingProjects
    .map((p) => p.code)
    .filter((code) => code.startsWith(`PRJ-${currentYear}-`))
    .map((code) => parseInt(code.split("-")[2]))
    .filter((num) => !isNaN(num));

  const nextNumber =
    existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
  return `PRJ-${currentYear}-${nextNumber.toString().padStart(3, "0")}`;
};

// Note: Simplified to single unified invoice type (no more templates)

export default function ProjectsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { safeState, deductForInvoice, hasBalance } = useSafe();
  const { hasPermission, isDataEntry, user } = useAuth();

  // Start with empty state, load from API
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<EnhancedInvoice[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Function to load projects from API
  const loadProjectsFromAPI = async () => {
    try {
      setProjectsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const apiProjects = await response.json();

      // Convert API projects to frontend format
      const formattedProjects = apiProjects.map((project: any) => ({
        id: project.id,
        name: project.name,
        code: project.code,
        location: project.location,
        area: project.area,
        budgetEstimate: project.budget_estimate,
        client: project.client,
        startDate: project.start_date?.split("T")[0] || "",
        endDate: project.end_date?.split("T")[0] || "",
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        categoryAssignments: project.categoryAssignments || [],
      }));

      setProjects(formattedProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      addToast({
        type: "error",
        message: "فشل في تحميل المشاريع",
        title: "",
      });
      // Fallback to localStorage on API error
      const storedProjects = localStorage.getItem("financial-projects");
      if (storedProjects) {
        try {
          setProjects(JSON.parse(storedProjects));
        } catch (error) {
          console.warn("Failed to load projects from localStorage:", error);
        }
      }
    } finally {
      setProjectsLoading(false);
    }
  };

  // Function to reload data (keeping for backward compatibility)
  const reloadDataFromStorage = () => {
    loadProjectsFromAPI();

    // Still load invoices from localStorage for now
    const storedInvoices = localStorage.getItem("financial-invoices");
    if (storedInvoices) {
      try {
        setInvoices(JSON.parse(storedInvoices));
      } catch (error) {
        console.warn("Failed to load invoices from localStorage:", error);
      }
    }
  };

  // Load projects and invoices from localStorage on mount
  React.useEffect(() => {
    reloadDataFromStorage();
  }, []);

  // Listen for localStorage changes (cross-tab synchronization)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "financial-projects" || e.key === "financial-invoices") {
        reloadDataFromStorage();
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener("storage", handleStorageChange);

    // Listen for manual storage events from same tab
    window.addEventListener("storage", reloadDataFromStorage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storage", reloadDataFromStorage);
    };
  }, []);

  // Save to localStorage whenever projects change
  React.useEffect(() => {
    localStorage.setItem("financial-projects", JSON.stringify(projects));
  }, [projects]);

  // Note: Removed auto-save for invoices to prevent data overwrites
  // Invoices are now saved only when explicitly created/updated
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Single modal state management
  const [currentModal, setCurrentModal] = useState<{
    type: "project" | "invoice" | "invoice-preview" | null;
    mode?: "create" | "edit";
    data?: any;
    context?: { projectId?: string };
  }>({ type: null });

  // Enhanced form states
  const [projectForm, setProjectForm] = useState<EnhancedProjectFormData>({
    name: "",
    location: "",
    area: "",
    budgetEstimate: "",
    client: "",
    startDate: "",
    endDate: "",
    status: "planning" as "planning" | "active" | "completed" | "cancelled",
    categoryAssignments: [],
  });

  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0], // Auto-set current date
    notes: "",
    taxPercentage: "",
    discountAmount: "",
    paymentTerms: "",
    dueDate: "",
    customFields: [],
    lineItems: [],
  });

  // Generate sequential invoice number using project code
  const generateInvoiceNumber = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    const projectInvoices = invoices.filter(
      (inv) => inv.projectId === projectId
    );
    const nextNumber = (projectInvoices.length + 1).toString().padStart(3, "0");
    const year = new Date().getFullYear();

    // Use project code, fallback to projectId
    const projectIdentifier = project?.code || projectId.substring(0, 8);

    return `${projectIdentifier}-${year}-${nextNumber}`;
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProjectInvoices = (projectId: string) => {
    return invoices.filter((invoice) => invoice.projectId === projectId);
  };

  const getProjectTotalInvoiced = (projectId: string) => {
    return getProjectInvoices(projectId).reduce(
      (total, invoice) => total + invoice.amount,
      0
    );
  };

  // Print invoice functionality with professional QS template
  const printInvoice = (invoice: EnhancedInvoice) => {
    const project = projects.find((p) => p.id === invoice.projectId);
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      // Calculate totals from line items or use invoice amount
      const subtotal =
        invoice.lineItems?.reduce((sum, item) => sum + item.total, 0) ||
        invoice.amount;
      const tax = invoice.taxPercentage
        ? (subtotal * invoice.taxPercentage) / 100
        : 0;
      const discount = invoice.discountAmount || 0;
      const total = subtotal + tax - discount;

      // Use global formatCurrency function for IQD formatting

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة ${
            invoice.invoiceNumber
          } - شركة قصر الشام للإنشاء والتطوير العقاري</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              direction: rtl; 
              background: #f8fafc;
              color: #1a202c;
              line-height: 1.6;
            }
            
            .invoice-container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              min-height: 297mm;
            }
            
            /* Header Section */
            .invoice-header {
              background: linear-gradient(135deg, #2e3192 0%, #1e2470 100%);
              color: white;
              padding: 40px;
              position: relative;
              overflow: hidden;
            }
            
            .header-pattern {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-image: 
                radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);
            }
            
            .header-content {
              position: relative;
              z-index: 2;
              display: grid;
              grid-template-columns: 120px 1fr auto;
              gap: 30px;
              align-items: center;
            }
            
            .company-logo {
              width: 80px;
              height: auto;
              filter: brightness(0) invert(1);
            }
            
            .company-info h1 {
              font-size: 32px;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
            }
            
            .company-info p {
              font-size: 16px;
              opacity: 0.9;
              margin-bottom: 4px;
            }
            
            .invoice-title {
              text-align: left;
            }
            
            .invoice-title h2 {
              font-size: 28px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            
            .invoice-title .invoice-number {
              font-size: 18px;
              opacity: 0.9;
              font-weight: 500;
            }
            
            /* Invoice Details Section */
            .invoice-details {
              padding: 40px;
              background: #fff;
            }
            
            .details-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            
            .detail-section h3 {
              color: #2e3192;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .detail-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            
            .detail-item:last-child {
              border-bottom: none;
            }
            
            .detail-label {
              font-weight: 500;
              color: #64748b;
              font-size: 14px;
            }
            
            .detail-value {
              font-weight: 600;
              color: #1a202c;
              font-size: 14px;
            }
            
            /* Services Table */
            .services-section {
              margin: 40px 0;
            }
            
            .services-section h3 {
              color: #2e3192;
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 20px;
              text-align: center;
            }
            
            .services-table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            
            .services-table thead {
              background: linear-gradient(135deg, #2e3192, #1e2470);
            }
            
            .services-table th {
              padding: 20px;
              text-align: right;
              color: white;
              font-weight: 600;
              font-size: 16px;
            }
            
            .services-table td {
              padding: 20px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }
            
            .services-table tbody tr:hover {
              background: #f8fafc;
            }
            
            .services-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            /* Custom Fields Section */
            .custom-fields {
              margin: 30px 0;
              background: #f8fafc;
              border-radius: 12px;
              padding: 25px;
            }
            
            .custom-fields h4 {
              color: #2e3192;
              font-size: 18px;
              margin-bottom: 20px;
              font-weight: 600;
            }
            
            .custom-field {
              display: grid;
              grid-template-columns: 1fr 2fr;
              gap: 15px;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .custom-field:last-child {
              border-bottom: none;
            }
            
            .custom-field-label {
              font-weight: 600;
              color: #475569;
            }
            
            .custom-field-value {
              color: #1a202c;
            }
            
            /* Totals Section */
            .totals-section {
              background: #f8fafc;
              border-radius: 12px;
              padding: 30px;
              margin-top: 30px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .total-row:last-child {
              border-bottom: none;
            }
            
            .total-row.subtotal {
              font-size: 16px;
            }
            
            .total-row.tax {
              color: #2563eb;
              font-weight: 500;
            }
            
            .total-row.discount {
              color: #dc2626;
              font-weight: 500;
            }
            
            .total-row.final {
              background: linear-gradient(135deg, #2e3192, #1e2470);
              color: white;
              font-size: 24px;
              font-weight: 700;
              margin-top: 15px;
              padding: 20px;
              border-radius: 8px;
              border: none;
            }
            
            /* Payment Terms */
            .payment-terms {
              background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
              border: 2px solid #0ea5e9;
              border-radius: 12px;
              padding: 25px;
              margin-top: 30px;
            }
            
            .payment-terms h4 {
              color: #0c4a6e;
              font-size: 18px;
              margin-bottom: 15px;
              font-weight: 600;
            }
            
            .payment-terms p {
              color: #075985;
              line-height: 1.6;
              font-size: 15px;
            }
            
            /* Footer */
            .invoice-footer {
              background: #2e3192;
              color: white;
              padding: 30px 40px;
              text-align: center;
              margin-top: 40px;
            }
            
            .invoice-footer p {
              opacity: 0.9;
              font-size: 14px;
            }
            
            /* Print Styles */
            @media print {
              body { 
                background: white; 
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .invoice-container {
                box-shadow: none;
                max-width: none;
                margin: 0;
              }
              .invoice-header,
              .totals-section .total-row.final,
              .invoice-footer {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            
            @page {
              margin: 15mm;
              size: A4;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header Section -->
            <div class="invoice-header">
              <div class="header-pattern"></div>
              <div class="header-content">
                <div class="logo-section">
                  <svg class="company-logo" viewBox="0 0 144.29 258.76" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M91.01,247.12h0c-13.74-5.91,0,0-13.74-5.91v-86.73h0l13.74,6.66v85.98Z"/>
                    <path fill="currentColor" d="M116.93,258.47h0c-13.74-5.87,0,0-13.74-5.87v-86.19h0l13.74,6.62v85.45Z"/>
                    <path fill="currentColor" d="M39.67,166.12h0c-13.74,5.91,0,0-13.74,5.91v86.73h0l13.74-6.66v-85.98Z"/>
                    <path fill="currentColor" d="M65.63,154.48h0c-13.83,5.91,0,0-13.83,5.91v86.73h0l13.83-6.66v-85.98Z"/>
                    <path fill="currentColor" d="M144.29,149.1v109.66h-14.98v-101.28l-62.94-28.8,5.77-12.6c15.01,6.87,30.01,13.73,45.02,20.6,7.14,3.27,14.27,6.53,21.41,9.8,1.91.87,3.81,1.75,5.72,2.62Z"/>
                    <path fill="currentColor" d="M0,149.1v109.66h14.98v-101.28l62.94-28.8-5.77-12.6c-15.31,7.01-30.61,14.01-45.92,21.02-4.62,2.12-15.88,7.27-20.51,9.38-.42.19-5.3,2.43-5.72,2.62Z"/>
                    <path fill="currentColor" d="M91.28,133.58h0c-13.74-2.64,0,0-13.74-2.64v-38.7h0c13.74,7.64,0,0,13.74,7.64v33.7Z"/>
                    <path fill="currentColor" d="M52.4,133.58l13.74-2.64v-38.7h0c-13.74,7.64,0,0-13.74,7.64v33.7Z"/>
                    <path fill="currentColor" d="M91.31,74.01v-20.81c-.32-1.75-1.33-5.9-4.85-9.64-3.21-3.41-6.78-4.63-8.23-5.11-1.54-.51-6.8-2.15-12.96,0-4.71,1.65-7.51,4.66-8.62,6-2.74,3.31-3.71,6.69-4.09,8.43v21.13c-3.46,1.61-7.74,4.12-11.9,8.06-10.58,10.02-13.19,22.51-13.95,27.51-.16,9.17-.33,18.34-.49,27.51,4.52-2.07,9.05-4.14,13.57-6.21v-17.96c.3-2.89,1.46-10.36,7.34-17.25,1.32-1.55,5.62-6.28,13.02-9.04,8.74-3.26,16.41-1.76,19.42-.98,3.94,1.01,11.09,3.63,16.84,10.53,5.58,6.71,6.81,13.85,7.15,16.74.05,5.87.09,11.74.14,17.61,4.48,2.05,8.97,4.1,13.45,6.16.07-8.95.13-17.89.2-26.84-.88-5.26-3.73-17.64-14.3-27.7-4.09-3.89-8.29-6.45-11.74-8.13Z"/>
                    <rect fill="currentColor" x="65.82" width="11.49" height="42.77"/>
                  </svg>
                </div>
                
                <div class="company-info">
                  <h1>شركة قصر الشام للإنشاء والتطوير العقاري</h1>
                  <p>العراق - بغداد | الهاتف: +964 xxx xxx xxxx</p>
                </div>
                
                <div class="invoice-title">
                  <h2>INVOICE</h2>
                  <h2>فاتورة</h2>
                  <div class="invoice-number">${invoice.invoiceNumber}</div>
                </div>
              </div>
            </div>

            <!-- Invoice Details -->
            <div class="invoice-details">
              <div class="details-row">
                <div class="detail-section">
                  <h3>معلومات الفاتورة</h3>
                  <div class="detail-item">
                    <span class="detail-label">رقم الفاتورة:</span>
                    <span class="detail-value">${invoice.invoiceNumber}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">تاريخ الإصدار:</span>
                    <span class="detail-value">${formatDate(
                      invoice.date
                    )}</span>
                  </div>
                  ${
                    invoice.dueDate
                      ? `
                  <div class="detail-item">
                    <span class="detail-label">تاريخ الاستحقاق:</span>
                    <span class="detail-value">${formatDate(
                      invoice.dueDate
                    )}</span>
                  </div>`
                      : ""
                  }
                </div>
                
                <div class="detail-section">
                  <h3>معلومات المشروع والعميل</h3>
                  <div class="detail-item">
                    <span class="detail-label">اسم المشروع:</span>
                    <span class="detail-value">${
                      project?.name || "اسم المشروع"
                    }</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">كود المشروع:</span>
                    <span class="detail-value">${
                      project?.code || "كود المشروع"
                    }</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">العميل:</span>
                    <span class="detail-value">${
                      project?.client || "اسم العميل"
                    }</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">موقع المشروع:</span>
                    <span class="detail-value">${
                      project?.location || "موقع المشروع"
                    }</span>
                  </div>
                </div>
              </div>

              <!-- Line Items Table -->
              <div class="services-section">
                <h3>تفاصيل بنود الفاتورة</h3>
                <table class="services-table">
                  <thead>
                    <tr>
                      <th style="width: 50%">وصف البند</th>
                      <th style="width: 15%">الكمية</th>
                      <th style="width: 20%">السعر/الوحدة (د.ع)</th>
                      <th style="width: 15%">المجموع (د.ع)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      invoice.lineItems?.length
                        ? invoice.lineItems
                            .map(
                              (item) => `
                        <tr>
                          <td style="font-weight: 500; color: #1a202c;">
                            ${item.description}
                          </td>
                          <td style="text-align: center;">
                            ${item.quantity}
                          </td>
                          <td style="text-align: center;">
                            ${formatCurrency(item.unitPrice)}
                          </td>
                          <td style="text-align: center; font-weight: 600; color: #2e3192;">
                            ${formatCurrency(item.total)}
                          </td>
                        </tr>
                      `
                            )
                            .join("")
                        : `
                        <tr>
                          <td colspan="3" style="font-weight: 600; color: #1a202c;">
                            ${invoice.notes || "خدمات إنشائية"}
                          </td>
                                                     <td style="text-align: center; font-weight: 600; font-size: 18px; color: #2e3192;">
                             ${formatCurrency(invoice.amount)}
                          </td>
                        </tr>
                      `
                    }
                  </tbody>
                </table>
                ${
                  invoice.notes
                    ? `
                <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                  <strong>ملاحظات:</strong> ${invoice.notes}
                </div>
                `
                    : ""
                }
              </div>

              ${
                invoice.customFields?.length
                  ? `
              <div class="custom-fields">
                <h4>معلومات إضافية</h4>
                ${invoice.customFields
                  .map(
                    (field) => `
                  <div class="custom-field">
                    <div class="custom-field-label">${field.label}:</div>
                    <div class="custom-field-value">${field.value}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>`
                  : ""
              }

              <!-- Totals Section -->
              <div class="totals-section">
                <div class="total-row subtotal">
                  <span>المبلغ الأساسي:</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
                ${
                  tax > 0
                    ? `
                <div class="total-row tax">
                  <span>الضريبة (${invoice.taxPercentage}%):</span>
                  <span>+ ${formatCurrency(tax)}</span>
                </div>`
                    : ""
                }
                ${
                  discount > 0
                    ? `
                <div class="total-row discount">
                  <span>الخصم:</span>
                  <span>- ${formatCurrency(discount)}</span>
                </div>`
                    : ""
                }
                <div class="total-row final">
                  <span>إجمالي المبلغ المستحق:</span>
                  <span>${formatCurrency(total)}</span>
                </div>
              </div>

              ${
                invoice.paymentTerms
                  ? `
              <div class="payment-terms">
                <h4>شروط وأحكام الدفع</h4>
                <p>${invoice.paymentTerms}</p>
                ${
                  invoice.dueDate
                    ? `<p style="margin-top: 10px;"><strong>يرجى سداد المبلغ في موعد أقصاه: ${formatDate(
                        invoice.dueDate
                      )}</strong></p>`
                    : ""
                }
              </div>`
                  : ""
              }
            </div>

            <!-- Footer -->
            <div class="invoice-footer">
              <p>شركة قصر الشام للإنشاء والتطوير العقاري</p>
              <p>شكراً لاختياركم خدماتنا - نتطلع للعمل معكم في المستقبل</p>
            </div>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();

      addToast({
        type: "success",
        title: "تم إرسال الفاتورة للطباعة",
        message: `فاتورة ${invoice.invoiceNumber} جاهزة للطباعة بالتصميم الاحترافي`,
      });
    }
  };

  // CLOSE ALL MODALS
  const closeAllModals = () => {
    setCurrentModal({ type: null });
    resetForms();
  };

  // CLOSE PREVIEW ONLY (without resetting forms)
  const closePreviewModal = () => {
    setCurrentModal({ type: null });
  };

  const resetForms = () => {
    setProjectForm({
      name: "",
      location: "",
      area: "",
      budgetEstimate: "",
      client: "",
      startDate: "",
      endDate: "",
      status: "planning",
      categoryAssignments: [],
    });
    setInvoiceForm({
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0], // Auto-set current date
      notes: "",
      taxPercentage: "",
      discountAmount: "",
      paymentTerms: "",
      dueDate: "",
      customFields: [],
      lineItems: [],
      attachmentFile: undefined, // Clear any attached file
    });
  };

  // Note: Custom field management is now handled within the InvoiceModal component

  // Project CRUD operations
  const handleCreateProject = () => {
    const autoCode = generateProjectCode(projects);
    const newProject: Project = {
      id: generateId(),
      name: projectForm.name,
      code: autoCode, // AUTO GENERATED!
      location: projectForm.location,
      area: parseFloat(projectForm.area) || undefined,
      budgetEstimate: parseFloat(projectForm.budgetEstimate) || 0,
      client: projectForm.client,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      status: projectForm.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects((prev) => [...prev, newProject]);
    closeAllModals();

    addToast({
      type: "success",
      title: "تم إنشاء المشروع بنجاح",
      message: `المشروع "${newProject.name}" تم إنشاؤه بالكود ${newProject.code}`,
    });
  };

  const handleEditProject = async () => {
    if (!currentModal.data) return;

    try {
      console.log("Updating project with data:", projectForm);

      // Make API call to update project
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${currentModal.data.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: projectForm.name,
            location: projectForm.location,
            area: projectForm.area,
            budgetEstimate: projectForm.budgetEstimate,
            client: projectForm.client,
            startDate: projectForm.startDate,
            endDate: projectForm.endDate,
            status: projectForm.status,
            categoryAssignments: projectForm.categoryAssignments,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update project");
      }

      const result = await response.json();
      console.log("Project updated successfully:", result);

      // Update local state with the updated project
      const updatedProject: Project = {
        ...currentModal.data,
        name: projectForm.name,
        location: projectForm.location,
        area: parseFloat(projectForm.area) || undefined,
        budgetEstimate: parseFloat(projectForm.budgetEstimate) || 0,
        client: projectForm.client,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate,
        status: projectForm.status,
        updatedAt: new Date().toISOString(),
        categoryAssignments: result.project?.categoryAssignments || [],
      };

      setProjects((prev) =>
        prev.map((p) => (p.id === currentModal.data.id ? updatedProject : p))
      );

      closeAllModals();

      addToast({
        type: "success",
        title: "تم تحديث المشروع",
        message: `تم تحديث تفاصيل "${updatedProject.name}" بنجاح مع تحديث ${projectForm.categoryAssignments.length} من المهام`,
      });
    } catch (error) {
      console.error("Error updating project:", error);
      addToast({
        type: "error",
        title: "خطأ في التحديث",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحديث المشروع",
      });
    }
  };

  const handleCreateInvoice = async () => {
    if (!currentModal.data) return;

    // Calculate total amount from line items
    const subtotal = invoiceForm.lineItems.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const tax = invoiceForm.taxPercentage
      ? (subtotal * parseFloat(invoiceForm.taxPercentage)) / 100
      : 0;
    const discount = parseFloat(invoiceForm.discountAmount) || 0;
    const invoiceAmount = subtotal + tax - discount;

    const project = projects.find((p) => p.id === currentModal.data);

    // Handle file upload if present
    let attachmentUrl = "";
    if (invoiceForm.attachmentFile) {
      try {
        // Convert file to base64 for localStorage storage
        const fileReader = new FileReader();
        attachmentUrl = await new Promise<string>((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result as string);
          fileReader.onerror = reject;
          fileReader.readAsDataURL(invoiceForm.attachmentFile!);
        });
      } catch (error) {
        console.warn("Failed to process attachment file:", error);
        addToast({
          type: "error",
          title: "خطأ في رفع الملف",
          message: "فشل في حفظ المرفق، سيتم إنشاء الفاتورة بدون مرفق",
        });
      }
    }

    // Create the invoice with different handling for data entry vs admin
    const newInvoice: EnhancedInvoice = {
      id: generateId(),
      projectId: currentModal.data,
      invoiceNumber: invoiceForm.invoiceNumber,
      amount: invoiceAmount, // Calculated total from line items
      date: invoiceForm.date,
      notes: invoiceForm.notes,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(invoiceForm.taxPercentage && {
        taxPercentage: parseFloat(invoiceForm.taxPercentage),
      }),
      ...(invoiceForm.discountAmount && {
        discountAmount: parseFloat(invoiceForm.discountAmount),
      }),
      ...(invoiceForm.paymentTerms && {
        paymentTerms: invoiceForm.paymentTerms,
      }),
      ...(invoiceForm.dueDate && { dueDate: invoiceForm.dueDate }),
      ...(invoiceForm.customFields.length > 0 && {
        customFields: invoiceForm.customFields,
      }),
      // Store line items for detailed invoice display
      lineItems: invoiceForm.lineItems,
      // Add attachment URL if file was uploaded (company use only)
      ...(attachmentUrl && { attachmentUrl }),
      // Workflow tracking
      status: isDataEntry() ? "pending_approval" : "approved",
      submittedBy: user?.fullName || user?.username || "مستخدم غير معروف",
    };

    // Admin users: Process payment through SAFE
    if (hasPermission("canMakePayments")) {
      // Check if SAFE has sufficient balance
      if (!hasBalance(invoiceAmount)) {
        addToast({
          type: "error",
          title: "رصيد الخزينة غير كافي",
          message: `المبلغ المطلوب ${formatCurrency(
            invoiceAmount
          )} أكبر من رصيد الخزينة الحالي ${formatCurrency(
            safeState.currentBalance
          )}`,
        });
        return;
      }

      // Deduct from SAFE first
      const deductionSuccess = deductForInvoice(
        invoiceAmount,
        currentModal.data,
        project?.name || "مشروع غير محدد",
        invoiceForm.invoiceNumber
      );

      if (!deductionSuccess) {
        addToast({
          type: "error",
          title: "فشل في خصم المبلغ",
          message: "لم يتم خصم المبلغ من الخزينة، يرجى المحاولة مرة أخرى",
        });
        return;
      }

      newInvoice.status = "paid";
    }

    const updatedInvoices = [...invoices, newInvoice];
    setInvoices(updatedInvoices);

    // Explicitly save to localStorage
    localStorage.setItem("financial-invoices", JSON.stringify(updatedInvoices));
    console.log(
      `✅ Invoice created and saved: ${newInvoice.invoiceNumber} (Status: ${newInvoice.status})`
    );

    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new Event("storage"));

    closeAllModals();

    // Different success messages for data entry vs admin
    if (isDataEntry()) {
      addToast({
        type: "success",
        title: "تم إنشاء الفاتورة بنجاح",
        message: `فاتورة ${newInvoice.invoiceNumber} تم إدخالها وهي بانتظار مراجعة المدير`,
      });
    } else {
      addToast({
        type: "success",
        title: "تم إنشاء الفاتورة وخصم المبلغ",
        message: `فاتورة ${
          newInvoice.invoiceNumber
        } تم إنشاؤها وخصم ${formatCurrency(
          invoiceAmount
        )} من الخزينة. الرصيد المتبقي: ${formatCurrency(
          safeState.currentBalance - invoiceAmount
        )}`,
      });
    }
  };

  // Navigation functions
  const openCreateProjectModal = () => {
    router.push("/projects/create");
  };

  // Helper function to transform backend category assignments to frontend form structure
  const transformCategoryAssignmentsForEdit = (
    backendAssignments: any[]
  ): ProjectCategoryAssignmentFormData[] => {
    if (!backendAssignments || backendAssignments.length === 0) {
      return [];
    }

    // Group assignments by main_category and subcategory
    const grouped = backendAssignments.reduce((acc, assignment) => {
      const key = `${assignment.main_category}||${assignment.subcategory}`;
      if (!acc[key]) {
        acc[key] = {
          mainCategory: assignment.main_category,
          subcategory: assignment.subcategory,
          contractors: [],
        };
      }

      // Add contractor to the group
      acc[key].contractors.push({
        contractorId: assignment.contractor_id || "",
        contractorName: assignment.contractor_name || "",
        estimatedAmount: assignment.estimated_amount?.toString() || "0",
        notes: assignment.notes || "",
      });

      return acc;
    }, {} as Record<string, ProjectCategoryAssignmentFormData>);

    return Object.values(grouped);
  };

  const openEditProjectModal = (project: Project) => {
    // Transform category assignments from backend structure to frontend form structure
    const transformedAssignments = transformCategoryAssignmentsForEdit(
      project.categoryAssignments || []
    );

    setProjectForm({
      name: project.name,
      location: project.location,
      area: project.area?.toString() || "",
      budgetEstimate: project.budgetEstimate.toString(),
      client: project.client,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      categoryAssignments: transformedAssignments,
    });
    setCurrentModal({ type: "project", mode: "edit", data: project });
  };

  const openProjectDetail = (project: Project) => {
    // Navigate to project detail page (ProjectDetailClient.tsx)
    // ViewProjectModal is no longer used - all project details are shown in the dedicated detail page
    router.push(`/projects/${project.id}`);
  };

  const openCreateInvoiceModal = (projectId: string) => {
    resetForms();
    // Auto-generate sequential invoice number for this project
    const autoInvoiceNumber = generateInvoiceNumber(projectId);
    setInvoiceForm((prev) => ({
      ...prev,
      invoiceNumber: autoInvoiceNumber,
      date: new Date().toISOString().split("T")[0], // Ensure current date
    }));
    setCurrentModal({ type: "invoice", data: projectId });
  };

  const openInvoicePreview = (
    invoice: EnhancedInvoice | InvoiceFormData,
    projectId?: string
  ) => {
    setCurrentModal({
      type: "invoice-preview",
      data: invoice,
      context: { projectId: projectId || (invoice as any)?.projectId },
    });
  };

  return (
    <div className="space-y-8 page-transition">
      {/* Page Navigation */}
      <PageNavigation />

      {/* Compact Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-spacing">
              إدارة المشاريع
            </h1>
            <p className="text-gray-600 arabic-spacing text-sm mt-1">
              نظام متكامل مع الخزينة - المشاريع والفواتير
            </p>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <Button
              variant="outline"
              className="hover:border-[#182C61] hover:text-[#182C61] mr-2"
            >
              <Download className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">تصدير</span>
            </Button>
            <Button
              onClick={openCreateProjectModal}
              className="bg-[#182C61] hover:bg-[#1a2e66]"
            >
              <Plus className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">مشروع جديد</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          className={`grid gap-4 mt-4 pt-4 border-t border-gray-100 ${
            isDataEntry()
              ? "grid-cols-2 md:grid-cols-3"
              : "grid-cols-2 md:grid-cols-4"
          }`}
        >
          {/* SAFE balance - Admin only */}
          {hasPermission("canViewSafe") && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 arabic-nums">
                {formatCurrency(safeState.currentBalance)}
              </div>
              <div className="text-xs text-gray-500 arabic-spacing">
                رصيد الخزينة
              </div>
            </div>
          )}

          {/* Total projects - Always visible */}
          <div className="text-center">
            <div className="text-lg font-bold text-[#182C61]">
              {projects.length}
            </div>
            <div className="text-xs text-gray-500 arabic-spacing">
              إجمالي المشاريع
            </div>
          </div>

          {/* Budget estimates - Admin only */}
          {!isDataEntry() && (
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600 arabic-nums">
                {formatCurrency(
                  projects.reduce(
                    (sum, p) =>
                      sum +
                      (typeof p.budgetEstimate === "number" &&
                      !isNaN(p.budgetEstimate)
                        ? p.budgetEstimate
                        : 0),
                    0
                  )
                )}
              </div>
              <div className="text-xs text-gray-500 arabic-spacing">
                الميزانيات المقدرة
              </div>
            </div>
          )}

          {/* Total spent - Admin only */}
          {hasPermission("canViewSafe") && (
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600 arabic-nums">
                {formatCurrency(safeState.totalSpent)}
              </div>
              <div className="text-xs text-gray-500 arabic-spacing">
                المنفق فعلياً
              </div>
            </div>
          )}

          {/* Data entry specific stats */}
          {isDataEntry() && (
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {invoices.length}
              </div>
              <div className="text-xs text-gray-500 arabic-spacing">
                الفواتير المُدخلة
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 no-flip" />
              <Input
                placeholder="ابحث عن المشاريع، العملاء، أو الأكواد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-10 arabic-spacing border-gray-300 focus:border-[#182C61]"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse mr-2">
              <Filter className="h-4 w-4 text-gray-500 no-flip mr-2" />
              <Select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="all">جميع الحالات</option>
                <option value="planning">في التخطيط</option>
                <option value="active">نشط</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </Select>
            </div>
            <div className="text-sm text-gray-500 arabic-spacing">
              {filteredProjects.length} من {projects.length}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <ProjectsTable
        projects={filteredProjects}
        getProjectInvoices={getProjectInvoices}
        getProjectTotalInvoiced={getProjectTotalInvoiced}
        onViewProject={openProjectDetail}
        onEditProject={openEditProjectModal}
        onCreateInvoice={openCreateInvoiceModal}
      />

      {/* SAFE Balance Alert - Admin only */}
      {hasPermission("canViewSafe") && safeState.currentBalance <= 0 && (
        <Card className="shadow-lg border-0 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-amber-100 p-3 rounded-full">
                <DollarSign className="h-8 w-8 text-amber-600 no-flip" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-800 arabic-spacing mb-2">
                  تحتاج إلى تمويل الخزينة أولاً
                </h3>
                <p className="text-amber-700 arabic-spacing mb-4 leading-relaxed">
                  لبدء إنشاء الفواتير وإدارة المشاريع، يجب تمويل الخزينة أولاً.
                  عند إنشاء الفواتير، سيتم خصم المبالغ من رصيد الخزينة.
                </p>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Button
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      // Navigate to SAFE page for funding
                      window.location.href = "/safe";
                    }}
                  >
                    <DollarSign className="h-4 w-4 ml-2 no-flip" />
                    <span className="arabic-spacing">انتقل لتمويل الخزينة</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {projectsLoading && (
        <Card className="shadow-lg border-0">
          <CardContent className="p-16 text-center">
            <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Building2 className="h-12 w-12 text-blue-500 no-flip animate-bounce" />
            </div>
            <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
              جاري تحميل المشاريع...
            </h3>
            <p className="text-gray-500 arabic-spacing">
              يرجى الانتظار بينما نحضر البيانات من قاعدة البيانات
            </p>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Empty State */}
      {!projectsLoading && filteredProjects.length === 0 && (
        <Card className="shadow-lg border-0">
          <CardContent className="p-16 text-center">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-12 w-12 text-gray-400 no-flip" />
            </div>
            <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
              {searchQuery ? "لا توجد نتائج" : "لا توجد مشاريع بعد"}
            </h3>
            <p className="text-gray-500 mb-8 arabic-spacing text-lg leading-relaxed max-w-md mx-auto">
              {searchQuery
                ? "جرب تعديل معايير البحث أو الفلاتر للعثور على المشاريع"
                : "أنشئ مشروعك الأول. المشاريع لها ميزانيات تقديرية فقط - المبالغ الحقيقية تُخصم عند إنشاء الفواتير"}
            </p>
            <div className="space-y-4">
              <Button
                onClick={openCreateProjectModal}
                size="lg"
                className="bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700"
              >
                <Plus className="h-5 w-5 ml-2 no-flip" />
                <span className="arabic-spacing">إنشاء مشروع جديد</span>
              </Button>

              {/* Financial Flow Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto mt-6">
                <h4 className="font-semibold text-blue-800 arabic-spacing mb-2">
                  💡 كيف يعمل النظام:
                </h4>
                <ol className="text-sm text-blue-700 arabic-spacing space-y-1 text-right">
                  <li>1. تمويل الخزينة أولاً (صفحة الخزينة)</li>
                  <li>2. إنشاء مشاريع بميزانيات تقديرية</li>
                  <li>3. إنشاء فواتير (تُخصم من الخزينة والمشروع)</li>
                  <li>4. تتبع الإنفاق الحقيقي مقابل التقديرات</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Modals */}
      <EnhancedProjectModal
        isOpen={currentModal.type === "project"}
        mode={currentModal.mode!}
        project={currentModal.data}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        onClose={closeAllModals}
        onSubmit={
          currentModal.mode === "create"
            ? handleCreateProject
            : handleEditProject
        }
        generateProjectCode={() => generateProjectCode(projects)}
      />

      {/* Invoice Preview Modal */}
      {currentModal.type === "invoice-preview" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse text-white">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Eye className="h-6 w-6 no-flip" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold arabic-spacing">
                      معاينة الفاتورة
                    </h3>
                    <p className="text-blue-100 arabic-spacing text-sm">
                      {typeof currentModal.data === "object" &&
                      currentModal.data.invoiceNumber
                        ? `فاتورة رقم: ${currentModal.data.invoiceNumber}`
                        : "معاينة قبل الحفظ"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button
                    onClick={() => {
                      if (typeof currentModal.data === "object") {
                        // For form previews, create a temporary invoice object with the current project context
                        if (!currentModal.data.id) {
                          const projectId =
                            currentModal.context?.projectId || "";
                          const tempInvoice = {
                            ...currentModal.data,
                            id: "preview",
                            projectId: projectId,
                            invoiceNumber:
                              currentModal.data.invoiceNumber || "معاينة",
                          };
                          printInvoice(tempInvoice as EnhancedInvoice);
                        } else {
                          printInvoice(currentModal.data as EnhancedInvoice);
                        }
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-blue-900 border-white/30 hover:bg-white/20 hover:text-white"
                  >
                    <Printer className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">طباعة</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closePreviewModal}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4 no-flip" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl mx-auto overflow-hidden">
                {/* Professional Invoice Preview */}
                {(() => {
                  const invoice = currentModal.data as
                    | EnhancedInvoice
                    | InvoiceFormData;

                  // Get project ID from invoice data or modal context
                  const projectId =
                    ("projectId" in invoice && invoice.projectId) ||
                    currentModal.context?.projectId ||
                    null;
                  const project = projectId
                    ? projects.find((p) => p.id === projectId)
                    : null;

                  // Handle both saved invoices and form preview
                  let subtotal = 0;
                  if ("lineItems" in invoice && invoice.lineItems?.length) {
                    subtotal = invoice.lineItems.reduce(
                      (sum, item) => sum + item.total,
                      0
                    );
                  } else if (
                    "amount" in invoice &&
                    typeof invoice.amount === "number"
                  ) {
                    subtotal = invoice.amount;
                  }

                  const tax = invoice?.taxPercentage
                    ? (subtotal *
                        parseFloat(invoice.taxPercentage.toString())) /
                      100
                    : 0;
                  const discount = invoice?.discountAmount
                    ? parseFloat(invoice.discountAmount.toString())
                    : 0;
                  const total = subtotal + tax - discount;

                  return (
                    <div className="invoice-preview">
                      {/* Header with QS Logo */}
                      <div className="bg-gradient-to-r from-[#2e3192] to-[#1e2470] text-white p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <svg
                              className="w-16 h-16 text-white"
                              viewBox="0 0 144.29 258.76"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fill="currentColor"
                                d="M91.01,247.12h0c-13.74-5.91,0,0-13.74-5.91v-86.73h0l13.74,6.66v85.98Z"
                              />
                              <path
                                fill="currentColor"
                                d="M116.93,258.47h0c-13.74-5.87,0,0-13.74-5.87v-86.19h0l13.74,6.62v85.45Z"
                              />
                              <path
                                fill="currentColor"
                                d="M39.67,166.12h0c-13.74,5.91,0,0-13.74,5.91v86.73h0l13.74-6.66v-85.98Z"
                              />
                              <path
                                fill="currentColor"
                                d="M65.63,154.48h0c-13.83,5.91,0,0-13.83,5.91v86.73h0l13.83-6.66v-85.98Z"
                              />
                              <path
                                fill="currentColor"
                                d="M144.29,149.1v109.66h-14.98v-101.28l-62.94-28.8,5.77-12.6c15.01,6.87,30.01,13.73,45.02,20.6,7.14,3.27,14.27,6.53,21.41,9.8,1.91.87,3.81,1.75,5.72,2.62Z"
                              />
                              <path
                                fill="currentColor"
                                d="M0,149.1v109.66h14.98v-101.28l62.94-28.8-5.77-12.6c-15.31,7.01-30.61,14.01-45.92,21.02-4.62,2.12-15.88,7.27-20.51,9.38-.42.19-5.3,2.43-5.72,2.62Z"
                              />
                              <path
                                fill="currentColor"
                                d="M91.28,133.58h0c-13.74-2.64,0,0-13.74-2.64v-38.7h0c13.74,7.64,0,0,13.74,7.64v33.7Z"
                              />
                              <path
                                fill="currentColor"
                                d="M52.4,133.58l13.74-2.64v-38.7h0c-13.74,7.64,0,0-13.74,7.64v33.7Z"
                              />
                              <path
                                fill="currentColor"
                                d="M91.31,74.01v-20.81c-.32-1.75-1.33-5.9-4.85-9.64-3.21-3.41-6.78-4.63-8.23-5.11-1.54-.51-6.8-2.15-12.96,0-4.71,1.65-7.51,4.66-8.62,6-2.74,3.31-3.71,6.69-4.09,8.43v21.13c-3.46,1.61-7.74,4.12-11.9,8.06-10.58,10.02-13.19,22.51-13.95,27.51-.16,9.17-.33,18.34-.49,27.51,4.52-2.07,9.05-4.14,13.57-6.21v-17.96c.3-2.89,1.46-10.36,7.34-17.25,1.32-1.55,5.62-6.28,13.02-9.04,8.74-3.26,16.41-1.76,19.42-.98,3.94,1.01,11.09,3.63,16.84,10.53,5.58,6.71,6.81,13.85,7.15,16.74.05,5.87.09,11.74.14,17.61,4.48,2.05,8.97,4.1,13.45,6.16.07-8.95.13-17.89.2-26.84-.88-5.26-3.73-17.64-14.3-27.7-4.09-3.89-8.29-6.45-11.74-8.13Z"
                              />
                              <rect
                                fill="currentColor"
                                x="65.82"
                                width="11.49"
                                height="42.77"
                              />
                            </svg>
                          </div>

                          <div className="text-center">
                            <p className="text-blue-100 arabic-spacing">
                              شركة قصر الشام للإنشاء والتطوير العقاري
                              <br />
                              نظام الإدارة المالية المتكامل
                            </p>
                          </div>

                          <div className="text-center md:text-left">
                            <h2 className="text-2xl font-bold mb-2">
                              INVOICE / فاتورة
                            </h2>
                            <p className="text-blue-100 font-semibold">
                              {invoice
                                ? invoice.invoiceNumber
                                : (currentModal.data as any)?.invoiceNumber ||
                                  "معاينة"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 bg-white text-gray-900">
                        {/* Invoice Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div>
                            <h3 className="text-lg font-semibold text-[#2e3192] mb-4 arabic-spacing">
                              معلومات الفاتورة
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-700 arabic-spacing">
                                  رقم الفاتورة:
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {invoice
                                    ? invoice.invoiceNumber
                                    : (currentModal.data as any)
                                        ?.invoiceNumber || "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700 arabic-spacing">
                                  تاريخ الإصدار:
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {invoice
                                    ? formatDate(invoice.date)
                                    : (currentModal.data as any)?.date || "-"}
                                </span>
                              </div>
                              {(invoice?.dueDate ||
                                (currentModal.data as any)?.dueDate) && (
                                <div className="flex justify-between">
                                  <span className="text-gray-700 arabic-spacing">
                                    تاريخ الاستحقاق:
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {formatDate(
                                      invoice?.dueDate ||
                                        (currentModal.data as any)?.dueDate
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-[#2e3192] mb-4 arabic-spacing">
                              معلومات المشروع
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-700 arabic-spacing">
                                  اسم المشروع:
                                </span>
                                <span className="font-semibold text-gray-900 arabic-spacing">
                                  {project?.name || "اسم المشروع"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700 arabic-spacing">
                                  كود المشروع:
                                </span>
                                <span className="font-semibold text-gray-900 arabic-spacing">
                                  {project?.code || "كود المشروع"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700 arabic-spacing">
                                  العميل:
                                </span>
                                <span className="font-semibold text-gray-900 arabic-spacing">
                                  {project?.client || "اسم العميل"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700 arabic-spacing">
                                  موقع المشروع:
                                </span>
                                <span className="font-semibold text-gray-900 arabic-spacing">
                                  {project?.location || "موقع المشروع"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="mb-8">
                          <h3 className="text-lg font-semibold text-[#2e3192] mb-4 text-center arabic-spacing">
                            تفاصيل بنود الفاتورة
                          </h3>
                          <div className="bg-gray-50 rounded-xl overflow-hidden">
                            <div className="bg-[#2e3192] text-white p-4">
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-5 font-semibold arabic-spacing">
                                  وصف البند
                                </div>
                                <div className="col-span-2 font-semibold text-center arabic-spacing">
                                  الكمية
                                </div>
                                <div className="col-span-3 font-semibold text-center arabic-spacing">
                                  السعر/الوحدة (د.ع)
                                </div>
                                <div className="col-span-2 font-semibold text-center arabic-spacing">
                                  المجموع (د.ع)
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              {"lineItems" in invoice &&
                              invoice.lineItems?.length ? (
                                <div className="space-y-3">
                                  {invoice.lineItems.map((item, index) => (
                                    <div
                                      key={index}
                                      className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-200 last:border-b-0"
                                    >
                                      <div className="col-span-5 font-medium text-gray-900 arabic-spacing">
                                        {item.description}
                                      </div>
                                      <div className="col-span-2 text-center text-gray-900">
                                        {item.quantity}
                                      </div>
                                      <div className="col-span-3 text-center text-gray-900">
                                        {formatCurrency(item.unitPrice)}
                                      </div>
                                      <div className="col-span-2 text-center font-semibold text-[#2e3192]">
                                        {formatCurrency(item.total)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-10 font-semibold text-gray-900 arabic-spacing">
                                    {invoice?.notes ||
                                      (currentModal.data as any)?.notes ||
                                      "خدمات إنشائية"}
                                  </div>
                                  <div className="col-span-2 text-center font-semibold text-[#2e3192]">
                                    {formatCurrency(subtotal)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Notes section */}
                          {invoice?.notes && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <div className="font-semibold text-gray-800 mb-2 arabic-spacing">
                                ملاحظات:
                              </div>
                              <div className="text-gray-700 arabic-spacing">
                                {invoice.notes}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Custom Fields */}
                        {(invoice?.customFields?.length ||
                          (currentModal.data as any)?.customFields?.length) && (
                          <div className="mb-8 bg-blue-50 rounded-xl p-6">
                            <h4 className="text-lg font-semibold text-[#2e3192] mb-4 arabic-spacing">
                              معلومات إضافية
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(
                                invoice?.customFields ||
                                (currentModal.data as any)?.customFields ||
                                []
                              ).map((field: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center"
                                >
                                  <span className="font-medium text-gray-800 arabic-spacing">
                                    {field.label}:
                                  </span>
                                  <span className="text-gray-900 arabic-spacing">
                                    {field.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Totals */}
                        <div className="bg-gray-50 rounded-xl p-6">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-800 arabic-spacing">
                                المبلغ الأساسي:
                              </span>
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(subtotal)}
                              </span>
                            </div>
                            {tax > 0 && (
                              <div className="flex justify-between text-blue-600">
                                <span className="arabic-spacing">
                                  الضريبة (
                                  {invoice?.taxPercentage ||
                                    (currentModal.data as any)?.taxPercentage}
                                  %):
                                </span>
                                <span className="font-semibold">
                                  + {formatCurrency(tax)}
                                </span>
                              </div>
                            )}
                            {discount > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span className="arabic-spacing">الخصم:</span>
                                <span className="font-semibold">
                                  - {formatCurrency(discount)}
                                </span>
                              </div>
                            )}
                            <div className="border-t pt-3">
                              <div className="bg-[#2e3192] text-white p-4 rounded-lg flex justify-between items-center text-xl font-bold">
                                <span className="arabic-spacing">
                                  إجمالي المبلغ المستحق:
                                </span>
                                <span>{formatCurrency(total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment Terms */}
                        {(invoice?.paymentTerms ||
                          (currentModal.data as any)?.paymentTerms) && (
                          <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                            <h4 className="text-lg font-semibold text-blue-800 mb-3 arabic-spacing">
                              شروط الدفع
                            </h4>
                            <p className="text-blue-700 arabic-spacing">
                              {invoice?.paymentTerms ||
                                (currentModal.data as any)?.paymentTerms}
                            </p>
                            {(invoice?.dueDate ||
                              (currentModal.data as any)?.dueDate) && (
                              <p className="text-blue-700 font-semibold mt-2 arabic-spacing">
                                يرجى السداد قبل:{" "}
                                {formatDate(
                                  invoice?.dueDate ||
                                    (currentModal.data as any)?.dueDate
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="bg-[#2e3192] text-white p-6 text-center">
                        <p className="arabic-spacing">
                          شركة قصر الشام للإنشاء والتطوير العقاري
                        </p>
                        <p className="text-blue-100 text-sm arabic-spacing mt-1">
                          شكراً لاختياركم خدماتنا
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
