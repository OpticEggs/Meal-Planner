/**
 * Deterministic TEST-ONLY household (plan section 9.3). Every quantity, unit, price,
 * plate and recipe version used in assertions is spelled out here. Nothing here is a
 * real household setting; recipes are prefixed "Fixture:" and nutrition is synthetic.
 *
 * Fixed household clock: TABLE_FIXED_NOW=2026-10-12T19:00:00Z (Monday 15:00 America/New_York).
 */
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createHousehold, createMember } from "@/server/provision";
import { recomputeProjection } from "@/server/groceries/recompute";

export const FIXED_NOW = "2026-10-12T19:00:00Z";
export const TZ = "America/New_York";
export const WEEK = "2026-10-12";
export const NIGHT = { mon: "2026-10-12", tue: "2026-10-13", wed: "2026-10-14", thu: "2026-10-15", fri: "2026-10-16", sat: "2026-10-17", sun: "2026-10-18" } as const;

export const USERS = {
  jon: { email: "jon@fixture.table.test", password: "fixture-jon-password", name: "Jon" },
  alex: { email: "alex@fixture.table.test", password: "fixture-alex-password", name: "Alex" },
  other: { email: "mallory@other.table.test", password: "fixture-other-password", name: "Mallory" },
} as const;

type Ing = [key: string, name: string, tags: string[], allergenKnown?: boolean];
const INGREDIENTS: Ing[] = [
  ["chicken_thigh", "Chicken thighs", ["poultry"]],
  ["rice", "Jasmine rice", ["grain"]],
  ["broccoli", "Broccoli", ["vegetable"]],
  ["olive_oil", "Olive oil", ["oil"]],
  ["salmon", "Salmon fillet", ["fish"]],
  ["cucumber", "Cucumber", ["vegetable"]],
  ["black_beans", "Black beans (canned)", ["legume"]],
  ["tortillas", "Corn tortillas", ["grain"]],
  ["cheese", "Cheddar cheese", ["dairy"]],
  ["tofu", "Firm tofu", ["soy"]],
  ["soy_sauce", "Soy sauce", ["soy", "wheat"]],
  ["greek_yogurt", "Plain Greek yogurt", ["dairy"]],
  ["pita", "Pita bread", ["wheat"]],
  ["pasta", "Penne pasta", ["wheat"]],
  ["tomato_sauce", "Tomato sauce", []],
  ["ground_turkey", "Ground turkey", ["poultry"]],
  ["kidney_beans", "Kidney beans (canned)", ["legume"]],
  ["pesto", "Basil pesto (store-bought)", [], false], // allergen information unknown
];

type RecipeDef = {
  key: string;
  title: string;
  cuisine: string;
  minutes: number;
  level: "easy" | "medium" | "involved";
  leftovers: boolean;
  components: [key: string, name: string, ingredients: [ingredient: string, qty: string, unit: string][]][];
};

export const RECIPES: RecipeDef[] = [
  { key: "stirfry", title: "Fixture: Tofu veggie stir-fry", cuisine: "Chinese-American", minutes: 25, level: "easy", leftovers: false,
    components: [["main", "Tofu", [["tofu", "120", "g"], ["soy_sauce", "1", "tbsp"]]], ["base", "Rice", [["rice", "75", "g"]]], ["veg", "Broccoli", [["broccoli", "100", "g"]]]] },
  { key: "chicken_rice", title: "Fixture: Sheet-pan chicken and rice", cuisine: "American", minutes: 40, level: "medium", leftovers: true,
    components: [["protein", "Chicken", [["chicken_thigh", "6", "oz"]]], ["base", "Rice", [["rice", "75", "g"]]], ["veg", "Roasted broccoli", [["broccoli", "100", "g"], ["olive_oil", "1", "tbsp"]]]] },
  { key: "salmon", title: "Fixture: Salmon rice bowls", cuisine: "Japanese-inspired", minutes: 25, level: "easy", leftovers: false,
    components: [["protein", "Salmon", [["salmon", "6", "oz"]]], ["base", "Rice", [["rice", "75", "g"]]], ["veg", "Cucumber", [["cucumber", "0.5", "each"]]]] },
  { key: "tacos", title: "Fixture: Black bean tacos", cuisine: "Mexican", minutes: 20, level: "easy", leftovers: false,
    components: [["filling", "Beans and cheese", [["black_beans", "0.5", "can"], ["cheese", "1", "oz"]]], ["shell", "Tortillas", [["tortillas", "3", "each"]]]] },
  { key: "shawarma", title: "Fixture: Chicken shawarma bowls", cuisine: "Middle Eastern", minutes: 45, level: "medium", leftovers: true,
    components: [["protein", "Chicken", [["chicken_thigh", "5", "oz"]]], ["sauce", "Yogurt sauce", [["greek_yogurt", "4", "oz"]]], ["side", "Pita and cucumber", [["pita", "1", "each"], ["cucumber", "0.5", "each"]]]] },
  { key: "penne", title: "Fixture: Chicken penne", cuisine: "Italian-American", minutes: 30, level: "easy", leftovers: true,
    components: [["protein", "Chicken", [["chicken_thigh", "5", "oz"]]], ["base", "Penne in sauce", [["pasta", "3", "oz"], ["tomato_sauce", "0.5", "cup"]]]] },
  { key: "chili", title: "Fixture: Turkey chili", cuisine: "American", minutes: 50, level: "medium", leftovers: true,
    components: [["main", "Chili", [["ground_turkey", "4", "oz"], ["kidney_beans", "0.5", "can"], ["tomato_sauce", "0.5", "cup"]]]] },
  { key: "pesto", title: "Fixture: Pesto pasta", cuisine: "Italian", minutes: 15, level: "easy", leftovers: false,
    components: [["main", "Pesto pasta", [["pasta", "3", "oz"], ["pesto", "2", "tbsp"]]]] },
];

