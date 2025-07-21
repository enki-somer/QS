"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Building2,
  Users,
  X,
  Save,
  AlertTriangle,
  Info,
  DollarSign,
  Banknote,
  History,
  Eye,
  FileText,
  Lock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import PageNavigation from "@/components/layout/PageNavigation";
import { useSafe } from "@/contexts/SafeContext";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";

const transactionTypeLabels = {
  funding: "تمويل الخزينة",
  invoice_payment: "دفعة فاتورة مشروع",
  salary_payment: "راتب موظف",
  general_expense: "مصروف عام",
};

const transactionIcons = {
  funding: <Banknote className="h-5 w-5 no-flip" />,
  invoice_payment: <Building2 className="h-5 w-5 no-flip" />,
  salary_payment: <Users className="h-5 w-5 no-flip" />,
  general_expense: <FileText className="h-5 w-5 no-flip" />,
};

export default function SafePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { safeState, addFunding, getTransactionHistory } = useSafe();
  const { hasPermission } = useAuth();

  // Redirect silently if user doesn't have safe access (navigation should prevent this)
  useEffect(() => {
    if (!hasPermission("canViewSafe")) {
      router.replace("/");
    }
  }, [hasPermission, router]);

  // Don't render if user doesn't have access
  if (!hasPermission("canViewSafe")) {
    return null;
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingForm, setFundingForm] = useState({
    amount: "",
    description: "",
    source: "",
  });

  const transactions = getTransactionHistory();

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (transaction.projectName &&
        transaction.projectName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAddFunding = () => {
    const amount = parseFloat(fundingForm.amount);

    if (!amount || amount <= 0) {
      addToast({
        type: "error",
        title: "مبلغ غير صحيح",
        message: "يرجى إدخال مبلغ صحيح أكبر من الصفر",
      });
      return;
    }

    if (!fundingForm.description.trim()) {
      addToast({
        type: "error",
        title: "الوصف مطلوب",
        message: "يرجى إدخال وصف لعملية التمويل",
      });
      return;
    }

    const fullDescription = fundingForm.source
      ? `${fundingForm.description} - المصدر: ${fundingForm.source}`
      : fundingForm.description;

    addFunding(amount, fullDescription);

    addToast({
      type: "success",
      title: "تم تمويل الخزينة بنجاح",
      message: `تم إضافة ${formatCurrency(
        amount
      )} إلى الخزينة. الرصيد الجديد: ${formatCurrency(
        safeState.currentBalance + amount
      )}`,
    });

    setFundingForm({ amount: "", description: "", source: "" });
    setShowFundingModal(false);
  };

  const closeFundingModal = () => {
    setFundingForm({ amount: "", description: "", source: "" });
    setShowFundingModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Navigation */}
      <PageNavigation />

      {/* Page Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 arabic-spacing">
            إدارة الخزينة
          </h1>
          <p className="text-gray-600 arabic-spacing leading-relaxed">
            مركز التحكم المالي - جميع المعاملات والأموال تمر عبر الخزينة
          </p>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
            <span className="flex items-center space-x-1 space-x-reverse">
              <History className="h-4 w-4 no-flip" />
              <span className="arabic-spacing">
                {transactions.length} معاملة
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 gap-2 space-x-reverse">
          <Button variant="outline">
            <Calendar className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">التقرير الشهري</span>
          </Button>
          <Button
            onClick={() => setShowFundingModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Plus className="h-4 w-4 ml-2 no-flip" />
            <span className="arabic-spacing">تمويل الخزينة</span>
          </Button>
        </div>
      </div>

      {/* Balance Alert */}
      {safeState.currentBalance <= 0 && (
        <Card className="shadow-lg border-0 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 no-flip" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 arabic-spacing mb-2">
                  الخزينة فارغة - يحتاج تمويل فوري
                </h3>
                <p className="text-red-700 arabic-spacing mb-4 leading-relaxed">
                  لا يمكن إنشاء فواتير أو دفع رواتب أو مصروفات بدون رصيد في
                  الخزينة. قم بتمويل الخزينة أولاً.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  الرصيد الحالي
                </p>
                <p
                  className={`text-3xl font-bold ${
                    safeState.currentBalance > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(safeState.currentBalance)}
                </p>
                <div className="flex items-center text-sm">
                  <Wallet className="h-4 w-4 ml-1 no-flip" />
                  <span
                    className={`arabic-spacing ${
                      safeState.currentBalance > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {safeState.currentBalance > 0
                      ? "متاح للإنفاق"
                      : "يحتاج تمويل"}
                  </span>
                </div>
              </div>
              <div
                className={`p-4 rounded-xl shadow-lg ${
                  safeState.currentBalance > 0
                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                    : "bg-gradient-to-br from-red-500 to-red-600"
                }`}
              >
                <DollarSign className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي التمويل
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(safeState.totalFunded)}
                </p>
                <div className="flex items-center text-sm text-blue-600">
                  <ArrowUpRight className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">أموال مضافة</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  إجمالي الإنفاق
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(safeState.totalSpent)}
                </p>
                <div className="flex items-center text-sm text-red-600">
                  <ArrowDownRight className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">مبالغ منفقة</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg">
                <TrendingDown className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 arabic-spacing">
                  عدد المعاملات
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {transactions.length}
                </p>
                <div className="flex items-center text-sm text-purple-600">
                  <History className="h-4 w-4 ml-1 no-flip" />
                  <span className="arabic-spacing">جميع المعاملات</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-4 rounded-xl shadow-lg">
                <History className="h-8 w-8 text-white no-flip" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 no-flip" />
                <Input
                  placeholder="ابحث في المعاملات والمشاريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 h-12 text-base arabic-spacing border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Filter className="h-5 w-5 text-gray-500 no-flip" />
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-12 rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 arabic-spacing min-w-[180px]"
                >
                  <option value="all">جميع المعاملات</option>
                  <option value="funding">التمويل فقط</option>
                  <option value="invoice_payment">الفواتير فقط</option>
                  <option value="salary_payment">الرواتب فقط</option>
                  <option value="general_expense">المصروفات فقط</option>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <History className="h-6 w-6 ml-2 text-blue-600 no-flip" />
            سجل المعاملات المالية
          </CardTitle>
          <CardDescription className="arabic-spacing">
            جميع حركات الأموال الداخلة والخارجة من الخزينة مع التفاصيل الكاملة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-6 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div
                      className={`p-3 rounded-full ${
                        transaction.amount > 0
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transactionIcons[transaction.type] || (
                        <FileText className="h-5 w-5 no-flip" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <h4 className="font-semibold text-gray-900 arabic-spacing">
                          {transaction.description}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 arabic-spacing">
                          {transactionTypeLabels[transaction.type]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                        <span className="arabic-nums">
                          {formatDate(transaction.date)}
                        </span>
                        {transaction.projectName && (
                          <span className="arabic-spacing">
                            المشروع: {transaction.projectName}
                          </span>
                        )}
                        {transaction.invoiceNumber && (
                          <span className="arabic-spacing">
                            فاتورة: {transaction.invoiceNumber}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span className="arabic-spacing">
                          الرصيد السابق:{" "}
                          {formatCurrency(transaction.previousBalance)}
                        </span>
                        <span className="arabic-spacing">
                          الرصيد الجديد:{" "}
                          {formatCurrency(transaction.newBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p
                      className={`text-2xl font-bold ${
                        transaction.amount > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="h-12 w-12 text-gray-400 no-flip" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
                {searchQuery || typeFilter !== "all"
                  ? "لا توجد معاملات تطابق البحث"
                  : "لا توجد معاملات بعد"}
              </h3>
              <p className="text-gray-500 mb-8 arabic-spacing text-lg leading-relaxed max-w-md mx-auto">
                {searchQuery || typeFilter !== "all"
                  ? "جرب تعديل معايير البحث أو الفلاتر"
                  : "ابدأ بتمويل الخزينة لتتمكن من إنشاء الفواتير ودفع الرواتب والمصروفات"}
              </p>
              {!searchQuery && typeFilter === "all" && (
                <Button
                  onClick={() => setShowFundingModal(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Plus className="h-5 w-5 ml-2 no-flip" />
                  <span className="arabic-spacing">تمويل الخزينة الآن</span>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funding Modal */}
      {showFundingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse text-white">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Banknote className="h-6 w-6 no-flip" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold arabic-spacing">
                      تمويل الخزينة
                    </h3>
                    <p className="text-green-100 arabic-spacing text-sm">
                      إضافة أموال جديدة إلى الخزينة مع تسجيل كامل
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeFundingModal}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4 no-flip" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 flex-1 overflow-y-auto scroll-smooth">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 space-x-reverse text-blue-800">
                  <Info className="h-5 w-5 no-flip" />
                  <span className="font-medium arabic-spacing">
                    الرصيد الحالي:
                  </span>
                  <span className="font-bold">
                    {formatCurrency(safeState.currentBalance)}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-base font-semibold text-gray-800 arabic-spacing">
                    مبلغ التمويل (بالدينار العراقي) *
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={fundingForm.amount}
                    onChange={(e) =>
                      setFundingForm({ ...fundingForm, amount: e.target.value })
                    }
                    className="h-12 text-base"
                    placeholder="1000000"
                  />
                  {fundingForm.amount && (
                    <p className="text-green-600 text-sm font-medium">
                      💰{" "}
                      {new Intl.NumberFormat("ar-IQ").format(
                        Number(fundingForm.amount)
                      )}{" "}
                      دينار عراقي
                    </p>
                  )}
                  {fundingForm.amount && (
                    <p className="text-blue-600 text-sm">
                      الرصيد بعد التمويل:{" "}
                      {formatCurrency(
                        safeState.currentBalance +
                          (parseFloat(fundingForm.amount) || 0)
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-base font-semibold text-gray-800 arabic-spacing">
                    وصف التمويل *
                  </label>
                  <Input
                    value={fundingForm.description}
                    onChange={(e) =>
                      setFundingForm({
                        ...fundingForm,
                        description: e.target.value,
                      })
                    }
                    className="h-12 text-base arabic-spacing"
                    placeholder="مثال: رأس مال المشروع الابتدائي"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base font-semibold text-gray-800 arabic-spacing">
                    مصدر التمويل (اختياري)
                  </label>
                  <Input
                    value={fundingForm.source}
                    onChange={(e) =>
                      setFundingForm({ ...fundingForm, source: e.target.value })
                    }
                    className="h-12 text-base arabic-spacing"
                    placeholder="مثال: بنك الرشيد، استثمار شخصي، قرض تجاري"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <AlertTriangle className="h-5 w-5 text-amber-600 no-flip flex-shrink-0 mt-0.5" />
                  <div className="text-amber-800 text-sm arabic-spacing leading-relaxed">
                    <p className="font-medium mb-1">تنبيه مهم:</p>
                    <p>
                      سيتم تسجيل هذا التمويل بشكل دائم في سجل المعاملات مع
                      التاريخ والوقت. تأكد من صحة المبلغ والوصف قبل الحفظ.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 arabic-spacing">
                  <span className="font-medium">ملاحظة:</span> ستتم إضافة المبلغ
                  فوراً إلى رصيد الخزينة
                </div>

                <div className="flex space-x-4 space-x-reverse">
                  <Button
                    variant="outline"
                    onClick={closeFundingModal}
                    className="px-6 py-3 text-base"
                  >
                    <span className="arabic-spacing">إلغاء</span>
                  </Button>

                  <Button
                    onClick={handleAddFunding}
                    disabled={
                      !fundingForm.amount || !fundingForm.description.trim()
                    }
                    className="px-6 py-3 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                  >
                    <Save className="h-5 w-5 ml-2 no-flip" />
                    <span className="arabic-spacing">تأكيد التمويل</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
