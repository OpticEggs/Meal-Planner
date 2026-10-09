/**
 * Strict loading and validation of the benchmark label files (CONTRACT-v1 §8):
 * `fixtures/ingredients/{dev,holdout,holdout-v2}.jsonl` and `fixtures/pages/labels.json`.
 * holdout-v2 cases (split `holdout2`, EVALUATION-PLAN-v2 §9) also carry `source` and `construction`.
 *
 * Validation is all-or-nothing: every problem is collected and reported with its case id, and any
 * problem is fatal (`LabelValidationError`). The validate/parse functions are pure; only the `load*`
 * functions read files.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DIAGNOSTICS, UNIT_REGISTRY } from "../src/contract";
import {
  ACCEPT_FIELDS,
  AMOUNT_UNSTATED,
  CATEGORIES,
  EXPECT_FIELDS,
  PAGE_ACCEPT_FIELDS,
  PAGE_CANDIDATE_FIELDS,
  PROVENANCE_KINDS,
  PAGE_SPLITS,
  SEASONING_CLASSES,
  SEVERITIES,
  SPLITS,
  STATUSES,
  V1_SPLITS,
  isUnitCode,
  parseLabelExact,
  parseLabelQuantity,
  type IngredientCase,
  type PageLabel,
  type PageSplit,
  type Split,
} from "./types";

export class LabelValidationError extends Error {
  readonly errors: string[];
  constructor(file: string, errors: string[]) {
    super(`${file}: ${errors.length} label problem(s):\n  ${errors.join("\n  ")}`);
    this.name = "LabelValidationError";
    this.errors = errors;
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNullableString = (v: unknown) => v === null || isNonEmptyString(v);
const has = (o: Obj, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function checkKeys(o: Obj, required: readonly string[], optional: readonly string[], where: string, errors: string[]) {
  for (const k of required) if (!has(o, k)) errors.push(`${where}: missing field '${k}'`);
  for (const k of Object.keys(o)) if (!required.includes(k) && !optional.includes(k)) errors.push(`${where}: unknown field '${k}'`);
}

const CASE_FIELDS = ["id", "split", "categories", "input", "expect", "severity", "seasoningClass", "provenance", "rationale"] as const;
/** Optional everywhere, except that holdout2 requires `source` and `construction`. */
const OPTIONAL_CASE_FIELDS = ["accept", "source", "construction"] as const;
const SPLITS_REQUIRING_SOURCE: readonly Split[] = ["holdout2"];
const SPLIT_PREFIX: Record<Split, string> = { dev: "ing-dev-", holdout: "ing-hold-", holdout2: "ing-h2-" };
export const MAX_CONSTRUCTION_CHARS = 120;

function checkSource(v: unknown, provenanceKind: unknown, where: string, errors: string[]) {
  if (!isObj(v)) {
    errors.push(`${where}.source: must be an object`);
    return;
  }
  if (!(PROVENANCE_KINDS as readonly unknown[]).includes(v.kind)) {
    errors.push(`${where}.source.kind: must be one of ${PROVENANCE_KINDS.join(", ")}`);
    return;
  }
  if (v.kind !== provenanceKind) errors.push(`${where}.source.kind: '${String(v.kind)}' differs from provenance.kind '${String(provenanceKind)}'`);
  if (v.kind === "repo_test_input") {
    checkKeys(v, ["kind", "file", "line", "commit"], [], `${where}.source`, errors);
    if (!isNonEmptyString(v.file) || v.file.startsWith("/") || v.file.includes("..") || v.file.includes("\\")) errors.push(`${where}.source.file: must be a repository-relative path`);
    if (!Number.isInteger(v.line) || (v.line as number) < 1) errors.push(`${where}.source.line: must be a positive integer`);
    if (typeof v.commit !== "string" || !/^[0-9a-f]{7,40}$/.test(v.commit)) errors.push(`${where}.source.commit: must be a commit hash (7–40 hex digits)`);
  } else {
    checkKeys(v, ["kind", "author"], [], `${where}.source`, errors);
    if (!isNonEmptyString(v.author)) errors.push(`${where}.source.author: must be a non-empty string`);
  }
}

