"use client";

import React from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Building2,
  Hash,
  FileText,
  CreditCard,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Employee } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useEmployee } from "@/contexts/EmployeeContext";

interface EmployeeViewModalProps {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
}

export function EmployeeViewModal({
  employee,
  onClose,
  onEdit,
}: EmployeeViewModalProps) {
  const { calculateMonthlySalary } = useEmployee();
  const salary = calculateMonthlySalary(employee);

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      active: { label: "نشط", color: "text-green-600 bg-green-50" },
      inactive: { label: "غير نشط", color: "text-yellow-600 bg-yellow-50" },
      terminated: { label: "منتهي الخدمة", color: "text-red-600 bg-red-50" },
    };
    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
    );
  };

  const statusInfo = getStatusInfo(employee.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-transparent bg-opacity-20 p-2 rounded-lg">
                <User className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-xl font-bold arabic-spacing">
                  معلومات الموظف
                </h2>
                <p className="text-blue-100 text-sm arabic-spacing">
                  تفاصيل {employee.name}
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <User className="h-5 w-5 ml-2 text-blue-600 no-flip" />
              البيانات الأساسية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <User className="h-4 w-4 text-gray-600 no-flip" />
                  <span className="text-sm font-medium text-gray-600 arabic-spacing">
                    الاسم الكامل
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 arabic-spacing">
                  {employee.name}
                </p>
              </div>

              {/* Age */}
              {employee.age && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Hash className="h-4 w-4 text-gray-600 no-flip" />
                    <span className="text-sm font-medium text-gray-600 arabic-spacing">
                      العمر
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {employee.age} سنة
                  </p>
                </div>
              )}

              {/* Position */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <Building2 className="h-4 w-4 text-gray-600 no-flip" />
                  <span className="text-sm font-medium text-gray-600 arabic-spacing">
                    المنصب الوظيفي
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 arabic-spacing">
                  {employee.position || "غير محدد"}
                </p>
              </div>

              {/* Department */}
              {employee.department && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Building2 className="h-4 w-4 text-gray-600 no-flip" />
                    <span className="text-sm font-medium text-gray-600 arabic-spacing">
                      القسم
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 arabic-spacing">
                    {employee.department}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <Phone className="h-5 w-5 ml-2 text-green-600 no-flip" />
              معلومات الاتصال
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mobile Number */}
              {employee.mobile_number && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Phone className="h-4 w-4 text-gray-600 no-flip" />
                    <span className="text-sm font-medium text-gray-600 arabic-spacing">
                      رقم الهاتف
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {employee.mobile_number}
                  </p>
                </div>
              )}

              {/* Email  
               {employee.email && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Mail className="h-4 w-4 text-gray-600 no-flip" />
                    <span className="text-sm font-medium text-gray-600 arabic-spacing">
                      البريد الإلكتروني
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {employee.email}
                  </p>
                </div>
              )}
              */}
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
              <DollarSign className="h-5 w-5 ml-2 text-purple-600 no-flip" />
              معلومات التوظيف
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Salary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <DollarSign className="h-4 w-4 text-green-600 no-flip" />
                  <span className="text-sm font-medium text-green-700 arabic-spacing">
                    الراتب الشهري
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(salary)}
                </p>
              </div>

              {/* Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <Clock className="h-4 w-4 text-gray-600 no-flip" />
                  <span className="text-sm font-medium text-gray-600 arabic-spacing">
                    حالة الموظف
                  </span>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* Hire Date */}
              {employee.hire_date && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Calendar className="h-4 w-4 text-gray-600 no-flip" />
                    <span className="text-sm font-medium text-gray-600 arabic-spacing">
                      تاريخ التوظيف
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(employee.hire_date).toLocaleDateString("en-US")}
                  </p>
                </div>
              )}

              {/* Last Payment */}
              {employee.last_payment_date && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <CreditCard className="h-4 w-4 text-gray-600 no-flip" />
                    <span className="text-sm font-medium text-gray-600 arabic-spacing">
                      آخر دفعة راتب
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(employee.last_payment_date).toLocaleDateString(
                      "en-US"
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {employee.notes && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <FileText className="h-5 w-5 ml-2 text-gray-600 no-flip" />
                ملاحظات
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 arabic-spacing leading-relaxed">
                  {employee.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-4 py-4 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              إغلاق
            </Button>
            <Button
              onClick={onEdit}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
            >
              <User className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">تعديل البيانات</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