// [ingredient, product name, package qty, package unit, price cents | null, variable weight]
export const PRODUCTS: [string, string, string, string, number | null, boolean][] = [
  ["chicken_thigh", "Chicken thighs tray (about 1.5 lb)", "24", "oz", 749, true],
  ["rice", "Jasmine rice 2 lb bag", "2", "lb", 399, false],
  ["broccoli", "Broccoli crowns 1 lb", "1", "lb", 249, false],
  ["olive_oil", "Olive oil 500 ml", "500", "ml", 899, false],
  ["salmon", "Salmon fillets 12 oz", "12", "oz", 1099, false],
  ["cucumber", "Cucumber", "1", "each", 79, false],
  ["black_beans", "Black beans 15 oz can", "1", "can", 109, false],
  ["tortillas", "Corn tortillas 10 ct", "10", "each", 299, false],
  ["cheese", "Cheddar 8 oz block", "8", "oz", 349, false],
  ["tofu", "Firm tofu 14 oz", "14", "oz", 229, false],
  ["soy_sauce", "Soy sauce 10 fl oz", "10", "fl_oz", 279, false],
  ["greek_yogurt", "Plain Greek yogurt 32 oz tub", "32", "oz", 549, false],
  ["pita", "Pita 6 ct", "6", "each", 249, false],
  ["pasta", "Penne 16 oz", "16", "oz", 179, false],
  ["tomato_sauce", "Tomato sauce 24 fl oz jar", "24", "fl_oz", 329, false],
  ["ground_turkey", "Ground turkey 1 lb", "1", "lb", 599, false],
  ["kidney_beans", "Kidney beans 15 oz can", "1", "can", 109, false],
  ["pesto", "Basil pesto 6 oz jar", "6", "oz", 449, false], // mass package vs volume recipe: not convertible
];

// Synthetic nutrition per basis. Deliberately incomplete (cheese, pesto, others absent).
const NUTRITION: [string, string, string, number, number, number, number][] = [
  ["chicken_thigh", "100", "g", 177, 24.2, 0, 8.2],
  ["rice", "100", "g", 365, 7.1, 80, 0.7],
  ["broccoli", "100", "g", 34, 2.8, 6.6, 0.4],
  ["olive_oil", "15", "ml", 120, 0, 0, 13.5],
  ["salmon", "100", "g", 208, 20, 0, 13],
  ["cucumber", "1", "each", 45, 2, 11, 0.3],
  ["tofu", "100", "g", 144, 17, 3, 9],
];

export interface Fixture {
  householdId: string;
  otherHouseholdId: string;
  members: { jon: string; alex: string; other: string };
  recipes: Record<string, { recipeId: string; versionId: string }>;
  weekId: string;
  assignments: Record<keyof typeof NIGHT, string>;
  events: Record<string, string>;
  products: Record<string, string>;
}

export function assertTestDatabase(url: string) {
  if (!/\/table_test(\?|$)/.test(url)) throw new Error(`refusing to reset a non-test database: ${url}`);
}

