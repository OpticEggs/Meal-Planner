/**
 * Holdout freeze: `fixtures/FREEZE.json` records SHA-256 hashes of every holdout label and page file
 * (CONTRACT-v1 §8). `computeFreeze` derives the record from the files; `verifyFreeze` lists every
 * difference between the record and the files. Holdout-v2 has its own record, `fixtures/FREEZE-v2.json`
 * (`computeFreezeV2` / `verifyFreezeV2`), verified on every run once it exists. Reads local files only.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { canonicalJson } from "./canonical";

export const FREEZE_FILE = "FREEZE.json";
export const HOLDOUT_INGREDIENTS = "ingredients/holdout.jsonl";
export const PAGE_LABELS = "pages/labels.json";

export const FREEZE_RULE =
  "Holdout labels (ingredients/holdout.jsonl, the split=holdout entries of pages/labels.json and the pages/hold-*.html files) " +
  "were written from CONTRACT-v1 §7 and §3 before any engine was run on them. They are never tuned against engine output. " +
  "Any change needs an entry in LABEL-CHANGES.md (case id, old and new label, an independent rationale that does not cite engine output, " +
  "and a reviewer) and a new freeze: recompute these hashes, update frozenAt, and record the previous hashes in that log entry.";

export const FREEZE_CANONICALIZATION =
  "ingredients and page files: SHA-256 of the exact file bytes. Page labels: SHA-256 of the UTF-8 canonical JSON " +
  "(object keys sorted by UTF-16 code unit order, no whitespace, array order kept) of the array of split=holdout entries " +
  "of pages/labels.json in file order.";

export interface FreezeRecord {
  frozenAt: string;
  rule: string;
  canonicalization: string;
  ingredients: { file: string; sha256: string; cases: number };
  pages: {
    labels: { file: string; subset: "split=holdout"; sha256: string; entries: number; candidates: number };
    files: { file: string; sha256: string }[];
  };
}

export const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

function holdoutPageEntries(fixturesDir: string): Record<string, unknown>[] {
  const raw: unknown = JSON.parse(readFileSync(path.join(fixturesDir, PAGE_LABELS), "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${PAGE_LABELS} is not an array`);
  return raw.filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null && (p as Record<string, unknown>).split === "holdout");
}

/** Holdout page files: every file the holdout labels name plus every pages/hold-*.html on disk (sorted). */
function holdoutPageFiles(fixturesDir: string, entries: Record<string, unknown>[]): string[] {
  const named = entries.map((e) => `pages/${String(e.file)}`);
  const onDisk = readdirSync(path.join(fixturesDir, "pages")).filter((f) => f.startsWith("hold-")).map((f) => `pages/${f}`);
  return [...new Set([...named, ...onDisk])].sort();
}

export function computeFreeze(fixturesDir: string, frozenAt: string): FreezeRecord {
  const ingredientBytes = readFileSync(path.join(fixturesDir, HOLDOUT_INGREDIENTS));
  const cases = ingredientBytes.toString("utf8").split("\n").filter((l) => l.trim() !== "").length;
  const entries = holdoutPageEntries(fixturesDir);
  const candidates = entries.reduce((n, e) => n + (Array.isArray(e.candidates) ? e.candidates.length : 0), 0);
  return {
    frozenAt,
    rule: FREEZE_RULE,
    canonicalization: FREEZE_CANONICALIZATION,
    ingredients: { file: HOLDOUT_INGREDIENTS, sha256: sha256Hex(ingredientBytes), cases },
    pages: {
      labels: { file: PAGE_LABELS, subset: "split=holdout", sha256: sha256Hex(canonicalJson(entries)), entries: entries.length, candidates },
      files: holdoutPageFiles(fixturesDir, entries).map((file) => {
        let sha256 = "missing";
        try {
          sha256 = sha256Hex(readFileSync(path.join(fixturesDir, file)));
        } catch {
          /* reported by verifyFreeze */
        }
        return { file, sha256 };
      }),
    },
  };
}

