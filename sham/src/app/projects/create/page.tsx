"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
//import { Toast } from "@/components/ui/Toast";
import {
  EnhancedProjectFormData,
  ProjectCategoryAssignmentFormData,
  Contractor,
} from "@/types";
import {
  PROJECT_CATEGORIES,
  getSubcategoriesByCategory,
} from "@/constants/projectCategories";
import { useContractors } from "@/contexts/ContractorContext";

const statusOptions = [
  {
    value: "planning",
    label: "في مرحلة التخطيط",
    color: "border-yellow-300 bg-yellow-50 text-yellow-800",
    icon: Settings,
  },
  {
    value: "active",
    label: "نشط ومستمر",
    color: "border-green-300 bg-green-50 text-green-800",
    icon: Package,
  },
  {
    value: "completed",
    label: "مكتمل بنجاح",
    color: "border-blue-300 bg-blue-50 text-blue-800",
    icon: Building2,
  },
  {
    value: "cancelled",
    label: "ملغي أو متوقف",
    color: "border-red-300 bg-red-50 text-red-800",
    icon: Trash2,
  },
];

const categoryIcons = {
  implementation_construction: Package,
  materials_supply: Briefcase,
  specialized_works: Settings,
  administrative_operational: Users,
};

export default function CreateProjectPage() {
  const router = useRouter();
  const { contractors } = useContractors();
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState<
    "basic" | "categories" | "review"
  >("basic");

  // Form state
  const [projectForm, setProjectForm] = useState<EnhancedProjectFormData>({
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

  // Quick category addition state
  const [quickCategory, setQuickCategory] = useState({
    mainCategory: "",
    subcategory: "",
    contractorId: "",
    contractorName: "",
    estimatedAmount: "",
    notes: "",
  });

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("projectDraft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setProjectForm(parsed);
      } catch (e) {
        console.log("Could not load draft");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("projectDraft", JSON.stringify(projectForm));
  }, [projectForm]);

  // Generate project code
  const generateProjectCode = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `PRJ-${year}${month}-${random}`;
  };

  // Validation
  const isBasicFormValid =
    projectForm.name.trim() &&
    projectForm.location.trim() &&
    projectForm.client.trim() &&
    projectForm.startDate &&
    projectForm.budgetEstimate;

  const isCategoriesValid =
    projectForm.categoryAssignments.length > 0 &&
    projectForm.categoryAssignments.every(
      (assignment) => assignment.contractors.length > 0
    );

  // Calculate total estimated budget
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

  // Add category assignment
  const addCategoryAssignment = () => {
    if (
      !quickCategory.mainCategory ||
      !quickCategory.subcategory ||
      (!quickCategory.contractorId && !quickCategory.contractorName.trim()) ||
      !quickCategory.estimatedAmount
    ) {
      setToast({
        type: "error",
        message: "يرجى ملء جميع الحقول المطلوبة",
      });
      return;
    }

    const selectedContractor = contractors.find(
      (c) => c.id === quickCategory.contractorId
    );
    const contractorName =
      selectedContractor?.full_name || quickCategory.contractorName;

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
      // Check if contractor already exists in this subcategory
      const existingContractor = projectForm.categoryAssignments[
        existingAssignmentIndex
      ].contractors.find((contractor) => {
        // Check by ID if both have IDs, otherwise check by name
        if (quickCategory.contractorId && contractor.contractorId) {
          return contractor.contractorId === quickCategory.contractorId;
        }
        return (
          contractor.contractorName.trim().toLowerCase() ===
          contractorName.trim().toLowerCase()
        );
      });

      if (existingContractor) {
        setToast({
          type: "error",
          message: `المقاول "${contractorName}" موجود بالفعل في هذه الفئة`,
        });
        return;
      }

      // Add contractor to existing subcategory
      const updatedAssignments = [...projectForm.categoryAssignments];
      updatedAssignments[existingAssignmentIndex].contractors.push(
        newContractor
      );

      setProjectForm({
        ...projectForm,
        categoryAssignments: updatedAssignments,
      });

      setToast({
        type: "success",
        message: "تم إضافة المقاول للفئة الموجودة",
      });
    } else {
      // Create new subcategory with first contractor
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

      setToast({
        type: "success",
        message: "تم إضافة فئة جديدة بنجاح",
      });
    }

    // Reset quick form
    setQuickCategory({
      mainCategory: quickCategory.mainCategory, // Keep main category for easy re-entry
      subcategory: quickCategory.subcategory, // Keep subcategory for adding more contractors
      contractorId: "",
      contractorName: "",
      estimatedAmount: "",
      notes: "",
    });
  };

  // Remove entire category assignment
  const removeCategoryAssignment = (index: number) => {
    const updatedAssignments = projectForm.categoryAssignments.filter(
      (_, i) => i !== index
    );
    setProjectForm({
      ...projectForm,
      categoryAssignments: updatedAssignments,
    });
  };

  // Remove individual contractor from subcategory
  const removeContractor = (
    assignmentIndex: number,
    contractorIndex: number
  ) => {
    const updatedAssignments = [...projectForm.categoryAssignments];
    updatedAssignments[assignmentIndex].contractors = updatedAssignments[
      assignmentIndex
    ].contractors.filter((_, i) => i !== contractorIndex);

    // If no contractors left, remove the entire assignment
    if (updatedAssignments[assignmentIndex].contractors.length === 0) {
      updatedAssignments.splice(assignmentIndex, 1);
    }

    setProjectForm({
      ...projectForm,
      categoryAssignments: updatedAssignments,
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isBasicFormValid || !isCategoriesValid) {
      setToast({
        type: "error",
        message: "يرجى ملء جميع البيانات المطلوبة",
      });
      return;
    }

    setLoading(true);
    try {
      // Call the API to create the project
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
        {
          method: "POST",
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
        throw new Error(errorData.error || "Failed to create project");
      }

      const result = await response.json();
      console.log("Project created successfully:", result);

      // Clear draft
      localStorage.removeItem("projectDraft");

      setToast({
        type: "success",
        message: "تم إنشاء المشروع بنجاح",
      });

      setTimeout(() => {
        router.push("/projects");
      }, 1500);
    } catch (error) {
      console.error("Error creating project:", error);
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء المشروع",
      });
    } finally {
      setLoading(false);
    }
  };

  // Section navigation
  const goToSection = (section: "basic" | "categories" | "review") => {
    setCurrentSection(section);
  };

  const canGoToCategories = isBasicFormValid;
  const canGoToReview = isBasicFormValid && isCategoriesValid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/projects")}
                className="h-10"
              >
                <ArrowLeft className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">العودة للمشاريع</span>
              </Button>
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="bg-gradient-to-r from-[#182C61] to-blue-600 p-3 rounded-xl">
                  <Building2 className="h-6 w-6 text-white no-flip" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 arabic-spacing">
                    إنشاء مشروع جديد
                  </h1>
                  <p className="text-gray-600 arabic-spacing">
                    أدخل معلومات المشروع والفئات المطلوبة
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center space-x-8 space-x-reverse">
              <div
                className={`flex items-center space-x-2 space-x-reverse cursor-pointer transition-all ${
                  currentSection === "basic"
                    ? "text-[#182C61]"
                    : isBasicFormValid
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
                onClick={() => goToSection("basic")}
              >
                {isBasicFormValid ? (
                  <CheckCircle2 className="h-5 w-5 no-flip" />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full border-2 ${
                      currentSection === "basic"
                        ? "border-[#182C61] bg-[#182C61]"
                        : "border-gray-300"
                    }`}
                  >
                    {currentSection === "basic" && (
                      <div className="w-1 h-1 bg-white rounded-full m-auto mt-1.5"></div>
                    )}
                  </div>
                )}
                <span className="font-medium arabic-spacing">
                  المعلومات الأساسية
                </span>
              </div>

              <div
                className={`flex items-center space-x-2 space-x-reverse cursor-pointer transition-all ${
                  currentSection === "categories"
                    ? "text-[#182C61]"
                    : isCategoriesValid
                    ? "text-green-600"
                    : canGoToCategories
                    ? "text-gray-600"
                    : "text-gray-400"
                }`}
                onClick={() => canGoToCategories && goToSection("categories")}
              >
                {isCategoriesValid ? (
                  <CheckCircle2 className="h-5 w-5 no-flip" />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full border-2 ${
                      currentSection === "categories" && canGoToCategories
                        ? "border-[#182C61] bg-[#182C61]"
                        : canGoToCategories
                        ? "border-gray-400"
                        : "border-gray-300"
                    }`}
                  >
                    {currentSection === "categories" && canGoToCategories && (
                      <div className="w-1 h-1 bg-white rounded-full m-auto mt-1.5"></div>
                    )}
                  </div>
                )}
                <span className="font-medium arabic-spacing">
                  الفئات والمقاولين
                </span>
              </div>

              <div
                className={`flex items-center space-x-2 space-x-reverse cursor-pointer transition-all ${
                  currentSection === "review"
                    ? "text-[#182C61]"
                    : canGoToReview
                    ? "text-gray-600"
                    : "text-gray-400"
                }`}
                onClick={() => canGoToReview && goToSection("review")}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    currentSection === "review" && canGoToReview
                      ? "border-[#182C61] bg-[#182C61]"
                      : canGoToReview
                      ? "border-gray-400"
                      : "border-gray-300"
                  }`}
                >
                  {currentSection === "review" && canGoToReview && (
                    <div className="w-1 h-1 bg-white rounded-full m-auto mt-1.5"></div>
                  )}
                </div>
                <span className="font-medium arabic-spacing">
                  المراجعة والحفظ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentSection === "basic" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Project Code */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="bg-[#182C61] p-3 rounded-xl">
                  <Sparkles className="h-6 w-6 text-white no-flip" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                    كود المشروع (تلقائي)
                  </label>
                  <div className="bg-white border border-blue-300 rounded-lg px-4 py-3 text-xl font-mono text-[#182C61] font-bold">
                    {generateProjectCode()}
                  </div>
                  <p className="text-sm text-blue-600 mt-2 arabic-spacing">
                    ⚡ يتم توليد الكود تلقائياً ولا يمكن تعديله
                  </p>
                </div>
              </div>
            </Card>

            {/* Basic Information */}
            <Card className="p-8">
              <div className="flex items-center space-x-3 space-x-reverse mb-6">
                <Building2 className="h-6 w-6 text-[#182C61] no-flip" />
                <h2 className="text-xl font-bold text-gray-900 arabic-spacing">
                  المعلومات الأساسية
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Name */}
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
                    placeholder="مثال: مجمع سكني الوادي الأخضر"
                  />
                  {!projectForm.name.trim() && (
                    <p className="text-red-500 text-sm arabic-spacing flex items-center space-x-1 space-x-reverse">
                      <AlertCircle className="h-4 w-4 no-flip" />
                      <span>اسم المشروع مطلوب</span>
                    </p>
                  )}
                </div>

                {/* Client Name */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 space-x-reverse text-base font-semibold text-gray-800">
                    <User className="h-5 w-5 text-[#182C61] no-flip" />
                    <span className="arabic-spacing">اسم العميل *</span>
                  </label>
                  <Input
                    value={projectForm.client}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, client: e.target.value })
                    }
                    className="h-12 text-base arabic-spacing"
                    placeholder="مثال: شركة التطوير العقاري المتقدم"
                  />
                </div>

                {/* Location */}
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
                    placeholder="مثال: شارع الرشيد، منطقة الكرادة، بغداد"
                  />
                </div>

                {/* Area */}
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
                    placeholder="مثال: 1500.50"
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

                {/* Budget */}
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
                    placeholder="مثال: 50000000"
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

                {/* Start Date */}
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

                {/* End Date */}
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
              <div className="mt-8 space-y-4">
                <label className="text-base font-semibold text-gray-800 arabic-spacing">
                  حالة المشروع
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                        projectForm.status === option.value
                          ? option.color + " border-current shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
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
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <option.icon className="h-5 w-5 no-flip" />
                        <span className="font-medium arabic-spacing">
                          {option.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Continue Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => goToSection("categories")}
                disabled={!isBasicFormValid}
                className="px-8 py-3 text-base bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700 disabled:opacity-50"
              >
                <span className="arabic-spacing">التالي: إضافة الفئات</span>
                <ArrowLeft className="h-4 w-4 mr-2 rotate-180 no-flip" />
              </Button>
            </div>
          </div>
        )}

        {currentSection === "categories" && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side - Quick Add Form */}
              <Card className="p-6 h-fit sticky top-24">
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
                      <Input
                        value={quickCategory.contractorName}
                        onChange={(e) =>
                          setQuickCategory({
                            ...quickCategory,
                            contractorName: e.target.value,
                          })
                        }
                        className="h-12 mt-2"
                        placeholder="أو أدخل اسم مقاول جديد"
                      />
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
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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

                      {/* Duplicate contractor warning */}
                      {quickCategory.contractorId &&
                        quickCategory.mainCategory &&
                        quickCategory.subcategory &&
                        (() => {
                          const existingAssignment =
                            projectForm.categoryAssignments.find(
                              (a) =>
                                a.mainCategory === quickCategory.mainCategory &&
                                a.subcategory === quickCategory.subcategory
                            );
                          if (existingAssignment) {
                            const selectedContractor = contractors.find(
                              (c) => c.id === quickCategory.contractorId
                            );
                            const contractorName =
                              selectedContractor?.full_name ||
                              quickCategory.contractorName;
                            const isDuplicate =
                              existingAssignment.contractors.some(
                                (contractor) => {
                                  if (
                                    quickCategory.contractorId &&
                                    contractor.contractorId
                                  ) {
                                    return (
                                      contractor.contractorId ===
                                      quickCategory.contractorId
                                    );
                                  }
                                  return (
                                    contractor.contractorName
                                      .trim()
                                      .toLowerCase() ===
                                    contractorName.trim().toLowerCase()
                                  );
                                }
                              );

                            if (isDuplicate) {
                              return (
                                <p className="text-xs text-red-600 arabic-spacing mt-1 bg-red-50 px-2 py-1 rounded">
                                  ⚠️ هذا المقاول موجود بالفعل في هذه الفئة
                                </p>
                              );
                            }
                          }
                          return null;
                        })()}
                    </div>
                  )}
                </div>
              </Card>

              {/* Right Side - Added Categories & Budget Summary */}
              <div className="space-y-6">
                {/* Budget Summary */}
                <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
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
                </Card>

                {/* Added Categories */}
                <Card className="p-6">
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
                          <Plus className="h-8 w-8 text-gray-400 no-flip" />
                        </div>
                        <p className="text-gray-500 arabic-spacing">
                          لم يتم إضافة فئات بعد
                        </p>
                        <p className="text-sm text-gray-400 arabic-spacing">
                          استخدم النموذج على اليسار لإضافة فئات المشروع
                        </p>
                      </div>
                    ) : (
                      projectForm.categoryAssignments.map(
                        (assignment, assignmentIndex) => {
                          // Dynamic color scheme for each category
                          const colorSchemes = [
                            {
                              bg: "bg-gradient-to-br from-blue-50 to-indigo-100",
                              border: "border-blue-200",
                              dot: "bg-blue-500",
                              accent: "text-blue-800",
                            },
                            {
                              bg: "bg-gradient-to-br from-green-50 to-emerald-100",
                              border: "border-green-200",
                              dot: "bg-green-500",
                              accent: "text-green-800",
                            },
                            {
                              bg: "bg-gradient-to-br from-purple-50 to-violet-100",
                              border: "border-purple-200",
                              dot: "bg-purple-500",
                              accent: "text-purple-800",
                            },
                            {
                              bg: "bg-gradient-to-br from-orange-50 to-amber-100",
                              border: "border-orange-200",
                              dot: "bg-orange-500",
                              accent: "text-orange-800",
                            },
                            {
                              bg: "bg-gradient-to-br from-pink-50 to-rose-100",
                              border: "border-pink-200",
                              dot: "bg-pink-500",
                              accent: "text-pink-800",
                            },
                            {
                              bg: "bg-gradient-to-br from-teal-50 to-cyan-100",
                              border: "border-teal-200",
                              dot: "bg-teal-500",
                              accent: "text-teal-800",
                            },
                          ];
                          const colorScheme =
                            colorSchemes[assignmentIndex % colorSchemes.length];

                          return (
                            <div
                              key={assignmentIndex}
                              className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-xl p-5 hover:shadow-lg transition-all duration-200 relative overflow-hidden`}
                            >
                              {/* Decorative accent bar */}
                              <div
                                className={`absolute top-0 left-0 w-1 h-full ${colorScheme.dot}`}
                              ></div>

                              {/* Subcategory Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3 space-x-reverse">
                                  <div
                                    className={`w-4 h-4 ${colorScheme.dot} rounded-full shadow-sm`}
                                  ></div>
                                  <div>
                                    <span
                                      className={`font-bold text-lg ${colorScheme.accent} arabic-spacing`}
                                    >
                                      {assignment.subcategory}
                                    </span>
                                    <p
                                      className={`text-sm ${colorScheme.accent} opacity-75 arabic-spacing mt-1`}
                                    >
                                      📋 {assignment.mainCategory}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    removeCategoryAssignment(assignmentIndex)
                                  }
                                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50 h-9 w-9 p-0 rounded-lg shadow-sm"
                                  title="حذف الفئة بالكامل"
                                >
                                  <Trash2 className="h-4 w-4 no-flip" />
                                </Button>
                              </div>

                              {/* Contractors List */}
                              <div className="space-y-3">
                                {assignment.contractors.map(
                                  (contractor, contractorIndex) => (
                                    <div
                                      key={contractorIndex}
                                      className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                          <Users
                                            className={`h-5 w-5 ${colorScheme.dot.replace(
                                              "bg-",
                                              "text-"
                                            )} no-flip`}
                                          />
                                          <span className="font-semibold text-gray-900 arabic-spacing">
                                            {contractor.contractorName}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-4 space-x-reverse text-sm">
                                          <span className="text-green-700 font-bold bg-green-50 px-2 py-1 rounded-md">
                                            💰{" "}
                                            {new Intl.NumberFormat(
                                              "ar-IQ"
                                            ).format(
                                              Number(contractor.estimatedAmount)
                                            )}{" "}
                                            د.ع
                                          </span>
                                          {contractor.notes && (
                                            <span className="text-gray-600 arabic-spacing bg-gray-50 px-2 py-1 rounded-md">
                                              📝 {contractor.notes}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          removeContractor(
                                            assignmentIndex,
                                            contractorIndex
                                          )
                                        }
                                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50 h-8 w-8 p-0 rounded-lg shadow-sm"
                                        title="حذف المقاول"
                                      >
                                        <X className="h-4 w-4 no-flip" />
                                      </Button>
                                    </div>
                                  )
                                )}
                              </div>

                              {/* Total for this subcategory */}
                              <div className="mt-4 pt-4 border-t-2 border-white/50">
                                <div
                                  className={`${colorScheme.bg
                                    .replace("from-", "from-")
                                    .replace("to-", "to-")
                                    .replace("50", "100")
                                    .replace(
                                      "100",
                                      "200"
                                    )} rounded-lg p-3 border border-white/60`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                      <div
                                        className={`w-3 h-3 ${colorScheme.dot} rounded-full`}
                                      ></div>
                                      <span
                                        className={`font-semibold ${colorScheme.accent} arabic-spacing`}
                                      >
                                        إجمالي الفئة (
                                        {assignment.contractors.length} مقاول)
                                      </span>
                                    </div>
                                    <span
                                      className={`font-bold text-lg ${colorScheme.accent}`}
                                    >
                                      {new Intl.NumberFormat("ar-IQ").format(
                                        assignment.contractors.reduce(
                                          (sum, contractor) =>
                                            sum +
                                            (parseFloat(
                                              contractor.estimatedAmount
                                            ) || 0),
                                          0
                                        )
                                      )}{" "}
                                      د.ع
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => goToSection("basic")}
                className="px-6 py-3"
              >
                <ArrowLeft className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">السابق</span>
              </Button>

              <Button
                onClick={() => goToSection("review")}
                disabled={!isCategoriesValid}
                className="px-6 py-3 bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700 disabled:opacity-50"
              >
                <span className="arabic-spacing">التالي: المراجعة</span>
                <ArrowLeft className="h-4 w-4 mr-2 rotate-180 no-flip" />
              </Button>
            </div>
          </div>
        )}

        {currentSection === "review" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Review Header */}
            <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center space-x-3 space-x-reverse">
                <CheckCircle2 className="h-8 w-8 text-green-600 no-flip" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 arabic-spacing">
                    مراجعة بيانات المشروع
                  </h2>
                  <p className="text-gray-600 arabic-spacing">
                    تأكد من صحة جميع البيانات قبل إنشاء المشروع
                  </p>
                </div>
              </div>
            </Card>

            {/* Project Summary */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 arabic-spacing mb-4">
                ملخص المشروع
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 arabic-spacing">
                    اسم المشروع
                  </p>
                  <p className="font-semibold text-gray-900 arabic-spacing">
                    {projectForm.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 arabic-spacing">العميل</p>
                  <p className="font-semibold text-gray-900 arabic-spacing">
                    {projectForm.client}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 arabic-spacing">الموقع</p>
                  <p className="font-semibold text-gray-900 arabic-spacing">
                    {projectForm.location}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 arabic-spacing">
                    المساحة
                  </p>
                  <p className="font-semibold text-gray-900">
                    {projectForm.area
                      ? `${new Intl.NumberFormat("ar-IQ", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(Number(projectForm.area))} متر مربع`
                      : "غير محدد"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 arabic-spacing">
                    تاريخ البدء
                  </p>
                  <p className="font-semibold text-gray-900">
                    {new Date(projectForm.startDate).toLocaleDateString(
                      "ar-IQ"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 arabic-spacing">
                    تاريخ الانتهاء
                  </p>
                  <p className="font-semibold text-gray-900">
                    {projectForm.endDate
                      ? new Date(projectForm.endDate).toLocaleDateString(
                          "ar-IQ"
                        )
                      : "غير محدد"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Budget Summary */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 arabic-spacing mb-4">
                ملخص الميزانية
              </h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 arabic-spacing">
                    الميزانية الإجمالية
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat("ar-IQ").format(
                      Number(projectForm.budgetEstimate)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">دينار عراقي</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 arabic-spacing">
                    المبلغ المعين
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat("ar-IQ").format(
                      calculateTotalEstimated()
                    )}
                  </p>
                  <p className="text-xs text-gray-500">دينار عراقي</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 arabic-spacing">
                    المتبقي
                  </p>
                  <p className="text-2xl font-bold text-gray-600">
                    {new Intl.NumberFormat("ar-IQ").format(
                      Number(projectForm.budgetEstimate) -
                        calculateTotalEstimated()
                    )}
                  </p>
                  <p className="text-xs text-gray-500">دينار عراقي</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
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
            </Card>

            {/* Categories Summary */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 arabic-spacing mb-4">
                تفاصيل الفئات ({projectForm.categoryAssignments.length} فئة)
              </h3>

              <div className="space-y-4">
                {projectForm.categoryAssignments.map((assignment, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 arabic-spacing">
                          {assignment.subcategory}
                        </h4>
                        <p className="text-sm text-gray-600 arabic-spacing">
                          {assignment.mainCategory}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-green-600">
                          {new Intl.NumberFormat("ar-IQ").format(
                            assignment.contractors.reduce(
                              (sum, contractor) =>
                                sum +
                                (parseFloat(contractor.estimatedAmount) || 0),
                              0
                            )
                          )}
                        </p>
                        <p className="text-xs text-gray-500">دينار عراقي</p>
                      </div>
                    </div>

                    {/* Contractors list */}
                    <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 arabic-spacing">
                        المقاولون ({assignment.contractors.length}):
                      </p>
                      {assignment.contractors.map(
                        (contractor, contractorIndex) => (
                          <div
                            key={contractorIndex}
                            className="flex justify-between items-center bg-white rounded p-2 text-sm"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 arabic-spacing">
                                {contractor.contractorName}
                              </span>
                              {contractor.notes && (
                                <p className="text-gray-500 arabic-spacing text-xs mt-1">
                                  📝 {contractor.notes}
                                </p>
                              )}
                            </div>
                            <span className="text-green-600 font-medium">
                              {new Intl.NumberFormat("ar-IQ").format(
                                Number(contractor.estimatedAmount)
                              )}{" "}
                              د.ع
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => goToSection("categories")}
                className="px-6 py-3"
              >
                <ArrowLeft className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">السابق</span>
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="arabic-spacing">
                      جاري إنشاء المشروع...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Save className="h-4 w-4 mr-2 no-flip" />
                    <span className="arabic-spacing">إنشاء المشروع</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {/*    {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )} */}
    </div>
  );
}
