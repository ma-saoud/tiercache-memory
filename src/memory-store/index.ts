import type { Entry, MemoryStoreOptions, Store } from "../types/index.js";
import { isExpired } from "../utils/index.js";

export class MemoryStore implements Store {
  private cache = new Map<string, Entry>();
  private maxSize = 100;
  private ltuMap = new Map<string, number>();

  constructor(private options: MemoryStoreOptions = {}) {
    this.maxSize = this.options.maxSize ?? this.maxSize;
  }

  get size(): number {
    return this.cache.size;
  }

  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      const ltuKey = [...this.ltuMap.entries()].sort(
        (a, b) => a[1] - b[1],
      )[0]?.[0];
      if (ltuKey) {
        this.cache.delete(ltuKey);
        this.ltuMap.delete(ltuKey);
      }
    }
  }

  private updateLTU(key: string): void {
    const usedCount = this.ltuMap.get(key) ?? 0;
    this.ltuMap.set(key, usedCount + 1);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    this.updateLTU(key);

    if (!entry) return undefined;

    if (isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.options.ttl;

    this.evictIfNeeded();

    this.cache.delete(key);
    this.cache.set(key, {
      value,
      ttl: ttl ? Date.now() + ttl : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.ltuMap.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.ltuMap.clear();
  }
}