/** Every difference between FREEZE.json and the holdout files; [] when the freeze holds. */
export function verifyFreeze(fixturesDir: string): string[] {
  let recorded: FreezeRecord;
  try {
    recorded = JSON.parse(readFileSync(path.join(fixturesDir, FREEZE_FILE), "utf8")) as FreezeRecord;
  } catch (err) {
    return [`${FREEZE_FILE}: cannot be read (${(err as Error).message})`];
  }
  const problems: string[] = [];
  let actual: FreezeRecord;
  try {
    actual = computeFreeze(fixturesDir, recorded.frozenAt);
  } catch (err) {
    return [`holdout files cannot be read (${(err as Error).message})`];
  }
  if (!recorded.ingredients || recorded.ingredients.sha256 !== actual.ingredients.sha256) problems.push(`${HOLDOUT_INGREDIENTS}: SHA-256 differs from ${FREEZE_FILE}`);
  if (!recorded.ingredients || recorded.ingredients.cases !== actual.ingredients.cases) problems.push(`${HOLDOUT_INGREDIENTS}: ${actual.ingredients.cases} cases, ${FREEZE_FILE} records ${recorded.ingredients?.cases}`);
  const rl = recorded.pages?.labels;
  if (!rl || rl.sha256 !== actual.pages.labels.sha256) problems.push(`${PAGE_LABELS} (holdout entries): canonical SHA-256 differs from ${FREEZE_FILE}`);
  if (!rl || rl.entries !== actual.pages.labels.entries) problems.push(`${PAGE_LABELS}: ${actual.pages.labels.entries} holdout entries, ${FREEZE_FILE} records ${rl?.entries}`);
  if (!rl || rl.candidates !== actual.pages.labels.candidates) problems.push(`${PAGE_LABELS}: ${actual.pages.labels.candidates} holdout candidates, ${FREEZE_FILE} records ${rl?.candidates}`);
  const recordedFiles = new Map((recorded.pages?.files ?? []).map((f) => [f.file, f.sha256]));
  for (const f of actual.pages.files) {
    const want = recordedFiles.get(f.file);
    if (want === undefined) problems.push(`${f.file}: holdout page not recorded in ${FREEZE_FILE}`);
    else if (f.sha256 === "missing") problems.push(`${f.file}: recorded in ${FREEZE_FILE} but missing`);
    else if (want !== f.sha256) problems.push(`${f.file}: SHA-256 differs from ${FREEZE_FILE}`);
    recordedFiles.delete(f.file);
  }
  for (const file of recordedFiles.keys()) problems.push(`${file}: recorded in ${FREEZE_FILE} but missing`);
  return problems;
}

// --- Holdout-v2 freeze (EVALUATION-PLAN-v2 §8.1) ---------------------------------------------------

export const FREEZE_V2_FILE = "FREEZE-v2.json";
export const HOLDOUT2_INGREDIENTS = "ingredients/holdout-v2.jsonl";

export const FREEZE_V2_RULE =
  "Holdout-v2 labels (ingredients/holdout-v2.jsonl, split holdout2) were written blind from CONTRACT-v1 §7 by the evaluation worker " +
  "(no parser was run on these inputs), checked by an independent label checker who saw no engine output, and adjudicated with the " +
  "rationale logged in LABEL-CHANGES.md before this freeze (EVALUATION-PLAN-v2 §8). They are never tuned against engine output and " +
  "never shown to the implementation worker. Any change needs an entry in LABEL-CHANGES.md (case id, old and new label, an independent " +
  "rationale that does not cite engine output, and a reviewer) and a new FREEZE-v2.json with the previous hash recorded in that entry; " +
  "a change made after a candidate has been scored on holdout-v2 makes its holdout-v2 results exposed, not fresh (EVALUATION-PLAN-v2 §8.5).";

export const FREEZE_V2_CANONICALIZATION = "SHA-256 of the exact bytes of ingredients/holdout-v2.jsonl; counts from its non-empty lines.";

export interface FreezeV2Record {
  frozenAt: string;
  rule: string;
  canonicalization: string;
  ingredients: {
    file: string;
    sha256: string;
    cases: number;
    /** Label status → cases. */
    byStatus: Record<string, number>;
    /** source.kind → cases. */
    bySourceKind: Record<string, number>;
  };
}

