/**
 * The holdout-v3 exposure audit (EVALUATION-PLAN-v3 §9.4) as an optional data file,
 * `fixtures/EXPOSURE-AUDIT-v3.json`: `{ "matchedCaseIds": [...], "method": "...", "auditedAt": "..." }`.
 * Written after the holdout-v3 freeze and before scoring; sensitivity (d) leaves its case ids out. Absent
 * file = no figure. When present it is validated on every run (`checkInvariants`) and when loaded: an
 * object with exactly those keys; unique `ing-h3-NNNN` ids that exist in holdout-v3; a non-empty method;
 * a date (YYYY-MM-DD) or UTC timestamp (YYYY-MM-DDThh:mm[:ss]Z). Reads local files only.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ExposureAudit } from "./types";

export const EXPOSURE_AUDIT_FILE = "EXPOSURE-AUDIT-v3.json";
const HOLDOUT3_FILE = "ingredients/holdout-v3.jsonl";
const KEYS = ["matchedCaseIds", "method", "auditedAt"];

/** Problems of a parsed audit object; `knownIds` (holdout-v3 case ids) is checked when given. */
export function exposureAuditProblems(raw: unknown, knownIds: ReadonlySet<string> | null): string[] {
  const where = EXPOSURE_AUDIT_FILE;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return [`${where}: must be a JSON object`];
  const o = raw as Record<string, unknown>;
  const p: string[] = [];
  for (const k of KEYS) if (!Object.prototype.hasOwnProperty.call(o, k)) p.push(`${where}: missing key '${k}'`);
  for (const k of Object.keys(o)) if (!KEYS.includes(k)) p.push(`${where}: unknown key '${k}'`);
  const ids = o.matchedCaseIds;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string" && /^ing-h3-\d{4}$/.test(x))) p.push(`${where}: matchedCaseIds must be an array of holdout-v3 case ids (ing-h3-NNNN)`);
  else {
    if (new Set(ids).size !== ids.length) p.push(`${where}: matchedCaseIds lists an id twice`);
    if (knownIds) for (const id of ids) if (!knownIds.has(id as string)) p.push(`${where}: ${id} is not a holdout-v3 case`);
  }
  if (typeof o.method !== "string" || o.method.trim() === "") p.push(`${where}: method must be a non-empty string`);
  if (typeof o.auditedAt !== "string" || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z)?$/.test(o.auditedAt)) p.push(`${where}: auditedAt must be a date YYYY-MM-DD or a UTC timestamp YYYY-MM-DDThh:mm[:ss]Z`);
  return p;
}

/** The ids of holdout-v3.jsonl (each line's `id`), or null when the file does not exist. Lines that do not parse are skipped (label validation reports them). */
function holdout3Ids(fixturesDir: string): Set<string> | null {
  const file = path.join(fixturesDir, HOLDOUT3_FILE);
  if (!existsSync(file)) return null;
  const ids = new Set<string>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      const id = (JSON.parse(line) as { id?: unknown }).id;
      if (typeof id === "string") ids.add(id);
    } catch {
      /* reported by the label loader */
    }
  }
  return ids;
}

/** Fixture-invariant problems: none when the file is absent; otherwise it must be valid and holdout-v3 must exist. */
export function verifyExposureAudit(fixturesDir: string): string[] {
  const file = path.join(fixturesDir, EXPOSURE_AUDIT_FILE);
  if (!existsSync(file)) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return [`${EXPOSURE_AUDIT_FILE}: cannot be read (${(err as Error).message})`];
  }
  const ids = holdout3Ids(fixturesDir);
  if (ids === null) return [`${EXPOSURE_AUDIT_FILE}: present but ${HOLDOUT3_FILE} does not exist`];
  return exposureAuditProblems(raw, ids);
}

/** The audit, or null when the file does not exist. Throws with every problem when it is invalid. */
export function loadExposureAudit(fixturesDir: string): ExposureAudit | null {
  if (!existsSync(path.join(fixturesDir, EXPOSURE_AUDIT_FILE))) return null;
  const problems = verifyExposureAudit(fixturesDir);
  if (problems.length > 0) throw new Error(`${EXPOSURE_AUDIT_FILE} is invalid:\n  ${problems.join("\n  ")}`);
  const raw = JSON.parse(readFileSync(path.join(fixturesDir, EXPOSURE_AUDIT_FILE), "utf8")) as ExposureAudit;
  return { matchedCaseIds: [...raw.matchedCaseIds], method: raw.method, auditedAt: raw.auditedAt };
}
