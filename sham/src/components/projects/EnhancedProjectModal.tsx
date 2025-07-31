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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
        assignment.contractors.length > 0 &&
        assignment.contractors.every(
          (contractor) =>
            contractor.contractorName.trim() &&
            contractor.estimatedAmount &&
            parseFloat(contractor.estimatedAmount) > 0
        )
    );

  const isFormValid =
    isBasicFormValid && (currentStep === "basic" || isCategoriesValid);

  // Add new category assignment
  const addCategoryAssignment = () => {
    const newAssignment: ProjectCategoryAssignmentFormData = {
      mainCategory: "",
      subcategory: "",
      contractors: [],
    };

    setProjectForm({
      ...projectForm,
      categoryAssignments: [...projectForm.categoryAssignments, newAssignment],
    });
  };

  // Remove category assignment
  const removeCategoryAssignment = (index: number) => {
    const updatedAssignments = projectForm.categoryAssignments.filter(
      (_, i) => i !== index
    );
    setProjectForm({
      ...projectForm,
      categoryAssignments: updatedAssignments,
    });
  };

  // Update category assignment
  const updateCategoryAssignment = (
    index: number,
    field: keyof ProjectCategoryAssignmentFormData,
    value: string
  ) => {
    const updatedAssignments = [...projectForm.categoryAssignments];
    updatedAssignments[index] = {
      ...updatedAssignments[index],
      [field]: value,
    };

    // Reset subcategory when main category changes
    if (field === "mainCategory") {
      updatedAssignments[index].subcategory = "";
    }

    // Update contractor name when contractor ID changes
    if (field === "contractors") {
      const selectedContractor = contractors.find((c) => c.id === value);
      updatedAssignments[index].contractors = [
        {
          contractorId: selectedContractor?.id || "",
          contractorName: selectedContractor?.full_name || "",
          estimatedAmount: "",
          notes: "",
        },
      ];
    }

    setProjectForm({
      ...projectForm,
      categoryAssignments: updatedAssignments,
    });
  };

  // Calculate total estimated budget from category assignments
  const calculateTotalEstimated = () => {
    return projectForm.categoryAssignments.reduce((sum, assignment) => {
      return sum + (parseFloat(assignment.contractors[0].estimatedAmount) || 0);
    }, 0);
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === "basic" && isBasicFormValid) {
      setCurrentStep("categories");
      // Add initial category assignment if none exist
      if (projectForm.categoryAssignments.length === 0) {
        addCategoryAssignment();
      }
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
            /* Categories Step - Redesigned for Better UX */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
              {/* Left Sidebar - Category Selection */}
              <div className="lg:col-span-2 space-y-4">
                {/* Budget Summary - Fixed Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sticky top-0 z-10">
                  <div className="flex items-center space-x-2 space-x-reverse mb-3">
                    <div className="bg-[#182C61] p-2 rounded-lg">
                      <DollarSign className="h-4 w-4 text-white no-flip" />
                    </div>
                    <h4 className="font-bold text-gray-800 arabic-spacing">
                      ملخص الميزانية
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 arabic-spacing">
                        إجمالي المقدرة:
                      </span>
                      <span className="font-bold text-[#182C61]">
                        {new Intl.NumberFormat("ar-IQ").format(
                          calculateTotalEstimated()
                        )}{" "}
                        د.ع
                      </span>
                    </div>
                    {projectForm.budgetEstimate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 arabic-spacing">
                          نسبة التغطية:
                        </span>
                        <span
                          className={`text-sm font-medium ${
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
                    )}
                  </div>
                </div>

                {/* Category Selection */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-800 arabic-spacing">
                      اختر الفئات
                    </h4>
                    <p className="text-sm text-gray-600 arabic-spacing">
                      انقر على فئة لإضافة مقاولين
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {PROJECT_CATEGORIES.map((category) => {
                      const CategoryIcon =
                        categoryIcons[
                          category.id as keyof typeof categoryIcons
                        ];
                      const categoryContractors =
                        projectForm.categoryAssignments.filter(
                          (a) => a.mainCategory === category.name
                        );

                      return (
                        <div key={category.id}>
                          <button
                            onClick={() =>
                              setExpandedCategory(
                                expandedCategory === category.id
                                  ? null
                                  : category.id
                              )
                            }
                            className="w-full p-3 text-right hover:bg-blue-50 border-b border-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <CategoryIcon className="h-5 w-5 text-[#182C61] no-flip" />
                                <span className="font-medium text-gray-800 arabic-spacing">
                                  {category.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 space-x-reverse">
                                {categoryContractors.length > 0 && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    {categoryContractors.length}
                                  </span>
                                )}
                                <ChevronDown
                                  className={`h-4 w-4 text-gray-400 transition-transform ${
                                    expandedCategory === category.id
                                      ? "rotate-180"
                                      : ""
                                  } no-flip`}
                                />
                              </div>
                            </div>
                          </button>

                          {expandedCategory === category.id && (
                            <div className="bg-gray-50 border-t border-gray-200">
                              {category.subcategories.map((subcategory) => {
                                const subcategoryContractors =
                                  categoryContractors.filter(
                                    (a) => a.subcategory === subcategory
                                  );

                                return (
                                  <button
                                    key={subcategory}
                                    onClick={() => {
                                      const newAssignment: ProjectCategoryAssignmentFormData =
                                        {
                                          mainCategory: category.name,
                                          subcategory: subcategory,
                                          contractors: [],
                                        };
                                      setProjectForm({
                                        ...projectForm,
                                        categoryAssignments: [
                                          ...projectForm.categoryAssignments,
                                          newAssignment,
                                        ],
                                      });
                                    }}
                                    className="w-full p-2 pr-8 text-right hover:bg-blue-50 border-b border-gray-100 text-sm transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-700 arabic-spacing">
                                        {subcategory}
                                      </span>
                                      <div className="flex items-center space-x-1 space-x-reverse">
                                        {subcategoryContractors.length > 0 && (
                                          <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">
                                            {subcategoryContractors.length}
                                          </span>
                                        )}
                                        <Plus className="h-3 w-3 text-blue-600 no-flip" />
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side - Contractor Assignments */}
              <div className="lg:col-span-3">
                <div className="bg-white border border-gray-200 rounded-xl h-full flex flex-col">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Users className="h-5 w-5 text-[#182C61] no-flip" />
                        <h4 className="font-semibold text-gray-800 arabic-spacing">
                          المقاولون المعينون
                        </h4>
                      </div>
                      <span className="text-sm text-gray-500 arabic-spacing">
                        {projectForm.categoryAssignments.length} مهمة
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {projectForm.categoryAssignments.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-gray-400 no-flip" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-spacing">
                          لم يتم تعيين مقاولين بعد
                        </h3>
                        <p className="text-gray-500 arabic-spacing">
                          اختر فئة من القائمة اليسرى لبدء تعيين المقاولين
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projectForm.categoryAssignments.map(
                          (assignment, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                            >
                              {/* Assignment Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2 space-x-reverse">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="font-medium text-gray-800 arabic-spacing text-sm">
                                    {assignment.subcategory}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    removeCategoryAssignment(index)
                                  }
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                >
                                  <Trash2 className="h-4 w-4 no-flip" />
                                </Button>
                              </div>

                              {/* Category Badge */}
                              <div className="mb-3">
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full arabic-spacing">
                                  {assignment.mainCategory}
                                </span>
                              </div>

                              {/* Compact Form */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Contractor Selection */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-gray-700 arabic-spacing">
                                    المقاول *
                                  </label>
                                  <Select
                                    value={
                                      assignment.contractors[0].contractorId
                                    }
                                    onChange={(e) =>
                                      updateCategoryAssignment(
                                        index,
                                        "contractors",
                                        e.target.value
                                      )
                                    }
                                    className="h-10 text-sm"
                                  >
                                    <option value="">اختر المقاول</option>
                                    {contractors
                                      .filter((c) => c.is_active)
                                      .map((contractor) => (
                                        <option
                                          key={contractor.id}
                                          value={contractor.id}
                                        >
                                          {contractor.full_name}
                                        </option>
                                      ))}
                                  </Select>
                                  {!assignment.contractors[0].contractorId && (
                                    <Input
                                      value={
                                        assignment.contractors[0].contractorName
                                      }
                                      onChange={(e) =>
                                        updateCategoryAssignment(
                                          index,
                                          "contractors",
                                          e.target.value
                                        )
                                      }
                                      className="h-10 text-sm mt-1"
                                      placeholder="أو أدخل اسم المقاول"
                                    />
                                  )}
                                </div>

                                {/* Estimated Amount */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-gray-700 arabic-spacing">
                                    المبلغ المقدر *
                                  </label>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={
                                      assignment.contractors[0].estimatedAmount
                                    }
                                    onChange={(e) =>
                                      updateCategoryAssignment(
                                        index,
                                        "contractors",
                                        e.target.value
                                      )
                                    }
                                    className="h-10 text-sm"
                                    placeholder="0"
                                  />
                                  {assignment.contractors[0]
                                    .estimatedAmount && (
                                    <p className="text-[#182C61] text-xs font-medium">
                                      💰{" "}
                                      {new Intl.NumberFormat("ar-IQ").format(
                                        Number(
                                          assignment.contractors[0]
                                            .estimatedAmount
                                        )
                                      )}{" "}
                                      د.ع
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Notes */}
                              <div className="mt-3 space-y-1">
                                <label className="block text-xs font-medium text-gray-700 arabic-spacing">
                                  ملاحظات
                                </label>
                                <Input
                                  value={assignment.contractors[0].notes || ""}
                                  onChange={(e) =>
                                    updateCategoryAssignment(
                                      index,
                                      "contractors",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-sm arabic-spacing"
                                  placeholder="ملاحظات إضافية..."
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
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
              <span className="font-medium">نصيحة:</span>
              {currentStep === "basic"
                ? "تأكد من دقة البيانات الأساسية قبل المتابعة"
                : "يمكنك إضافة عدة مقاولين لنفس الفئة حسب الحاجة"}
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
                  disabled={!isFormValid || loading}
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
