/**
 * The outcomes v2 scorer (EVALUATION-PLAN-v2), archived. The code is the byte-identical copy in
 * `./v2/bench/outcomes.ts` (with its byte-identical dependencies `compare.ts`, `stats.ts`, `types.ts`);
 * this entry point only re-exports it. Identities: `./README.md`. It scored the historical holdout-v2
 * run (evidence `2026-10-09-recipe-extraction-phase2/evaluation-56eafe4/`) and is kept to reproduce that
 * report; new runs use `bench/outcomes.ts` (outcomes v3). Never edit the files under `./v2/bench/`.
 */
export * from "./v2/bench/outcomes";
export type { IngredientCase as IngredientCaseV2, Split as SplitV2 } from "./v2/bench/types";
