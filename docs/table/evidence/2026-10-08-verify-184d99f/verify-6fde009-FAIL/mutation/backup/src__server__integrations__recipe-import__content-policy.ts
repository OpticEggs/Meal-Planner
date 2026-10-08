import type { RecipeContentConfig } from "../../env";
import { isBudgetBytes } from "./url";

/**
 * Whether an import may keep a page's own method text and photographs. Default: neither — the
 * recipe keeps facts (ingredients, servings, times) and attribution, and links to the original.
 * The answer is recorded on the draft (`content_policy`) so every kept item names its permission.
 */
export interface ContentUse {
  instructions: boolean;
  photos: boolean;
  /** In words, why — null when nothing is kept. */
  basis: string | null;
}

export const NOTHING_KEPT: ContentUse = { instructions: false, photos: false, basis: null };

function sameSite(domain: string, granted: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, "");
  return d === granted || d.endsWith(`.${granted}`);
}

export function contentUse(domain: string, cfg: RecipeContentConfig): ContentUse {
  if (isBudgetBytes(domain)) return NOTHING_KEPT; // never read (D90)
  const grant = cfg.grants.find((g) => sameSite(domain, g.domain));
  if (grant && (grant.instructions || grant.photos)) {
    return { instructions: grant.instructions, photos: grant.photos, basis: `permission recorded for ${grant.domain}` };
  }
  if (cfg.householdPrivate) return { instructions: true, photos: true, basis: "household-private copy (owner setting)" };
  return NOTHING_KEPT;
}
