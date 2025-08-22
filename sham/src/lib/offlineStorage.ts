"use client";

/**
 * Offline Storage System for QS Financial Management
 * Uses IndexedDB for persistent offline data storage
 */

export interface OfflineAction {
  id: string;
  type: 
    | "CREATE_PROJECT"
    | "UPDATE_PROJECT"
    | "DELETE_PROJECT"
    | "CREATE_INVOICE"
    | "UPDATE_INVOICE"
    | "DELETE_INVOICE"
    | "APPROVE_INVOICE"
    | "CREATE_CONTRACTOR"
    | "UPDATE_CONTRACTOR"
    | "DELETE_CONTRACTOR"
    | "UPDATE_SAFE"
    | "CREATE_EMPLOYEE"
    | "UPDATE_EMPLOYEE"
    | "CREATE_EXPENSE"
    | "UPDATE_EXPENSE";
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  syncedAt?: number;
  error?: string;
}

export class OfflineStorage {
  private dbName = "QSFinancialDB";
  private version = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for offline data
        if (!db.objectStoreNames.contains("projects")) {
          const projectStore = db.createObjectStore("projects", { keyPath: "id" });
          projectStore.createIndex("code", "code", { unique: true });
          projectStore.createIndex("status", "status");
        }

        if (!db.objectStoreNames.contains("contractors")) {
          const contractorStore = db.createObjectStore("contractors", { keyPath: "id" });
          contractorStore.createIndex("name", "name");
          contractorStore.createIndex("isActive", "isActive");
        }

        if (!db.objectStoreNames.contains("invoices")) {
          const invoiceStore = db.createObjectStore("invoices", { keyPath: "id" });
          invoiceStore.createIndex("projectId", "projectId");
          invoiceStore.createIndex("status", "status");
          invoiceStore.createIndex("createdAt", "createdAt");
        }

        if (!db.objectStoreNames.contains("employees")) {
          const employeeStore = db.createObjectStore("employees", { keyPath: "id" });
          employeeStore.createIndex("name", "name");
          employeeStore.createIndex("position", "position");
          employeeStore.createIndex("isActive", "isActive");
        }

        if (!db.objectStoreNames.contains("expenses")) {
          const expenseStore = db.createObjectStore("expenses", { keyPath: "id" });
          expenseStore.createIndex("type", "type");
          expenseStore.createIndex("status", "status");
          expenseStore.createIndex("createdAt", "createdAt");
        }

        if (!db.objectStoreNames.contains("safeState")) {
          db.createObjectStore("safeState", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("pendingActions")) {
          const actionStore = db.createObjectStore("pendingActions", {
            keyPath: "id",
            autoIncrement: true,
          });
          actionStore.createIndex("type", "type");
          actionStore.createIndex("synced", "synced");
          actionStore.createIndex("timestamp", "timestamp");
        }

        if (!db.objectStoreNames.contains("appSettings")) {
          db.createObjectStore("appSettings", { keyPath: "key" });
        }
      };
    });
  }

  async storeData(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getData(storeName: string, key?: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      
      const request = key ? store.get(key) : store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteData(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Specific methods for QS Financial System

  async storeProject(project: any): Promise<void> {
    return this.storeData("projects", { ...project, lastModified: Date.now() });
  }

  async getProjects(): Promise<any[]> {
    return this.getData("projects");
  }

  async storeContractor(contractor: any): Promise<void> {
    return this.storeData("contractors", { ...contractor, lastModified: Date.now() });
  }

  async getContractors(): Promise<any[]> {
    return this.getData("contractors");
  }

  async storeInvoice(invoice: any): Promise<void> {
    return this.storeData("invoices", { ...invoice, lastModified: Date.now() });
  }

  async getInvoices(): Promise<any[]> {
    return this.getData("invoices");
  }

  async getInvoicesByProject(projectId: string): Promise<any[]> {
    return this.getByIndex("invoices", "projectId", projectId);
  }

  async storeSafeState(safeState: any): Promise<void> {
    return this.storeData("safeState", { id: "current", ...safeState, lastModified: Date.now() });
  }

  async getSafeState(): Promise<any> {
    return this.getData("safeState", "current");
  }

  async storeEmployee(employee: any): Promise<void> {
    return this.storeData("employees", { ...employee, lastModified: Date.now() });
  }

  async getEmployees(): Promise<any[]> {
    return this.getData("employees");
  }

  async storeExpense(expense: any): Promise<void> {
    return this.storeData("expenses", { ...expense, lastModified: Date.now() });
  }

  async getExpenses(): Promise<any[]> {
    return this.getData("expenses");
  }

  async storePendingAction(action: OfflineAction): Promise<string> {
    const actionWithId = {
      ...action,
      id: action.id || Date.now().toString(),
      timestamp: action.timestamp || Date.now(),
      synced: false,
      retryCount: 0,
    };

    await this.storeData("pendingActions", actionWithId);
    return actionWithId.id;
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    return this.getData("pendingActions");
  }

  async getUnsyncedActions(): Promise<OfflineAction[]> {
    return this.getByIndex("pendingActions", "synced", false);
  }

  async markActionSynced(actionId: string): Promise<void> {
    const action = await this.getData("pendingActions", actionId);
    if (action) {
      action.synced = true;
      action.syncedAt = Date.now();
      await this.storeData("pendingActions", action);
    }
  }

  async markActionFailed(actionId: string, error: string): Promise<void> {
    const action = await this.getData("pendingActions", actionId);
    if (action) {
      action.retryCount = (action.retryCount || 0) + 1;
      action.error = error;
      await this.storeData("pendingActions", action);
    }
  }

  async clearSyncedActions(): Promise<void> {
    const allActions = await this.getPendingActions();
    const syncedActions = allActions.filter(action => action.synced);
    
    for (const action of syncedActions) {
      await this.deleteData("pendingActions", action.id);
    }
  }

  async getStorageInfo(): Promise<{
    projects: number;
    contractors: number;
    invoices: number;
    employees: number;
    expenses: number;
    pendingActions: number;
  }> {
    return {
      projects: await this.count("projects"),
      contractors: await this.count("contractors"),
      invoices: await this.count("invoices"),
      employees: await this.count("employees"),
      expenses: await this.count("expenses"),
      pendingActions: await this.count("pendingActions"),
    };
  }
}














