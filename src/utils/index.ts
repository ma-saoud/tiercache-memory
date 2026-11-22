import type { Entry } from "../types/index.js";

const isExpired = (entry: Entry) => {
  return entry.ttl !== undefined && entry.ttl <= Date.now();
};

const assertValidTtl = (ttl: unknown, name = "ttl"): void => {
  if (ttl === undefined) return;
  if (typeof ttl !== "number" || Number.isNaN(ttl) || ttl <= 0) {
    throw new RangeError(
      `${name} must be a positive number of ms or Infinity, got ${String(ttl)}`,
    );
  }
};

export { assertValidTtl, isExpired };
