type MemoryStoreOptions = {
  ttl?: number;
};

type Entry = { value: unknown; ttl?: number };

interface Store {
  get<T>(key: string): Promise<T | unknown>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export type { Entry, MemoryStoreOptions, Store };
