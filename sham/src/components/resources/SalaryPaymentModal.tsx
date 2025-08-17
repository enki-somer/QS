"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  DollarSign,
  Calculator,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Banknote,
  CreditCard,
  Clock,
  User,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Employee } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { useSafe } from "@/contexts/SafeContext";
import { useEmployee } from "@/contexts/EmployeeContext";
import { SalaryPaymentInvoice } from "./SalaryPaymentInvoice";

interface SalaryPaymentModalProps {
  employee: Employee;
  onClose: () => void;
  onPaymentComplete: () => void;
}

interface PaymentCalculation {
  baseSalary: number;
  installmentAmount: number;
  totalDue: number;
  paymentAmount: number;
  remainingBalance: number;
  isFullPayment: boolean;
}

export function SalaryPaymentModal({
  employee,
  onClose,
  onPaymentComplete,
}: SalaryPaymentModalProps) {
  const { addToast } = useToast();
  const { safeState, deductForSalary } = useSafe();
  const {
    processSalaryPayment,
    calculateMonthlySalary,
    calculateRemainingSalary,
  } = useEmployee();

  const [paymentType, setPaymentType] = useState<"full" | "installment">(
    "full"
  );
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [paymentReason, setPaymentReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [calculation, setCalculation] = useState<PaymentCalculation | null>(
    null
  );

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "0 د.ع";
    }
    return amount.toLocaleString("en-US") + " د.ع";
  };

  // Calculate payment details
  useEffect(() => {
    const calculatePaymentDetails = async () => {
      const baseSalary = employee.monthly_salary || 0;

      // Validate base salary
      if (isNaN(baseSalary) || baseSalary <= 0) {
        console.warn(
          "Invalid base salary for employee:",
          employee.name,
          baseSalary
        );
        setCalculation({
          baseSalary: 0,
          installmentAmount: 0,
          totalDue: 0,
          paymentAmount: 0,
          remainingBalance: 0,
          isFullPayment: true,
        });
        return;
      }

      const totalDue = await calculateRemainingSalary(employee);

      // Validate totalDue
      const validTotalDue = isNaN(totalDue) ? baseSalary : totalDue;

      let paymentAmount = 0;
      let installmentAmt = 0;
      let isFullPayment = true;

      if (paymentType === "full") {
        paymentAmount = validTotalDue;
        isFullPayment = true;
      } else {
        installmentAmt = parseInt(installmentAmount.replace(/,/g, "")) || 0;
        paymentAmount = Math.min(installmentAmt, validTotalDue);
        isFullPayment = paymentAmount >= validTotalDue;
      }

      const remainingBalance = Math.max(0, validTotalDue - paymentAmount);

      setCalculation({
        baseSalary,
        installmentAmount: installmentAmt,
        totalDue: validTotalDue,
        paymentAmount,
        remainingBalance,
        isFullPayment,
      });
    };

    calculatePaymentDetails();
  }, [employee, paymentType, installmentAmount, calculateRemainingSalary]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleInstallmentAmountChange = (value: string) => {
    // Remove any non-digit characters
    const cleanValue = value.replace(/[^0-9]/g, "");
    // Add commas for thousands
    const formattedValue = cleanValue
      ? parseInt(cleanValue).toLocaleString("en-US")
      : "";
    setInstallmentAmount(formattedValue);
  };

  const validatePayment = (): boolean => {
    if (!calculation) return false;

    // Check if safe has sufficient balance
    if (calculation.paymentAmount > safeState.currentBalance) {
      addToast({
        type: "error",
        title: "رصيد غير كافي",
        message: `رصيد الخزنة الحالي ${formatCurrency(
          safeState.currentBalance
        )} غير كافي لدفع ${formatCurrency(calculation.paymentAmount)}`,
      });
      return false;
    }

    // Check minimum installment amount
    if (
      paymentType === "installment" &&
      calculation.installmentAmount < 50000
    ) {
      addToast({
        type: "error",
        title: "مبلغ القسط قليل",
        message: "الحد الأدنى للقسط هو 50,000 دينار عراقي",
      });
      return false;
    }

    // Check if installment amount exceeds total due
    if (
      paymentType === "installment" &&
      calculation.installmentAmount > calculation.totalDue
    ) {
      addToast({
        type: "warning",
        title: "مبلغ القسط أكبر من المستحق",
        message: "سيتم دفع المبلغ المستحق كاملاً",
      });
    }

    return true;
  };

  const handlePaymentSubmit = async () => {
    if (!calculation || !validatePayment()) return;

    setIsProcessing(true);

    try {
      // Process salary payment through employee service
      const result = await processSalaryPayment(employee.id, {
        amount: calculation.paymentAmount,
        payment_type: paymentType,
        installment_amount:
          paymentType === "installment"
            ? calculation.installmentAmount
            : undefined,
        reason: paymentReason.trim() || undefined,
        is_full_payment: calculation.isFullPayment,
      });

      // Deduct from safe with reason
      await deductForSalary(
        calculation.paymentAmount,
        employee.name,
        paymentReason.trim() ||
          `${paymentType === "full" ? "دفع كامل" : "قسط"} - ${formatCurrency(
            calculation.paymentAmount
          )}`,
        employee.id
      );

      // Generate invoice number
      const invoiceNumber = `SAL-${Date.now()}-${employee.id.slice(-4)}`;

      // Prepare payment result for invoice
      const paymentData = {
        amount: calculation.paymentAmount,
        payment_type: paymentType,
        installment_amount:
          paymentType === "installment"
            ? calculation.installmentAmount
            : undefined,
        reason: paymentReason.trim() || undefined,
        is_full_payment: calculation.isFullPayment,
        payment_date: new Date().toISOString(),
        invoice_number: invoiceNumber,
      };

      setPaymentResult(paymentData);

      addToast({
        type: "success",
        title: "تم دفع الراتب بنجاح",
        message: `تم دفع ${formatCurrency(calculation.paymentAmount)} لـ ${
          employee.name
        }`,
      });

      // Show invoice instead of closing immediately
      setShowConfirmation(false);
      setShowInvoice(true);

      // Call onPaymentComplete to refresh data but don't close modal yet
      // onPaymentComplete will be called when invoice is closed
    } catch (error) {
      console.error("Error processing salary payment:", error);
      addToast({
        type: "error",
        title: "خطأ في دفع الراتب",
        message: "حدث خطأ أثناء معالجة دفع الراتب. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = () => {
    if (validatePayment()) {
      setShowConfirmation(true);
    }
  };

  if (!calculation) {
    return null;
  }

  // Show invoice if payment is completed
  if (showInvoice && paymentResult) {
    return (
      <SalaryPaymentInvoice
        employee={employee}
        paymentData={paymentResult}
        onClose={() => {
          setShowInvoice(false);
          setPaymentResult(null);
          onPaymentComplete();
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 overflow-hidden"
      style={{ zIndex: 99999 }}
      onClick={onClose}
      onWheel={(e) => e.preventDefault()}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative pointer-events-auto"
        style={{ zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-5 text-white shadow-lg relative">
          {/* Simple background overlay */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div>
                <h2 className="text-2xl font-bold arabic-spacing mb-1 ">
                  دفع راتب الموظف
                </h2>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    <p className="text-black text-sm arabic-spacing font-medium ">
                      {employee.name}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-15 px-3 py-1 rounded-full">
                    <p className="text-black text-xs arabic-spacing">
                      {employee.position || "غير محدد"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
            >
              <X className="h-6 w-6 no-flip" />
            </Button>
          </div>
        </div>

        {!showConfirmation ? (
          /* Payment Form */
          <div
            className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto pointer-events-auto"
            style={{ maxHeight: "calc(90vh - 140px)" }}
          >
            {/* Enhanced Employee Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4 flex items-center">
                <div className="bg-blue-500 p-2 rounded-lg ml-3">
                  <User className="h-5 w-5 text-white no-flip" />
                </div>
                معلومات الموظف
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">الاسم الكامل</div>
                  <div className="font-semibold text-gray-900">
                    {employee.name}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">
                    المنصب الوظيفي
                  </div>
                  <div className="font-semibold text-gray-900">
                    {employee.position || "غير محدد"}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">القسم</div>
                  <div className="font-semibold text-gray-900">
                    {employee.department || "غير محدد"}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">آخر دفعة</div>
                  <div className="font-semibold text-gray-900">
                    {employee.last_payment_date
                      ? new Date(employee.last_payment_date).toLocaleDateString(
                          "en-US"
                        )
                      : "لم يتم الدفع بعد"}
                  </div>
                </div>
              </div>
            </div>

            {/* Safe Balance Warning */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-blue-600 ml-2 no-flip" />
                <span className="text-sm font-medium text-blue-800 arabic-spacing">
                  رصيد الخزنة الحالي: {formatCurrency(safeState.currentBalance)}
                </span>
              </div>
            </div>

            {/* Enhanced Payment Type Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 arabic-spacing flex items-center">
                <div className="bg-green-500 p-2 rounded-lg ml-3">
                  <Calculator className="h-5 w-5 text-white no-flip" />
                </div>
                نوع الدفع
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentType("full")}
                  className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                    paymentType === "full"
                      ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 text-green-700 shadow-lg shadow-green-100"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50 bg-white"
                  }`}
                >
                  <div
                    className={`p-3 rounded-full mx-auto mb-3 w-fit ${
                      paymentType === "full"
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <CheckCircle className="h-6 w-6 no-flip" />
                  </div>
                  <div className="text-sm font-bold arabic-spacing mb-1">
                    دفع كامل
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    دفع الراتب كاملاً
                  </div>
                  {paymentType === "full" && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ محدد
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("installment")}
                  className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                    paymentType === "installment"
                      ? "border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-700 shadow-lg shadow-orange-100"
                      : "border-gray-200 hover:border-orange-300 hover:bg-orange-50 bg-white"
                  }`}
                >
                  <div
                    className={`p-3 rounded-full mx-auto mb-3 w-fit ${
                      paymentType === "installment"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <CreditCard className="h-6 w-6 no-flip" />
                  </div>
                  <div className="text-sm font-bold arabic-spacing mb-1">
                    دفع على أقساط
                  </div>
                  <div className="text-xs text-gray-500 arabic-spacing">
                    دفع جزء من الراتب
                  </div>
                  {paymentType === "installment" && (
                    <div className="mt-2 text-xs text-orange-600 font-medium">
                      ✓ محدد
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Installment Amount Input */}
            {paymentType === "installment" && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                  مبلغ القسط *
                  <span className="text-xs text-gray-500 mr-2">
                    (دينار عراقي)
                  </span>
                </label>
                <div className="relative">
                  <Banknote className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-600 no-flip" />
                  <Input
                    type="text"
                    value={installmentAmount}
                    onChange={(e) =>
                      handleInstallmentAmountChange(e.target.value)
                    }
                    placeholder="500,000"
                    className="pr-12 text-lg font-semibold text-green-700 bg-green-50 border-green-200 focus:border-green-400 focus:ring-green-400"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-green-600">
                    د.ع
                  </div>
                </div>
                <p className="text-xs text-gray-500 arabic-spacing">
                  الحد الأدنى: 50,000 دينار عراقي
                </p>
              </div>
            )}

            {/* Payment Reason */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 arabic-spacing">
                سبب الدفع (اختياري)
              </label>
              <textarea
                value={paymentReason}
                onChange={(e) => setPaymentReason(e.target.value)}
                placeholder="مثال: راتب شهر أغسطس، دفعة مقدمة، تسوية مستحقات..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none arabic-spacing"
              />
            </div>

            {/* Enhanced Payment Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-green-800 arabic-spacing mb-4 flex items-center">
                <div className="bg-green-500 p-2 rounded-lg ml-3">
                  <Receipt className="h-5 w-5 text-white no-flip" />
                </div>
                ملخص الدفع
              </h4>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 flex justify-between items-center shadow-sm">
                  <span className="text-gray-600 font-medium">
                    الراتب الأساسي:
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(calculation.baseSalary)}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 flex justify-between items-center shadow-sm">
                  <span className="text-gray-600 font-medium">
                    إجمالي المستحق:
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(calculation.totalDue)}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-bold text-lg">
                      💰 المبلغ المدفوع:
                    </span>
                    <span className="font-bold text-green-700 text-xl">
                      {formatCurrency(calculation.paymentAmount)}
                    </span>
                  </div>
                </div>
                {calculation.remainingBalance > 0 && (
                  <div className="bg-orange-50 rounded-lg p-3 flex justify-between items-center border border-orange-200">
                    <span className="text-orange-600 font-medium">
                      ⏳ المتبقي:
                    </span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(calculation.remainingBalance)}
                    </span>
                  </div>
                )}
                <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center border border-blue-200">
                  <span className="text-blue-600 font-medium">
                    🏦 رصيد الخزنة بعد الدفع:
                  </span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(
                      safeState.currentBalance - calculation.paymentAmount
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessing || calculation.paymentAmount <= 0}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800"
              >
                <DollarSign className="h-4 w-4 ml-2 no-flip" />
                <span className="arabic-spacing">تأكيد الدفع</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation Screen with Invoice Preview */
          <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto pointer-events-auto">
            {/* Invoice Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="text-center mb-6">
                <div className="bg-blue-500 p-3 rounded-full w-fit mx-auto mb-3">
                  <Receipt className="h-6 w-6 text-white no-flip" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 arabic-spacing mb-2">
                  معاينة فاتورة دفع الراتب
                </h3>
                <p className="text-blue-600 text-sm arabic-spacing">
                  رقم الفاتورة: SAL-{Date.now()}-{employee.id.slice(-4)}
                </p>
              </div>

              {/* Employee & Payment Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-900 arabic-spacing mb-3 flex items-center">
                    <User className="h-4 w-4 ml-2 text-blue-600 no-flip" />
                    بيانات الموظف
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">الاسم:</span>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">المنصب:</span>
                      <span className="font-medium">
                        {employee.position || "غير محدد"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">القسم:</span>
                      <span className="font-medium">
                        {employee.department || "غير محدد"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-900 arabic-spacing mb-3 flex items-center">
                    <Calendar className="h-4 w-4 ml-2 text-green-600 no-flip" />
                    تفاصيل الدفع
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">التاريخ:</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString("en-US")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">نوع الدفع:</span>
                      <span className="font-medium">
                        {paymentType === "full" ? "دفع كامل" : "قسط"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">حالة الدفع:</span>
                      <span className="font-medium text-green-600">
                        {calculation.isFullPayment ? "مكتمل" : "جزئي"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-gray-900 arabic-spacing mb-3 flex items-center">
                  <Banknote className="h-4 w-4 ml-2 text-green-600 no-flip" />
                  ملخص المبالغ
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">الراتب الأساسي:</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.baseSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">إجمالي المستحق:</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.totalDue)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 rounded-lg px-3 border-2 border-green-200">
                    <span className="text-green-700 font-bold">
                      💰 المبلغ المراد دفعه:
                    </span>
                    <span className="font-bold text-green-700 text-lg">
                      {formatCurrency(calculation.paymentAmount)}
                    </span>
                  </div>
                  {calculation.remainingBalance > 0 && (
                    <div className="flex justify-between py-2 text-orange-600">
                      <span className="font-medium">المبلغ المتبقي:</span>
                      <span className="font-semibold">
                        {formatCurrency(calculation.remainingBalance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {paymentReason && (
                <div className="bg-white rounded-lg p-4 shadow-sm mt-4">
                  <h4 className="font-semibold text-gray-900 arabic-spacing mb-2">
                    ملاحظات:
                  </h4>
                  <p className="text-gray-700 arabic-spacing">
                    {paymentReason}
                  </p>
                </div>
              )}

              {/* Preview Actions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-800 arabic-spacing mb-3 flex items-center">
                  <Receipt className="h-4 w-4 ml-2 text-blue-600 no-flip" />
                  خيارات الفاتورة
                </h4>
                <div className="flex items-center justify-center space-x-3 space-x-reverse">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Generate preview invoice for printing
                      const previewData = {
                        amount: calculation.paymentAmount,
                        payment_type: paymentType,
                        installment_amount:
                          paymentType === "installment"
                            ? calculation.installmentAmount
                            : undefined,
                        reason: paymentReason.trim() || undefined,
                        is_full_payment: calculation.isFullPayment,
                        payment_date: new Date().toISOString(),
                        invoice_number: `SAL-PREVIEW-${Date.now()}-${employee.id.slice(
                          -4
                        )}`,
                      };

                      // Create temporary invoice for preview
                      const tempInvoiceContent = document.createElement("div");
                      tempInvoiceContent.innerHTML = `
                        <div style="max-width: 800px; margin: 20px auto; padding: 20px; font-family: Arial, sans-serif; direction: rtl;">
                          <div style="text-center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
                            <h1 style="font-size: 2rem; font-weight: bold; color: #111827; margin-bottom: 10px;">شركة قصر الشام</h1>
                            <p style="color: #6b7280;">نظام إدارة الموارد البشرية والمالية</p>
                            <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; margin-top: 15px; display: inline-block;">
                              <span style="color: #15803d; font-weight: 600;">معاينة فاتورة دفع راتب</span>
                            </div>
                          </div>
                          
                          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                            <div>
                              <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 15px;">بيانات الموظف</h3>
                              <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                  <span style="color: #6b7280;">الاسم:</span>
                                  <span style="font-weight: 500;">${
                                    employee.name
                                  }</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                  <span style="color: #6b7280;">المنصب:</span>
                                  <span style="font-weight: 500;">${
                                    employee.position || "غير محدد"
                                  }</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                  <span style="color: #6b7280;">القسم:</span>
                                  <span style="font-weight: 500;">${
                                    employee.department || "غير محدد"
                                  }</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 15px;">تفاصيل الدفع</h3>
                              <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                  <span style="color: #6b7280;">رقم الفاتورة:</span>
                                  <span style="font-weight: 500;">${
                                    previewData.invoice_number
                                  }</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                  <span style="color: #6b7280;">التاريخ:</span>
                                  <span style="font-weight: 500;">${new Date().toLocaleDateString(
                                    "en-US"
                                  )}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                  <span style="color: #6b7280;">نوع الدفع:</span>
                                  <span style="font-weight: 500;">${
                                    paymentType === "full" ? "دفع كامل" : "قسط"
                                  }</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
                            <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 15px;">ملخص المبالغ</h3>
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #d1d5db;">
                              <span style="color: #6b7280;">الراتب الأساسي:</span>
                              <span style="font-weight: 500;">${formatCurrency(
                                calculation.baseSalary
                              )}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #d1d5db;">
                              <span style="color: #6b7280;">إجمالي المستحق:</span>
                              <span style="font-weight: 500;">${formatCurrency(
                                calculation.totalDue
                              )}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 15px; background: #dcfce7; border-radius: 8px; margin-top: 10px; border: 2px solid #bbf7d0;">
                              <span style="color: #15803d; font-weight: bold; font-size: 1.125rem;">💰 المبلغ المدفوع:</span>
                              <span style="color: #15803d; font-weight: bold; font-size: 1.25rem;">${formatCurrency(
                                calculation.paymentAmount
                              )}</span>
                            </div>
                            ${
                              calculation.remainingBalance > 0
                                ? `
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #ea580c;">
                              <span style="font-weight: 500;">المبلغ المتبقي:</span>
                              <span style="font-weight: 600;">${formatCurrency(
                                calculation.remainingBalance
                              )}</span>
                            </div>
                            `
                                : ""
                            }
                          </div>
                          
                          ${
                            paymentReason
                              ? `
                          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-top: 20px;">
                            <h4 style="font-weight: 600; color: #111827; margin-bottom: 8px;">ملاحظات:</h4>
                            <p style="color: #374151;">${paymentReason}</p>
                          </div>
                          `
                              : ""
                          }
                        </div>
                      `;

                      // Print the preview
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html dir="rtl" lang="ar">
                          <head>
                            <meta charset="UTF-8">
                            <title>معاينة فاتورة راتب - ${employee.name}</title>
                            <style>
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
                              @media print { body { print-color-adjust: exact; } }
                            </style>
                          </head>
                          <body>
                            ${tempInvoiceContent.innerHTML}
                          </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                          printWindow.close();
                        }, 500);
                      }
                    }}
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Receipt className="h-4 w-4 ml-2 no-flip" />
                    معاينة وطباعة الفاتورة
                  </Button>
                </div>
                <p className="text-center text-xs text-blue-600 mt-2 arabic-spacing">
                  يمكنك معاينة الفاتورة قبل تأكيد الدفع
                </p>
              </div>
            </div>

            {/* Confirmation Question */}
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 no-flip" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 arabic-spacing mb-2">
                تأكيد دفع الراتب
              </h3>
              <p className="text-sm text-gray-600 arabic-spacing">
                هل أنت متأكد من دفع {formatCurrency(calculation.paymentAmount)}{" "}
                لـ {employee.name}؟
                <br />
                <span className="text-xs text-gray-500">
                  سيتم خصم المبلغ من الخزينة وطباعة الفاتورة
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isProcessing}
              >
                تراجع للتعديل
              </Button>

              <Button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={isProcessing}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800"
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 ml-2 animate-spin no-flip" />
                    <span className="arabic-spacing">جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 ml-2 no-flip" />
                    <span className="arabic-spacing">
                      تأكيد الدفع وطباعة الفاتورة
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
