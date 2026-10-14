// Cookbook check — BEFORE (the deployed workflow, main 6d52c87). Disposable test database only; recipe pages are the
// offline synthetic fixtures under the owner-named recipes' addresses; the two example lines are the owner's.
// Every member interaction (tap, field fill, selection) is counted per scenario; screens are captured.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { member, q, seed, openAddRecipe } from "./helpers";

const OUT = process.env.COOKBOOK_OUT ?? "/tmp/cookbook-before";
const PW = "https://www.thepioneerwoman.com/food-cooking/recipes/a42389030/brisket-tacos-recipe/";
const KTML = "https://keytomylime.com/garlic-chicken-pasta-recipe/";
const BB = "https://www.budgetbytes.com/one-pot-chicken-and-rice/";
const GONE = "https://gone.example.com/lemon-and-tomatoes";
test.setTimeout(300_000);

type Log = { scenario: string; interactions: number; decisions: string[]; notes: string[] };
const results: Log[] = [];
function counter(scenario: string) {
  const log: Log = { scenario, interactions: 0, decisions: [], notes: [] };
  results.push(log);
  return {
    log,
    click: async (l: Locator) => { log.interactions++; await l.click(); },
    fill: async (l: Locator, v: string) => { log.interactions++; await l.fill(v); },
    select: async (l: Locator, v: string) => { log.interactions++; await l.selectOption(v); },
  };
}
const shot = (p: Page, name: string) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

async function importLink(p: Page, c: ReturnType<typeof counter>, url: string) {
  const add = p.getByTestId("add-recipe");
  if ((await add.getAttribute("aria-expanded")) !== "true") await c.click(add); // only when the sheet is closed
  await c.fill(p.getByRole("textbox", { name: "Add a recipe from a link" }), url);
  await c.click(p.getByTestId("add-from-link-submit"));
}

/** Resolve every "Needs a quick check" row the way a member would; returns what was asked. */
async function resolveChecks(p: Page, c: ReturnType<typeof counter>, review: Locator) {
  const rows = review.getByTestId("draft-check").getByTestId("draft-line");
  const n = await rows.count();
  for (let k = 0; k < n; k++) {
    const row = review.getByTestId("draft-check").getByTestId("draft-line").first();
    const raw = (await row.getAttribute("data-raw"))!;
    c.log.decisions.push(raw);
    const nq = row.getByRole("button", { name: /^Needs a quantity, line/ });
    if (/^Juice of 1\/2 lemon$/i.test(raw)) {
      await c.fill(row.getByRole("textbox", { name: /^Amount for the whole recipe/ }), "1/2");
      await c.select(row.getByRole("combobox", { name: /^Unit, line/ }), "each");
      await c.fill(row.getByRole("textbox", { name: /^Ingredient name, line/ }), "lemon");
      await c.click(row.getByRole("button", { name: /^Use line/ }));
    } else if (/^5 to 6 /.test(raw)) {
      await c.fill(row.getByRole("textbox", { name: /^Amount for the whole recipe/ }), "5"); // the member's explicit choice
      await c.click(row.getByRole("button", { name: /^Use line/ }));
    } else if (await nq.count()) {
      await c.click(nq);
    } else throw new Error(`unscripted check row: ${raw}`);
  }
}

async function saveReview(p: Page, c: ReturnType<typeof counter>, review: Locator) {
  await c.click(review.getByTestId("import-confirm"));
  await expect(review).toBeHidden();
}

