import React from "react";
import { useRouter } from "next/navigation";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { Shield, AlertTriangle } from "lucide-react";

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission: keyof ReturnType<typeof useUIPermissions>;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Route wrapper that checks permissions before rendering content
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  requiredPermission,
  fallback,
  redirectTo,
}) => {
  const permissions = useUIPermissions();
  const router = useRouter();
  const hasPermission = permissions[requiredPermission];

  React.useEffect(() => {
    if (!hasPermission && redirectTo) {
      router.push(redirectTo);
    }
  }, [hasPermission, redirectTo, router]);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            غير مسموح بالوصول
          </h2>

          <p className="text-gray-600 mb-6">
            ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              العودة
            </button>

            <button
              onClick={() => router.push("/projects")}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Component for showing permission warnings
 */
export const PermissionWarning: React.FC<{
  message: string;
  type?: "warning" | "info" | "error";
  className?: string;
}> = ({ message, type = "warning", className = "" }) => {
  const iconMap = {
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Shield className="w-5 h-5" />,
    error: <Shield className="w-5 h-5" />,
  };

  const colorMap = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${colorMap[type]} ${className}`}
    >
      {iconMap[type]}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default PermissionRoute;
