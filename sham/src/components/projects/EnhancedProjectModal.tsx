import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Calendar,
  Building2,
  User,
  MapPin,
  DollarSign,
  Ruler,
  Plus,
  Trash2,
  Users,
  Package,
  Settings,
  Briefcase,
  ChevronDown,
  UserCheck,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Project,
  EnhancedProjectFormData,
  ProjectCategoryAssignmentFormData,
  Contractor,
} from "@/types";
import {
  PROJECT_CATEGORIES,
  getSubcategoriesByCategory,
} from "@/constants/projectCategories";
import { useContractors } from "@/contexts/ContractorContext";

interface ProjectModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  project?: Project;
  projectForm: EnhancedProjectFormData;
  setProjectForm: (form: EnhancedProjectFormData) => void;
  onClose: () => void;
  onSubmit: () => void;
  generateProjectCode: () => string;
  loading?: boolean;
}

const statusOptions = [
  {
    value: "planning",
    label: "في مرحلة التخطيط",
    color: "text-yellow-700 bg-yellow-50 border-yellow-200",
    icon: Settings,
  },
  {
    value: "active",
    label: "نشط ومستمر",
    color: "text-green-700 bg-green-50 border-green-200",
    icon: Package,
  },
  {
    value: "completed",
    label: "مكتمل بنجاح",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    icon: Building2,
  },
  {
    value: "cancelled",
    label: "ملغي أو متوقف",
    color: "text-red-700 bg-red-50 border-red-200",
    icon: X,
  },
];

// Category icons mapping
const categoryIcons = {
  implementation_construction: Package,
  materials_supply: Briefcase,
  specialized_works: Settings,
  administrative_operational: Users,
};

