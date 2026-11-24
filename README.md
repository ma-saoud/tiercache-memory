# @tiercache/memory

[![CI](https://github.com/ma-saoud/tiercache-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/ma-saoud/tiercache-memory/actions/workflows/ci.yml)

A small, fast in-memory LRU cache for Node.js with per-key TTL and a size limit. Zero dependencies.

There's no timer per key. Expired entries are removed when they're read, and one background sweep per store (hourly by default) removes the ones nobody reads again.

## Install

```sh
pnpm add @tiercache/memory
# or
npm install @tiercache/memory
```

## Quick start

```ts
import { MemoryStore } from "@tiercache/memory";

const cache = new MemoryStore();

await cache.set("user:1", { name: "Ada" }, 5_000); // expires after 5s
const user = await cache.get<{ name: string }>("user:1"); // { name: "Ada" }

await cache.delete("user:1");
await cache.clear();
```

## API

| Method                    | Description                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `get(key)`                | Returns the value, or `undefined` if the key is missing or expired. Any other value, including `null`, is a hit. |
| `set(key, value, ttlMs?)` | Stores a value. Without `ttlMs`, the `ttl` option is used.                                                       |
| `delete(key)`             | Removes one key.                                                                                                 |
| `clear()`                 | Removes all keys.                                                                                                |
| `size`                    | Number of entries, which may include expired entries that haven't been removed yet.                              |
| `prune()`                 | Removes all expired entries now and returns `{ removedItems }`.                                                  |
| `dispose()`               | Stops the background sweep and removes all entries.                                                              |

`get`, `set`, `delete`, `clear` and `dispose` return promises.

## Options

```ts
const cache = new MemoryStore({
  maxSize: 1_000, // keep at most 1000 entries
  ttl: 60_000, // entries expire after 1 minute by default
  sweepIntervalMs: 60_000, // remove expired entries every minute
});
```

| Option            | Type     | Default              | Description                                                                                                                                                               |
| ----------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxSize`         | `number` | `100`                | Maximum number of entries: a positive integer, or `Infinity` for no limit. Anything else throws a `RangeError`.                                                           |
| `ttl`             | `number` | `86_400_000` (1 day) | Default TTL in ms when `set` is called without one.                                                                                                                       |
| `sweepIntervalMs` | `number` | `3_600_000` (1 hour) | How often, in ms, the background sweep removes expired entries. Must be between `10_000` (10s) and `3_600_000` (1 hour), otherwise the constructor throws a `RangeError`. |

## Size limit

The store holds at most `maxSize` entries. When it is full, adding a new key first removes expired entries. If that frees no space, it evicts the least recently used (LRU) key: the one that has gone longest without a `set`, or a `get` that finds it. Reading a key doesn't extend its TTL. Overwriting a key that is already stored doesn't evict anything.

## Expiry

An entry expires after the `ttlMs` passed to `set`. If none is passed, it uses the `ttl` option, and if that isn't set either, it expires after 1 day.

A TTL must be a positive number of milliseconds, or `Infinity` for an entry that never expires:

```ts
await cache.set("config", data, Infinity); // never expires
await cache.set("user:1", user, 0); // rejects with a RangeError
```

`0`, negative numbers, `NaN` and non-numbers are rejected with a `RangeError`, both by `set` and by the `ttl` option. A rejected `set` doesn't change the store.

Expired entries are removed in four ways:
- **On read:** `get` on an expired key removes it and returns `undefined`.
- **Background sweep:** every `sweepIntervalMs`, the store removes all its expired entries. The timer is `unref()`'d, so it never keeps a Node process running.
- **When full:** `set` of a new key removes all expired entries before it evicts a live one.
- **Manually:** `cache.prune()` removes all expired entries right away and returns how many it removed:

```ts
const { removedItems } = cache.prune();
```

Until it is removed, an expired entry still counts in `size` and takes up a `maxSize` slot.

## Disposing a store

Each store runs one sweep timer, and that timer holds a reference to the store. A store you stop using is therefore never garbage-collected until you call `dispose()`:

```ts
await cache.dispose(); // stops the sweep timer and removes all entries
```

A store that lives as long as your app doesn't need this. Call it for stores you create and throw away, for example one per test or per request.

## Works great with tiercache

`MemoryStore` also works as the first layer of [tiercache](https://github.com/ma-saoud/tiercache), which chains several caches (for example memory → Redis) behind one API. Reads are served from memory first, and values found in slower layers are copied back into memory so the next read is fast:

```ts
import { TierCache } from "tiercache";
import { MemoryStore } from "@tiercache/memory";

const cache = new TierCache({
  stores: [new MemoryStore({ ttl: 60_000 }), myRedisStore],
});

await cache.set("user:1", { name: "Ada" });
const user = await cache.get<{ name: string }>("user:1");
```

```sh
pnpm add tiercache @tiercache/memory
```

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm check
```

## License

[MIT](LICENSE)
