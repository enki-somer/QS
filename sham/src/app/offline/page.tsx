"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically redirect when back online
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);

    // Try to reload the page
    if (navigator.onLine) {
      window.location.reload();
    } else {
      // Show feedback that we're still offline
      setTimeout(() => {
        setRetryCount((prev) => prev - 1);
      }, 2000);
    }
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto text-center shadow-xl border-0">
        <div className="p-8 space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div
              className={`p-4 rounded-full ${
                isOnline ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {isOnline ? (
                <RefreshCw className="h-12 w-12 text-green-600 animate-spin" />
              ) : (
                <WifiOff className="h-12 w-12 text-red-600" />
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 arabic-spacing">
              {isOnline ? "جاري الاتصال..." : "غير متصل بالإنترنت"}
            </h1>
            <p className="text-gray-600 arabic-spacing leading-relaxed">
              {isOnline
                ? "تم استعادة الاتصال بالإنترنت. جاري إعادة التوجيه..."
                : "يبدو أنك غير متصل بالإنترنت. يمكنك تصفح بعض الصفحات المحفوظة أو المحاولة مرة أخرى."}
            </p>
          </div>

          {/* Connection Status Indicator */}
          <div
            className={`p-3 rounded-lg ${
              isOnline
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center justify-center space-x-2 space-x-reverse">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                } ${!isOnline ? "animate-pulse" : ""}`}
              ></div>
              <span
                className={`text-sm font-medium ${
                  isOnline ? "text-green-700" : "text-red-700"
                } arabic-spacing`}
              >
                {isOnline ? "متصل" : "غير متصل"}
              </span>
            </div>
          </div>

          {/* Available Offline Features */}
          {!isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 arabic-spacing mb-2">
                المتاح في وضع عدم الاتصال:
              </h3>
              <ul className="text-sm text-blue-800 arabic-spacing space-y-1 text-right">
                <li>• عرض البيانات المحفوظة مسبقاً</li>
                <li>• تصفح صفحات المشاريع</li>
                <li>• عرض معلومات المقاولين</li>
                <li>• حفظ التغييرات للمزامنة لاحقاً</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isOnline && (
              <Button
                onClick={handleRetry}
                disabled={retryCount > 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ml-2 no-flip ${
                    retryCount > 0 ? "animate-spin" : ""
                  }`}
                />
                <span className="arabic-spacing">
                  {retryCount > 0 ? "جاري المحاولة..." : "إعادة المحاولة"}
                </span>
              </Button>
            )}

            <Button onClick={handleGoHome} variant="outline" className="w-full">
              <Home className="h-4 w-4 ml-2 no-flip" />
              <span className="arabic-spacing">العودة للصفحة الرئيسية</span>
            </Button>
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 arabic-spacing leading-relaxed">
            <p>💡 نصيحة: تأكد من اتصالك بالواي فاي أو بيانات الهاتف المحمول</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
