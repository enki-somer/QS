"use client";

import { OfflineStorage, OfflineAction } from "./offlineStorage";
import { apiRequest } from "./api";

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  syncInProgress: boolean;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  errors: string[];
}

export class SyncManager {
  private offlineStorage = new OfflineStorage();
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncQueue: OfflineAction[] = [];
  private syncInProgress = false;
  private lastSyncAttempt?: number;
  private lastSuccessfulSync?: number;
  private errors: string[] = [];
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));

      // Start background sync check
      this.startBackgroundSync();
      
      // Initialize offline storage
      this.init();
    }
  }

  private async init() {
    try {
      await this.offlineStorage.init();
      await this.loadPendingActions();
      console.log("🔄 Sync Manager initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Sync Manager:", error);
    }
  }

  private async loadPendingActions() {
    try {
      this.syncQueue = await this.offlineStorage.getUnsyncedActions();
      console.log(`📋 Loaded ${this.syncQueue.length} pending actions`);
    } catch (error) {
      console.error("❌ Failed to load pending actions:", error);
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.errors = [];
    console.log("🟢 App is now ONLINE - Starting sync...");
    this.notifyListeners();
    this.syncPendingActions();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log("🔴 App is now OFFLINE - Queuing actions...");
    this.notifyListeners();
  }

  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<string> {
    const queuedAction: OfflineAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };

    try {
      // Store in IndexedDB for persistence
      await this.offlineStorage.storePendingAction(queuedAction);

      // Add to memory queue for immediate processing if online
      this.syncQueue.push(queuedAction);

      console.log(`📝 Queued action: ${queuedAction.type} (${queuedAction.id})`);

      // If online, try to sync immediately
      if (this.isOnline && !this.syncInProgress) {
        setTimeout(() => this.syncPendingActions(), 100);
      }

      this.notifyListeners();
      return queuedAction.id;
    } catch (error) {
      console.error("❌ Failed to queue action:", error);
      throw error;
    }
  }

  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    this.lastSyncAttempt = Date.now();
    this.notifyListeners();

    try {
      // Get fresh list of pending actions
      await this.loadPendingActions();

      console.log(`🔄 Starting sync of ${this.syncQueue.length} actions...`);

      let successCount = 0;
      let errorCount = 0;

      for (const action of this.syncQueue) {
        if (!action.synced && action.retryCount < 3) {
          try {
            await this.executeAction(action);
            await this.offlineStorage.markActionSynced(action.id);
            
            // Remove from memory queue
            this.syncQueue = this.syncQueue.filter((a) => a.id !== action.id);
            
            successCount++;
            console.log(`✅ Synced action: ${action.type} (${action.id})`);
          } catch (error) {
            errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to sync action: ${action.type} (${action.id})`, error);

            // Mark action as failed and increment retry count
            await this.offlineStorage.markActionFailed(action.id, errorMessage);
            
            // Add to errors list
            this.errors.push(`${action.type}: ${errorMessage}`);
          }
        }
      }

      if (successCount > 0) {
        this.lastSuccessfulSync = Date.now();
        console.log(`✅ Sync completed: ${successCount} successful, ${errorCount} failed`);
      }

      // Clean up old synced actions
      await this.offlineStorage.clearSyncedActions();

    } catch (error) {
      console.error("❌ Sync process failed:", error);
      this.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async executeAction(action: OfflineAction): Promise<any> {
    switch (action.type) {
      case "CREATE_PROJECT":
        return apiRequest("/projects", {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "UPDATE_PROJECT":
        return apiRequest(`/projects/${action.data.id}`, {
          method: "PUT",
          body: JSON.stringify(action.data),
        });
      
      case "DELETE_PROJECT":
        return apiRequest(`/projects/${action.data.id}`, {
          method: "DELETE",
        });
      
      case "CREATE_INVOICE":
        return apiRequest("/category-invoices", {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "UPDATE_INVOICE":
        return apiRequest(`/category-invoices/${action.data.id}`, {
          method: "PUT",
          body: JSON.stringify(action.data),
        });
      
      case "DELETE_INVOICE":
        return apiRequest(`/category-invoices/${action.data.id}`, {
          method: "DELETE",
        });
      
      case "APPROVE_INVOICE":
        return apiRequest(`/category-invoices/${action.data.id}/approve`, {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "CREATE_CONTRACTOR":
        return apiRequest("/contractors", {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "UPDATE_CONTRACTOR":
        return apiRequest(`/contractors/${action.data.id}`, {
          method: "PUT",
          body: JSON.stringify(action.data),
        });
      
      case "DELETE_CONTRACTOR":
        return apiRequest(`/contractors/${action.data.id}`, {
          method: "DELETE",
        });
      
      case "UPDATE_SAFE":
        return apiRequest("/safe/fund", {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "CREATE_EMPLOYEE":
        return apiRequest("/employees", {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "UPDATE_EMPLOYEE":
        return apiRequest(`/employees/${action.data.id}`, {
          method: "PUT",
          body: JSON.stringify(action.data),
        });
      
      case "CREATE_EXPENSE":
        return apiRequest("/general-expenses", {
          method: "POST",
          body: JSON.stringify(action.data),
        });
      
      case "UPDATE_EXPENSE":
        return apiRequest(`/general-expenses/${action.data.id}`, {
          method: "PUT",
          body: JSON.stringify(action.data),
        });
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Background sync every 30 seconds when online
  private startBackgroundSync() {
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  // Get sync status for UI
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      pendingCount: this.syncQueue.filter((a) => !a.synced).length,
      syncInProgress: this.syncInProgress,
      lastSyncAttempt: this.lastSyncAttempt,
      lastSuccessfulSync: this.lastSuccessfulSync,
      errors: [...this.errors],
    };
  }

  // Force sync (for manual refresh)
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingActions();
    } else {
      throw new Error("Cannot sync while offline");
    }
  }

  // Subscribe to sync status changes
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => listener(status));
  }

  // Clear all errors
  clearErrors() {
    this.errors = [];
    this.notifyListeners();
  }

  // Get offline storage info
  async getStorageInfo() {
    return this.offlineStorage.getStorageInfo();
  }

  // Clear all offline data (for debugging)
  async clearOfflineData() {
    const stores = ['projects', 'contractors', 'invoices', 'employees', 'expenses', 'safeState'];
    for (const store of stores) {
      await this.offlineStorage.clearStore(store);
    }
    this.syncQueue = [];
    this.notifyListeners();
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();





