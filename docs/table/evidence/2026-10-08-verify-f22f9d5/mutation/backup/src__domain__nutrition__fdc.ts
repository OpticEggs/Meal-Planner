import { hashOf } from "../hash";
import { D, normalizeUnit } from "../units";

/**
 * USDA FoodData Central (FDC) normalization. Pure: no I/O, no clock, no environment.
 *
 * Shapes follow the official OpenAPI spec 1.0.0 (FoundationFoodItem, SRLegacyFoodItem,
 * SurveyFoodItem, BrandedFoodItem, FoodNutrient, FoodPortion, SearchResult, SearchResultFood) and
 * the field names the live API actually returns (search results carry `nutrientNumber`/`value`/
 * `publishedDate`; details carry `nutrient.number`/`amount`/`publicationDate`).
 *
 * Rules (plan §6.1, B7):
 *  - Foundation / SR Legacy / Survey: foodNutrients are per 100 g of the food as described.
 *  - Branded: foodNutrients per 100 g; serving size and labelNutrients are per serving. A serving
 *    is never 100 g; it converts to grams only when its unit is grams (ml is not grams). A Branded
 *    food whose serving is stated in a non-gram unit has an unclear per-100 basis: unknown.
 *  - Energy: nutrient 208 (kcal); if absent 958 then 957 (Atwater specific / general, kcal); the
 *    number used is recorded. Never derived from kJ (268) or from macros. Missing → unknown.
 *  - Protein 203, fat 204, carbohydrate by difference 205. A unit other than g (kcal for energy)
 *    is `bad_unit` → unknown for that nutrient.
 *  - Portions are offered, never applied unless the member picks one.
 *  - Raw/cooked from the description is a HINT only; the member chooses the form.
 */

export const DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"] as const;
export type FdcDataType = (typeof DATA_TYPES)[number];
export const NUTRIENT_KEYS = ["energy", "protein", "fat", "carbs"] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type NutrientStatus = "ok" | "missing" | "bad_unit";
export type Form = "raw" | "cooked" | "as_sold";
export const FORMS: readonly Form[] = ["raw", "cooked", "as_sold"];
export type ProvenanceKind = "fdc_api" | "fixture_fetched_demo" | "fixture_official_example" | "fixture_synthetic" | "manual_label";

export interface NutrientValue {
  amount: string | null; // null = unknown, never zero
  unit: string | null; // as FDC states it (lower-cased)
  number: string | null; // FDC nutrient number used
  status: NutrientStatus;
}

export interface OfferedPortion {
  id: string;
  label: string;
  amount: string;
  unit: string;
  gramWeight: string;
  source: "foodPortion" | "brandedServing";
}

export interface Candidate {
  fdcId: number;
  dataType: FdcDataType;
  description: string;
  publicationDate: string | null;
  brandOwner: string | null;
  /** What the nutrient amounts describe; null when the basis cannot be established. */
  basis: { qty: string; unit: string } | null;
  basisNote: string | null;
  nutrients: Record<NutrientKey, NutrientValue>;
  /** Branded only: the label's serving (display; converts to grams only when stated in g). */
  serving: { size: string | null; unit: string | null; grams: string | null; householdText: string | null; label: Record<NutrientKey, string | null> } | null;
  portions: OfferedPortion[];
  formHint: "raw" | "cooked" | null;
}

export interface SearchItem {
  fdcId: number;
  description: string;
  dataType: FdcDataType;
  publicationDate: string | null;
  brandOwner: string | null;
}

export type Normalized<T> = { ok: true; value: T } | { ok: false; reason: string };

const EXPECTED_UNIT: Record<NutrientKey, string> = { energy: "kcal", protein: "g", fat: "g", carbs: "g" };
const NUMBERS: Record<Exclude<NutrientKey, "energy">, string> = { protein: "203", fat: "204", carbs: "205" };
export const ENERGY_ORDER = ["208", "958", "957"] as const;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** A JSON number (or a numeric string, as the spec's own examples use) as an exact decimal string. */
export function decimalOf(v: unknown): string | null {
  if (typeof v === "number") return Number.isFinite(v) ? new D(v).toFixed() : null;
  if (typeof v === "string" && /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v.trim())) return new D(v.trim()).toFixed();
  return null;
}

function dataTypeOf(o: Record<string, unknown>): FdcDataType | null {
  const t = str(o.dataType) ?? str(o.datatype); // SurveyFoodItem in the spec spells it `datatype`
  return (DATA_TYPES as readonly string[]).includes(t ?? "") ? (t as FdcDataType) : null;
}

type RawNutrient = { amount: string | null; unit: string | null };

