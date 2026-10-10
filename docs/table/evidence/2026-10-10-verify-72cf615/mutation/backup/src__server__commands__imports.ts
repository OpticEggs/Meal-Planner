import { Reject, runCommand, type Actor } from "./framework";
import type { Db } from "../db/pool";
import { bookmarkInHousehold } from "./sources";
import { validateLinkUrl } from "../integrations/recipe-import/url";
import { writeRecipeVersion } from "./library";
import { parseIngredientLine } from "../integrations/recipe-import/ingredient-line";
import { draftProblems, initialDecision, perPortion, decisionProblem, type DraftLine, type LineDecision, type ParsedLine } from "@/domain/recipes/import";
import { normalizeUnit } from "@/domain/units";
import { formatAmount, parseAmount } from "@/domain/quantity";
import { NOTHING_KEPT, type ContentUse } from "../integrations/recipe-import/content-policy";

/**
 * Reviewed import. A draft holds the original ingredient lines, what the parser read from them and
 * each member decision; it is never planned or bought for. Confirming a complete draft writes one
 * immutable recipe version (provenance "imported", source page kept) through the same path as a
 * manual save. The source's method text and photo are kept only under a recorded content permission
 * (off by default); otherwise the recipe links to the original and the member may type the
 * household's own instructions. Nutrition claims are never used.
 */

export const EXTRACTOR_VERSION = "table-import-3";
const MAX_LINES = 100;

function draftLines(raws: string[]): DraftLine[] {
  return raws.slice(0, MAX_LINES).map((raw) => {
    const parsed = parseIngredientLine(raw);
    const p: ParsedLine = {
      quantity: parsed.quantity, unit: parsed.unit, name: parsed.name, form: parsed.form, status: parsed.status, reasons: parsed.reasons,
      note: parsed.note ?? null, range: parsed.range, alternatives: parsed.alternatives,
    };
    return { raw: String(raw).slice(0, 500), parsed: p, decision: initialDecision(p) };
  });
}

async function draftInHousehold(c: Db, householdId: string, draftId: string) {
  if (typeof draftId !== "string" || !/^[0-9a-f-]{36}$/i.test(draftId)) throw new Reject("not_found", "Import draft not found");
  const r = await c.query("SELECT * FROM recipe_import_drafts WHERE id=$1 AND household_id=$2", [draftId, householdId]);
  if (!r.rowCount) throw new Reject("not_found", "Import draft not found");
  return r.rows[0];
}

function openAtRevision(d: { status: string; revision: number; updated_by_name?: string }, expectedRevision: unknown) {
  if (d.status !== "open") throw new Reject("stale", d.status === "confirmed" ? "This import was already confirmed." : "This import draft was discarded.");
  if (!Number.isInteger(expectedRevision)) throw new Reject("invalid", "Say which revision of the draft you reviewed");
  if (d.revision !== expectedRevision) {
    throw new Reject("stale_draft", "The other member changed this import while you were reviewing it. Nothing was saved; review the current draft.", { current: d.revision });
  }
}

/** What a draft read from a page beyond the ingredient lines (absent for pasted drafts). */
export interface PageDetails {
  description?: string | null;
  author?: string | null;
  siteName?: string | null;
  stepCount?: number;
  imageCount?: number;
  /** The source's method — only when the content policy allowed keeping it. */
  steps?: { section: string | null; text: string }[] | null;
  policy?: ContentUse;
}

/** The kept method as editable text: section headings on their own line, one step per line. */
export function stepsText(steps: { section: string | null; text: string }[]): string {
  const out: string[] = [];
  let section: string | null = null;
  for (const s of steps) {
    if (s.section && s.section !== section) out.push(`${s.section}:`);
    section = s.section;
    out.push(s.text);
  }
  return out.join("\n").slice(0, 10000);
}