function checkAmount(v: unknown, where: string, errors: string[], massOrVolumeOnly: boolean) {
  if (!isObj(v)) {
    errors.push(`${where}: must be { quantity, unit }`);
    return;
  }
  checkKeys(v, ["quantity", "unit"], [], where, errors);
  if (typeof v.quantity !== "string" || !parseLabelExact(v.quantity)) errors.push(`${where}.quantity: must be an exact positive amount ("n", "n/d", "w n/d") within bounds`);
  if (!isUnitCode(v.unit)) errors.push(`${where}.unit: '${String(v.unit)}' is not a UNIT_REGISTRY code`);
  else if (massOrVolumeOnly) {
    const dim = UNIT_REGISTRY[v.unit].dimension;
    if (dim !== "mass" && dim !== "volume") errors.push(`${where}.unit: a package size must be mass or volume, not ${dim}`);
  }
}

function checkProvenance(v: unknown, where: string, errors: string[]) {
  if (!isObj(v)) {
    errors.push(`${where}: provenance must be { kind, source }`);
    return;
  }
  checkKeys(v, ["kind", "source"], [], `${where}.provenance`, errors);
  if (!(PROVENANCE_KINDS as readonly unknown[]).includes(v.kind)) errors.push(`${where}.provenance.kind: must be one of ${PROVENANCE_KINDS.join(", ")}`);
  if (!isNonEmptyString(v.source)) errors.push(`${where}.provenance.source: must be a non-empty string`);
}

function checkExpect(e: unknown, where: string, errors: string[]) {
  if (!isObj(e)) {
    errors.push(`${where}: expect must be an object`);
    return;
  }
  checkKeys(e, EXPECT_FIELDS, [], where, errors);
  if (!(STATUSES as readonly unknown[]).includes(e.status)) errors.push(`${where}.status: must be one of ${STATUSES.join(", ")}`);
  if (!isNullableString(e.name)) errors.push(`${where}.name: must be a non-empty string or null`);
  let range = false;
  if (e.quantity !== null) {
    const q = typeof e.quantity === "string" ? parseLabelQuantity(e.quantity) : null;
    if (!q) errors.push(`${where}.quantity: '${String(e.quantity)}' is not "n", "n/d", "w n/d" or a range "a..b" with 0 < a < b (exact, within bounds)`);
    else range = q.kind === "range";
  }
  if (e.unit !== null && !isUnitCode(e.unit)) errors.push(`${where}.unit: '${String(e.unit)}' is not a UNIT_REGISTRY code`);
  if (e.packageSize !== null) checkAmount(e.packageSize, `${where}.packageSize`, errors, true);
  if (!Array.isArray(e.equivalents)) errors.push(`${where}.equivalents: must be an array`);
  else e.equivalents.forEach((x, i) => checkAmount(x, `${where}.equivalents[${i}]`, errors, false));
  if (!(e.form === null || e.form === "raw" || e.form === "cooked")) errors.push(`${where}.form: must be "raw", "cooked" or null`);
  if (!isNullableString(e.note)) errors.push(`${where}.note: must be a non-empty string or null`);
  if (!Array.isArray(e.alternatives) || !e.alternatives.every(isNonEmptyString)) errors.push(`${where}.alternatives: must be an array of non-empty strings`);
  else {
    if (e.alternatives.length === 1) errors.push(`${where}.alternatives: must have at least 2 entries or none (§2.1)`);
    if (new Set(e.alternatives.map((a) => a.trim().toLowerCase())).size !== e.alternatives.length) errors.push(`${where}.alternatives: duplicate option`);
  }
  if (typeof e.optional !== "boolean") errors.push(`${where}.optional: must be a boolean`);
  if (typeof e.approximate !== "boolean") errors.push(`${where}.approximate: must be a boolean`);
  if (!(e.amountUnstated === null || (AMOUNT_UNSTATED as readonly unknown[]).includes(e.amountUnstated))) errors.push(`${where}.amountUnstated: must be one of ${AMOUNT_UNSTATED.join(", ")} or null`);

  // CONTRACT §2.1 status rules and the §7 label rules that follow from them.
  const alts = Array.isArray(e.alternatives) ? e.alternatives : [];
  if (e.status === "ready") {
    if (e.name === null) errors.push(`${where}: a ready label needs a name (§2.1)`);
    if (range) errors.push(`${where}: a ready label cannot have a range quantity (§2.1)`);
    if (e.quantity !== null && e.unit === null) errors.push(`${where}: a ready label with a quantity needs a unit (§2.1)`);
    if (e.quantity === null && e.amountUnstated === null) errors.push(`${where}: a ready label without a quantity needs amountUnstated (§2.1)`);
    if (alts.length > 0) errors.push(`${where}: a ready label cannot offer alternatives (§2.1)`);
  }
  if (e.status === "unsupported") {
    for (const f of ["name", "quantity", "unit", "packageSize"] as const) if (e[f] !== null) errors.push(`${where}: an unsupported label must have ${f} null (§2.1)`);
  }
  if (alts.length > 0 && e.name !== null) errors.push(`${where}: a choice of ingredients has name null (§7.8)`);
  if (e.amountUnstated !== null && e.quantity !== null) errors.push(`${where}: amountUnstated must be null when the line states an amount (§7.10)`);
}

