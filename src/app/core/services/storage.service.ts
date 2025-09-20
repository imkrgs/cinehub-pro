import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly isLocalStorageAvailable: boolean;
  private readonly memoryStorage = new Map<string, string>();

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  // Set item in storage
  setItem(key: string, value: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(this.getPrefixedKey(key), value);
      } else {
        this.memoryStorage.set(this.getPrefixedKey(key), value);
      }
    } catch (error) {
      console.error('Error setting storage item:', error);
      // Fallback to memory storage
      this.memoryStorage.set(this.getPrefixedKey(key), value);
    }
  }

  // Get item from storage
  getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(this.getPrefixedKey(key));
      } else {
        return this.memoryStorage.get(this.getPrefixedKey(key)) || null;
      }
    } catch (error) {
      console.error('Error getting storage item:', error);
      return this.memoryStorage.get(this.getPrefixedKey(key)) || null;
    }
  }

  // Remove item from storage
  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(this.getPrefixedKey(key));
      } else {
        this.memoryStorage.delete(this.getPrefixedKey(key));
      }
    } catch (error) {
      console.error('Error removing storage item:', error);
      this.memoryStorage.delete(this.getPrefixedKey(key));
    }
  }

  // Clear all storage
  clear(): void {
    try {
      if (this.isLocalStorageAvailable) {
        // Only clear items with our prefix
        const keys = Object.keys(localStorage);
        const prefix = this.getStoragePrefix();

        keys.forEach(key => {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        });
      } else {
        this.memoryStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
      this.memoryStorage.clear();
    }
  }

  // Check if key exists
  hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  // Get all keys with prefix
  getAllKeys(): string[] {
    try {
      if (this.isLocalStorageAvailable) {
        const keys = Object.keys(localStorage);
        const prefix = this.getStoragePrefix();
        return keys
          .filter(key => key.startsWith(prefix))
          .map(key => key.replace(prefix, ''));
      } else {
        const prefix = this.getStoragePrefix();
        return Array.from(this.memoryStorage.keys())
          .map(key => key.replace(prefix, ''));
      }
    } catch (error) {
      console.error('Error getting storage keys:', error);
      return [];
    }
  }

  // Set object (automatically stringify)
  setObject<T>(key: string, obj: T): void {
    try {
      this.setItem(key, JSON.stringify(obj));
    } catch (error) {
      console.error('Error storing object:', error);
    }
  }

  // Get object (automatically parse)
  getObject<T>(key: string): T | null {
    try {
      const item = this.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error parsing stored object:', error);
      return null;
    }
  }

  // Set item with expiration
  setItemWithExpiry(key: string, value: string, expiryInMs: number): void {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + expiryInMs
    };
    this.setItem(key, JSON.stringify(item));
  }

  // Get item with expiration check
  getItemWithExpiry(key: string): string | null {
    try {
      const itemStr = this.getItem(key);
      if (!itemStr) {
        return null;
      }

      const item = JSON.parse(itemStr);
      const now = new Date();

      if (now.getTime() > item.expiry) {
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Error getting item with expiry:', error);
      this.removeItem(key); // Remove corrupted item
      return null;
    }
  }

  // Get storage size (approximate)
  getStorageSize(): number {
    try {
      if (this.isLocalStorageAvailable) {
        let totalSize = 0;
        const prefix = this.getStoragePrefix();

        for (const key in localStorage) {
          if (key.startsWith(prefix)) {
            totalSize += localStorage[key].length + key.length;
          }
        }

        return totalSize;
      } else {
        let totalSize = 0;
        this.memoryStorage.forEach((value, key) => {
          totalSize += value.length + key.length;
        });
        return totalSize;
      }
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  // Clean up expired items
  cleanupExpiredItems(): void {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => {
        this.getItemWithExpiry(key); // This will automatically remove expired items
      });
    } catch (error) {
      console.error('Error cleaning up expired items:', error);
    }
  }

  // Export storage data
  exportData(): Record<string, any> {
    try {
      const data: Record<string, any> = {};
      const keys = this.getAllKeys();

      keys.forEach(key => {
        const value = this.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      });

      return data;
    } catch (error) {
      console.error('Error exporting storage data:', error);
      return {};
    }
  }

  // Import storage data
  importData(data: Record<string, any>): void {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          this.setItem(key, value);
        } else {
          this.setObject(key, value);
        }
      });
    } catch (error) {
      console.error('Error importing storage data:', error);
    }
  }

  // Private helper methods
  private checkLocalStorageAvailability(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }

      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getStoragePrefix(): string {
    return 'cinehub_';
  }

  private getPrefixedKey(key: string): string {
    return `${this.getStoragePrefix()}${key}`;
  }

  // Session storage methods (for temporary data)
  setSessionItem(key: string, value: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.getPrefixedKey(key), value);
      } else {
        // Fallback to regular storage with shorter expiry
        this.setItemWithExpiry(key, value, 30 * 60 * 1000); // 30 minutes
      }
    } catch (error) {
      console.error('Error setting session storage item:', error);
    }
  }

  getSessionItem(key: string): string | null {
    try {
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(this.getPrefixedKey(key));
      } else {
        return this.getItemWithExpiry(key);
      }
    } catch (error) {
      console.error('Error getting session storage item:', error);
      return null;
    }
  }

  removeSessionItem(key: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(this.getPrefixedKey(key));
      } else {
        this.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing session storage item:', error);
    }
  }

  clearSessionStorage(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const keys = Object.keys(sessionStorage);
        const prefix = this.getStoragePrefix();

        keys.forEach(key => {
          if (key.startsWith(prefix)) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Error clearing session storage:', error);
    }
  }
}