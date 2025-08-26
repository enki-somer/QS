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
import { useAuth } from "@/contexts/AuthContext";
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
  const { isAdmin } = useAuth();

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
    pricePerMeter: "", // Deal price per square meter (what we charge client)
    realCostPerMeter: "", // Actual cost per square meter (our expenses)
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
          const response = await apiRequest(`/projects/${editProjectId}`);
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
              realCostPerMeter: project.real_cost_per_meter?.toString() || "",
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
          area: projectForm.area ? cleanNumber(projectForm.area) : null,
          budgetEstimate: cleanNumber(projectForm.budgetEstimate),
          client: projectForm.client.trim(),
          startDate: projectForm.startDate,
          endDate: projectForm.endDate,
          status: projectForm.status,
          // NEW FINANCIAL FIELDS
          pricePerMeter: cleanNumber(projectForm.pricePerMeter),
          realCostPerMeter: cleanNumber(projectForm.realCostPerMeter),
          ownerDealPrice: cleanNumber(projectForm.ownerDealPrice),
          ownerPaidAmount: cleanNumber(projectForm.ownerPaidAmount),
          totalSiteArea: cleanNumber(projectForm.totalSiteArea),
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

  // Helper function for number formatting with commas
  const formatNumber = (value: string | number) => {
    if (!value) return "";
    const num =
      typeof value === "string" ? value.replace(/,/g, "") : value.toString();
    if (isNaN(Number(num))) return value.toString();
    return new Intl.NumberFormat("en-US").format(Number(num));
  };

  // Helper function to handle number input with comma formatting
  const handleNumberInput = (
    value: string,
    field: keyof typeof projectForm
  ) => {
    const cleanValue = value.replace(/,/g, "");
    if (cleanValue === "" || !isNaN(Number(cleanValue))) {
      setProjectForm({ ...projectForm, [field]: cleanValue });
    }
  };

  // Helper function to clean and convert form values to numbers for API
  const cleanNumber = (value: string | number) => {
    if (!value) return 0;
    return Number(value.toString().replace(/,/g, ""));
  };

  // Real-time calculation helpers
  const calculateRevenue = () => {
    const area = cleanNumber(projectForm.area);
    const pricePerMeter = cleanNumber(projectForm.pricePerMeter);
    return area * pricePerMeter;
  };

  const calculateCosts = () => {
    const area = cleanNumber(projectForm.area);
    const realCostPerMeter = cleanNumber(projectForm.realCostPerMeter);
    return area * realCostPerMeter;
  };

  const calculateProfit = () => {
    return calculateRevenue() - calculateCosts();
  };

  const calculateProfitMargin = () => {
    const revenue = calculateRevenue();
    if (revenue === 0) return 0;
    return (calculateProfit() / revenue) * 100;
  };

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <Button
                variant="ghost"
                onClick={() => router.push("/projects")}
                className="p-2 touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5 no-flip" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 arabic-spacing">
                  {isEditMode ? "تعديل المشروع" : "إنشاء مشروع جديد"}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 arabic-spacing">
                  {isEditMode
                    ? "تعديل بيانات المشروع الحالي"
                    : "أضف مشروع جديد لشركة قصر الشام"}
                </p>
              </div>
            </div>

            {/* Progress Steps - Responsive */}
            <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-4 space-x-reverse">
              <div
                className={`flex items-center space-x-1 sm:space-x-2 space-x-reverse px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                  currentSection === "basic"
                    ? "bg-blue-100 text-blue-800"
                    : isBasicFormValid
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {isBasicFormValid ? (
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 no-flip" />
                ) : (
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4 no-flip" />
                )}
                <span className="arabic-spacing hidden sm:inline">
                  المعلومات الأساسية
                </span>
                <span className="arabic-spacing sm:hidden">الأساسية</span>
              </div>

              <div className="w-4 sm:w-8 h-px bg-gray-300"></div>

              <div
                className={`flex items-center space-x-1 sm:space-x-2 space-x-reverse px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                  currentSection === "review"
                    ? "bg-blue-100 text-blue-800"
                    : canGoToReview
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 no-flip" />
                <span className="arabic-spacing">المراجعة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {currentSection === "basic" && (
          <div className="space-y-4 sm:space-y-8 max-w-4xl mx-auto">
            {/* Basic Information Card */}
            <Card className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse mb-6 sm:mb-8">
                <div className="bg-blue-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 no-flip" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 arabic-spacing">
                    المعلومات الأساسية للمشروع
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 arabic-spacing">
                    {isEditMode
                      ? "تعديل البيانات الأساسية للمشروع"
                      : "أدخل البيانات الأساسية للمشروع الجديد"}
                  </p>
                </div>
              </div>

              {/* Basic Information Section */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-blue-200">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 arabic-spacing mb-3 sm:mb-4 flex items-center">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 ml-2 no-flip" />
                    المعلومات الأساسية
                  </h3>

                  <div className="space-y-3 sm:space-y-4">
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
                          className="h-10 sm:h-12 arabic-spacing bg-gray-50 text-gray-700"
                        />
                      </div>
                      <p className="text-xs text-gray-500 arabic-spacing">
                        يتم إنشاء رقم المشروع تلقائياً حسب التسلسل الشهري
                      </p>
                    </div>
                    {/* Project Name */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        اسم المشروع *
                      </label>
                      <Input
                        value={projectForm.name}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="مثال: مجمع الزهراء السكني"
                        className="h-10 sm:h-12 arabic-spacing bg-white"
                      />
                    </div>

                    {/* Client */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        اسم العميل *
                      </label>
                      <Input
                        value={projectForm.client}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            client: e.target.value,
                          })
                        }
                        placeholder="مثال: شركة الإسكان الحديث"
                        className="h-10 sm:h-12 arabic-spacing bg-white"
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
                        className="h-10 sm:h-12 arabic-spacing bg-white"
                      />
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
                        className="h-12 bg-white"
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
                        className="h-12 bg-white"
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
                        className="h-12 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Financial Information */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 arabic-spacing mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 text-green-600 ml-2 no-flip" />
                    المعلومات المالية
                  </h3>

                  <div className="space-y-4">
                    {/* Area */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        مساحة البناء الفعلية (متر مربع) *
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.area)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "area")
                        }
                        placeholder="1,000"
                        className="h-12 bg-white text-right"
                      />
                      {projectForm.area && (
                        <p className="text-blue-600 text-sm font-medium">
                          📐 {formatNumber(projectForm.area)} متر مربع
                        </p>
                      )}
                    </div>

                    {/* Total Site Area */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        المساحة الكلية للموقع (متر مربع)
                        {isEditMode && !isAdmin() && (
                          <span className="text-xs text-amber-600 mr-2">
                            (يتطلب صلاحيات المدير للتعديل)
                          </span>
                        )}
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.totalSiteArea)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "totalSiteArea")
                        }
                        placeholder="1,500"
                        className="h-12 bg-white text-right"
                        disabled={isEditMode && !isAdmin()}
                        readOnly={isEditMode && !isAdmin()}
                      />
                      {projectForm.totalSiteArea && projectForm.area && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800 arabic-spacing">
                            📊 نسبة البناء:{" "}
                            {(
                              (cleanNumber(projectForm.area) /
                                cleanNumber(projectForm.totalSiteArea)) *
                              100
                            ).toFixed(1)}
                            %
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Price Per Meter */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        سعر المتر المربع - للعميل (دينار عراقي) *
                        {isEditMode && !isAdmin() && (
                          <span className="text-xs text-amber-600 mr-2">
                            (يتطلب صلاحيات المدير للتعديل)
                          </span>
                        )}
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.pricePerMeter)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "pricePerMeter")
                        }
                        placeholder="500,000"
                        className="h-12 bg-white text-right"
                        disabled={isEditMode && !isAdmin()}
                        readOnly={isEditMode && !isAdmin()}
                      />
                      {projectForm.pricePerMeter && (
                        <p className="text-blue-600 text-sm font-medium">
                          💰 سعر البيع:{" "}
                          {formatNumber(projectForm.pricePerMeter)} د.ع/م²
                        </p>
                      )}
                    </div>

                    {/* Real Cost Per Meter */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        التكلفة الفعلية للمتر المربع (دينار عراقي) *
                        {isEditMode && !isAdmin() && (
                          <span className="text-xs text-amber-600 mr-2">
                            (يتطلب صلاحيات المدير للتعديل)
                          </span>
                        )}
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.realCostPerMeter)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "realCostPerMeter")
                        }
                        placeholder="400,000"
                        className="h-12 bg-white text-right"
                        disabled={isEditMode && !isAdmin()}
                        readOnly={isEditMode && !isAdmin()}
                      />
                      {projectForm.realCostPerMeter && (
                        <p className="text-red-600 text-sm font-medium">
                          🏗️ التكلفة الفعلية:{" "}
                          {formatNumber(projectForm.realCostPerMeter)} د.ع/م²
                        </p>
                      )}
                    </div>

                    {/* Budget Estimate - Auto calculated */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        الميزانية المقدرة (دينار عراقي) *
                        {isEditMode && !isAdmin() && (
                          <span className="text-xs text-amber-600 mr-2">
                            (يتطلب صلاحيات المدير للتعديل)
                          </span>
                        )}
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.budgetEstimate)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "budgetEstimate")
                        }
                        placeholder={formatNumber(
                          calculateRevenue().toString()
                        )}
                        className="h-12 bg-white text-right"
                        disabled={isEditMode && !isAdmin()}
                        readOnly={isEditMode && !isAdmin()}
                      />
                      {projectForm.area && projectForm.pricePerMeter && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800 arabic-spacing">
                            💡 الحساب التلقائي:{" "}
                            {formatNumber(calculateRevenue())} د.ع
                          </p>
                          <p className="text-xs text-green-600 arabic-spacing mt-1">
                            ({formatNumber(projectForm.area)} م² ×{" "}
                            {formatNumber(projectForm.pricePerMeter)} د.ع)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Owner Deal Price - Auto calculated */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        سعر الصفقة مع المالك (دينار عراقي)
                        {isEditMode && !isAdmin() && (
                          <span className="text-xs text-amber-600 mr-2">
                            (يتطلب صلاحيات المدير للتعديل)
                          </span>
                        )}
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.ownerDealPrice)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "ownerDealPrice")
                        }
                        placeholder={formatNumber(
                          calculateRevenue().toString()
                        )}
                        className="h-12 bg-white text-right"
                        disabled={isEditMode && !isAdmin()}
                        readOnly={isEditMode && !isAdmin()}
                      />
                      {projectForm.area && projectForm.pricePerMeter && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800 arabic-spacing">
                            🤝 القيمة المقترحة:{" "}
                            {formatNumber(calculateRevenue())} د.ع
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Owner Paid Amount */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                        المبلغ المدفوع من المالك (دينار عراقي)
                      </label>
                      <Input
                        type="text"
                        value={formatNumber(projectForm.ownerPaidAmount)}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, "ownerPaidAmount")
                        }
                        placeholder="20,000,000"
                        className="h-12 bg-white text-right"
                      />
                      {projectForm.ownerPaidAmount && (
                        <p className="text-green-600 text-sm font-medium">
                          💳 المبلغ المستلم:{" "}
                          {formatNumber(projectForm.ownerPaidAmount)} د.ع
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Financial Calculations Display */}
              {(projectForm.area ||
                projectForm.pricePerMeter ||
                projectForm.realCostPerMeter) && (
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                    <h3 className="text-lg font-bold text-gray-900 arabic-spacing mb-4 flex items-center">
                      <Sparkles className="h-5 w-5 text-amber-600 ml-2 no-flip" />
                      الحسابات المالية المباشرة
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Revenue */}
                      <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-600 arabic-spacing">
                            إجمالي الإيرادات
                          </h5>
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        </div>
                        <p className="text-xl font-bold text-blue-600 mb-1">
                          {formatNumber(calculateRevenue())}
                        </p>
                        <p className="text-xs text-gray-500 arabic-spacing">
                          دينار عراقي
                        </p>
                        {projectForm.area && projectForm.pricePerMeter && (
                          <p className="text-xs text-blue-600 arabic-spacing mt-2">
                            {formatNumber(projectForm.area)} ×{" "}
                            {formatNumber(projectForm.pricePerMeter)}
                          </p>
                        )}
                      </div>

                      {/* Total Costs */}
                      <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-600 arabic-spacing">
                            إجمالي التكاليف
                          </h5>
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        </div>
                        <p className="text-xl font-bold text-red-600 mb-1">
                          {formatNumber(calculateCosts())}
                        </p>
                        <p className="text-xs text-gray-500 arabic-spacing">
                          دينار عراقي
                        </p>
                        {projectForm.area && projectForm.realCostPerMeter && (
                          <p className="text-xs text-red-600 arabic-spacing mt-2">
                            {formatNumber(projectForm.area)} ×{" "}
                            {formatNumber(projectForm.realCostPerMeter)}
                          </p>
                        )}
                      </div>

                      {/* Net Profit */}
                      <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-600 arabic-spacing">
                            صافي الربح
                          </h5>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <p
                          className={`text-xl font-bold mb-1 ${
                            calculateProfit() >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatNumber(calculateProfit())}
                        </p>
                        <p className="text-xs text-gray-500 arabic-spacing">
                          دينار عراقي
                        </p>
                        <p className="text-xs text-gray-600 arabic-spacing mt-2">
                          الإيرادات - التكاليف
                        </p>
                      </div>

                      {/* Profit Margin */}
                      <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-600 arabic-spacing">
                            هامش الربح
                          </h5>
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        </div>
                        <p
                          className={`text-xl font-bold mb-1 ${
                            calculateProfitMargin() >= 0
                              ? "text-purple-600"
                              : "text-red-600"
                          }`}
                        >
                          {calculateProfitMargin().toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500 arabic-spacing">
                          نسبة مئوية
                        </p>
                        <p className="text-xs text-gray-600 arabic-spacing mt-2">
                          من إجمالي الإيرادات
                        </p>
                      </div>
                    </div>

                    {/* Profit Analysis */}
                    {projectForm.area &&
                      projectForm.pricePerMeter &&
                      projectForm.realCostPerMeter && (
                        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                          <h4 className="text-md font-semibold text-gray-800 arabic-spacing mb-3">
                            📊 تحليل الربحية التفصيلي
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-gray-600 arabic-spacing mb-1">
                                الربح لكل متر مربع
                              </p>
                              <p
                                className={`font-bold text-lg ${
                                  cleanNumber(projectForm.pricePerMeter) -
                                    cleanNumber(projectForm.realCostPerMeter) >=
                                  0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {formatNumber(
                                  (
                                    cleanNumber(projectForm.pricePerMeter) -
                                    cleanNumber(projectForm.realCostPerMeter)
                                  ).toString()
                                )}{" "}
                                د.ع
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-600 arabic-spacing mb-1">
                                نسبة التكلفة للإيرادات
                              </p>
                              <p className="font-bold text-lg text-blue-600">
                                {calculateRevenue() > 0
                                  ? (
                                      (calculateCosts() / calculateRevenue()) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-600 arabic-spacing mb-1">
                                العائد على الاستثمار
                              </p>
                              <p
                                className={`font-bold text-lg ${
                                  calculateCosts() > 0
                                    ? (calculateProfit() / calculateCosts()) *
                                        100 >=
                                      0
                                      ? "text-green-600"
                                      : "text-red-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {calculateCosts() > 0
                                  ? (
                                      (calculateProfit() / calculateCosts()) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
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
                className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base bg-gradient-to-r from-[#182C61] to-blue-600 hover:from-[#1a2e66] hover:to-blue-700 disabled:opacity-50"
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
                      {formatNumber(projectForm.budgetEstimate)} د.ع
                    </p>
                  </div>

                  {/* NEW FINANCIAL FIELDS DISPLAY */}
                  {projectForm.area && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        مساحة البناء الفعلية
                      </label>
                      <p className="font-medium text-blue-600">
                        {formatNumber(projectForm.area)} متر مربع
                      </p>
                    </div>
                  )}

                  {projectForm.pricePerMeter && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        سعر المتر المربع - للعميل
                      </label>
                      <p className="font-medium text-blue-600">
                        {formatNumber(projectForm.pricePerMeter)} د.ع/م²
                      </p>
                    </div>
                  )}

                  {projectForm.realCostPerMeter && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        التكلفة الفعلية للمتر المربع
                      </label>
                      <p className="font-medium text-red-600">
                        {formatNumber(projectForm.realCostPerMeter)} د.ع/م²
                      </p>
                    </div>
                  )}

                  {projectForm.ownerDealPrice && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        سعر الصفقة مع المالك
                      </label>
                      <p className="font-medium text-purple-600 text-lg">
                        {formatNumber(projectForm.ownerDealPrice)} د.ع
                      </p>
                    </div>
                  )}

                  {projectForm.ownerPaidAmount && (
                    <div>
                      <label className="text-sm text-gray-600 arabic-spacing">
                        المبلغ المدفوع من المالك
                      </label>
                      <p className="font-medium text-green-600">
                        {formatNumber(projectForm.ownerPaidAmount)} د.ع
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
              projectForm.realCostPerMeter && (
                <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <h3 className="text-xl font-bold text-gray-900 arabic-spacing mb-4 flex items-center">
                    <DollarSign className="h-6 w-6 text-green-600 ml-2 no-flip" />
                    الملخص المالي
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        إجمالي الإيرادات
                      </h5>
                      <p className="text-xl font-bold text-blue-600">
                        {formatNumber(calculateRevenue())}
                      </p>
                      <p className="text-xs text-gray-500 arabic-spacing">
                        د.ع
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-red-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        إجمالي التكاليف
                      </h5>
                      <p className="text-xl font-bold text-red-600">
                        {formatNumber(calculateCosts())}
                      </p>
                      <p className="text-xs text-gray-500 arabic-spacing">
                        د.ع
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        صافي الربح
                      </h5>
                      <p
                        className={`text-xl font-bold ${
                          calculateProfit() >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatNumber(calculateProfit())}
                      </p>
                      <p className="text-xs text-gray-500 arabic-spacing">
                        د.ع
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
                      <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                        هامش الربح
                      </h5>
                      <p
                        className={`text-xl font-bold ${
                          calculateProfitMargin() >= 0
                            ? "text-purple-600"
                            : "text-red-600"
                        }`}
                      >
                        {calculateProfitMargin().toFixed(2)}%
                      </p>
                    </div>

                    {projectForm.ownerPaidAmount && (
                      <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                        <h5 className="text-sm text-gray-600 arabic-spacing mb-2">
                          المبلغ المستلم
                        </h5>
                        <p className="text-xl font-bold text-green-600">
                          {formatNumber(projectForm.ownerPaidAmount)}
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => goToSection("basic")}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">السابق</span>
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 order-1 sm:order-2"
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
