/**
 * B10 in the browser, two members, simulated retailer: "Prepare supported items…" is a separate action
 * next to the whole-list Send; the review shows what goes, what is left out and why, says it is not a
 * complete order, needs an explicit acknowledgement, and is refused when the list changes while open.
 */
import { expect, test } from "@playwright/test";
import { member, q, seed } from "./helpers";

const calls = () => q<any>("SELECT request_body FROM fake_retailer_calls ORDER BY id");

async function groceries(browser: any, who: "jon" | "alex") {
  const m = await member(browser, who);
  await m.context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await m.page.getByRole("link", { name: "Groceries" }).first().click();
  await expect(m.page.getByTestId("groceries")).toBeVisible();
  return m;
}

test("B10-E1: send only the ready items — exact subset sent, the rest named and copyable, both members see the partial transfer", async ({ browser }) => {
  await seed({ unpricedCheese: true });
  const jon = await groceries(browser, "jon");
  const alex = await groceries(browser, "alex");
  const p = jon.page;
  await p.getByRole("button", { name: "Approve 1 package of Jasmine rice" }).click();
  await expect(p.getByTestId("line-rice")).toContainText("Approved ×1");
  // Writes pause while the screen re-reads after a change (by design: no decision from a view that is not current).
  // Tap the next approval once it is current again — a tap during that moment lands on a disabled button.
  await expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await p.getByRole("button", { name: "Approve 2 packages of Broccoli" }).click();
  await expect(p.getByTestId("line-broccoli")).toContainText("Approved ×2");
  await expect(p.getByTestId("send")).toBeDisabled(); // the whole-list Send is unchanged: not everything is ready
  await p.getByTestId("prepare-partial").click();
  const d = p.getByRole("dialog", { name: "Send only the ready items" });
  await expect(d.getByTestId("partial-not-complete")).toContainText("not a complete grocery order");
  await expect(d.getByTestId("partial-item")).toHaveCount(2);
  await expect(d.getByRole("checkbox", { name: /Broccoli/ })).toBeFocused();
  const left = d.getByTestId("partial-left-out");
  await expect(left.locator('[data-key="cheese"]')).toContainText("Price unknown");
  await expect(left.locator('[data-key="salmon"]')).toContainText("Not approved for 1 package(s)");
  // Leave broccoli out deliberately; it is then named as left out by you.
  await d.getByRole("checkbox", { name: /Broccoli/ }).uncheck();
  await expect(left.locator('[data-key="broccoli"]')).toContainText("Left out by you");
  await expect(d.getByTestId("partial-subtotal")).toContainText("$3.99");
  await expect(d.getByTestId("partial-send")).toBeDisabled(); // until the omissions are acknowledged
  await d.getByTestId("copy-remaining").click();
  const copied = await p.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Cheddar cheese");
  expect(copied).toContain("Broccoli");
  expect(copied).not.toContain("Jasmine rice");
  await d.getByTestId("partial-ack").check();
  await d.getByTestId("partial-send").click();
  await expect(d).toBeHidden();
  await expect(p.getByTestId("announcer")).toContainText("Partial transfer acknowledged: 1 item(s) sent");
  await expect(p.getByTestId("prepare-partial")).toBeFocused();
  expect((await calls()).map((c) => c.request_body)).toEqual([{ items: [{ upc: "SIM-RICE", quantity: 1 }] }]);
  // Alex sees the partial transfer, what was left out, and broccoli still approved and actionable.
  const batch = alex.page.getByTestId("batch");
  await expect(batch).toContainText("(partial)");
  await expect(batch.getByTestId("batch-left-out")).toContainText("Broccoli");
  await expect(alex.page.getByTestId("line-broccoli")).toContainText("Approved ×2");
  await jon.context.close();
  await alex.context.close();
});

test("B10-E2: the other member changes the list while the review is open → it says so and sends nothing", async ({ browser }) => {
  await seed({ unpricedCheese: true });
  const jon = await groceries(browser, "jon");
  const alex = await groceries(browser, "alex");
  await jon.page.getByRole("button", { name: "Approve 1 package of Jasmine rice" }).click();
  await expect(jon.page.getByTestId("line-rice")).toContainText("Approved ×1");
  await jon.page.getByTestId("prepare-partial").click();
  const d = jon.page.getByRole("dialog", { name: "Send only the ready items" });
  await d.getByTestId("partial-ack").check();
  await alex.page.getByRole("button", { name: "Approve 1 package of Firm tofu" }).click();
  await expect(d.getByTestId("partial-changed")).toBeVisible();
  await expect(d.getByTestId("partial-send")).toBeDisabled();
  expect(await calls()).toEqual([]);
  expect(await q("SELECT 1 FROM handoff_batches")).toEqual([]);
  await jon.context.close();
  await alex.context.close();
});
