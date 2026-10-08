/**
 * The household journey through the UI, two members, simulated retailer.
 */
import { expect, test } from "@playwright/test";
import { NIGHT } from "../fixtures/household";
import { member, nightTitle, previewReplace, protectedRows, q, retailerCalls, seed } from "./helpers";

const NEXT_WEEK = "2026-10-19";

test("T02: Jon proposes, Alex adopts the displayed week; one accepted plan, no order/cooking/eating records", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  for (const p of [jon.page, alex.page]) await p.getByRole("button", { name: "Next week" }).click();
  await expect(jon.page.getByTestId("week-title")).toHaveText("Week of Oct 19");
  await jon.page.getByRole("button", { name: "Propose a week" }).click();
  await expect(jon.page.getByTestId("proposal")).toBeVisible();
  await expect(alex.page.getByTestId("proposal")).toBeVisible(); // shared proposal, delivered live
  const firstNight = await alex.page.getByTestId(`proposal-night-${NEXT_WEEK}`).innerText();
  await alex.page.getByTestId("adopt").click();
  for (const p of [jon.page, alex.page]) {
    await expect(p.getByTestId("accepted-revision")).toHaveText("1");
    await expect(p.getByTestId("status-sentence")).toBeVisible();
  }
  const w = (await q("SELECT accepted_choice_revision, adopted_by FROM weeks WHERE household_id=$1 AND week_start=$2", [fx.householdId, NEXT_WEEK]))[0];
  expect(w).toEqual({ accepted_choice_revision: 1, adopted_by: fx.members.alex });
  for (const t of ["orders", "cook_records", "receipt_observations", "handoff_batches"]) expect((await q(`SELECT count(*)::int n FROM ${t}`))[0].n).toBe(0);
  const title = await jon.page.getByTestId(`night-title-${NEXT_WEEK}`).innerText();
  expect(firstNight).toContain(title.replace("Leftovers: ", ""));
  await jon.context.close();
  await alex.context.close();
});

test("T03: Sounds good, preferences, favorites and notes persist without changing the accepted week", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex");
  const jon = await member(browser, "jon");
  const before = await protectedRows(fx.weekId);
  await alex.page.getByRole("link", { name: "Explore" }).click();
  const chili = alex.page.locator('[data-testid="recipe-card"][data-title="Fixture: Turkey chili"]');
  await chili.getByRole("button", { name: "Sounds good" }).click();
  await expect(chili.getByRole("button", { name: "In Sounds good" })).toBeVisible();
  await chili.getByRole("link").click();
  await expect(alex.page.getByTestId("recipe-title")).toHaveText("Fixture: Turkey chili"); // opens the selected recipe
  await alex.page.getByRole("button", { name: "Not for me" }).click();
  await alex.page.getByRole("button", { name: "☆ Favorite" }).click();
  await alex.page.getByLabel("New note").fill("Too spicy last time");
  await alex.page.getByRole("button", { name: "Save note" }).click();
  await expect(alex.page.getByTestId("notes")).toContainText("Too spicy last time");
  await alex.page.reload();
  await expect(alex.page.getByRole("button", { name: "Not for me" })).toHaveAttribute("aria-pressed", "true");
  await expect(alex.page.getByRole("button", { name: "★ Favorite" })).toBeVisible();
  // Jon sees the shared interest and Alex's preference, but his own feedback stays unknown.
  await jon.page.goto(`/recipes/${fx.recipes.chili.recipeId}`);
  await expect(jon.page.getByText("Alex: Not for me")).toBeVisible();
  await expect(jon.page.getByText("Jon: unknown")).toBeVisible();
  expect(await protectedRows(fx.weekId)).toEqual(before);
  await alex.context.close();
  await jon.context.close();
});

