"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Wallet,
  Users,
  Receipt,
  BarChart3,
  Home,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const navigationItems: NavigationItem[] = [
  {
    id: "home",
    label: "الرئيسية",
    href: "/",
    icon: "Home",
    description: "نظرة عامة وسريعة لجميع الوحدات",
  },
  {
    id: "projects",
    label: "المشاريع",
    href: "/projects",
    icon: "Building2",
    description: "إدارة مشاريع البناء والفواتير",
  },
  {
    id: "safe",
    label: "الخزينة",
    href: "/safe",
    icon: "Wallet",
    description: "سجل التدفق النقدي والمعاملات",
  },
  {
    id: "resources",
    label: "الموارد البشرية",
    href: "/resources",
    icon: "Users",
    description: "إدارة الموظفين والرواتب",
  },
  {
    id: "expenses",
    label: "المصروفات العامة",
    href: "/general-expenses",
    icon: "Receipt",
    description: "التكاليف التشغيلية غير المرتبطة بالمشاريع",
  },
  {
    id: "reports",
    label: "التقارير المالية",
    href: "/financial-reports",
    icon: "BarChart3",
    description: "إنشاء وتصدير التقارير",
  },
];

const iconMap = {
  Home,
  Building2,
  Wallet,
  Users,
  Receipt,
  BarChart3,
  Settings,
  HelpCircle,
};

interface NavigationProps {
  collapsed?: boolean;
}

export default function Navigation({ collapsed = false }: NavigationProps) {
  const pathname = usePathname();
  const { user, hasPermission, isLoading, permissions } = useAuth();

  // Filter navigation items based on user permissions
  const getVisibleItems = (): NavigationItem[] => {
    // Don't show any items if still loading or no user/permissions
    if (isLoading || !user || permissions === null) return [];

    return navigationItems.filter((item) => {
      switch (item.id) {
        case "safe":
          // Completely hide for data entry users
          return hasPermission("canViewSafe");
        case "resources":
          // Completely hide for data entry users
          return hasPermission("canManageEmployees");
        case "home":
        case "projects":
        case "expenses":
        case "reports":
          return true; // Always visible
        default:
          return true;
      }
    });
  };

  const visibleItems = getVisibleItems();

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 z-40 h-screen bg-white border-l border-gray-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div
          className={cn(
            "flex items-center border-b border-gray-200 px-4 py-6",
            collapsed && "justify-center px-2"
          )}
        >
          <Building2 className="h-8 w-8 text-blue-600 no-flip" />
          {!collapsed && (
            <div className="mr-3">
              <h1 className="text-lg font-semibold text-gray-900">
                النظام المالي
              </h1>
              <p className="text-sm text-gray-500">لإدارة أعمال البناء</p>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium nav-item transition-smooth",
                  "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                    : "text-gray-700 hover:text-gray-900",
                  collapsed && "justify-center px-3"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 no-flip",
                    isActive ? "text-blue-600" : "text-gray-500",
                    !collapsed && "ml-3"
                  )}
                />
                {!collapsed && (
                  <span className="truncate arabic-spacing">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            "border-t border-gray-200 px-3 py-4 space-y-1",
            collapsed && "px-2"
          )}
        >
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200",
              "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
              collapsed && "justify-center"
            )}
            title={collapsed ? "الإعدادات" : undefined}
          >
            <Settings
              className={cn(
                "h-5 w-5 flex-shrink-0 text-gray-500 no-flip",
                !collapsed && "ml-3"
              )}
            />
            {!collapsed && <span className="arabic-spacing">الإعدادات</span>}
          </Link>

          <Link
            href="/help"
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200",
              "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
              collapsed && "justify-center"
            )}
            title={collapsed ? "المساعدة" : undefined}
          >
            <HelpCircle
              className={cn(
                "h-5 w-5 flex-shrink-0 text-gray-500 no-flip",
                !collapsed && "ml-3"
              )}
            />
            {!collapsed && <span className="arabic-spacing">المساعدة</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
