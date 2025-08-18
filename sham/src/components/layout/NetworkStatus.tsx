"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi, AlertTriangle, CheckCircle } from "lucide-react";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Check if mobile device
    setIsMobile(window.innerWidth < 768);

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setShowIndicator(true);

      // Hide the "reconnected" indicator after 3 seconds
      setTimeout(() => {
        setShowIndicator(false);
        setJustReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
      setJustReconnected(false);
    };

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for window resize to update mobile status
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Don't show indicator if online and not just reconnected
  if (isOnline && !showIndicator) {
    return null;
  }

  return (
    <>
      {/* Top Indicator (Desktop and Tablet) */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4">
        <div
          className={`
            flex items-center space-x-2 space-x-reverse px-3 md:px-4 py-2 rounded-full shadow-lg border
            transition-all duration-300 ease-in-out max-w-xs md:max-w-none
            ${
              isOnline
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }
          `}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isOnline ? (
              justReconnected ? (
                <CheckCircle className="h-4 w-4 text-green-600 animate-pulse" />
              ) : (
                <Wifi className="h-4 w-4 text-green-600" />
              )
            ) : (
              <WifiOff className="h-4 w-4 text-red-600 animate-pulse" />
            )}
          </div>

          {/* Status Text */}
          <span className="text-xs md:text-sm font-medium arabic-spacing whitespace-nowrap">
            {isOnline
              ? justReconnected
                ? "تم استعادة الاتصال"
                : "متصل"
              : "غير متصل"}
          </span>

          {/* Connection Indicator Dot */}
          <div
            className={`
              w-2 h-2 rounded-full flex-shrink-0
              ${isOnline ? "bg-green-500" : "bg-red-500 animate-pulse"}
            `}
          />
        </div>
      </div>

      {/* Bottom Banner for Mobile (Offline Only) */}
      {isMobile && !isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white p-3 shadow-lg">
          <div className="flex items-center justify-center space-x-2 space-x-reverse">
            <WifiOff className="h-4 w-4 animate-pulse no-flip" />
            <span className="text-sm font-medium arabic-spacing">
              غير متصل بالإنترنت - بعض الميزات قد لا تعمل
            </span>
          </div>
        </div>
      )}
    </>
  );
}
