import React from "react";
import {
  UserCheck,
  UserX,
  Calendar,
  DollarSign,
  Building2,
  Award,
  Clock,
  Eye,
  Edit,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Employee } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface EmployeesTableProps {
  employees: Employee[];
  onViewEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onPaySalary: (employee: Employee) => void;
  canPaySalary: (amount: number) => boolean;
}

export function EmployeesTable({
  employees,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onPaySalary,
  canPaySalary,
}: EmployeesTableProps) {
  const calculateMonthlySalary = (employee: Employee) => {
    const baseSalary = employee.baseSalary;
    const bonuses = (employee.dailyBonus || 0) * 22; // Assuming 22 working days
    const overtime = (employee.overtimePay || 0) * 10; // Assuming 10 overtime hours
    const deductions = employee.deductions || 0;
    return baseSalary + bonuses + overtime - deductions;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th className="py-4 px-6 text-right">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                الموظف
              </span>
            </th>
            <th className="py-4 px-6 text-right">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                المنصب
              </span>
            </th>
            <th className="py-4 px-6 text-right">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                الحالة
              </span>
            </th>
            <th className="py-4 px-6 text-right">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                تاريخ الانضمام
              </span>
            </th>
            <th className="py-4 px-6 text-right">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                الراتب الشهري
              </span>
            </th>
            <th className="py-4 px-6 text-right">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                المشروع
              </span>
            </th>
            <th className="py-4 px-6 text-center">
              <span className="text-sm font-semibold text-gray-900 arabic-spacing">
                الإجراءات
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {employees.map((employee) => {
            const monthlySalary = calculateMonthlySalary(employee);
            const canPay = canPaySalary(monthlySalary);

            return (
              <tr
                key={employee.id}
                className="hover:bg-gray-50/80 transition-colors duration-150"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div
                      className={`p-2 rounded-lg ${
                        employee.status === "active"
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {employee.status === "active" ? (
                        <UserCheck className="h-5 w-5 text-green-700 no-flip" />
                      ) : (
                        <UserX className="h-5 w-5 text-gray-500 no-flip" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 arabic-spacing">
                        {employee.name}
                      </p>
                      <div className="flex items-center mt-1 space-x-3 space-x-reverse text-xs text-gray-500">
                        {employee.dailyBonus && (
                          <span className="flex items-center">
                            <Award className="h-3.5 w-3.5 ml-1 text-yellow-600 no-flip" />
                            <span className="arabic-spacing">علاوة يومية</span>
                          </span>
                        )}
                        {employee.overtimePay && (
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 ml-1 text-blue-600 no-flip" />
                            <span className="arabic-spacing">ساعات إضافية</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-gray-900 arabic-spacing">
                    {employee.role}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      employee.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {employee.status === "active" ? "نشط" : "غير نشط"}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center text-gray-500">
                    <Calendar className="h-4 w-4 ml-2 no-flip" />
                    <span className="arabic-spacing arabic-nums">
                      {formatDate(employee.joinDate)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center text-gray-900">
                    <DollarSign className="h-4 w-4 ml-2 no-flip" />
                    <span className="font-medium arabic-spacing arabic-nums">
                      {formatCurrency(monthlySalary)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {employee.assignedProjectId ? (
                    <div className="flex items-center text-gray-500">
                      <Building2 className="h-4 w-4 ml-2 no-flip" />
                      <span className="arabic-spacing arabic-nums">
                        {employee.assignedProjectId}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm arabic-spacing">
                      -
                    </span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => onViewEmployee(employee)}
                    >
                      <Eye className="h-4 w-4 no-flip" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => onEditEmployee(employee)}
                    >
                      <Edit className="h-4 w-4 no-flip" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => onDeleteEmployee(employee)}
                    >
                      <Trash2 className="h-4 w-4 no-flip" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canPay}
                      className={`h-8 w-8 p-0 ${
                        canPay
                          ? "text-green-500 hover:text-green-700"
                          : "text-gray-300 cursor-not-allowed"
                      }`}
                      onClick={() => canPay && onPaySalary(employee)}
                    >
                      <Wallet className="h-4 w-4 no-flip" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
