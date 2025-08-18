"use client";

import React, { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

interface NetworkMonitorProps {
  onStatusChange: (isOnline: boolean, statusChanged: boolean) => void;
  isHydrated: boolean;
}

export const NetworkMonitor: React.FC<NetworkMonitorProps> = ({
  onStatusChange,
  isHydrated,
}) => {
  const { addToast } = useToast();
  const currentStatusRef = useRef<boolean>(true);
  const isCheckingRef = useRef<boolean>(false);
  const statusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);

  useEffect(() => {
    if (!isHydrated) return;

    // Enhanced network detection function
    const checkNetworkStatus = async () => {
      if (isCheckingRef.current) return; // Prevent multiple simultaneous checks
      isCheckingRef.current = true;

      const previousStatus = currentStatusRef.current;
      let newStatus = false;

      try {
        // First check navigator.onLine
        if (!navigator.onLine) {
          console.log("Navigator reports offline");
          newStatus = false;
        } else {
          // Try multiple connectivity tests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // Shorter timeout

          try {
            // Test 1: Try to fetch from an external reliable source
            const response = await fetch("https://www.google.com/favicon.ico", {
              method: "HEAD",
              mode: "no-cors", // Avoid CORS issues
              cache: "no-store", // Force fresh request
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            newStatus = true; // If we reach here, we have internet
            console.log("External connectivity test passed");
          } catch (externalError) {
            console.log(
              "External test failed, trying local test:",
              externalError
            );

            // Test 2: Fallback to local resource with cache busting
            try {
              const localResponse = await fetch(
                `/favicon.ico?t=${Date.now()}`,
                {
                  method: "HEAD",
                  cache: "no-store",
                  signal: controller.signal,
                }
              );

              // Only consider it online if we get a successful response AND navigator says online
              newStatus = localResponse.ok && navigator.onLine;
              console.log("Local connectivity test result:", localResponse.ok);
            } catch (localError) {
              console.log("Local test also failed:", localError);
              newStatus = false;
            }
          }
        }
      } catch (error) {
        console.log("Network check failed:", error);
        newStatus = false;
      }

      // Handle status changes with debouncing
      if (newStatus) {
        // Online: Reset failure count and update immediately
        consecutiveFailuresRef.current = 0;

        if (!previousStatus) {
          console.log(
            `Network restored after ${consecutiveFailuresRef.current} failures`
          );
          currentStatusRef.current = true;

          addToast({
            type: "success",
            title: "تم الاتصال بالإنترنت بنجاح",
            message: "",
            duration: 3000,
          });

          onStatusChange(true, true);
        } else {
          onStatusChange(true, false);
        }
      } else {
        // Offline: Increment failure count
        consecutiveFailuresRef.current++;
        console.log(
          `Network check failed. Consecutive failures: ${consecutiveFailuresRef.current}`
        );

        // Only mark as offline after 2 consecutive failures to avoid false positives
        if (consecutiveFailuresRef.current >= 2 && previousStatus) {
          console.log(
            `Network marked as offline after ${consecutiveFailuresRef.current} consecutive failures`
          );

          // Clear any pending status change
          if (statusChangeTimeoutRef.current) {
            clearTimeout(statusChangeTimeoutRef.current);
          }

          // Debounce the offline status change
          statusChangeTimeoutRef.current = setTimeout(() => {
            currentStatusRef.current = false;

            addToast({
              type: "error",
              title: "انقطع الاتصال",
              message: "تم فقدان الاتصال بالإنترنت",
              duration: 5000,
            });

            onStatusChange(false, true);
          }, 1000); // 1 second delay to confirm offline status
        } else if (!previousStatus) {
          // Already offline, just update without animation
          onStatusChange(false, false);
        }
      }

      isCheckingRef.current = false;
    };

    const handleOnline = () => {
      console.log("Browser detected online event");
      setTimeout(checkNetworkStatus, 100); // Small delay to ensure network is actually ready
    };

    const handleOffline = () => {
      console.log("Browser detected offline event - immediate offline");
      const previousStatus = currentStatusRef.current;

      // Clear any pending status changes
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
      }

      // Immediately mark as offline when browser detects it
      currentStatusRef.current = false;
      consecutiveFailuresRef.current = 3; // Set high failure count

      if (previousStatus) {
        addToast({
          type: "error",
          title: "انقطع الاتصال",
          message: "تم فقدان الاتصال بالإنترنت",
          duration: 5000,
        });
        onStatusChange(false, true);
      } else {
        onStatusChange(false, false);
      }
    };

    // Initial status check
    currentStatusRef.current = navigator.onLine;
    checkNetworkStatus();

    // Listen to browser events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic network check every 3 seconds
    const networkCheckInterval = setInterval(checkNetworkStatus, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(networkCheckInterval);
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
      }
    };
  }, [isHydrated, onStatusChange, addToast]);

  return null; // This component doesn't render anything
};
