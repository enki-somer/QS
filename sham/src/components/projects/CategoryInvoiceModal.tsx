import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Save,
  FileText,
  Plus,
  Minus,
  Calendar,
  User,
  Building2,
  Calculator,
  AlertCircle,
  CheckCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
// Removed Select import - using native select element
import { formatCurrency, generateId } from "@/lib/utils";
import { Project, ProjectCategoryAssignment } from "@/types";

interface CategoryInvoiceData {
  invoiceNumber: string;
  date: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  contractorId: string;
  contractorName: string;
  categoryAssignmentId: string; // Backend expects this field name
  workDescription: string; // e.g., "اسمنت - 15 طن"
  amount: number;
  notes?: string;
}

interface CategoryInvoiceModalProps {
  isOpen: boolean;
  project?: Project | null;
  category: any;
  assignmentData: ProjectCategoryAssignment[];
  onClose: () => void;
  onSubmit: (invoiceData: CategoryInvoiceData) => void;
}

export default function CategoryInvoiceModal({
  isOpen,
  project,
  category,
  assignmentData,
  onClose,
  onSubmit,
}: CategoryInvoiceModalProps) {
  const [invoiceForm, setInvoiceForm] = useState<CategoryInvoiceData>({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: category?.id || "",
    categoryName: category?.name || "",
    subcategoryName: "",
    contractorId: "",
    contractorName: "",
    categoryAssignmentId: "",
    workDescription: "",
    amount: 0,
    notes: "",
  });

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] =
    useState<ProjectCategoryAssignment | null>(null);
  const [availableContractors, setAvailableContractors] = useState<
    ProjectCategoryAssignment[]
  >([]);

  // Generate unique invoice number when modal opens
  useEffect(() => {
    if (isOpen && project) {
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
  }, [isOpen, project, category]);

  // Get unique subcategories from assignment data (memoized to prevent infinite loop)
  const subcategories = useMemo(() => {
    const uniqueSubcategories = [
      ...new Set(assignmentData.map((a) => a.subcategory)),
    ];
    console.log("Available subcategories:", uniqueSubcategories);
    return uniqueSubcategories;
  }, [assignmentData]);

  // Handle subcategory selection
  const handleSubcategoryChange = (subcategory: string) => {
    console.log("Subcategory selected:", subcategory);
    setSelectedSubcategory(subcategory);

    if (!subcategory) {
      setAvailableContractors([]);
      setSelectedAssignment(null);
      setInvoiceForm((prev) => ({
        ...prev,
        subcategoryName: "",
        contractorId: "",
        contractorName: "",
        categoryAssignmentId: "",
        workDescription: "",
        amount: 0,
      }));
      return;
    }

    // Get contractors for this subcategory
    const contractorsForSubcategory = assignmentData.filter(
      (a) => a.subcategory === subcategory
    );
    setAvailableContractors(contractorsForSubcategory);

    setInvoiceForm((prev) => ({
      ...prev,
      subcategoryName: subcategory,
      contractorId: "",
      contractorName: "",
      assignmentId: "",
      workDescription: "",
      amount: 0,
    }));

    console.log("Contractors for subcategory:", contractorsForSubcategory);
  };

  // Handle contractor selection
  const handleContractorChange = (assignmentId: string) => {
    console.log("Contractor assignment selected:", assignmentId);

    if (!assignmentId) {
      setSelectedAssignment(null);
      setInvoiceForm((prev) => ({
        ...prev,
        contractorId: "",
        contractorName: "",
        categoryAssignmentId: "",
        workDescription: "",
        amount: 0,
      }));
      return;
    }

    const assignment = availableContractors.find((a) => a.id === assignmentId);
    console.log("Found contractor assignment:", assignment);

    if (assignment) {
      setSelectedAssignment(assignment);
      setInvoiceForm((prev) => ({
        ...prev,
        categoryAssignmentId: assignment.id,
        contractorId: assignment.contractor_id || "",
        contractorName: assignment.contractorName,
        workDescription: "", // User will fill this
        amount: 0, // User will specify exact amount
      }));
      console.log("Updated form with contractor data");
    }
  };

  const handleInputChange = (
    field: keyof CategoryInvoiceData,
    value: string | number
  ) => {
    setInvoiceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!selectedAssignment) {
      alert("يرجى اختيار تعيين المقاول");
      return;
    }

    if (!invoiceForm.workDescription.trim()) {
      alert("يرجى إدخال وصف العمل");
      return;
    }

    if (!invoiceForm.amount || invoiceForm.amount <= 0) {
      alert("يرجى إدخال مبلغ صحيح");
      return;
    }

    // Map frontend field names to backend expected names
    const backendInvoiceData = {
      ...invoiceForm,
      description: invoiceForm.workDescription, // Backend expects 'description'
    };

    console.log("Invoice data being submitted:", backendInvoiceData);
    onSubmit(backendInvoiceData);
  };

  const isFormValid = () => {
    return (
      selectedSubcategory &&
      selectedAssignment &&
      invoiceForm.workDescription.trim() !== "" &&
      invoiceForm.amount > 0
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
              <div className="bg-white/20 p-2 sm:p-3 rounded-xl">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold arabic-spacing">
                  فاتورة فئة مخصصة
                </h2>
                <p className="text-green-100 arabic-spacing text-sm sm:text-base">
                  {category?.name} - {project?.name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0 text-white hover:bg-white/20 touch-manipulation"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-160px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column: Selection Steps */}
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-4 border">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 arabic-spacing flex items-center">
                  <Building2 className="h-5 w-5 ml-2 text-gray-600 no-flip" />
                  معلومات الفاتورة
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 arabic-spacing">
                      رقم الفاتورة
                    </label>
                    <Input
                      value={invoiceForm.invoiceNumber}
                      readOnly
                      className="bg-gray-100 text-gray-700 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 arabic-spacing">
                      تاريخ الفاتورة
                    </label>
                    <Input
                      type="date"
                      value={invoiceForm.date}
                      onChange={(e) =>
                        handleInputChange("date", e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Step 1: Subcategory Selection */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3 arabic-spacing flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm ml-2">
                    1
                  </span>
                  اختيار البند الفرعي
                </h3>

                <div>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  >
                    <option value="">-- اختر البند الفرعي --</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Contractor Selection */}
              {selectedSubcategory && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-3 arabic-spacing flex items-center">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm ml-2">
                      2
                    </span>
                    اختيار المقاول
                  </h3>

                  <div>
                    <select
                      value={invoiceForm.categoryAssignmentId}
                      onChange={(e) => handleContractorChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
                    >
                      <option value="">-- اختر المقاول --</option>
                      {availableContractors.map((assignment) => (
                        <option key={assignment.id} value={assignment.id}>
                          {assignment.contractorName} - (
                          {formatCurrency(assignment.estimated_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Details & Work Input */}
            <div className="space-y-4">
              {/* Contractor Details */}
              {selectedAssignment && (
                <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                  <h4 className="font-semibold text-green-700 mb-3 arabic-spacing">
                    ✓ المقاول المختار
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 arabic-spacing block">
                        المقاول:
                      </span>
                      <span className="font-medium">
                        {selectedAssignment.contractorName}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 arabic-spacing block">
                        البند:
                      </span>
                      <span className="font-medium">
                        {selectedAssignment.subcategory}
                      </span>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <span className="text-gray-600 arabic-spacing block">
                        الميزانية:
                      </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(selectedAssignment.estimated_amount)}
                      </span>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <span className="text-gray-600 arabic-spacing block">
                        المستخدم:
                      </span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(selectedAssignment.actual_amount || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-center">
                    <span className="text-gray-600 arabic-spacing text-sm">
                      المتبقي:{" "}
                    </span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(
                        (selectedAssignment.estimated_amount || 0) -
                          (selectedAssignment.actual_amount || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Step 3: Work Details */}
              {selectedAssignment && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-3 arabic-spacing flex items-center">
                    <span className="bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm ml-2">
                      3
                    </span>
                    تفاصيل العمل والمبلغ
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 arabic-spacing">
                        وصف العمل المحدد
                      </label>
                      <Input
                        value={invoiceForm.workDescription}
                        onChange={(e) =>
                          handleInputChange("workDescription", e.target.value)
                        }
                        placeholder="مثال: اسمنت - 15 طن"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 arabic-spacing">
                        المبلغ المطلوب
                      </label>
                      <Input
                        type="number"
                        value={invoiceForm.amount}
                        onChange={(e) =>
                          handleInputChange(
                            "amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="أدخل المبلغ"
                        className="text-lg font-semibold"
                      />
                      {/* Budget Summary */}
                      <div className="mt-2 p-2 bg-white rounded border text-xs">
                        <div className="flex justify-between">
                          <span>المتبقي:</span>
                          <span
                            className={`font-bold ${
                              (selectedAssignment.estimated_amount || 0) -
                                (selectedAssignment.actual_amount || 0) -
                                invoiceForm.amount >=
                              0
                                ? "text-blue-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(
                              (selectedAssignment.estimated_amount || 0) -
                                (selectedAssignment.actual_amount || 0) -
                                invoiceForm.amount
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 arabic-spacing">
                        ملاحظات
                      </label>
                      <textarea
                        value={invoiceForm.notes}
                        onChange={(e) =>
                          handleInputChange("notes", e.target.value)
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                        placeholder="ملاحظات إضافية..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full Width Warning */}
          <div className="mt-6">
            {/* Warning Notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="flex items-start space-x-3 space-x-reverse">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 no-flip" />
                <div className="text-xs">
                  <p className="font-medium text-orange-800 arabic-spacing mb-1">
                    تنبيه مهم:
                  </p>
                  <p className="text-orange-700 arabic-spacing">
                    بعد إنشاء هذه الفاتورة وموافقة الإدارة عليها، لن يمكن تعديل
                    بيانات هذا التعيين لضمان سلامة النظام المالي.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-3 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-sm text-gray-600 arabic-spacing order-2 sm:order-1">
            {selectedAssignment ? (
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 ml-1 no-flip" />
                جاهز للإرسال
              </span>
            ) : (
              <span className="flex items-center">
                <Package className="h-4 w-4 text-gray-400 ml-1 no-flip" />
                اختر التعيين أولاً
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 space-x-reverse w-full sm:w-auto order-1 sm:order-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 touch-manipulation"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 px-6 py-3 touch-manipulation"
            >
              <Save className="h-4 w-4 ml-1 no-flip" />
              إنشاء الفاتورة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