test("cookbook before", async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  await seed();
  const { page: p } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, reducedMotion: "reduce", start: "/recipes" });

  // 1. Brisket Tacos — read from the link.
  {
    const c = counter("1 Brisket Tacos: import from link");
    await importLink(p, c, PW);
    const review = p.getByRole("dialog", { name: "Review the import" });
    await expect(review.getByTestId("import-review")).toBeVisible();
    c.log.notes.push(`servings prefilled: ${await review.getByTestId("draft-servings").inputValue()}`);
    await shot(p, "1-brisket-review");
    await resolveChecks(p, c, review);
    await saveReview(p, c, review);
  }
  // 2. Garlic Chicken Pasta — the page states 4 and 6: the member says which.
  {
    const c = counter("2 Garlic Chicken Pasta: import from link (yield 4 · 6)");
    await importLink(p, c, KTML);
    const review = p.getByRole("dialog", { name: "Review the import" });
    await expect(review.getByTestId("import-review")).toBeVisible();
    c.log.notes.push(`servings prefilled: "${await review.getByTestId("draft-servings").inputValue()}"`);
    await shot(p, "2-pasta-review");
    await c.fill(review.getByTestId("draft-servings"), "4");
    c.log.decisions.push("yield: 4 or 6");
    await resolveChecks(p, c, review);
    await saveReview(p, c, review);
  }
  // 3. One Pot Chicken and Rice — Budget Bytes is never read: paste (the existing synthetic lines).
  {
    const c = counter("3 One Pot Chicken and Rice: paste fallback");
    await importLink(p, c, BB);
    const dialog = p.getByRole("dialog", { name: "Import ingredients" });
    await c.fill(dialog.getByLabel("Ingredients, one per line"), "1 lb boneless skinless chicken thighs\n1 cup long grain white rice\n2 cups chicken broth\n1 yellow onion, diced\nsalt to taste");
    await c.click(dialog.getByTestId("import-paste-start"));
    const review = p.getByRole("dialog", { name: "Review the import" });
    await c.fill(review.getByTestId("draft-servings"), "4");
    c.log.decisions.push("yield (none given by a paste)");
    await resolveChecks(p, c, review);
    await saveReview(p, c, review);
  }
  // 4. The owner's two example lines — paste.
  {
    const c = counter("4 Owner example lines: paste");
    await importLink(p, c, GONE);
    const dialog = p.getByRole("dialog", { name: "Import ingredients" });
    await c.fill(dialog.getByLabel("Recipe name"), "Lemon and tomatoes (owner's example lines)");
    await c.fill(dialog.getByLabel("Ingredients, one per line"), "Juice of 1/2 lemon\n5 to 6 Campari tomatoes");
    await c.click(dialog.getByTestId("import-paste-start"));
    const review = p.getByRole("dialog", { name: "Review the import" });
    await expect(review.getByTestId("import-review")).toBeVisible();
    await shot(p, "4-lines-review");
    await c.fill(review.getByTestId("draft-servings"), "4");
    c.log.decisions.push("yield (none given by a paste)");
    // A typed row change, then the main Save without "Use" first — what happens today:
    const row = review.getByTestId("draft-check").getByTestId("draft-line").first();
    await c.fill(row.getByRole("textbox", { name: /^Amount for the whole recipe/ }), "1/2");
    const disabled = await review.getByTestId("import-confirm").isDisabled();
    if (!disabled) await c.click(review.getByTestId("import-confirm"));
    const held = await review.getByTestId("draft-problems").innerText().catch(() => "");
    c.log.notes.push(`Save recipe with a typed, unapplied row edit: ${disabled ? "button disabled" : "pressed"}; the screen says: "${held.replace(/\n/g, " | ")}"`);
    await shot(p, "4-lines-save-held");
    await c.select(row.getByRole("combobox", { name: /^Unit, line/ }), "each");
    await c.fill(row.getByRole("textbox", { name: /^Ingredient name, line/ }), "lemon");
    await c.click(row.getByRole("button", { name: /^Use line/ }));
    c.log.decisions.push("Juice of 1/2 lemon");
    const row2 = review.getByTestId("draft-check").getByTestId("draft-line").first();
    c.log.decisions.push((await row2.getAttribute("data-raw"))!);
    await c.fill(row2.getByRole("textbox", { name: /^Amount for the whole recipe/ }), "5");
    await c.click(row2.getByRole("button", { name: /^Use line/ }));
    await saveReview(p, c, review);
  }
  // 5a. Edit: the brisket recipe's beef broth becomes 2 cups for the whole recipe (it makes 8).
  const [brisket] = await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title='Brisket Tacos'");
  {
    const c = counter("5a Edit Brisket Tacos: beef broth → 2 cups for the recipe");
    await p.goto(`/recipes/${brisket.id}`);
    await c.click(p.getByTestId("recipe-more"));
    await c.click(p.getByRole("button", { name: "Edit recipe" }));
    const ed = p.getByRole("dialog", { name: /^Edit Brisket Tacos/ });
    const names = ed.getByRole("textbox", { name: /^Ingredient \d+ name$/ });
    let idx = -1;
    for (let k = 0; k < await names.count(); k++) if (/broth/i.test(await names.nth(k).inputValue())) idx = k + 1;
    const amount = ed.getByRole("textbox", { name: `Ingredient ${idx} amount` });
    c.log.notes.push(`editor shows the broth as "${await amount.inputValue()}" ${await ed.getByRole("textbox", { name: `Ingredient ${idx} unit` }).inputValue()} (the recipe page: 1 cup for 8)`);
    await shot(p, "5a-editor-before");
    await c.fill(amount, "0.25"); // 2 cups ÷ 8 servings — the member has to work out the per-serving amount
    c.log.decisions.push("per-serving arithmetic: 2 cups ÷ 8 = 0.25");
    await c.click(ed.getByRole("button", { name: "Save new version" }));
    await expect(ed).toHaveCount(0);
  }
  // 5b. Write the owner's two lines as a recipe by hand (makes 4).
  {
    const c = counter("5b Write a recipe by hand (owner's two lines, makes 4)");
    await p.goto("/recipes");
    if ((await p.getByTestId("add-recipe").getAttribute("aria-expanded")) !== "true") c.log.interactions++;
    await openAddRecipe(p);
    await c.click(p.getByTestId("new-recipe"));
    const d = p.getByRole("dialog", { name: "New recipe" });
    await c.fill(d.getByLabel("Title", { exact: true }), "Lemon and tomatoes (written)");
    c.log.notes.push(`new row's unit starts as "${await d.getByRole("textbox", { name: "Ingredient 1 unit" }).inputValue()}"`);
    await c.fill(d.getByRole("textbox", { name: "Ingredient 1 name" }), "lemon");
    await c.fill(d.getByRole("textbox", { name: "Ingredient 1 amount" }), "0.125"); // ½ lemon ÷ 4 servings
    await c.fill(d.getByRole("textbox", { name: "Ingredient 1 unit" }), "each");
    await c.click(d.getByRole("button", { name: "add ingredient" }));
    await c.fill(d.getByRole("textbox", { name: "Ingredient 2 name" }), "Campari tomatoes");
    await c.fill(d.getByRole("textbox", { name: "Ingredient 2 amount" }), "1.25"); // 5 ÷ 4
    await c.fill(d.getByRole("textbox", { name: "Ingredient 2 unit" }), "each");
    c.log.decisions.push("per-serving arithmetic: ½ ÷ 4 and 5 ÷ 4; no place to say it makes 4");
    await shot(p, "5b-new-recipe");
    await c.click(d.getByRole("button", { name: "Save recipe" }));
    await expect(d).toHaveCount(0);
  }
  // 6. Shop: Brisket Tacos for 4, Garlic Chicken Pasta for 4; read the combined groceries.
  {
    const c = counter("6 Select servings and read groceries");
    await p.goto(`/recipes/${brisket.id}`);
    const sel = p.getByTestId("add-to-selected");
    c.log.notes.push(`Brisket Tacos overview: ${await p.getByTestId("recipe-yield").innerText()}`);
    c.log.notes.push(`Brisket Tacos servings stepper starts at ${await sel.getByTestId("servings-value").innerText()}`);
    for (let v = Number(await sel.getByTestId("servings-value").innerText()); v !== 4; v = Number(await sel.getByTestId("servings-value").innerText()))
      await c.click(sel.getByRole("button", { name: v > 4 ? /^Fewer servings/ : /^More servings/ }));
    await c.click(sel.getByRole("button", { name: /^Add / }));
    const [pasta] = await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title='Garlic Chicken Pasta'");
    await p.goto(`/recipes/${pasta.id}`);
    await c.click(p.getByTestId("add-to-selected").getByRole("button", { name: /^Add / }));
    await c.click(p.getByTestId("nav-groceries"));
    await expect(p.getByTestId("groceries")).toHaveAttribute("data-scope", "list");
    const meals = await q<any>("SELECT v.title, s.servings FROM selected_meals s JOIN recipe_versions v ON v.id=s.recipe_version_id WHERE s.status='active'");
    c.log.notes.push(`selected: ${meals.map((m: any) => `${m.title} ×${m.servings}`).join(", ")}`);
    for (const key of ["beef_brisket", "beef_broth", "garlic_clove", "olive_oil"]) {
      const t = await p.getByTestId(`buy-${key}`).innerText().catch(() => "(no line)");
      c.log.notes.push(`${key}: ${t}`);
    }
    await shot(p, "6-groceries");
  }
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log("COOKBOOK", JSON.stringify(results));
});
