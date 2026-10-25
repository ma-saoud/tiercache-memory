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
});
