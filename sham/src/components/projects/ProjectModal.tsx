import React from "react";
import {
  X,
  Save,
  Calendar,
  Building2,
  User,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Project } from "@/types";

interface ProjectModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  project?: Project;
  projectForm: {
    name: string;
    location: string;
    budgetEstimate: string;
    client: string;
    startDate: string;
    endDate: string;
    status: "planning" | "active" | "completed" | "cancelled";
  };
  setProjectForm: (form: any) => void;
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
  },
  {
    value: "active",
    label: "نشط ومستمر",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  {
    value: "completed",
    label: "مكتمل بنجاح",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    value: "cancelled",
    label: "ملغي أو متوقف",
    color: "text-red-700 bg-red-50 border-red-200",
  },
];

export default function ProjectModal({
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
  if (!isOpen) return null;

  const isFormValid =
    projectForm.name.trim() &&
    projectForm.location.trim() &&
    projectForm.client.trim() &&
    projectForm.startDate &&
    projectForm.budgetEstimate;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Enhanced Header */}
        <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-[#182C61] to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse text-white">
              <div className="bg-white/20 p-3 rounded-xl">
                <Building2 className="h-8 w-8 no-flip" />
              </div>
              <div>
                <h3 className="text-2xl font-bold arabic-spacing">
                  {mode === "create"
                    ? "إنشاء مشروع جديد"
                    : "تعديل معلومات المشروع"}
                </h3>
                <p className="text-blue-100 arabic-spacing mt-1">
                  {mode === "create"
                    ? "أدخل تفاصيل المشروع وسيتم توليد الكود تلقائياً"
                    : "قم بتعديل المعلومات المطلوبة"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0 text-white hover:bg-white/20"
              title="إغلاق النافذة"
            >
              <X className="h-5 w-5 no-flip" />
            </Button>
          </div>
        </div>

        {/* Enhanced Form */}
        <div className="p-8 space-y-8">
          {/* Project Code Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-[#182C61] p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-white no-flip" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 arabic-spacing mb-2">
                  كود المشروع (تلقائي)
                </label>
                <div className="bg-white border border-blue-300 rounded-lg px-4 py-3 text-lg font-mono text-[#182C61] font-bold">
                  {mode === "create" ? generateProjectCode() : project?.code}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    setProjectForm({ ...projectForm, location: e.target.value })
                  }
                  className="h-12 text-base arabic-spacing"
                  placeholder="مثال: شارع الرشيد، بغداد"
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-3">
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
                      <div className="text-sm font-medium arabic-spacing text-center">
                        {option.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form Validation Summary */}
          {/*  {!isFormValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 space-x-reverse text-red-700">
                <div className="bg-red-100 p-1 rounded">
                  <X className="h-4 w-4 no-flip" />
                </div>
                <span className="font-medium arabic-spacing">
                  يرجى إكمال الحقول المطلوبة:
                </span>
              </div>
              <ul className="mt-2 text-sm text-red-600 space-y-1 mr-6">
                {!projectForm.name.trim() && (
                  <li className="arabic-spacing">• اسم المشروع</li>
                )}
                {!projectForm.location.trim() && (
                  <li className="arabic-spacing">• موقع المشروع</li>
                )}
                {!projectForm.client.trim() && (
                  <li className="arabic-spacing">• اسم العميل</li>
                )}
                {!projectForm.startDate && (
                  <li className="arabic-spacing">• تاريخ البدء</li>
                )}
                {!projectForm.budgetEstimate && (
                  <li className="arabic-spacing">• الميزانية المقدرة</li>
                )}
              </ul>
            </div>
        )} */}
        </div>

        {/* Enhanced Footer */}
        <div className="p-8 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 arabic-spacing">
              <span className="font-medium">نصيحة:</span> تأكد من دقة البيانات
              لأن بعضها لا يمكن تعديله لاحقاً
            </div>

            <div className="flex space-x-4 space-x-reverse">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-8 py-3 text-base"
                disabled={loading}
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>

              <Button
                onClick={onSubmit}
                disabled={!isFormValid || loading}
                className="px-8 py-3 text-base bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="arabic-spacing">جاري الحفظ...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Save className="h-5 w-5 no-flip" />
                    <span className="arabic-spacing">
                      {mode === "create" ? "إنشاء المشروع" : "حفظ التغييرات"}
                    </span>
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
