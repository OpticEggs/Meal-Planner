/**
 * Holdout freeze: `fixtures/FREEZE.json` records SHA-256 hashes of every holdout label and page file
 * (CONTRACT-v1 §8). `computeFreeze` derives the record from the files; `verifyFreeze` lists every
 * difference between the record and the files. Reads local files only.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
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
