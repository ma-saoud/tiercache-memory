import { afterEach, describe, expect, it, vi } from "vitest";

import { MemoryStore } from "./index.js";

describe("MemoryStore", () => {
  afterEach(() => vi.useRealTimers());

  it("sets, gets, deletes and clears", async () => {
    const store = new MemoryStore();
    await store.set("a", 1);
    await store.set("b", null);
    expect(await store.get("a")).toBe(1);
    expect(await store.get("b")).toBeNull();
    expect(await store.get("missing")).toBeUndefined();
    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
    await store.clear();
    expect(store.size).toBe(0);
  });

  it("expires entries after ttl", async () => {
    vi.useFakeTimers();
    const store = new MemoryStore({ ttl: 1000 });
    await store.set("default", 1);
    await store.set("custom", 2, 5000);
    vi.advanceTimersByTime(1000);
    expect(await store.get("default")).toBeUndefined();
    expect(await store.get("custom")).toBe(2);
    vi.advanceTimersByTime(4000);
    expect(await store.get("custom")).toBeUndefined();
  });

  describe("maxSize", () => {
    it("defaults to 100 entries", async () => {
      const store = new MemoryStore();
      for (let i = 0; i <= 100; i++) await store.set(`k${i}`, i);
      expect(store.size).toBe(100);
    });

    it("never holds more than maxSize entries", async () => {
      const store = new MemoryStore({ maxSize: 3 });
      for (let i = 0; i < 10; i++) await store.set(`k${i}`, i);
      expect(store.size).toBe(3);
    });

    it("evicts the least-read key when full", async () => {
      const store = new MemoryStore({ maxSize: 2 });
      await store.set("a", 1);
      await store.set("b", 2);
      for (const key of ["a", "a", "b"]) await store.get(key);
      await store.set("c", 3);
      expect(store.size).toBe(2);
      expect(await store.get("a")).toBe(1);
      expect(await store.get("b")).toBeUndefined();
      expect(await store.get("c")).toBe(3);
    });

    it("evicts a never-read key before a read one", async () => {
      const store = new MemoryStore({ maxSize: 2 });
      await store.set("a", 1);
      await store.set("b", 2);
      await store.get("a");
      await store.set("c", 3);
      expect(await store.get("a")).toBe(1);
      expect(await store.get("b")).toBeUndefined();
      expect(await store.get("c")).toBe(3);
    });

    it("does not evict when overwriting an existing key", async () => {
      const store = new MemoryStore({ maxSize: 2 });
      await store.set("a", 1);
      await store.set("b", 2);
      for (const key of ["a", "b", "b"]) await store.get(key);
      await store.set("b", 20);
      expect(store.size).toBe(2);
      expect(await store.get("a")).toBe(1);
      expect(await store.get("b")).toBe(20);
    });

    it("ignores reads of missing keys when evicting", async () => {
      const store = new MemoryStore({ maxSize: 2 });
      await store.set("a", 1);
      await store.set("b", 2);
      for (const key of ["a", "a", "b", "b", "missing"]) await store.get(key);
      await store.set("c", 3);
      expect(store.size).toBe(2);
    });

    it("ignores reads of expired keys when evicting", async () => {
      vi.useFakeTimers();
      const store = new MemoryStore({ maxSize: 2 });
      await store.set("a", 1, 1000);
      await store.set("b", 2);
      for (let i = 0; i < 3; i++) await store.get("b");
      vi.advanceTimersByTime(1000);
      expect(await store.get("a")).toBeUndefined();
      await store.set("c", 3);
      await store.set("d", 4);
      expect(store.size).toBe(2);
    });

    it("frees slots on delete and clear", async () => {
      const store = new MemoryStore({ maxSize: 2 });
      await store.set("a", 1);
      await store.set("b", 2);
      await store.get("a");
      await store.get("b");
      await store.delete("a");
      await store.set("c", 3);
      expect(await store.get("b")).toBe(2);
      expect(await store.get("c")).toBe(3);

      await store.clear();
      await store.set("d", 4);
      await store.set("e", 5);
      expect(await store.get("d")).toBe(4);
      expect(await store.get("e")).toBe(5);
    });
  });
});
