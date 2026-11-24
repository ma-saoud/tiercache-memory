import type { Entry, MemoryStoreOptions, Store } from "../types/index.js";
import {
  assertValidMaxSize,
  assertValidTtl,
  isExpired,
} from "../utils/index.js";

const DEFAULT_TTL = 1000 * 60 * 60 * 24;
const MIN_SWEEP_INTERVAL_MS = 1000 * 10; // 10 seconds
const MAX_SWEEP_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
const DEFAULT_SWEEP_INTERVAL_MS = MAX_SWEEP_INTERVAL_MS;

export class MemoryStore implements Store {
  private cache = new Map<string, Entry>();
  private nextExpiry = Infinity;
  private maxSize = 100;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(private options: MemoryStoreOptions = {}) {
    assertValidTtl(this.options.ttl, "options.ttl");
    assertValidMaxSize(this.options.maxSize, "options.maxSize");
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
    if (this.cache.size < this.maxSize) return;

    // Expired entries go first, so a live one is only evicted if needed.
    if (Date.now() >= this.nextExpiry) {
      this.prune();
      if (this.cache.size < this.maxSize) return;
    }

    const oldest = this.cache.keys().next();
    if (!oldest.done) this.cache.delete(oldest.value);
  }

  prune(): { removedItems: number } {
    let removedItems = 0;
    let nextExpiry = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (isExpired(entry)) {
        this.cache.delete(key);
        removedItems++;
      } else if (entry.ttl !== undefined) {
        nextExpiry = Math.min(nextExpiry, entry.ttl);
      }
    }
    this.nextExpiry = nextExpiry;
    return { removedItems };
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
    assertValidTtl(ttlMs, "ttlMs");
    const ttl = ttlMs ?? this.options.ttl ?? DEFAULT_TTL;

    if (!this.cache.has(key)) {
      this.evictIfNeeded();
    }

    this.cache.delete(key);

    const expiresAt = ttl === Infinity ? undefined : Date.now() + ttl;
    this.cache.set(key, { value, ttl: expiresAt });
    if (expiresAt !== undefined) {
      this.nextExpiry = Math.min(this.nextExpiry, expiresAt);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.nextExpiry = Infinity;
  }

  async dispose(): Promise<void> {
    clearInterval(this.sweepTimer!);
    this.cache.clear();
    this.nextExpiry = Infinity;
  }
}
