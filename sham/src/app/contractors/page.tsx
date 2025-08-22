"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Phone,
  User,
  Building,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Save,
  X,
  Users,
  CheckCircle,
  Clock,
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
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";
import PageNavigation from "@/components/layout/PageNavigation";
import { useContractors } from "@/contexts/ContractorContext";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { Contractor, ContractorFormData } from "@/types";

// Contractor categories - English values for database, Arabic labels for display
const contractorCategories = [
  { value: "main_contractor", label: "مقاول أساسي" },
  { value: "sub_contractor", label: "مقاول فرعي" },
  { value: "building_materials_supplier", label: "مورد مواد البناء" },
  { value: "equipment_supplier", label: "مورد معدات" },
  { value: "transport_services", label: "خدمات نقل" },
  { value: "engineering_consultant", label: "استشاري هندسي" },
  { value: "specialized_technical_services", label: "خدمات فنية متخصصة" },
  { value: "other", label: "أخرى" },
];

// Create a mapping for easy lookup of Arabic labels
const categoryLabels: { [key: string]: string } = {
  main_contractor: "مقاول أساسي",
  sub_contractor: "مقاول فرعي",
  building_materials_supplier: "مورد مواد البناء",
  equipment_supplier: "مورد معدات",
  transport_services: "خدمات نقل",
  engineering_consultant: "استشاري هندسي",
  specialized_technical_services: "خدمات فنية متخصصة",
  other: "أخرى",
};

const categoryIcons = {
  main_contractor: <Building className="h-5 w-5 no-flip" />,
  sub_contractor: <Users className="h-5 w-5 no-flip" />,
  building_materials_supplier: <Building className="h-5 w-5 no-flip" />,
  equipment_supplier: <Building className="h-5 w-5 no-flip" />,
  transport_services: <Building className="h-5 w-5 no-flip" />,
  engineering_consultant: <User className="h-5 w-5 no-flip" />,
  specialized_technical_services: <Building className="h-5 w-5 no-flip" />,
  other: <Building className="h-5 w-5 no-flip" />,
};

