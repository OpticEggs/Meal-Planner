// Household-local calendar dates (YYYY-MM-DD strings). Meal dates are civil
// dates in the household's timezone, never derived from the browser clock.

export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function localHour(instant: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(instant);
  return Number(h);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekdayIndex(date: string): number {
  // 0 = Monday ... 6 = Sunday
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function weekStartOf(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

export function nightsOf(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function dayName(date: string): string {
  return NAMES[weekdayIndex(date)];
}
export function shortDay(date: string): string {
  return dayName(date).slice(0, 3);
}

/** The household's next dinner date: today until the dinner cutoff, then tomorrow. */
export function nextDinnerDate(instant: Date, timeZone: string, cutoffHour = 21): string {
  const today = localDate(instant, timeZone);
  return localHour(instant, timeZone) >= cutoffHour ? addDays(today, 1) : today;
}
