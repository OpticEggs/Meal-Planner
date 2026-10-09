import { initial } from "./format";

/* eslint-disable @next/next/no-img-element */

/**
 * Recipe pictures (2026-10-09 overhaul). A photo is shown only when Table may show it: the member's own
 * photo, or a source photo kept under a recorded per-site permission; it is served by Table to the
 * household's members only. Every other recipe gets a designed illustration — a warm plate on a tinted
 * table, coloured from the title — so a list never looks broken or empty. Pictures are decorative: the
 * title is always beside them.
 */

const PALETTES: [string, string, string][] = [
  ["#E9C9A8", "#C9773F", "#7A3E1D"], // terracotta
  ["#D9DFC3", "#7E9256", "#3E4F28"], // olive
  ["#F0D9A6", "#D19A3A", "#7B5212"], // saffron
  ["#E7CFC7", "#B4614F", "#6B2F24"], // paprika
  ["#D6E0DA", "#6F9585", "#2F4E43"], // sage
  ["#E9D7C0", "#A8794F", "#5A3B1E"], // walnut
];

/** The illustration's darkest colour, for the initial drawn over it. */
const artInk = (title: string) => PALETTES[hash(title || "Table") % PALETTES.length][2];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The fallback illustration: a plate seen from above with a few garnish dots on its rim. Square tiles show
 *  the title's initial; the wide hero is a little table scene (plate, side bowl, herbs) without lettering. */
export function RecipeArt({ title, className, wide = false }: { title: string; className?: string; wide?: boolean }) {
  const h = hash(title || "Table");
  const [bg, mid, deep] = PALETTES[h % PALETTES.length];
  const ring = (cx: number, cy: number, r0: number, r1: number, n: number) =>
    Array.from({ length: n }, (_, k) => {
      const a = (((h >> (k * 3)) % 360) + k * 47) * (Math.PI / 180);
      const r = r0 + ((h >> (k * 2)) % (r1 - r0 + 1));
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), s: 1.6 + ((h >> k) % 3) * 0.6 };
    });
  if (wide) {
    const dots = ring(104, 50, 10, 22, 9);
    return (
      <svg className={className} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-testid="recipe-art">
        <rect width="160" height="100" fill={bg} />
        <path d="M0 78 Q40 70 80 80 T160 76 V100 H0 Z" fill={mid} opacity="0.12" />
        <circle cx="104" cy="50" r="36" fill="#FFFFFF" opacity="0.5" />
        <circle cx="104" cy="50" r="30" fill="#FFFDF8" opacity="0.95" />
        <circle cx="104" cy="50" r="23" fill={mid} opacity="0.2" />
        {dots.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r={d.s} fill={k % 2 ? mid : deep} opacity="0.8" />)}
        <circle cx="38" cy="34" r="15" fill="#FFFDF8" opacity="0.9" />
        <circle cx="38" cy="34" r="10" fill={deep} opacity="0.18" />
        <path d="M30 70 q8 -10 16 0 q-8 6 -16 0z" fill={deep} opacity="0.45" />
        <path d="M44 76 q7 -9 14 0 q-7 5 -14 0z" fill={mid} opacity="0.55" />
        <rect x="146" y="20" width="3" height="62" rx="1.5" fill={deep} opacity="0.25" />
      </svg>
    );
  }
  const dots = ring(50, 50, 17, 22, 6);
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-testid="recipe-art">
      <rect width="100" height="100" fill={bg} />
      <circle cx="50" cy="50" r="38" fill="#FFFFFF" opacity="0.55" />
      <circle cx="50" cy="50" r="31" fill="#FFFDF8" opacity="0.9" />
      <circle cx="50" cy="50" r="24" fill={mid} opacity="0.18" />
      {dots.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r={d.s} fill={k % 2 ? mid : deep} opacity="0.75" />)}
    </svg>
  );
}

/** A small square picture for lists: the photo when there is one, else the illustration. */
export function PlaceholderTile({ title, large, imageId }: { title?: string | null; large?: boolean; imageId?: string | null }) {
  if (imageId) {
    return <img className={large ? "tile large photo" : "tile photo"} src={`/api/recipe-images/${imageId}`} alt="" aria-hidden="true" loading="lazy" decoding="async" data-testid="recipe-photo" />;
  }
  // The initial is ordinary text over the illustration, so it follows the reader's text size.
  return (
    <span className={large ? "tile large art" : "tile art"} aria-hidden="true" style={{ color: artInk(title ?? "") }}>
      <RecipeArt title={title ?? ""} />
      <span className="tile-initial">{initial(title || "·")}</span>
    </span>
  );
}

/** The big picture at the top of a recipe or an import: photo with its credit, or the illustration. */
export function RecipeHero({ title, imageId, credit, href, compact }: { title: string; imageId?: string | null; credit?: string | null; href?: string | null; compact?: boolean }) {
  return (
    <figure className={`hero ${compact ? "compact" : ""} ${imageId ? "has-photo" : "is-art"}`} data-testid="recipe-hero">
      {imageId ? (
        <img src={`/api/recipe-images/${imageId}`} alt="" decoding="async" data-testid="recipe-photo" />
      ) : (
        <RecipeArt title={title} className="hero-art" wide />
      )}
      {imageId && credit ? (
        <figcaption className="hero-credit" data-testid="photo-credit">
          {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{credit} ↗</a> : credit}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Where a recipe came from: site, author, and a link to the original page. */
export function SourceLine({ v }: { v: { sourceUrl?: string | null; sourceSiteName?: string | null; sourceLabel?: string | null; sourceAuthor?: string | null } }) {
  if (!v.sourceUrl) return null;
  const site = v.sourceSiteName ?? v.sourceLabel ?? new URL(v.sourceUrl).hostname.replace(/^www\./, "");
  return (
    <p className="small source-line" data-testid="recipe-source">
      From <strong>{site}</strong>{v.sourceAuthor ? <> · by {v.sourceAuthor}</> : null} ·{" "}
      <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Open the original recipe on ${site} (new tab)`}>Open the original ↗</a>
    </p>
  );
}