export default function ContractorsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const permissions = useUIPermissions();
  const {
    contractors,
    isLoading,
    error,
    addContractor,
    updateContractor,
    deleteContractor,
    activateContractor,
    searchContractors,
  } = useContractors();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedContractor, setSelectedContractor] =
    useState<Contractor | null>(null);

  const [contractorForm, setContractorForm] = useState<ContractorFormData>({
    full_name: "",
    phone_number: "",
    category: "",
    notes: "",
  });

  // Filter contractors based on search and category
  const filteredContractors = React.useMemo(() => {
    let result = searchQuery ? searchContractors(searchQuery) : contractors;

    if (categoryFilter !== "all") {
      result = result.filter(
        (contractor) => contractor.category === categoryFilter
      );
    }

    return result;
  }, [contractors, searchQuery, categoryFilter, searchContractors]);

  // Handle add contractor
  const handleAddContractor = async () => {
    if (!contractorForm.full_name.trim()) {
      addToast({
        type: "error",
        title: "الاسم الكامل مطلوب",
        message: "يرجى إدخال الاسم الكامل للمقاول",
      });
      return;
    }

    if (!contractorForm.phone_number.trim()) {
      addToast({
        type: "error",
        title: "رقم الهاتف مطلوب",
        message: "يرجى إدخال رقم هاتف المقاول",
      });
      return;
    }

    if (!contractorForm.category) {
      addToast({
        type: "error",
        title: "الفئة مطلوبة",
        message: "يرجى اختيار فئة المقاول",
      });
      return;
    }

    const success = await addContractor(contractorForm);

    if (success) {
      addToast({
        type: "success",
        title: "تم إضافة المقاول بنجاح",
        message: `تم إضافة ${contractorForm.full_name} إلى قائمة المقاولين`,
      });

      setContractorForm({
        full_name: "",
        phone_number: "",
        category: "",
        notes: "",
      });
      setShowAddModal(false);
    } else {
      addToast({
        type: "error",
        title: "فشل في إضافة المقاول",
        message: error || "حدث خطأ أثناء إضافة المقاول",
      });
    }
  };

  // Handle edit contractor
  const handleEditContractor = async () => {
    if (!selectedContractor) return;

    const success = await updateContractor(
      selectedContractor.id,
      contractorForm
    );

    if (success) {
      addToast({
        type: "success",
        title: "تم تحديث بيانات المقاول",
        message: `تم تحديث بيانات ${contractorForm.full_name} بنجاح`,
      });

      setShowEditModal(false);
      setSelectedContractor(null);
      setContractorForm({
        full_name: "",
        phone_number: "",
        category: "",
        notes: "",
      });
    } else {
      addToast({
        type: "error",
        title: "فشل في تحديث البيانات",
        message: error || "حدث خطأ أثناء تحديث بيانات المقاول",
      });
    }
  };

  // Handle delete contractor
  const handleDeleteContractor = async (contractor: Contractor) => {
    if (!confirm(`هل أنت متأكد من حذف المقاول "${contractor.full_name}"؟`)) {
      return;
    }

    const success = await deleteContractor(contractor.id);

    if (success) {
      addToast({
        type: "success",
        title: "تم حذف المقاول",
        message: `تم حذف ${contractor.full_name} من قائمة المقاولين`,
      });
    } else {
      addToast({
        type: "error",
        title: "فشل في حذف المقاول",
        message: error || "حدث خطأ أثناء حذف المقاول",
      });
    }
  };

  // Open edit modal
  const openEditModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setContractorForm({
      full_name: contractor.full_name,
      phone_number: contractor.phone_number,
      category: contractor.category,
      notes: contractor.notes || "",
    });
    setShowEditModal(true);
  };

  // Open view modal
  const openViewModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setShowViewModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedContractor(null);
    setContractorForm({
      full_name: "",
      phone_number: "",
      category: "",
      notes: "",
    });
  };

  return (
    <div className={isMobile ? "space-y-4 p-3" : "space-y-8"}>
      {/* Page Navigation - Hidden on Mobile */}
      {!isMobile && <PageNavigation />}

      {/* Page Header */}
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-200 ${
          isMobile ? "p-4" : "p-6"
        }`}
      >
        <div
          className={`flex items-center justify-between ${
            isMobile ? "flex-col space-y-3" : ""
          }`}
        >
          <div className={`space-y-2 ${isMobile ? "text-center" : ""}`}>
            <h1
              className={`font-bold text-gray-900 arabic-spacing ${
                isMobile ? "text-xl" : "text-3xl"
              }`}
            >
              {isMobile ? "المقاولين" : "إدارة المقاولين"}
            </h1>
            {!isMobile && (
              <p className="text-gray-600 arabic-spacing leading-relaxed">
                إدارة قاعدة بيانات المقاولين والموردين - يُستخدمون في جميع أنحاء
                النظام
              </p>
            )}
            <div
              className={`flex items-center text-gray-500 ${
                isMobile
                  ? "justify-center space-x-2 space-x-reverse text-xs"
                  : "space-x-4 space-x-reverse text-sm"
              }`}
            >
              <span className="flex items-center space-x-1 space-x-reverse">
                <UserCheck
                  className={`no-flip ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                />
                <span className="arabic-spacing">
                  {contractors.length} مقاول
                </span>
              </span>
              {!isMobile && (
                <span className="flex items-center space-x-1 space-x-reverse">
                  <Clock className="h-4 w-4 no-flip" />
                  <span className="arabic-spacing">
                    آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons - Hidden on Mobile */}
          {!isMobile && (
            <div className="flex items-center space-x-4 gap-2 space-x-reverse">
              {!permissions.isViewOnlyMode && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">إضافة مقاول جديد</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="shadow-lg border-0 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 no-flip" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 arabic-spacing mb-2">
                  خطأ في جلب البيانات
                </h3>
                <p className="text-red-700 arabic-spacing leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="shadow-lg border-0">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div
            className={`flex gap-6 ${
              isMobile ? "flex-col gap-4" : "flex-col sm:flex-row"
            }`}
          >
            <div className="flex-1">
              <div className="relative">
                <Search
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 no-flip ${
                    isMobile ? "h-4 w-4" : "h-5 w-5"
                  }`}
                />
                <Input
                  placeholder={
                    isMobile
                      ? "ابحث في المقاولين..."
                      : "ابحث بالاسم أو رقم الهاتف أو الفئة..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pr-12 arabic-spacing border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 ${
                    isMobile ? "h-10 text-sm" : "h-12 text-base"
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Filter
                  className={`text-gray-500 no-flip ${
                    isMobile ? "h-4 w-4" : "h-5 w-5"
                  }`}
                />
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 arabic-spacing ${
                    isMobile
                      ? "h-10 text-sm w-full"
                      : "h-12 text-base min-w-[180px]"
                  }`}
                >
                  <option value="all">جميع الفئات</option>
                  {contractorCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractors List */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="arabic-spacing flex items-center">
            <UserCheck className="h-6 w-6 ml-2 text-blue-600 no-flip" />
            قائمة المقاولين
          </CardTitle>
          <CardDescription className="arabic-spacing">
            قاعدة بيانات شاملة لجميع المقاولين والموردين مع إمكانية البحث
            والتصفية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-12 w-12 text-blue-600 no-flip animate-spin" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
                جاري تحميل البيانات...
              </h3>
              <p className="text-gray-500 arabic-spacing text-lg">
                يرجى الانتظار قليلاً
              </p>
            </div>
          ) : filteredContractors.length > 0 ? (
            isMobile ? (
              <MobileContractorCards contractors={filteredContractors} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContractors.map((contractor) => (
                  <div
                    key={contractor.id}
                    className="p-6 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="bg-blue-100 p-3 rounded-full">
                          {categoryIcons[contractor.category] || (
                            <UserCheck className="h-5 w-5 no-flip" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 arabic-spacing text-lg">
                            {contractor.full_name}
                          </h4>
                          <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                            <Phone className="h-4 w-4 no-flip" />
                            <span className="arabic-nums">
                              {contractor.phone_number}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewModal(contractor)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4 no-flip" />
                        </Button>
                        {!permissions.isDataEntryMode &&
                          !permissions.isViewOnlyMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(contractor)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4 no-flip" />
                            </Button>
                          )}
                        {!permissions.isDataEntryMode &&
                          !permissions.isViewOnlyMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContractor(contractor)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4 no-flip" />
                            </Button>
                          )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 arabic-spacing">
                          الفئة:
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 arabic-spacing">
                          {categoryLabels[contractor.category]}
                        </span>
                      </div>

                      {contractor.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-600 arabic-spacing">
                            {contractor.notes}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 arabic-spacing">
                        تاريخ الإضافة: {formatDate(contractor.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="h-12 w-12 text-gray-400 no-flip" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3 arabic-spacing">
                {searchQuery || categoryFilter !== "all"
                  ? "لا توجد مقاولين يطابقون البحث"
                  : "لا توجد مقاولين بعد"}
              </h3>
              <p className="text-gray-500 mb-8 arabic-spacing text-lg leading-relaxed max-w-md mx-auto">
                {searchQuery || categoryFilter !== "all"
                  ? "جرب تعديل معايير البحث أو الفلاتر"
                  : "ابدأ بإضافة مقاولين جدد إلى قاعدة البيانات"}
              </p>
              {!searchQuery &&
                categoryFilter === "all" &&
                !isMobile &&
                !permissions.isViewOnlyMode && (
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="h-5 w-5 ml-2 no-flip" />
                    <span className="arabic-spacing">إضافة مقاول جديد</span>
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contractor Modal */}
      {showAddModal && (
        <ContractorModal
          title="إضافة مقاول جديد"
          contractor={contractorForm}
          categories={contractorCategories}
          onSave={handleAddContractor}
          onCancel={closeModals}
          onChange={setContractorForm}
          saveButtonText="إضافة المقاول"
        />
      )}

      {/* Edit Contractor Modal */}
      {showEditModal && selectedContractor && (
        <ContractorModal
          title="تعديل بيانات المقاول"
          contractor={contractorForm}
          categories={contractorCategories}
          onSave={handleEditContractor}
          onCancel={closeModals}
          onChange={setContractorForm}
          saveButtonText="حفظ التغييرات"
        />
      )}

      {/* View Contractor Modal */}
      {showViewModal && selectedContractor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse text-white">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <UserCheck className="h-6 w-6 no-flip" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold arabic-spacing">
                      تفاصيل المقاول
                    </h3>
                    <p className="text-blue-100 arabic-spacing text-sm">
                      عرض جميع بيانات المقاول
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeModals}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4 no-flip" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 arabic-spacing">
                      الاسم الكامل
                    </label>
                    <p className="text-lg font-semibold text-gray-900 arabic-spacing mt-1">
                      {selectedContractor.full_name}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 arabic-spacing">
                      رقم الهاتف
                    </label>
                    <p className="text-lg font-semibold text-gray-900 arabic-nums mt-1">
                      {selectedContractor.phone_number}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 arabic-spacing">
                      الفئة
                    </label>
                    <div className="flex items-center space-x-2 space-x-reverse mt-1">
                      {categoryIcons[selectedContractor.category]}
                      <span className="text-lg font-semibold text-gray-900 arabic-spacing">
                        {categoryLabels[selectedContractor.category]}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 arabic-spacing">
                      تاريخ الإضافة
                    </label>
                    <p className="text-lg font-semibold text-gray-900 arabic-nums mt-1">
                      {formatDate(selectedContractor.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedContractor.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600 arabic-spacing">
                    ملاحظات
                  </label>
                  <p className="text-base text-gray-900 arabic-spacing mt-1 p-4 bg-gray-50 rounded-lg">
                    {selectedContractor.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-2xl">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={closeModals}
                  className="px-6 py-3 text-base"
                >
                  <span className="arabic-spacing">إغلاق</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Contractor Modal Component
interface ContractorModalProps {
  title: string;
  contractor: ContractorFormData;
  categories: Array<{ value: string; label: string }>;
  onSave: () => void;
  onCancel: () => void;
  onChange: (contractor: ContractorFormData) => void;
  saveButtonText: string;
}

function ContractorModal({
  title,
  contractor,
  categories,
  onSave,
  onCancel,
  onChange,
  saveButtonText,
}: ContractorModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse text-white">
              <div className="bg-white/20 p-2 rounded-lg">
                <UserCheck className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h3 className="text-xl font-bold arabic-spacing">{title}</h3>
                <p className="text-blue-100 arabic-spacing text-sm">
                  املأ جميع البيانات المطلوبة
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 no-flip" />
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                الاسم الكامل *
              </label>
              <Input
                value={contractor.full_name}
                onChange={(e) =>
                  onChange({ ...contractor, full_name: e.target.value })
                }
                className="h-12 text-base arabic-spacing"
                placeholder="مثال: أحمد محمد علي"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 arabic-spacing">
                رقم الهاتف *
              </label>
              <Input
                value={contractor.phone_number}
                onChange={(e) =>
                  onChange({ ...contractor, phone_number: e.target.value })
                }
                className="h-12 text-base"
                placeholder="07XX XXX XXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-base font-semibold text-gray-800 arabic-spacing">
              فئة المقاول *
            </label>
            <Select
              value={contractor.category}
              onChange={(e) =>
                onChange({ ...contractor, category: e.target.value })
              }
              className="h-12 text-base arabic-spacing"
            >
              <option value="">اختر فئة المقاول</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-base font-semibold text-gray-800 arabic-spacing">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={contractor.notes}
              onChange={(e) =>
                onChange({ ...contractor, notes: e.target.value })
              }
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg text-base arabic-spacing focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              placeholder="مثال: متخصص في أعمال البناء السكني..."
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="h-5 w-5 text-amber-600 no-flip flex-shrink-0 mt-0.5" />
              <div className="text-amber-800 text-sm arabic-spacing leading-relaxed">
                <p className="font-medium mb-1">ملاحظة مهمة:</p>
                <p>
                  لا يمكن إضافة مقاولين بنفس الاسم. تأكد من صحة البيانات قبل
                  الحفظ حيث سيتم استخدام هذه البيانات في جميع أنحاء النظام.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 arabic-spacing">
              <span className="font-medium">* حقول مطلوبة</span>
            </div>

            <div className="flex space-x-4 space-x-reverse">
              <Button
                variant="outline"
                onClick={onCancel}
                className="px-6 py-3 text-base"
              >
                <span className="arabic-spacing">إلغاء</span>
              </Button>

              <Button
                onClick={onSave}
                disabled={
                  !contractor.full_name.trim() ||
                  !contractor.phone_number.trim() ||
                  !contractor.category
                }
                className="px-6 py-3 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5 ml-2 no-flip" />
                <span className="arabic-spacing">{saveButtonText}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Contractor Cards Component - No Action Buttons
function MobileContractorCards({ contractors }: { contractors: Contractor[] }) {
  return (
    <div className="space-y-3">
      {contractors.map((contractor) => (
        <div
          key={contractor.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
        >
          {/* Mobile Card Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="bg-white/20 p-2 rounded-lg">
                  {categoryIcons[contractor.category] || (
                    <UserCheck className="h-4 w-4 no-flip" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold arabic-spacing truncate">
                    {contractor.full_name}
                  </h3>
                  <p className="text-blue-100 text-sm arabic-nums flex items-center mt-1">
                    <Phone className="h-3 w-3 ml-1 no-flip" />
                    {contractor.phone_number}
                  </p>
                </div>
              </div>
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 border-white/30 text-white">
                {categoryLabels[contractor.category]}
              </div>
            </div>
          </div>

          {/* Mobile Card Content - Minimal Details */}
          <div className="p-4">
            <div className="space-y-3">
              {/* Category */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 arabic-spacing font-medium">
                  الفئة:
                </span>
                <span className="text-blue-700 arabic-spacing font-semibold">
                  {categoryLabels[contractor.category]}
                </span>
              </div>

              {/* Notes */}
              {contractor.notes && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 arabic-spacing line-clamp-2">
                    {contractor.notes}
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 arabic-spacing">
                تاريخ الإضافة: {formatDate(contractor.created_at)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
