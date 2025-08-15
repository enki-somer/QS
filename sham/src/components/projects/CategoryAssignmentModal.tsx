"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Package,
  Users,
  Settings,
  Briefcase,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Calculator,
  Wallet,
  Target,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Contractor } from "@/types";

// Simple interface for modal use
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
  status?: string; // Assignment status (active, frozen, cancelled)
  actual_amount?: number; // Spent amount for frozen assignment calculation
  spentAmount?: number; // Alternative field name for spent amount
}
import { PROJECT_CATEGORIES } from "@/constants/projectCategories";
import { useContractors } from "@/contexts/ContractorContext";
import { useToast } from "@/components/ui/Toast";

interface CategoryAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSave: (
    assignments: SimpleAssignmentFormData[]
  ) => Promise<{ success: boolean; error?: string }>;
  existingAssignments?: SimpleAssignmentFormData[];
  editingAssignmentId?: string;
  // Budget tracking props
  projectBudget: number;
  currentAllocatedBudget: number;
  spentBudget: number;
  projectName?: string;
}

const categoryIcons = {
  implementation_construction: Package,
  materials_supply: Briefcase,
  specialized_works: Settings,
  administrative_operational: Users,
};

export default function CategoryAssignmentModal({
  isOpen,
  onClose,
  projectId,
  onSave,
  existingAssignments = [],
  editingAssignmentId,
  projectBudget,
  currentAllocatedBudget,
  spentBudget,
  projectName,
}: CategoryAssignmentModalProps) {
  const { contractors } = useContractors();
  const { addToast } = useToast();
  const [assignments, setAssignments] =
    useState<SimpleAssignmentFormData[]>(existingAssignments);
  const [loading, setSaving] = useState(false);

  // Quick category addition state
  const [quickCategory, setQuickCategory] = useState({
    mainCategory: "",
    subcategory: "",
    contractorId: "",
    contractorName: "",
    estimatedAmount: "",
    notes: "",
    isPurchasing: false, // New field for purchasing option
  });

  // CRITICAL: Comprehensive Budget Tracking with Cumulative Control
  const calculateBudgetStatus = () => {
    // 1. Calculate existing assignments total (already saved in database)
    // CRITICAL: For frozen assignments, only count the SPENT portion, not the full estimated amount
    // The unused portion has been returned to the project budget pool
    const existingAssignmentsTotal = existingAssignments.reduce(
      (sum, assignment) => {
        const isActive =
          !assignment.id || // New assignments are considered active
          (assignment as any).status === "active" ||
          !(assignment as any).status; // Default to active if no status

        if (isActive) {
          // Active assignments: count full estimated amount
          const amount = parseFloat(assignment.estimatedAmount) || 0;
          return sum + amount;
        } else {
          // Frozen/cancelled assignments: only count the SPENT portion
          // The unused portion (estimated - spent) has been returned to project budget
          const estimatedAmount = parseFloat(assignment.estimatedAmount) || 0;
          const spentAmount = parseFloat(
            (assignment as any).actual_amount ||
              (assignment as any).spentAmount ||
              0
          );
          const consumedBudget = spentAmount; // Only the spent amount is still "locked"

          console.log("🔍 Frozen assignment - counting only spent portion:", {
            contractor: assignment.contractorName,
            estimated: estimatedAmount,
            spent: spentAmount,
            consumedBudget: consumedBudget,
            returned: estimatedAmount - spentAmount,
            status: (assignment as any).status,
          });

          return sum + consumedBudget;
        }
      },
      0
    );

    // 2. Calculate new assignments total (being added in this modal)
    const newAssignmentsTotal = assignments.reduce((sum, assignment) => {
      const amount = parseFloat(assignment.estimatedAmount) || 0;
      return sum + amount;
    }, 0);

    // 3. Calculate quick category amount if being added
    const quickCategoryAmount = parseFloat(quickCategory.estimatedAmount) || 0;

    // 4. CRITICAL: Calculate TOTAL CUMULATIVE ALLOCATIONS
    // This includes: existing assignments + new assignments + quick category
    const totalCumulativeAllocations =
      existingAssignmentsTotal + newAssignmentsTotal + quickCategoryAmount;

    // 5. Calculate what's actually available for new assignments
    // IMPORTANT: Don't subtract spentBudget separately - it's already counted in existingAssignmentsTotal
    const actuallyAvailable = projectBudget - existingAssignmentsTotal;

    // 6. Calculate remaining budget after ALL allocations (existing + new)
    // IMPORTANT: Only subtract allocations, not spent budget (to avoid double counting)
    const remainingBudget = projectBudget - totalCumulativeAllocations;

    // 7. Budget utilization percentage based on TOTAL allocations
    // IMPORTANT: Don't add spentBudget + totalCumulativeAllocations (double counting)
    const utilizationPercentage =
      projectBudget > 0
        ? Math.round((totalCumulativeAllocations / projectBudget) * 100)
        : 0;

    // 8. CRITICAL STATUS CHECKS
    const isOverBudget = remainingBudget < 0; // Total exceeds budget
    const isNearLimit =
      remainingBudget > 0 && remainingBudget < projectBudget * 0.1; // Less than 10% remaining
    const isHealthy = remainingBudget >= projectBudget * 0.1;

    // 9. Quick category validation - check if adding it would exceed budget
    // IMPORTANT: Don't subtract spentBudget separately (already in existingAssignmentsTotal)
    const wouldQuickCategoryExceedBudget =
      quickCategoryAmount > 0 &&
      projectBudget -
        existingAssignmentsTotal -
        newAssignmentsTotal -
        quickCategoryAmount <
        0;

    return {
      projectBudget,
      spentBudget,
      existingAssignmentsTotal,
      newAssignmentsTotal,
      totalCumulativeAllocations,
      actuallyAvailable,
      remainingBudget,
      utilizationPercentage,
      isOverBudget,
      isNearLimit,
      isHealthy,
      wouldQuickCategoryExceedBudget,
      assignmentsCount: assignments.length + (quickCategoryAmount > 0 ? 1 : 0),
    };
  };

  const budgetStatus = calculateBudgetStatus();

  // Initialize assignments from existing data
  useEffect(() => {
    if (existingAssignments.length > 0) {
      // Validate that all assignments have valid contractor IDs
      const validAssignments = existingAssignments.filter((assignment) => {
        const hasValidContractorId =
          assignment.contractorId && assignment.contractorId.trim() !== "";
        return hasValidContractorId;
      });

      setAssignments(validAssignments);
    }
  }, [existingAssignments]);

  // CRITICAL: Enhanced Quick category form validation with budget control
  const isQuickCategoryValid =
    quickCategory.mainCategory.trim() &&
    quickCategory.subcategory.trim() &&
    (quickCategory.isPurchasing || quickCategory.contractorId.trim()) && // Either purchasing or contractor selected
    quickCategory.estimatedAmount.trim() &&
    Number(quickCategory.estimatedAmount) > 0 &&
    !budgetStatus.wouldQuickCategoryExceedBudget; // PREVENT if would exceed budget

  // Calculate total estimated amount
  const calculateTotalEstimated = () => {
    return assignments.reduce((total, assignment) => {
      const amount = Number(assignment.estimatedAmount || 0);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  // Add category assignment with CRITICAL budget validation
  const addCategoryAssignment = () => {
    // CRITICAL: Check if this assignment would exceed the total budget
    if (budgetStatus.wouldQuickCategoryExceedBudget) {
      const exceededAmount = Math.abs(
        budgetStatus.projectBudget -
          budgetStatus.spentBudget -
          budgetStatus.existingAssignmentsTotal -
          budgetStatus.newAssignmentsTotal -
          parseFloat(quickCategory.estimatedAmount)
      );

      addToast({
        title: "تجاوز الميزانية!",
        message: `هذا التعيين سيتجاوز الميزانية بمقدار ${exceededAmount.toLocaleString()} د.ع. المتاح فقط: ${budgetStatus.actuallyAvailable.toLocaleString()} د.ع`,
        type: "error",
      });
      return;
    }

    if (!isQuickCategoryValid) {
      addToast({
        title: "بيانات ناقصة",
        type: "error",
      });
      return;
    }

    // Check if contractor exists in the list (only if not purchasing)
    let selectedContractor = null;
    if (!quickCategory.isPurchasing) {
      selectedContractor = contractors.find(
        (c) => c.id === quickCategory.contractorId
      );
      if (!selectedContractor) {
        addToast({
          title: "مقاول غير صالح",
          type: "error",
        });
        return;
      }
    }

    // Check if category exists
    const selectedMainCategory = PROJECT_CATEGORIES.find(
      (cat) => cat.name === quickCategory.mainCategory
    );
    if (!selectedMainCategory) {
      addToast({
        title: "فئة غير صالحة",
        type: "error",
      });
      return;
    }

    // Check if subcategory exists
    const selectedSubcategory = selectedMainCategory.subcategories.find(
      (sub) => sub === quickCategory.subcategory
    );
    if (!selectedSubcategory) {
      addToast({
        title: "وصف غير صالح",
        type: "error",
      });
      return;
    }

    const estimatedAmount = Number(quickCategory.estimatedAmount);
    if (isNaN(estimatedAmount) || estimatedAmount <= 0) {
      addToast({
        title: "مبلغ غير صالح",
        type: "error",
      });
      return;
    }

    // Check for duplicate assignment (same category + subcategory + contractor/purchasing)
    // This prevents money calculation crashes by ensuring one contractor per subcategory
    const isDuplicateInModal = assignments.some(
      (assignment) =>
        assignment.mainCategory === quickCategory.mainCategory &&
        assignment.subcategory === quickCategory.subcategory &&
        ((quickCategory.isPurchasing && assignment.isPurchasing) ||
          (!quickCategory.isPurchasing &&
            !assignment.isPurchasing &&
            assignment.contractorId === quickCategory.contractorId))
    );

    if (isDuplicateInModal) {
      const duplicateMessage = quickCategory.isPurchasing
        ? "تعيين مشتريات موجود مسبقاً"
        : `${selectedContractor?.full_name} مُعيّن مسبقاً`;
      addToast({
        title: "تعيين مكرر",
        message: duplicateMessage,
        type: "warning",
      });
      return;
    }

    // Also check against existing assignments from database
    // FIXED: Allow both contractor AND purchasing assignments for same category/subcategory
    const isDuplicateInDatabase = existingAssignments.some((existing) => {
      const sameCategory =
        existing.mainCategory === quickCategory.mainCategory &&
        existing.subcategory === quickCategory.subcategory;
      const sameType = existing.isPurchasing === quickCategory.isPurchasing;
      const sameContractor =
        quickCategory.isPurchasing ||
        existing.contractorId === quickCategory.contractorId;

      return sameCategory && sameType && sameContractor;
    });

    if (isDuplicateInDatabase) {
      const message = quickCategory.isPurchasing
        ? "تعيين مشتريات موجود مسبقاً لهذه الفئة. استخدم زر التعديل لتحديث التعيين الموجود."
        : `المقاول ${selectedContractor?.full_name} مُعيّن مسبقاً لهذه الفئة. استخدم زر التعديل لتحديث التعيين الموجود.`;

      addToast({
        title: "تعيين مكرر",
        message: message,
        type: "error",
      });
      return;
    }

    // Ensure contractor ID is properly set (never empty string) - only for non-purchasing
    const contractorId = quickCategory.isPurchasing
      ? ""
      : quickCategory.contractorId?.trim();
    if (!quickCategory.isPurchasing && !contractorId) {
      addToast({
        title: "اختر مقاول",
        type: "error",
      });
      return;
    }

    const newAssignment: SimpleAssignmentFormData = {
      categoryId: selectedMainCategory.id,
      mainCategory: quickCategory.mainCategory,
      subcategory: quickCategory.subcategory,
      contractorId: contractorId,
      contractorName: quickCategory.isPurchasing
        ? "مشتريات"
        : selectedContractor?.full_name || "",
      estimatedAmount: quickCategory.estimatedAmount,
      notes: quickCategory.notes.trim() || undefined,
      isPurchasing: quickCategory.isPurchasing,
    };

    setAssignments([...assignments, newAssignment]);

    // Show success message
    const successMessage = quickCategory.isPurchasing
      ? `تم إضافة تعيين مشتريات ${quickCategory.mainCategory} - ${quickCategory.subcategory}`
      : `تم إضافة تعيين ${quickCategory.mainCategory} - ${quickCategory.subcategory} للمقاول ${selectedContractor?.full_name}`;

    addToast({
      title: "",
      message: successMessage,
      type: "success",
    });

    // Reset form
    setQuickCategory({
      mainCategory: "",
      subcategory: "",
      contractorId: "",
      contractorName: "",
      estimatedAmount: "",
      notes: "",
      isPurchasing: false,
    });
  };

  // Remove category assignment
  const removeCategoryAssignment = (index: number) => {
    const assignmentToDelete = assignments[index];
    if (window.confirm("هل أنت متأكد من حذف هذا التعيين؟")) {
      const updatedAssignments = assignments.filter((_, i) => i !== index);
      setAssignments(updatedAssignments);

      addToast({
        title: "تم حذف التعيين",
        message: `تم حذف تعيين ${assignmentToDelete.mainCategory} - ${assignmentToDelete.subcategory}`,
        type: "info",
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validate assignments - contractor assignments need contractor ID, purchasing assignments don't
    const invalidAssignments = assignments.filter(
      (a) =>
        !a.isPurchasing && (!a.contractorId || a.contractorId.trim() === "")
    );
    if (invalidAssignments.length > 0) {
      addToast({
        title: "بيانات غير صالحة",
        message: "يوجد تعيينات مقاولين بدون معرف مقاول صالح. يرجى المراجعة.",
        type: "error",
      });
      return;
    }

    // Budget validation - prevent saving if over budget
    if (budgetStatus.isOverBudget) {
      addToast({
        title: "تجاوز الميزانية",
        message: `لا يمكن حفظ التعيينات. التخصيصات تتجاوز الميزانية بمقدار ${Math.abs(
          budgetStatus.remainingBudget
        ).toLocaleString()} د.ع`,
        type: "error",
      });
      return;
    }

    // Show confirmation with details of what will be saved
    const totalAssignments = assignments.length;
    const totalAmount = assignments.reduce(
      (sum, a) => sum + (parseFloat(a.estimatedAmount) || 0),
      0
    );

    // Remove unnecessary confirmation toast - user has already clicked save button

    setSaving(true);

    try {
      let result: { success: boolean; error?: string };

      if (editingAssignmentId) {
        // EDIT MODE: Only send the edited assignment and preserve all others
        const editedAssignment = assignments.find(
          (a) => a.id === editingAssignmentId
        );
        if (!editedAssignment) {
          addToast({
            title: "التعيين غير موجود",
            type: "error",
          });
          return;
        }

        // Replace the edited assignment in the complete list
        const completeList = existingAssignments.map((existing) => {
          if (existing.id === editingAssignmentId) {
            return editedAssignment;
          }
          return existing;
        });

        console.log("🔄 EDIT MODE: Sending updated assignment");
        result = await onSave(completeList);
      } else {
        // ADD MODE: Only create NEW assignments, forbid duplicates
        console.log("➕ ADD MODE: Creating new assignments only");

        // Check for duplicates against existing assignments (frontend validation)
        // FIXED: Allow both contractor AND purchasing assignments for same category/subcategory
        for (const newAssignment of assignments) {
          const isDuplicate = existingAssignments.some(
            (existing) =>
              existing.mainCategory === newAssignment.mainCategory &&
              existing.subcategory === newAssignment.subcategory &&
              existing.isPurchasing === newAssignment.isPurchasing &&
              // Only check contractor match for contractor assignments
              (newAssignment.isPurchasing ||
                existing.contractorId === newAssignment.contractorId)
          );

          if (isDuplicate) {
            if (newAssignment.isPurchasing) {
              addToast({
                title: "تعيين مكرر",
                message: "تعيين مشتريات موجود مسبقاً لهذه الفئة",
                type: "error",
              });
            } else {
              const selectedContractor = contractors.find(
                (c) => c.id === newAssignment.contractorId
              );
              addToast({
                title: "تعيين مكرر",
                message: `${
                  selectedContractor?.full_name || newAssignment.contractorName
                } مُعيّن مسبقاً`,
                type: "error",
              });
            }
            return;
          }
        }

        // Send ONLY the new assignments
        result = await onSave(assignments);
      }

      // Handle the result
      if (result.success) {
        addToast({
          title: "تم الحفظ بنجاح",
          type: "success",
        });
        onClose();
      } else {
        // Handle business logic errors gracefully (no console errors)
        if (
          result.error?.includes("التعيين موجود مسبقاً") ||
          result.error?.includes("مُعيّن بالفعل")
        ) {
          addToast({
            title: "تعيين مكرر",
            message: "استخدم زر التعديل",
            type: "error",
          });
        } else {
          addToast({
            title: "فشل الحفظ",
            message: result.error || "حدث خطأ",
            type: "error",
          });
        }
      }
    } catch (error: any) {
      // This should only catch unexpected technical errors
      console.error("Unexpected technical error:", error);
      addToast({
        title: "خطأ تقني",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div
          className={`text-white p-6 rounded-t-2xl ${
            editingAssignmentId
              ? "bg-gradient-to-r from-amber-600 to-orange-700"
              : "bg-gradient-to-r from-blue-600 to-indigo-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                {editingAssignmentId ? (
                  <Settings className="h-6 w-6 no-flip" />
                ) : (
                  <Plus className="h-6 w-6 no-flip" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold arabic-spacing">
                  {editingAssignmentId
                    ? "تعديل تعيينات المشروع"
                    : "إدارة تعيينات المشروع"}
                </h2>
                <p
                  className={`arabic-spacing ${
                    editingAssignmentId ? "text-amber-100" : "text-blue-100"
                  }`}
                >
                  {editingAssignmentId
                    ? `تعديل ${assignments.length} تعيين للمشروع`
                    : "إضافة وتعديل فئات المشروع والمقاولين"}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="bg-transparent hover:bg-white/20 text-white p-2 rounded-lg"
            >
              <X className="h-6 w-6 no-flip" />
            </Button>
          </div>
        </div>

        {/* Budget Tracking Dashboard */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Calculator className="h-5 w-5 text-blue-600 no-flip" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 arabic-spacing">
              متتبع الميزانية المباشر
            </h3>
            {projectName && (
              <span className="text-sm text-gray-600 arabic-spacing">
                - {projectName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {/* Total Budget */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Target className="h-4 w-4 text-blue-600 no-flip" />
                <span className="text-sm font-medium text-gray-600 arabic-spacing">
                  الميزانية الإجمالية
                </span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {budgetStatus.projectBudget.toLocaleString()} د.ع
              </div>
            </div>

            {/* Spent Budget */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <TrendingUp className="h-4 w-4 text-red-600 no-flip" />
                <span className="text-sm font-medium text-gray-600 arabic-spacing">
                  المنفق فعلياً
                </span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {budgetStatus.spentBudget.toLocaleString()} د.ع
              </div>
            </div>

            {/* Existing Allocations */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Package className="h-4 w-4 text-purple-600 no-flip" />
                <span className="text-sm font-medium text-gray-600 arabic-spacing">
                  التخصيصات الحالية
                </span>
              </div>
              <div className="text-xl font-bold text-purple-600">
                {budgetStatus.existingAssignmentsTotal.toLocaleString()} د.ع
              </div>
              <div className="text-xs text-gray-500 mt-1">محفوظة مسبقاً</div>
            </div>

            {/* New Allocations */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Plus className="h-4 w-4 text-amber-600 no-flip" />
                <span className="text-sm font-medium text-gray-600 arabic-spacing">
                  التخصيصات الجديدة
                </span>
              </div>
              <div className="text-xl font-bold text-amber-600">
                {budgetStatus.newAssignmentsTotal.toLocaleString()} د.ع
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {budgetStatus.assignmentsCount} تعيين جديد
              </div>
            </div>

            {/* Remaining Budget */}
            <div
              className={`bg-white rounded-xl p-4 shadow-sm border ${
                budgetStatus.isOverBudget
                  ? "border-red-200 bg-red-50"
                  : budgetStatus.isNearLimit
                  ? "border-amber-200 bg-amber-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Wallet
                  className={`h-4 w-4 no-flip ${
                    budgetStatus.isOverBudget
                      ? "text-red-600"
                      : budgetStatus.isNearLimit
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                />
                <span className="text-sm font-medium text-gray-600 arabic-spacing">
                  المتبقي
                </span>
              </div>
              <div
                className={`text-xl font-bold ${
                  budgetStatus.isOverBudget
                    ? "text-red-600"
                    : budgetStatus.isNearLimit
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                {budgetStatus.remainingBudget.toLocaleString()} د.ع
              </div>
              {budgetStatus.isOverBudget && (
                <div className="text-xs text-red-600 mt-1 font-medium">
                  تجاوز الميزانية!
                </div>
              )}
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 arabic-spacing">
                استخدام الميزانية
              </span>
              <span
                className={`text-sm font-bold ${
                  budgetStatus.utilizationPercentage > 100
                    ? "text-red-600"
                    : budgetStatus.utilizationPercentage > 90
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                {budgetStatus.utilizationPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  budgetStatus.utilizationPercentage > 100
                    ? "bg-gradient-to-r from-red-500 to-red-600"
                    : budgetStatus.utilizationPercentage > 90
                    ? "bg-gradient-to-r from-amber-500 to-amber-600"
                    : "bg-gradient-to-r from-green-500 to-green-600"
                }`}
                style={{
                  width: `${Math.min(
                    budgetStatus.utilizationPercentage,
                    100
                  )}%`,
                }}
              />
              {budgetStatus.utilizationPercentage > 100 && (
                <div
                  className="h-3 bg-red-600 opacity-30 animate-pulse"
                  style={{
                    width: `${budgetStatus.utilizationPercentage - 100}%`,
                    marginTop: "-12px",
                  }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>
                منفق:{" "}
                {(
                  (budgetStatus.spentBudget / budgetStatus.projectBudget) *
                  100
                ).toFixed(1)}
                %
              </span>
              <span>
                مخصص حالي:{" "}
                {(
                  (budgetStatus.existingAssignmentsTotal /
                    budgetStatus.projectBudget) *
                  100
                ).toFixed(1)}
                %
              </span>
              <span>
                مخصص جديد:{" "}
                {(
                  (budgetStatus.newAssignmentsTotal /
                    budgetStatus.projectBudget) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>

          {/* Budget Alerts */}
          {(budgetStatus.isOverBudget || budgetStatus.isNearLimit) && (
            <div
              className={`mt-4 p-4 rounded-lg border-l-4 ${
                budgetStatus.isOverBudget
                  ? "bg-red-50 border-red-500"
                  : "bg-amber-50 border-amber-500"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <AlertCircle
                  className={`h-5 w-5 no-flip ${
                    budgetStatus.isOverBudget
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                />
                <div>
                  <h4
                    className={`font-bold arabic-spacing ${
                      budgetStatus.isOverBudget
                        ? "text-red-800"
                        : "text-amber-800"
                    }`}
                  >
                    {budgetStatus.isOverBudget
                      ? "تحذير: تجاوز الميزانية"
                      : "تنبيه: اقتراب من حد الميزانية"}
                  </h4>
                  <p
                    className={`text-sm arabic-spacing ${
                      budgetStatus.isOverBudget
                        ? "text-red-700"
                        : "text-amber-700"
                    }`}
                  >
                    {budgetStatus.isOverBudget
                      ? `التخصيصات الحالية تتجاوز الميزانية بمقدار ${Math.abs(
                          budgetStatus.remainingBudget
                        ).toLocaleString()} د.ع`
                      : `متبقي فقط ${budgetStatus.remainingBudget.toLocaleString()} د.ع من الميزانية`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Quick Add Form */}
            <Card className="p-6 h-fit sticky top-4">
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
                    <option value="">اختر الوصف/الأعمال</option>
                    {PROJECT_CATEGORIES.find(
                      (cat) => cat.name === quickCategory.mainCategory
                    )?.subcategories.map((sub, index) => (
                      <option key={index} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Assignment Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-3">
                    نوع التعيين *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Contractor Option */}
                    <div
                      onClick={() => {
                        setQuickCategory({
                          ...quickCategory,
                          isPurchasing: false,
                          contractorId: "",
                          contractorName: "",
                        });
                      }}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        !quickCategory.isPurchasing
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div
                          className={`p-2 rounded-lg ${
                            !quickCategory.isPurchasing
                              ? "bg-blue-100"
                              : "bg-gray-100"
                          }`}
                        >
                          <Users
                            className={`h-5 w-5 no-flip ${
                              !quickCategory.isPurchasing
                                ? "text-blue-600"
                                : "text-gray-500"
                            }`}
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold arabic-spacing">
                            مقاول
                          </h4>
                          <p className="text-sm opacity-75">
                            تعيين مقاول للعمل
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Purchasing Option */}
                    <div
                      onClick={() => {
                        setQuickCategory({
                          ...quickCategory,
                          isPurchasing: true,
                          contractorId: "",
                          contractorName: "",
                        });
                      }}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        quickCategory.isPurchasing
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div
                          className={`p-2 rounded-lg ${
                            quickCategory.isPurchasing
                              ? "bg-green-100"
                              : "bg-gray-100"
                          }`}
                        >
                          <ShoppingCart
                            className={`h-5 w-5 no-flip ${
                              quickCategory.isPurchasing
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold arabic-spacing">
                            مشتريات
                          </h4>
                          <p className="text-sm opacity-75">
                            شراء مواد أو معدات
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contractor Selection - Only shown when not purchasing */}
                {!quickCategory.isPurchasing && (
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
                      <option value="">اختر المقاول</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.full_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Estimated Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                    {quickCategory.isPurchasing
                      ? "مبلغ المشتريات (دينار عراقي) *"
                      : "المبلغ المقدر (دينار عراقي) *"}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={quickCategory.estimatedAmount}
                    onChange={(e) =>
                      setQuickCategory({
                        ...quickCategory,
                        estimatedAmount: e.target.value,
                      })
                    }
                    placeholder={
                      quickCategory.isPurchasing
                        ? "مبلغ المشتريات"
                        : "المبلغ المقدر"
                    }
                    className="h-12"
                  />
                  {quickCategory.estimatedAmount && (
                    <p className="text-green-600 text-sm font-medium mt-1">
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
                  <textarea
                    value={quickCategory.notes}
                    onChange={(e) =>
                      setQuickCategory({
                        ...quickCategory,
                        notes: e.target.value,
                      })
                    }
                    placeholder="أي ملاحظات إضافية..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none arabic-spacing"
                    rows={3}
                  />
                </div>

                {/* CRITICAL: Enhanced Add Button with Budget Warning */}
                <div className="space-y-2">
                  {/* Budget Warning for Quick Category */}
                  {budgetStatus.wouldQuickCategoryExceedBudget &&
                    quickCategory.estimatedAmount && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <AlertCircle className="h-4 w-4 text-red-600 no-flip" />
                          <div className="text-sm text-red-700 arabic-spacing">
                            <div className="font-semibold">
                              تحذير: تجاوز الميزانية!
                            </div>
                            <div className="text-xs mt-1">
                              المبلغ المطلوب:{" "}
                              {parseFloat(
                                quickCategory.estimatedAmount
                              ).toLocaleString()}{" "}
                              د.ع
                              <br />
                              المتاح فقط:{" "}
                              {Math.max(
                                0,
                                budgetStatus.actuallyAvailable -
                                  budgetStatus.newAssignmentsTotal
                              ).toLocaleString()}{" "}
                              د.ع
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  <Button
                    onClick={addCategoryAssignment}
                    disabled={
                      !isQuickCategoryValid ||
                      budgetStatus.wouldQuickCategoryExceedBudget
                    }
                    className={`w-full h-12 ${
                      budgetStatus.wouldQuickCategoryExceedBudget
                        ? "bg-red-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    } disabled:opacity-50`}
                  >
                    {budgetStatus.wouldQuickCategoryExceedBudget ? (
                      <>
                        <AlertCircle className="h-4 w-4 ml-2 no-flip" />
                        <span className="arabic-spacing">يتجاوز الميزانية</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 ml-2 no-flip" />
                        <span className="arabic-spacing">إضافة الفئة</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Right Side - Added Categories & Budget Summary */}
            <div className="space-y-6">
              {/* Budget Summary */}
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center space-x-3 space-x-reverse mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600 no-flip" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 arabic-spacing">
                    ملخص الميزانية
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600 arabic-spacing">
                      إجمالي كامل التخصيصات:
                    </span>
                    <span
                      className={`font-semibold ${
                        budgetStatus.isOverBudget
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {budgetStatus.totalCumulativeAllocations.toLocaleString(
                        "ar-IQ"
                      )}{" "}
                      د.ع
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600 arabic-spacing">
                      التعيينات الجديدة:
                    </span>
                    <span className="font-semibold text-amber-600">
                      {budgetStatus.newAssignmentsTotal.toLocaleString("ar-IQ")}{" "}
                      د.ع
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 arabic-spacing">
                      عدد التعيينات الجديدة:
                    </span>
                    <span className="font-semibold text-blue-600">
                      {assignments.length} تعيين
                    </span>
                  </div>
                  {budgetStatus.isOverBudget && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs text-red-700 arabic-spacing font-semibold">
                        ⚠️ تحذير: إجمالي التخصيصات يتجاوز الميزانية!
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Added Categories */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Package className="h-5 w-5 text-green-600 no-flip" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 arabic-spacing">
                      الفئات المضافة
                    </h3>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {assignments.length} فئة
                  </span>
                </div>

                {assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                      <Package className="h-8 w-8 text-gray-400 mx-auto" />
                    </div>
                    <p className="text-gray-500 arabic-spacing">
                      لم يتم إضافة أي فئات بعد
                    </p>
                    <p className="text-gray-400 arabic-spacing text-sm mt-1">
                      استخدم النموذج على اليسار لإضافة فئات
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {assignments.map((assignment, index) => {
                      const contractor = contractors.find(
                        (c) => c.id === assignment.contractorId
                      );
                      const IconComponent = assignment.isPurchasing
                        ? ShoppingCart
                        : categoryIcons[
                            assignment.categoryId as keyof typeof categoryIcons
                          ] || Package;

                      const isBeingEdited =
                        assignment.id === editingAssignmentId;

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 transition-all ${
                            isBeingEdited
                              ? "border-amber-300 bg-amber-50 shadow-md ring-2 ring-amber-200"
                              : "border-gray-200 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 space-x-reverse flex-1">
                              <div
                                className={`p-2 rounded-lg ${
                                  assignment.isPurchasing
                                    ? "bg-green-100"
                                    : "bg-blue-100"
                                }`}
                              >
                                <IconComponent
                                  className={`h-4 w-4 no-flip ${
                                    assignment.isPurchasing
                                      ? "text-green-600"
                                      : "text-blue-600"
                                  }`}
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 arabic-spacing">
                                  {assignment.mainCategory}
                                </h4>
                                <p className="text-gray-600 arabic-spacing text-sm">
                                  {assignment.subcategory}
                                </p>
                                <div className="flex items-center space-x-4 space-x-reverse mt-2 text-sm">
                                  {assignment.isPurchasing ? (
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                      <ShoppingCart className="h-4 w-4 text-green-600 no-flip" />
                                      <span className="text-gray-600">
                                        نوع التعيين:{" "}
                                        <span className="font-medium text-green-600">
                                          مشتريات
                                        </span>
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-600">
                                      المقاول:{" "}
                                      <span className="font-medium text-gray-900">
                                        {contractor?.full_name ||
                                          assignment.contractorName ||
                                          "غير محدد"}
                                      </span>
                                    </span>
                                  )}
                                  <span className="text-gray-600">
                                    المبلغ:{" "}
                                    <span className="font-medium text-green-600">
                                      {Number(
                                        assignment.estimatedAmount || 0
                                      ).toLocaleString("ar-IQ")}{" "}
                                      د.ع
                                    </span>
                                  </span>
                                </div>
                                {assignment.notes && (
                                  <p className="text-gray-500 text-sm mt-1 arabic-spacing">
                                    {assignment.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              {isBeingEdited && (
                                <div className="flex items-center space-x-1 space-x-reverse bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                                  <Settings className="h-3 w-3 no-flip" />
                                  <span>قيد التعديل</span>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeCategoryAssignment(index)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                title="حذف التعيين"
                              >
                                <Trash2 className="h-4 w-4 no-flip" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
              <AlertCircle className="h-4 w-4 no-flip" />
              <span className="text-sm arabic-spacing">
                {assignments.length === 0
                  ? "لم يتم إضافة أي تعيينات"
                  : `${
                      assignments.length
                    } تعيين جديد (${budgetStatus.newAssignmentsTotal.toLocaleString(
                      "ar-IQ"
                    )} د.ع) | إجمالي كامل: ${budgetStatus.totalCumulativeAllocations.toLocaleString(
                      "ar-IQ"
                    )} د.ع`}
              </span>
            </div>

            <div className="flex space-x-3 space-x-reverse">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                إلغاء
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || budgetStatus.isOverBudget}
                className={`${
                  budgetStatus.isOverBudget
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="arabic-spacing">جاري الحفظ...</span>
                  </div>
                ) : budgetStatus.isOverBudget ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <AlertCircle className="h-4 w-4 no-flip" />
                    <span className="arabic-spacing">تجاوز الميزانية</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Save className="h-4 w-4 no-flip" />
                    <span className="arabic-spacing">حفظ التعيينات</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
