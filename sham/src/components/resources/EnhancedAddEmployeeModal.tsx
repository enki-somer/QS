"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  User,
  Phone,
  Calendar,
  DollarSign,
  Building2,
  Hash,
  AlertCircle,
  Loader2,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Employee, Position } from "@/types";
import { useToast } from "@/components/ui/Toast";

interface EnhancedAddEmployeeModalProps {
  employee?: Employee | null; // For editing
  positions: Position[];
  projects: any[]; // Projects for dropdown
  onClose: () => void;
  onSave: (employeeData: {
    name: string;
    mobile_number?: string;
    age?: number;
    position?: string;
    monthly_salary?: number;
    status: "active" | "inactive" | "terminated";
    department?: string;
    assigned_project_id?: string;
    notes?: string;
  }) => Promise<void>;
}

export function EnhancedAddEmployeeModal({
  employee,
  positions,
  projects,
  onClose,
  onSave,
}: EnhancedAddEmployeeModalProps) {
  const { addToast } = useToast();

  // Debug: Log projects data
  console.log(
    "🏗️ Projects passed to modal:",
    projects?.length || 0,
    "projects"
  );
  console.log("📋 Projects data:", projects);

  // Format salary for display (add commas)
  const formatSalaryForInput = (salary: number): string => {
    return salary.toLocaleString("en-US");
  };

  // Parse salary from input (remove commas)
  const parseSalaryFromInput = (salaryStr: string): number => {
    return parseInt(salaryStr.replace(/,/g, "")) || 0;
  };

  const [formData, setFormData] = useState({
    name: employee?.name || "",
    mobile_number: employee?.mobile_number || "",
    age: employee?.age || "",
    position: employee?.position || "",
    monthly_salary: employee?.monthly_salary
      ? formatSalaryForInput(employee.monthly_salary)
      : "",
    status: employee?.status || ("active" as const),
    department: employee?.department || "",
    assigned_project_id: employee?.assigned_project_id || "",
    notes: employee?.notes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = "اسم الموظف مطلوب";
    }

    if (!formData.position) {
      newErrors.position = "المنصب الوظيفي مطلوب";
    }

    if (!formData.monthly_salary.trim()) {
      newErrors.monthly_salary = "الراتب الشهري مطلوب";
    }

    // Optional validations
    if (
      formData.mobile_number &&
      !/^[0-9+\-\s()]+$/.test(formData.mobile_number)
    ) {
      newErrors.mobile_number = "رقم الهاتف غير صحيح";
    }

    if (
      formData.age &&
      (Number(formData.age) < 16 || Number(formData.age) > 70)
    ) {
      newErrors.age = "العمر يجب أن يكون بين 16 و 70 سنة";
    }

    if (
      formData.monthly_salary &&
      parseSalaryFromInput(formData.monthly_salary) < 0
    ) {
      newErrors.monthly_salary = "الراتب الشهري لا يمكن أن يكون سالباً";
    }

    if (
      formData.monthly_salary &&
      parseSalaryFromInput(formData.monthly_salary) < 100000
    ) {
      newErrors.monthly_salary =
        "الراتب الشهري يجب أن يكون أكثر من 100,000 دينار عراقي";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast({
        type: "error",
        title: "خطأ في البيانات",
        message: "يرجى تصحيح الأخطاء المعروضة",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        name: formData.name.trim(),
        mobile_number: formData.mobile_number.trim() || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        position: formData.position || undefined,
        monthly_salary: formData.monthly_salary
          ? parseSalaryFromInput(formData.monthly_salary)
          : undefined,
        status: formData.status,
        department: formData.department.trim() || undefined,
        assigned_project_id: formData.assigned_project_id || undefined,
        notes: formData.notes.trim() || undefined,
      });
    } catch (error) {
      console.error("Error saving employee:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Special handling for salary formatting
    if (field === "monthly_salary") {
      // Remove any non-digit characters except commas
      const cleanValue = value.replace(/[^0-9]/g, "");
      // Add commas for thousands
      const formattedValue = cleanValue
        ? parseInt(cleanValue).toLocaleString("en-US")
        : "";
      setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <User className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-xl font-bold arabic-spacing">
                  {employee ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
                </h2>
                <p className="text-blue-100 text-sm arabic-spacing">
                  {employee
                    ? `تعديل بيانات ${employee.name}`
                    : "أدخل بيانات الموظف الجديد"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-5 w-5 no-flip" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <User className="h-5 w-5 ml-2 text-blue-600 no-flip" />
              البيانات الأساسية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  اسم الموظف *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="أدخل اسم الموظف الكامل"
                  className={`arabic-spacing ${
                    errors.name ? "border-red-500" : ""
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1 arabic-spacing flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1 no-flip" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  رقم الهاتف
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 no-flip" />
                  <Input
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) =>
                      handleInputChange("mobile_number", e.target.value)
                    }
                    placeholder="05xxxxxxxx"
                    className={`pr-10 ${
                      errors.mobile_number ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {errors.mobile_number && (
                  <p className="text-red-500 text-sm mt-1 arabic-spacing flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1 no-flip" />
                    {errors.mobile_number}
                  </p>
                )}
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  العمر
                </label>
                <div className="relative">
                  <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 no-flip" />
                  <Input
                    type="number"
                    min="16"
                    max="70"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="25"
                    className={`pr-10 ${errors.age ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.age && (
                  <p className="text-red-500 text-sm mt-1 arabic-spacing flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1 no-flip" />
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  المنصب الوظيفي *
                </label>
                <Select
                  value={formData.position}
                  onChange={(e) =>
                    handleInputChange("position", e.target.value)
                  }
                  className={`arabic-spacing ${
                    errors.position ? "border-red-500" : ""
                  }`}
                >
                  <option value="">اختر المنصب</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.position_name}>
                      {position.position_name_ar}
                    </option>
                  ))}
                </Select>
                {errors.position && (
                  <p className="text-red-500 text-sm mt-1 arabic-spacing flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1 no-flip" />
                    {errors.position}
                  </p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  القسم
                </label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 no-flip" />
                  <Input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      handleInputChange("department", e.target.value)
                    }
                    placeholder="مثال: الهندسة، المحاسبة"
                    className="pr-10 arabic-spacing"
                  />
                </div>
              </div>

              {/* Project Assignment */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  المشروع المرتبط (اختياري - للمرجع فقط)
                </label>
                <Select
                  value={formData.assigned_project_id}
                  onChange={(e) =>
                    handleInputChange("assigned_project_id", e.target.value)
                  }
                  className="arabic-spacing"
                >
                  <option value="">لا يوجد مشروع محدد</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Contact & Salary Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <Banknote className="h-5 w-5 ml-2 text-green-600 no-flip" />
              معلومات الراتب والحالة
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Salary */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  الراتب الشهري *
                  <span className="text-xs text-gray-500 mr-2">
                    (دينار عراقي)
                  </span>
                </label>
                <div className="relative">
                  <Banknote className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-600 no-flip" />
                  <Input
                    type="text"
                    value={formData.monthly_salary}
                    onChange={(e) =>
                      handleInputChange("monthly_salary", e.target.value)
                    }
                    placeholder="1,500,000"
                    className={`pr-12 text-lg font-semibold text-green-700 bg-green-50 border-green-200 focus:border-green-400 focus:ring-green-400 ${
                      errors.monthly_salary ? "border-red-500 bg-red-50" : ""
                    }`}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-green-600">
                    د.ع
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 arabic-spacing">
                  سيتم تنسيق الرقم تلقائياً (مثال: 1,500,000)
                </p>
                {errors.monthly_salary && (
                  <p className="text-red-500 text-sm mt-1 arabic-spacing flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1 no-flip" />
                    {errors.monthly_salary}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  حالة الموظف
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="arabic-spacing"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="terminated">منتهي الخدمة</option>
                </Select>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="أي ملاحظات إضافية حول الموظف..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none arabic-spacing"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin no-flip" />
                  <span className="arabic-spacing">جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">
                    {employee ? "تحديث البيانات" : "إضافة الموظف"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
