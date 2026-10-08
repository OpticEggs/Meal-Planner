/**
 * The first persistent two-user slice, through a running production server, real
 * PostgreSQL and two independently authenticated browser contexts.
 */
import { expect, test } from "@playwright/test";
import { NIGHT } from "../fixtures/household";
import {
  background, foreground, holdHousehold, member, nightTitle, previewReplace, protectedRows, q, retailerCalls, seed, waitForLockWaiters,
} from "./helpers";

test("T01: Jon previews Friday while Alex reviews groceries, then cancels — nothing accepted changes", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await expect(alex.page.getByTestId("line-salmon")).toBeVisible();
  const alexLinesBefore = await alex.page.getByTestId("groceries").getAttribute("data-projection-revision");
  const before = await protectedRows(fx.weekId);
  const eventsBefore = (await q("SELECT count(*)::int n FROM change_events"))[0].n;

  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await expect(jon.page.getByTestId("preview")).toContainText("Friday: Fixture: Salmon rice bowls → Fixture: Chicken penne");
  await expect(jon.page.getByTestId("preview")).toContainText("Chicken thighs: dinner amount changes");
  // The accepted week shown to Jon is still Friday's salmon while the draft is open.
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Salmon rice bowls");
  await jon.page.getByTestId("cancel-preview").click();
  await expect(jon.page.getByTestId("preview")).toHaveCount(0);

  expect(await protectedRows(fx.weekId)).toEqual(before);
  expect((await q("SELECT count(*)::int n FROM change_events"))[0].n).toBe(eventsBefore);
  expect(await retailerCalls()).toBe(0);
  await alex.page.reload();
  await expect(alex.page.getByTestId("groceries")).toHaveAttribute("data-projection-revision", alexLinesBefore!);
  await jon.context.close();
  await alex.context.close();
});