function countBy(lines: string[], pick: (c: Record<string, unknown>) => unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    let key = "unreadable";
    try {
      const c = JSON.parse(line) as Record<string, unknown>;
      const v = pick(c);
      key = typeof v === "string" ? v : "missing";
    } catch {
      /* counted as unreadable; label validation reports the line */
    }
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The holdout-v2 freeze record derived from the file (throws when the file cannot be read). */
export function computeFreezeV2(fixturesDir: string, frozenAt: string): FreezeV2Record {
  const bytes = readFileSync(path.join(fixturesDir, HOLDOUT2_INGREDIENTS));
  const lines = bytes.toString("utf8").split("\n").filter((l) => l.trim() !== "");
  return {
    frozenAt,
    rule: FREEZE_V2_RULE,
    canonicalization: FREEZE_V2_CANONICALIZATION,
    ingredients: {
      file: HOLDOUT2_INGREDIENTS,
      sha256: sha256Hex(bytes),
      cases: lines.length,
      byStatus: countBy(lines, (c) => (c.expect as Record<string, unknown> | undefined)?.status),
      bySourceKind: countBy(lines, (c) => (c.source as Record<string, unknown> | undefined)?.kind),
    },
  };
}

/** Whether FREEZE-v2.json exists (holdout-v2 is frozen) and what it records. */
export function freezeV2Status(fixturesDir: string): { frozen: boolean; frozenAt: string | null; sha256: string | null } {
  if (!existsSync(path.join(fixturesDir, FREEZE_V2_FILE))) return { frozen: false, frozenAt: null, sha256: null };
  try {
    const r = JSON.parse(readFileSync(path.join(fixturesDir, FREEZE_V2_FILE), "utf8")) as FreezeV2Record;
    return { frozen: true, frozenAt: typeof r.frozenAt === "string" ? r.frozenAt : null, sha256: typeof r.ingredients?.sha256 === "string" ? r.ingredients.sha256 : null };
  } catch {
    return { frozen: true, frozenAt: null, sha256: null };
  }
}

/**
 * Every difference between FREEZE-v2.json and holdout-v2.jsonl; [] when the freeze holds or when
 * holdout-v2 is not frozen yet (no FREEZE-v2.json). Once the record exists it is verified on every run.
 */
export function verifyFreezeV2(fixturesDir: string): string[] {
  if (!existsSync(path.join(fixturesDir, FREEZE_V2_FILE))) return [];
  let recorded: FreezeV2Record;
  try {
    recorded = JSON.parse(readFileSync(path.join(fixturesDir, FREEZE_V2_FILE), "utf8")) as FreezeV2Record;
  } catch (err) {
    return [`${FREEZE_V2_FILE}: cannot be read (${(err as Error).message})`];
  }
  if (!existsSync(path.join(fixturesDir, HOLDOUT2_INGREDIENTS))) return [`${HOLDOUT2_INGREDIENTS}: recorded in ${FREEZE_V2_FILE} but missing`];
  let actual: FreezeV2Record;
  try {
    actual = computeFreezeV2(fixturesDir, recorded.frozenAt);
  } catch (err) {
    return [`${HOLDOUT2_INGREDIENTS} cannot be read (${(err as Error).message})`];
  }
  const problems: string[] = [];
  const r = recorded.ingredients;
  if (!r || r.file !== HOLDOUT2_INGREDIENTS) problems.push(`${FREEZE_V2_FILE}: must record ${HOLDOUT2_INGREDIENTS}`);
  if (!r || r.sha256 !== actual.ingredients.sha256) problems.push(`${HOLDOUT2_INGREDIENTS}: SHA-256 differs from ${FREEZE_V2_FILE}`);
  if (!r || r.cases !== actual.ingredients.cases) problems.push(`${HOLDOUT2_INGREDIENTS}: ${actual.ingredients.cases} cases, ${FREEZE_V2_FILE} records ${r?.cases}`);
  if (!r || canonicalJson(r.byStatus ?? null) !== canonicalJson(actual.ingredients.byStatus)) problems.push(`${HOLDOUT2_INGREDIENTS}: status counts differ from ${FREEZE_V2_FILE}`);
  if (!r || canonicalJson(r.bySourceKind ?? null) !== canonicalJson(actual.ingredients.bySourceKind)) problems.push(`${HOLDOUT2_INGREDIENTS}: source-kind counts differ from ${FREEZE_V2_FILE}`);
  if (recorded.rule !== FREEZE_V2_RULE) problems.push(`${FREEZE_V2_FILE}: rule text differs from bench/freeze.ts FREEZE_V2_RULE`);
  if (typeof recorded.frozenAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(recorded.frozenAt)) problems.push(`${FREEZE_V2_FILE}: frozenAt must be a date YYYY-MM-DD`);
  return problems;
}
