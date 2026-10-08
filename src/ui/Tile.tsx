import { initial } from "./format";

/** A recipe's tile: the photo kept under a recorded permission when there is one, otherwise the
 *  designed placeholder (its initial on a tinted tile). Decorative either way — the title is beside it. */
export function PlaceholderTile({ title, large, imageId }: { title?: string | null; large?: boolean; imageId?: string | null }) {
  if (imageId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={large ? "tile large photo" : "tile photo"} src={`/api/recipe-images/${imageId}`} alt="" aria-hidden="true" loading="lazy" decoding="async" data-testid="recipe-photo" />;
  }
  return <span className={large ? "tile large" : "tile"} aria-hidden="true">{title ? initial(title) : "·"}</span>;
}

/** Where a recipe came from: site, author, and a link to the original page. */
export function SourceLine({ v }: { v: { sourceUrl?: string | null; sourceSiteName?: string | null; sourceLabel?: string | null; sourceAuthor?: string | null } }) {
  if (!v.sourceUrl) return null;
  const site = v.sourceSiteName ?? v.sourceLabel ?? new URL(v.sourceUrl).hostname.replace(/^www\./, "");
  return (
    <p className="small" data-testid="recipe-source" style={{ margin: 0 }}>
      From <strong>{site}</strong>{v.sourceAuthor ? <> · by {v.sourceAuthor}</> : null} ·{" "}
      <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Open the original recipe on ${site} (new tab)`}>Open the original ↗</a>
    </p>
  );
}
