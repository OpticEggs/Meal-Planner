/**
 * Which photo a recipe shows. A member's own photo (kept on the recipe) comes first; otherwise the
 * photo kept from the source page with the version (only under a recorded content permission);
 * otherwise none. The version's own `imageId` is left as it is for older clients.
 */
export interface RecipePhoto {
  imageId: string;
  kind: "member" | "source";
  label: string;
}

export function recipePhoto(r: {
  memberPhotoId?: string | null;
  memberPhotoBy?: string | null;
  imageId?: string | null;
  sourceSiteName?: string | null;
  sourceLabel?: string | null;
}): RecipePhoto | null {
  if (r.memberPhotoId) return { imageId: r.memberPhotoId, kind: "member", label: r.memberPhotoBy ? `Photo by ${r.memberPhotoBy}` : "Our photo" };
  if (r.imageId) return { imageId: r.imageId, kind: "source", label: r.sourceSiteName || r.sourceLabel || "Source photo" };
  return null;
}