function checkAccept(a: unknown, where: string, errors: string[]) {
  if (!isObj(a)) {
    errors.push(`${where}: accept must be an object`);
    return;
  }
  checkKeys(a, [], ACCEPT_FIELDS, where, errors);
  if (has(a, "name") && !(Array.isArray(a.name) && a.name.length > 0 && a.name.every(isNonEmptyString))) errors.push(`${where}.name: must be a non-empty array of non-empty strings`);
  if (has(a, "note") && !(Array.isArray(a.note) && a.note.length > 0 && a.note.every(isNullableString))) errors.push(`${where}.note: must be a non-empty array of strings or null`);
  if (has(a, "alternatives") && !(Array.isArray(a.alternatives) && a.alternatives.length > 0 && a.alternatives.every((x) => Array.isArray(x) && x.length >= 2 && x.every(isNonEmptyString))))
    errors.push(`${where}.alternatives: must be a non-empty array of option lists (each ≥ 2 non-empty strings)`);
}

/** Validate one parsed ingredient case object. Problems are appended to `errors`, prefixed with the case id. */
export function validateIngredientCase(raw: unknown, split: Split, position: string, errors: string[]): IngredientCase | null {
  const before = errors.length;
  if (!isObj(raw)) {
    errors.push(`${position}: not a JSON object`);
    return null;
  }
  const id = typeof raw.id === "string" ? raw.id : `${position} (no id)`;
  checkKeys(raw, CASE_FIELDS, OPTIONAL_CASE_FIELDS, id, errors);
  if (SPLITS_REQUIRING_SOURCE.includes(split)) {
    for (const k of ["source", "construction"] as const) if (!has(raw, k)) errors.push(`${id}: missing field '${k}' (required for ${split})`);
  }
  if (typeof raw.id !== "string" || !new RegExp(`^${SPLIT_PREFIX[split]}\\d{4}$`).test(raw.id)) errors.push(`${id}: id must match ${SPLIT_PREFIX[split]}NNNN for the ${split} file`);
  if (raw.split !== split) errors.push(`${id}: split '${String(raw.split)}' does not match the file (${split})`);
  if (!Array.isArray(raw.categories) || raw.categories.length === 0) errors.push(`${id}: categories must be a non-empty array`);
  else {
    for (const c of raw.categories) if (!(CATEGORIES as readonly unknown[]).includes(c)) errors.push(`${id}: unknown category '${String(c)}'`);
    if (new Set(raw.categories).size !== raw.categories.length) errors.push(`${id}: duplicate category`);
  }
  if (typeof raw.input !== "string") errors.push(`${id}: input must be a string`);
  checkExpect(raw.expect, `${id}: expect`, errors);
  if (has(raw, "accept")) checkAccept(raw.accept, `${id}: accept`, errors);
  if (!(SEVERITIES as readonly unknown[]).includes(raw.severity)) errors.push(`${id}: severity must be one of ${SEVERITIES.join(", ")}`);
  if (!(raw.seasoningClass === null || (SEASONING_CLASSES as readonly unknown[]).includes(raw.seasoningClass))) errors.push(`${id}: seasoningClass must be one of ${SEASONING_CLASSES.join(", ")} or null`);
  checkProvenance(raw.provenance, id, errors);
  if (has(raw, "source")) checkSource(raw.source, isObj(raw.provenance) ? raw.provenance.kind : undefined, id, errors);
  if (has(raw, "construction") && !(isNonEmptyString(raw.construction) && raw.construction.length <= MAX_CONSTRUCTION_CHARS))
    errors.push(`${id}: construction must be a non-empty string of at most ${MAX_CONSTRUCTION_CHARS} characters`);
  if (!isNonEmptyString(raw.rationale)) errors.push(`${id}: rationale must be a non-empty string`);
  if (errors.length !== before) return null;
  return { ...(raw as unknown as IngredientCase), accept: (raw.accept as IngredientCase["accept"]) ?? {} };
}

