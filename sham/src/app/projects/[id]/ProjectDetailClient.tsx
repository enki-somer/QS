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
  ShoppingCart,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
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
  isPurchasing?: boolean; // New field for purchasing assignments
}
import { PROJECT_CATEGORIES } from "@/constants/projectCategories";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSafe } from "@/contexts/SafeContext";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { FinancialDisplay } from "@/components/ui/FinancialDisplay";
import { PermissionButton } from "@/components/ui/PermissionButton";
import RoleBasedNavigation from "@/components/ui/RoleBasedNavigation";
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
  const permissions = useUIPermissions();

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
    cost: "",
    details: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  // Tab System State
  const [activeTab, setActiveTab] = useState<
    "info" | "categories" | "expenses"
  >("info");

  // Simple Edit Modal State
  const [showSimpleEditModal, setShowSimpleEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const projectId = params.id as string;

  // Check if category assignment can be edited (has approved/paid invoices)
  const isCategoryAssignmentEditable = (categoryId: string) => {
    const categoryAssignments = groupedAssignments[categoryId] || [];
    // Check if any assignment in this category has approved invoices
    return !categoryAssignments.some(
      (assignment: any) => assignment.has_approved_invoice === true
    );
  };

  // Check if category allows new invoices (always true - multiple invoices allowed)
  const canCreateCategoryInvoice = (categoryId: string) => {
    const categoryAssignments = groupedAssignments[categoryId] || [];
    // Allow invoice creation as long as there are assignments and budget remaining
    return categoryAssignments.length > 0;
  };

  // Handle creating category-specific invoice
  const handleCreateCategoryInvoice = (category: any) => {
    const categoryAssignments = groupedAssignments[category.id] || [];

    if (!canCreateCategoryInvoice(category.id)) {
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

    // Allow invoice creation regardless of approval status
    // Multiple invoices per assignment are allowed for progressive billing
    setCategoryInvoiceModal({
      isOpen: true,
      category,
      assignmentData: categoryAssignments,
    });
  };

  // Handle editing category assignment
  const handleEditCategory = (category: any) => {
    if (!isCategoryAssignmentEditable(category.id)) {
      setTimeout(
        () =>
          addToast({
            title: "تحذير",
            message: "لا يمكن تعديل تعيينات فئة لها فواتير مُعتمدة",
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

    // Show enhanced confirmation dialog with details
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف التعيين؟\n\nالفئة: ${
        assignment.main_category
      }\nالتفاصيل: ${assignment.subcategory}\nالمقاول: ${
        assignment.contractor_name
      }\nالمبلغ: ${assignment.estimated_amount.toLocaleString()} د.ع\n\nهذا الإجراء لا يمكن التراجع عنه.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      // Show loading state
      addToast({
        title: "جاري الحذف...",
        message: "يتم حذف التعيين",
        type: "info",
      });

      // Use the proper delete assignment endpoint
      const response = await apiRequest(
        `/projects/${projectId}/assignments/${assignmentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || errorData.error || "فشل في حذف التعيين"
        );
      }

      // Update local state immediately (optimistic update)
      if (project && project.categoryAssignments) {
        const updatedProject = {
          ...project,
          categoryAssignments: project.categoryAssignments.filter(
            (a: any) => a.id !== assignmentId
          ),
        };
        setProject(updatedProject);
      }

      // Show success message
      addToast({
        title: "تم الحذف بنجاح",
        message: `تم حذف تعيين ${assignment.contractor_name} بنجاح`,
        type: "success",
      });

      // Reload project data to ensure consistency with database
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
          // NEW FINANCIAL FIELDS
          pricePerMeter: projectData.price_per_meter,
          ownerDealPrice: projectData.owner_deal_price,
          ownerPaidAmount: projectData.owner_paid_amount,
          constructionCost: projectData.construction_cost,
          profitMargin: projectData.profit_margin,
          totalSiteArea: projectData.total_site_area,
        };
        setProject(formattedProject);
      }
    } catch (error: any) {
      console.error("❌ Error deleting assignment:", error);

      addToast({
        title: "فشل في الحذف",
        message: error.message || "حدث خطأ أثناء حذف التعيين",
        type: "error",
      });
    }
  };

  // Handle freeze assignment
  const handleFreezeAssignment = async (
    assignmentId: string,
    reason: string
  ) => {
    try {
      console.log(
        `🧊 Freezing assignment ${assignmentId} with reason: ${reason}`
      );

      const response = await apiRequest(
        `/projects/${projectId}/assignments/${assignmentId}/freeze`,
        {
          method: "PUT",
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Assignment frozen successfully");
        addToast({
          title: "تم التجميد بنجاح",
          message: "تم تجميد التعيين وإرجاع الرصيد غير المستخدم",
          type: "success",
        });

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
            pricePerMeter: projectData.price_per_meter,
            ownerDealPrice: projectData.owner_deal_price,
            ownerPaidAmount: projectData.owner_paid_amount,
            constructionCost: projectData.construction_cost,
            estimatedProfit: projectData.estimated_profit,
            profitMargin: projectData.profit_margin,
            totalSiteArea: projectData.total_site_area,
          };
          setProject(formattedProject);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || "Failed to freeze assignment");
      }
    } catch (error: any) {
      console.error("❌ Error freezing assignment:", error);
      addToast({
        title: "فشل في التجميد",
        message: error.message || "حدث خطأ أثناء تجميد التعيين",
        type: "error",
      });
    }
  };

  // Handle unfreeze assignment
  const handleUnfreezeAssignment = async (assignmentId: string) => {
    try {
      console.log(`🔓 Unfreezing assignment ${assignmentId}`);

      const response = await apiRequest(
        `/projects/${projectId}/assignments/${assignmentId}/unfreeze`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Assignment unfrozen successfully");
        addToast({
          title: "تم إلغاء التجميد بنجاح",
          message: "تم إلغاء تجميد التعيين بنجاح",
          type: "success",
        });

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
            pricePerMeter: projectData.price_per_meter,
            ownerDealPrice: projectData.owner_deal_price,
            ownerPaidAmount: projectData.owner_paid_amount,
            constructionCost: projectData.construction_cost,
            estimatedProfit: projectData.estimated_profit,
            profitMargin: projectData.profit_margin,
            totalSiteArea: projectData.total_site_area,
          };
          setProject(formattedProject);
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || "Failed to unfreeze assignment"
        );
      }
    } catch (error: any) {
      console.error("❌ Error unfreezing assignment:", error);
      addToast({
        title: "فشل في إلغاء التجميد",
        message: error.message || "حدث خطأ أثناء إلغاء تجميد التعيين",
        type: "error",
      });
    }
  };

  // Handle edit assignment amount
  const handleEditAssignmentAmount = async (
    assignmentId: string,
    newAmount: number,
    reason?: string
  ) => {
    try {
      console.log(
        `✏️ Editing assignment ${assignmentId} amount to ${newAmount}`
      );

      const response = await apiRequest(
        `/projects/${projectId}/assignments/${assignmentId}/amount`,
        {
          method: "PUT",
          body: JSON.stringify({ newAmount, reason }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Assignment amount updated successfully");
        addToast({
          title: "تم التحديث بنجاح",
          message: "تم تحديث مبلغ التعيين بنجاح",
          type: "success",
        });

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
            pricePerMeter: projectData.price_per_meter,
            ownerDealPrice: projectData.owner_deal_price,
            ownerPaidAmount: projectData.owner_paid_amount,
            constructionCost: projectData.construction_cost,
            estimatedProfit: projectData.estimated_profit,
            profitMargin: projectData.profit_margin,
            totalSiteArea: projectData.total_site_area,
          };
          setProject(formattedProject);
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || "Failed to update assignment amount"
        );
      }
    } catch (error: any) {
      console.error("❌ Error updating assignment amount:", error);
      addToast({
        title: "فشل في التحديث",
        message: error.message || "حدث خطأ أثناء تحديث مبلغ التعيين",
        type: "error",
      });
    }
  };

  const handleAddAssignment = () => {
    // Pass all current assignments to check for duplicates
    // Include both contractor and purchasing assignments
    const allCurrentAssignments = transformedAssignments.map((a: any) => ({
      id: a.id,
      categoryId: a.category_id || a.categoryId || "",
      mainCategory: a.main_category || a.mainCategory || "",
      subcategory: a.subcategory || "",
      contractorId: a.contractor_id || a.contractorId || "",
      contractorName: a.contractor_name || a.contractorName || "مشتريات",
      estimatedAmount:
        a.estimated_amount?.toString() || a.estimatedAmount?.toString() || "0",
      notes: a.notes || "",
      isPurchasing: a.assignment_type === "purchasing",
      status: a.status || "active", // Include status for budget calculation
      actual_amount: a.actual_amount || 0, // Include spent amount for frozen assignment calculation
      spentAmount: a.actual_amount || 0, // Alternative field name
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

      // Budget validation for new assignments
      if (project) {
        const totalBudget =
          typeof project.budgetEstimate === "string"
            ? parseFloat(project.budgetEstimate) || 0
            : project.budgetEstimate || 0;
        const spentBudget =
          typeof project.spentBudget === "string"
            ? parseFloat(project.spentBudget) || 0
            : project.spentBudget || 0;

        // Calculate approved project expenses total
        const approvedExpensesTotal = projectExpenses
          .filter((expense) => expense.status === "approved")
          .reduce((sum, expense) => {
            const cost =
              typeof expense.cost === "string"
                ? parseFloat(expense.cost) || 0
                : expense.cost || 0;
            return sum + cost;
          }, 0);

        // Calculate total project spending (category spending + project expenses)
        const totalProjectSpending = spentBudget + approvedExpensesTotal;

        // Calculate remaining budget (what's left for new assignments)
        const remainingBudget = totalBudget - totalProjectSpending;

        // Calculate total of new assignments
        const newAssignmentsTotal = assignments.reduce((total, assignment) => {
          return total + (parseFloat(assignment.estimatedAmount) || 0);
        }, 0);

        // Check if new assignments exceed remaining project budget
        if (newAssignmentsTotal > remainingBudget) {
          return {
            success: false,
            error: `إجمالي التعيينات الجديدة (${formatCurrency(
              newAssignmentsTotal
            )}) يتجاوز الميزانية المتبقية للمشروع (${formatCurrency(
              remainingBudget
            )}). الميزانية المنفقة حالياً: ${formatCurrency(
              totalProjectSpending
            )}`,
          };
        }
      }

      // Transform assignments to API format
      const apiAssignments = assignments.map((assignment) => {
        // Validate contractor_id is not empty (only for non-purchasing assignments)
        const contractorId = assignment.isPurchasing
          ? null
          : assignment.contractorId?.trim();
        if (!assignment.isPurchasing && !contractorId) {
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
          assignment_type: assignment.isPurchasing
            ? "purchasing"
            : "contractor",
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
          // NEW FINANCIAL FIELDS
          pricePerMeter: projectData.price_per_meter,
          ownerDealPrice: projectData.owner_deal_price,
          ownerPaidAmount: projectData.owner_paid_amount,
          constructionCost: projectData.construction_cost,
          profitMargin: projectData.profit_margin,
          totalSiteArea: projectData.total_site_area,
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
        assignment.contractor_name ||
        assignment.contractorName ||
        (assignment.assignment_type === "purchasing" ||
        !assignment.contractor_id
          ? "مشتريات"
          : "غير محدد"),
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
      assignment_type:
        assignment.assignment_type ||
        (assignment.contractor_id ? "contractor" : "purchasing"),
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
          // Map the new budget fields from backend
          allocatedBudget: projectData.allocated_budget,
          availableBudget: projectData.available_budget,
          spentBudget: projectData.spent_budget,
          client: projectData.client,
          startDate: projectData.start_date?.split("T")[0] || "",
          endDate: projectData.end_date?.split("T")[0] || "",
          status: projectData.status,
          createdAt: projectData.created_at,
          updatedAt: projectData.updated_at,
          categoryAssignments: projectData.categoryAssignments || [],
          // NEW FINANCIAL FIELDS
          pricePerMeter: projectData.price_per_meter,
          ownerDealPrice: projectData.owner_deal_price,
          ownerPaidAmount: projectData.owner_paid_amount,
          constructionCost: projectData.construction_cost,
          profitMargin: projectData.profit_margin,
          totalSiteArea: projectData.total_site_area,
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
    if (!newExpense.expense_name.trim() || !newExpense.cost) return;

    // Budget validation for project expenses
    if (project) {
      const totalBudget =
        typeof project.budgetEstimate === "string"
          ? parseFloat(project.budgetEstimate) || 0
          : project.budgetEstimate || 0;
      const spentBudget =
        typeof project.spentBudget === "string"
          ? parseFloat(project.spentBudget) || 0
          : project.spentBudget || 0;
      const approvedExpensesTotal = projectExpenses
        .filter((expense) => expense.status === "approved")
        .reduce((sum, expense) => {
          const cost =
            typeof expense.cost === "string"
              ? parseFloat(expense.cost) || 0
              : expense.cost || 0;
          return sum + cost;
        }, 0);

      const totalProjectSpending = spentBudget + approvedExpensesTotal;
      const remainingBudget = totalBudget - totalProjectSpending;
      const expenseCost = parseFloat(newExpense.cost);

      if (expenseCost > remainingBudget) {
        addToast({
          type: "error",
          title: "تجاوز الميزانية",
          message: `مبلغ المصروف (${formatCurrency(
            expenseCost
          )}) يتجاوز الميزانية المتبقية (${formatCurrency(remainingBudget)})`,
        });
        return;
      }
    }

    setExpensesLoading(true);
    try {
      const expenseData = {
        project_id: projectId,
        expense_name: newExpense.expense_name.trim(),
        category: "Project Expense", // Simple fixed category
        cost: parseFloat(newExpense.cost),
        details: newExpense.details.trim() || undefined,
        expense_date: newExpense.expense_date,
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
        cost: "",
        details: "",
        expense_date: new Date().toISOString().split("T")[0],
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

  // Calculate total expenses with NaN protection
  const totalExpenses = projectExpenses.reduce((sum, expense) => {
    if (expense.status === "approved") {
      const cost =
        typeof expense.cost === "number"
          ? expense.cost
          : parseFloat(expense.cost) || 0;
      return sum + (isNaN(cost) ? 0 : cost);
    }
    return sum;
  }, 0);

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
            <ArrowLeft className="h-5 w-5 mr-2 no-flip" />
            العودة للمشاريع
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Role-Based Navigation */}
      <RoleBasedNavigation />

      {/* Main Content Container */}
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header with Return Button and Tab Navigation */}
        <div className="max-w-7xl mx-auto mb-8">
          {/* Return Button positioned above tabs */}
          <div className="flex justify-start mb-4">
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

          {/* Modern Tab Navigation */}
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
                              مساحة البناء الفعلية
                            </p>
                            <p className="font-medium text-gray-800 arabic-spacing">
                              {new Intl.NumberFormat("ar-IQ").format(
                                Number(project.area)
                              )}{" "}
                              متر مربع
                            </p>
                          </div>
                        )}
                        {project.totalSiteArea && (
                          <div>
                            <p className="text-sm text-gray-600 arabic-spacing">
                              المساحة الكلية للموقع
                            </p>
                            <p className="font-medium text-gray-800 arabic-spacing">
                              {new Intl.NumberFormat("ar-IQ").format(
                                Number(project.totalSiteArea)
                              )}{" "}
                              متر مربع
                            </p>
                            {project.area && (
                              <p className="text-xs text-purple-600 arabic-spacing mt-1">
                                📊 نسبة البناء:{" "}
                                {(
                                  (Number(project.area) /
                                    Number(project.totalSiteArea)) *
                                  100
                                ).toFixed(1)}
                                %
                              </p>
                            )}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-sm text-gray-600 arabic-spacing mb-2">
                          الميزانية المقدرة
                        </p>
                        <p className="text-2xl font-bold text-amber-600 arabic-spacing">
                          <FinancialDisplay
                            value={
                              project.budgetEstimate || project.budget_estimate
                            }
                          />
                        </p>
                      </div>

                      {/* NEW FINANCIAL FIELDS */}
                      {(project.pricePerMeter || project.price_per_meter) && (
                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                          <p className="text-sm text-gray-600 arabic-spacing mb-2">
                            سعر المتر المربع
                          </p>
                          <p className="text-xl font-bold text-blue-600 arabic-spacing">
                            <FinancialDisplay
                              value={
                                project.pricePerMeter || project.price_per_meter
                              }
                            />{" "}
                            / م²
                          </p>
                        </div>
                      )}

                      {(project.ownerDealPrice || project.owner_deal_price) && (
                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                          <p className="text-sm text-gray-600 arabic-spacing mb-2">
                            سعر الصفقة مع المالك
                          </p>
                          <p className="text-xl font-bold text-purple-600 arabic-spacing">
                            <FinancialDisplay
                              value={
                                project.ownerDealPrice ||
                                project.owner_deal_price
                              }
                            />
                          </p>
                        </div>
                      )}

                      {(project.ownerPaidAmount ||
                        project.owner_paid_amount) && (
                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                          <p className="text-sm text-gray-600 arabic-spacing mb-2">
                            المبلغ المدفوع من المالك
                          </p>
                          <p className="text-xl font-bold text-green-600 arabic-spacing">
                            <FinancialDisplay
                              value={
                                project.ownerPaidAmount ||
                                project.owner_paid_amount
                              }
                            />
                          </p>
                        </div>
                      )}

                      {(project.constructionCost ||
                        project.construction_cost) && (
                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                          <p className="text-sm text-gray-600 arabic-spacing mb-2">
                            تكلفة الإنشاء المحسوبة
                          </p>
                          <p className="text-xl font-bold text-indigo-600 arabic-spacing">
                            <FinancialDisplay
                              value={
                                project.constructionCost ||
                                project.construction_cost
                              }
                            />
                          </p>
                        </div>
                      )}

                      {(project.profitMargin || project.profit_margin) && (
                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                          <p className="text-sm text-gray-600 arabic-spacing mb-2">
                            هامش الربح
                          </p>
                          <p className="text-xl font-bold text-emerald-600 arabic-spacing">
                            {(project.profitMargin || project.profit_margin) &&
                            !isNaN(
                              Number(
                                project.profitMargin || project.profit_margin
                              )
                            )
                              ? Number(
                                  project.profitMargin || project.profit_margin
                                ).toFixed(2)
                              : "0.00"}
                            %
                          </p>
                        </div>
                      )}

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

                  {/* NEW COMPREHENSIVE FINANCIAL OVERVIEW */}
                  {(project.pricePerMeter ||
                    project.ownerDealPrice ||
                    project.constructionCost) && (
                    <div className="mt-8 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-6 border border-emerald-200">
                      <div className="flex items-center space-x-3 space-x-reverse mb-6">
                        <div className="bg-emerald-500 p-3 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-white no-flip" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 arabic-spacing">
                          التحليل المالي المتقدم
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Construction Cost */}
                        {project.constructionCost && (
                          <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm border border-emerald-200">
                            <div className="flex items-center space-x-2 space-x-reverse mb-2">
                              <Building2 className="h-4 w-4 text-blue-600 no-flip" />
                              <p className="text-sm text-gray-600 arabic-spacing">
                                تكلفة الإنشاء
                              </p>
                            </div>
                            <p className="text-xl font-bold text-blue-600 arabic-spacing">
                              <FinancialDisplay
                                value={project.constructionCost}
                              />
                            </p>
                            {project.area && project.pricePerMeter && (
                              <p className="text-xs text-gray-500 arabic-spacing mt-1">
                                {Number(project.area).toLocaleString()} م² ×{" "}
                                <FinancialDisplay
                                  value={project.pricePerMeter}
                                />
                                /م²
                              </p>
                            )}
                          </div>
                        )}

                        {/* Owner Deal Value */}
                        {project.ownerDealPrice && (
                          <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm border border-emerald-200">
                            <div className="flex items-center space-x-2 space-x-reverse mb-2">
                              <User className="h-4 w-4 text-purple-600 no-flip" />
                              <p className="text-sm text-gray-600 arabic-spacing">
                                قيمة الصفقة
                              </p>
                            </div>
                            <p className="text-xl font-bold text-purple-600 arabic-spacing">
                              <FinancialDisplay
                                value={project.ownerDealPrice}
                              />
                            </p>
                          </div>
                        )}

                        {/* Expected Profit */}
                        {project.ownerDealPrice && project.constructionCost && (
                          <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm border border-emerald-200">
                            <div className="flex items-center space-x-2 space-x-reverse mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600 no-flip" />
                              <p className="text-sm text-gray-600 arabic-spacing">
                                الربح المتوقع
                              </p>
                            </div>
                            <p className="text-xl font-bold text-green-600 arabic-spacing">
                              {project.ownerDealPrice &&
                              project.constructionCost ? (
                                <FinancialDisplay
                                  value={
                                    Number(project.ownerDealPrice) -
                                    Number(project.constructionCost)
                                  }
                                />
                              ) : (
                                <FinancialDisplay value={0} />
                              )}
                            </p>
                          </div>
                        )}

                        {/* Profit Margin */}
                        {project.profitMargin !== undefined &&
                          project.profitMargin !== null && (
                            <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm border border-emerald-200">
                              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600 no-flip" />
                                <p className="text-sm text-gray-600 arabic-spacing">
                                  هامش الربح
                                </p>
                              </div>
                              <p className="text-xl font-bold text-emerald-600 arabic-spacing">
                                {project.profitMargin &&
                                !isNaN(Number(project.profitMargin))
                                  ? Number(project.profitMargin).toFixed(2)
                                  : "0.00"}
                                %
                              </p>
                            </div>
                          )}
                      </div>

                      {/* Owner Payment Tracking */}
                      {project.ownerPaidAmount && project.ownerDealPrice && (
                        <div className="mt-6 bg-white/70 rounded-xl p-4 backdrop-blur-sm border border-emerald-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Wallet className="h-5 w-5 text-green-600 no-flip" />
                              <h4 className="font-semibold text-gray-800 arabic-spacing">
                                حالة دفعات المالك
                              </h4>
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              {project.ownerPaidAmount &&
                              project.ownerDealPrice &&
                              Number(project.ownerDealPrice) > 0
                                ? (
                                    (Number(project.ownerPaidAmount) /
                                      Number(project.ownerDealPrice)) *
                                    100
                                  ).toFixed(1)
                                : "0.0"}
                              % مدفوع
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-600 arabic-spacing mb-1">
                                المبلغ المدفوع
                              </p>
                              <p className="text-lg font-bold text-green-600 arabic-spacing">
                                <FinancialDisplay
                                  value={project.ownerPaidAmount}
                                />
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600 arabic-spacing mb-1">
                                المتبقي
                              </p>
                              <p className="text-lg font-bold text-orange-600 arabic-spacing">
                                {project.ownerDealPrice &&
                                project.ownerPaidAmount ? (
                                  <FinancialDisplay
                                    value={
                                      Number(project.ownerDealPrice) -
                                      Number(project.ownerPaidAmount)
                                    }
                                  />
                                ) : (
                                  <FinancialDisplay
                                    value={project.ownerDealPrice || 0}
                                  />
                                )}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600 arabic-spacing mb-1">
                                إجمالي الصفقة
                              </p>
                              <p className="text-lg font-bold text-purple-600 arabic-spacing">
                                <FinancialDisplay
                                  value={project.ownerDealPrice}
                                />
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    project.ownerPaidAmount &&
                                    project.ownerDealPrice &&
                                    Number(project.ownerDealPrice) > 0
                                      ? Math.min(
                                          100,
                                          (Number(project.ownerPaidAmount) /
                                            Number(project.ownerDealPrice)) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Safe Funding Integration Placeholder */}
                      {/* <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <AlertCircle className="h-5 w-5 text-blue-600 no-flip" />
                          <p className="text-sm text-blue-800 font-medium arabic-spacing">
                            ربط تمويل الخزنة (قادم قريباً)
                          </p>
                        </div>
                        <p className="text-xs text-blue-600 arabic-spacing mt-2">
                          سيتم ربط هذا القسم مع نظام تمويل الخزنة لعرض تفاصيل
                          الدفعات والتحويلات من وإلى المشروع
                        </p>
                      </div>
                      */}
                    </div>
                  )}

                  {/* Enhanced Financial Overview with Corrected Budget Calculations */}
                  {(() => {
                    // Use the corrected budget tracking from backend
                    // Parse all budget values as numbers to avoid calculation errors
                    const totalBudget =
                      typeof project.budgetEstimate === "string"
                        ? parseFloat(project.budgetEstimate) || 0
                        : project.budgetEstimate || 0;
                    const allocatedBudget =
                      typeof project.allocatedBudget === "string"
                        ? parseFloat(project.allocatedBudget) || 0
                        : project.allocatedBudget || 0;
                    const availableBudget =
                      typeof project.availableBudget === "string"
                        ? parseFloat(project.availableBudget) || 0
                        : project.availableBudget || 0;
                    const spentBudget =
                      typeof project.spentBudget === "string"
                        ? parseFloat(project.spentBudget) || 0
                        : project.spentBudget || 0;

                    // Parse all values as numbers to avoid string concatenation and NaN errors
                    const parsedSpentBudget =
                      typeof spentBudget === "string"
                        ? parseFloat(spentBudget) || 0
                        : spentBudget || 0;

                    // Calculate approved project expenses total (for display) - ensure proper number parsing
                    const approvedExpensesTotal = projectExpenses
                      .filter((expense) => expense.status === "approved")
                      .reduce((sum, expense) => {
                        const cost =
                          typeof expense.cost === "string"
                            ? parseFloat(expense.cost) || 0
                            : expense.cost || 0;
                        return sum + cost;
                      }, 0);

                    // Enhanced calculation with contractor vs purchasing breakdown
                    const contractorSpending = transformedAssignments
                      .filter((a: any) => a.assignment_type !== "purchasing")
                      .reduce(
                        (sum: number, a: any) => sum + (a.actual_amount || 0),
                        0
                      );

                    const purchasingSpending = transformedAssignments
                      .filter((a: any) => a.assignment_type === "purchasing")
                      .reduce(
                        (sum: number, a: any) => sum + (a.actual_amount || 0),
                        0
                      );

                    // CORRECT CALCULATION:
                    // spentBudget (from backend) = category assignments actual spending only
                    // totalProjectSpending = category spending + project expenses
                    const totalProjectSpending =
                      parsedSpentBudget + approvedExpensesTotal;

                    // For display breakdown: category spending is the spentBudget from backend
                    const categoryActualSpending = parsedSpentBudget;

                    // Validate all values to prevent NaN
                    const safeTotal = isNaN(totalBudget) ? 0 : totalBudget;
                    const safeSpending = isNaN(totalProjectSpending)
                      ? 0
                      : totalProjectSpending;

                    // Calculate completion percentage based on total spending vs total budget
                    const completionPercentage =
                      safeTotal > 0
                        ? Math.round((safeSpending / safeTotal) * 100)
                        : 0;

                    // Remaining budget is what's left after actual spending
                    const remainingBudget = Math.max(
                      0,
                      safeTotal - safeSpending
                    );

                    return (
                      <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                        <h4 className="text-xl font-bold text-gray-800 arabic-spacing mb-6 flex items-center">
                          <Wallet className="h-6 w-6 ml-2 text-blue-600 no-flip" />
                          الملخص المالي للمشروع
                        </h4>

                        {/* Key Financial Metrics - Enhanced with Budget Allocation */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              <FinancialDisplay value={safeTotal} />
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              الميزانية الإجمالية
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                              <FinancialDisplay value={allocatedBudget} />
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              المخصص للمقاولين
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {safeTotal > 0 && !isNaN(allocatedBudget)
                                ? Math.round(
                                    (allocatedBudget / safeTotal) * 100
                                  )
                                : 0}
                              % من الميزانية
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                              <FinancialDisplay value={safeSpending} />
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              إجمالي المصروفات
                            </div>
                            <div className="text-xs text-blue-600 mt-1 flex items-center justify-center">
                              <User className="h-3 w-3 ml-1 no-flip" />
                              مقاولات:{" "}
                              <FinancialDisplay value={contractorSpending} />
                            </div>
                            <div className="text-xs text-green-600 flex items-center justify-center">
                              <ShoppingCart className="h-3 w-3 ml-1 no-flip" />
                              مشتريات:{" "}
                              <FinancialDisplay value={purchasingSpending} />
                            </div>
                            <div className="text-xs text-gray-500">
                              عامة:{" "}
                              <FinancialDisplay value={approvedExpensesTotal} />
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-orange-600 mb-1">
                              <FinancialDisplay value={availableBudget} />
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              متاح للتخصيص
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              للمقاولين الجدد
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div
                              className={`text-2xl font-bold mb-1 ${
                                remainingBudget >= 0
                                  ? "text-indigo-600"
                                  : "text-red-600"
                              }`}
                            >
                              <FinancialDisplay value={remainingBudget} />
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              {remainingBudget >= 0
                                ? "المتبقي الفعلي"
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
                              {completionPercentage || 0}%
                            </div>
                            <div className="text-sm text-gray-600 arabic-spacing">
                              نسبة الإنجاز
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Assignment Breakdown - Contractor vs Purchasing */}
                        {transformedAssignments.length > 0 && (
                          <div className="bg-white rounded-xl p-6 shadow-sm mb-4 border border-gray-100">
                            <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                              <Calculator className="h-5 w-5 ml-2 text-gray-600 no-flip" />
                              تفصيل التعيينات والمصروفات
                            </h5>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Contractor Assignments */}
                              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h6 className="font-semibold text-blue-800 flex items-center">
                                    <User className="h-4 w-4 ml-2 no-flip" />
                                    تعيينات المقاولين
                                  </h6>
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm font-medium">
                                    {
                                      transformedAssignments.filter(
                                        (a: any) =>
                                          a.assignment_type !== "purchasing"
                                      ).length
                                    }
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      المبلغ المقدر:
                                    </span>
                                    <span className="font-medium text-blue-700">
                                      <FinancialDisplay
                                        value={transformedAssignments
                                          .filter(
                                            (a: any) =>
                                              a.assignment_type !== "purchasing"
                                          )
                                          .reduce(
                                            (sum: number, a: any) =>
                                              sum + (a.estimated_amount || 0),
                                            0
                                          )}
                                      />
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      المبلغ الفعلي:
                                    </span>
                                    <span className="font-medium text-green-700">
                                      <FinancialDisplay
                                        value={contractorSpending}
                                      />
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      عدد الفواتير:
                                    </span>
                                    <span className="font-medium text-gray-800">
                                      {transformedAssignments
                                        .filter(
                                          (a: any) =>
                                            a.assignment_type !== "purchasing"
                                        )
                                        .reduce(
                                          (sum: number, a: any) =>
                                            sum + (a.total_invoices || 0),
                                          0
                                        )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Purchasing Assignments */}
                              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h6 className="font-semibold text-green-800 flex items-center">
                                    <ShoppingCart className="h-4 w-4 ml-2 no-flip" />
                                    تعيينات المشتريات
                                  </h6>
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-sm font-medium">
                                    {
                                      transformedAssignments.filter(
                                        (a: any) =>
                                          a.assignment_type === "purchasing"
                                      ).length
                                    }
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      المبلغ المقدر:
                                    </span>
                                    <span className="font-medium text-green-700">
                                      <FinancialDisplay
                                        value={transformedAssignments
                                          .filter(
                                            (a: any) =>
                                              a.assignment_type === "purchasing"
                                          )
                                          .reduce(
                                            (sum: number, a: any) =>
                                              sum + (a.estimated_amount || 0),
                                            0
                                          )}
                                      />
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      المبلغ الفعلي:
                                    </span>
                                    <span className="font-medium text-green-700">
                                      <FinancialDisplay
                                        value={purchasingSpending}
                                      />
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      عدد الفواتير:
                                    </span>
                                    <span className="font-medium text-gray-800">
                                      {transformedAssignments
                                        .filter(
                                          (a: any) =>
                                            a.assignment_type === "purchasing"
                                        )
                                        .reduce(
                                          (sum: number, a: any) =>
                                            sum + (a.total_invoices || 0),
                                          0
                                        )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-gray-800">
                                    {transformedAssignments.length}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    إجمالي التعيينات
                                  </div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-blue-600">
                                    {
                                      transformedAssignments.filter(
                                        (a: any) => a.has_approved_invoice
                                      ).length
                                    }
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    لها فواتير معتمدة
                                  </div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-yellow-600">
                                    {
                                      transformedAssignments.filter(
                                        (a: any) => a.budget_exhausted
                                      ).length
                                    }
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    ميزانية مستنفدة
                                  </div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-green-600">
                                    {Math.round(
                                      transformedAssignments.length > 0
                                        ? (transformedAssignments.reduce(
                                            (sum: number, a: any) =>
                                              sum + (a.actual_amount || 0),
                                            0
                                          ) /
                                            transformedAssignments.reduce(
                                              (sum: number, a: any) =>
                                                sum + (a.estimated_amount || 0),
                                              0
                                            )) *
                                            100
                                        : 0
                                    )}
                                    %
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    نسبة الإنفاق
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Project Expenses Summary */}
                        {projectExpenses.length > 0 && (
                          <div className="bg-white rounded-xl p-6 shadow-sm mb-4 border border-gray-100">
                            <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                              <Receipt className="h-5 w-5 ml-2 text-gray-600 no-flip" />
                              المصروفات الخاصة بالمشروع
                            </h5>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Pending Expenses */}
                              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h6 className="font-semibold text-yellow-800 flex items-center">
                                    <Clock className="h-4 w-4 ml-2 no-flip" />
                                    في الانتظار
                                  </h6>
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-sm font-medium">
                                    {
                                      projectExpenses.filter(
                                        (e) => e.status === "pending"
                                      ).length
                                    }
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      إجمالي المبلغ:
                                    </span>
                                    <span className="font-medium text-yellow-700">
                                      {formatCurrency(
                                        projectExpenses
                                          .filter((e) => e.status === "pending")
                                          .reduce((sum, e) => {
                                            const cost =
                                              typeof e.cost === "number"
                                                ? e.cost
                                                : parseFloat(e.cost) || 0;
                                            return (
                                              sum + (isNaN(cost) ? 0 : cost)
                                            );
                                          }, 0)
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      متوسط المصروف:
                                    </span>
                                    <span className="font-medium text-gray-800">
                                      {(() => {
                                        const pendingExpenses =
                                          projectExpenses.filter(
                                            (e) => e.status === "pending"
                                          );
                                        const total = pendingExpenses.reduce(
                                          (sum, e) => {
                                            const cost =
                                              typeof e.cost === "number"
                                                ? e.cost
                                                : parseFloat(e.cost) || 0;
                                            return (
                                              sum + (isNaN(cost) ? 0 : cost)
                                            );
                                          },
                                          0
                                        );
                                        return formatCurrency(
                                          pendingExpenses.length > 0
                                            ? total / pendingExpenses.length
                                            : 0
                                        );
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Approved Expenses */}
                              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h6 className="font-semibold text-green-800 flex items-center">
                                    <CheckCircle className="h-4 w-4 ml-2 no-flip" />
                                    معتمد ومدفوع
                                  </h6>
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-sm font-medium">
                                    {
                                      projectExpenses.filter(
                                        (e) => e.status === "approved"
                                      ).length
                                    }
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      إجمالي المبلغ:
                                    </span>
                                    <span className="font-medium text-green-700">
                                      {formatCurrency(
                                        isNaN(totalExpenses) ? 0 : totalExpenses
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      متوسط المصروف:
                                    </span>
                                    <span className="font-medium text-gray-800">
                                      {(() => {
                                        const approvedExpenses =
                                          projectExpenses.filter(
                                            (e) => e.status === "approved"
                                          );
                                        const safeTotalExpenses = isNaN(
                                          totalExpenses
                                        )
                                          ? 0
                                          : totalExpenses;
                                        return formatCurrency(
                                          approvedExpenses.length > 0
                                            ? safeTotalExpenses /
                                                approvedExpenses.length
                                            : 0
                                        );
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      من الميزانية:
                                    </span>
                                    <span className="font-medium text-green-700">
                                      {(() => {
                                        const budget =
                                          project?.budgetEstimate ||
                                          project?.budget_estimate ||
                                          0;
                                        if (budget === 0) return "N/A";
                                        const safeTotalExpenses = isNaN(
                                          totalExpenses
                                        )
                                          ? 0
                                          : totalExpenses;
                                        const percentage =
                                          (safeTotalExpenses / budget) * 100;
                                        return isNaN(percentage)
                                          ? "0%"
                                          : `${percentage.toFixed(1)}%`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Rejected Expenses */}
                              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h6 className="font-semibold text-red-800 flex items-center">
                                    <XCircle className="h-4 w-4 ml-2 no-flip" />
                                    مرفوض
                                  </h6>
                                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-lg text-sm font-medium">
                                    {
                                      projectExpenses.filter(
                                        (e) => e.status === "rejected"
                                      ).length
                                    }
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      إجمالي المبلغ:
                                    </span>
                                    <span className="font-medium text-red-700">
                                      {formatCurrency(
                                        projectExpenses
                                          .filter(
                                            (e) => e.status === "rejected"
                                          )
                                          .reduce((sum, e) => {
                                            const cost =
                                              typeof e.cost === "number"
                                                ? e.cost
                                                : parseFloat(e.cost) || 0;
                                            return (
                                              sum + (isNaN(cost) ? 0 : cost)
                                            );
                                          }, 0)
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      متوسط المصروف:
                                    </span>
                                    <span className="font-medium text-gray-800">
                                      {(() => {
                                        const rejectedExpenses =
                                          projectExpenses.filter(
                                            (e) => e.status === "rejected"
                                          );
                                        const total = rejectedExpenses.reduce(
                                          (sum, e) => {
                                            const cost =
                                              typeof e.cost === "number"
                                                ? e.cost
                                                : parseFloat(e.cost) || 0;
                                            return (
                                              sum + (isNaN(cost) ? 0 : cost)
                                            );
                                          },
                                          0
                                        );
                                        return formatCurrency(
                                          rejectedExpenses.length > 0
                                            ? total / rejectedExpenses.length
                                            : 0
                                        );
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Project Expenses Quick Stats */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-gray-800">
                                    {projectExpenses.length}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    إجمالي المصروفات
                                  </div>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-orange-600">
                                    {formatCurrency(
                                      projectExpenses.reduce((sum, e) => {
                                        const cost =
                                          typeof e.cost === "number"
                                            ? e.cost
                                            : parseFloat(e.cost) || 0;
                                        return sum + (isNaN(cost) ? 0 : cost);
                                      }, 0)
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    إجمالي القيمة
                                  </div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-blue-600">
                                    {(() => {
                                      const categoryCounts =
                                        projectExpenses.reduce((acc, e) => {
                                          acc[e.category] =
                                            (acc[e.category] || 0) + 1;
                                          return acc;
                                        }, {} as Record<string, number>);
                                      return Object.keys(categoryCounts).length;
                                    })()}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    فئات مختلفة
                                  </div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-purple-600">
                                    {(() => {
                                      const approvedCount =
                                        projectExpenses.filter(
                                          (e) => e.status === "approved"
                                        ).length;
                                      const totalCount = projectExpenses.length;
                                      return totalCount > 0
                                        ? Math.round(
                                            (approvedCount / totalCount) * 100
                                          )
                                        : 0;
                                    })()}
                                    %
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    نسبة الاعتماد
                                  </div>
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
                              {completionPercentage || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  Math.max(completionPercentage || 0, 0),
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
                                  <FinancialDisplay value={safeSpending} />
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 arabic-spacing">
                                  رصيد الخزينة الحالي:
                                </span>
                                <span className="font-bold text-blue-600">
                                  <FinancialDisplay
                                    value={safeState.currentBalance}
                                  />
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
                                <FinancialDisplay
                                  value={Math.abs(budgetDifference)}
                                />
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
              onFreezeAssignment={handleFreezeAssignment}
              onUnfreezeAssignment={handleUnfreezeAssignment}
              onEditAssignmentAmount={handleEditAssignmentAmount}
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
                    <PermissionButton
                      permission="canCreateInvoices"
                      onClick={() => setShowExpenseModal(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      viewOnlyTooltip="غير متاح - وضع العرض فقط"
                    >
                      <Plus className="h-5 w-5 ml-2 no-flip" />
                      <span className="arabic-spacing">إضافة مصروف جديد</span>
                    </PermissionButton>
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
                        {isNaN(totalExpenses)
                          ? "0"
                          : new Intl.NumberFormat("en-US").format(
                              totalExpenses
                            )}
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
                        {(() => {
                          const budget =
                            project?.budgetEstimate || project?.budget_estimate;
                          if (!budget || budget === 0) return "N/A";

                          const safeTotalExpenses = isNaN(totalExpenses)
                            ? 0
                            : totalExpenses;
                          const percentage = (safeTotalExpenses / budget) * 100;

                          return isNaN(percentage)
                            ? "0%"
                            : `${percentage.toFixed(1)}%`;
                        })()}
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
              </div>

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

                // Handle specific error types with toast messages
                if (errorData.error === "DUPLICATE_CUSTOMER_INVOICE") {
                  addToast({
                    type: "error",
                    title: "رقم فاتورة مكرر",
                    message:
                      errorData.userMessage ||
                      "رقم فاتورة العميل مستخدم مسبقاً",
                  });
                  return; // Don't close modal, let user fix the issue
                }

                // Show user-friendly error messages for other errors
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

              // Invoice is now stored in database, no need for localStorage
              console.log(
                "✅ Category invoice created in database:",
                result.invoice.id
              );

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
        projectBudget={
          typeof project?.budgetEstimate === "string"
            ? parseFloat(project.budgetEstimate) || 0
            : project?.budgetEstimate || 0
        }
        currentAllocatedBudget={
          typeof project?.allocatedBudget === "string"
            ? parseFloat(project.allocatedBudget) || 0
            : project?.allocatedBudget || 0
        }
        spentBudget={
          typeof project?.spentBudget === "string"
            ? parseFloat(project.spentBudget) || 0
            : project?.spentBudget || 0
        }
        projectName={project?.name}
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
