"use client";

import { useState, useEffect } from "react";
import { syncManager, SyncStatus } from "@/lib/syncManager";

/**
 * Hook for managing offline functionality and sync status
 */
export const useOffline = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    pendingCount: 0,
    syncInProgress: false,
    errors: [],
  });

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onSyncStatusChange(setSyncStatus);

    // Get initial status
    setSyncStatus(syncManager.getSyncStatus());

    return unsubscribe;
  }, []);

  const queueAction = async (action: {
    type: string;
    data: any;
  }) => {
    return syncManager.queueAction(action as any);
  };

  const forceSync = async () => {
    return syncManager.forceSync();
  };

  const clearErrors = () => {
    syncManager.clearErrors();
  };

  const getStorageInfo = async () => {
    return syncManager.getStorageInfo();
  };

  return {
    ...syncStatus,
    queueAction,
    forceSync,
    clearErrors,
    getStorageInfo,
  };
};

/**
 * Hook for detecting online/offline status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Hook for PWA installation
 */
export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
    isInstallable,
    installPWA,
  };
};













