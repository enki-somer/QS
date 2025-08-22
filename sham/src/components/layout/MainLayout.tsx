"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  Bell,
  LogOut,
  Loader2,
  Menu,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { EnhancedInvoice, EnhancedGeneralExpense } from "@/types/shared";
import ApprovalsModal from "./ApprovalsModal";
import RoleBasedNavigation from "@/components/ui/RoleBasedNavigation";
import { useResponsive } from "@/hooks/useResponsive";
import { apiRequest } from "@/lib/api";
import { NetworkMonitor } from "./NetworkMonitor";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Start with false, will be updated by NetworkMonitor
  const [isHydrated, setIsHydrated] = useState(false);
  const [networkStatusChanged, setNetworkStatusChanged] = useState(false);
  const { isMobile } = useResponsive();

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // Public routes that don't require authentication - memoized to prevent re-renders
  const isPublicRoute = useMemo(() => {
    const publicRoutes = ["/login"];
    const normalizedPathname = pathname.replace(/\/$/, "") || "/"; // Remove trailing slash
    return publicRoutes.includes(normalizedPathname);
  }, [pathname]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle network status changes from NetworkMonitor
  const handleNetworkStatusChange = React.useCallback(
    (online: boolean, statusChanged: boolean) => {
      console.log(
        `MainLayout: Network status update - Online: ${online}, Changed: ${statusChanged}`
      );
      setIsOnline(online);
      if (statusChanged) {
        setNetworkStatusChanged(true);
        setTimeout(() => setNetworkStatusChanged(false), 3000);
      }
    },
    []
  );

  // Check for pending approvals (Admin only)
  React.useEffect(() => {
    if (hasPermission("canMakePayments") && isAuthenticated) {
      const checkPendingApprovals = async () => {
        let count = 0;

        // Check pending category invoices (database API) - NEW SYSTEM
        try {
          const response = await apiRequest("/category-invoices/pending-count");
          if (response.ok) {
            const data = await response.json();
            const categoryInvoicesCount = data.count || 0;
            count += categoryInvoicesCount;
            console.log(
              `🧾 Found ${categoryInvoicesCount} pending category invoices`
            );
          }
        } catch (error) {
          console.warn("Failed to load pending category invoices:", error);
        }

        // Check pending invoices (localStorage) - LEGACY SYSTEM
        const storedInvoices = localStorage.getItem("financial-invoices");
        if (storedInvoices) {
          try {
            const invoices: EnhancedInvoice[] = JSON.parse(storedInvoices);
            const legacyCount = invoices.filter(
              (inv) => inv.status === "pending_approval"
            ).length;
            count += legacyCount;
            console.log(`🧾 Found ${legacyCount} pending legacy invoices`);
          } catch (error) {
            console.warn("Failed to load invoices for notification:", error);
          }
        }

        // Check pending global expenses (localStorage)
        const storedExpenses = localStorage.getItem("financial-expenses");
        if (storedExpenses) {
          try {
            const expenses: EnhancedGeneralExpense[] =
              JSON.parse(storedExpenses);
            const pendingGlobalExpenses = expenses.filter(
              (exp) => exp.status === "pending_approval"
            );
            console.log(
              `💰 Found ${expenses.length} global expenses, ${pendingGlobalExpenses.length} pending approval`
            );
            count += pendingGlobalExpenses.length;
          } catch (error) {
            console.warn("Failed to load expenses for notification:", error);
          }
        } else {
          console.log("💰 No global expenses found in localStorage");
        }

        // Check pending project expenses (database API)
        try {
          const response = await apiRequest("/general-expenses/pending-count");
          if (response.ok) {
            const data = await response.json();
            const projectExpensesCount = data.count || 0;
            count += projectExpensesCount;
            console.log(
              `💰 Found ${projectExpensesCount} pending project expenses`
            );
          }
        } catch (error) {
          console.warn("Failed to load pending project expenses:", error);
        }

        console.log(`🔔 Total pending items: ${count}`);
        setPendingCount(count);
      };

      // Initial check
      checkPendingApprovals();

      // Set up interval to check every 10 seconds for better responsiveness
      const pendingTimer = setInterval(checkPendingApprovals, 10000);

      // Listen for storage events to update count immediately when approvals are made
      const handleStorageChange = () => {
        checkPendingApprovals();
      };
      window.addEventListener("storage", handleStorageChange);

      // Listen for custom events from approval actions
      const handleApprovalEvent = () => {
        checkPendingApprovals();
      };
      window.addEventListener("approvalStateChanged", handleApprovalEvent);

      return () => {
        clearInterval(pendingTimer);
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("approvalStateChanged", handleApprovalEvent);
      };
    }
  }, [hasPermission, isAuthenticated]);

  // Stable redirect function to prevent infinite loops
  const handleRedirect = useCallback(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.push("/login");
      } else if (isAuthenticated && isPublicRoute) {
        router.push("/");
      }
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Authentication redirect logic
  React.useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

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

  // For public routes (e.g., login), render without mounting data providers that fetch protected APIs
  if (isPublicRoute) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  // Protected content - require authentication
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <ToastProvider>
      <EmployeeProvider>
        <NetworkMonitor
          onStatusChange={handleNetworkStatusChange}
          isHydrated={isHydrated}
        />
        <div
          className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
          dir="rtl"
        >
          {/* Top Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4">
              {!isHydrated ? (
                /* Loading/Default Header during hydration */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="bg-gradient-to-r from-[#182C61] to-blue-700 p-3 rounded-xl flex-shrink-0">
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
                      <p className="text-sm text-gray-600 arabic-spacing">
                        نظام إدارة المشاريع والمقاولين
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[20px] text-gray-400">
                        <span>بواسطة</span>
                        <img
                          src="/q.png"
                          alt="Connected"
                          className="h-6 w-auto"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 arabic-nums">
                      {currentTime.toLocaleString("ar-EG", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ) : isMobile ? (
                /* Mobile Header Layout */
                <div className="space-y-3">
                  {/* Top Row: Menu + Logo + Actions */}
                  <div className="grid grid-cols-3 items-center w-full">
                    {/* Left: Menu */}
                    <div className="flex items-center justify-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 flex-shrink-0"
                        title={
                          isMobileMenuOpen
                            ? "إغلاق القائمة"
                            : "فتح قائمة التنقل"
                        }
                      >
                        {isMobileMenuOpen ? (
                          <X className="h-5 w-5" />
                        ) : (
                          <Menu className="h-5 w-5" />
                        )}
                      </Button>
                    </div>

                    {/* Center: Logo */}
                    <div className="flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gradient-to-r from-[#182C61] to-blue-700 p-2.5 rounded-xl flex-shrink-0">
                          <img
                            src="/QS-WHITE.svg"
                            alt="شركة قصر الشام"
                            width={28}
                            height={28}
                            style={{ display: "block" }}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                          <span>بواسطة</span>
                          <img
                            src="/q.png"
                            alt="Connected"
                            className="h-3 w-auto"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-end gap-2">
                      {/* Network Status - Compact */}
                      <div className="flex items-center">
                        {!isOnline ? (
                          <div
                            className={`flex items-center px-2 py-1 rounded-full bg-red-50 border border-red-200 ${
                              networkStatusChanged ? "animate-bounce" : ""
                            }`}
                          >
                            <WifiOff className="h-3 w-3 text-red-600 animate-pulse no-flip" />
                            <span className="text-xs text-red-600 mr-1 arabic-spacing">
                              غير متصل
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center px-2 py-1 rounded-full bg-green-50 border border-green-200 ${
                              networkStatusChanged ? "animate-bounce" : ""
                            }`}
                          >
                            <Wifi className="h-3 w-3 text-green-600 no-flip" />
                            <span className="text-xs text-green-600 mr-1 arabic-spacing">
                              متصل
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notifications */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="relative h-9 w-9 p-0"
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
                        <Bell className="h-4 w-4 no-flip" />
                        {hasPermission("canMakePayments") &&
                          pendingCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white arabic-nums animate-pulse">
                              {pendingCount > 9 ? "9+" : pendingCount}
                            </span>
                          )}
                      </Button>

                      {/* User Avatar */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#182C61]">
                        <User className="h-4 w-4 text-white no-flip" />
                      </div>

                      {/* Logout */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="h-9 w-9 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        title="تسجيل الخروج"
                      >
                        <LogOut className="h-4 w-4 no-flip" />
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Row: User Info + Time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-right">
                      <div className="font-medium text-gray-900 arabic-spacing">
                        {user?.fullName && !user.fullName.includes("?")
                          ? user.fullName
                          : user?.username || "مستخدم"}
                      </div>
                      <div className="text-xs text-gray-500 arabic-spacing">
                        {(() => {
                          const role = user?.role as string;
                          if (role === "admin") return "المدير العام";
                          if (role === "partners" || role === "partner")
                            return "شريك";
                          if (role === "data_entry" || role === "dataentry")
                            return "مدخل بيانات";
                          return "موظف إدخال البيانات";
                        })()}
                      </div>
                    </div>

                    <div className="text-gray-600 arabic-nums text-xs">
                      {currentTime.toLocaleString("ar-EG", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop Header Layout */
                <div className="flex items-center justify-between">
                  {/* Logo and Company Info */}
                  <div className="flex items-center gap-5">
                    <div className="bg-gradient-to-r from-[#182C61] to-blue-700 p-3 rounded-xl flex-shrink-0">
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
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                        <span>بواسطة</span>
                        <img
                          src="/q.png"
                          alt="Connected"
                          className="h-3 w-auto"
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    {/* Network Status Indicator */}
                    <div className="flex items-center">
                      {!isOnline ? (
                        <div
                          className={`flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-full bg-red-50 border border-red-200 ${
                            networkStatusChanged ? "animate-bounce" : ""
                          }`}
                        >
                          <WifiOff className="h-3 w-3 text-red-600 animate-pulse no-flip" />
                          <span className="text-xs font-medium text-red-700 arabic-spacing">
                            غير متصل
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-full bg-green-50 border border-green-200 transition-all duration-300 ${
                            networkStatusChanged ? "animate-bounce" : ""
                          }`}
                        >
                          <Wifi className="h-3 w-3 text-green-600 no-flip" />
                          <span className="text-xs font-medium text-green-700 arabic-spacing">
                            متصل
                          </span>
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>

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
                          {user?.fullName && !user.fullName.includes("?")
                            ? user.fullName
                            : user?.username || "مستخدم"}
                        </div>
                        <div className="text-xs text-gray-500 arabic-spacing">
                          {(() => {
                            const role = user?.role as string;
                            if (role === "admin") return "المدير العام";
                            if (role === "partners" || role === "partner")
                              return "شريك";
                            if (role === "data_entry" || role === "dataentry")
                              return "مدخل بيانات";
                            return "موظف إدخال البيانات";
                          })()}
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
              )}
            </div>
          </header>

          {/* Mobile Navigation - Only render when mobile and menu is open */}
          {isMobile && (
            <RoleBasedNavigation
              isMobileMenuOpen={isMobileMenuOpen}
              onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          )}

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
      </EmployeeProvider>
    </ToastProvider>
  );
}