/** Wipes the disposable test database (TRUNCATE does not run row triggers). */
export async function resetTestDatabase(c: pg.Client | pg.PoolClient) {
  const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'");
  await c.query(`TRUNCATE ${r.rows.map((x) => `"${x.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function seedFixture(url: string, opts: { unpricedCheese?: boolean } = {}): Promise<Fixture> {
  assertTestDatabase(url);
  if (process.env.TABLE_ENV !== "test") throw new Error("fixtures are seeded only with TABLE_ENV=test");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    await resetTestDatabase(c);
    const householdId = await createHousehold(c, "Fixture household (test only)", TZ, true);
    const otherHouseholdId = await createHousehold(c, "Other fixture household (test only)", TZ, true);
    const jon = await createMember(c, householdId, USERS.jon.email, USERS.jon.name, USERS.jon.password);
    const alex = await createMember(c, householdId, USERS.alex.email, USERS.alex.name, USERS.alex.password);
    const other = await createMember(c, otherHouseholdId, USERS.other.email, USERS.other.name, USERS.other.password);
    const members = { jon: jon.memberId, alex: alex.memberId, other: other.memberId };

    await c.query("BEGIN");
    for (const [key, name, tags, known] of INGREDIENTS) {
      await c.query("INSERT INTO ingredients(household_id, key, name, tags, allergen_info_known, fixture) VALUES ($1,$2,$3,$4,$5,true)", [householdId, key, name, tags, known ?? true]);
    }
    for (const [key, qty, unit, kcal, p, carb, fat] of NUTRITION) {
      await c.query(
        `INSERT INTO ingredient_nutrition(household_id, ingredient_key, basis_qty, basis_unit, calories, protein_g, carbs_g, fat_g, source, synthetic)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'FIXTURE — synthetic test values, not nutrition data',true)`,
        [householdId, key, qty, unit, kcal, p, carb, fat],
      );
    }
    const recipes: Fixture["recipes"] = {};
    for (const r of RECIPES) {
      const recipeId = randomUUID();
      const versionId = randomUUID();
      await c.query("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, householdId, members.jon]);
      await c.query(
        `INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, cuisine, summary, effort_minutes, effort_level, leftover_friendly,
           instructions, reheat_instructions, provenance, source_label, estimate, created_by)
         VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$11,'fixture','Test fixture — not a verified recipe',true,$12)`,
        [
          versionId, recipeId, householdId, r.title, r.cuisine, `Test fixture recipe (${r.key}).`, r.minutes, r.level, r.leftovers,
          `1. Prepare the components.\n2. Cook ${r.title.replace("Fixture: ", "")}.\n3. Plate each person's portions.`,
          r.leftovers ? "Reheat covered at 350°F for 15 minutes, or microwave 2–3 minutes, until hot throughout." : "",
          members.jon,
        ],
      );
      let sort = 0;
      for (const [ck, cn, ings] of r.components) {
        await c.query("INSERT INTO recipe_components(recipe_version_id, key, name, sort) VALUES ($1,$2,$3,$4)", [versionId, ck, cn, sort++]);
        for (const [ik, q, u] of ings) {
          await c.query("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,$2,$3,$4,$5,$6)", [
            versionId, ck, ik, q, u, sort++,
          ]);
        }
      }
      await c.query("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
      recipes[r.key] = { recipeId, versionId };
    }
    const products: Record<string, string> = {};
    for (const [ik, name, qty, unit, price, vw] of PRODUCTS) {
      const pid = randomUUID();
      await c.query(
        `INSERT INTO products(id, household_id, retailer, product_ref, name, ingredient_key, package_qty, package_unit, variable_weight, fixture)
         VALUES ($1,$2,'simulated',$3,$4,$5,$6,$7,$8,true)`,
        [pid, householdId, `SIM-${ik.toUpperCase()}`, name, ik, qty, unit, vw],
      );
      if (price !== null && !(opts.unpricedCheese && ik === "cheese")) {
        await c.query("INSERT INTO price_observations(household_id, product_id, store_label, amount_minor, source, observed_at) VALUES ($1,$2,'Simulated store',$3,'fixture',$4)", [
          householdId, pid, price, "2026-10-11T12:00:00Z",
        ]);
      }
      await c.query("INSERT INTO product_mappings(household_id, ingredient_key, product_id, decided_by) VALUES ($1,$2,$3,$4)", [householdId, ik, pid, members.jon]);
      products[ik] = pid;
    }

    // Accepted week, revision 1.
    const weekId = randomUUID();
    await c.query("INSERT INTO weeks(id, household_id, week_start, accepted_choice_revision, adopted_by, adopted_at) VALUES ($1,$2,$3,1,$4,$5)", [
      weekId, householdId, WEEK, members.jon, "2026-10-11T20:00:00Z",
    ]);
    const plate = (key: string, over: Record<string, string> = {}) => {
      const r = RECIPES.find((x) => x.key === key)!;
      return { ...Object.fromEntries(r.components.map(([k]) => [k, "1"])), ...over };
    };
    const events: Record<string, string> = {};
    const addEvent = async (key: string, night: string, allocs: [member: string, kind: "dinner" | "lunch", night: string, portions: Record<string, string>][]) => {
      const id = randomUUID();
      await c.query("INSERT INTO cooking_events(id, week_id, household_id, recipe_version_id, status, cook_night) VALUES ($1,$2,$3,$4,'scheduled',$5)", [
        id, weekId, householdId, recipes[key].versionId, night,
      ]);
      for (const [m, kind, n, portions] of allocs) {
        await c.query("INSERT INTO allocations(cooking_event_id, household_id, member_id, kind, night, component_portions) VALUES ($1,$2,$3,$4,$5,$6)", [
          id, householdId, m, kind, n, portions,
        ]);
      }
      events[key] = id;
      return id;
    };
    const both = (key: string, night: string): [string, "dinner", string, Record<string, string>][] => [
      [members.jon, "dinner", night, plate(key)],
      [members.alex, "dinner", night, plate(key)],
    ];
    await addEvent("stirfry", NIGHT.mon, both("stirfry", NIGHT.mon));
    // Wednesday cooks once for Wednesday, Thursday leftovers and Alex's reserved Thursday lunch.
    // Unequal plates: Jon takes 1.5 chicken portions on Wednesday; rice and broccoli stay at 1.
    await addEvent("chicken_rice", NIGHT.wed, [
      [members.jon, "dinner", NIGHT.wed, plate("chicken_rice", { protein: "1.5" })],
      [members.alex, "dinner", NIGHT.wed, plate("chicken_rice")],
      [members.jon, "dinner", NIGHT.thu, plate("chicken_rice")],
      [members.alex, "dinner", NIGHT.thu, plate("chicken_rice")],
      [members.alex, "lunch", NIGHT.thu, plate("chicken_rice")],
    ]);
    await addEvent("salmon", NIGHT.fri, both("salmon", NIGHT.fri));
    await addEvent("tacos", NIGHT.sat, both("tacos", NIGHT.sat));
    await addEvent("shawarma", NIGHT.sun, both("shawarma", NIGHT.sun));
    const assignments = {} as Fixture["assignments"];
    const nightRows: [keyof typeof NIGHT, string, string | null][] = [
      ["mon", "cook", events.stirfry], ["tue", "out", null], ["wed", "cook", events.chicken_rice], ["thu", "leftover", events.chicken_rice],
      ["fri", "cook", events.salmon], ["sat", "cook", events.tacos], ["sun", "cook", events.shawarma],
    ];
    for (const [k, kind, ev] of nightRows) {
      const id = randomUUID();
      await c.query("INSERT INTO assignments(id, week_id, household_id, night, kind, cooking_event_id, reason, updated_by) VALUES ($1,$2,$3,$4,$5,$6,'Fixture',$7)", [
        id, weekId, householdId, NIGHT[k], kind, ev, members.jon,
      ]);
      assignments[k] = id;
    }
    // Independent salmon replenishment request (Alex), separate from Friday's salmon.
    const cyc = await c.query("INSERT INTO grocery_cycles(household_id, week_id) VALUES ($1,$2) RETURNING id", [householdId, weekId]);
    const req = await c.query(
      "INSERT INTO household_requests(household_id, cycle_id, ingredient_key, text, kind, captured_from) VALUES ($1,$2,'salmon','Salmon','usual','groceries') RETURNING id",
      [householdId, cyc.rows[0].id],
    );
    await c.query("INSERT INTO request_contributors(request_id, member_id) VALUES ($1,$2)", [req.rows[0].id, members.alex]);
    await recomputeProjection(c as unknown as pg.PoolClient, householdId, weekId);
    await c.query("COMMIT");
    return { householdId, otherHouseholdId, members, recipes, weekId, assignments, events, products };
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}