/** Reads foodNutrients in either the detail shape or the search/abridged shape. */
function readNutrients(list: unknown): Normalized<Map<string, RawNutrient>> {
  if (list === undefined || list === null) return { ok: true, value: new Map() };
  if (!Array.isArray(list)) return { ok: false, reason: "foodNutrients is not an array" };
  const out = new Map<string, RawNutrient>();
  for (const n of list) {
    if (!isObj(n)) return { ok: false, reason: "a foodNutrients entry is not an object" };
    const nested = isObj(n.nutrient) ? n.nutrient : null;
    const number = str(nested?.number) ?? str(n.nutrientNumber) ?? (typeof n.number === "number" || typeof n.number === "string" ? String(n.number) : null);
    if (!number) continue; // header rows ("Proximates") and entries without a number carry no value
    const unit = str(nested?.unitName) ?? str(n.unitName);
    const raw = "amount" in n ? n.amount : n.value;
    const amount = raw === undefined || raw === null ? null : decimalOf(raw);
    if (raw !== undefined && raw !== null && amount === null) return { ok: false, reason: `nutrient ${number} amount is not a number` };
    if (!out.has(number)) out.set(number, { amount, unit: unit ? unit.toLowerCase() : null });
  }
  return { ok: true, value: out };
}

function pick(map: Map<string, RawNutrient>, key: NutrientKey, numbers: readonly string[], basisKnown: boolean): NutrientValue {
  for (const number of numbers) {
    const n = map.get(number);
    if (!n || n.amount === null) continue;
    if (!basisKnown) return { amount: null, unit: n.unit, number, status: "missing" };
    if (n.unit !== EXPECTED_UNIT[key]) return { amount: null, unit: n.unit, number, status: "bad_unit" };
    return { amount: n.amount, unit: n.unit, number, status: "ok" };
  }
  return { amount: null, unit: null, number: null, status: "missing" };
}

export function formHintOf(description: string): "raw" | "cooked" | null {
  const raw = /\braw\b/i.test(description);
  const cooked = /\b(cooked|roasted|boiled|baked|grilled|fried|braised|stewed|steamed|broiled|microwaved|sauteed|sautéed|poached|toasted)\b/i.test(description);
  return raw === cooked ? null : raw ? "raw" : "cooked";
}

const GRAM_UNITS = new Set(["g", "grm", "gram", "grams"]);

function portionsOf(list: unknown): Normalized<OfferedPortion[]> {
  if (list === undefined || list === null) return { ok: true, value: [] };
  if (!Array.isArray(list)) return { ok: false, reason: "foodPortions is not an array" };
  const out: OfferedPortion[] = [];
  list.forEach((p, i) => {
    if (!isObj(p)) return;
    const grams = decimalOf(p.gramWeight);
    if (!grams || new D(grams).lte(0)) return; // a portion without a gram weight cannot be used
    const amount = decimalOf(p.amount) ?? "1";
    if (new D(amount).lte(0)) return;
    const mu = isObj(p.measureUnit) ? str(p.measureUnit.name) : null;
    const modifier = str(p.modifier);
    const desc = str(p.portionDescription);
    let unit: string | null = null;
    if (mu && mu.toLowerCase() !== "undetermined") unit = modifier && !/^\d+$/.test(modifier) ? `${mu} ${modifier}` : mu;
    else if (modifier && !/^\d+$/.test(modifier)) unit = modifier;
    else if (desc) unit = desc.replace(/^\s*[\d./]+\s*/, "") || null;
    if (!unit) return;
    const u = normalizeUnit(unit);
    const id = typeof p.id === "number" || typeof p.id === "string" ? `p${p.id}` : `i${i}`;
    const label = `${new D(amount).toString()} ${u}${desc && !desc.includes(unit) ? ` (${desc})` : ""} = ${new D(grams).toString()} g`;
    out.push({ id, label, amount, unit: u, gramWeight: grams, source: "foodPortion" });
  });
  return { ok: true, value: out };
}

