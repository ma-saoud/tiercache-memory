# Changelog

All notable changes to this package are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- A full store now evicts the least recently used key (LRU) instead of the least frequently used one. New keys are no longer evicted right away in favor of old popular ones.
- Adding a key to a full store no longer sorts all entries, and scans for expired ones only when one may have expired.

## [0.4.2] - 2026-11-23

### Breaking

- The constructor now throws a `RangeError` when `maxSize` is not a positive integer or `Infinity`. Before, `0`, negative numbers, decimals, `NaN` and non-numbers were silently accepted.

### Fixed

- A store containing the empty-string key `""` no longer grows past `maxSize`.
- When the store is full, expired entries are removed before a live entry is evicted.

## [0.4.1] - 2026-11-22

### Added

- `LICENSE` file (MIT), this changelog and a CI workflow.

### Changed

- README rewritten for standalone use, with tiercache usage moved to its own section.

## [0.4.0] - 2026-11-22

### Breaking

- `set` now rejects with a `RangeError` when `ttlMs` is `0`, negative, `NaN` or not a number, and the constructor throws for the same values in the `ttl` option. Before, `0` and `NaN` silently meant "never expire". Use `Infinity` instead.

### Added

- `Infinity` is accepted as a TTL and means the entry never expires.

## [0.3.1] - 2026-11-08

### Fixed

- `get` no longer deletes and re-inserts the entry it reads.

## [0.3.0] - 2026-11-07

### Breaking

- Entries set without a TTL, in a store created without a `ttl` option, now expire after 1 day. Before, they never expired.
- The internal `Entry` type is no longer exported.

### Added

- Background sweep that removes expired entries every `sweepIntervalMs` (default 1 hour, allowed range 10 s to 1 hour). The timer is `unref()`'d.
- `prune()` removes expired entries right away and returns `{ removedItems }`.
- `dispose()` stops the sweep timer and removes all entries.

## [0.2.0] - 2026-11-05

### Added

- `maxSize` option (default `100`). When the store is full, `set` of a new key evicts the least-used key.

## [0.1.0] - 2026-10-25

### Added

- `MemoryStore` with `get`, `set`, `delete`, `clear` and `size`, and per-key TTL that is checked on read.

[Unreleased]: https://github.com/ma-saoud/tiercache-memory/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/ma-saoud/tiercache-memory/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/ma-saoud/tiercache-memory/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/ma-saoud/tiercache-memory/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/ma-saoud/tiercache-memory/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/ma-saoud/tiercache-memory/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ma-saoud/tiercache-memory/compare/25b2faa...v0.2.0
[0.1.0]: https://github.com/ma-saoud/tiercache-memory/tree/25b2faa
