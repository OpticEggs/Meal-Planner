export function money(minor: number | null | undefined, currency = "USD"): string {
  if (minor === null || minor === undefined) return "unknown";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

export function costView(v: { knownMinor: number; unknownCount: number; complete: boolean; currency: string } | null | undefined): string {
  if (!v) return "unknown";
  if (v.complete) return money(v.knownMinor, v.currency);
  if (v.knownMinor === 0) return `unknown — ${v.unknownCount} unpriced`;
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

const BUDGET_SCOPE: Record<string, string> = { pickup: "pickup", dinner_ingredients: "dinner ingredient" };
/** One budget wording for Week and Groceries (visual update). Never claims within/over when prices
 *  are unknown. */
export function budgetText(b: { status: string; limitMinor: number | null; firm?: boolean; scope?: string | null } | null | undefined): string {
  if (!b || b.status === "unset") return "No budget set";
  const scope = b.scope ? `${BUDGET_SCOPE[b.scope] ?? b.scope} ` : "";
  const limit = b.limitMinor !== null ? `${money(b.limitMinor)} ` : "";
  const firm = b.firm ? " (firm)" : "";
  if (b.status === "unknown") return `Can't be judged yet — some prices are unknown${b.limitMinor !== null ? ` (${limit.trim()} ${scope}budget)` : ""}`;
  return `${b.status === "over" ? "Over" : "Within"} your ${limit}${scope}budget${firm}`;
}

/** The first letter of a title, for the designed placeholder tile (no photographs exist). */
export function initial(title: string | null | undefined): string {
  const t = (title ?? "").replace(/^Fixture:\s*/, "").trim();
  return t ? t[0].toUpperCase() : "·";
}

const PREF_LABEL: Record<string, string> = { make_again: "make again", occasionally: "occasionally", not_for_me: "not for me" };
export function preferenceText(prefs: Record<string, string> | undefined, members: { id: string; displayName: string }[]): string {
  const parts = members.map((m) => (prefs?.[m.id] ? `${m.displayName}: ${PREF_LABEL[prefs[m.id]] ?? prefs[m.id]}` : null)).filter(Boolean);
  return parts.length ? parts.join(" · ") : "no feedback yet";
}

export function effortText(r: { effortMinutes?: number | null; effortLevel?: string | null; estimate?: boolean } | null | undefined): string {
  if (!r) return "time unknown";
  const t = r.effortMinutes ? `About ${r.effortMinutes} min${r.estimate === false ? "" : " (estimate)"}` : "time unknown";
  return r.effortLevel ? `${t} · ${r.effortLevel}` : t;
}
