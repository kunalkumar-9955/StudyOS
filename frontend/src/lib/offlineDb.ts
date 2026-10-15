/**
 * StudyOS IndexedDB & Offline Sync Queue
 * Provides local caching of subjects, timetable, notes, and queued sync mutations.
 */

const DB_NAME = "StudyOS_Offline_DB";
const DB_VERSION = 1;

export interface QueuedOperation {
  id: string;
  operation_id: string;
  entity_type: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: any;
  timestamp: number;
}

export class OfflineStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !("indexedDB" in window)) {
          return reject(new Error("IndexedDB not supported"));
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains("sync_queue")) {
            db.createObjectStore("sync_queue", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("cached_data")) {
            db.createObjectStore("cached_data", { keyPath: "key" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  static async setCached<T>(key: string, data: T): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction("cached_data", "readwrite");
      const store = tx.objectStore("cached_data");
      store.put({ key, data, updated_at: Date.now() });
    } catch (e) {
      console.warn("[OfflineDB] Failed to cache:", key, e);
    }
  }

  static async getCached<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction("cached_data", "readonly");
      const store = tx.objectStore("cached_data");
      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  static async queueOperation(entity_type: string, action: "CREATE" | "UPDATE" | "DELETE", payload: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const op: QueuedOperation = {
        id: crypto.randomUUID(),
        operation_id: crypto.randomUUID(),
        entity_type,
        action,
        payload,
        timestamp: Date.now(),
      };
      store.put(op);
    } catch (e) {
      console.warn("[OfflineDB] Failed to queue op:", e);
    }
  }

  static async getQueue(): Promise<QueuedOperation[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_queue", "readonly");
      const store = tx.objectStore("sync_queue");
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  static async clearQueue(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_queue", "readwrite");
      tx.objectStore("sync_queue").clear();
    } catch (e) {
      console.warn("[OfflineDB] Failed to clear queue:", e);
    }
  }
}