export default function EnhancedProjectModal({
  isOpen,
  mode,
  project,
  projectForm,
  setProjectForm,
  onClose,
  onSubmit,
  generateProjectCode,
  loading = false,
}: ProjectModalProps) {
  const { contractors } = useContractors();
  const [currentStep, setCurrentStep] = useState<"basic" | "categories">(
    "basic"
  );
  const [categoryInvoiceStatus, setCategoryInvoiceStatus] = useState<any[]>([]);
  const [loadingInvoiceStatus, setLoadingInvoiceStatus] = useState(false);

  // Quick category addition state (same as creation page)
  const [quickCategory, setQuickCategory] = useState({
    mainCategory: "",
    subcategory: "",
    contractorId: "",
    contractorName: "",
    estimatedAmount: "",
    notes: "",
  });

  // Load category invoice status when in edit mode
  useEffect(() => {
    if (mode === "edit" && project?.id && isOpen) {
      loadCategoryInvoiceStatus();
    }
  }, [mode, project?.id, isOpen]);

  const loadCategoryInvoiceStatus = async () => {
    if (!project?.id) return;

    try {
      setLoadingInvoiceStatus(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/category-invoices/project/${project.id}/status`
      );

      if (response.ok) {
        const result = await response.json();
        setCategoryInvoiceStatus(result.categoryStatus || []);
      }
    } catch (error) {
      console.error("Error loading category invoice status:", error);
    } finally {
      setLoadingInvoiceStatus(false);
    }
  };

  // Check if a category assignment is locked (has invoices)
  const isCategoryLocked = (assignment: any) => {
    return categoryInvoiceStatus.some(
      (status) =>
        status.main_category === assignment.mainCategory &&
        status.subcategory === assignment.subcategory &&
        status.contractor_name ===
          assignment.contractors?.[0]?.contractorName &&
        (status.edit_status === "locked" || status.has_approved_invoice)
    );
  };

  if (!isOpen) return null;

  // Form validation
  const isBasicFormValid =
    projectForm.name.trim() &&
    projectForm.location.trim() &&
    projectForm.client.trim() &&
    projectForm.startDate &&
    projectForm.budgetEstimate;

  const isCategoriesValid =
    projectForm.categoryAssignments.length > 0 &&
    projectForm.categoryAssignments.every(
      (assignment) =>
        assignment.mainCategory &&
        assignment.subcategory &&
        assignment.contractors &&
        assignment.contractors.length > 0 &&
        assignment.contractors.every(
          (contractor) =>
            contractor.contractorName?.trim() &&
            contractor.estimatedAmount &&
            parseFloat(contractor.estimatedAmount) > 0
        )
    );

  const hasLockedCategories =
    mode === "edit" &&
    projectForm.categoryAssignments.some((assignment) => {
      const isLocked = isCategoryLocked(assignment);
      return isLocked;
    });

  const canSaveProject =
    isBasicFormValid &&
    (currentStep === "basic" || isCategoriesValid) &&
    (mode === "create" || !hasLockedCategories || currentStep === "basic");

  const isFormValid =
    isBasicFormValid && (currentStep === "basic" || isCategoriesValid);

  // Calculate total estimated budget from category assignments
  const calculateTotalEstimated = () => {
    return projectForm.categoryAssignments.reduce((sum, assignment) => {
      const assignmentTotal = assignment.contractors.reduce(
        (contractorSum, contractor) => {
          return contractorSum + (parseFloat(contractor.estimatedAmount) || 0);
        },
        0
      );
      return sum + assignmentTotal;
    }, 0);
  };

  // Add category assignment (from creation page) with strict validation
  const addCategoryAssignment = () => {
    // Strict validation - must select from dropdowns only
    const isValidMainCategory = PROJECT_CATEGORIES.some(
      (cat) => cat.name === quickCategory.mainCategory
    );
    const isValidSubcategory =
      quickCategory.mainCategory &&
      PROJECT_CATEGORIES.find(
        (cat) => cat.name === quickCategory.mainCategory
      )?.subcategories.includes(quickCategory.subcategory);

    const isValidContractor =
      quickCategory.contractorId &&
      contractors.some(
        (c) => c.id === quickCategory.contractorId && c.is_active
      );

    // Validation errors
    if (!isValidMainCategory) {
      alert("❌ يجب اختيار الفئة الرئيسية من القائمة المتاحة");
      return;
    }

    if (!isValidSubcategory) {
      alert("❌ يجب اختيار الوصف/الأعمال من القائمة المتاحة للفئة المحددة");
      return;
    }

    if (!isValidContractor) {
      alert("❌ يجب اختيار المقاول من قائمة المقاولين المسجلين فقط");
      return;
    }

    if (
      !quickCategory.estimatedAmount ||
      parseFloat(quickCategory.estimatedAmount) <= 0
    ) {
      alert("❌ يجب إدخال مبلغ مقدر صحيح");
      return;
    }

    const selectedContractor = contractors.find(
      (c) => c.id === quickCategory.contractorId
    );
    const contractorName = selectedContractor?.full_name || "";

    // Check if subcategory already exists
    const existingAssignmentIndex = projectForm.categoryAssignments.findIndex(
      (assignment) =>
        assignment.mainCategory === quickCategory.mainCategory &&
        assignment.subcategory === quickCategory.subcategory
    );

    const newContractor = {
      contractorId: quickCategory.contractorId,
      contractorName: contractorName,
      estimatedAmount: quickCategory.estimatedAmount,
      notes: quickCategory.notes,
    };

    if (existingAssignmentIndex !== -1) {
      // Add contractor to existing assignment
      const updatedAssignments = [...projectForm.categoryAssignments];
      updatedAssignments[existingAssignmentIndex].contractors.push(
        newContractor
      );
      setProjectForm({
        ...projectForm,
        categoryAssignments: updatedAssignments,
      });
    } else {
      // Create new assignment
      const newAssignment: ProjectCategoryAssignmentFormData = {
        mainCategory: quickCategory.mainCategory,
        subcategory: quickCategory.subcategory,
        contractors: [newContractor],
      };
      setProjectForm({
        ...projectForm,
        categoryAssignments: [
          ...projectForm.categoryAssignments,
          newAssignment,
        ],
      });
    }

    // Reset quick category form
    setQuickCategory({
      mainCategory: "",
      subcategory: "",
      contractorId: "",
      contractorName: "",
      estimatedAmount: "",
      notes: "",
    });
  };

  // Remove contractor from assignment
  const removeContractor = (
    assignmentIndex: number,
    contractorIndex: number
  ) => {
    const updatedAssignments = [...projectForm.categoryAssignments];
    updatedAssignments[assignmentIndex].contractors.splice(contractorIndex, 1);

    // If no contractors left, remove the entire assignment
    if (updatedAssignments[assignmentIndex].contractors.length === 0) {
      updatedAssignments.splice(assignmentIndex, 1);
    }

    setProjectForm({
      ...projectForm,
      categoryAssignments: updatedAssignments,
    });
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === "basic" && isBasicFormValid) {
      setCurrentStep("categories");
      // Categories will be added using the quick add form
    }
  };

  // Handle back step
  const handleBack = () => {
    setCurrentStep("basic");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Enhanced Header with Step Indicator */}
        <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200 bg-gradient-to-r from-[#182C61] to-blue-600 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse text-white">
              <div className="bg-white/20 p-2 sm:p-3 rounded-xl">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 no-flip" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold arabic-spacing">
                  {mode === "create"
                    ? "إنشاء مشروع جديد"
                    : "تعديل معلومات المشروع"}
                </h3>
                <p className="text-blue-100 arabic-spacing mt-1 text-sm sm:text-base">
                  {currentStep === "basic"
                    ? "المعلومات الأساسية للمشروع"
                    : "تحديد الفئات والمقاولين"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0 text-white hover:bg-white/20"
              title="إغلاق النافذة"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 no-flip" />
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div
              className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg transition-all ${
                currentStep === "basic"
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-blue-200"
              }`}
            >
              <Building2 className="h-4 w-4 no-flip" />
              <span className="text-sm font-medium arabic-spacing">
                المعلومات الأساسية
              </span>
              {isBasicFormValid && <CheckCircle className="h-4 w-4 no-flip" />}
            </div>
            <ChevronRight className="h-4 w-4 text-blue-200 no-flip" />
            <div
              className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg transition-all ${
                currentStep === "categories"
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-blue-200"
              }`}
            >
              <Users className="h-4 w-4 no-flip" />
              <span className="text-sm font-medium arabic-spacing">
                الفئات والمقاولين
              </span>
              {isCategoriesValid && <CheckCircle className="h-4 w-4 no-flip" />}
            </div>
          </div>
        </div>

        {/* Enhanced Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentStep === "basic" ? (
            /* Basic Information Step */
            <div className="space-y-6 sm:space-y-8">
              {/* Project Code Display */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-[#182C61] p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-white no-flip" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                      كود المشروع (تلقائي)
                    </label>
                    <div className="bg-white border border-blue-300 rounded-lg px-4 py-3 text-base sm:text-lg font-mono text-[#182C61] font-bold">
                      {mode === "create"
                        ? generateProjectCode()
                        : project?.code}
                    </div>
                    <p className="text-xs text-blue-600 mt-2 arabic-spacing">
                      {mode === "create"
                        ? "⚡ يتم توليد الكود تلقائياً ولا يمكن تعديله"
                        : "🔒 كود المشروع ثابت ولا يمكن تغييره"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                      <Building2 className="h-5 w-5 text-[#182C61] no-flip" />
                      <span className="arabic-spacing">اسم المشروع *</span>
                    </label>
                    <Input
                      value={projectForm.name}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, name: e.target.value })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="مثال: مجمع سكني"
                    />
                    {!projectForm.name.trim() && (
                      <p className="text-red-500 text-sm arabic-spacing">
                        ⚠️ اسم المشروع مطلوب
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                      <MapPin className="h-5 w-5 text-[#182C61] no-flip" />
                      <span className="arabic-spacing">موقع المشروع *</span>
                    </label>
                    <Input
                      value={projectForm.location}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          location: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="مثال: شارع الرشيد، بغداد"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                      <Ruler className="h-5 w-5 text-[#182C61] no-flip" />
                      <span className="arabic-spacing">
                        مساحة المشروع (متر مربع)
                      </span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={projectForm.area}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, area: e.target.value })
                      }
                      className="h-12 text-base"
                      placeholder="مثال: 500.00"
                    />
                    {projectForm.area && (
                      <p className="text-[#182C61] text-sm font-medium">
                        📐{" "}
                        {new Intl.NumberFormat("ar-IQ", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(Number(projectForm.area))}{" "}
                        متر مربع
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                      <User className="h-5 w-5 text-[#182C61] no-flip" />
                      <span className="arabic-spacing">اسم العميل *</span>
                    </label>
                    <Input
                      value={projectForm.client}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          client: e.target.value,
                        })
                      }
                      className="h-12 text-base arabic-spacing"
                      placeholder="مثال: شركة التطوير العقاري"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                      <DollarSign className="h-5 w-5 text-[#182C61] no-flip" />
                      <span className="arabic-spacing">
                        الميزانية المقدرة (دينار عراقي) *
                      </span>
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={projectForm.budgetEstimate}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          budgetEstimate: e.target.value,
                        })
                      }
                      className="h-12 text-base"
                      placeholder="1,000,000"
                    />
                    {projectForm.budgetEstimate && (
                      <p className="text-[#182C61] text-sm font-medium">
                        💰{" "}
                        {new Intl.NumberFormat("ar-IQ").format(
                          Number(projectForm.budgetEstimate)
                        )}{" "}
                        دينار عراقي
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                        <Calendar className="h-5 w-5 text-[#182C61] no-flip" />
                        <span className="arabic-spacing">تاريخ البدء *</span>
                      </label>
                      <Input
                        type="date"
                        value={projectForm.startDate}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            startDate: e.target.value,
                          })
                        }
                        className="h-12 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                        <Calendar className="h-5 w-5 text-[#182C61] no-flip" />
                        <span className="arabic-spacing">
                          تاريخ الانتهاء المتوقع
                        </span>
                      </label>
                      <Input
                        type="date"
                        value={projectForm.endDate}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            endDate: e.target.value,
                          })
                        }
                        className="h-12 text-base"
                        min={projectForm.startDate}
                      />
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-3">
                    <label className="text-base font-semibold text-gray-800 arabic-spacing">
                      حالة المشروع
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {statusOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                            projectForm.status === option.value
                              ? option.color + " border-2"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={option.value}
                            checked={projectForm.status === option.value}
                            onChange={(e) =>
                              setProjectForm({
                                ...projectForm,
                                status: e.target.value as any,
                              })
                            }
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <option.icon className="h-4 w-4 no-flip" />
                            <span className="text-sm font-medium arabic-spacing">
                              {option.label}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Categories Step - Creation Page Style Interface */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              {/* Left Side - Quick Add Form */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl h-fit">
                <div className="flex items-center space-x-3 space-x-reverse mb-6">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Plus className="h-5 w-5 text-green-600 no-flip" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 arabic-spacing">
                    إضافة فئة جديدة
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Main Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                      الفئة الرئيسية *
                    </label>
                    <Select
                      value={quickCategory.mainCategory}
                      onChange={(e) =>
                        setQuickCategory({
                          ...quickCategory,
                          mainCategory: e.target.value,
                          subcategory: "", // Reset subcategory
                        })
                      }
                      className="h-12"
                    >
                      <option value="">اختر الفئة الرئيسية</option>
                      {PROJECT_CATEGORIES.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                      الوصف/الأعمال *
                    </label>
                    <Select
                      value={quickCategory.subcategory}
                      onChange={(e) =>
                        setQuickCategory({
                          ...quickCategory,
                          subcategory: e.target.value,
                        })
                      }
                      className="h-12"
                      disabled={!quickCategory.mainCategory}
                    >
                      <option value="">اختر نوع الأعمال</option>
                      {quickCategory.mainCategory &&
                        PROJECT_CATEGORIES.find(
                          (cat) => cat.name === quickCategory.mainCategory
                        )?.subcategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                    </Select>
                  </div>

                  {/* Contractor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                      المقاول *
                    </label>
                    <Select
                      value={quickCategory.contractorId}
                      onChange={(e) => {
                        const selectedContractor = contractors.find(
                          (c) => c.id === e.target.value
                        );
                        setQuickCategory({
                          ...quickCategory,
                          contractorId: e.target.value,
                          contractorName: selectedContractor?.full_name || "",
                        });
                      }}
                      className="h-12"
                    >
                      <option value="">اختر من المقاولين المسجلين</option>
                      {contractors
                        .filter((c) => c.is_active)
                        .map((contractor) => (
                          <option key={contractor.id} value={contractor.id}>
                            {contractor.full_name}
                          </option>
                        ))}
                    </Select>
                    {!quickCategory.contractorId && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 arabic-spacing">
                          ⚠️ يجب اختيار مقاول من القائمة أعلاه فقط. لإضافة مقاول
                          جديد، يرجى الذهاب إلى صفحة المقاولين أولاً.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                      المبلغ المقدر (دينار عراقي) *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={quickCategory.estimatedAmount}
                      onChange={(e) =>
                        setQuickCategory({
                          ...quickCategory,
                          estimatedAmount: e.target.value,
                        })
                      }
                      className="h-12"
                      placeholder="مثال: 5000000"
                    />
                    {quickCategory.estimatedAmount && (
                      <p className="text-[#182C61] text-sm font-medium mt-1">
                        💰{" "}
                        {new Intl.NumberFormat("ar-IQ").format(
                          Number(quickCategory.estimatedAmount)
                        )}{" "}
                        دينار عراقي
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                      ملاحظات
                    </label>
                    <Input
                      value={quickCategory.notes}
                      onChange={(e) =>
                        setQuickCategory({
                          ...quickCategory,
                          notes: e.target.value,
                        })
                      }
                      className="h-12 arabic-spacing"
                      placeholder="أي ملاحظات إضافية..."
                    />
                  </div>

                  {/* Add Button */}
                  <Button
                    onClick={addCategoryAssignment}
                    disabled={
                      !quickCategory.mainCategory ||
                      !quickCategory.subcategory ||
                      !quickCategory.contractorId ||
                      !quickCategory.estimatedAmount ||
                      parseFloat(quickCategory.estimatedAmount) <= 0
                    }
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-5 w-5 ml-2 no-flip" />
                    <span className="arabic-spacing">
                      {quickCategory.mainCategory &&
                      quickCategory.subcategory &&
                      projectForm.categoryAssignments.some(
                        (a) =>
                          a.mainCategory === quickCategory.mainCategory &&
                          a.subcategory === quickCategory.subcategory
                      )
                        ? "إضافة مقاول للفئة"
                        : "إضافة فئة جديدة"}
                    </span>
                  </Button>

                  {/* Helper text */}
                  {quickCategory.mainCategory && quickCategory.subcategory && (
                    <div className="text-center">
                      <p className="text-xs text-gray-600 arabic-spacing">
                        {projectForm.categoryAssignments.some(
                          (a) =>
                            a.mainCategory === quickCategory.mainCategory &&
                            a.subcategory === quickCategory.subcategory
                        )
                          ? "🔄 ستتم إضافة المقاول للفئة الموجودة"
                          : "✨ ستتم إضافة فئة جديدة"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Budget Summary & Added Categories */}
              <div className="space-y-6">
                {/* Budget Summary */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center space-x-3 space-x-reverse mb-4">
                    <DollarSign className="h-6 w-6 text-[#182C61] no-flip" />
                    <h3 className="text-lg font-bold text-gray-900 arabic-spacing">
                      ملخص الميزانية
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600 arabic-spacing">
                        الميزانية الإجمالية
                      </p>
                      <p className="text-xl font-bold text-[#182C61]">
                        {new Intl.NumberFormat("ar-IQ").format(
                          Number(projectForm.budgetEstimate) || 0
                        )}{" "}
                        د.ع
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600 arabic-spacing">
                        المبلغ المعين
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        {new Intl.NumberFormat("ar-IQ").format(
                          calculateTotalEstimated()
                        )}{" "}
                        د.ع
                      </p>
                    </div>
                  </div>

                  {projectForm.budgetEstimate && (
                    <div className="mt-4 bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 arabic-spacing">
                          نسبة التغطية
                        </span>
                        <span
                          className={`font-bold ${
                            calculateTotalEstimated() >
                            parseFloat(projectForm.budgetEstimate)
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {(
                            (calculateTotalEstimated() /
                              parseFloat(projectForm.budgetEstimate)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            calculateTotalEstimated() >
                            parseFloat(projectForm.budgetEstimate)
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (calculateTotalEstimated() /
                                parseFloat(projectForm.budgetEstimate)) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Added Categories */}
                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Users className="h-6 w-6 text-[#182C61] no-flip" />
                      <h3 className="text-lg font-bold text-gray-900 arabic-spacing">
                        الفئات المضافة
                      </h3>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {projectForm.categoryAssignments.length} فئة
                    </span>
                  </div>

                  <div className="space-y-6 max-h-96 overflow-y-auto">
                    {projectForm.categoryAssignments.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-gray-400 no-flip" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-spacing">
                          لم يتم إضافة فئات بعد
                        </h3>
                        <p className="text-gray-500 arabic-spacing">
                          استخدم النموذج على اليسار لإضافة الفئات والمقاولين
                        </p>
                      </div>
                    ) : (
                      projectForm.categoryAssignments.map(
                        (assignment, assignmentIndex) => {
                          const isLocked = isCategoryLocked(assignment);

                          return (
                            <div
                              key={assignmentIndex}
                              className={`rounded-xl p-4 ${
                                isLocked
                                  ? "bg-red-50 border-2 border-red-200"
                                  : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="flex items-center space-x-2 space-x-reverse mb-1">
                                    <span
                                      className={`inline-block text-xs px-2 py-1 rounded-full arabic-spacing ${
                                        isLocked
                                          ? "bg-red-100 text-red-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {assignment.mainCategory}
                                    </span>
                                    {isLocked && (
                                      <div className="flex items-center space-x-1 space-x-reverse">
                                        <svg
                                          className="h-4 w-4 text-red-600 no-flip"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        <span className="text-xs text-red-600 arabic-spacing font-medium">
                                          محمي - تم إنشاء فواتير
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <h4
                                    className={`font-semibold arabic-spacing ${
                                      isLocked
                                        ? "text-red-800"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {assignment.subcategory}
                                  </h4>
                                </div>
                                {isLocked && (
                                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                                    <p className="text-xs text-red-700 arabic-spacing">
                                      🔒 لا يمكن تعديل أو حذف هذه الفئة لأنه تم
                                      إنشاء فواتير لها مسبقاً
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                {assignment.contractors.map(
                                  (contractor, contractorIndex) => (
                                    <div
                                      key={contractorIndex}
                                      className={`flex items-center justify-between p-3 rounded-lg ${
                                        isLocked ? "bg-red-100" : "bg-white"
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                          <User
                                            className={`h-4 w-4 no-flip ${
                                              isLocked
                                                ? "text-red-500"
                                                : "text-gray-400"
                                            }`}
                                          />
                                          <span
                                            className={`font-medium arabic-spacing ${
                                              isLocked
                                                ? "text-red-800"
                                                : "text-gray-800"
                                            }`}
                                          >
                                            {contractor.contractorName}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-4 space-x-reverse mt-1">
                                          <span
                                            className={`text-sm arabic-spacing ${
                                              isLocked
                                                ? "text-red-700"
                                                : "text-gray-600"
                                            }`}
                                          >
                                            💰{" "}
                                            {new Intl.NumberFormat(
                                              "ar-IQ"
                                            ).format(
                                              Number(
                                                contractor.estimatedAmount
                                              ) || 0
                                            )}{" "}
                                            د.ع
                                          </span>
                                          {contractor.notes && (
                                            <span
                                              className={`text-xs arabic-spacing ${
                                                isLocked
                                                  ? "text-red-600"
                                                  : "text-gray-500"
                                              }`}
                                            >
                                              📝 {contractor.notes}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {!isLocked && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            removeContractor(
                                              assignmentIndex,
                                              contractorIndex
                                            )
                                          }
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                        >
                                          <Trash2 className="h-4 w-4 no-flip" />
                                        </Button>
                                      )}
                                      {isLocked && (
                                        <div className="flex items-center space-x-1 space-x-reverse text-red-600">
                                          <svg
                                            className="h-4 w-4 no-flip"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                          <span className="text-xs font-medium">
                                            محمي
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="p-4 sm:p-6 lg:p-8 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 arabic-spacing">
              {hasLockedCategories && currentStep === "categories" ? (
                <div className="flex items-center space-x-2 space-x-reverse text-red-600">
                  <svg
                    className="h-4 w-4 no-flip"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">
                    تحذير: بعض الفئات محمية ولا يمكن تعديلها لوجود فواتير مرتبطة
                    بها
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-medium">نصيحة:</span>
                  {currentStep === "basic"
                    ? " تأكد من دقة البيانات الأساسية قبل المتابعة"
                    : " يجب اختيار جميع الخيارات من القوائم المنسدلة فقط"}
                </div>
              )}
            </div>

            <div className="flex space-x-3 space-x-reverse">
              {currentStep === "categories" && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="px-6 py-3 text-base"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">السابق</span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={onClose}
                className="px-6 py-3 text-base"
                disabled={loading}
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>

              {currentStep === "basic" ? (
                <Button
                  onClick={handleNext}
                  disabled={!isBasicFormValid || loading}
                  className="px-6 py-3 text-base bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="arabic-spacing">التالي</span>
                  <ChevronRight className="h-4 w-4 mr-2 no-flip" />
                </Button>
              ) : (
                <Button
                  onClick={onSubmit}
                  disabled={!canSaveProject || loading}
                  className="px-6 py-3 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="arabic-spacing">جاري الحفظ...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Save className="h-4 w-4 mr-2 no-flip" />
                      <span className="arabic-spacing">
                        {mode === "create" ? "إنشاء المشروع" : "حفظ التغييرات"}
                      </span>
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
