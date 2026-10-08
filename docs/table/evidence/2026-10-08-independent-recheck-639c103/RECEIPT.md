# Receipt — independent recheck of 639c103 (RB17-01..03, B18)

Recorded 2026-10-08 by the implementation owner. The supplied artifacts are archived **unmodified**
in this folder; this receipt only describes them. Nothing here was re-run by the implementation owner
on the recheck's behalf.

## Artifacts (byte-identical to what was supplied)

| File | SHA-256 | Notes |
|---|---|---|
| `Recheck_.txt` | `4570d8cbde6fd858ed1c6e720e9b965ea064b3772f1ab6939743c53e6812ac4c` | The recheck report as uploaded (a text rendering of the report; uploaded under this name). |
| `Table-RB17-B18-Recheck-Package-639c103.zip` | `6d47a8b69f10e938035dbfa58c38b3c7fff447a56b81b482ae3025b370831e56` | The recheck package. Its internal `SHA256SUMS` was checked in memory: 13 of 13 entries match, none missing. It contains `Table-RB17-B18-Recheck-639c103.md` (SHA-256 `77ebd37e1b05b07d095ed2877956788eebb48316782ae5105c2466b908e86f0d`), `recheck.cjs`, and `evidence/*`. The archive was not extracted into the repository and its script was not executed by the implementation owner. |

**Unavailable attachment.** The directive refers to `Table-Integration-Preparation-Package-639c103.zip`.
It was not supplied in this session (only `Table-Integration-Preparation-Prompt.txt`, SHA-256
`e152be48d380eb218da27d8c2f4bccc82188eba2ddf4c4d5b6f85850e441c847`, was). It is recorded as unavailable;
its contents were not reconstructed from summaries, and the preparation work proceeded from the prompt.

## What the recheck actually did (its own stated scope)

- **Identity and integrity:** the bundle checksum, both restore forms, `git bundle verify` / `git fsck`,
  GitHub `main` = `639c103` at the time of its read, the tracked-file hash of `abdd5a2` recomputed
  (`2b5f21da…3a6a`, equal to the recorded run), and that `abdd5a2..639c103` changes only `docs/**` and
  `CLAUDE.md`.
- **Evidence inspection:** the structured records (`vitest.json` 141/141, `playwright.json` 104 expected
  and 0 unexpected/flaky/skipped, `mutation/results.json` 39 KILLED and 0 SURVIVED/ERROR, `summary.md`).
  These were inspected, not re-executed.
- **Source-level execution with controlled substitutes:** the delivered TypeScript run through the
  TypeScript transpiler; the 19 pure recipe-rebase unit cases replayed with a Node-assert adapter (19
  passed; explicitly *not* a Vitest run); 3 independently written reconciliation probes (3 passed);
  `saveRecipeVersionCommand` exercised against a **recording SQL double** (9 expected outcomes; refusals
  recorded no SQL writes).
- **Not performed by the recheck:** no PostgreSQL, React/DOM, browser, production-build, mutation or
  full-suite rerun; no device, Safari/WebKit or VoiceOver check.

## Closure decisions recorded (no broader than stated)

- **RB17-01, RB17-02, RB17-03: closed** — "resolved within this recheck's scope"; the original failure
  mechanisms no longer reproduce in its targeted source-level checks, and the recorded browser/integration
  evidence is consistent with that.
- **B18: closed for Chromium only** — recorded Chromium automation with injected root-font scaling. Not
  validated on iPhone, Safari/WebKit, native text-size settings or VoiceOver; those remain B8.
- No new blocking finding was established. The recheck is **not** an independent certification of every
  application behavior and **not** permission to deploy, connect a real retailer or spend money.
