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
  });

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

  // Quick category form validation
  const isQuickCategoryValid =
    quickCategory.mainCategory.trim() &&
    quickCategory.subcategory.trim() &&
    quickCategory.contractorId.trim() &&
    quickCategory.estimatedAmount.trim() &&
    Number(quickCategory.estimatedAmount) > 0;

  // Calculate total estimated amount
  const calculateTotalEstimated = () => {
    return assignments.reduce((total, assignment) => {
      const amount = Number(assignment.estimatedAmount || 0);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  // Add category assignment
  const addCategoryAssignment = () => {
    if (!isQuickCategoryValid) {
      addToast({
        title: "بيانات ناقصة",
        type: "error",
      });
      return;
    }

    // Check if contractor exists in the list
    const selectedContractor = contractors.find(
      (c) => c.id === quickCategory.contractorId
    );
    if (!selectedContractor) {
      addToast({
        title: "مقاول غير صالح",
        type: "error",
      });
      return;
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

    // Check for duplicate assignment (same category + subcategory + contractor)
    // This prevents money calculation crashes by ensuring one contractor per subcategory
    const isDuplicateInModal = assignments.some(
      (assignment) =>
        assignment.mainCategory === quickCategory.mainCategory &&
        assignment.subcategory === quickCategory.subcategory &&
        assignment.contractorId === quickCategory.contractorId
    );

    if (isDuplicateInModal) {
      addToast({
        title: "تعيين مكرر",
        message: `${selectedContractor.full_name} مُعيّن مسبقاً`,
        type: "warning",
      });
      return;
    }

    // Also check against existing assignments from database
    const isDuplicateInDatabase = existingAssignments.some(
      (existing) =>
        existing.mainCategory === quickCategory.mainCategory &&
        existing.subcategory === quickCategory.subcategory &&
        existing.contractorId === quickCategory.contractorId
    );

    if (isDuplicateInDatabase) {
      addToast({
        title: "تعيين موجود",
        message: "استخدم زر التعديل",
        type: "error",
      });
      return;
    }

    // Ensure contractor ID is properly set (never empty string)
    const contractorId = quickCategory.contractorId?.trim();
    if (!contractorId) {
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
      contractorName: selectedContractor.full_name,
      estimatedAmount: quickCategory.estimatedAmount,
      notes: quickCategory.notes.trim() || undefined,
    };

    setAssignments([...assignments, newAssignment]);

    // Show success message
    addToast({
      title: "",
      message: `تم إضافة تعيين ${quickCategory.mainCategory} - ${quickCategory.subcategory} للمقاول ${selectedContractor.full_name}`,
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
    // Validate all assignments have contractor IDs
    const invalidAssignments = assignments.filter(
      (a) => !a.contractorId || a.contractorId.trim() === ""
    );
    if (invalidAssignments.length > 0) {
      addToast({
        title: "بيانات غير صالحة",
        message: "يوجد تعيينات بدون معرف مقاول صالح. يرجى المراجعة.",
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
        for (const newAssignment of assignments) {
          const isDuplicate = existingAssignments.some(
            (existing) =>
              existing.mainCategory === newAssignment.mainCategory &&
              existing.subcategory === newAssignment.subcategory &&
              existing.contractorId === newAssignment.contractorId
          );

          if (isDuplicate) {
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
                    <option value="">اختر المقاول</option>
                    {contractors.map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.full_name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Estimated Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                    المبلغ المقدر (دينار عراقي) *
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
                    placeholder="المبلغ المقدر"
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

                {/* Add Button */}
                <Button
                  onClick={addCategoryAssignment}
                  disabled={!isQuickCategoryValid}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 h-12"
                >
                  <Plus className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">إضافة الفئة</span>
                </Button>
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
                      إجمالي التعيينات:
                    </span>
                    <span className="font-semibold text-green-600">
                      {calculateTotalEstimated().toLocaleString("ar-IQ")} د.ع
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 arabic-spacing">
                      عدد التعيينات:
                    </span>
                    <span className="font-semibold text-blue-600">
                      {assignments.length} تعيين
                    </span>
                  </div>
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
                      const IconComponent =
                        categoryIcons[
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
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <IconComponent className="h-4 w-4 text-blue-600 no-flip" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 arabic-spacing">
                                  {assignment.mainCategory}
                                </h4>
                                <p className="text-gray-600 arabic-spacing text-sm">
                                  {assignment.subcategory}
                                </p>
                                <div className="flex items-center space-x-4 space-x-reverse mt-2 text-sm">
                                  <span className="text-gray-600">
                                    المقاول:{" "}
                                    <span className="font-medium text-gray-900">
                                      {contractor?.full_name ||
                                        assignment.contractorName ||
                                        "غير محدد"}
                                    </span>
                                  </span>
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
                  : `تم إضافة ${
                      assignments.length
                    } تعيين بإجمالي ${calculateTotalEstimated().toLocaleString(
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
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="arabic-spacing">جاري الحفظ...</span>
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
