import type { Entry, MemoryStoreOptions, Store } from "../types/index.js";
import { isExpired } from "../utils/index.js";

export class MemoryStore implements Store {
  private cache = new Map<string, Entry>();

  constructor(private options: MemoryStoreOptions = {}) {}

  get size(): number {
    return this.cache.size;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
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
    this.cache.delete(key);
    this.cache.set(key, {
      value,
      ttl: ttl ? Date.now() + ttl : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
