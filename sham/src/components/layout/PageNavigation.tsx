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
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navigationItems = [
  {
    id: "home",
    label: "الرئيسية",
    href: "/",
    icon: Home,
  },
  {
    id: "projects",
    label: "المشاريع",
    href: "/projects",
    icon: Building2,
  },
  {
    id: "safe",
    label: "الخزينة",
    href: "/safe",
    icon: Wallet,
  },
  {
    id: "contractors",
    label: "المقاولين",
    href: "/contractors",
    icon: UserCheck,
  },
  {
    id: "resources",
    label: "الموارد البشرية",
    href: "/resources",
    icon: Users,
  },
  {
    id: "expenses",
    label: "المصروفات العامة",
    href: "/general-expenses",
    icon: Receipt,
  },
  {
    id: "reports",
    label: "التقارير المالية",
    href: "/financial-reports",
    icon: BarChart3,
  },
];

interface PageNavigationProps {
  currentPage?: string;
}

export default function PageNavigation({ currentPage }: PageNavigationProps) {
  const pathname = usePathname();
  const { user, hasPermission, isLoading, permissions } = useAuth();

  // Filter navigation items based on user permissions
  const getVisibleItems = () => {
    // Don't show any items if still loading or no user/permissions
    if (isLoading || !user || permissions === null) return [];

    return navigationItems.filter((item) => {
      switch (item.id) {
        case "safe":
          // Completely hide for data entry users
          return hasPermission("canViewSafe");
        case "contractors":
          // Available to all authenticated users
          return true;
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

  // Don't render navigation if no items are visible
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 arabic-spacing">
          التنقل السريع:
        </h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isCurrent = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-sm font-medium nav-item transition-smooth",
                  isActive
                    ? "bg-[#182C61] text-white shadow-sm"
                    : "text-gray-600 hover:text-[#182C61] hover:bg-blue-50",
                  isCurrent && "ring-2 ring-[#182C61]/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 no-flip",
                    isActive ? "text-white" : "text-gray-500"
                  )}
                />
                <span className="arabic-spacing">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
