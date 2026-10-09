# @table/recipe-extraction

A pure, offline, in-repository package that turns recipe-page text and ingredient lines into
`recipe-extraction/v1` data (see `CONTRACT-v1.md`). It is **not** a server, service, repository or
deployment, and it is **not wired into the Table app**: Table still imports through
`src/server/integrations/recipe-import/*` (`EXTRACTOR_VERSION = table-import-2`).

No network, database, secrets, environment variables or Table server state. Tools (TypeScript, Vitest,
tsx) come from the repository root's `node_modules` (`npm ci` at the root); the package has no
dependencies of its own — do not run `npm install` inside this folder.

```bash
cd packages/recipe-extraction
npm run typecheck
npm test
```

Status (2026-10-09): Phase 1 of the Recipe Extraction Lab — contract, exact arithmetic, frozen legacy
engines with parity tests, fixture-only CLI and benchmark. The ingredient semantics are **not improved
yet** (Phase 2).
