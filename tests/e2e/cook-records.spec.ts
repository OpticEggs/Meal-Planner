/**
 * Cook-record idempotency in the browser (delivery review of fb4d771, gate 2): after one member
 * records a dinner as cooked, both members see it as recorded and no second record can be added; a
 * mistaken record is corrected deliberately ("Keep the record" is the default) and can be recorded again.
 */
import { expect, test } from "@playwright/test";
import { NIGHT } from "../fixtures/household";
import { member, q, seed } from "./helpers";

const count = async () => (await q<{ n: number }>("SELECT count(*)::int n FROM cook_records"))[0].n;
const corrections = async () => (await q<{ n: number }>("SELECT count(*)::int n FROM cook_record_corrections"))[0].n;

test("Mark cooked records once; both members see who recorded it; a stale second press adds nothing; a correction is deliberate and reversible by recording again", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  for (const m of [jon, alex]) await m.page.goto(`/cook/${NIGHT.mon}`);
  await expect(alex.page.getByTestId("mark-cooked")).toBeVisible();

  await jon.page.getByRole("button", { name: "Mark cooked" }).click();
  await expect(jon.page.getByText("Recorded as cooked.")).toBeVisible();
  await expect(jon.page.getByTestId("cooked-state")).toContainText("recorded by Jon");
  await expect(jon.page.getByRole("button", { name: "Mark cooked" })).toHaveCount(0);
  // Alex's open page follows live: the button is gone, the record is shown.
  await expect(alex.page.getByTestId("cooked-state")).toContainText("recorded by Jon");
  await expect(alex.page.getByRole("button", { name: "Mark cooked" })).toHaveCount(0);
  expect(await count()).toBe(1);

  // A press sent from a view that had not caught up yet (same command, new operation id) adds nothing.
  const stale = await alex.page.evaluate(async (eventId) => {
    const r = await fetch("/api/commands/RecordCooked", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `stale-${crypto.randomUUID()}`, payload: { eventId } }) });
    return r.json();
  }, fx.events.stirfry);
  expect([stale.status, stale.code]).toEqual(["rejected", "already_recorded"]);
  expect(stale.message).toMatch(/Jon already recorded/);
  expect(await count()).toBe(1);

  // Correction: deliberate, "Keep the record" focused; Escape keeps it.
  const open = alex.page.getByRole("button", { name: "Correct this: it wasn't cooked" });
  await open.click();
  const dialog = alex.page.getByRole("dialog", { name: "Correct the cooking record?" });
  await expect(dialog.getByRole("button", { name: "Keep the record" })).toBeFocused();
  await alex.page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(await corrections()).toBe(0);
  await open.click();
  await alex.page.getByRole("dialog", { name: "Correct the cooking record?" }).getByRole("button", { name: "It wasn't cooked" }).click();
  await expect(alex.page.getByText("Corrected: this dinner is not recorded as cooked.")).toBeVisible();
  await expect(alex.page.getByRole("button", { name: "Mark cooked" })).toBeFocused(); // focus lands on the control that replaced the record
  expect([await count(), await corrections()]).toEqual([1, 1]); // nothing deleted
  await expect(jon.page.getByRole("button", { name: "Mark cooked" })).toBeVisible(); // Jon sees it live

  // Recording again after the correction is allowed, once.
  await alex.page.getByRole("button", { name: "Mark cooked" }).click();
  await expect(alex.page.getByTestId("cooked-state")).toContainText("recorded by Alex");
  expect(await count()).toBe(2);
  await jon.context.close();
  await alex.context.close();
});