test("T08: Alex changes Friday while Jon's Friday preview is open — Jon sees it without pressing Apply", async ({ browser, request }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await expect(jon.page.getByTestId("preview")).toHaveAttribute("data-stale", "false");
  await expect(jon.page.getByTestId("apply")).toBeEnabled();

  await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await expect(alex.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Turkey chili");

  // Jon presses nothing. The accepted-week context and the stale draft both update.
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Turkey chili");
  await expect(jon.page.getByTestId("preview")).toHaveAttribute("data-stale", "true");
  await expect(jon.page.getByTestId("stale-message")).toContainText("Alex changed Friday to Fixture: Turkey chili");
  await expect(jon.page.getByTestId("apply")).toBeDisabled();
  // The stale badge is text, not color alone.
  await expect(jon.page.getByTestId("stale-badge")).toHaveText(/Out of date/);

  // The old draft cannot apply as old authorization, even bypassing the UI.
  const pv = (await q("SELECT id, content_hash FROM previews WHERE created_by=$1 AND status='open'", [fx.members.jon]))[0];
  const r = await jon.page.evaluate(async ({ id, hash }) => {
    const res = await fetch("/api/commands/ApplyPlanChange", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `t08-${crypto.randomUUID()}`, payload: { previewId: id, reviewedHash: hash } }) });
    return { status: res.status, body: await res.json() };
  }, { id: pv.id, hash: pv.content_hash });
  expect(r.status).toBe(409);
  expect(r.body.code).toBe("stale_preview");
  expect((await nightTitle(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Turkey chili");
  await expect(jon.page.getByTestId("preview")).toBeVisible(); // draft preserved
  void request;
  await jon.context.close();
  await alex.context.close();
});

test("T09: same as T08 while Jon's app is backgrounded; the newer decision and stale draft appear on return", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await background(jon.context, jon.page);
  await expect(jon.page.getByTestId("currency")).not.toHaveAttribute("data-currency", "current");
  await expect(jon.page.getByTestId("apply")).toBeDisabled();

  await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await expect(alex.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Turkey chili");
  // Events were missed while Jon was away: his last-synced view is not presented as current.
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Salmon rice bowls");
  await expect(jon.page.getByTestId("currency")).not.toHaveAttribute("data-currency", "current");

  await foreground(jon.context, jon.page);
  // Sample until the view is current: Apply must never be enabled for the stale draft.
  for (let i = 0; i < 50; i++) {
    const cur = await jon.page.getByTestId("currency").getAttribute("data-currency");
    const enabled = await jon.page.getByTestId("apply").isEnabled().catch(() => false);
    const stale = await jon.page.getByTestId("preview").getAttribute("data-stale");
    expect(enabled && stale !== "false" ? "enabled-while-stale" : "ok").toBe("ok");
    if (cur === "current" && stale === "true") break;
    await jon.page.waitForTimeout(50);
  }
  await expect(jon.page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Turkey chili");
  await expect(jon.page.getByTestId("preview")).toHaveAttribute("data-stale", "true");
  await expect(jon.page.getByTestId("apply")).toBeDisabled();
  expect((await nightTitle(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Turkey chili");
  await jon.context.close();
  await alex.context.close();
});

for (const order of ["Jon (Sunday) commits first", "Alex (Friday) commits first"] as const) {
  test(`T10: concurrent independent Friday and Sunday replacements — ${order}`, async ({ browser }) => {
    const fx = await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    const before = await protectedRows(fx.weekId);
    await previewReplace(jon.page, NIGHT.sun, "Fixture: Turkey chili");
    await previewReplace(alex.page, NIGHT.fri, "Fixture: Chicken penne");
    const hold = await holdHousehold(fx.householdId);
    const [first, second] = order.startsWith("Jon") ? [jon, alex] : [alex, jon];
    await first.page.getByTestId("apply").click();
    await waitForLockWaiters(1);
    await second.page.getByTestId("apply").click();
    await waitForLockWaiters(2);
    await hold.release();
    for (const p of [jon.page, alex.page]) {
      await expect(p.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Chicken penne");
      await expect(p.getByTestId(`night-title-${NIGHT.sun}`)).toHaveText("Fixture: Turkey chili");
      await expect(p.getByTestId("accepted-revision")).toHaveText("3");
    }
    const after = await protectedRows(fx.weekId);
    for (const n of [NIGHT.mon, NIGHT.tue, NIGHT.wed, NIGHT.thu, NIGHT.sat]) {
      expect(after.assignments.find((a: any) => a.night === n)).toEqual(before.assignments.find((a: any) => a.night === n));
    }
    const chicken = (await q("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.ingredient_key='chicken_thigh'", [fx.weekId]))[0].line;
    expect(chicken.meal.quantity).toBe("1219.029"); // 43 oz: Wednesday batch 33 oz + Friday penne 10 oz
    expect(chicken.packagesNeeded).toBe(2);
    await jon.context.close();
    await alex.context.close();
  });
}

for (const order of ["Jon first", "Alex first"] as const) {
  test(`T11: concurrent replacements of Friday — ${order}`, async ({ browser }) => {
    const fx = await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
    await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
    const hold = await holdHousehold(fx.householdId);
    const [first, second] = order === "Jon first" ? [jon, alex] : [alex, jon];
    await first.page.getByTestId("apply").click();
    await waitForLockWaiters(1);
    await second.page.getByTestId("apply").click();
    await waitForLockWaiters(2);
    await hold.release();
    const winner = order === "Jon first" ? "Fixture: Chicken penne" : "Fixture: Turkey chili";
    await expect(second.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText(winner);
    await expect(second.page.getByTestId("preview")).toHaveAttribute("data-stale", "true");
    await expect(second.page.getByTestId("apply")).toBeDisabled();
    const row = await nightTitle(fx.weekId, NIGHT.fri);
    expect(row.title).toBe(winner);
    expect(row.revision).toBe(2);
    expect((await q("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [fx.weekId]))[0].accepted_choice_revision).toBe(2);
    const loserMember = order === "Jon first" ? fx.members.alex : fx.members.jon;
    expect((await q("SELECT count(*)::int n FROM previews WHERE created_by=$1 AND status='open'", [loserMember]))[0].n).toBe(1);
    await jon.context.close();
    await alex.context.close();
  });
}

test("T12: adopting an old whole-week proposal after a newer accepted change stops and shows the current week", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  // Jon reviews a proposal for the current (already accepted) week via the server boundary.
  const gen = await jon.page.evaluate(async () => {
    const r = await fetch("/api/commands/GenerateProposal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `g-${crypto.randomUUID()}`, payload: { weekStart: "2026-10-12" } }) });
    return r.json();
  });
  expect(gen.status).toBe("accepted");
  const before = await protectedRows(fx.weekId);
  await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Turkey chili");
  const res = await jon.page.evaluate(async ({ id, hash }) => {
    const r = await fetch("/api/commands/AdoptWeekProposal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `a-${crypto.randomUUID()}`, payload: { proposalId: id, reviewedHash: hash, expectedAcceptedChoiceRevision: 1 } }) });
    return { status: r.status, body: await r.json() };
  }, { id: gen.result.proposalId, hash: gen.result.contentHash });
  expect(res.status).toBe(409);
  expect(res.body.code).toBe("stale_week");
  expect(JSON.stringify(res.body.details.newerChanges)).toContain("Alex");
  const after = await protectedRows(fx.weekId);
  expect(after.week[0].accepted_choice_revision).toBe(2);
  expect(after.assignments.filter((a: any) => a.night !== NIGHT.fri)).toEqual(before.assignments.filter((a: any) => a.night !== NIGHT.fri));
  await jon.page.reload();
  await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Turkey chili");
  await jon.context.close();
  await alex.context.close();
});

test("Reload preserves accepted state, previews and stale status (persistence, not browser memory)", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await previewReplace(alex.page, NIGHT.sun, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await jon.page.reload();
  await alex.page.reload();
  for (const p of [jon.page, alex.page]) await expect(p.getByTestId(`night-title-${NIGHT.sun}`)).toHaveText("Fixture: Turkey chili");
  await expect(jon.page.getByTestId("preview")).toHaveAttribute("data-stale", "false"); // Sunday is independent of Jon's Friday draft
  await jon.page.getByTestId("apply").click();
  await expect(alex.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Chicken penne");
  expect((await nightTitle(fx.weekId, NIGHT.sun)).title).toBe("Fixture: Turkey chili");
  await jon.context.close();
  await alex.context.close();
});