test("T04: a Wednesday preview shows Thursday's leftover consequence; a locked Thursday blocks it; cancel changes nothing", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const before = await protectedRows(fx.weekId);
  await previewReplace(jon.page, NIGHT.wed, "Fixture: Tofu veggie stir-fry");
  await expect(jon.page.getByTestId("preview")).toContainText("Thursday becomes an open night");
  await jon.page.getByTestId("cancel-preview").click();
  expect(await protectedRows(fx.weekId)).toEqual(before);
  await jon.page.getByTestId(`night-${NIGHT.thu}`).getByRole("button", { name: "Lock" }).click();
  await expect(jon.page.getByTestId(`night-${NIGHT.thu}`)).toContainText("Locked");
  await jon.page.getByTestId("option-Fixture: Chicken penne").click(); // Wednesday's sheet is still open
  await expect(jon.page.getByTestId("preview")).toBeVisible();
  await expect(jon.page.getByTestId("preview")).toContainText("is locked and depends on Wednesday");
  await expect(jon.page.getByTestId("apply")).toBeDisabled();
  await jon.page.getByTestId("cancel-preview").click();
  expect((await nightTitle(fx.weekId, NIGHT.wed)).title).toBe("Fixture: Sheet-pan chicken and rice");
  await jon.context.close();
});

test("T05: dinners covered while a price is unknown — meals chosen, groceries and budget not asserted", async ({ browser }) => {
  await seed({ unpricedCheese: true });
  const jon = await member(browser, "jon");
  await expect(jon.page.getByTestId("status-sentence")).toContainText("Every dinner is covered.");
  await expect(jon.page.getByTestId("status-sentence")).toContainText("Grocery review remains.");
  await expect(jon.page.getByTestId("pickup-estimate")).toContainText("1 unpriced");
  await jon.page.getByRole("link", { name: "Groceries" }).click();
  await expect(jon.page.getByTestId("readiness")).toContainText("Not ready yet");
  await expect(jon.page.getByTestId("line-cheese")).toContainText("price unknown");
  await expect(jon.page.getByTestId("send")).toBeDisabled();
  await jon.context.close();
});

test("T06: after adoption Home shows the next dinner and real work; Cook and Reheat open the right instructions; Also need is reachable", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  await expect(jon.page.getByTestId("next-dinner")).toContainText("Next dinner · Monday");
  await expect(jon.page.getByTestId("next-dinner")).toContainText("Fixture: Tofu veggie stir-fry");
  await expect(jon.page.getByTestId("status-sentence")).toContainText("Grocery review remains.");
  await expect(jon.page.getByTestId("alsoneed-week")).toBeVisible();
  await jon.page.getByTestId("cook-link").click();
  await expect(jon.page.getByTestId("cook-title")).toHaveText("Fixture: Tofu veggie stir-fry");
  await expect(jon.page.getByTestId("cook-amounts")).toContainText("240 g Firm tofu"); // 2 plates x 120 g
  expect((await q("SELECT count(*)::int n FROM cook_records"))[0].n).toBe(0); // opening records nothing
  // Wednesday's cooking shows the whole batch: Wed + Thu dinners and Alex's reserved lunch; Jon's 1.5x chicken.
  await jon.page.goto(`/cook/${NIGHT.wed}`);
  await expect(jon.page.getByTestId("cook-title")).toHaveText("Fixture: Sheet-pan chicken and rice");
  await expect(jon.page.getByTestId("cook-amounts")).toContainText("33 oz Chicken thighs");
  await expect(jon.page.getByTestId("cook-amounts")).toContainText("375 g Jasmine rice");
  // Thursday is a leftover night: reheat-and-serve, not a recipe to cook.
  await jon.page.goto(`/cook/${NIGHT.thu}`);
  await expect(jon.page.getByTestId("cook-view")).toContainText("Reheat and serve");
  await expect(jon.page.getByTestId("reheat-instructions")).toContainText("Reheat covered at 350°F");
  // Also need from Cook.
  await jon.page.goto(`/cook/${NIGHT.mon}`);
  await jon.page.getByRole("button", { name: "Also need Soy sauce" }).click();
  await expect(jon.page.getByText("Added.")).toBeVisible();
  await jon.page.getByRole("button", { name: "Mark cooked" }).click();
  await expect(jon.page.getByText("Recorded as cooked.")).toBeVisible();
  expect((await q("SELECT count(*)::int n FROM cook_records"))[0].n).toBe(1);
  expect((await q("SELECT captured_from FROM household_requests WHERE ingredient_key='soy_sauce'"))[0].captured_from).toBe("cook");
  void fx;
  await jon.context.close();
});

