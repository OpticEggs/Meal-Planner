# Evidence — shadcn/ui adoption, verified at 7f6cb4a

Owner-approved plan `docs/table/SHADCN-PLAN.md` (S1–S5 as recommended), built on branch `claude/shadcn` from `9eb3dd1`
in phases P0–P4 (SHADCN-PLAN §7). `7f6cb4a` is the final code commit; later commits on the branch are docs only.

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `7f6cb4a` (clean tree, tracked-file hash unchanged during the
  run): **PASS** — typecheck; vitest 1220/1220 (three more than before: the component-token contrast checks);
  Playwright 170/170 (Chromium); mutation self-test PASS; 132 mutations killed, 0 survived, 0 error (one more than
  before: `UI_component_text_too_faint`; `UI_faint/muted_text_too_faint` re-anchored to the neutral palette).
  `screens/` holds the screenshots `verify-all.sh` copies from the browser run.
- `screens-phases/`: phone screenshots (390 px) along the way — `before-9eb3dd1-viewport-top.png` (the interim pass),
  `p2-buttons-fields-390.png` (shadcn buttons and fields on the old warm palette), `p4-preflight-390-a.png` (neutral
  palette, preflight on), `p4-final-390-full.png` (final: recipe detail, Week, Cook).
- Browser runs during development (not kept; their counts are in the commit messages): P1 158/170 then the four
  affected files 39/39; P2 150/170 then 61 and 37 in the affected files; P3 170/170; P4 170/170.
- No website, Kroger, Instacart, FoodData Central, Render or Neon request was made; no household data was read or
  written; nothing was deployed and `main` was not moved. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).
