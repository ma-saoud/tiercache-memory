import assert from "node:assert/strict";

import { MemoryStore } from "../dist/index.js";

const store = new MemoryStore({ maxSize: 2, ttl: 60_000 });

await store.set("a", 1);
assert.equal(await store.get("a"), 1);
assert.equal(await store.get("missing"), undefined);

await store.set("b", 2);
await store.set("c", 3);
assert.equal(store.size, 2);

await store.set("short", 1, 1);
await new Promise((resolve) => setTimeout(resolve, 5));
assert.equal(await store.get("short"), undefined);

await assert.rejects(store.set("bad", 1, 0), RangeError);

await store.dispose();
assert.equal(store.size, 0);

console.log(`smoke test passed on Node ${process.version}`);
