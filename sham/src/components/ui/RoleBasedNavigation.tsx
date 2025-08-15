import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Shield,
} from "lucide-react";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { useAuth } from "@/contexts/AuthContext";

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
    label: "الموارد",
    href: "/resources",
    adminOnly: true,
  },
];

interface RoleBasedNavigationProps {
  className?: string;
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  className = "",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const permissions = useUIPermissions();
  const { user } = useAuth();

  const filteredNavItems = navigationItems.filter((item) => {
    // Hide admin-only items from non-admins
    if (item.adminOnly && !permissions.isAdminMode) {
      return false;
    }

    // Hide specific items from data entry users
    if (item.dataEntryHidden && permissions.isDataEntryMode) {
      return false;
    }

    // Check specific permissions
    if (item.permission && !permissions[item.permission]) {
      return false;
    }

    return true;
  });

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
                {permissions.isAdminMode && "مدير"}
                {permissions.isDataEntryMode && "إدخال بيانات"}
                {permissions.isViewOnlyMode && "عرض فقط"}
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

export default RoleBasedNavigation;
