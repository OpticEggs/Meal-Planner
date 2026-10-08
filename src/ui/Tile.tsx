import { initial } from "./format";

/** The designed placeholder for a recipe (no photographs exist): its initial on a tinted tile. Decorative. */
export function PlaceholderTile({ title, large }: { title?: string | null; large?: boolean }) {
  return <span className={large ? "tile large" : "tile"} aria-hidden="true">{title ? initial(title) : "·"}</span>;
}
