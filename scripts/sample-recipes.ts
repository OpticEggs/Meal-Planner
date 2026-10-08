// Usage: npm run sample:recipes -- <householdId>
// Loads a small structured SAMPLE collection so a new household can try proposals before
// entering its own recipes. Every recipe is labeled provenance=sample with estimated amounts.
// No products, prices, nutrition, targets, budgets, stores or exclusions are created.
import pg from "pg";
import { randomUUID } from "node:crypto";
import { RECIPES } from "../tests/fixtures/household";

const INGREDIENT_NAMES: Record<string, [string, string[]]> = {
  chicken_thigh: ["Chicken thighs", ["poultry"]], rice: ["Jasmine rice", ["grain"]], broccoli: ["Broccoli", ["vegetable"]],
  olive_oil: ["Olive oil", ["oil"]], salmon: ["Salmon fillet", ["fish"]], cucumber: ["Cucumber", ["vegetable"]],
  black_beans: ["Black beans (canned)", ["legume"]], tortillas: ["Corn tortillas", ["grain"]], cheese: ["Cheddar cheese", ["dairy"]],
  tofu: ["Firm tofu", ["soy"]], soy_sauce: ["Soy sauce", ["soy", "wheat"]], greek_yogurt: ["Plain Greek yogurt", ["dairy"]],
  pita: ["Pita bread", ["wheat"]], pasta: ["Penne pasta", ["wheat"]], tomato_sauce: ["Tomato sauce", []],
  ground_turkey: ["Ground turkey", ["poultry"]], kidney_beans: ["Kidney beans (canned)", ["legume"]], pesto: ["Basil pesto (store-bought)", []],
};

const householdId = process.argv[2];
if (!householdId) {
  console.error("usage: npm run sample:recipes -- <householdId>");
  process.exit(2);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query("BEGIN");
for (const [key, [name, tags]] of Object.entries(INGREDIENT_NAMES)) {
  // Tags are a starting point; allergen information stays UNREVIEWED until a member reviews it.
  await c.query("INSERT INTO ingredients(household_id, key, name, tags, allergen_info_known) VALUES ($1,$2,$3,$4,false) ON CONFLICT DO NOTHING", [householdId, key, name, tags]);
}
for (const r of RECIPES) {
  const recipeId = randomUUID();
  const versionId = randomUUID();
  await c.query("INSERT INTO recipes(id, household_id) VALUES ($1,$2)", [recipeId, householdId]);
  await c.query(
    `INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, cuisine, effort_minutes, effort_level, leftover_friendly, instructions, reheat_instructions, provenance, source_label, estimate)
     VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,'sample','Sample recipe for trying Table — amounts and times are estimates, not verified',true)`,
    [versionId, recipeId, householdId, r.title.replace("Fixture: ", ""), r.cuisine, r.minutes, r.level, r.leftovers,
      "Sample steps: prepare each component, cook, and plate each person's portions. Replace with your own steps.",
      r.leftovers ? "Reheat until hot throughout." : ""],
  );
  let sort = 0;
  for (const [ck, cn, ings] of r.components) {
    await c.query("INSERT INTO recipe_components(recipe_version_id, key, name, sort) VALUES ($1,$2,$3,$4)", [versionId, ck, cn, sort++]);
    for (const [ik, q, u] of ings) {
      await c.query("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,$2,$3,$4,$5,$6)", [versionId, ck, ik, q, u, sort++]);
    }
  }
  await c.query("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
}
await c.query("COMMIT");
await c.end();
console.log(`loaded ${RECIPES.length} sample recipes (provenance=sample); ingredient allergen info marked unreviewed`);
process.exit(0);
