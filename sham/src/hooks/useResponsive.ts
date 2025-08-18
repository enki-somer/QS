"use client";

import { useState, useEffect } from "react";

export type ScreenSize = "mobile" | "tablet" | "desktop";

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: ScreenSize;
  width: number;
  height: number;
}

/**
 * Custom hook for responsive design detection
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px  
 * - Desktop: >= 1024px
 */
export const useResponsive = (): ResponsiveState => {
  const [screenState, setScreenState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true, // Default to desktop for SSR
    screenSize: "desktop",
    width: 1024,
    height: 768,
  });

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let screenSize: ScreenSize;
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      if (width < 768) {
        screenSize = "mobile";
        isMobile = true;
      } else if (width < 1024) {
        screenSize = "tablet";
        isTablet = true;
      } else {
        screenSize = "desktop";
        isDesktop = true;
      }

      setScreenState({
        isMobile,
        isTablet,
        isDesktop,
        screenSize,
        width,
        height,
      });
    };

    // Initial check after hydration
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isHydrated]);

  return screenState;
};

/**
 * Hook for detecting touch devices
 */
export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
};

/**
 * Hook for PWA detection
 */
export const usePWA = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isPWAMode = 
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-ignore
        window.navigator.standalone ||
        document.referrer.includes("android-app://");
      
      setIsPWA(isPWAMode);
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("PWA was installed");
    };

    checkPWA();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    isPWA,
    isInstallable,
    installPWA,
  };
};