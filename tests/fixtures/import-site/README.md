# Synthetic recipe pages (import tests)

Written for Table's tests. **Not copied from any website**; names, amounts and wording are invented.
Served only by the in-process fixture transport (`fixtureDeps` in `src/server/recipe-import-service.ts`,
or `TABLE_RECIPE_FETCH_FIXTURES=<this manifest>` in the test environment). Nothing here is fetched from
the network. Host addresses in `manifest.json` are what the fake resolver answers; no connection is made.
