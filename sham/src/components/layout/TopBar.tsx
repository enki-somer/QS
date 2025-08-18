"use client";

import React from "react";
import {
  Menu,
  Search,
  Bell,
  User,
  ChevronDown,
  WifiOff,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function TopBar({
  onToggleSidebar,
  sidebarCollapsed,
}: TopBarProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isOnline, setIsOnline] = React.useState(true);
  const [showOfflineAlert, setShowOfflineAlert] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Network status monitoring
  React.useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);
    setShowOfflineAlert(!navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-30 bg-white border-b border-gray-200 transition-all duration-300",
        sidebarCollapsed ? "right-16" : "right-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-6">
        {/* Right Section */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="h-10 w-10 p-0"
          >
            <Menu className="h-5 w-5 no-flip" />
          </Button>

          {/* Search Bar */}
          <div className="relative w-96">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 no-flip" />
            <input
              type="text"
              placeholder="البحث عن المشاريع، المعاملات، الموظفين..."
              className="w-full rounded-lg border border-gray-300 pr-10 pl-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 arabic-spacing"
              dir="rtl"
            />
          </div>
        </div>

        {/* Left Section */}
        <div className="flex items-center space-x-4 space-x-reverse">
          {/* Network Status Indicator */}
          <div className="flex items-center space-x-2 space-x-reverse">
            {!isOnline ? (
              <div className="flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-full bg-red-50 border border-red-200">
                <WifiOff className="h-3 w-3 text-red-600 animate-pulse no-flip" />
                <span className="text-xs font-medium text-red-700 arabic-spacing">
                  غير متصل
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-full bg-green-50 border border-green-200 transition-all duration-300">
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
          <Button variant="ghost" size="sm" className="relative h-10 w-10 p-0">
            <Bell className="h-5 w-5 no-flip" />
            {/* Notification Badge */}
            <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white arabic-nums">
              3
            </span>
          </Button>

          {/* User Profile Dropdown */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="hidden md:block text-left text-sm">
              <div className="font-medium text-gray-900 arabic-spacing">
                مدير البناء
              </div>
              <div className="text-gray-500">admin@construction.com</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 space-x-2 space-x-reverse"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <User className="h-4 w-4 text-white no-flip" />
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 no-flip" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
