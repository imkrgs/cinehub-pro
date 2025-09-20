import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@environments/environment';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly _cacheStats = signal({
    totalItems: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0
  });

  readonly cacheStats = this._cacheStats.asReadonly();
  private tokenRefreshTimer?: ReturnType<typeof setTimeout>;
  private cleanupTimer: number | undefined;

  constructor() {
    this.startCleanupTimer();
  }

  // Get cached item
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.updateStats('miss');
      return null;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.updateCacheStats();
      this.updateStats('miss');
      return null;
    }

    this.updateStats('hit');
    return item.data;
  }

  // Set cache item
  set<T>(key: string, data: T, ttl?: number): void {
    const expirationTime = ttl || environment.cache.defaultTtl;
    const now = Date.now();

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt: now + expirationTime,
      key
    };

    this.cache.set(key, item);
    this.updateCacheStats();

    // If cache is getting too large, clean up
    if (this.cache.size > environment.cache.maxItems) {
      this.cleanup();
    }
  }

  // Remove cached item
  remove(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateCacheStats();
    }
    return deleted;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.updateCacheStats();
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? !this.isExpired(item) : false;
  }

  // Get all cache keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Wrap observable with caching
  wrapObservable<T>(
    key: string, 
    observable: Observable<T>, 
    ttl?: number
  ): Observable<T> {
    const cached = this.get<T>(key);

    if (cached) {
      return of(cached);
    }

    return observable.pipe(
      tap(data => {
        this.set(key, data, ttl);
      })
    );
  }

  // Cache with tags for grouped invalidation
  setWithTags<T>(key: string, data: T, tags: string[], ttl?: number): void {
    this.set(key, data, ttl);

    // Store tag associations
    tags.forEach(tag => {
      const tagKey = `__tag_${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        this.set(tagKey, taggedKeys);
      }
    });
  }

  // Invalidate all items with specific tag
  invalidateTag(tag: string): void {
    const tagKey = `__tag_${tag}`;
    const taggedKeys = this.get<string[]>(tagKey) || [];

    taggedKeys.forEach(key => {
      this.remove(key);
    });

    this.remove(tagKey);
  }

  // Get cache statistics
  getStats() {
    return {
      ...this._cacheStats(),
      cacheSize: this.cache.size,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  // Export cache data
  export(): Record<string, any> {
    const exportData: Record<string, any> = {};

    this.cache.forEach((item, key) => {
      if (!this.isExpired(item)) {
        exportData[key] = {
          data: item.data,
          timestamp: item.timestamp,
          expiresAt: item.expiresAt
        };
      }
    });

    return exportData;
  }

  // Import cache data
  import(data: Record<string, any>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (value.expiresAt > Date.now()) {
        this.cache.set(key, {
          key,
          data: value.data,
          timestamp: value.timestamp,
          expiresAt: value.expiresAt
        });
      }
    });

    this.updateCacheStats();
  }

  // Private methods
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.expiresAt;
  }

  private cleanup(): void {
    const now = Date.now();
    const itemsToDelete: string[] = [];

    // Find expired items
    this.cache.forEach((item, key) => {
      if (this.isExpired(item)) {
        itemsToDelete.push(key);
      }
    });

    // If still too many items, remove oldest ones
    if (this.cache.size - itemsToDelete.length > environment.cache.maxItems) {
      const sortedItems = Array.from(this.cache.entries())
        .filter(([key]) => !itemsToDelete.includes(key))
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      const excess = this.cache.size - itemsToDelete.length - environment.cache.maxItems;
      for (let i = 0; i < excess; i++) {
        itemsToDelete.push(sortedItems[i][0]);
      }
    }

    // Delete items
    itemsToDelete.forEach(key => {
      this.cache.delete(key);
    });

    this.updateCacheStats();
  }

  private updateStats(type: 'hit' | 'miss'): void {
    const current = this._cacheStats();
    if (type === 'hit') {
      this._cacheStats.set({
        ...current,
        hitCount: current.hitCount + 1
      });
    } else {
      this._cacheStats.set({
        ...current,
        missCount: current.missCount + 1
      });
    }
  }

  private updateCacheStats(): void {
    const current = this._cacheStats();
    this._cacheStats.set({
      ...current,
      totalItems: this.cache.size,
      totalSize: this.calculateMemoryUsage()
    });
  }

  private calculateMemoryUsage(): number {
    let size = 0;
    this.cache.forEach((item) => {
      size += JSON.stringify(item).length * 2; // Rough estimate
    });
    return size;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  // Cleanup on service destruction
  ngOnDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // Memory-based caching for specific use cases
  createMemoryCache<T>(maxSize: number = 100): MemoryCache<T> {
    return new MemoryCache<T>(maxSize);
  }
}

// Separate memory cache class for specific use cases
class MemoryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();

  constructor(private maxSize: number) {}

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, item);
      return item.data;
    }
    return undefined;
  }

  set(key: string, data: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}