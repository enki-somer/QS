import React from "react";
import {
  Building2,
  Eye,
  Edit,
  FileText,
  MapPin,
  User,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Project } from "@/types";
import { EnhancedInvoice } from "@/types/shared";

interface ProjectsTableProps {
  projects: Project[];
  getProjectInvoices: (projectId: string) => EnhancedInvoice[];
  getProjectTotalInvoiced: (projectId: string) => number;
  onViewProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onCreateInvoice: (projectId: string) => void;
}

const statusColors = {
  planning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  active: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-blue-100 text-blue-800 border-blue-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels = {
  planning: "تخطيط",
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function ProjectsTable({
  projects,
  getProjectInvoices,
  getProjectTotalInvoiced,
  onViewProject,
  onEditProject,
  onCreateInvoice,
}: ProjectsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#182C61] to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold arabic-spacing min-w-[250px]">
                المشروع
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold arabic-spacing min-w-[100px]">
                الحالة
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold arabic-spacing min-w-[120px]">
                العميل
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold arabic-spacing min-w-[120px]">
                الموقع
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold arabic-spacing min-w-[150px]">
                التقدم المالي
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold arabic-spacing min-w-[80px]">
                الفواتير
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold arabic-spacing min-w-[200px]">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project, index) => {
              const projectInvoices = getProjectInvoices(project.id);
              const totalInvoiced = getProjectTotalInvoiced(project.id);
              const completionPercentage = Math.round(
                (totalInvoiced / project.budgetEstimate) * 100
              );
              const isOverBudget = completionPercentage > 100;

              return (
                <tr
                  key={project.id}
                  onClick={() => onViewProject(project)}
                  className={`hover:bg-blue-50 hover:cursor-pointer transition-colors border-b border-gray-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  {/* Project Info */}
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="bg-[#182C61]/10 p-2 rounded-lg flex-shrink-0">
                        <Building2 className="h-4 w-4 text-[#182C61] no-flip" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 arabic-spacing truncate">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500 arabic-spacing">
                          {project.code}
                        </div>
                        <div className="flex items-center space-x-1 space-x-reverse text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 no-flip" />
                          <span>{formatDate(project.startDate)}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                        statusColors[project.status]
                      } arabic-spacing`}
                    >
                      {statusLabels[project.status]}
                    </span>
                  </td>

                  {/* Client */}
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="h-4 w-4 text-[#182C61] no-flip flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 arabic-spacing">
                        {project.client}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <MapPin className="h-4 w-4 text-[#182C61] no-flip flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 arabic-spacing">
                        {project.location}
                      </span>
                    </div>
                  </td>

                  {/* Financial Progress */}
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${
                            isOverBudget ? "text-red-600" : "text-[#182C61]"
                          }`}
                        >
                          {completionPercentage}%
                        </span>
                        {isOverBudget && (
                          <AlertTriangle className="h-3 w-3 text-red-500 no-flip" />
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isOverBudget
                              ? "bg-red-500"
                              : "bg-gradient-to-r from-[#182C61] to-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(completionPercentage, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className="arabic-nums">
                          {formatCurrency(totalInvoiced)}
                        </span>
                        <span className="arabic-nums">
                          {formatCurrency(project.budgetEstimate)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Invoices Count */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <div className="bg-blue-100 p-1 rounded">
                          <FileText className="h-3 w-3 text-blue-600 no-flip" />
                        </div>
                        <span className="text-sm font-medium text-blue-600 arabic-spacing">
                          {projectInvoices.length}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div
                      className="flex items-center justify-center space-x-1 space-x-reverse"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProject(project);
                        }}
                        className="hover:bg-blue-50 hover:text-blue-600 p-2"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4 no-flip" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateInvoice(project.id);
                        }}
                        className="hover:bg-green-50 hover:text-green-600 p-2"
                        title="فاتورة جديدة"
                      >
                        <FileText className="h-4 w-4 no-flip" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProject(project);
                        }}
                        className="hover:bg-[#182C61]/10 hover:text-[#182C61] p-2"
                        title="تعديل المشروع"
                      >
                        <Edit className="h-4 w-4 no-flip" />
                      </Button>
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
