import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  permission?: keyof ReturnType<typeof useUIPermissions>;
  adminOnly?: boolean;
  dataEntryHidden?: boolean;
}

const navigationItems: NavItem[] = [
  {
    icon: Home,
    label: "الرئيسية",
    href: "/",
  },
  {
    icon: Building2,
    label: "المشاريع",
    href: "/projects",
  },
  {
    icon: Users,
    label: "المقاولين",
    href: "/contractors",
  },
  {
    icon: FileText,
    label: "المصروفات العامة",
    href: "/general-expenses",
    dataEntryHidden: true, // Data entry users can't see general expenses
  },
  {
    icon: Wallet,
    label: "الخزينة",
    href: "/safe",
    permission: "canAccessSafePage",
  },
  {
    icon: BarChart3,
    label: "التقارير المالية",
    href: "/financial-reports",
    permission: "canAccessReports",
  },
  {
    icon: Users,
    label: "الموارد البشرية",
    href: "/resources",
    adminOnly: true,
  },
];

interface RoleBasedNavigationProps {
  className?: string;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  className = "",
  isMobileMenuOpen = false,
  onMobileMenuToggle,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const permissions = useUIPermissions();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  const filteredNavItems = navigationItems.filter((item) => {
    // Partners can only see basic navigation (no admin features)
    if (permissions.isViewOnlyMode) {
      return [
        "/",
        "/projects",
        "/contractors",
        "/safe",
        "/resources",
        "/financial-reports",
      ].includes(item.href);
    }

    // Hide admin-only items from non-admins
    if (item.adminOnly && !permissions.isAdminMode) {
      return false;
    }

    // Hide specific items from data entry users
    if (item.dataEntryHidden && permissions.isDataEntryMode) {
      return false;
    }

    // Hide financial reports from data entry users
    if (item.href === "/financial-reports" && permissions.isDataEntryMode) {
      return false;
    }

    // Check specific permissions
    if (item.permission && !permissions[item.permission]) {
      return false;
    }

    return true;
  });

  // Filter out general expenses and reports pages on mobile
  const mobileFilteredNavItems = isMobile
    ? filteredNavItems.filter(
        (item) =>
          item.href !== "/general-expenses" &&
          item.href !== "/financial-reports"
      )
    : filteredNavItems;

  if (isMobile) {
    return (
      <MobileNavigation
        filteredNavItems={mobileFilteredNavItems}
        pathname={pathname}
        router={router}
        permissions={permissions}
        user={user}
        isOpen={isMobileMenuOpen}
        onToggle={onMobileMenuToggle}
        className={className}
      />
    );
  }

