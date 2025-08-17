"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit3,
  Calendar,
  MapPin,
  DollarSign,
  User,
  X,
  List,
  Grid3X3,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Home,
  Users,
  FileText,
  Wallet,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Project } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { apiRequest } from "@/lib/api";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { FinancialDisplay } from "@/components/ui/FinancialDisplay";
import { PermissionButton } from "@/components/ui/PermissionButton";
import { useResponsive } from "@/hooks/useResponsive";

// Status configurations with modern colors
const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    dot: string;
    icon: React.ComponentType<any>;
  }
> = {
  planning: {
    label: "قيد التخطيط",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  active: {
    label: "نشط",
    color: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
    icon: CheckCircle,
  },
  completed: {
    label: "مكتمل",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    icon: CheckCircle,
  },
  cancelled: {
    label: "ملغي",
    color: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
    icon: XCircle,
  },
};

export default function ProjectsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { isMobile, isTablet } = useResponsive();

  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [sortBy, setSortBy] = useState<"name" | "date" | "budget">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      addToast({
        type: "error",
        title: "خطأ في تحميل المشاريع",
        message: "حدث خطأ أثناء تحميل قائمة المشاريع",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique clients for filter
  const uniqueClients = useMemo(() => {
    const clients = projects.map((p) => p.client).filter(Boolean);
    return [...new Set(clients)];
  }, [projects]);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((project) => {
      const matchesSearch =
        searchQuery === "" ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;
      const matchesClient =
        clientFilter === "all" || project.client === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });

    // Sort projects
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ar");
          break;
        case "date":
          comparison =
            new Date(a.created_at || a.createdAt || "").getTime() -
            new Date(b.created_at || b.createdAt || "").getTime();
          break;
        case "budget":
          comparison =
            (a.budgetEstimate || a.budget_estimate || 0) -
            (b.budgetEstimate || b.budget_estimate || 0);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [projects, searchQuery, statusFilter, clientFilter, sortBy, sortOrder]);

  // Navigation functions
  const handleCreateProject = () => {
    router.push("/projects/create");
  };

  const handleEditProject = (project: Project) => {
    router.push(`/projects/create?edit=${project.id}`);
  };

  const handleViewProject = (project: Project) => {
    router.push(`/projects/${project.id}`);
  };

  // Calculate completion percentage
  const getCompletionPercentage = (project: Project) => {
    const budget = project.budgetEstimate || project.budget_estimate || 0;
    const spent = project.spent_budget || 0;
    if (budget === 0) return 0;
    return Math.min((spent / budget) * 100, 100);
  };

  // Get project status info
  const getProjectStatusInfo = (project: Project) => {
    const completion = getCompletionPercentage(project);
    const isCompleted = project.status === "completed" || completion >= 100;

    return {
      isCompleted,
      completion,
      canEdit: !isCompleted,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div
          className={`max-w-7xl mx-auto ${
            isMobile ? "px-3" : "px-4 sm:px-6 lg:px-8"
          }`}
        >
          <div
            className={`flex justify-between items-center ${
              isMobile ? "h-16" : "h-20"
            }`}
          >
            {/* Title and Stats */}
            <div
              className={`flex items-center ${
                isMobile
                  ? "space-x-3 space-x-reverse"
                  : "space-x-6 space-x-reverse"
              }`}
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <div
                  className={`bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg ${
                    isMobile ? "p-2" : "p-3"
                  }`}
                >
                  <Building2
                    className={`text-white no-flip ${
                      isMobile ? "h-6 w-6" : "h-8 w-8"
                    }`}
                  />
                </div>
                <div>
                  <h1
                    className={`font-bold text-gray-900 arabic-spacing ${
                      isMobile ? "text-xl pr-2" : "text-3xl pr-4"
                    }`}
                  >
                    {isMobile ? "المشاريع" : "إدارة المشاريع"}
                  </h1>
                  <p
                    className={`text-gray-600 arabic-spacing ${
                      isMobile ? "text-sm pr-2" : "pr-4"
                    }`}
                  >
                    {loading ? "جاري التحميل..." : `${projects.length} مشروع`}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              {!loading && !isMobile && (
                <div className="hidden lg:flex items-center space-x-6 space-x-reverse">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {projects.filter((p) => p.status === "active").length}
                    </div>
                    <div className="text-sm text-gray-500 ">نشط</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {projects.filter((p) => p.status === "completed").length}
                    </div>
                    <div className="text-sm text-gray-500 pr-2">مكتمل</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {projects.filter((p) => p.status === "planning").length}
                    </div>
                    <div className="text-sm text-gray-500 pr-2">تخطيط</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Hidden on Mobile */}
            {!isMobile && (
              <div className="flex items-center space-x-3 space-x-reverse">
                <Button
                  variant="outline"
                  onClick={fetchProjects}
                  className="p-3"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 no-flip ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                </Button>

                <PermissionButton
                  permission="canCreateProjects"
                  onClick={handleCreateProject}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 shadow-lg m-4"
                  viewOnlyTooltip="غير متاح - وضع العرض فقط"
                >
                  <Plus className="h-5 w-5 ml-2 no-flip" />
                  <span className="arabic-spacing">مشروع جديد</span>
                </PermissionButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-Based Navigation is now handled globally in MainLayout */}

      <div
        className={`max-w-7xl mx-auto py-8 ${
          isMobile ? "px-3" : "px-4 sm:px-6 lg:px-8"
        }`}
      >
        {/* Filters and Search Section */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 ${
            isMobile ? "p-4" : "p-6"
          }`}
        >
          <div
            className={`flex gap-6 ${
              isMobile ? "flex-col gap-4" : "flex-col lg:flex-row"
            }`}
          >
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 no-flip ${
                    isMobile ? "h-4 w-4" : "h-5 w-5"
                  }`}
                />
                <Input
                  type="text"
                  placeholder={
                    isMobile
                      ? "البحث في المشاريع..."
                      : "البحث في المشاريع (الاسم، العميل، الموقع...)"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-12 pr-12 arabic-spacing border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
                    isMobile ? "h-10 text-base" : "h-12 text-lg"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X
                      className={`no-flip ${isMobile ? "h-4 w-4" : "h-5 w-5"}`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div
              className={`flex gap-4 ${isMobile ? "flex-col" : "flex-wrap"}`}
            >
              {/* Status Filter */}
              <div className={isMobile ? "w-full" : "min-w-[160px]"}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={isMobile ? "h-10" : "h-12"}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="planning">قيد التخطيط</option>
                  <option value="active">نشط</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </Select>
              </div>

              {/* Client Filter */}
              <div className={isMobile ? "w-full" : "min-w-[160px]"}>
                <Select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className={isMobile ? "h-10" : "h-12"}
                >
                  <option value="all">جميع العملاء</option>
                  {uniqueClients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Sort Options */}
              <div className={isMobile ? "w-full" : "min-w-[140px]"}>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split("-");
                    setSortBy(sort as typeof sortBy);
                    setSortOrder(order as typeof sortOrder);
                  }}
                  className={isMobile ? "h-10" : "h-12"}
                >
                  <option value="date-desc">الأحدث أولاً</option>
                  <option value="date-asc">الأقدم أولاً</option>
                  <option value="name-asc">الاسم (أ-ي)</option>
                  <option value="name-desc">الاسم (ي-أ)</option>
                  <option value="budget-desc">الميزانية (عالي-منخفض)</option>
                  <option value="budget-asc">الميزانية (منخفض-عالي)</option>
                </Select>
              </div>

              {/* View Mode Toggle - Hidden on Mobile */}
              {!isMobile && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "table"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <List className="h-5 w-5 no-flip" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Grid3X3 className="h-5 w-5 no-flip" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery ||
            statusFilter !== "all" ||
            clientFilter !== "all") && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600 arabic-spacing">
                المرشحات النشطة:
              </span>
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  البحث: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="h-3 w-3 no-flip" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  الحالة:{" "}
                  {
                    statusConfig[statusFilter as keyof typeof statusConfig]
                      ?.label
                  }
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="ml-2 hover:text-green-600"
                  >
                    <X className="h-3 w-3 no-flip" />
                  </button>
                </span>
              )}
              {clientFilter !== "all" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  العميل: {clientFilter}
                  <button
                    onClick={() => setClientFilter("all")}
                    className="ml-2 hover:text-purple-600"
                  >
                    <X className="h-3 w-3 no-flip" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div
          className={`flex justify-between items-center mb-6 ${
            isMobile ? "flex-col space-y-2 text-center" : ""
          }`}
        >
          <div
            className={`text-gray-600 arabic-spacing ${
              isMobile ? "text-sm" : ""
            }`}
          >
            {loading
              ? "جاري التحميل..."
              : `عرض ${filteredAndSortedProjects.length} من ${projects.length} مشروع`}
          </div>
          {!isMobile && (
            <div className="text-sm text-gray-500">
              آخر تحديث: {formatDate(new Date().toISOString())}
            </div>
          )}
        </div>

        {/* Projects Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="h-12 w-12 text-gray-400 animate-spin mb-4" />
              <p className="text-gray-600 arabic-spacing text-lg">
                جاري تحميل المشاريع...
              </p>
            </div>
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <Building2 className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2 arabic-spacing">
                {projects.length === 0
                  ? "لا توجد مشاريع حتى الآن"
                  : "لم يتم العثور على مشاريع"}
              </h3>
              <p className="text-gray-600 arabic-spacing text-center mb-6">
                {projects.length === 0
                  ? "ابدأ بإنشاء مشروعك الأول لإدارة أعمالك بكفاءة"
                  : "جرب تغيير المرشحات أو مصطلحات البحث"}
              </p>
              {projects.length === 0 && (
                <PermissionButton
                  permission="canCreateProjects"
                  onClick={handleCreateProject}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3"
                  viewOnlyTooltip="غير متاح - وضع العرض فقط"
                >
                  <Plus className="h-5 w-5 ml-2 no-flip" />
                  <span className="arabic-spacing">إنشاء مشروع جديد</span>
                </PermissionButton>
              )}
            </div>
          </div>
        ) : isMobile ? (
          <MobileProjectCards
            projects={filteredAndSortedProjects}
            statusConfig={statusConfig}
          />
        ) : viewMode === "table" ? (
          <ProjectsTable
            projects={filteredAndSortedProjects}
            onViewProject={handleViewProject}
            onEditProject={handleEditProject}
            getProjectStatusInfo={getProjectStatusInfo}
            statusConfig={statusConfig}
          />
        ) : (
          <ProjectsGrid
            projects={filteredAndSortedProjects}
            onViewProject={handleViewProject}
            onEditProject={handleEditProject}
            getProjectStatusInfo={getProjectStatusInfo}
            statusConfig={statusConfig}
          />
        )}
      </div>
    </div>
  );
}

// Enhanced Projects Table Component
function ProjectsTable({
  projects,
  onViewProject,
  onEditProject,
  getProjectStatusInfo,
  statusConfig,
}: {
  projects: Project[];
  onViewProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  getProjectStatusInfo: (project: Project) => {
    isCompleted: boolean;
    completion: number;
    canEdit: boolean;
  };
  statusConfig: Record<
    string,
    {
      label: string;
      color: string;
      dot: string;
      icon: React.ComponentType<any>;
    }
  >;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 arabic-spacing border-l border-gray-200">
                المشروع
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 arabic-spacing border-l border-gray-200">
                العميل
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 arabic-spacing border-l border-gray-200">
                الحالة
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 arabic-spacing border-l border-gray-200">
                الميزانية
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 arabic-spacing border-l border-gray-200">
                التاريخ
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 arabic-spacing">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => {
              const statusInfo = getProjectStatusInfo(project);
              const status =
                statusConfig[project.status as keyof typeof statusConfig];

              return (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 border-l border-gray-200">
                    <div className="flex items-center justify-center space-x-3 space-x-reverse">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-white no-flip" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-center">
                        <p className="text-sm font-semibold text-gray-900 truncate arabic-spacing">
                          {project.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate arabic-spacing flex items-center justify-center">
                          <MapPin className="h-3 w-3 ml-1 no-flip" />
                          {project.location || "غير محدد"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-l border-gray-200 text-center">
                    <div className="flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-400 ml-2 no-flip" />
                      <span className="text-sm text-gray-900 arabic-spacing">
                        {project.client || "غير محدد"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-l border-gray-200 text-center">
                    <div className="flex justify-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${status?.color}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ml-2 ${status?.dot}`}
                        ></span>
                        {status?.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-l border-gray-200 text-center">
                    <div className="flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-gray-400 ml-2 no-flip" />
                      <span className="text-sm font-semibold text-gray-900">
                        <FinancialDisplay
                          value={
                            project.budgetEstimate ||
                            project.budget_estimate ||
                            0
                          }
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-l border-gray-200 text-center">
                    <div className="flex items-center justify-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 ml-2 no-flip" />
                      {formatDate(
                        project.created_at || project.createdAt || ""
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewProject(project)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4 ml-1 no-flip" />
                        <span className="arabic-spacing">عرض</span>
                      </Button>

                      <PermissionButton
                        permission="canEditProjects"
                        variant="outline"
                        size="sm"
                        onClick={() => onEditProject(project)}
                        disabled={!statusInfo.canEdit}
                        className={`${
                          statusInfo.canEdit
                            ? "text-green-600 border-green-200 hover:bg-green-50"
                            : "opacity-60 cursor-not-allowed"
                        }`}
                        title={
                          statusInfo.canEdit
                            ? "تعديل المشروع"
                            : "لا يمكن تعديل المشاريع المكتملة"
                        }
                        viewOnlyTooltip="غير متاح - وضع العرض فقط"
                      >
                        <Edit3 className="h-4 w-4 ml-1 no-flip" />
                        <span className="arabic-spacing">تعديل</span>
                      </PermissionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Enhanced Projects Grid Component
function ProjectsGrid({
  projects,
  onViewProject,
  onEditProject,
  getProjectStatusInfo,
  statusConfig,
}: {
  projects: Project[];
  onViewProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  getProjectStatusInfo: (project: Project) => {
    isCompleted: boolean;
    completion: number;
    canEdit: boolean;
  };
  statusConfig: Record<
    string,
    {
      label: string;
      color: string;
      dot: string;
      icon: React.ComponentType<any>;
    }
  >;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        const statusInfo = getProjectStatusInfo(project);
        const status =
          statusConfig[project.status as keyof typeof statusConfig];

        return (
          <div
            key={project.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold arabic-spacing truncate">
                    {project.name}
                  </h3>
                  <p className="text-blue-100 text-sm arabic-spacing flex items-center mt-1">
                    <MapPin className="h-3 w-3 ml-1 no-flip" />
                    {project.location || "غير محدد"}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border bg-white/20 border-white/30 text-white`}
                >
                  {status?.label}
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Client */}
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 ml-2 no-flip" />
                  <span className="text-sm arabic-spacing">
                    {project.client || "غير محدد"}
                  </span>
                </div>

                {/* Budget */}
                <div className="flex items-center text-gray-600">
                  <DollarSign className="h-4 w-4 ml-2 no-flip" />
                  <span className="text-sm font-semibold">
                    <FinancialDisplay
                      value={
                        project.budgetEstimate || project.budget_estimate || 0
                      }
                    />
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center text-gray-500">
                  <Calendar className="h-4 w-4 ml-2 no-flip" />
                  <span className="text-sm">
                    {formatDate(project.created_at || project.createdAt || "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="px-6 pb-6 flex space-x-3 space-x-reverse">
              <Button
                variant="outline"
                className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => onViewProject(project)}
              >
                <Eye className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">عرض</span>
              </Button>

              <PermissionButton
                permission="canEditProjects"
                variant="outline"
                className={`flex-1 ${
                  statusInfo.canEdit
                    ? "text-green-600 border-green-200 hover:bg-green-50"
                    : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => onEditProject(project)}
                disabled={!statusInfo.canEdit}
                title={
                  statusInfo.canEdit
                    ? "تعديل المشروع"
                    : "لا يمكن تعديل المشاريع المكتملة"
                }
                viewOnlyTooltip="غير متاح - وضع العرض فقط"
              >
                <Edit3 className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">تعديل</span>
              </PermissionButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Mobile Project Cards Component - No Action Buttons
function MobileProjectCards({
  projects,
  statusConfig,
}: {
  projects: Project[];
  statusConfig: Record<
    string,
    {
      label: string;
      color: string;
      dot: string;
      icon: React.ComponentType<any>;
    }
  >;
}) {
  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const status =
          statusConfig[project.status as keyof typeof statusConfig];

        return (
          <div
            key={project.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Mobile Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold arabic-spacing truncate">
                    {project.name}
                  </h3>
                  <p className="text-blue-100 text-sm arabic-spacing flex items-center mt-1">
                    <MapPin className="h-3 w-3 ml-1 no-flip" />
                    {project.location || "غير محدد"}
                  </p>
                </div>
                <div className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 border-white/30 text-white">
                  {status?.label}
                </div>
              </div>
            </div>

            {/* Mobile Card Content - Minimal Details */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Client */}
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 ml-2 no-flip flex-shrink-0" />
                  <span className="arabic-spacing truncate">
                    {project.client || "غير محدد"}
                  </span>
                </div>

                {/* Budget */}
                <div className="flex items-center text-gray-600">
                  <DollarSign className="h-4 w-4 ml-2 no-flip flex-shrink-0" />
                  <span className="font-semibold truncate">
                    <FinancialDisplay
                      value={
                        project.budgetEstimate || project.budget_estimate || 0
                      }
                    />
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center text-gray-500 col-span-2">
                  <Calendar className="h-4 w-4 ml-2 no-flip flex-shrink-0" />
                  <span className="text-xs">
                    {formatDate(project.created_at || project.createdAt || "")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Navigation Button Component
function NavButton({
  icon: Icon,
  label,
  href,
  isActive,
  router,
}: {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  isActive: boolean;
  router: any;
}) {
  return (
    <button
      onClick={() => router.push(href)}
      className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm"
      }`}
    >
      <Icon className="h-4 w-4 no-flip" />
      <span className="arabic-spacing whitespace-nowrap">{label}</span>
    </button>
  );
}
