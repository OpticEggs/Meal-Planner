export function money(minor: number | null | undefined, currency = "USD"): string {
  if (minor === null || minor === undefined) return "unknown";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

export function costView(v: { knownMinor: number; unknownCount: number; complete: boolean; currency: string } | null | undefined): string {
  if (!v) return "unknown";
  if (v.complete) return money(v.knownMinor, v.currency);
  return `${money(v.knownMinor, v.currency)} known + ${v.unknownCount} unpriced`;
}

const UNIT_LABEL: Record<string, string> = { g: "g", ml: "ml", each: "", fl_oz: "fl oz" };
export function qty(q: string | number, unit: string): string {
  const n = Number(q);
  if (unit === "g" && n >= 100) return `${(n / 28.349523125).toFixed(1)} oz (${Math.round(n)} g)`;
  if (unit === "ml" && n >= 30) return `${(n / 29.5735295625).toFixed(1)} fl oz`;
  return `${Number(n.toFixed(2))} ${UNIT_LABEL[unit] ?? unit}`.trim();
}

export function shortDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function nutrient(n: { value: string | null; knownPart: string; missing: string[] } | null | undefined, unit = ""): string {
  if (!n) return "unknown";
  if (n.value !== null) return `${n.value}${unit}`;
  return `unknown (≥ ${n.knownPart}${unit} known; missing ${n.missing.length})`;
}
