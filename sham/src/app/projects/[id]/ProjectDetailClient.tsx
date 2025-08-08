"use client";

/**
 * ProjectDetailClient - Main Project Detail View
 *
 * This component serves as the primary project detail interface, accessed via /projects/[id]
 * It replaces the old ViewProjectModal with a dedicated page that includes:
 * - Project Information Tab (with financial overview)
 * - Categories & Contractors Tab (assignments table)
 * - General Expenses Tab
 *
 * All project viewing now happens through this component instead of modals.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Package,
  Briefcase,
  Settings,
  Users,
  AlertCircle,
  FileText,
  Edit,
  Plus,
  Receipt,
  Search,
  Filter,
  Printer,
  Trash2,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  ChevronRight,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Project, ProjectCategoryAssignment } from "@/types";

// Simple interface for assignment modal use
interface SimpleAssignmentFormData {
  id?: string; // For existing assignments
  categoryId: string;
  mainCategory: string;
  subcategory: string;
  contractorId: string;
  contractorName: string;
  estimatedAmount: string;
  notes?: string;
}
import { PROJECT_CATEGORIES } from "@/constants/projectCategories";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSafe } from "@/contexts/SafeContext";
import EnhancedCategoryInvoiceModal from "@/components/projects/EnhancedCategoryInvoiceModal";
import CategoryAssignmentsTable from "@/components/projects/CategoryAssignmentsTable";
import CategoryAssignmentModal from "@/components/projects/CategoryAssignmentModal";
import { apiRequest } from "@/lib/api";

// Project Expense Interface (for project-specific unstructured expenses)
interface ProjectExpense {
  id: string;
  project_id: string;
  expense_name: string;
  category: string;
  cost: number;
  details?: string;
  expense_date: string;
  receipt_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

const statusColors = {
  planning: "bg-yellow-500 text-white",
  active: "bg-green-500 text-white",
  completed: "bg-blue-500 text-white",
  cancelled: "bg-red-500 text-white",
};

const statusLabels = {
  planning: "في مرحلة التخطيط",
  active: "نشط ومستمر",
  completed: "مكتمل بنجاح",
  cancelled: "ملغي أو متوقف",
};

const categoryIcons = {
  implementation_construction: Package,
  materials_supply: Briefcase,
  specialized_works: Settings,
  administrative_operational: Users,
};

// Gradient colors for category cards
const categoryGradients = [
  "bg-gradient-to-br from-blue-500 to-blue-700",
  "bg-gradient-to-br from-green-500 to-green-700",
  "bg-gradient-to-br from-purple-500 to-purple-700",
  "bg-gradient-to-br from-orange-500 to-orange-700",
  "bg-gradient-to-br from-pink-500 to-pink-700",
  "bg-gradient-to-br from-indigo-500 to-indigo-700",
  "bg-gradient-to-br from-red-500 to-red-700",
  "bg-gradient-to-br from-teal-500 to-teal-700",
];

// Mapping from Arabic category names (from API) to English IDs (used in frontend)
const categoryNameToId: Record<string, string> = {
  "أعمال تنفيذية وإنشائية": "implementation_construction",
  "تجهيز مواد البناء والتشطيب": "materials_supply",
  "أعمال متخصصة وتنفيذ متكامل": "specialized_works",
  "إدارية وتشغيلية": "administrative_operational",
};

// Lazy Loading Hook
const useLazyLoad = (
  ref: React.RefObject<HTMLElement | null>,
  rootMargin = "50px"
) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isVisible;
};

// Category Card Component with Lazy Loading
const CategoryCard = React.memo(
  ({
    category,
    index,
    stats,
    gradientClass,
  }: {
    category: any;
    index: number;
    stats: any;
    gradientClass: string;
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const isVisible = useLazyLoad(cardRef);
    const IconComponent =
      categoryIcons[category.id as keyof typeof categoryIcons];

    return (
      <div
        ref={cardRef}
        className={`${gradientClass} rounded-2xl shadow-lg text-white p-4 sm:p-6 transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl hover:-translate-y-1 cursor-default relative overflow-hidden group ${
          isVisible ? "animate-fade-in-up" : "opacity-0"
        }`}
        style={{
          animationDelay: isVisible ? `${index * 150}ms` : "0ms",
          animationFillMode: "forwards",
        }}
      >
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500"></div>

        {/* Category Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="bg-white/20 p-2 sm:p-3 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors duration-300">
            <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 no-flip" />
          </div>
          <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/20 border border-emerald-400/30 backdrop-blur-sm">
            نشط
          </div>
        </div>

        {/* Category Title */}
        <h3 className="font-bold arabic-spacing text-base sm:text-lg mb-4 leading-tight relative z-10">
          {category.name}
        </h3>

        {/* Statistics */}
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between items-center group-hover:scale-105 transition-transform duration-300">
            <span className="text-white/80 arabic-spacing text-xs sm:text-sm">
              البنود الفرعية
            </span>
            <span className="font-bold text-lg sm:text-xl arabic-nums bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
              {stats.subcategoriesCount}
            </span>
          </div>

          <div className="flex justify-between items-center group-hover:scale-105 transition-transform duration-300">
            <span className="text-white/80 arabic-spacing text-xs sm:text-sm">
              المقاولين
            </span>
            <span className="font-bold text-lg sm:text-xl arabic-nums bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
              {stats.contractorsCount}
            </span>
          </div>

          <div className="pt-2 border-t border-white/20">
            <div className="text-white/70 arabic-spacing text-xs mb-1">
              المبلغ المقدر
            </div>
            <div className="font-bold arabic-spacing arabic-nums text-sm sm:text-lg text-emerald-200">
              {formatCurrency(stats.estimatedAmount)}
            </div>
          </div>
        </div>

        {/* Enhanced Progress Indicator */}
        <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/70">التقدم</span>
            <span className="text-white font-medium">
              {stats.actualAmount > 0 && stats.estimatedAmount > 0
                ? Math.round((stats.actualAmount / stats.estimatedAmount) * 100)
                : 35}
              %
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full h-2 transition-all duration-1000 ease-out group-hover:from-white group-hover:to-emerald-200"
              style={{
                width:
                  stats.actualAmount > 0 && stats.estimatedAmount > 0
                    ? `${Math.min(
                        (stats.actualAmount / stats.estimatedAmount) * 100,
                        100
                      )}%`
                    : "35%",
                animationDelay: `${index * 200 + 500}ms`,
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
);

CategoryCard.displayName = "CategoryCard";

export default function ProjectDetailClient() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { safeState } = useSafe();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>(
    {}
  );
  const [categoryInvoiceModal, setCategoryInvoiceModal] = useState<{
    isOpen: boolean;
    category?: any;
    assignmentData?: any[];
  }>({ isOpen: false });

  // Category Assignment Modal State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [existingAssignments, setExistingAssignments] = useState<
    SimpleAssignmentFormData[]
  >([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null
  );

  // Project Expenses State (unstructured expenses for this project only)
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [newExpense, setNewExpense] = useState({
    expense_name: "",
    category: "",
    cost: "",
    details: "",
    expense_date: new Date().toISOString().split("T")[0],
    receipt_url: "",
  });

  // Tab System State
  const [activeTab, setActiveTab] = useState<
    "info" | "categories" | "expenses"
  >("info");

  // Simple Edit Modal State
  const [showSimpleEditModal, setShowSimpleEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const projectId = params.id as string;

  // Check if category is completed (has approved/paid invoices)
  const isCategoryCompleted = (categoryId: string) => {
    const categoryAssignments = groupedAssignments[categoryId] || [];
    // Check if any assignment in this category has approved invoices
    return categoryAssignments.some(
      (assignment: any) => assignment.has_approved_invoice === true
    );
  };

  // Handle creating category-specific invoice
  const handleCreateCategoryInvoice = (category: any) => {
    const categoryAssignments = groupedAssignments[category.id] || [];

    if (categoryAssignments.length === 0) {
      setTimeout(
        () =>
          addToast({
            title: "خطأ",
            message: "لا توجد تعيينات لهذه الفئة",
            type: "error",
          }),
        0
      );
      return;
    }

    setCategoryInvoiceModal({
      isOpen: true,
      category,
      assignmentData: categoryAssignments,
    });
  };

  // Handle editing category
  const handleEditCategory = (category: any) => {
    if (isCategoryCompleted(category.id)) {
      setTimeout(
        () =>
          addToast({
            title: "تحذير",
            message: "لا يمكن تعديل فئة مكتملة مالياً",
            type: "error",
          }),
        0
      );
      return;
    }

    // Navigate to edit mode or open edit modal
    setTimeout(
      () =>
        addToast({
          title: "معلومات",
          message: "سيتم إضافة وضع التعديل قريباً",
          type: "info",
        }),
      0
    );
  };

  // Navigate to category invoices page
  const handleViewCategoryInvoices = (category: any) => {
    router.push(`/projects/${projectId}/category/${category.id}`);
  };

  // Close category invoice modal
  const closeCategoryInvoiceModal = () => {
    setCategoryInvoiceModal({ isOpen: false });
  };

  // Handle assignment actions for the new table
  const handleEditAssignment = (assignment: any) => {
    // Silent return for protected assignments (button should be disabled anyway)
    if (assignment.has_approved_invoice) {
      return;
    }

    // Open simple edit modal for this specific assignment
    setEditingAssignment(assignment);
    setShowSimpleEditModal(true);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    const assignment = transformedAssignments.find(
      (a: any) => a.id === assignmentId
    );

    // Silent return for missing or protected assignments (button should be disabled anyway)
    if (!assignment || assignment.has_approved_invoice) {
      return;
    }

    // Show confirmation dialog and proceed with deletion
    const confirmDelete = window.confirm(
      `حذف تعيين ${assignment.contractor_name}؟`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setLoading(true);

      // Create updated assignments list without the deleted assignment
      const updatedAssignments = transformedAssignments
        .filter((a: any) => a.id !== assignmentId)
        .map((a: any) => ({
          main_category: a.main_category,
          subcategory: a.subcategory,
          contractor_id: a.contractor_id || a.contractorId,
          contractor_name: a.contractor_name,
          estimated_amount: a.estimated_amount,
          notes: a.notes,
        }));

      // Update project with remaining assignments
      const response = await apiRequest(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          categoryAssignments: updatedAssignments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || errorData.error || "فشل في حذف التعيين"
        );
      }

      // Reload project data
      const projectResponse = await apiRequest(`/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        const formattedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          code: projectData.code,
          location: projectData.location,
          area: projectData.area,
          budgetEstimate: projectData.budget_estimate,
          client: projectData.client,
          startDate: projectData.start_date?.split("T")[0] || "",
          endDate: projectData.end_date?.split("T")[0] || "",
          status: projectData.status,
          createdAt: projectData.created_at,
          updatedAt: projectData.updated_at,
          categoryAssignments: projectData.categoryAssignments || [],
        };
        setProject(formattedProject);
      }

      addToast({
        title: "تم الحذف",
        type: "success",
      });
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      addToast({
        title: "فشل الحذف",
        message: error.message || "حدث خطأ",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = () => {
    // Pass all current assignments to check for duplicates
    // Only include assignments with valid contractor IDs
    const allCurrentAssignments = transformedAssignments
      .filter((a: any) => {
        const contractorId = a.contractor_id || a.contractorId;
        return contractorId && contractorId.trim() !== "";
      })
      .map((a: any) => ({
        id: a.id,
        categoryId: a.category_id || a.categoryId || "",
        mainCategory: a.main_category || a.mainCategory || "",
        subcategory: a.subcategory || "",
        contractorId: a.contractor_id || a.contractorId,
        contractorName: a.contractor_name || a.contractorName || "",
        estimatedAmount:
          a.estimated_amount?.toString() ||
          a.estimatedAmount?.toString() ||
          "0",
        notes: a.notes || "",
      }));

    setExistingAssignments(allCurrentAssignments);
    setEditingAssignmentId(null); // Clear editing ID for new assignment
    setShowAssignmentModal(true);
  };

  const handleSaveAssignments = async (
    assignments: SimpleAssignmentFormData[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      // Transform assignments to API format
      const apiAssignments = assignments.map((assignment) => {
        // Validate contractor_id is not empty
        const contractorId = assignment.contractorId?.trim();
        if (!contractorId) {
          throw new Error(
            `تعيين غير صالح: لا يوجد معرف مقاول للفئة "${assignment.mainCategory} - ${assignment.subcategory}"`
          );
        }

        return {
          main_category: assignment.mainCategory,
          subcategory: assignment.subcategory,
          contractor_id: contractorId,
          contractor_name: assignment.contractorName,
          estimated_amount: Number(assignment.estimatedAmount),
          notes: assignment.notes || null,
        };
      });

      // Call API to update project assignments
      const response = await apiRequest(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          categoryAssignments: apiAssignments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.details ||
          errorData.userMessage ||
          errorData.error ||
          "فشل في حفظ التعيينات";

        // Don't log console errors for business logic errors (like duplicates)
        if (
          errorMessage.includes("التعيين موجود مسبقاً") ||
          errorMessage.includes("مُعيّن بالفعل")
        ) {
          // This is expected business logic validation, handle gracefully
          return { success: false, error: errorMessage };
        }

        // Only log unexpected technical errors
        console.error("Technical error updating project:", errorData);
        return { success: false, error: errorMessage };
      }

      // Reload project data
      const projectResponse = await apiRequest(`/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        const formattedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          code: projectData.code,
          location: projectData.location,
          area: projectData.area,
          budgetEstimate: projectData.budget_estimate,
          client: projectData.client,
          startDate: projectData.start_date?.split("T")[0] || "",
          endDate: projectData.end_date?.split("T")[0] || "",
          status: projectData.status,
          createdAt: projectData.created_at,
          updatedAt: projectData.updated_at,
          categoryAssignments: projectData.categoryAssignments || [],
        };
        setProject(formattedProject);
      }

      return { success: true };
    } catch (error: any) {
      // Only log unexpected technical errors
      console.error("Unexpected error saving assignments:", error);
      return {
        success: false,
        error: error.message || "فشل في حفظ التعيينات",
      };
    } finally {
      setLoading(false);
    }
  };

  const handleViewAssignmentInvoices = (assignment: any) => {
    // Convert assignment to category format for compatibility
    const categoryData = {
      id: assignment.main_category.replace(/\s+/g, "_").toLowerCase(),
      name: assignment.main_category,
    };

    setCategoryInvoiceModal({
      isOpen: true,
      category: categoryData,
      assignmentData: [assignment],
    });
  };

  // Handle creating invoice for a specific assignment (used by table)
  const handleCreateAssignmentInvoice = (assignment: any) => {
    if (!assignment || !assignment.id) {
      addToast({
        title: "تعيين غير صالح",
        type: "error",
      });
      return;
    }

    // Convert assignment to category format for compatibility
    const categoryData = {
      id: assignment.main_category.replace(/\s+/g, "_").toLowerCase(),
      name: assignment.main_category,
    };

    setCategoryInvoiceModal({
      isOpen: true,
      category: categoryData,
      assignmentData: [assignment],
    });
  };

  // Transform project category assignments for the table
  const transformedAssignments = useMemo(() => {
    if (!project?.categoryAssignments) return [];

    return project.categoryAssignments.map((assignment: any) => ({
      id:
        assignment.id ||
        `${assignment.main_category}-${
          assignment.subcategory
        }-${Math.random()}`,
      main_category:
        assignment.main_category || assignment.mainCategory || "غير محدد",
      subcategory: assignment.subcategory || "غير محدد",
      contractor_name:
        assignment.contractor_name || assignment.contractorName || "غير محدد",
      estimated_amount: Number(
        assignment.estimated_amount || assignment.estimatedAmount || 0
      ),
      actual_amount: Number(
        assignment.actual_amount || assignment.actualAmount || 0
      ),
      invoice_count: Number(assignment.invoice_count || 0),
      has_approved_invoice: Boolean(assignment.has_approved_invoice || false),
      status: assignment.status || "active",
      last_invoice_date: assignment.last_invoice_date,
      total_invoices: Number(assignment.total_invoices || 0),
      pending_invoices: Number(assignment.pending_invoices || 0),
      approved_invoices: Number(assignment.approved_invoices || 0),
      paid_invoices: Number(assignment.paid_invoices || 0),
    }));
  }, [project?.categoryAssignments]);

  // Load project data from API
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching project data for ID:", projectId);

        // Fetch project details
        const projectResponse = await apiRequest(`/projects/${projectId}`);

        if (!projectResponse.ok) {
          throw new Error("Project not found");
        }

        const projectData = await projectResponse.json();

        // Convert API project to frontend format
        const formattedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          code: projectData.code,
          location: projectData.location,
          area: projectData.area,
          budgetEstimate: projectData.budget_estimate,
          client: projectData.client,
          startDate: projectData.start_date?.split("T")[0] || "",
          endDate: projectData.end_date?.split("T")[0] || "",
          status: projectData.status,
          createdAt: projectData.created_at,
          updatedAt: projectData.updated_at,
          categoryAssignments: projectData.categoryAssignments || [],
        };

        console.log("Formatted project with assignments:", formattedProject);
        setProject(formattedProject);

        // Fetch invoice counts for all categories
        try {
          const countsResponse = await apiRequest(
            `/category-invoices/project/${projectId}/counts`
          );
          if (countsResponse.ok) {
            const counts = await countsResponse.json();
            console.log("Invoice counts loaded:", counts);
            setInvoiceCounts(counts);
          } else {
            console.warn("Failed to fetch invoice counts");
            setInvoiceCounts({});
          }
        } catch (countsError) {
          console.warn("Error fetching invoice counts:", countsError);
          setInvoiceCounts({});
        }

        // Load project expenses (unstructured expenses for this project)
        try {
          const expensesResponse = await apiRequest(
            `/general-expenses/project/${projectId}`
          );
          if (expensesResponse.ok) {
            const expensesData = await expensesResponse.json();
            console.log("Project expenses loaded:", expensesData);
            setProjectExpenses(expensesData.expenses || []);
          } else {
            console.warn("Failed to fetch project expenses");
            setProjectExpenses([]);
          }
        } catch (expensesError) {
          console.warn("Error fetching project expenses:", expensesError);
          setProjectExpenses([]);
        }
      } catch (error) {
        console.error("Error loading project:", error);
        setError("فشل في تحميل بيانات المشروع");
        // Use setTimeout to avoid dependency issues with addToast
        setTimeout(() => {
          addToast({
            type: "error",
            message: "فشل في تحميل بيانات المشروع",
            title: "",
          });
        }, 0);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  // Group category assignments by main category - use project data directly and memoize
  const projectCategoryAssignments = project?.categoryAssignments || [];

  const groupedAssignments = useMemo(() => {
    if (!projectCategoryAssignments.length) {
      return {};
    }

    return projectCategoryAssignments.reduce(
      (
        acc: Record<string, ProjectCategoryAssignment[]>,
        assignment: ProjectCategoryAssignment
      ) => {
        const arabicCategoryName =
          assignment.main_category || assignment.mainCategory;
        // Map Arabic category name to English ID
        const englishCategoryId =
          categoryNameToId[arabicCategoryName] || arabicCategoryName;

        if (englishCategoryId && !acc[englishCategoryId]) {
          acc[englishCategoryId] = [];
        }
        if (englishCategoryId) {
          acc[englishCategoryId].push(assignment);
        }
        return acc;
      },
      {} as Record<string, ProjectCategoryAssignment[]>
    );
  }, [projectCategoryAssignments, project?.id]);

  // Filter categories to only show ones that have actual data
  const categoriesWithData = useMemo(() => {
    const availableKeys = Object.keys(groupedAssignments);

    return PROJECT_CATEGORIES.filter((category: any) =>
      availableKeys.includes(category.id)
    );
  }, [groupedAssignments]);

  // Memoized function to calculate category statistics
  const getCategoryStats = useCallback(
    (categoryId: string) => {
      const assignments = groupedAssignments[categoryId] || [];

      const totalEstimated = assignments.reduce(
        (sum: number, assignment: any) => {
          const rawAmount =
            assignment.estimated_amount || assignment.estimatedAmount || 0;
          const amount =
            typeof rawAmount === "string" ? parseFloat(rawAmount) : rawAmount;
          return sum + (isNaN(amount) ? 0 : amount);
        },
        0
      );

      const totalActual = assignments.reduce((sum: number, assignment: any) => {
        const rawAmount =
          assignment.actual_amount || assignment.actualAmount || 0;
        const amount =
          typeof rawAmount === "string" ? parseFloat(rawAmount) : rawAmount;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const contractorsCount = new Set(
        assignments
          .map((a: any) => a.contractor_id || a.contractorId)
          .filter(Boolean)
      ).size;

      // Get invoice count from backend data
      const invoicesCount = invoiceCounts[categoryId] || 0;

      return {
        estimatedAmount: totalEstimated,
        actualAmount: totalActual,
        contractorsCount,
        subcategoriesCount: assignments.length,
        invoicesCount,
      };
    },
    [groupedAssignments, invoiceCounts]
  );

  // Project Expenses Functions (unstructured expenses for this project)
  const addProjectExpense = async () => {
    if (
      !newExpense.expense_name.trim() ||
      !newExpense.category.trim() ||
      !newExpense.cost
    )
      return;

    setExpensesLoading(true);
    try {
      const expenseData = {
        project_id: projectId,
        expense_name: newExpense.expense_name.trim(),
        category: newExpense.category.trim(),
        cost: parseFloat(newExpense.cost),
        details: newExpense.details.trim() || undefined,
        expense_date: newExpense.expense_date,
        receipt_url: newExpense.receipt_url.trim() || undefined,
      };

      console.log("Creating general expense:", expenseData);

      const response = await apiRequest("/general-expenses", {
        method: "POST",
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || errorData.error || "Failed to create expense"
        );
      }

      const result = await response.json();
      console.log("General expense created successfully:", result);

      // Add the new expense to the local state
      setProjectExpenses([result.expense, ...projectExpenses]);

      // Reset the form
      setNewExpense({
        expense_name: "",
        category: "",
        cost: "",
        details: "",
        expense_date: new Date().toISOString().split("T")[0],
        receipt_url: "",
      });
      setShowExpenseModal(false);

      addToast({
        type: "success",
        title: "تم إضافة المصروف بنجاح",
        message: `مصروف "${result.expense.expense_name}" بقيمة ${formatCurrency(
          result.expense.cost
        )} تم إضافته`,
      });
    } catch (error: any) {
      console.error("Error creating general expense:", error);
      addToast({
        type: "error",
        title: "خطأ في إضافة المصروف",
        message: error.message || "فشل في إضافة المصروف",
      });
    } finally {
      setExpensesLoading(false);
    }
  };

  const removeProjectExpense = async (id: string) => {
    setExpensesLoading(true);
    try {
      console.log("Deleting general expense:", id);

      const response = await apiRequest(`/general-expenses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || errorData.error || "Failed to delete expense"
        );
      }

      // Remove the expense from local state
      setProjectExpenses(projectExpenses.filter((exp) => exp.id !== id));

      addToast({
        type: "success",
        title: "تم حذف المصروف",
        message: "تم حذف المصروف بنجاح",
      });
    } catch (error: any) {
      console.error("Error deleting general expense:", error);
      addToast({
        type: "error",
        title: "خطأ في حذف المصروف",
        message: error.message || "فشل في حذف المصروف",
      });
    } finally {
      setExpensesLoading(false);
    }
  };

  const printExpense = (expense: ProjectExpense) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; direction: rtl;">
        <div style="text-align: center; border-bottom: 3px solid #2e3192; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #2e3192; font-size: 28px; margin-bottom: 10px;">شركة قصر الشام للمقاولات</h1>
          <h2 style="color: #4b5563; font-size: 20px; margin-bottom: 10px;">سند صرف عام</h2>
          <p style="color: #6b7280; font-size: 14px;">General Expense Voucher</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">معلومات المشروع</h3>
            <p><strong>اسم المشروع:</strong> ${project?.name || "غير محدد"}</p>
            <p><strong>كود المشروع:</strong> ${project?.code || "غير محدد"}</p>
            <p><strong>العميل:</strong> ${project?.client || "غير محدد"}</p>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">معلومات الصرف</h3>
                        <p><strong>تاريخ الصرف:</strong> ${new Date(
                          expense.expense_date
                        ).toLocaleDateString("en-US")}</p>
            <p><strong>رقم السند:</strong> ${expense.id}</p>
            <p><strong>الحالة:</strong> ${
              expense.status === "pending"
                ? "في الانتظار"
                : expense.status === "approved"
                ? "معتمد"
                : "مرفوض"
            }</p>
          </div>
        </div>

        <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
          <h3 style="color: #065f46; margin-bottom: 20px; font-size: 18px;">تفاصيل المصروف</h3>
          <div style="display: grid; gap: 15px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #d1fae5;">
              <span style="font-weight: 500;">اسم المصروف:</span>
              <span style="font-weight: 700;">${expense.expense_name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #d1fae5;">
              <span style="font-weight: 500;">المبلغ:</span>
              <span style="font-weight: 700; color: #10b981; font-size: 18px;">${expense.cost.toLocaleString(
                "ar-IQ"
              )} دينار عراقي</span>
            </div>
            ${
              expense.details
                ? `<div style="padding: 10px 0;">
              <span style="font-weight: 500; display: block; margin-bottom: 8px;">التفاصيل:</span>
              <p style="background: white; padding: 15px; border-radius: 6px; line-height: 1.6;">${expense.details}</p>
            </div>`
                : ""
            }
          </div>
        </div>

        <div style="text-align: center; margin-top: 50px; border-top: 2px solid #2e3192; padding-top: 20px;">
          <p style="color: #2e3192; font-size: 16px; font-weight: 600; margin-bottom: 5px;">
            <strong>شركة قصر الشام للمقاولات العامة والإنشاءات</strong>
          </p>
          <p style="color: #6b7280; font-size: 12px;">
            سند صرف مُصدر إلكترونياً - تاريخ الطباعة: ${new Date().toLocaleDateString(
              "en-US"
            )}
          </p>
        </div>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <title>سند صرف - ${expense.expense_name}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Filter expenses
  const filteredExpenses = projectExpenses.filter((expense) => {
    const matchesSearch =
      expense.expense_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus =
      statusFilter === "all" || expense.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate total expenses
  const totalExpenses = projectExpenses.reduce(
    (sum, expense) =>
      expense.status === "approved" ? sum + expense.cost : sum,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 arabic-spacing text-lg">
            جاري تحميل المشروع...
          </p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <p className="text-red-600 arabic-spacing text-lg mb-6">
            {error || "المشروع غير موجود"}
          </p>
          <Button
            onClick={() => router.push("/projects")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 ml-2 no-flip" />
            العودة للمشاريع
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Return Button - Fixed Position */}
      <div className="fixed top-4 sm:top-6 left-4 sm:left-6 z-30">
        <Button
          onClick={() => router.push("/projects")}
          className="bg-white/90 hover:bg-white text-gray-700 border border-gray-300 shadow-xl px-3 sm:px-4 py-2 rounded-xl flex items-center space-x-2 space-x-reverse transform transition-all duration-300 hover:scale-105 hover:shadow-2xl backdrop-blur-lg"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 no-flip" />
          <span className="arabic-spacing text-sm sm:text-base font-medium">
            العودة للمشاريع
          </span>
        </Button>
      </div>

      {/* Main Content Container */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 pt-16 sm:pt-20">
        {/* Modern Tab Navigation */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <button
                onClick={() => setActiveTab("info")}
                className={`flex-1 px-6 py-5 text-center font-semibold transition-all duration-300 relative group ${
                  activeTab === "info"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center space-x-3 space-x-reverse">
                  <Building2 className="h-5 w-5 no-flip group-hover:scale-110 transition-transform duration-200" />
                  <span className="arabic-spacing">معلومات المشروع</span>
                </div>
                {activeTab === "info" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => setActiveTab("categories")}
                className={`flex-1 px-6 py-5 text-center font-semibold transition-all duration-300 relative group ${
                  activeTab === "categories"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center space-x-3 space-x-reverse">
                  <Users className="h-5 w-5 no-flip group-hover:scale-110 transition-transform duration-200" />
                  <span className="arabic-spacing">الفئات والمقاولين</span>
                </div>
                {activeTab === "categories" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => setActiveTab("expenses")}
                className={`flex-1 px-6 py-5 text-center font-semibold transition-all duration-300 relative group ${
                  activeTab === "expenses"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center space-x-3 space-x-reverse">
                  <Receipt className="h-5 w-5 no-flip group-hover:scale-110 transition-transform duration-200" />
                  <span className="arabic-spacing">مصروفات المشروع</span>
                </div>
                {activeTab === "expenses" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === "info" ? (
            /* Project Information Tab */
            <div className="space-y-8 animate-fade-in-up">
              {/* Enhanced Project Details Card */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 sm:p-8">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                      <Building2 className="h-8 w-8 no-flip" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold arabic-spacing mb-2">
                        {project.name}
                      </h2>
                      <p className="text-indigo-100 arabic-spacing">
                        كود المشروع: {project.code}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Basic Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                      <div className="flex items-center space-x-3 space-x-reverse mb-4">
                        <div className="bg-blue-500 p-2 rounded-lg">
                          <User className="h-5 w-5 text-white no-flip" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 arabic-spacing">
                          معلومات العميل
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 arabic-spacing">
                            اسم العميل
                          </p>
                          <p className="font-medium text-gray-800 arabic-spacing">
                            {project.client}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location Information */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
                      <div className="flex items-center space-x-3 space-x-reverse mb-4">
                        <div className="bg-green-500 p-2 rounded-lg">
                          <MapPin className="h-5 w-5 text-white no-flip" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 arabic-spacing">
                          موقع المشروع
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 arabic-spacing">
                            العنوان
                          </p>
                          <p className="font-medium text-gray-800 arabic-spacing">
                            {project.location}
                          </p>
                        </div>
                        {project.area && (
                          <div>
                            <p className="text-sm text-gray-600 arabic-spacing">
                              المساحة
                            </p>
                            <p className="font-medium text-gray-800 arabic-spacing">
                              {new Intl.NumberFormat("ar-IQ").format(
                                Number(project.area)
                              )}{" "}
                              متر مربع
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Information */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-6 border border-purple-200">
                      <div className="flex items-center space-x-3 space-x-reverse mb-4">
                        <div className="bg-purple-500 p-2 rounded-lg">
                          <Calendar className="h-5 w-5 text-white no-flip" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 arabic-spacing">
                          التوقيت الزمني
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 arabic-spacing">
                            تاريخ البدء
                          </p>
                          <p className="font-medium text-gray-800 arabic-spacing">
                            {formatDate(
                              project.startDate || project.start_date
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 arabic-spacing">
                            تاريخ الانتهاء المتوقع
                          </p>
                          <p className="font-medium text-gray-800 arabic-spacing">
                            {formatDate(project.endDate || project.end_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-6 border border-amber-200">
                    <div className="flex items-center space-x-3 space-x-reverse mb-6">
                      <div className="bg-amber-500 p-3 rounded-lg">
                        <DollarSign className="h-6 w-6 text-white no-flip" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 arabic-spacing">
                        المعلومات المالية
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-sm text-gray-600 arabic-spacing mb-2">
                          الميزانية المقدرة
                        </p>
                        <p className="text-2xl font-bold text-amber-600 arabic-spacing">
                          {formatCurrency(
                            project.budgetEstimate || project.budget_estimate
                          )}
                        </p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-sm text-gray-600 arabic-spacing mb-2">
                          حالة المشروع
                        </p>
                        <span
                          className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                            statusColors[project.status]
                          }`}
                        >
                          {statusLabels[project.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Financial Overview with General Expenses */}
                  {(() => {
                    // Calculate category assignments total
                    const categoryTotal = project.categoryAssignments
                      ? project.categoryAssignments.reduce(
                          (sum: number, assignment: any) =>
                            sum + (assignment.actual_amount || 0),
                          0
                        )
                      : 0;

                    // Calculate approved project expenses total
                    const approvedExpensesTotal = projectExpenses
                      .filter((expense) => expense.status === "approved")
                      .reduce((sum, expense) => sum + expense.cost, 0);

                    // Calculate total project spending (category + approved expenses)
                    const totalProjectSpending =
                      categoryTotal + approvedExpensesTotal;

                    // Get safe transactions for this project (for additional tracking)
                    const projectTransactions = safeState.transactions.filter(
                      (transaction) => transaction.projectId === project.id
                    );
                    const projectTotalSpent = projectTransactions.reduce(
                      (sum, transaction) => sum + Math.abs(transaction.amount),
                      0
                    );

                    const totalBudget =
                      project.budgetEstimate || project.budget_estimate || 0;
                    const completionPercentage =
                      totalBudget > 0
                        ? Math.round((totalProjectSpending / totalBudget) * 100)
                        : 0;
                    const remainingBudget = totalBudget - totalProjectSpending;

                    return (
                      <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                        <h4 className="text-xl font-bold text-gray-800 arabic-spacing mb-6 flex items-center">
                          <Wallet className="h-6 w-6 ml-2 text-blue-600 no-flip" />
                          الملخص المالي للمشروع
                        </h4>

                        {/* Key Financial Metrics - Single Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              {formatCurrency(
                                project.budgetEstimate ||
                                  project.budget_estimate
                              )}
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              الميزانية المعتمدة
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                              {formatCurrency(totalProjectSpending)}
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              إجمالي المصروفات
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              مقاولات: {formatCurrency(categoryTotal)}
                            </div>
                            <div className="text-xs text-gray-500">
                              عامة: {formatCurrency(approvedExpensesTotal)}
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div
                              className={`text-2xl font-bold mb-1 ${
                                remainingBudget >= 0
                                  ? "text-orange-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(remainingBudget)}
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              {remainingBudget >= 0
                                ? "المتبقي"
                                : "تجاوز الميزانية"}
                            </div>
                            {remainingBudget < 0 && (
                              <div className="text-xs text-red-500 mt-1">
                                ⚠️ تحتاج تمويل إضافي
                              </div>
                            )}
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                              {completionPercentage}%
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              نسبة الإنجاز
                            </div>
                          </div>
                        </div>

                        {/* Project Expenses Summary */}
                        {projectExpenses.length > 0 && (
                          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                            <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                              <Receipt className="h-4 w-4 ml-2 text-gray-600" />
                              ملخص مصروفات المشروع
                            </h5>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="bg-yellow-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-yellow-600">
                                  {
                                    projectExpenses.filter(
                                      (e) => e.status === "pending"
                                    ).length
                                  }
                                </div>
                                <div className="text-xs text-gray-600">
                                  في الانتظار
                                </div>
                                <div className="text-xs text-yellow-600 font-medium">
                                  {formatCurrency(
                                    projectExpenses
                                      .filter((e) => e.status === "pending")
                                      .reduce((sum, e) => sum + e.cost, 0)
                                  )}
                                </div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-green-600">
                                  {
                                    projectExpenses.filter(
                                      (e) => e.status === "approved"
                                    ).length
                                  }
                                </div>
                                <div className="text-xs text-gray-600">
                                  معتمد ومدفوع
                                </div>
                                <div className="text-xs text-green-600 font-medium">
                                  {formatCurrency(approvedExpensesTotal)}
                                </div>
                              </div>
                              <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-red-600">
                                  {
                                    projectExpenses.filter(
                                      (e) => e.status === "rejected"
                                    ).length
                                  }
                                </div>
                                <div className="text-xs text-gray-600">
                                  مرفوض
                                </div>
                                <div className="text-xs text-red-600 font-medium">
                                  {formatCurrency(
                                    projectExpenses
                                      .filter((e) => e.status === "rejected")
                                      .reduce((sum, e) => sum + e.cost, 0)
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

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
                                width: `${Math.min(
                                  completionPercentage,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Safe Impact - Compact */}
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
                              إحصائيات التعيينات
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
                                  ميزانية مستنفدة:
                                </span>
                                <span className="font-bold text-orange-600">
                                  {project.categoryAssignments?.filter(
                                    (a: any) => a.budget_exhausted
                                  ).length || 0}
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
                            (project.budgetEstimate ||
                              project.budget_estimate) - categoryEstimated;
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
                                    isOverBudget
                                      ? "text-red-700"
                                      : "text-green-700"
                                  }`}
                                >
                                  {isOverBudget
                                    ? "تجاوز في التقديرات"
                                    : "التقديرات ضمن الميزانية"}
                                </span>
                              </div>
                              <span
                                className={`font-bold ${
                                  isOverBudget
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {isOverBudget ? "-" : "+"}
                                {formatCurrency(Math.abs(budgetDifference))}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Description/Notes if available */}
                  {project.description && (
                    <div className="mt-8 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200">
                      <div className="flex items-center space-x-3 space-x-reverse mb-4">
                        <div className="bg-slate-500 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-white no-flip" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 arabic-spacing">
                          وصف المشروع
                        </h3>
                      </div>
                      <p className="text-gray-700 arabic-spacing leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "categories" ? (
            /* Modern Category Assignments Table */
            <CategoryAssignmentsTable
              projectId={projectId}
              assignments={transformedAssignments}
              onAddInvoice={handleCreateAssignmentInvoice}
              onEditAssignment={handleEditAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onViewInvoices={handleViewAssignmentInvoices}
              onAddAssignment={handleAddAssignment}
            />
          ) : (
            /* General Expenses Tab */
            <div className="space-y-8 animate-fade-in-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 arabic-spacing mb-4">
                  مصروفات المشروع غير المهيكلة
                </h2>
                <p className="text-gray-600 arabic-spacing max-w-2xl mx-auto">
                  إدارة المصروفات غير المهيكلة للمشروع (خارج نطاق تعيينات
                  المقاولين)
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                {/* Enhanced Section Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                        <Receipt className="h-8 w-8 no-flip" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold arabic-spacing mb-2">
                          مصروفات المشروع
                        </h3>
                        <p className="text-orange-100 arabic-spacing">
                          تتبع شامل لجميع المصروفات والنفقات العامة
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowExpenseModal(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Plus className="h-5 w-5 ml-2 no-flip" />
                      <span className="arabic-spacing">إضافة مصروف جديد</span>
                    </Button>
                  </div>
                </div>

                {/* Enhanced Budget Impact Summary */}
                <div className="bg-gradient-to-br from-orange-50/60 to-red-50/60 backdrop-blur-sm border-b border-orange-200/50 p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-orange-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-6 w-6 text-orange-600 no-flip" />
                      </div>
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {projectExpenses.length}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing font-medium">
                        إجمالي المصروفات
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="h-6 w-6 text-green-600 no-flip" />
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {new Intl.NumberFormat("ar-IQ").format(totalExpenses)}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing font-medium">
                        المعتمد (د.ع)
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Package className="h-6 w-6 text-blue-600 no-flip" />
                      </div>
                      <div
                        className={`text-3xl font-bold mb-2 ${
                          project?.budgetEstimate || project?.budget_estimate
                            ? totalExpenses >
                              (project?.budgetEstimate ||
                                project?.budget_estimate) *
                                0.1
                              ? "text-red-600"
                              : "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {project?.budgetEstimate || project?.budget_estimate
                          ? `${(
                              (totalExpenses /
                                (project?.budgetEstimate ||
                                  project?.budget_estimate)) *
                              100
                            ).toFixed(1)}%`
                          : "N/A"}
                      </div>
                      <div className="text-sm text-gray-600 arabic-spacing font-medium">
                        من إجمالي الميزانية
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Search and Filter */}
                <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm border-b border-gray-200/50 p-8">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 no-flip" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="البحث في المصروفات..."
                          className="pr-12 h-12 bg-white/80 backdrop-blur-sm border-gray-200/50 rounded-xl arabic-spacing shadow-sm focus:shadow-lg transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-200/50 shadow-sm">
                        <Filter className="h-5 w-5 text-gray-500 no-flip" />
                        <Select
                          value={statusFilter}
                          onChange={(e) =>
                            setStatusFilter(e.target.value as any)
                          }
                          className="border-0 bg-transparent focus:ring-0 min-w-[140px] font-medium"
                        >
                          <option value="all">جميع الحالات</option>
                          <option value="pending">في الانتظار</option>
                          <option value="approved">معتمد</option>
                          <option value="rejected">مرفوض</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Expenses List */}
                <div className="p-8">
                  {filteredExpenses.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-br from-orange-100 to-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Receipt className="h-10 w-10 text-orange-500 no-flip" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4 arabic-spacing">
                        {searchTerm || statusFilter !== "all"
                          ? "لا توجد نتائج مطابقة"
                          : "لا توجد مصروفات عامة"}
                      </h3>
                      <p className="text-gray-600 arabic-spacing text-lg max-w-md mx-auto">
                        {searchTerm || statusFilter !== "all"
                          ? "جرب تغيير معايير البحث للعثور على النتائج المطلوبة"
                          : "ابدأ بإضافة مصروفات المشروع لتتبع النفقات غير المهيكلة"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="bg-orange-100 p-2 rounded-lg">
                                  <Receipt className="h-5 w-5 text-orange-600 no-flip" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 arabic-spacing">
                                    {expense.expense_name}
                                  </h4>
                                  <span
                                    className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                                      expense.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : expense.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {expense.status === "pending"
                                      ? "في الانتظار"
                                      : expense.status === "approved"
                                      ? "معتمد"
                                      : "مرفوض"}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">
                                    المبلغ:{" "}
                                  </span>
                                  <span className="font-semibold text-orange-600">
                                    {expense.cost.toLocaleString("ar-IQ")} د.ع
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    التاريخ:{" "}
                                  </span>
                                  <span className="font-medium text-black">
                                    {new Date(
                                      expense.expense_date
                                    ).toLocaleDateString("en-US")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    رقم السند:{" "}
                                  </span>
                                  <span className="font-mono text-xs text-black">
                                    {expense.id}
                                  </span>
                                </div>
                              </div>
                              {expense.details && (
                                <div className="mt-2">
                                  <span className="text-gray-600 text-sm">
                                    التفاصيل:{" "}
                                  </span>
                                  <p className="text-sm text-gray-800 arabic-spacing mt-1">
                                    {expense.details}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => printExpense(expense)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                title="طباعة السند"
                              >
                                <Printer className="h-4 w-4 no-flip" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeProjectExpense(expense.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                title="حذف المصروف"
                              >
                                <Trash2 className="h-4 w-4 no-flip" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Receipt className="h-6 w-6 no-flip" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold arabic-spacing">
                      إضافة مصروف عام جديد
                    </h3>
                    <p className="text-orange-100 arabic-spacing">
                      {project?.name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExpenseModal(false)}
                  className="h-10 w-10 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5 no-flip" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    اسم المصروف *
                  </label>
                  <Input
                    value={newExpense.expense_name}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        expense_name: e.target.value,
                      })
                    }
                    placeholder="مثال: مواد كتابية، وقود، أدوات"
                    className="arabic-spacing"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    فئة المصروف *
                  </label>
                  <Select
                    value={newExpense.category}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        category: e.target.value,
                      })
                    }
                    className="arabic-spacing"
                  >
                    <option value="">اختر الفئة</option>
                    <option value="Office Equipment">معدات مكتبية</option>
                    <option value="Transportation">مواصلات</option>
                    <option value="Materials">مواد خام</option>
                    <option value="Tools">أدوات</option>
                    <option value="Fuel">وقود</option>
                    <option value="Maintenance">صيانة</option>
                    <option value="Communication">اتصالات</option>
                    <option value="Utilities">مرافق</option>
                    <option value="Other">أخرى</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    المبلغ (دينار عراقي) *
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={newExpense.cost}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        cost: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                  {newExpense.cost && (
                    <p className="text-orange-600 text-sm font-medium">
                      💰{" "}
                      {new Intl.NumberFormat("ar-IQ").format(
                        Number(newExpense.cost)
                      )}{" "}
                      دينار عراقي
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    رابط الإيصال (اختياري)
                  </label>
                  <Input
                    type="url"
                    value={newExpense.receipt_url}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        receipt_url: e.target.value,
                      })
                    }
                    placeholder="https://example.com/receipt.pdf"
                    className="arabic-spacing"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                  تاريخ المصروف
                </label>
                <Input
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      expense_date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                  تفاصيل إضافية
                </label>
                <textarea
                  value={newExpense.details}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      details: e.target.value,
                    })
                  }
                  placeholder="أي تفاصيل إضافية عن المصروف..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none arabic-spacing"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-between">
              <div className="text-sm text-gray-600 arabic-spacing">
                * الحقول المطلوبة
              </div>
              <div className="flex space-x-3 space-x-reverse">
                <Button
                  variant="outline"
                  onClick={() => setShowExpenseModal(false)}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={addProjectExpense}
                  disabled={
                    !newExpense.expense_name.trim() ||
                    !newExpense.category.trim() ||
                    !newExpense.cost ||
                    expensesLoading
                  }
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {expensesLoading ? (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="arabic-spacing">جاري الحفظ...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Save className="h-4 w-4 no-flip" />
                      <span className="arabic-spacing">حفظ المصروف</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Category Invoice Modal */}
      {categoryInvoiceModal.isOpen && categoryInvoiceModal.category && (
        <EnhancedCategoryInvoiceModal
          isOpen={categoryInvoiceModal.isOpen}
          project={project}
          category={categoryInvoiceModal.category}
          assignmentData={categoryInvoiceModal.assignmentData || []}
          onClose={closeCategoryInvoiceModal}
          onSubmit={async (invoiceData: any) => {
            try {
              // Call the backend API to create category invoice
              console.log("Creating invoice with data:", invoiceData);

              const response = await apiRequest("/category-invoices", {
                method: "POST",
                body: JSON.stringify({
                  ...invoiceData,
                  projectId: project?.id,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error("Invoice creation failed:", errorData);

                // Show user-friendly error messages
                const userMessage =
                  errorData.userMessage ||
                  errorData.error ||
                  "Failed to create invoice";
                throw new Error(userMessage);
              }

              const result = await response.json();
              console.log("Invoice created successfully:", result);

              // Helper function to get user-friendly name using current auth context
              const getUserFriendlyName = (userId: string): string => {
                // If we have the current user context and this is the current user's invoice
                if (user && userId === user.id) {
                  return user.role === "admin" ? "الإدارة" : "مدخل البيانات";
                }

                // Fallback for other users (UUID pattern check)
                const uuidPattern =
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidPattern.test(userId)) {
                  return "مدخل البيانات";
                }
                return userId;
              };

              // Add invoice to localStorage for approval system
              const invoiceForApproval = {
                id: result.invoice.id,
                invoiceNumber: result.invoice.invoice_number,
                projectId: project?.id,
                projectName: project?.name,
                category: result.invoice.category_name,
                subcategory: result.invoice.subcategory_name,
                amount: result.invoice.amount,
                date: result.invoice.date,
                notes: result.invoice.notes || "",
                status: "pending_approval",
                submittedBy: getUserFriendlyName(result.invoice.submitted_by),
                createdAt: result.invoice.created_at,
                updatedAt: result.invoice.updated_at,
              };

              // Get existing invoices from localStorage
              const existingInvoices =
                localStorage.getItem("financial-invoices");
              let invoices = [];
              if (existingInvoices) {
                try {
                  invoices = JSON.parse(existingInvoices);
                } catch (error) {
                  console.warn("Failed to parse existing invoices:", error);
                  invoices = [];
                }
              }

              // Add new invoice to the array
              invoices.push(invoiceForApproval);

              // Save back to localStorage
              localStorage.setItem(
                "financial-invoices",
                JSON.stringify(invoices)
              );

              // Trigger storage event to update notification count
              window.dispatchEvent(new Event("storage"));

              closeCategoryInvoiceModal();

              // Reload project data without full page reload
              const projectResponse = await apiRequest(
                `/projects/${projectId}`
              );
              if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                const formattedProject: Project = {
                  id: projectData.id,
                  name: projectData.name,
                  code: projectData.code,
                  location: projectData.location,
                  area: projectData.area,
                  budgetEstimate: projectData.budget_estimate,
                  client: projectData.client,
                  startDate: projectData.start_date?.split("T")[0] || "",
                  endDate: projectData.end_date?.split("T")[0] || "",
                  status: projectData.status,
                  createdAt: projectData.created_at,
                  updatedAt: projectData.updated_at,
                  categoryAssignments: projectData.categoryAssignments || [],
                };
                setProject(formattedProject);
              }

              addToast({
                title: "تم الإرسال للموافقة",
                message: "الفاتورة في انتظار موافقة الإدارة",
                type: "success",
              });
            } catch (error) {
              console.error("Error creating invoice:", error);
              setTimeout(
                () =>
                  addToast({
                    title: "خطأ",
                    message:
                      error instanceof Error
                        ? error.message
                        : "فشل في إنشاء الفاتورة",
                    type: "error",
                    duration: 5000,
                  }),
                0
              );
            }
          }}
        />
      )}

      {/* Category Assignment Modal */}
      <CategoryAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setEditingAssignmentId(null);
        }}
        projectId={projectId}
        onSave={handleSaveAssignments}
        existingAssignments={existingAssignments}
        editingAssignmentId={editingAssignmentId || undefined}
      />

      {/* Simple Edit Assignment Modal */}
      {showSimpleEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Edit className="h-5 w-5 no-flip" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold arabic-spacing">
                      تعديل التعيين
                    </h3>
                    <p className="text-blue-100 arabic-spacing text-sm">
                      {editingAssignment.contractor_name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSimpleEditModal(false)}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4 no-flip" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 arabic-spacing mb-2">
                  الفئة والوصف
                </div>
                <div className="font-medium text-gray-800 arabic-spacing">
                  {editingAssignment.main_category} -{" "}
                  {editingAssignment.subcategory}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                  المبلغ المقدر (د.ع)
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={editingAssignment.estimated_amount || 0}
                  onChange={(e) =>
                    setEditingAssignment({
                      ...editingAssignment,
                      estimated_amount: Number(e.target.value),
                    })
                  }
                  className="arabic-spacing"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                  ملاحظات
                </label>
                <textarea
                  value={editingAssignment.notes || ""}
                  onChange={(e) =>
                    setEditingAssignment({
                      ...editingAssignment,
                      notes: e.target.value,
                    })
                  }
                  placeholder="ملاحظات إضافية..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none arabic-spacing"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSimpleEditModal(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setLoading(true);

                    // Create updated assignments list with the edited assignment
                    const updatedAssignments = transformedAssignments.map(
                      (a: any) => {
                        if (a.id === editingAssignment.id) {
                          return {
                            main_category: a.main_category,
                            subcategory: a.subcategory,
                            contractor_id: a.contractor_id || a.contractorId,
                            contractor_name: a.contractor_name,
                            estimated_amount:
                              editingAssignment.estimated_amount,
                            notes: editingAssignment.notes,
                          };
                        }
                        return {
                          main_category: a.main_category,
                          subcategory: a.subcategory,
                          contractor_id: a.contractor_id || a.contractorId,
                          contractor_name: a.contractor_name,
                          estimated_amount: a.estimated_amount,
                          notes: a.notes,
                        };
                      }
                    );

                    // Update project with all assignments
                    const response = await apiRequest(
                      `/projects/${projectId}`,
                      {
                        method: "PUT",
                        body: JSON.stringify({
                          categoryAssignments: updatedAssignments,
                        }),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.userMessage ||
                          errorData.error ||
                          "فشل في تحديث التعيين"
                      );
                    }

                    // Reload project data
                    const projectResponse = await apiRequest(
                      `/projects/${projectId}`
                    );
                    if (projectResponse.ok) {
                      const projectData = await projectResponse.json();
                      const formattedProject: Project = {
                        id: projectData.id,
                        name: projectData.name,
                        code: projectData.code,
                        location: projectData.location,
                        area: projectData.area,
                        budgetEstimate: projectData.budget_estimate,
                        client: projectData.client,
                        startDate: projectData.start_date?.split("T")[0] || "",
                        endDate: projectData.end_date?.split("T")[0] || "",
                        status: projectData.status,
                        createdAt: projectData.created_at,
                        updatedAt: projectData.updated_at,
                        categoryAssignments:
                          projectData.categoryAssignments || [],
                      };
                      setProject(formattedProject);
                    }

                    setShowSimpleEditModal(false);
                    setEditingAssignment(null);

                    addToast({
                      title: "تم التحديث",
                      type: "success",
                    });
                  } catch (error: any) {
                    console.error("Error updating assignment:", error);
                    addToast({
                      title: "فشل التحديث",
                      message: error.message || "حدث خطأ",
                      type: "error",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Save className="h-4 w-4 ml-2 no-flip" />
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
