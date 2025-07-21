import React, { useState } from "react";
import {
  X,
  Save,
  User,
  Building2,
  DollarSign,
  Calendar,
  Award,
  Clock,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Employee } from "@/types";
import { generateEmployeeId, formatCurrency } from "@/lib/utils";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";

interface AddEmployeeModalProps {
  onClose: () => void;
  onSave: (employee: Employee) => void;
}

export function AddEmployeeModal({ onClose, onSave }: AddEmployeeModalProps) {
  const { safeState, hasBalance } = useSafe();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Partial<Employee>>({
    status: "active",
    joinDate: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState<"basic" | "salary">(
    "basic"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateMonthlySalary = (data: Partial<Employee>) => {
    const baseSalary = Number(data.baseSalary) || 0;
    const dailyBonus = (Number(data.dailyBonus) || 0) * 22; // 22 working days
    const overtime = (Number(data.overtimePay) || 0) * 10; // 10 hours
    const deductions = Number(data.deductions) || 0;
    return baseSalary + dailyBonus + overtime - deductions;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "اسم الموظف مطلوب";
    }

    if (!formData.role?.trim()) {
      newErrors.role = "المنصب الوظيفي مطلوب";
    }

    if (!formData.baseSalary || formData.baseSalary <= 0) {
      newErrors.baseSalary = "الراتب الأساسي يجب أن يكون أكبر من صفر";
    }

    if (!formData.joinDate) {
      newErrors.joinDate = "تاريخ الانضمام مطلوب";
    }

    // Validate salary can be paid from safe
    const monthlySalary = calculateMonthlySalary(formData);
    if (!hasBalance(monthlySalary)) {
      newErrors.baseSalary = `الراتب الشهري (${formatCurrency(
        monthlySalary
      )}) أكبر من رصيد الخزينة (${formatCurrency(safeState.currentBalance)})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      if (currentSection === "basic" && errors.baseSalary) {
        setCurrentSection("salary");
      }
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date().toISOString();
      const newEmployee: Employee = {
        id: generateEmployeeId(),
        name: formData.name!,
        role: formData.role!,
        status: formData.status as "active" | "inactive",
        baseSalary: Number(formData.baseSalary!),
        joinDate: formData.joinDate!,
        dailyBonus: formData.dailyBonus
          ? Number(formData.dailyBonus)
          : undefined,
        overtimePay: formData.overtimePay
          ? Number(formData.overtimePay)
          : undefined,
        deductions: formData.deductions
          ? Number(formData.deductions)
          : undefined,
        assignedProjectId: formData.assignedProjectId,
        createdAt: now,
        updatedAt: now,
      };

      onSave(newEmployee);
      addToast({
        type: "success",
        title: "تمت إضافة الموظف",
        message: `تم إضافة ${newEmployee.name} بنجاح إلى قائمة الموظفين`,
      });
      onClose();
    } catch (error) {
      addToast({
        type: "error",
        title: "خطأ في إضافة الموظف",
        message: "حدث خطأ أثناء إضافة الموظف. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-gray-900/20 backdrop-blur-[2px]">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl transform transition-all duration-300"
        style={{ maxHeight: "90vh" }}
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                <User className="h-6 w-6 text-white no-flip" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 arabic-spacing">
                  إضافة موظف جديد
                </h3>
                <p className="text-gray-500 arabic-spacing text-sm mt-1">
                  أدخل معلومات الموظف وتفاصيل الراتب
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4 text-gray-500 no-flip" />
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-6 space-x-reverse mt-8">
            <button
              type="button"
              onClick={() => setCurrentSection("basic")}
              className={`relative pb-2 transition-colors duration-200 ${
                currentSection === "basic"
                  ? "text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <User className="h-4 w-4 no-flip" />
                <span className="arabic-spacing">المعلومات الأساسية</span>
              </div>
              {currentSection === "basic" && (
                <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setCurrentSection("salary")}
              className={`relative pb-2 transition-colors duration-200 ${
                currentSection === "salary"
                  ? "text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <DollarSign className="h-4 w-4 no-flip" />
                <span className="arabic-spacing">تفاصيل الراتب</span>
              </div>
              {currentSection === "salary" && (
                <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-8 py-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {currentSection === "basic" ? (
              <div className="space-y-5">
                {/* Basic Information Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="اسم الموظف"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    error={errors.name}
                    placeholder="الاسم الكامل للموظف"
                  />

                  <Input
                    label="المنصب الوظيفي"
                    value={formData.role || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    error={errors.role}
                    placeholder="مثال: مهندس برمجيات"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Select
                    label="حالة الموظف"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </Select>

                  <Input
                    type="date"
                    label="تاريخ الانضمام"
                    value={formData.joinDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, joinDate: e.target.value })
                    }
                    error={errors.joinDate}
                  />
                </div>

                <Input
                  label="رقم المشروع المخصص (اختياري)"
                  value={formData.assignedProjectId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assignedProjectId: e.target.value,
                    })
                  }
                  placeholder="أدخل رقم المشروع إذا كان الموظف مخصصاً لمشروع محدد"
                  helperText="اترك هذا الحقل فارغاً إذا لم يكن الموظف مخصصاً لمشروع محدد"
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Salary Information Form */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
                  <div className="flex items-center space-x-3 space-x-reverse mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-700 no-flip" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 arabic-spacing">
                        الراتب الأساسي
                      </h4>
                      <p className="text-sm text-blue-700 arabic-spacing mt-0.5">
                        يتم احتساب الراتب الشهري بناءً على هذا المبلغ
                      </p>
                    </div>
                  </div>

                  <Input
                    type="number"
                    step="1"
                    min="0"
                    label="الراتب الأساسي"
                    value={formData.baseSalary || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseSalary: parseInt(e.target.value) || 0,
                      })
                    }
                    error={errors.baseSalary}
                    placeholder="أدخل الراتب الأساسي"
                    className="bg-white"
                  />
                </div>

                <div className="bg-green-50/50 border border-green-100 rounded-xl p-6">
                  <div className="flex items-center space-x-3 space-x-reverse mb-6">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Award className="h-5 w-5 text-green-700 no-flip" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 arabic-spacing">
                        العلاوات والمكافآت
                      </h4>
                      <p className="text-sm text-green-700 arabic-spacing mt-0.5">
                        إضافات اختيارية على الراتب الأساسي
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      label="العلاوة اليومية"
                      value={formData.dailyBonus || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dailyBonus: parseInt(e.target.value) || 0,
                        })
                      }
                      helperText="يتم احتساب 22 يوم في الشهر"
                      placeholder="أدخل قيمة العلاوة اليومية"
                      className="bg-white"
                    />

                    <Input
                      type="number"
                      step="1"
                      min="0"
                      label="أجر الساعة الإضافية"
                      value={formData.overtimePay || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overtimePay: parseInt(e.target.value) || 0,
                        })
                      }
                      helperText="يتم احتساب 10 ساعات في الشهر"
                      placeholder="أدخل أجر الساعة الإضافية"
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="bg-red-50/50 border border-red-100 rounded-xl p-6">
                  <div className="flex items-center space-x-3 space-x-reverse mb-6">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Wallet className="h-5 w-5 text-red-700 no-flip" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-900 arabic-spacing">
                        الخصومات
                      </h4>
                      <p className="text-sm text-red-700 arabic-spacing mt-0.5">
                        خصومات ثابتة من الراتب الشهري
                      </p>
                    </div>
                  </div>

                  <Input
                    type="number"
                    step="1"
                    min="0"
                    label="الخصومات"
                    value={formData.deductions || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deductions: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="أدخل قيمة الخصومات إن وجدت"
                    className="bg-white"
                  />
                </div>

                {/* Salary Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 arabic-spacing">
                      ملخص الراتب الشهري
                    </h4>
                    <div className="bg-blue-100 text-blue-800 text-xs rounded-lg px-2.5 py-1 arabic-spacing">
                      يتم الدفع شهرياً
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700 arabic-spacing">
                      <span className="font-medium">ملاحظة:</span> لن يتم خصم
                      الراتب من الخزينة الآن. سيتم الخصم عند الضغط على زر "دفع
                      راتب" في نهاية الشهر.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 arabic-spacing">
                        الراتب الأساسي:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(Number(formData.baseSalary) || 0)}
                      </span>
                    </div>
                    {formData.dailyBonus && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 arabic-spacing">
                          العلاوات (22 يوم):
                        </span>
                        <span className="font-medium text-green-600">
                          +{formatCurrency(Number(formData.dailyBonus) * 22)}
                        </span>
                      </div>
                    )}
                    {formData.overtimePay && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 arabic-spacing">
                          ساعات إضافية (10 ساعات):
                        </span>
                        <span className="font-medium text-blue-600">
                          +{formatCurrency(Number(formData.overtimePay) * 10)}
                        </span>
                      </div>
                    )}
                    {formData.deductions && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 arabic-spacing">
                          الخصومات:
                        </span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(Number(formData.deductions))}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 mt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 arabic-spacing">
                          إجمالي الراتب:
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatCurrency(
                            (Number(formData.baseSalary) || 0) +
                              (Number(formData.dailyBonus) || 0) * 22 +
                              (Number(formData.overtimePay) || 0) * 10 -
                              (Number(formData.deductions) || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              {currentSection === "basic" ? (
                <button
                  type="button"
                  onClick={() => setCurrentSection("salary")}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 arabic-spacing flex items-center"
                >
                  <span>التالي: تفاصيل الراتب</span>
                  <DollarSign className="h-4 w-4 mr-1 no-flip" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentSection("basic")}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 arabic-spacing flex items-center"
                >
                  <User className="h-4 w-4 ml-1 no-flip" />
                  <span>السابق: المعلومات الأساسية</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 space-x-reverse">
              <Button
                variant="ghost"
                onClick={onClose}
                className="px-5 hover:bg-gray-100"
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2 space-x-reverse">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin no-flip" />
                    <span className="arabic-spacing">جاري الحفظ...</span>
                  </span>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2 no-flip" />
                    <span className="arabic-spacing">حفظ الموظف</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
