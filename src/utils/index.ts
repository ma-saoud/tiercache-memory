import type { Entry } from "../types/index.js";

const isExpired = (entry: Entry) => {
  return entry.ttl !== undefined && entry.ttl <= Date.now();
};

export { isExpired };
