# Table — shadcn/ui adoption: plan for owner approval

_Prepared 2026-10-13 on `main` = `982296f` (live: `e7e1a9e`). **Plan only — nothing is built.** The owner chose real
shadcn/ui adoption (Tailwind + Radix components copied into the project) over a CSS-only restyle. Implementation starts
after the owner approves this plan with any of the decisions in §5 changed._

## 1. What changes and what does not

**Changes (presentation and component plumbing):** every screen's buttons, inputs, selects, cards, badges, tabs,
segmented controls and dialogs become shadcn/ui components on Radix primitives, styled with Tailwind v4 and one
token set. The look becomes shadcn's crisp dark style (neutral greys, thin borders, small consistent radii).

**Does not change:** commands, data, schema (no migration), grocery arithmetic, purchasing protections, photo
provenance, the import close guard's behaviour, accessible names and test ids (tests keep their meaning), the one live
region, the dinner calendar, deployment (a plain code deploy, no database step).

## 2. Inventory (measured)

| Surface | Count | shadcn replacement |
|---|---|---|
| Dialog/bottom sheets (`ModalSheet`) | 19 sheets in 9 files | `Sheet` (phone, from bottom) / `Dialog` (desktop) via one wrapper; confirmations → `AlertDialog` |
| Buttons (`.btn …`) | ~155 | `Button` (variants: default, secondary, outline, ghost, destructive, icon) |
| Inputs, selects, textareas | ~103 | `Input`, `Textarea`, `Label`, native `select` styled (Radix `Select` only where it helps) |
| Tablists | 2 | `Tabs` (Radix roving focus, arrow/Home keys — same keyboard contract) |
| Radio groups / segmented choices | 9 + availability, servings | `RadioGroup`, `ToggleGroup` |
| Warnings and notices | ~45 | `Alert` |
| Disclosures | 6 | `Collapsible` / `Accordion` |
| Cards, tiles, badges | many | `Card`, `Badge` |
| UI code | ~6,400 lines in `src/ui` | — |
| Browser specs that read layout or style | 8 of 33 | adapted deliberately, listed in ACCEPTANCE |

## 3. The one real risk: dialogs, focus and the unsaved-work guard

Table's own modal system (`src/ui/a11y.tsx`) carries tested contracts: focus trap, background not reachable, Escape,
focus return to the opener, and the **D144 guard** (backdrop/tap/Escape/Close on an edited sheet asks Keep editing /
Save for later / Discard). Radix provides trap, Escape and focus return; the guard is rebuilt on Radix's
`onInteractOutside` / `onEscapeKeyDown` (prevent close while dirty, then show the same confirmation). Radix hides the
background with `aria-hidden` and pointer blocking rather than the `inert` attribute: tests that assert `inert` are
changed to assert what matters (background controls cannot be focused or clicked). The guard tests CF-G1–G7 must pass
unchanged in meaning before any other screen moves.

## 4. Phases (each leaves the app shippable)

| Phase | Work | Proof |
|---|---|---|
| P0 Tooling | Tailwind v4 (`@tailwindcss/postcss`), `shadcn init` (components in `src/components/ui`, `cn` util), tokens bridged to the existing palette; **Tailwind preflight off** while old CSS still styles unmigrated screens | build, typecheck, full browser suite unchanged |
| P1 Overlays first | `ModalSheet` reimplemented on Radix `Dialog`/`Sheet` + guard; `AlertDialog` for confirmations | CF-G1–G7, B14, B15, B17 dialog specs |
| P2 Primitives | `Button`, `Input`, `Label`, `Textarea`, `Badge`, `Alert`, `Tabs`, `ToggleGroup`, `RadioGroup` replace the hand classes screen by screen | targeted specs per screen |
| P3 Screens | Recipes gallery and detail, Selected, Groceries checklist and dialogs, import review, Week/Cook, Household, More — restyled with the components | screenshots at 390 and 1480 px, text-scaling sweeps |
| P4 Cleanup | remove the old component CSS, turn preflight on, contrast test re-pointed to the new tokens | full `verify-all.sh` once, on the final commit |

Workers: P0–P1 by the integrator (they set the contracts); P2–P3 split by screen across up to 6 workers in separate
worktrees; one integrator merges. Estimated size: the largest UI change so far (comparable to the catalog-first UI).

## 5. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| S1 | Style | shadcn "new-york" style, dark only (Q3 stands) |
| S2 | Colour | shadcn neutral (zinc) greys with **one warm accent** for selection and + (today's amber), primary buttons in near-white |
| S3 | Type | Fraunces kept for page and recipe titles; Geist Sans (bundled package, no runtime font fetch) for everything else |
| S4 | The finished Recipes pass `dbdd330` (dark placeholders, compact header, one accent) | **Ship it now as an interim** (presentation only; verify once, you deploy as before) so the pilot isn't ugly while P0–P4 are built — or hold it and fold it into P3 |
| S5 | Background hiding | Accept Radix's `aria-hidden` + pointer blocking instead of `inert`, tests adapted as in §3 |

## 6. Not in scope

New features, data or schema changes, other retailers, provider activation, Extraction Lab, settings or deploy
changes. Deployment remains owner-operated; this release needs no migration and no Neon step.
