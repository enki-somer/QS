"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed
    const isAppInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isAppInstalled);

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show install prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        if (!isAppInstalled) {
          setShowInstallPrompt(true);
        }
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, show install prompt after delay if not installed
    if (iOS && !isAppInstalled) {
      const hasSeenIOSPrompt = localStorage.getItem("ios-install-prompt-seen");
      if (!hasSeenIOSPrompt) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("PWA installed successfully");
      }

      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleIOSInstallDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem("ios-install-prompt-seen", "true");
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    if (isIOS) {
      localStorage.setItem("ios-install-prompt-seen", "true");
    }
  };

  // Don't show if already installed
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-2xl border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Smartphone className="h-5 w-5 no-flip" />
              <h3 className="font-bold arabic-spacing">تثبيت التطبيق</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 no-flip" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <p className="text-sm text-blue-100 arabic-spacing leading-relaxed">
              احصل على تجربة أفضل! ثبت تطبيق قصر الشام على جهازك للوصول السريع
              والعمل بدون إنترنت.
            </p>

            {/* iOS Instructions */}
            {isIOS && (
              <div className="bg-white/10 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium arabic-spacing">
                  خطوات التثبيت على iPhone:
                </p>
                <div className="space-y-1 text-xs text-blue-100 arabic-spacing">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Share className="h-3 w-3 no-flip flex-shrink-0" />
                    <span>1. اضغط على أيقونة المشاركة</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Download className="h-3 w-3 no-flip flex-shrink-0" />
                    <span>2. اختر "إضافة إلى الشاشة الرئيسية"</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Smartphone className="h-3 w-3 no-flip flex-shrink-0" />
                    <span>3. اضغط "إضافة" لإكمال التثبيت</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 space-x-reverse">
              {!isIOS && deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  className="flex-1 bg-white text-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 ml-2 no-flip" />
                  <span className="arabic-spacing">تثبيت الآن</span>
                </Button>
              )}

              {isIOS && (
                <Button
                  onClick={handleIOSInstallDismiss}
                  className="flex-1 bg-white text-blue-600 hover:bg-blue-50"
                >
                  <span className="arabic-spacing">فهمت</span>
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="text-white hover:bg-white/20"
              >
                <span className="arabic-spacing">لاحقاً</span>
              </Button>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-100">
              <div className="arabic-spacing">✓ وصول سريع</div>
              <div className="arabic-spacing">✓ عمل بدون إنترنت</div>
              <div className="arabic-spacing">✓ إشعارات فورية</div>
              <div className="arabic-spacing">✓ تجربة أصلية</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