/** Normalizes one food detail (GET /v1/food/{fdcId}). */
export function normalizeFood(raw: unknown, requestedFdcId?: number): Normalized<Candidate> {
  if (!isObj(raw)) return { ok: false, reason: "the food is not a JSON object" };
  if (typeof raw.fdcId !== "number" || !Number.isInteger(raw.fdcId) || raw.fdcId <= 0) return { ok: false, reason: "fdcId missing or not an integer" };
  if (requestedFdcId !== undefined && raw.fdcId !== requestedFdcId) return { ok: false, reason: `asked for food ${requestedFdcId}, got ${raw.fdcId}` };
  const description = str(raw.description);
  if (!description) return { ok: false, reason: "description missing" };
  const dataType = dataTypeOf(raw);
  if (!dataType) return { ok: false, reason: `unsupported or missing data type (${String(raw.dataType ?? raw.datatype)})` };
  const nutrients = readNutrients(raw.foodNutrients);
  if (!nutrients.ok) return nutrients;
  const portions = portionsOf(raw.foodPortions);
  if (!portions.ok) return portions;

  let basis: Candidate["basis"] = { qty: "100", unit: "g" };
  let basisNote: string | null = null;
  let serving: Candidate["serving"] = null;
  const offered = [...portions.value];
  if (dataType === "Branded") {
    const size = decimalOf(raw.servingSize);
    const unitRaw = str(raw.servingSizeUnit);
    const unit = unitRaw ? unitRaw.toLowerCase() : null;
    const grams = size && unit && GRAM_UNITS.has(unit) && new D(size).gt(0) ? size : null;
    const ln = isObj(raw.labelNutrients) ? raw.labelNutrients : {};
    const lv = (k: string) => (isObj(ln[k]) ? decimalOf((ln[k] as Record<string, unknown>).value) : null);
    serving = {
      size, unit: unitRaw, grams, householdText: str(raw.householdServingFullText),
      label: { energy: lv("calories"), protein: lv("protein"), fat: lv("fat"), carbs: lv("carbohydrates") },
    };
    if (unit && !GRAM_UNITS.has(unit)) {
      basis = null;
      basisNote = `The serving is stated in ${unitRaw}, not grams, so the per-100 values cannot be taken as per 100 g. Label values are per serving and shown for reference only.`;
    } else if (grams) {
      offered.push({ id: "serving", label: `1 serving = ${new D(grams).toString()} g (label serving)`, amount: "1", unit: "serving", gramWeight: grams, source: "brandedServing" });
    }
  }
  const map = nutrients.value;
  const known = basis !== null;
  return {
    ok: true,
    value: {
      fdcId: raw.fdcId,
      dataType,
      description,
      publicationDate: str(raw.publicationDate) ?? str(raw.publishedDate),
      brandOwner: dataType === "Branded" ? str(raw.brandOwner) : null,
      basis,
      basisNote,
      nutrients: {
        energy: pick(map, "energy", ENERGY_ORDER, known),
        protein: pick(map, "protein", [NUMBERS.protein], known),
        fat: pick(map, "fat", [NUMBERS.fat], known),
        carbs: pick(map, "carbs", [NUMBERS.carbs], known),
      },
      serving,
      portions: offered,
      formHint: formHintOf(description),
    },
  };
}

/** Normalizes a search response (POST /v1/foods/search). Unsupported data types are left out. */
export function normalizeSearch(raw: unknown): Normalized<{ totalHits: number; items: SearchItem[] }> {
  const body = Array.isArray(raw) ? (raw.length ? raw[0] : { totalHits: 0, foods: [] }) : raw; // the spec says array; the API returns an object
  if (!isObj(body)) return { ok: false, reason: "the search result is not a JSON object" };
  if (!Array.isArray(body.foods)) return { ok: false, reason: "foods is missing or not an array" };
  const items: SearchItem[] = [];
  for (const f of body.foods) {
    if (!isObj(f) || typeof f.fdcId !== "number" || !Number.isInteger(f.fdcId) || !str(f.description)) return { ok: false, reason: "a search result has no fdcId or description" };
    const dataType = dataTypeOf(f);
    if (!dataType) continue;
    items.push({ fdcId: f.fdcId, description: str(f.description)!, dataType, publicationDate: str(f.publicationDate) ?? str(f.publishedDate), brandOwner: str(f.brandOwner) });
  }
  const totalHits = typeof body.totalHits === "number" ? body.totalHits : items.length;
  return { ok: true, value: { totalHits, items } };
}

/** The review digest: a hash of exactly the values the member is shown for a candidate. */
export function reviewDigest(candidate: Candidate, provenanceKind: ProvenanceKind): string {
  return hashOf({ v: 1, provenanceKind, candidate });
}

export { normalizeForm } from "./form";

export function isForm(f: unknown): f is Form {
  return typeof f === "string" && (FORMS as readonly string[]).includes(f);
}

/** Values for calculation: per 100 g, or — only when the member explicitly chose one — per the
 *  chosen portion (amounts scaled exactly by its gram weight). Unknown stays unknown. */
export function effectiveFacts(candidate: Candidate, portionId: string | null): Normalized<{
  basisQty: string; basisUnit: string; calories: string | null; proteinG: string | null; carbsG: string | null; fatG: string | null; portion: OfferedPortion | null;
}> {
  if (!candidate.basis) return { ok: false, reason: "basis_unknown" };
  const portion = portionId ? candidate.portions.find((p) => p.id === portionId) ?? null : null;
  if (portionId && !portion) return { ok: false, reason: "portion_unknown" };
  const scale = (v: string | null) => (v === null ? null : portion ? new D(v).mul(portion.gramWeight).div(candidate.basis!.qty).toFixed() : v);
  const n = candidate.nutrients;
  return {
    ok: true,
    value: {
      basisQty: portion ? portion.amount : candidate.basis.qty,
      basisUnit: portion ? portion.unit : candidate.basis.unit,
      calories: scale(n.energy.amount), proteinG: scale(n.protein.amount), carbsG: scale(n.carbs.amount), fatG: scale(n.fat.amount),
      portion,
    },
  };
}