  return (
    <div className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-1 space-x-reverse bg-gray-50 rounded-xl p-1">
            {filteredNavItems.map((item) => (
              <RoleBasedNavButton
                key={item.href}
                item={item}
                isActive={pathname === item.href}
                router={router}
                permissions={permissions}
              />
            ))}

            {/* Role indicator */}
            <div className="flex items-center space-x-2 space-x-reverse px-3 py-2 text-xs">
              <Shield className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500 arabic-spacing">
                {(() => {
                  if (permissions.isAdminMode) return "مدير";
                  if (permissions.isDataEntryMode) return "مدخل بيانات";
                  if (permissions.isViewOnlyMode) return "شريك";

                  // Fallback to direct role mapping if permission modes don't work
                  const role = user?.role as string;
                  if (role === "admin") return "مدير";
                  if (role === "data_entry" || role === "dataentry")
                    return "مدخل بيانات";
                  if (role === "partners" || role === "partner") return "شريك";

                  return role || "مستخدم";
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RoleBasedNavButtonProps {
  item: NavItem;
  isActive: boolean;
  router: any;
  permissions: ReturnType<typeof useUIPermissions>;
}

const RoleBasedNavButton: React.FC<RoleBasedNavButtonProps> = ({
  item,
  isActive,
  router,
  permissions,
}) => {
  const Icon = item.icon;

  const handleClick = () => {
    // Check if user has permission to navigate
    if (item.permission && !permissions[item.permission]) {
      return; // Don't navigate if no permission
    }

    router.push(item.href);
  };

  const hasPermission = !item.permission || permissions[item.permission];

  return (
    <button
      onClick={handleClick}
      disabled={!hasPermission}
      className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-blue-600 text-white shadow-md"
          : hasPermission
          ? "text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm"
          : "text-gray-400 cursor-not-allowed opacity-50"
      }`}
      title={
        !hasPermission
          ? permissions.isViewOnlyMode
            ? "غير متاح - وضع العرض فقط"
            : "ليس لديك صلاحية للوصول"
          : item.label
      }
    >
      <Icon className="h-4 w-4 no-flip" />
      <span className="arabic-spacing whitespace-nowrap">{item.label}</span>

      {/* View-only indicator for partners */}
      {permissions.isViewOnlyMode && hasPermission && (
        <span className="text-xs opacity-60">(عرض)</span>
      )}
    </button>
  );
};

/**
 * Utility component to conditionally render elements based on user role
 * Partners (view-only) will not see action buttons
 */
export const ActionButtonGate: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  const permissions = useUIPermissions();

  // Partners cannot see any action buttons
  if (permissions.isViewOnlyMode) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Utility component to show read-only indicator for partners
 */
export const ReadOnlyIndicator: React.FC = () => {
  const permissions = useUIPermissions();

  if (!permissions.isViewOnlyMode) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2 space-x-reverse text-blue-700">
        <Shield className="h-4 w-4" />
        <span className="text-sm font-medium">
          وضع القراءة فقط - لا يمكن التعديل
        </span>
      </div>
    </div>
  );
};

// Mobile Navigation Component
interface MobileNavigationProps {
  filteredNavItems: NavItem[];
  pathname: string;
  router: any;
  permissions: ReturnType<typeof useUIPermissions>;
  user: any;
  isOpen: boolean;
  onToggle?: () => void;
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  filteredNavItems,
  pathname,
  router,
  permissions,
  user,
  isOpen,
  onToggle,
  className = "",
}) => {
  const handleNavClick = (href: string) => {
    router.push(href);
    if (onToggle) {
      onToggle(); // Close menu after navigation
    }
  };

  // Don't render anything if menu is not open
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 z-40"
        onClick={onToggle}
      />

      {/* Mobile Menu Drawer */}
      <div className="fixed top-0 left-0 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col translate-x-0">
        {/* Menu Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 relative flex-shrink-0">
          {/* Close Button */}
          <button
            onClick={onToggle}
            className="absolute top-3 left-3 text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header Content */}
          <div className="text-center text-white pt-1">
            <div className="bg-white/20 p-2 rounded-lg inline-block mb-2">
              <img
                src="/QS-WHITE.svg"
                alt="شركة قصر الشام"
                width={20}
                height={20}
                style={{ display: "block" }}
              />
            </div>
            <h2 className="text-base font-bold arabic-spacing">قصر الشام</h2>
            <div className="flex items-center justify-center space-x-2 space-x-reverse text-xs text-blue-100 mt-1">
              <span className="arabic-spacing">
                {(() => {
                  if (permissions.isAdminMode) return "مدير";
                  if (permissions.isDataEntryMode) return "مدخل بيانات";
                  if (permissions.isViewOnlyMode) return "شريك";

                  // Fallback to direct role mapping if permission modes don't work
                  const role = user?.role as string;
                  if (role === "admin") return "مدير";
                  if (role === "data_entry" || role === "dataentry")
                    return "مدخل بيانات";
                  if (role === "partners" || role === "partner") return "شريك";

                  return role || "مستخدم";
                })()}
              </span>
              <Shield className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const hasPermission =
                !item.permission || permissions[item.permission];

              return (
                <button
                  key={item.href}
                  onClick={() => hasPermission && handleNavClick(item.href)}
                  disabled={!hasPermission}
                  className={`w-full flex items-center space-x-3 space-x-reverse p-3 rounded-lg text-right transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : hasPermission
                      ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      : "text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className="flex-1 text-right">
                    <span className="arabic-spacing font-medium text-sm">
                      {item.label}
                    </span>
                    {permissions.isViewOnlyMode && hasPermission && (
                      <span className="text-xs opacity-60 mr-2">(عرض)</span>
                    )}
                  </div>
                  <Icon
                    className={`h-4 w-4 no-flip flex-shrink-0 ${
                      isActive
                        ? "text-white"
                        : hasPermission
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-3 flex-shrink-0">
          <div className="text-center text-xs text-gray-500 arabic-spacing">
            نظام الإدارة المالية
          </div>
        </div>
      </div>
    </>
  );
};

export default RoleBasedNavigation;
