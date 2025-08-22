"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth, LoginCredentials } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { addToast } = useToast();
  // TODO: Add backend login
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.username.trim()) {
      newErrors.username = "اسم المستخدم مطلوب";
    }

    if (!credentials.password.trim()) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (credentials.password.length < 8) {
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(credentials.password)) {
      newErrors.password =
        "كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(credentials);

      if (result.success) {
        addToast({
          type: "success",
          title: "نجح تسجيل الدخول",
          message: result.message || "تم تسجيل الدخول بنجاح",
        });
        router.push("/");
      } else {
        addToast({
          type: "error",
          title: "خطأ في تسجيل الدخول",
          message: result.message || "حدث خطأ أثناء تسجيل الدخول",
        });
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "خطأ في الاتصال",
        message: "حدث خطأ في الاتصال بالخادم",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    (field: keyof LoginCredentials) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">جاري التحقق من بيانات الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-[#182C61] to-blue-700 p-4 rounded-xl">
              <img
                src="/QS-WHITE.svg"
                alt="شركة قصر الشام"
                width={40}
                height={40}
                style={{ display: "block" }}
              />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900 arabic-spacing">
            تسجيل الدخول
          </CardTitle>
          <p className="text-gray-600 mt-2 arabic-spacing">
            نظام الإدارة المالية - شركة قصر الشام
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 arabic-spacing">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  value={credentials.username}
                  onChange={handleInputChange("username")}
                  placeholder="أدخل اسم المستخدم"
                  className={`pr-11 ${errors.username ? "border-red-500" : ""}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.username && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.username}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 arabic-spacing">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={handleInputChange("password")}
                  placeholder="أدخل كلمة المرور"
                  className={`pr-11 pl-11 ${
                    errors.password ? "border-red-500" : ""
                  }`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#182C61] to-blue-700 hover:from-[#1e3a73] hover:to-blue-800 text-white font-semibold py-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </div>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 arabic-spacing">
              ملاحظات أمنية:
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>تأكد من إغلاق المتصفح عند الانتهاء من العمل</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>لا تشارك بيانات الدخول مع أي شخص</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>استخدم كلمة مرور قوية وفريدة</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
