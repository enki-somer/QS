import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Save,
  FileText,
  Plus,
  Minus,
  Calendar,
  Upload,
  File,
  Eye,
  AlertCircle,
  Calculator,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Project } from "@/types";
import {
  CustomFieldType,
  InvoiceFormData,
  InvoiceLineItem,
} from "@/types/shared";
import { generateId, formatCurrency } from "@/lib/utils";

interface InvoiceModalProps {
  isOpen: boolean;
  project?: Project;
  invoiceForm: InvoiceFormData;
  setInvoiceForm: (form: InvoiceFormData) => void;
  onClose: () => void;
  onSubmit: () => void;
  onPreview: () => void;
  loading?: boolean;
}

export default function InvoiceModal({
  isOpen,
  project,
  invoiceForm,
  setInvoiceForm,
  onClose,
  onSubmit,
  onPreview,
  loading = false,
}: InvoiceModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Clear uploaded file when modal opens or when form is reset
  useEffect(() => {
    if (isOpen && !invoiceForm.attachmentFile) {
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen, invoiceForm.attachmentFile]);

  // Auto-scroll to bottom when file is uploaded to ensure submit button is visible
  useEffect(() => {
    if (uploadedFile) {
      setTimeout(() => {
        const scrollContainer = document.querySelector(".modal-content-scroll");
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [uploadedFile]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof InvoiceFormData, value: string) => {
    setInvoiceForm({
      ...invoiceForm,
      [field]: value,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("يرجى رفع ملف صورة فقط (JPG, PNG, GIF)");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
        return;
      }

      setUploadedFile(file);
      setInvoiceForm({
        ...invoiceForm,
        attachmentFile: file,
      });
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setInvoiceForm({
      ...invoiceForm,
      attachmentFile: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Line Items Management
  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: generateId(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setInvoiceForm({
      ...invoiceForm,
      lineItems: [...invoiceForm.lineItems, newItem],
    });
  };

  const updateLineItem = (
    id: string,
    field: keyof InvoiceLineItem,
    value: string | number
  ) => {
    setInvoiceForm({
      ...invoiceForm,
      lineItems: invoiceForm.lineItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate total when quantity or unitPrice changes
          if (field === "quantity" || field === "unitPrice") {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }),
    });
  };

  const removeLineItem = (id: string) => {
    setInvoiceForm({
      ...invoiceForm,
      lineItems: invoiceForm.lineItems.filter((item) => item.id !== id),
    });
  };

  // Custom Fields Management
  const addCustomField = () => {
    const newField: CustomFieldType = {
      id: generateId(),
      label: "",
      value: "",
      type: "text",
    };
    setInvoiceForm({
      ...invoiceForm,
      customFields: [...invoiceForm.customFields, newField],
    });
  };

  const updateCustomField = (
    id: string,
    field: keyof CustomFieldType,
    value: string
  ) => {
    setInvoiceForm({
      ...invoiceForm,
      customFields: invoiceForm.customFields.map((f) =>
        f.id === id ? { ...f, [field]: value } : f
      ),
    });
  };

  const removeCustomField = (id: string) => {
    setInvoiceForm({
      ...invoiceForm,
      customFields: invoiceForm.customFields.filter((f) => f.id !== id),
    });
  };

  // Calculations
  const calculateSubtotal = () => {
    return invoiceForm.lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return invoiceForm.taxPercentage
      ? (subtotal * parseFloat(invoiceForm.taxPercentage)) / 100
      : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = parseFloat(invoiceForm.discountAmount) || 0;
    return subtotal + tax - discount;
  };

  // Use global formatCurrency function for consistent IQD formatting

  // Form validation
  const isFormValid = () => {
    return (
      invoiceForm.lineItems.length > 0 &&
      invoiceForm.lineItems.every(
        (item) =>
          item.description.trim() && item.quantity > 0 && item.unitPrice > 0
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl modal-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileText className="h-6 w-6 no-flip" />
              </div>
              <div>
                <h2 className="text-2xl font-bold arabic-spacing">
                  إنشاء فاتورة جديدة
                </h2>
                <p className="text-green-100 arabic-spacing">
                  {project?.name || "مشروع غير محدد"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPreview}
                className="h-10 px-3 text-white hover:bg-white/20"
                disabled={!isFormValid()}
              >
                <Eye className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">معاينة</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="modal-content-scroll p-6 overflow-y-auto max-h-[calc(95vh-180px)] scroll-smooth">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-spacing">
                المعلومات الأساسية
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoice Number - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                    رقم الفاتورة
                  </label>
                  <Input
                    value={invoiceForm.invoiceNumber}
                    readOnly
                    className="bg-gray-50 text-gray-600"
                    placeholder="سيتم إنشاؤه تلقائياً"
                  />
                  <p className="text-xs text-gray-500 mt-1 arabic-spacing">
                    يتم إنشاء رقم الفاتورة تلقائياً وهو غير قابل للتعديل
                  </p>
                </div>

                {/* Date - Auto-set, but editable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                    تاريخ الفاتورة
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 no-flip" />
                    <Input
                      type="date"
                      value={invoiceForm.date}
                      onChange={(e) =>
                        handleInputChange("date", e.target.value)
                      }
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  ملاحظات
                </label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                  placeholder="أدخل ملاحظات إضافية..."
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-green-50 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 arabic-spacing">
                    بنود الفاتورة
                  </h3>
                  <Button
                    onClick={addLineItem}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">إضافة بند</span>
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {invoiceForm.lineItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300 no-flip" />
                    <p className="arabic-spacing mb-2">
                      لا توجد بنود في الفاتورة بعد
                    </p>
                    <p className="text-sm arabic-spacing">
                      اضغط "إضافة بند" لبدء إنشاء الفاتورة
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-2 mb-3 text-sm font-medium text-gray-700 pb-2 border-b border-gray-200">
                      <div className="col-span-5 arabic-spacing">وصف البند</div>
                      <div className="col-span-2 text-center arabic-spacing">
                        الكمية
                      </div>
                      <div className="col-span-2 text-center arabic-spacing">
                        السعر/الوحدة (د.ع)
                      </div>
                      <div className="col-span-2 text-center arabic-spacing">
                        المجموع (د.ع)
                      </div>
                      <div className="col-span-1 text-center arabic-spacing">
                        حذف
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3">
                      {invoiceForm.lineItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 rounded-lg p-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            {/* Description */}
                            <div className="md:col-span-5">
                              <label className="block text-xs text-gray-600 mb-1 md:hidden arabic-spacing">
                                وصف البند:
                              </label>
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateLineItem(
                                    item.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="وصف العمل أو المادة..."
                                className="w-full"
                              />
                            </div>

                            {/* Quantity */}
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-600 mb-1 md:hidden arabic-spacing">
                                الكمية:
                              </label>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateLineItem(
                                    item.id,
                                    "quantity",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="text-center"
                              />
                            </div>

                            {/* Unit Price */}
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-600 mb-1 md:hidden arabic-spacing">
                                السعر/الوحدة:
                              </label>
                              <Input
                                type="number"
                                min=""
                                value={
                                  item.unitPrice === 0 ? "" : item.unitPrice
                                }
                                onFocus={(e) => {
                                  if (e.target.value === "0") {
                                    e.target.value = "";
                                  }
                                }}
                                onChange={(e) =>
                                  updateLineItem(
                                    item.id,
                                    "unitPrice",
                                    Math.round(
                                      (parseFloat(e.target.value) || 0) * 100
                                    ) / 100
                                  )
                                }
                                className="text-center"
                                placeholder=""
                              />
                            </div>

                            {/* Total */}
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-600 mb-1 md:hidden arabic-spacing">
                                المجموع:
                              </label>
                              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-center font-medium text-green-600">
                                {formatCurrency(item.total)}
                              </div>
                            </div>

                            {/* Delete Button */}
                            <div className="md:col-span-1 flex justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLineItem(item.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 no-flip" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals Summary */}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="arabic-spacing">
                              المجموع الفرعي:
                            </span>
                            <span className="font-medium arabic-nums">
                              {formatCurrency(calculateSubtotal())}
                            </span>
                          </div>

                          {invoiceForm.taxPercentage && (
                            <div className="flex justify-between text-sm">
                              <span className="arabic-spacing">
                                الضريبة ({invoiceForm.taxPercentage}%):
                              </span>
                              <span className="font-medium arabic-nums">
                                {formatCurrency(calculateTax())}
                              </span>
                            </div>
                          )}

                          {invoiceForm.discountAmount && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span className="arabic-spacing">الخصم:</span>
                              <span className="font-medium arabic-nums">
                                -
                                {formatCurrency(
                                  parseFloat(invoiceForm.discountAmount)
                                )}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span className="arabic-spacing">
                              المجموع النهائي:
                            </span>
                            <span className="text-green-600 arabic-nums">
                              {formatCurrency(calculateTotal())}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tax and Discount 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  نسبة الضريبة (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.taxPercentage}
                  onChange={(e) =>
                    handleInputChange("taxPercentage", e.target.value)
                  }
                  placeholder="15.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  مبلغ الخصم (د.ع)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.discountAmount}
                  onChange={(e) =>
                    handleInputChange("discountAmount", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>*/}

            {/* Payment Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  شروط الدفع
                </label>
                <Input
                  value={invoiceForm.paymentTerms}
                  onChange={(e) =>
                    handleInputChange("paymentTerms", e.target.value)
                  }
                  placeholder="مثال: الدفع خلال 30 يوم من تاريخ الفاتورة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-spacing">
                  تاريخ الاستحقاق
                </label>
                <Input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-spacing">
                مرفق الفاتورة المكتوبة يدوياً
              </h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {uploadedFile ? (
                  <div className="space-y-2">
                    <File className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 ml-1 no-flip" />
                      <span className="arabic-spacing">إزالة الملف</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Upload className="h-4 w-4 ml-1 no-flip" />
                        <span className="arabic-spacing">رفع ملف</span>
                      </Button>
                      <p className="text-xs text-gray-500 mt-1 arabic-spacing">
                        JPG, PNG, GIF حتى 5MB
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-start space-x-2 space-x-reverse">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 no-flip" />
                  <p className="text-xs text-blue-700 arabic-spacing">
                    هذا المرفق للاستخدام الداخلي للشركة فقط ولن يظهر في النسخة
                    المطبوعة للعميل
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            {invoiceForm.customFields.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-spacing">
                  حقول مخصصة
                </h3>

                <div className="space-y-3">
                  {invoiceForm.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          value={field.label}
                          onChange={(e) =>
                            updateCustomField(field.id, "label", e.target.value)
                          }
                          placeholder="اسم الحقل"
                        />
                        <Input
                          value={field.value}
                          onChange={(e) =>
                            updateCustomField(field.id, "value", e.target.value)
                          }
                          placeholder="القيمة"
                        />
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateCustomField(
                                field.id,
                                "type",
                                e.target.value
                              )
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="text">نص</option>
                            <option value="number">رقم</option>
                            <option value="date">تاريخ</option>
                            <option value="textarea">نص طويل</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomField(field.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    onClick={addCustomField}
                    className="w-full border-2 border-dashed border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600"
                  >
                    <Plus className="h-4 w-4 ml-1 no-flip" />
                    <span className="arabic-spacing">إضافة حقل مخصص</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
            >
              إلغاء
            </Button>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="ghost"
                onClick={onPreview}
                disabled={!isFormValid()}
                className="text-green-600 hover:text-green-700"
              >
                <Eye className="h-4 w-4 ml-1 no-flip" />
                <span className="arabic-spacing">معاينة</span>
              </Button>
              <Button
                onClick={onSubmit}
                disabled={loading || !isFormValid()}
                className="bg-green-600 hover:bg-green-700 text-white "
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent ml-1" />
                ) : (
                  <Save className="h-4 w-4 ml-1 no-flip" />
                )}
                <span className="arabic-spacing">إنشاء الفاتورة</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
