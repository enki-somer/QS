"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Bell, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedInvoice, EnhancedGeneralExpense } from "@/types/shared";
import ApprovalsModal from "./ApprovalsModal";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading, isAuthenticated, hasPermission } = useAuth();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Public routes that don't require authentication
  const publicRoutes = ["/login"];
  const isPublicRoute = publicRoutes.includes(pathname);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check for pending approvals (Admin only)
  React.useEffect(() => {
    if (hasPermission("canMakePayments") && isAuthenticated) {
      const checkPendingApprovals = () => {
        let count = 0;

        // Check pending invoices
        const storedInvoices = localStorage.getItem("financial-invoices");
        if (storedInvoices) {
          try {
            const invoices: EnhancedInvoice[] = JSON.parse(storedInvoices);
            count += invoices.filter(
              (inv) => inv.status === "pending_approval"
            ).length;
          } catch (error) {
            console.warn("Failed to load invoices for notification:", error);
          }
        }

        // Check pending expenses
        const storedExpenses = localStorage.getItem("financial-expenses");
        if (storedExpenses) {
          try {
            const expenses: EnhancedGeneralExpense[] =
              JSON.parse(storedExpenses);
            count += expenses.filter(
              (exp) => exp.status === "pending_approval"
            ).length;
          } catch (error) {
            console.warn("Failed to load expenses for notification:", error);
          }
        }

        setPendingCount(count);
      };

      // Initial check
      checkPendingApprovals();

      // Set up interval to check every 30 seconds
      const pendingTimer = setInterval(checkPendingApprovals, 30000);

      // Listen for storage events to update count immediately when approvals are made
      const handleStorageChange = () => {
        checkPendingApprovals();
      };
      window.addEventListener("storage", handleStorageChange);

      return () => {
        clearInterval(pendingTimer);
        window.removeEventListener("storage", handleStorageChange);
      };
    }
  }, [hasPermission, isAuthenticated]);

  // Authentication redirect logic
  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.push("/login");
      } else if (isAuthenticated && isPublicRoute) {
        router.push("/");
      }
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Show loading screen during authentication check
  if (isLoading) {
    return (
      <ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600 arabic-spacing">
              جاري التحقق من صحة البيانات...
            </p>
          </div>
        </div>
      </ToastProvider>
    );
  }

  // For login page, show without header
  if (isPublicRoute) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  // Protected content - require authentication
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <ToastProvider>
      <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
        dir="rtl"
      >
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
              {/* Logo and Company Info */}
              <div className="flex items-center gap-3 md:gap-5">
                <div className="bg-gradient-to-r from-[#182C61] to-blue-700 p-2.5 md:p-3 rounded-xl flex-shrink-0">
                  <img
                    src="/QS-WHITE.svg"
                    alt="شركة قصر الشام"
                    width={32}
                    height={32}
                    style={{ display: "block" }}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 arabic-spacing">
                    شركة قصر الشام
                  </h1>
                  <p className="text-sm text-gray-500 arabic-spacing">
                    نظام الإدارة المالية المتكامل
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* Current Time */}
                <div className="hidden md:block text-sm text-gray-600 arabic-nums">
                  {currentTime.toLocaleString("ar-EG", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-10 w-10 p-0"
                  onClick={() =>
                    hasPermission("canMakePayments")
                      ? setShowApprovalsModal(true)
                      : undefined
                  }
                  title={
                    hasPermission("canMakePayments")
                      ? `${pendingCount} عنصر بانتظار الاعتماد`
                      : "الإشعارات"
                  }
                >
                  <Bell className="h-5 w-5 no-flip" />
                  {hasPermission("canMakePayments") && pendingCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white arabic-nums animate-pulse">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </Button>

                {/* User Profile */}
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="hidden md:block text-right text-sm">
                    <div className="font-medium text-gray-900 arabic-spacing">
                      {user?.fullName}
                    </div>
                    <div className="text-xs text-gray-500 arabic-spacing">
                      {user?.role === "admin"
                        ? "المدير العام"
                        : "موظف إدخال البيانات"}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#182C61]">
                    <User className="h-5 w-5 text-white no-flip" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="h-10 w-10 p-0 text-red-600 hover:bg-red-50"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </div>

      {/* Approvals Modal */}
      {hasPermission("canMakePayments") && (
        <ApprovalsModal
          isOpen={showApprovalsModal}
          onClose={() => setShowApprovalsModal(false)}
        />
      )}
    </ToastProvider>
  );
}