test("T07: less left than planned makes Thursday unresolved without replacing it", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex");
  const jon = await member(browser, "jon");
  await alex.page.getByTestId(`change-${NIGHT.wed}`).click();
  await alex.page.getByRole("tab", { name: "Less left" }).click();
  await alex.page.getByLabel("Portions left now").fill("1");
  await alex.page.getByRole("button", { name: "Record less left than planned" }).click();
  await expect(alex.page.getByText("Selected dinners are unchanged")).toBeVisible();
  await expect(jon.page.getByTestId(`night-${NIGHT.thu}`)).toContainText("Unresolved");
  await expect(jon.page.getByTestId(`night-title-${NIGHT.thu}`)).toHaveText("Leftovers: Fixture: Sheet-pan chicken and rice");
  expect((await nightTitle(fx.weekId, NIGHT.thu)).revision).toBe(1);
  await alex.context.close();
  await jon.context.close();
});

test("T13: Jon's Friday change reaches Alex's open grocery review as a delta; unaffected approvals stay; stale Send makes zero calls", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex");
  const jon = await member(browser, "jon");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await alex.page.getByTestId("approve-all").click();
  await expect(alex.page.getByTestId("readiness")).toContainText("Groceries ready to send.");
  const old = (await q("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].projection_summary;
  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await jon.page.getByTestId("apply").click();
  await expect(alex.page.getByTestId("grocery-delta")).toContainText("Jon: Friday: Fixture: Salmon rice bowls → Fixture: Chicken penne");
  await expect(alex.page.getByTestId("grocery-delta")).toContainText("Chicken thighs increased");
  await expect(alex.page.getByTestId("grocery-delta")).toContainText("Salmon fillet is no longer required for dinner (your separate request stays)");
  await expect(alex.page.getByTestId("line-broccoli")).toContainText("Approved");
  await expect(alex.page.getByTestId("line-chicken_thigh")).toHaveAttribute("data-status", "needs_review");
  await expect(alex.page.getByTestId("send")).toBeDisabled();
  const r = await alex.page.evaluate(async (s) => {
    const res = await fetch("/api/commands/StartHandoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `s-${crypto.randomUUID()}`, payload: { weekId: s.weekId, reviewFingerprint: s.fp, payloadHash: s.ph } }) });
    return { status: res.status, body: await res.json() };
  }, { weekId: fx.weekId, fp: old.reviewFingerprint, ph: old.payloadHash });
  expect(r.body.code).toBe("stale_review");
  await alex.page.waitForTimeout(500);
  expect(await retailerCalls()).toBe(0);
  await alex.context.close();
  await jon.context.close();
});

test("T14/T20: simulated send, order confirmed with different contents, then a Friday change and receipt exceptions", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex");
  const jon = await member(browser, "jon");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await alex.page.getByTestId("approve-all").click();
  await alex.page.getByTestId("send").click();
  await expect(alex.page.getByTestId("grocery-msg")).toContainText("simulated; nothing was sent to a store");
  await expect(alex.page.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
  expect(await retailerCalls()).toBe(1);
  await alex.page.getByRole("button", { name: "Confirm order contents…" }).click();
  // The store left out broccoli: remove it from the confirmed contents.
  const form = alex.page.getByTestId("confirm-order");
  const broccoliRow = form.locator("div.row", { has: alex.page.locator('input[value="Broccoli"]') });
  await broccoliRow.getByRole("button", { name: "remove" }).click();
  await form.getByRole("button", { name: "Confirm order" }).click();
  await expect(alex.page.getByTestId("order")).toBeVisible();
  await expect(alex.page.getByTestId("line-broccoli")).toHaveAttribute("data-status", "not_sent_yet");
  const orderBefore = await q("SELECT * FROM order_lines ORDER BY name");
  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await jon.page.getByTestId("apply").click();
  await expect(alex.page.getByTestId("line-chicken_thigh")).toHaveAttribute("data-status", "not_sent_yet");
  await expect(alex.page.getByTestId("tosend-chicken_thigh")).toContainText("To send: 1 package(s) — Not sent yet");
  await expect(alex.page.getByTestId("line-salmon")).toHaveAttribute("data-status", "ordered");
  expect(await q("SELECT * FROM order_lines ORDER BY name")).toEqual(orderBefore);
  expect(await retailerCalls()).toBe(1);
  // T20: receipt exceptions.
  await alex.page.getByTestId("order-line-chicken_thigh").getByRole("button", { name: "Received" }).click();
  await alex.page.getByTestId("order-line-salmon").getByRole("button", { name: "Missing" }).click();
  await expect(alex.page.getByTestId("line-salmon")).toHaveAttribute("data-status", "missing");
  await expect(alex.page.getByTestId("line-salmon")).toContainText("Missing from pickup — still needed");
  await alex.context.close();
  await jon.context.close();
});

test("T16: an uncertain transfer is shown as uncertain with a cart check, and is not resent", async ({ browser }) => {
  const fx = await seed();
  await q("INSERT INTO fake_retailer_script(household_id, behavior) VALUES ($1,'accept_then_timeout')", [fx.householdId]);
  const alex = await member(browser, "alex");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await alex.page.getByTestId("approve-all").click();
  await alex.page.getByTestId("send").click();
  await expect(alex.page.getByTestId("batch")).toHaveAttribute("data-status", "uncertain");
  await expect(alex.page.getByTestId("transfers")).toContainText("Table will not resend automatically");
  await expect(alex.page.getByTestId("send")).toBeDisabled();
  await alex.page.waitForTimeout(500);
  expect(await retailerCalls()).toBe(1);
  await alex.context.close();
});

test("T18: repeated staple taps from Week, Groceries and Cook merge with names; an explicit extra stays extra", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const add = async (page: typeof jon.page, testid: string, extra = false) => {
    const f = page.getByTestId(testid);
    await f.getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
    await f.getByRole("button", { name: extra ? "Extra" : "Add" }).click();
    await expect(f.getByRole("status")).toBeVisible();
  };
  await add(jon.page, "alsoneed-week");
  await add(jon.page, "alsoneed-week");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await add(alex.page, "alsoneed-groceries");
  await expect(alex.page.getByTestId("line-greek_yogurt")).toContainText("Usual amount — requested by Jon ×2, Alex");
  await expect(alex.page.getByTestId("line-greek_yogurt")).toContainText("Chicken shawarma bowls");
  await expect(alex.page.getByTestId("line-greek_yogurt")).toContainText("1 pkg needed");
  await add(alex.page, "alsoneed-groceries", true);
  await expect(alex.page.getByTestId("line-greek_yogurt")).toContainText("Extra ×1");
  await expect(alex.page.getByTestId("line-greek_yogurt")).toContainText("2 pkg needed");
  await jon.context.close();
  await alex.context.close();
});

test("T21: editing a recipe in the library keeps the accepted dinner on its pinned version", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  await jon.page.goto(`/recipes/${fx.recipes.salmon.recipeId}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  await jon.page.getByTestId("recipe-editor").getByLabel("Title").fill("Salmon rice bowls (our version)");
  await jon.page.getByRole("button", { name: "Save new version" }).click();
  await expect(jon.page.getByTestId("recipe-title")).toHaveText("Salmon rice bowls (our version)");
  await jon.page.getByRole("link", { name: "Week" }).click();
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Salmon rice bowls");
  expect((await q("SELECT recipe_version_id FROM cooking_events WHERE id=$1", [fx.events.salmon]))[0].recipe_version_id).toBe(fx.recipes.salmon.versionId);
  await jon.context.close();
});
