import type { Entry, MemoryStoreOptions, Store } from "../types/index.js";
import { isExpired } from "../utils/index.js";

const DEFAULT_TTL = 1000 * 60 * 60 * 24;
const MIN_SWEEP_INTERVAL_MS = 1000 * 10; // 10 seconds
const MAX_SWEEP_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
const DEFAULT_SWEEP_INTERVAL_MS = MAX_SWEEP_INTERVAL_MS;

export class MemoryStore implements Store {
  private cache = new Map<string, Entry>();
  private maxSize = 100;
  private ltuMap = new Map<string, number>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(private options: MemoryStoreOptions = {}) {
    this.maxSize = this.options.maxSize ?? this.maxSize;

    const sweepIntervalMs =
      this.options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
    if (
      !Number.isFinite(sweepIntervalMs) ||
      sweepIntervalMs < MIN_SWEEP_INTERVAL_MS ||
      sweepIntervalMs > MAX_SWEEP_INTERVAL_MS
    ) {
      throw new RangeError(
        `sweepIntervalMs must be between ${MIN_SWEEP_INTERVAL_MS} and ${MAX_SWEEP_INTERVAL_MS} ms, got ${sweepIntervalMs}`,
      );
    }

    this.sweepTimer = setInterval(() => this.prune(), sweepIntervalMs);
    this.sweepTimer.unref?.();
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

  prune(): { removedItems: number } {
    let removedItems = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (isExpired(entry)) {
        this.cache.delete(key);
        this.ltuMap.delete(key);
        removedItems++;
      }
    }
    return { removedItems };
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    if (isExpired(entry)) {
      this.cache.delete(key);
      this.ltuMap.delete(key);
      return undefined;
    }

    this.updateLTU(key);

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.options.ttl ?? DEFAULT_TTL;

    if (!this.cache.has(key)) {
      this.evictIfNeeded();
    }

    this.updateLTU(key);

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

  async dispose(): Promise<void> {
    clearInterval(this.sweepTimer!);
    this.cache.clear();
    this.ltuMap.clear();
  }
}
