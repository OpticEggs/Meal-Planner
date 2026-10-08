/**
 * Browser-level regressions for the independent review of 89f3ea9 (F01, F06, F07) and the
 * header-overlap question raised about the smoke screenshot.
 */
import { expect, test } from "@playwright/test";
import { NIGHT } from "../fixtures/household";
import { member, q, seed } from "./helpers";

const NEXT = "2026-10-19";

test("R-F01-UI: an incomplete proposal is shown as a draft and cannot be adopted (UI and server)", async ({ browser }) => {
  const fx = await seed();
  await q("UPDATE recipes SET archived_at=now() WHERE household_id=$1 AND id<>$2", [fx.householdId, fx.recipes.tacos.recipeId]);
  const jon = await member(browser, "jon");
  await jon.page.getByRole("button", { name: "Next week" }).click();
  await jon.page.getByRole("button", { name: "Propose a week" }).click();
  await expect(jon.page.getByTestId("incomplete-proposal")).toContainText("not a complete week");
  await expect(jon.page.getByTestId("adopt")).toBeDisabled();
  const p = (await q("SELECT id, content_hash FROM proposals ORDER BY created_at DESC LIMIT 1"))[0];
  const r = await jon.page.evaluate(async ({ id, hash }) => {
    const res = await fetch("/api/commands/AdoptWeekProposal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `a-${crypto.randomUUID()}`, payload: { proposalId: id, reviewedHash: hash, expectedAcceptedChoiceRevision: 0 } }) });
    return { status: res.status, body: await res.json() };
  }, { id: p.id, hash: p.content_hash });
  expect(r.status).toBe(409);
  expect(r.body.code).toBe("incomplete_week");
  expect((await q("SELECT accepted_choice_revision FROM weeks WHERE household_id=$1 AND week_start=$2", [fx.householdId, NEXT]))[0].accepted_choice_revision).toBe(0);
  await jon.context.close();
});

test("R-F07-UI: Also need works before next week's dinners are chosen, and both members see it", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await jon.page.getByRole("button", { name: "Next week" }).click();
  await expect(jon.page.getByTestId("week-title")).toHaveText("Week of Oct 19");
  const f = jon.page.getByTestId("alsoneed-week");
  await f.getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
  await f.getByRole("button", { name: "Add" }).click();
  await expect(f.getByRole("status")).toContainText("Added");
  await alex.page.getByRole("button", { name: "Next week" }).click();
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await expect(alex.page.getByTestId("line-greek_yogurt")).toContainText("Usual amount — requested by Jon");
  // The staple is remembered and offered as a one-tap chip.
  await alex.page.getByRole("link", { name: "Week" }).click();
  // (Scoped to the Week page's chips: since B14 the grocery-line controls carry the item name too.)
  await expect(alex.page.getByTestId("alsoneed-week").getByRole("button", { name: "Plain Greek yogurt" })).toBeVisible();
  await jon.context.close();
  await alex.context.close();
});

test("R-F06-UI: Have enough records the amount shown on screen", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  const shown = (await q("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.ingredient_key='rice'", [fx.weekId]))[0].line.meal;
  await alex.page.getByTestId("line-rice").getByRole("button", { name: "Have enough" }).click();
  await expect(alex.page.getByTestId("line-rice")).toContainText("Alex: Have enough");
  const stored = (await q("SELECT reviewed_demand, reviewed_unit FROM availability_observations"))[0];
  expect([stored.reviewed_demand, stored.reviewed_unit]).toEqual([shown.quantity, shown.unit]);
  await alex.context.close();
});

test("Header overlap: at phone width the sticky header never covers a night's controls, at the top or scrolled", async ({ browser }, info) => {
  await seed();
  const jon = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  const covered: string[] = [];
  for (const n of Object.values(NIGHT)) {
    for (const id of [`change-${n}`]) {
      const el = jon.page.getByTestId(id);
      await el.scrollIntoViewIfNeeded();
      const hit = await el.evaluate((b) => {
        const r = b.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + 2);
        const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const who = (e: Element | null) => (e ? `${e.tagName}.${(e as HTMLElement).className}` : "none");
        return { top: b.contains(top), mid: b.contains(mid), coveredBy: b.contains(mid) ? null : who(mid), y: Math.round(r.top), vh: innerHeight };
      });
      if (!hit.top || !hit.mid) covered.push(`${id} ${JSON.stringify(hit)}`);
      await el.click({ trial: true }); // actionable: not obscured
    }
  }
  expect(covered).toEqual([]);
  await jon.page.evaluate(() => window.scrollTo(0, 0));
  await jon.page.screenshot({ path: info.outputPath("viewport-top.png") });
  await jon.page.evaluate(() => window.scrollTo(0, 700));
  await jon.page.screenshot({ path: info.outputPath("viewport-scrolled.png") });
  await jon.page.screenshot({ path: info.outputPath("fullpage.png"), fullPage: true });
  await jon.context.close();
});
