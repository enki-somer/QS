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
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { EnhancedProjectFormData } from "@/types";

const statusOptions = [
  {
    value: "planning",
    label: "في مرحلة التخطيط",
    color: "border-yellow-300 bg-yellow-50 text-yellow-800",
    icon: Building2,
  },
  {
    value: "active",
    label: "نشط ومستمر",
    color: "border-green-300 bg-green-50 text-green-800",
    icon: Building2,
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
    icon: Building2,
  },
];

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState<"basic" | "review">(
    "basic"
  );

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

  // Auto-generated project code
  const [projectCode, setProjectCode] = useState<string>("");

  // Toast state
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Fetch auto-generated project code on component mount
  useEffect(() => {
    const fetchProjectCode = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/generate-code`
        );
        if (response.ok) {
          const data = await response.json();
          setProjectCode(data.code);
        }
      } catch (error) {
        console.error("Error fetching project code:", error);
        setProjectCode("PRJ-AUTO"); // Fallback
      }
    };

    fetchProjectCode();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form validation
  const isBasicFormValid =
    projectForm.name.trim() &&
    projectForm.location.trim() &&
    projectForm.budgetEstimate.trim() &&
    projectForm.client.trim() &&
    projectForm.startDate &&
    projectForm.endDate &&
    projectForm.status;

  // Handle form submission
  const handleSubmit = async () => {
    if (!isBasicFormValid) {
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
            name: projectForm.name.trim(),
            location: projectForm.location.trim(),
            area: projectForm.area ? Number(projectForm.area) : null,
            budgetEstimate: Number(projectForm.budgetEstimate),
            client: projectForm.client.trim(),
            startDate: projectForm.startDate,
            endDate: projectForm.endDate,
            status: projectForm.status,
            categoryAssignments: [], // No categories initially
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Project created successfully:", result);

      setToast({
        type: "success",
        message:
          "تم إنشاء المشروع بنجاح! يمكنك الآن إضافة الفئات والمقاولين من صفحة المشروع.",
      });

      // Redirect to projects list after a short delay
      setTimeout(() => {
        router.push(`/projects/${result.project.id}`);
      }, 2000);
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
  const goToSection = (section: "basic" | "review") => {
    setCurrentSection(section);
  };

  const canGoToReview = isBasicFormValid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="ghost"
                onClick={() => router.push("/projects")}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5 no-flip" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 arabic-spacing">
                  إنشاء مشروع جديد
                </h1>
                <p className="text-sm text-gray-500 arabic-spacing">
                  أضف مشروع جديد لشركة قصر الشام
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center space-x-4 space-x-reverse">
              <div
                className={`flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full text-sm font-medium ${
                  currentSection === "basic"
                    ? "bg-blue-100 text-blue-800"
                    : isBasicFormValid
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {isBasicFormValid ? (
                  <CheckCircle2 className="h-4 w-4 no-flip" />
                ) : (
                  <Building2 className="h-4 w-4 no-flip" />
                )}
                <span className="arabic-spacing">المعلومات الأساسية</span>
              </div>

              <div className="w-8 h-px bg-gray-300"></div>

              <div
                className={`flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full text-sm font-medium ${
                  currentSection === "review"
                    ? "bg-blue-100 text-blue-800"
                    : canGoToReview
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 no-flip" />
                <span className="arabic-spacing">المراجعة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentSection === "basic" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Basic Information Card */}
            <Card className="p-8">
              <div className="flex items-center space-x-3 space-x-reverse mb-8">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <Building2 className="h-6 w-6 text-blue-600 no-flip" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 arabic-spacing">
                    المعلومات الأساسية للمشروع
                  </h2>
                  <p className="text-gray-600 arabic-spacing">
                    أدخل البيانات الأساسية للمشروع الجديد
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    اسم المشروع *
                  </label>
                  <Input
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                    placeholder="مثال: مجمع الزهراء السكني"
                    className="h-12 arabic-spacing"
                  />
                </div>

                {/* Auto-Generated Project Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    رقم المشروع (تلقائي)
                  </label>
                  <div className="relative">
                    <Input
                      value={projectCode}
                      readOnly
                      placeholder="جاري التحميل..."
                      className="h-12 arabic-spacing bg-gray-50 text-gray-700"
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center"></div>
                  </div>
                  <p className="text-xs text-gray-500 arabic-spacing">
                    يتم إنشاء رقم المشروع تلقائياً حسب التسلسل الشهري
                  </p>
                </div>

                {/* Client */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    اسم العميل *
                  </label>
                  <Input
                    value={projectForm.client}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, client: e.target.value })
                    }
                    placeholder="مثال: شركة الإسكان الحديث"
                    className="h-12 arabic-spacing"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    موقع المشروع *
                  </label>
                  <Input
                    value={projectForm.location}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        location: e.target.value,
                      })
                    }
                    placeholder="مثال: بغداد - حي الكرادة"
                    className="h-12 arabic-spacing"
                  />
                </div>

                {/* Area */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    المساحة (متر مربع)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={projectForm.area}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, area: e.target.value })
                    }
                    placeholder="1000"
                    className="h-12"
                  />
                </div>

                {/* Budget Estimate */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    الميزانية المقدرة (دينار عراقي) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={projectForm.budgetEstimate}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        budgetEstimate: e.target.value,
                      })
                    }
                    placeholder="50000000"
                    className="h-12"
                  />
                  {projectForm.budgetEstimate && (
                    <p className="text-green-600 text-sm font-medium">
                      💰{" "}
                      {new Intl.NumberFormat("ar-IQ").format(
                        Number(projectForm.budgetEstimate)
                      )}{" "}
                      دينار عراقي
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    حالة المشروع *
                  </label>
                  <Select
                    value={projectForm.status}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        status: e.target.value as any,
                      })
                    }
                    className="h-12"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    تاريخ البدء *
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
                    className="h-12"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    تاريخ الانتهاء المتوقع *
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
                    className="h-12"
                  />
                </div>
              </div>

              {/* Note about categories */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 no-flip" />
                  <div>
                    <h4 className="font-medium text-blue-900 arabic-spacing">
                      ملاحظة هامة
                    </h4>
                    <p className="text-blue-700 arabic-spacing text-sm mt-1">
                      بعد إنشاء المشروع، يمكنك إضافة الفئات والمقاولين مباشرة من
                      صفحة المشروع الجديد. هذا يتيح لك مرونة أكبر في إدارة
                      المشروع.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Continue Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => goToSection("review")}
                disabled={!canGoToReview}
                className="px-8 py-3 text-base bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700 disabled:opacity-50"
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
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      رقم المشروع
                    </label>
                    <p className="font-medium text-blue-600 arabic-spacing">
                      {projectCode || "جاري التحميل..."}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      اسم المشروع
                    </label>
                    <p className="font-medium text-gray-900 arabic-spacing">
                      {projectForm.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      العميل
                    </label>
                    <p className="font-medium text-gray-900 arabic-spacing">
                      {projectForm.client}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      الموقع
                    </label>
                    <p className="font-medium text-gray-900 arabic-spacing">
                      {projectForm.location}
                    </p>
                  </div>
                  {projectForm.area && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        المساحة
                      </label>
                      <p className="font-medium text-gray-900">
                        {new Intl.NumberFormat("ar-IQ").format(
                          Number(projectForm.area)
                        )}{" "}
                        متر مربع
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      الميزانية المقدرة
                    </label>
                    <p className="font-medium text-green-600 text-lg">
                      {new Intl.NumberFormat("ar-IQ").format(
                        Number(projectForm.budgetEstimate)
                      )}{" "}
                      د.ع
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      حالة المشروع
                    </label>
                    <p className="font-medium text-gray-900">
                      {
                        statusOptions.find(
                          (opt) => opt.value === projectForm.status
                        )?.label
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      تاريخ البدء
                    </label>
                    <p className="font-medium text-gray-900">
                      {new Date(projectForm.startDate).toLocaleDateString(
                        "en-US"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      تاريخ الانتهاء المتوقع
                    </label>
                    <p className="font-medium text-gray-900">
                      {new Date(projectForm.endDate).toLocaleDateString(
                        "en-US"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

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
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="arabic-spacing">جاري الإنشاء...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Save className="h-4 w-4 no-flip" />
                    <span className="arabic-spacing">إنشاء المشروع</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-from-right">
          <div
            className={`p-4 rounded-lg shadow-lg max-w-md ${
              toast.type === "success"
                ? "bg-green-100 border border-green-300 text-green-800"
                : toast.type === "error"
                ? "bg-red-100 border border-red-300 text-red-800"
                : "bg-blue-100 border border-blue-300 text-blue-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 space-x-reverse">
                {toast.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 no-flip" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 no-flip" />
                )}
                <p className="arabic-spacing text-sm font-medium">
                  {toast.message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setToast(null)}
                className="h-6 w-6 p-0 hover:bg-transparent"
              >
                <X className="h-4 w-4 no-flip" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