/** Parse and validate a JSON Lines label file's text. Throws `LabelValidationError` listing every problem. */
export function parseIngredientJsonl(text: string, split: Split, fileLabel: string): IngredientCase[] {
  const errors: string[] = [];
  const cases: IngredientCase[] = [];
  if (text.length > 0 && !text.endsWith("\n")) errors.push(`${fileLabel}: must end with a newline`);
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  lines.forEach((line, i) => {
    const position = `${fileLabel}:${i + 1}`;
    if (line.trim() === "") {
      errors.push(`${position}: blank line`);
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch (err) {
      errors.push(`${position}: invalid JSON (${(err as Error).message})`);
      return;
    }
    const c = validateIngredientCase(raw, split, position, errors);
    if (c) cases.push(c);
  });
  checkUnique(cases, errors);
  if (errors.length > 0) throw new LabelValidationError(fileLabel, errors);
  return cases;
}

function checkUnique(cases: IngredientCase[], errors: string[]) {
  const ids = new Map<string, string>();
  const inputs = new Map<string, string>();
  for (const c of cases) {
    if (ids.has(c.id)) errors.push(`${c.id}: duplicate id`);
    ids.set(c.id, c.id);
    const prior = inputs.get(c.input);
    if (prior !== undefined) errors.push(`${c.id}: input is identical to ${prior}`);
    else inputs.set(c.input, c.id);
  }
}

/** Cross-file checks for a combined corpus (ids and inputs unique across splits). */
export function checkCorpus(cases: IngredientCase[]): void {
  const errors: string[] = [];
  checkUnique(cases, errors);
  if (errors.length > 0) throw new LabelValidationError("ingredient corpus", errors);
}

export const INGREDIENT_FILES: Record<Split, string> = { dev: "ingredients/dev.jsonl", holdout: "ingredients/holdout.jsonl", holdout2: "ingredients/holdout-v2.jsonl" };
export const PAGE_LABELS_FILE = "pages/labels.json";

/**
 * Read and validate the ingredient cases of the given splits (file order; dev, holdout, holdout2).
 * The default is the Phase 1 splits (dev + holdout), so existing callers are unchanged; pass `SPLITS`
 * (or `["holdout2"]`) for holdout-v2.
 */
export function loadIngredientCases(fixturesDir: string, splits: readonly Split[] = V1_SPLITS): IngredientCase[] {
  const all: IngredientCase[] = [];
  for (const split of SPLITS) {
    if (!splits.includes(split)) continue;
    const rel = INGREDIENT_FILES[split];
    const text = readFileSync(path.join(fixturesDir, rel), "utf8");
    all.push(...parseIngredientJsonl(text, split, rel));
  }
  checkCorpus(all);
  return all;
}

// --- Pages ---------------------------------------------------------------------------------------

const PAGE_FIELDS = ["id", "split", "file", "requestedUrl", "finalUrl", "isRecipe", "expectedCandidateCount", "candidates", "expectedDiagnostics", "provenance", "rationale"] as const;
const PAGE_PREFIX: Record<PageSplit, { id: string; file: string }> = { dev: { id: "page-dev-", file: "dev-" }, holdout: { id: "page-hold-", file: "hold-" } };

function isHttpUrl(v: unknown): boolean {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return (u.protocol === "http:" || u.protocol === "https:") && u.href === v;
  } catch {
    return false;
  }
}
const isNullableInt = (v: unknown, min: number, max: number) => v === null || (Number.isInteger(v) && (v as number) >= min && (v as number) <= max);