async function openDraft(c: Db, actor: Actor, bookmarkId: string, f: PageDetails & {
  method: "json_ld" | "microdata" | "user_pasted" | "manual"; fetchedUrl?: string | null; title: string | null; yieldText?: string | null; servings?: number | null;
  effortMinutes?: number | null; hasInstructions?: boolean; hasNutrition?: boolean; lines: string[]; problems?: string[]; imageId?: string | null;
}) {
  const b = await bookmarkInHousehold(c, actor.householdId, bookmarkId);
  if (b.archived_at) throw new Reject("stale", "This link is archived; restore it first.");
  if (b.recipe_id) throw new Reject("already_imported", "This link was already imported; edit the recipe in Our Recipes.");
  const open = await c.query("SELECT id FROM recipe_import_drafts WHERE bookmark_id=$1 AND status='open'", [b.id]);
  if (open.rowCount) throw new Reject("draft_exists", "An import of this link is already in review; continue it or discard it first.", { draftId: open.rows[0].id });
  const lines = draftLines(f.lines);
  const policy = f.policy ?? NOTHING_KEPT;
  const steps = policy.instructions && f.steps?.length ? f.steps.slice(0, 60) : null;
  const r = await c.query(
    `INSERT INTO recipe_import_drafts(household_id, bookmark_id, method, extractor_version, source_url, fetched_url, title, yield_text, servings,
       effort_minutes, source_has_instructions, source_has_nutrition, lines, problems, created_by,
       description, source_author, site_name, source_step_count, source_image_count, source_steps, image_id, content_policy, household_instructions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING id`,
    [
      actor.householdId, b.id, f.method, EXTRACTOR_VERSION, b.url, f.fetchedUrl ?? null, (f.title ?? b.title ?? null)?.slice(0, 140) ?? null,
      f.yieldText?.slice(0, 120) ?? null, f.servings && f.servings >= 1 && f.servings <= 100 ? f.servings : null,
      f.effortMinutes && f.effortMinutes >= 1 && f.effortMinutes <= 1440 ? f.effortMinutes : null,
      !!f.hasInstructions, !!f.hasNutrition, JSON.stringify(lines), JSON.stringify((f.problems ?? []).slice(0, 20)), actor.memberId,
      f.description?.slice(0, 500) ?? null, f.author?.slice(0, 200) ?? null, f.siteName?.slice(0, 120) ?? null,
      Math.max(0, Math.min(f.stepCount ?? 0, 1000)), Math.max(0, Math.min(f.imageCount ?? 0, 1000)),
      steps ? JSON.stringify(steps) : null, f.imageId ?? null, JSON.stringify(policy), steps ? stepsText(steps) : "",
    ],
  );
  await c.query("UPDATE recipe_bookmarks SET status='import_draft', status_detail=NULL, last_checked_at=now(), revision=revision+1 WHERE id=$1", [b.id]);
  return { draftId: r.rows[0].id as string, label: b.title ?? b.source_label };
}

/** Server-side only (not a client command): records a draft read from the page by the import route.
 *  A photograph arrives only when the content policy allowed keeping it; its bytes stay out of the
 *  command payload (the payload names its hash). */
