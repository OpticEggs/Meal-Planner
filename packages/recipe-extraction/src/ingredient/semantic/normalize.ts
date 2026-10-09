/**
 * semantic-v1 · step 1: the text the engine reads (CONTRACT-v1 §2 `normalized`).
 *
 * Control characters and invisible direction/format marks become spaces, every run of whitespace
 * (including non-breaking and ideographic spaces) becomes one space, the ends are trimmed, and the
 * result is capped at LIMITS.maxLineChars. `truncated` is true exactly when the cap cut something
 * (§10.1). A cut never splits a surrogate pair.
 *
 * Joiners that never separate words — soft hyphen (U+00AD), zero-width non-joiner/joiner (U+200C/D),
 * word joiner (U+2060) and a byte-order mark inside the text (U+FEFF) — are removed rather than spaced,
 * so "jalape\u200dño" reads as one word. A zero-width space (U+200B) still separates words.
 */
import { LIMITS } from "../../contract";

/**
 * C0 and C1 controls, DEL, zero-width space/joiners and direction marks (U+200B–U+200F), bidi
 * embeddings/overrides (U+202A–U+202E), word joiner and invisible operators (U+2060–U+2064), bidi
 * isolates (U+2066–U+2069), the Arabic letter mark (U+061C), the Mongolian vowel separator (U+180E)
 * and the byte-order mark (U+FEFF).
 */
const CONTROLS = /[\u0000-\u001f\u007f-\u009f؜᠎​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
/** Invisible joiners removed outright (they sit inside words). */
const JOINERS = /[\u00ad\u200c\u200d\u2060\ufeff]/g;

export interface NormalizedLine {
  raw: string;
  normalized: string;
  truncated: boolean;
}

export function normalizeLine(input: unknown): NormalizedLine {
  const raw = typeof input === "string" ? input : "";
  const full = raw.replace(JOINERS, "").replace(CONTROLS, " ").replace(/\s+/g, " ").trim();
  if (full.length <= LIMITS.maxLineChars) return { raw, normalized: full, truncated: false };
  let cut = LIMITS.maxLineChars;
  const last = full.charCodeAt(cut - 1);
  const next = full.charCodeAt(cut);
  if (last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) cut -= 1; // keep the pair whole
  return { raw, normalized: full.slice(0, cut).trimEnd(), truncated: true };
}
