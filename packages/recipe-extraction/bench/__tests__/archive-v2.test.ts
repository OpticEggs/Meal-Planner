/**
 * The archived outcomes v2 scorer (bench/archive/): its files are the byte-identical v2 sources, and it
 * reproduces the historical holdout-v2 report's `outcomes` section deep-equal on the three historical
 * engines over dev, holdout-v1 and holdout-v2 (evidence 2026-10-09 …/evaluation-56eafe4).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { engineOutcomes as engineOutcomesV2, memoizeEngine as memoizeEngineV2, outcomesSection as outcomesSectionV2, OUTCOME_PLAN as OUTCOME_PLAN_V2, type IngredientCaseV2 } from "../archive/outcomes-v2";
import { selectIngredientEngines } from "../engines";
import { freezeV2Status } from "../freeze";
import { loadIngredientCases } from "../labels";
import { FIXTURES, HISTORICAL_ENGINES, HISTORICAL_REPORT, HISTORICAL_REPORT_SHA256 } from "./helpers";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
/** `git hash-object`: SHA-1 of "blob <bytes>\0<content>". */
const gitBlob = (b: Buffer) => createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest("hex");

const ARCHIVE = path.resolve(HERE, "../archive/v2/bench");
const IDENTITIES: Record<string, { blob: string; sha256: string }> = {
  "outcomes.ts": { blob: "69dffb0b08d3252d21f6475d6b768201a3629437", sha256: "cdd48eb8623b54b517d8686f412d91ea78d52f07f637f161b64f688efa9607bc" },
  "compare.ts": { blob: "347155ca4d6da21f7542ea0359613d26a8280734", sha256: "0250be6a35a7a8356cfa5a10c193a083eadf6143571445c50bd9d79ca63e1ffd" },
  "stats.ts": { blob: "202ae6a078ed1933e6aa6302ee51a8493a06b37a", sha256: "352d61fd4bdc33dc162a18504dbbc9f2481a5584caf8c1149ba3d0b6db3d5281" },
  "types.ts": { blob: "203c5195eebd0f148f064b5e81640536736aaa7b", sha256: "e7c7a495ae373e8d4b1f1704586c01d9409a3594d46c9c64d60b651456b19b2b" },
};

describe("archived outcomes v2 scorer", () => {
  it("its files are the byte-identical v2 sources (git blob and SHA-256 as recorded in bench/archive/README.md)", () => {
    const readme = readFileSync(path.resolve(HERE, "../archive/README.md"), "utf8");
    for (const [file, id] of Object.entries(IDENTITIES)) {
      const bytes = readFileSync(path.join(ARCHIVE, file));
      expect({ file, blob: gitBlob(bytes), sha256: sha256(bytes) }).toEqual({ file, ...id });
      expect(readme, file).toContain(`| \`v2/bench/${file}\` | \`bench/${file}\` | \`${id.blob}\` | \`${id.sha256}\` |`);
    }
    expect(OUTCOME_PLAN_V2).toBe("EVALUATION-PLAN-v2");
  });

  it("the historical report file is the evaluated one (SHA-256 afc55fd5…)", () => {
    expect(sha256(readFileSync(HISTORICAL_REPORT))).toBe(HISTORICAL_REPORT_SHA256);
  });

  it("reproduces the historical outcomes section deep-equal: three historical engines, dev + holdout-v1 + holdout-v2", () => {
    const historical = JSON.parse(readFileSync(HISTORICAL_REPORT, "utf8"));
    expect(historical.outcomes.engines.map((e: { engine: { id: string } }) => e.engine.id)).toEqual([...HISTORICAL_ENGINES]);
    const cases = loadIngredientCases(FIXTURES, ["dev", "holdout", "holdout2"]) as unknown as IngredientCaseV2[];
    expect(cases.length).toBe(669);
    const engines = selectIngredientEngines([...HISTORICAL_ENGINES]).map(memoizeEngineV2);
    const section = outcomesSectionV2(engines.map((e) => engineOutcomesV2(cases, e)), freezeV2Status(FIXTURES));
    // Through JSON, as the report stores it (canonical key order does not matter for deep equality).
    expect(JSON.parse(JSON.stringify(section))).toEqual(historical.outcomes);
  });
});
