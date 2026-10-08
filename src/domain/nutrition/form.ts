/** A recipe or nutrition form ("raw", "cooked", "as sold") in one comparable spelling. */
export function normalizeForm(f: string | null | undefined): string {
  const s = String(f ?? "raw").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return s || "raw";
}
