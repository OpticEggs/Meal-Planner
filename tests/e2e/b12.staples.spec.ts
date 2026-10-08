/**
 * B12 through the browser: one member approves a different product for a staple; both members
 * see the remembered product; nothing is approved for purchase by that decision.
 */
import { expect, test } from "@playwright/test";
import { member, q, seed } from "./helpers";

test("B12: Alex makes a different yogurt the usual; Jon sees it live; the purchase still needs its own approval", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  // Jon taps yogurt into the pickup list; it becomes a remembered staple with today's product.
  const f = jon.page.getByTestId("alsoneed-week");
  await f.getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
  await f.getByRole("button", { name: "Add", exact: true }).click();
  await expect(f.getByRole("status")).toContainText("Added");
  await jon.page.getByRole("link", { name: "Groceries" }).click();
  await expect(jon.page.getByTestId("staple-greek_yogurt")).toContainText("Your usual: Plain Greek yogurt 32 oz tub");

  // Alex adds another product for this pickup, then explicitly makes it the usual.
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  const yog = alex.page.getByTestId("line-greek_yogurt");
  // (Since B15 the product form is a dialog rather than inline in the line.)
  await yog.getByRole("button", { name: "Change product for Plain Greek yogurt" }).click();
  const pd = alex.page.getByRole("dialog", { name: "Product for Plain Greek yogurt" });
  await pd.getByLabel("Product name").fill("Fage Total 35 oz");
  await pd.getByLabel("Package size").fill("35");
  await pd.getByLabel("Unit").fill("oz");
  await pd.getByLabel("Price ($, optional)").fill("6.99");
  await pd.getByRole("button", { name: "Save product" }).click();
  await expect(pd).toHaveCount(0);
  await expect(yog).toContainText("Fage Total 35 oz · 1 pkg needed");
  await expect(alex.page.getByTestId("staple-greek_yogurt")).toContainText("Your usual: Plain Greek yogurt 32 oz tub");
  const make = alex.page.getByRole("button", { name: "Make Fage Total 35 oz your usual Plain Greek yogurt" });
  await make.click();
  await expect(alex.page.getByTestId("staple-greek_yogurt")).toContainText("Your usual: Fage Total 35 oz · last set by Alex");
  await expect(make).toHaveCount(0);

  // Jon sees the new remembered product without reloading; the line still needs a purchase approval.
  await expect(jon.page.getByTestId("staple-greek_yogurt")).toContainText("Your usual: Fage Total 35 oz · last set by Alex");
  await expect(jon.page.getByTestId("line-greek_yogurt")).toHaveAttribute("data-status", "needs_review");
  expect(await q("SELECT 1 FROM purchase_approvals WHERE ingredient_key='greek_yogurt'")).toHaveLength(0);
  const st = (await q<any>("SELECT s.product_revision, p.name FROM household_staples s JOIN products p ON p.id=s.product_id WHERE s.ingredient_key='greek_yogurt'"))[0];
  expect(st).toEqual({ product_revision: 2, name: "Fage Total 35 oz" });
  // The Week page's one-tap chip names the remembered product for screen readers.
  await jon.page.getByRole("link", { name: "Week" }).click();
  await expect(jon.page.getByTestId("alsoneed-week").getByRole("button", { name: "Plain Greek yogurt — your usual (Fage Total 35 oz)" })).toBeVisible();
  await jon.context.close();
  await alex.context.close();
});
