# @tiercache/memory

In-memory store for [tiercache](https://github.com/ma-saoud/tiercache). Zero dependencies, per-key TTL.

Unlike a `setTimeout`-based cache, expiry is checked lazily on read, so no timers are left running.

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

| Option | Type     | Description                                         |
| ------ | -------- | --------------------------------------------------- |
| `ttl`  | `number` | Default TTL in ms when `set` is called without one. |

`store.size` returns the current entry count (may include expired, not-yet-read entries).

The store has no size limit, so it grows until entries expire or are deleted. Set a `ttl` if you cache many distinct keys.

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