function checkCandidate(c: unknown, where: string, errors: string[]) {
  if (!isObj(c)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(c, PAGE_CANDIDATE_FIELDS, ["accept"], where, errors);
  if (c.structure !== "json_ld" && c.structure !== "microdata") errors.push(`${where}.structure: must be json_ld or microdata`);
  for (const f of ["title", "yieldText", "author", "siteName", "category", "cuisine"] as const) if (!isNullableString(c[f])) errors.push(`${where}.${f}: must be a non-empty string or null`);
  if (!isNullableInt(c.servings, 1, 100)) errors.push(`${where}.servings: must be an integer 1–100 or null`);
  for (const f of ["prepMinutes", "cookMinutes", "totalMinutes"] as const) if (!isNullableInt(c[f], 0, 100_000)) errors.push(`${where}.${f}: must be a whole number of minutes or null`);
  if (!Array.isArray(c.ingredientLines) || !c.ingredientLines.every((x) => typeof x === "string")) errors.push(`${where}.ingredientLines: must be an array of strings`);
  if (!Number.isInteger(c.instructionCount) || (c.instructionCount as number) < 0) errors.push(`${where}.instructionCount: must be a non-negative integer`);
  if (!Array.isArray(c.imageUrls) || !c.imageUrls.every(isHttpUrl)) errors.push(`${where}.imageUrls: must be an array of absolute http(s) URLs`);
  else if (c.imageUrls.length > 5) errors.push(`${where}.imageUrls: at most 5 (contract limit)`);
  if (!(c.declaredUrl === null || isHttpUrl(c.declaredUrl))) errors.push(`${where}.declaredUrl: must be an absolute http(s) URL or null`);
  if (has(c, "accept")) {
    const a = c.accept;
    if (!isObj(a)) errors.push(`${where}.accept: must be an object`);
    else {
      checkKeys(a, [], PAGE_ACCEPT_FIELDS, `${where}.accept`, errors);
      for (const [k, v] of Object.entries(a)) if (!(Array.isArray(v) && v.length > 0 && v.every(isNullableString))) errors.push(`${where}.accept.${k}: must be a non-empty array of strings or null`);
    }
  }
}

/** Validate the parsed `pages/labels.json` array. Throws `LabelValidationError` listing every problem. */
export function validatePageLabels(raw: unknown, fileLabel = PAGE_LABELS_FILE): PageLabel[] {
  const errors: string[] = [];
  if (!Array.isArray(raw)) throw new LabelValidationError(fileLabel, ["must be a JSON array of page labels"]);
  const out: PageLabel[] = [];
  const ids = new Set<string>();
  const files = new Set<string>();
  raw.forEach((p, i) => {
    const before = errors.length;
    if (!isObj(p)) {
      errors.push(`${fileLabel}[${i}]: not an object`);
      return;
    }
    const id = typeof p.id === "string" ? p.id : `${fileLabel}[${i}] (no id)`;
    checkKeys(p, PAGE_FIELDS, [], id, errors);
    const split = p.split as PageSplit;
    if (!(PAGE_SPLITS as readonly unknown[]).includes(p.split)) errors.push(`${id}: split must be dev or holdout`);
    else {
      if (typeof p.id !== "string" || !new RegExp(`^${PAGE_PREFIX[split].id}[a-z0-9-]+$`).test(p.id)) errors.push(`${id}: id must match ${PAGE_PREFIX[split].id}<slug>`);
      if (typeof p.file !== "string" || !new RegExp(`^${PAGE_PREFIX[split].file}[a-z0-9-]+\\.html$`).test(p.file)) errors.push(`${id}: file must be ${PAGE_PREFIX[split].file}<slug>.html (no directories)`);
    }
    if (ids.has(id)) errors.push(`${id}: duplicate id`);
    ids.add(id);
    if (typeof p.file === "string") {
      if (files.has(p.file)) errors.push(`${id}: file ${p.file} is labelled twice`);
      files.add(p.file);
    }
    if (!isHttpUrl(p.requestedUrl)) errors.push(`${id}: requestedUrl must be an absolute http(s) URL`);
    if (!isHttpUrl(p.finalUrl)) errors.push(`${id}: finalUrl must be an absolute http(s) URL`);
    if (typeof p.isRecipe !== "boolean") errors.push(`${id}: isRecipe must be a boolean`);
    if (!Array.isArray(p.candidates)) errors.push(`${id}: candidates must be an array`);
    else {
      p.candidates.forEach((c, j) => checkCandidate(c, `${id}: candidates[${j}]`, errors));
      if (p.expectedCandidateCount !== p.candidates.length) errors.push(`${id}: expectedCandidateCount must equal the number of labelled candidates`);
      if (typeof p.isRecipe === "boolean" && p.isRecipe !== p.candidates.length > 0) errors.push(`${id}: isRecipe must be true exactly when there are candidates`);
    }
    if (!Array.isArray(p.expectedDiagnostics) || !p.expectedDiagnostics.every((d) => typeof d === "string" && has(DIAGNOSTICS, d))) errors.push(`${id}: expectedDiagnostics must be DIAGNOSTICS codes`);
    else if (new Set(p.expectedDiagnostics).size !== p.expectedDiagnostics.length) errors.push(`${id}: duplicate expected diagnostic`);
    checkProvenance(p.provenance, id, errors);
    if (!isNonEmptyString(p.rationale)) errors.push(`${id}: rationale must be a non-empty string`);
    if (errors.length === before) out.push(p as unknown as PageLabel);
  });
  if (errors.length > 0) throw new LabelValidationError(fileLabel, errors);
  return out;
}

/** Read and validate the page labels; every labelled file must exist under fixtures/pages/. */
export function loadPageLabels(fixturesDir: string, splits: readonly Split[] = PAGE_SPLITS): PageLabel[] {
  const raw: unknown = JSON.parse(readFileSync(path.join(fixturesDir, PAGE_LABELS_FILE), "utf8"));
  const labels = validatePageLabels(raw);
  const missing = labels.filter((p) => !existsSync(path.join(fixturesDir, "pages", p.file))).map((p) => `${p.id}: file pages/${p.file} does not exist`);
  if (missing.length > 0) throw new LabelValidationError(PAGE_LABELS_FILE, missing);
  return labels.filter((p) => splits.includes(p.split));
}
