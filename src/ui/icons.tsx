/* Line icons for the photo-first screens (owner-approved preview, 2026-10-13). Decorative: every control that uses one
   has its own accessible name. */

const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={1.8}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
}
export function PlusIcon({ size = 20, weight = 1.8 }: { size?: number; weight?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={weight}><path d="M12 5v14M5 12h14" /></svg>;
}
export function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={2.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}
export function BackIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={2}><path d="M15 6l-6 6 6 6" /></svg>;
}
export function ChevronIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>;
}
export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={1.8} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
    </svg>
  );
}
export function MoreIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" /></svg>;
}
export function ExternalIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...line} strokeWidth={2}><path d="M7 17L17 7M9 7h8v8" /></svg>;
}
