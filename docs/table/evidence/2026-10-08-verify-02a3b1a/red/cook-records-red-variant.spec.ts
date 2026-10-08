// RED-ONLY VARIANT (not committed): the behavior of tests/e2e/cook-records.spec.ts with role selectors only,
// so it runs against code that lacks the new test ids.
import { expect, test } from "@playwright/test";
import { NIGHT } from "../fixtures/household";
import { member, q, seed } from "./helpers";
const count = async () => (await q<{ n: number }>("SELECT count(*)::int n FROM cook_records"))[0].n;
test("red variant: one record per cooking event; the button is gone once recorded", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  await jon.page.goto(`/cook/${NIGHT.mon}`);
  await jon.page.getByRole("button", { name: "Mark cooked" }).click();
  await expect(jon.page.getByText("Recorded as cooked.")).toBeVisible();
  const second = await jon.page.evaluate(async (eventId) => {
    const r = await fetch("/api/commands/RecordCooked", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `again-${crypto.randomUUID()}`, payload: { eventId } }) });
    return { httpStatus: r.status, body: await r.text() };
  }, fx.events.stirfry);
  console.log("second press:", JSON.stringify(second));
  expect(await count(), "a second press must not add a record").toBe(1);
  expect(second.body).toContain("already_recorded");
  await expect(jon.page.getByRole("button", { name: "Mark cooked" })).toHaveCount(0);
  await jon.context.close();
});
