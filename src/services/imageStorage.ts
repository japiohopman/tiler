/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * IndexedDB Image Storage Boundary for Tiler Workspace
 *
 * Persists large binary image Data URLs (raw, edited, processed) in IndexedDB
 * to keep localStorage lightweight and avoid browser storage quota limits.
 *
 * Database Name: tiler_workspace_db
 * Store Name: images
 */

const DB_NAME = 'tiler_workspace_db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export interface SaveImageResult {
  success: boolean;
  isPersistent: boolean;
  error?: string;
}

class ImageStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private inMemoryFallback: Map<string, string> = new Map();

  private isIndexedDBAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      'indexedDB' in window &&
      window.indexedDB !== null
    );
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable()) {
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = (err) => {
          console.warn('[ImageStorage] Failed to open IndexedDB, falling back to memory:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('[ImageStorage] IndexedDB initialization exception:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves a base64 Data URL image string into IndexedDB under key.
   * Returns isPersistent = true ONLY if saved to durable IndexedDB storage.
   * If IndexedDB is unavailable or fails, saves to runtime Map and returns isPersistent = false.
   */
  public async saveImage(key: string, dataUrl: string): Promise<SaveImageResult> {
    if (!key || !dataUrl) {
      return { success: false, isPersistent: false, error: 'Key and dataUrl are required' };
    }

    const db = await this.getDB();
    if (!db) {
      this.inMemoryFallback.set(key, dataUrl);
      return {
        success: true,
        isPersistent: false,
        error: 'IndexedDB is unavailable; stored in runtime memory fallback only.',
      };
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(dataUrl, key);

        req.onsuccess = () => {
          resolve({ success: true, isPersistent: true });
        };

        req.onerror = () => {
          console.warn(`[ImageStorage] Failed to store image for key ${key}:`, req.error);
          this.inMemoryFallback.set(key, dataUrl);
          resolve({
            success: true,
            isPersistent: false,
            error: `IndexedDB write error (${req.error?.message || 'unknown'}); stored in runtime memory fallback.`,
          });
        };
      } catch (err: any) {
        console.warn(`[ImageStorage] Transaction exception for key ${key}:`, err);
        this.inMemoryFallback.set(key, dataUrl);
        resolve({
          success: true,
          isPersistent: false,
          error: `IndexedDB transaction exception (${err?.message || 'unknown'}); stored in runtime memory fallback.`,
        });
      }
    });
  }

  /**
   * Loads a base64 Data URL image string from IndexedDB by key
   */
  public async loadImage(key: string): Promise<string | null> {
    if (!key) return null;

    const db = await this.getDB();
    if (!db) {
      return this.inMemoryFallback.get(key) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result = req.result;
          if (typeof result === 'string' && result.length > 0) {
            resolve(result);
          } else {
            resolve(this.inMemoryFallback.get(key) || null);
          }
        };

        req.onerror = () => {
          resolve(this.inMemoryFallback.get(key) || null);
        };
      } catch {
        resolve(this.inMemoryFallback.get(key) || null);
      }
    });
  }

  /**
   * Deletes an image by key
   */
  public async deleteImage(key: string): Promise<void> {
    if (!key) return;

    this.inMemoryFallback.delete(key);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Deletes all image blobs associated with a given asset ID
   */
  public async deleteAssetImages(assetId: string): Promise<void> {
    if (!assetId) return;
    await Promise.all([
      this.deleteImage(`raw_${assetId}`),
      this.deleteImage(`edited_${assetId}`),
      this.deleteImage(`processed_${assetId}`),
    ]);
  }

  /**
   * Clears all stored image blobs from IndexedDB and fallback
   */
  public async clearAllImages(): Promise<void> {
    this.inMemoryFallback.clear();

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const imageStorage = new ImageStorage();
