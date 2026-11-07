# @tiercache/memory

In-memory store for [tiercache](https://github.com/ma-saoud/tiercache). Zero dependencies, per-key TTL.

Unlike a `setTimeout`-based cache, there's no timer per key. Expired entries are removed when they're read, and one background sweep per store (hourly by default) removes the ones nobody reads again.

## Where it fits in tiercache

[tiercache](https://github.com/ma-saoud/tiercache) chains several cache stores (e.g. in-memory → Redis → disk) behind one async API:
- **`get(key)`** checks each store in order, fastest first. On the first hit, the value is copied back into every faster store above it, then returned.
- **`set(key, value, ttlMs?)`** writes to all stores in parallel.
- **`delete(key)`** and **`clear()`** apply to all stores.

`MemoryStore` is meant to be the first, fastest tier: values found in slower tiers (Redis, Postgres, …) get written back into it, so repeat reads are served from memory.

## Install

```sh
pnpm add tiercache @tiercache/memory
```

## Usage

As the first tier of a `TierCache`:

```ts
import { TierCache } from "tiercache";
import { MemoryStore } from "@tiercache/memory";

const cache = new TierCache({
  stores: [new MemoryStore({ ttl: 60_000 }), myRedisStore],
});

await cache.set("user:1", { name: "Ada" });
const user = await cache.get<{ name: string }>("user:1");
```

Standalone:

```ts
const store = new MemoryStore();
await store.set("user:1", { name: "Ada" }, 5_000); // expires after 5s
await store.get("user:1");
```

## Options

| Option            | Type     | Default              | Description                                                                                                                                                               |
| ----------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxSize`         | `number` | `100`                | Maximum number of entries. When full, `set` evicts the least-used key.                                                                                                    |
| `ttl`             | `number` | `86_400_000` (1 day) | Default TTL in ms when `set` is called without one.                                                                                                                       |
| `sweepIntervalMs` | `number` | `3_600_000` (1 hour) | How often, in ms, the background sweep removes expired entries. Must be between `10_000` (10s) and `3_600_000` (1 hour), otherwise the constructor throws a `RangeError`. |

`store.size` returns the current entry count (may include expired entries that haven't been removed yet).

The store holds at most `maxSize` entries. When it is full, adding a new key evicts the least-used key: every `set` of a key and every `get` that finds it counts as one use. Overwriting a key that is already stored doesn't evict anything.

## Expiry

An entry expires after the `ttlMs` passed to `set`. If none is passed, it uses the `ttl` option, and if that isn't set either, it expires after 1 day.

Expired entries are removed in three ways:
- **On read:** `get` on an expired key removes it and returns `undefined`.
- **Background sweep:** every `sweepIntervalMs`, the store removes all its expired entries. The timer is `unref()`'d, so it never keeps a Node process running.
- **Manually:** `store.prune()` removes all expired entries right away and returns how many it removed:

```ts
const { removedItems } = store.prune();
```

Until it is removed, an expired entry still counts in `size` and takes up a `maxSize` slot.

## Disposing a store

Each store runs one sweep timer, and that timer holds a reference to the store. A store you stop using is therefore never garbage-collected until you call `dispose()`:

```ts
await store.dispose(); // stops the sweep timer and removes all entries
```

A store that lives as long as your app doesn't need this. Call it for stores you create and throw away, for example one per test or per request.

## Store interface

`MemoryStore` implements tiercache's `Store` interface, which every tier follows:

```ts
interface Store {
  get<T>(key: string): Promise<T | unknown>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

A missing or expired key returns `undefined`; any other value (including `null`) counts as a hit.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm check
```