export function createImportDraftFromPage(actor: Actor, operationId: string, p: PageDetails & {
  bookmarkId: string; method?: "json_ld" | "microdata"; fetchedUrl: string; title: string | null; yieldText: string | null; servings: number | null; effortMinutes: number | null;
  hasInstructions: boolean; hasNutrition: boolean; lines: string[]; problems: string[];
}, image: { bytes: Buffer; contentType: string; sourceUrl: string; sha256: string } | null = null) {
  const payload = { ...p, image: image ? { sha256: image.sha256, contentType: image.contentType, sourceUrl: image.sourceUrl } : null };
  return runCommand(actor, "CreateImportDraft", operationId, payload, async (c) => {
    if (!p.lines.length) throw new Reject("unsupported", "No ingredient list was found on the page.");
    const policy = p.policy ?? NOTHING_KEPT;
    let imageId: string | null = null;
    if (image && policy.photos && policy.basis) {
      const b = await bookmarkInHousehold(c, actor.householdId, p.bookmarkId);
      const ins = await c.query(
        `INSERT INTO recipe_images(household_id, content_type, bytes, sha256, source_url, page_url, permission, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [actor.householdId, image.contentType, image.bytes, image.sha256, image.sourceUrl, p.fetchedUrl ?? b.url, policy.basis, actor.memberId],
      );
      imageId = ins.rows[0].id;
    }
    const d = await openDraft(c, actor, p.bookmarkId, { ...p, method: p.method ?? "json_ld", imageId });
    return { status: "accepted", result: { draftId: d.draftId }, change: { summary: { type: "link", text: `${actor.displayName} started importing ${d.label}` } } };
  });
}

/** Server-side only: what an import attempt found (no draft): unsupported, unavailable, permission_blocked. */
export function recordImportOutcome(actor: Actor, operationId: string, p: { bookmarkId: string; status: "unsupported" | "unavailable" | "permission_blocked"; detail: string }) {
  return runCommand(actor, "RecordImportOutcome", operationId, p, async (c) => {
    const b = await bookmarkInHousehold(c, actor.householdId, p.bookmarkId);
    if (b.recipe_id) return { status: "accepted", result: { unchanged: true } };
    await c.query("UPDATE recipe_bookmarks SET status=$2, status_detail=$3, last_checked_at=now(), revision=revision+1 WHERE id=$1", [b.id, p.status, p.detail.slice(0, 300)]);
    return { status: "accepted", result: {}, change: { summary: { type: "link", text: `Import of ${b.title ?? b.source_label}: ${p.detail}` } } };
  });
}

/** A member pastes the ingredient lines (one per line) — works for any site, including link-only ones. */
export function pasteIngredientsCommand(actor: Actor, operationId: string, p: { bookmarkId: string; text: string; title?: string | null }) {
  return runCommand(actor, "PasteIngredients", operationId, p, async (c) => {
    const raws = String(p?.text ?? "").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!raws.length) throw new Reject("invalid", "Paste at least one ingredient line.");
    if (raws.length > MAX_LINES) throw new Reject("invalid", `Paste at most ${MAX_LINES} ingredient lines.`);
    const title = typeof p.title === "string" && p.title.trim() ? p.title.trim() : null;
    const d = await openDraft(c, actor, p.bookmarkId, { method: "user_pasted", title, lines: raws });
    return { status: "accepted", result: { draftId: d.draftId }, change: { summary: { type: "link", text: `${actor.displayName} started importing ${d.label}` } } };
  });
}

export interface DraftUpdate {
  draftId: string;
  expectedRevision: number;
  title?: string | null;
  servings?: number | null;
  effortMinutes?: number | null;
  householdInstructions?: string;
  decisions?: { index: number; decision: LineDecision | null }[];
}

export function updateImportDraftCommand(actor: Actor, operationId: string, p: DraftUpdate) {
  return runCommand(actor, "UpdateImportDraft", operationId, p, async (c) => {
    const d = await draftInHousehold(c, actor.householdId, p?.draftId);
    openAtRevision(d, p.expectedRevision);
    const lines: DraftLine[] = d.lines;
    for (const x of p.decisions ?? []) {
      if (!Number.isInteger(x.index) || x.index < 0 || x.index >= lines.length) throw new Reject("invalid", "Unknown ingredient line");
      let dec: LineDecision | null = null;
      if (x.decision && x.decision.use === true) {
        const typed = String(x.decision.quantity ?? "").trim().replace(/\s+/g, " ");
        dec = {
          use: true, name: String(x.decision.name ?? "").trim().slice(0, 80), quantity: typed,
          unit: normalizeUnit(String(x.decision.unit ?? "")), form: x.decision.form === "cooked" ? "cooked" : "raw",
        };
        const problem = decisionProblem(dec);
        if (problem) throw new Reject("invalid", `Line ${x.index + 1} ${problem}.`, { field: `line-${x.index}` });
        // Canonical exact text: "2/4" → "1/2", "1½" → "1 1/2"; a typed decimal stays a decimal.
        dec.quantity = formatAmount(parseAmount(typed)!, /\./.test(typed));
      } else if (x.decision && x.decision.use === false) dec = { use: false };
      lines[x.index] = { ...lines[x.index], decision: dec };
    }
    const servings = p.servings === undefined ? d.servings : p.servings;
    if (servings !== null && (!Number.isInteger(servings) || servings < 1 || servings > 100)) throw new Reject("invalid", "Servings must be a whole number from 1 to 100.", { field: "servings" });
    const effort = p.effortMinutes === undefined ? d.effort_minutes : p.effortMinutes;
    if (effort !== null && (!Number.isInteger(effort) || effort < 1 || effort > 1440)) throw new Reject("invalid", "Time must be whole minutes from 1 to 1440.", { field: "effort" });
    const title = p.title === undefined ? d.title : (String(p.title ?? "").trim().slice(0, 140) || null);
    const instr = p.householdInstructions === undefined ? d.household_instructions : String(p.householdInstructions).slice(0, 10000);
    await c.query(
      `UPDATE recipe_import_drafts SET lines=$2, servings=$3, effort_minutes=$4, title=$5, household_instructions=$6, revision=revision+1, updated_by=$7, updated_at=now()
       WHERE id=$1`,
      [d.id, JSON.stringify(lines), servings, effort, title, instr, actor.memberId],
    );
    return { status: "accepted", result: { draftId: d.id, revision: d.revision + 1 }, change: { summary: { type: "link", text: `${actor.displayName} reviewed an import` } } };
  });
}

export function discardImportDraftCommand(actor: Actor, operationId: string, p: { draftId: string; expectedRevision: number }) {
  return runCommand(actor, "DiscardImportDraft", operationId, p, async (c) => {
    const d = await draftInHousehold(c, actor.householdId, p?.draftId);
    openAtRevision(d, p.expectedRevision);
    await c.query("UPDATE recipe_import_drafts SET status='discarded', revision=revision+1, updated_by=$2, updated_at=now() WHERE id=$1", [d.id, actor.memberId]);
    await c.query("UPDATE recipe_bookmarks SET status='saved', status_detail=NULL, revision=revision+1 WHERE id=$1 AND status='import_draft'", [d.bookmark_id]);
    return { status: "accepted", result: {}, change: { summary: { type: "link", text: `${actor.displayName} discarded an import` } } };
  });
}

/** The deliberate step: a complete, reviewed draft becomes a new recipe (version 1, provenance "imported"). */
export function confirmImportDraftCommand(actor: Actor, operationId: string, p: { draftId: string; expectedRevision: number }) {
  return runCommand(actor, "ConfirmImportDraft", operationId, p, async (c) => {
    const d = await draftInHousehold(c, actor.householdId, p?.draftId);
    openAtRevision(d, p.expectedRevision);
    const b = await bookmarkInHousehold(c, actor.householdId, d.bookmark_id);
    const lines: DraftLine[] = d.lines;
    const problems = draftProblems({ title: d.title, servings: d.servings, lines });
    if (problems.length) throw new Reject("incomplete", "This import isn't complete yet, so no recipe was made. The link stays saved.", { problems });
    // The recipe's source is the page its details came from (after any redirect), not just the link saved.
    const read = d.fetched_url ? validateLinkUrl(d.fetched_url) : null;
    const source = read?.ok ? { url: read.url, label: read.sourceLabel } : { url: b.url, label: b.source_label };
    const used = lines.filter((l) => l.decision?.use) as (DraftLine & { decision: Extract<LineDecision, { use: true }> })[];
    const left = lines.filter((l) => l.decision && !l.decision.use).map((l) => l.raw);
    const outcome = await writeRecipeVersion(
      c, actor,
      {
        recipeId: null,
        title: d.title,
        effortMinutes: d.effort_minutes,
        instructions: d.household_instructions,
        sourceLabel: source.label,
        summary: left.length ? `Not counted in groceries: ${left.join("; ")}`.slice(0, 1000) : null,
        components: [{ key: "main", name: "Main" }],
        ingredients: used.map((l) => ({
          componentKey: "main", ingredientName: l.decision.name, quantity: perPortion(l.decision.quantity, d.servings).value,
          unit: l.decision.unit, form: l.decision.form, note: `From: ${l.raw}`.slice(0, 200),
          // EQ: the exact whole-recipe amount and its servings travel with the row (migration 015).
          exactAmount: l.decision.quantity, exactServings: d.servings,
        })),
      },
      { provenance: "imported", sourceUrl: source.url, importDraftId: d.id, imageId: d.image_id ?? null, sourceAuthor: d.source_author ?? null, sourceSiteName: d.site_name ?? null },
    );
    const { recipeId, versionId } = outcome.result as { recipeId: string; versionId: string };
    await c.query("UPDATE recipe_import_drafts SET status='confirmed', confirmed_version_id=$2, revision=revision+1, updated_by=$3, updated_at=now() WHERE id=$1", [d.id, versionId, actor.memberId]);
    await c.query("UPDATE recipe_bookmarks SET status='imported', status_detail=NULL, recipe_id=$2, revision=revision+1 WHERE id=$1", [b.id, recipeId]);
    return {
      status: "accepted",
      result: { recipeId, versionId },
      change: { summary: { type: "recipe", text: `${actor.displayName} imported ${d.title} from ${source.label}` } },
    };
  });
}
