"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { apiRequest } from "@/lib/api";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { PermissionRoute } from "@/components/ui/PermissionRoute";

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
  const searchParams = useSearchParams();
  const editProjectId = searchParams.get("edit");
  const isEditMode = !!editProjectId;
  const permissions = useUIPermissions();

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
    // NEW FINANCIAL FIELDS
    pricePerMeter: "",
    ownerDealPrice: "",
    ownerPaidAmount: "",
    totalSiteArea: "",
  });

  // Auto-generated project code
  const [projectCode, setProjectCode] = useState<string>("");

  // Toast state
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Fetch project data for editing or generate code for creation
  useEffect(() => {
    if (isEditMode && editProjectId) {
      // Fetch existing project data for editing
      const fetchProjectData = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${editProjectId}`
          );
          if (response.ok) {
            const project = await response.json();
            console.log("Fetched project data:", project); // Debug log

            if (!project || !project.id) {
              throw new Error("No project data found in response");
            }

            // Populate form with existing project data (using snake_case field names from DB)
            setProjectForm({
              name: project.name || "",
              location: project.location || "",
              area: project.area?.toString() || "",
              budgetEstimate: project.budget_estimate?.toString() || "",
              client: project.client || "",
              startDate: project.start_date
                ? project.start_date.split("T")[0]
                : "",
              endDate: project.end_date ? project.end_date.split("T")[0] : "",
              status: project.status || "planning",
              categoryAssignments:
                project.category_assignments ||
                project.categoryAssignments ||
                [],
              // NEW FINANCIAL FIELDS
              pricePerMeter: project.price_per_meter?.toString() || "",
              ownerDealPrice: project.owner_deal_price?.toString() || "",
              ownerPaidAmount: project.owner_paid_amount?.toString() || "",
              totalSiteArea: project.total_site_area?.toString() || "",
            });

            setProjectCode(project.code || "");
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || `HTTP error! status: ${response.status}`
            );
          }
        } catch (error) {
          console.error("Error fetching project data:", error);
          setToast({
            type: "error",
            message:
              "حدث خطأ أثناء تحميل بيانات المشروع: " +
              (error instanceof Error ? error.message : "خطأ غير معروف"),
          });
        }
      };

      fetchProjectData();
    } else {
      // Fetch auto-generated project code for new project
      const fetchProjectCode = async () => {
        try {
          const response = await apiRequest("/projects/generate-code");
          if (response.ok) {
            const data = await response.json();
            setProjectCode(data.code);
          } else {
            console.error(
              "Failed to fetch project code:",
              response.status,
              response.statusText
            );
            setProjectCode("PRJ-AUTO"); // Fallback
          }
        } catch (error) {
          console.error("Error fetching project code:", error);
          setProjectCode("PRJ-AUTO"); // Fallback
        }
      };

      fetchProjectCode();
    }
  }, [isEditMode, editProjectId]);

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

  // Handle form submission (create or update)
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
      const url = isEditMode ? `/projects/${editProjectId}` : `/projects`;

      const method = isEditMode ? "PUT" : "POST";

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify({
          name: projectForm.name.trim(),
          location: projectForm.location.trim(),
          area: projectForm.area ? Number(projectForm.area) : null,
          budgetEstimate: Number(projectForm.budgetEstimate),
          client: projectForm.client.trim(),
          startDate: projectForm.startDate,
          endDate: projectForm.endDate,
          status: projectForm.status,
          // NEW FINANCIAL FIELDS
          pricePerMeter: projectForm.pricePerMeter
            ? Number(projectForm.pricePerMeter)
            : 0,
          ownerDealPrice: projectForm.ownerDealPrice
            ? Number(projectForm.ownerDealPrice)
            : 0,
          ownerPaidAmount: projectForm.ownerPaidAmount
            ? Number(projectForm.ownerPaidAmount)
            : 0,
          totalSiteArea: projectForm.totalSiteArea
            ? Number(projectForm.totalSiteArea)
            : 0,
          // Category assignments are managed separately from the project detail page
          // Only send them during creation if explicitly provided
          ...(isEditMode
            ? {}
            : { categoryAssignments: projectForm.categoryAssignments || [] }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            errorData.error ||
            `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log(
        `Project ${isEditMode ? "updated" : "created"} successfully:`,
        result
      );

      setToast({
        type: "success",
        message: isEditMode
          ? "تم تحديث المشروع بنجاح!"
          : "تم إنشاء المشروع بنجاح! يمكنك الآن إضافة الفئات والمقاولين من صفحة المشروع.",
      });

      // Redirect after a short delay
      setTimeout(() => {
        if (isEditMode) {
          router.push(`/projects/${editProjectId}`);
        } else {
          router.push(`/projects/${result.project.id}`);
        }
      }, 2000);
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} project:`,
        error
      );
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : isEditMode
            ? "حدث خطأ أثناء تحديث المشروع"
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

  // Check permissions for project creation/editing
  const requiredPermission = isEditMode
    ? "canEditProjects"
    : "canCreateProjects";

  if (!permissions[requiredPermission]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-spacing">
            غير مصرح لك بالوصول
          </h2>
          <p className="text-gray-600 mb-6 arabic-spacing">
            {isEditMode
              ? "ليس لديك صلاحية لتعديل المشاريع"
              : "ليس لديك صلاحية لإنشاء مشاريع جديدة"}
          </p>
          <Button
            onClick={() => router.push("/projects")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            العودة للمشاريع
          </Button>
        </div>
      </div>
    );
  }

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
                  {isEditMode ? "تعديل المشروع" : "إنشاء مشروع جديد"}
                </h1>
                <p className="text-sm text-gray-500 arabic-spacing">
                  {isEditMode
                    ? "تعديل بيانات المشروع الحالي"
                    : "أضف مشروع جديد لشركة قصر الشام"}
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
                    {isEditMode
                      ? "تعديل البيانات الأساسية للمشروع"
                      : "أدخل البيانات الأساسية للمشروع الجديد"}
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
                    مساحة البناء الفعلية (متر مربع)
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

                {/* Total Site Area */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    المساحة الكلية للموقع (متر مربع)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={projectForm.totalSiteArea}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        totalSiteArea: e.target.value,
                      })
                    }
                    placeholder="1500"
                    className="h-12"
                  />
                  {projectForm.totalSiteArea && projectForm.area && (
                    <div className="flex items-center space-x-2 space-x-reverse text-sm">
                      <p className="text-blue-600 font-medium">
                        🏗️ مساحة البناء:{" "}
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.area)
                        )}{" "}
                        م²
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-green-600 font-medium">
                        🏞️ المساحة الكلية:{" "}
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.totalSiteArea)
                        )}{" "}
                        م²
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-purple-600 font-medium">
                        📊 نسبة البناء:{" "}
                        {(
                          (Number(projectForm.area) /
                            Number(projectForm.totalSiteArea)) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  )}
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
                    disabled={isEditMode}
                    readOnly={isEditMode}
                  />
                  {projectForm.budgetEstimate && (
                    <p className="text-green-600 text-sm font-medium">
                      💰{" "}
                      {new Intl.NumberFormat("en-US").format(
                        Number(projectForm.budgetEstimate)
                      )}{" "}
                      دينار عراقي
                    </p>
                  )}
                  {isEditMode && (
                    <p className="text-amber-600 text-sm font-medium flex items-center">
                      ⚠️ لا يمكن تعديل الميزانية بعد إنشاء المشروع لحماية
                      البيانات المالية
                    </p>
                  )}
                </div>

                {/* Price Per Meter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    سعر المتر المربع (دينار عراقي)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={projectForm.pricePerMeter}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        pricePerMeter: e.target.value,
                      })
                    }
                    placeholder="500000"
                    className="h-12"
                  />
                  {projectForm.pricePerMeter && (
                    <p className="text-blue-600 text-sm font-medium">
                      🏗️{" "}
                      {new Intl.NumberFormat("en-US").format(
                        Number(projectForm.pricePerMeter)
                      )}{" "}
                      د.ع/م²
                    </p>
                  )}
                </div>

                {/* Owner Deal Price */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    سعر الصفقة مع المالك (دينار عراقي)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={projectForm.ownerDealPrice}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        ownerDealPrice: e.target.value,
                      })
                    }
                    placeholder="60000000"
                    className="h-12"
                  />
                  {projectForm.ownerDealPrice && (
                    <p className="text-purple-600 text-sm font-medium">
                      🤝{" "}
                      {new Intl.NumberFormat("en-US").format(
                        Number(projectForm.ownerDealPrice)
                      )}{" "}
                      دينار عراقي
                    </p>
                  )}
                </div>

                {/* Owner Paid Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                    المبلغ المدفوع من المالك (دينار عراقي)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={projectForm.ownerPaidAmount}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        ownerPaidAmount: e.target.value,
                      })
                    }
                    placeholder="20000000"
                    className="h-12"
                  />
                  {projectForm.ownerPaidAmount && (
                    <p className="text-green-600 text-sm font-medium">
                      💳{" "}
                      {new Intl.NumberFormat("en-US").format(
                        Number(projectForm.ownerPaidAmount)
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

              {/* Financial Calculations Display */}
              {projectForm.area &&
                projectForm.pricePerMeter &&
                projectForm.ownerDealPrice && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
                    <div className="flex items-start space-x-3 space-x-reverse mb-4">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600 no-flip" />
                      </div>
                      <div>
                        <h4 className="font-bold text-green-900 arabic-spacing text-lg">
                          الحسابات المالية التلقائية
                        </h4>
                        <p className="text-green-700 arabic-spacing text-sm mt-1">
                          يتم حساب هذه القيم تلقائياً بناءً على البيانات المدخلة
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h5 className="text-sm text-gray-600 arabic-spacing mb-1">
                          تكلفة الإنشاء
                        </h5>
                        <p className="text-lg font-bold text-blue-600">
                          {new Intl.NumberFormat("en-US").format(
                            Number(projectForm.area) *
                              Number(projectForm.pricePerMeter)
                          )}{" "}
                          د.ع
                        </p>
                        <p className="text-xs text-gray-500 arabic-spacing mt-1">
                          {projectForm.area} م² ×{" "}
                          {new Intl.NumberFormat("en-US").format(
                            Number(projectForm.pricePerMeter)
                          )}{" "}
                          د.ع
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h5 className="text-sm text-gray-600 arabic-spacing mb-1">
                          الربح المتوقع
                        </h5>
                        <p className="text-lg font-bold text-green-600">
                          {new Intl.NumberFormat("en-US").format(
                            Number(projectForm.ownerDealPrice) -
                              Number(projectForm.area) *
                                Number(projectForm.pricePerMeter)
                          )}{" "}
                          د.ع
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h5 className="text-sm text-gray-600 arabic-spacing mb-1">
                          هامش الربح
                        </h5>
                        <p className="text-lg font-bold text-purple-600">
                          {(
                            ((Number(projectForm.ownerDealPrice) -
                              Number(projectForm.area) *
                                Number(projectForm.pricePerMeter)) /
                              Number(projectForm.ownerDealPrice)) *
                            100
                          ).toFixed(2)}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Note about categories */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 no-flip" />
                  <div>
                    <h4 className="font-medium text-blue-900 arabic-spacing">
                      ملاحظة هامة
                    </h4>
                    <p className="text-blue-700 arabic-spacing text-sm mt-1">
                      {isEditMode
                        ? "يمكنك إدارة الفئات والمقاولين من صفحة تفاصيل المشروع بعد حفظ التعديلات. هذه الصفحة مخصصة لتعديل المعلومات الأساسية فقط."
                        : "بعد إنشاء المشروع، يمكنك إضافة الفئات والمقاولين مباشرة من صفحة المشروع الجديد. هذا يتيح لك مرونة أكبر في إدارة المشروع."}
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
                    {isEditMode
                      ? "تأكد من صحة جميع البيانات قبل حفظ التعديلات"
                      : "تأكد من صحة جميع البيانات قبل إنشاء المشروع"}
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
                        مساحة البناء الفعلية
                      </label>
                      <p className="font-medium text-gray-900">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.area)
                        )}{" "}
                        متر مربع
                      </p>
                    </div>
                  )}

                  {projectForm.totalSiteArea && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        المساحة الكلية للموقع
                      </label>
                      <p className="font-medium text-gray-900">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.totalSiteArea)
                        )}{" "}
                        متر مربع
                      </p>
                      {projectForm.area && (
                        <p className="text-xs text-purple-600 mt-1">
                          نسبة البناء:{" "}
                          {(
                            (Number(projectForm.area) /
                              Number(projectForm.totalSiteArea)) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      الميزانية المقدرة
                    </label>
                    <p className="font-medium text-green-600 text-lg">
                      {new Intl.NumberFormat("en-US").format(
                        Number(projectForm.budgetEstimate)
                      )}{" "}
                      د.ع
                    </p>
                  </div>

                  {/* NEW FINANCIAL FIELDS DISPLAY */}
                  {projectForm.pricePerMeter && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        سعر المتر المربع
                      </label>
                      <p className="font-medium text-blue-600">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.pricePerMeter)
                        )}{" "}
                        د.ع/م²
                      </p>
                    </div>
                  )}

                  {projectForm.ownerDealPrice && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        سعر الصفقة مع المالك
                      </label>
                      <p className="font-medium text-purple-600 text-lg">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.ownerDealPrice)
                        )}{" "}
                        د.ع
                      </p>
                    </div>
                  )}

                  {projectForm.ownerPaidAmount && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        المبلغ المدفوع من المالك
                      </label>
                      <p className="font-medium text-green-600">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.ownerPaidAmount)
                        )}{" "}
                        د.ع
                      </p>
                    </div>
                  )}

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
                        "ar-EG"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 arabic-spacing">
                      تاريخ الانتهاء المتوقع
                    </label>
                    <p className="font-medium text-gray-900">
                      {new Date(projectForm.endDate).toLocaleDateString(
                        "ar-EG"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial Summary Card */}
            {projectForm.area &&
              projectForm.pricePerMeter &&
              projectForm.ownerDealPrice && (
                <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <h3 className="text-xl font-bold text-gray-900 arabic-spacing mb-4 flex items-center">
                    <DollarSign className="h-6 w-6 text-green-600 ml-2 no-flip" />
                    الملخص المالي
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        تكلفة الإنشاء
                      </h5>
                      <p className="text-xl font-bold text-blue-600">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.area) *
                            Number(projectForm.pricePerMeter)
                        )}
                      </p>
                      <p className="text-xs text-gray-500 arabic-spacing">
                        د.ع
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        الربح المتوقع
                      </h5>
                      <p className="text-xl font-bold text-green-600">
                        {new Intl.NumberFormat("en-US").format(
                          Number(projectForm.ownerDealPrice) -
                            Number(projectForm.area) *
                              Number(projectForm.pricePerMeter)
                        )}
                      </p>
                      <p className="text-xs text-gray-500 arabic-spacing">
                        د.ع
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        هامش الربح
                      </h5>
                      <p className="text-xl font-bold text-purple-600">
                        {(
                          ((Number(projectForm.ownerDealPrice) -
                            Number(projectForm.area) *
                              Number(projectForm.pricePerMeter)) /
                            Number(projectForm.ownerDealPrice)) *
                          100
                        ).toFixed(2)}
                        %
                      </p>
                    </div>

                    {projectForm.ownerPaidAmount && (
                      <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                        <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                          المبلغ المستلم
                        </h5>
                        <p className="text-xl font-bold text-green-600">
                          {new Intl.NumberFormat("en-US").format(
                            Number(projectForm.ownerPaidAmount)
                          )}
                        </p>
                        <p className="text-xs text-gray-500 arabic-spacing">
                          د.ع
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

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
                    <span className="arabic-spacing">
                      {isEditMode ? "جاري الحفظ..." : "جاري الإنشاء..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Save className="h-4 w-4 no-flip" />
                    <span className="arabic-spacing">
                      {isEditMode ? "حفظ التعديلات" : "إنشاء المشروع"}
                    </span>
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
