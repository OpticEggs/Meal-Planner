import { createHash } from "node:crypto";

/** Canonical JSON: object keys sorted recursively, so equal content hashes equally. */
export function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, sortKeys(o[k])]));
  }
  return v;
}
export function hashOf(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
