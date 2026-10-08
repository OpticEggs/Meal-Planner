/**
 * B15 (Groceries accessibility) and B16 (Household staple management) through the browser, with
 * two signed-in members. Focus is checked by reading document.activeElement after real key
 * presses; outcomes are checked in the database, not only on screen.
 */
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { member, q, retailerCalls, seed } from "./helpers";

async function focused(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    return {
      testid: a?.getAttribute("data-testid") ?? null,
      id: a?.id ?? null,
      tag: a?.tagName ?? null,
      type: a?.getAttribute("type") ?? null,
      name: a?.getAttribute("aria-label") ?? a?.textContent?.trim().slice(0, 80) ?? null,
      value: (a as HTMLInputElement | null)?.value ?? null,
      inDialog: !!(dialog && a && dialog.contains(a)),
      isBody: a === document.body,
    };
  });
}
function recordAnnouncements() {
  (window as any).__announced = [];
  new MutationObserver(() => {
    const t = document.querySelector('[data-testid="announcer"]')?.textContent?.trim();
    const log = (window as any).__announced as string[];
    if (t && log[log.length - 1] !== t) log.push(t);
  }).observe(document, { subtree: true, childList: true, characterData: true });
}
const announced = (page: Page) => page.evaluate(() => ((window as any).__announced as string[]).join(" | "));
async function trapped(page: Page, presses = 30) {
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let i = 0; i < presses; i++) {
      await page.keyboard.press(key);
      const f = await focused(page);
      expect(f.inDialog, `${key} #${i} left the dialog: ${JSON.stringify(f)}`).toBe(true);
    }
  }
}
/** A second simulated product for an item, recorded before the members sign in. */
async function product(householdId: string, key: string, name: string, opts: { qty?: string; unit?: string; retailer?: string; price?: number } = {}) {
  const id = randomUUID();
  await q("INSERT INTO products(id, household_id, retailer, product_ref, name, ingredient_key, package_qty, package_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [
    id, householdId, opts.retailer ?? "simulated", `e2e:${id}`, name, key, opts.qty ?? "1", opts.unit ?? "lb",
  ]);
  await q("INSERT INTO price_observations(household_id, product_id, amount_minor, source, observed_at) VALUES ($1,$2,$3,'manual','2026-10-12T18:00:00Z')", [householdId, id, opts.price ?? 299]);
  return id;
}
const noNativeDialogs = (page: Page) => page.on("dialog", (d) => { throw new Error(`native ${d.type()} dialog opened: ${d.message()}`); });

test("B15 product dialog: keyboard, trapped focus, Escape saves nothing, field errors are attached, a new choice withdraws the approval", async ({ browser }) => {
  const fx = await seed();
  const organic = await product(fx.householdId, "broccoli", "Organic broccoli 1 lb");
  const alex = await member(browser, "alex", { init: recordAnnouncements });
  const p = alex.page;
  noNativeDialogs(p);
  await p.getByRole("link", { name: "Groceries" }).click();
  await p.getByTestId("approve-all").click();
  await expect(p.getByTestId("line-broccoli")).toContainText("Approved");
  const productsBefore = (await q("SELECT count(*)::int n FROM products"))[0];

  const opener = p.getByRole("button", { name: "Change product for Broccoli" });
  await opener.focus();
  await p.keyboard.press("Enter");
  const dialog = p.getByRole("dialog", { name: "Product for Broccoli" });
  await expect(dialog).toBeVisible();
  let f = await focused(p);
  expect(f).toMatchObject({ inDialog: true, type: "radio" }); // the current product's radio
  await trapped(p);
  // Typed, then Escape: nothing saved, focus back on the opener.
  await dialog.getByLabel("Product name").fill("Abandoned broccoli");
  await p.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).testid).toBe("product-broccoli");
  expect((await q("SELECT count(*)::int n FROM products"))[0]).toEqual(productsBefore);
  await expect(p.getByTestId("line-broccoli")).toContainText("Approved");

  // Field errors are tied to their fields and take focus.
  await opener.click();
  await dialog.getByLabel("Package size").fill("abc");
  await dialog.getByRole("button", { name: "Save product" }).click();
  await expect.poll(async () => (await focused(p)).id).toBe("pd-name");
  await expect(dialog.getByLabel("Product name")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Product name")).toHaveAccessibleDescription("Enter the product's name");
  await expect(dialog.getByLabel("Package size")).toHaveAccessibleDescription(/Package size must be a positive number/);
  expect((await q("SELECT count(*)::int n FROM products"))[0]).toEqual(productsBefore);

  // Choose the other product by keyboard; the approval is withdrawn and said so.
  await dialog.getByRole("radio", { name: /Broccoli crowns 1 lb/ }).focus();
  await p.keyboard.press("ArrowDown");
  await expect(dialog.getByRole("radio", { name: /Organic broccoli 1 lb/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Use for this pickup" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).testid).toBe("product-broccoli");
  await expect(p.getByTestId("line-broccoli")).toHaveAttribute("data-status", "needs_review");
  await expect(p.getByTestId("line-broccoli")).toContainText("Organic broccoli 1 lb");
  await expect.poll(() => announced(p)).toContain("Organic broccoli 1 lb chosen for this pickup. Its earlier approval no longer applies; approve it again.");
  expect((await q<any>("SELECT product_id FROM product_mappings WHERE ingredient_key='broccoli'"))[0].product_id).toBe(organic);
  await alex.context.close();
});

test("B15 order confirmation is two deliberate steps; Escape and Back save nothing; field errors are attached; focus lands on the new order", async ({ browser }) => {
  await seed();
  const alex = await member(browser, "alex");
  const p = alex.page;
  noNativeDialogs(p);
  await p.getByRole("link", { name: "Groceries" }).click();
  await p.getByTestId("approve-all").click();
  await p.getByTestId("send").click();
  await expect(p.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
  // Sent lines say so in words for a screen reader.
  await expect(p.getByRole("heading", { name: /^Broccoli: Sent to cart/ })).toHaveCount(1);
  await expect(p.getByTestId("batch")).toContainText("Sent to cart — the store acknowledged the transfer");

  const opener = p.getByRole("button", { name: "Confirm order contents…" });
  await opener.focus();
  await p.keyboard.press("Enter");
  const dialog = p.getByRole("dialog", { name: "Confirm order contents" });
  await expect(dialog).toBeVisible();
  expect(await focused(p)).toMatchObject({ inDialog: true, type: "checkbox" });
  await trapped(p, 20);
  // Invalid entries: errors on the exact fields; the first takes focus.
  await dialog.getByRole("textbox", { name: "Item 1", exact: true }).fill("");
  await dialog.getByRole("textbox", { name: /^Packages of / }).nth(1).fill("0");
  await dialog.getByRole("button", { name: "Confirm order…" }).click();
  await expect.poll(async () => (await focused(p)).id).toBe("co-name-0");
  await expect(dialog.getByRole("textbox", { name: "Item 1", exact: true })).toHaveAccessibleDescription("Enter the item's name");
  await expect(dialog.locator("#co-pk-1")).toHaveAccessibleDescription("Packages must be a whole number from 1 to 50");
  await dialog.getByRole("textbox", { name: "Item 1", exact: true }).fill("Broccoli");
  await dialog.locator("#co-pk-1").fill("1");
  await dialog.getByRole("button", { name: "Confirm order…" }).click();
  // Review step: focus on its heading; Escape saves nothing.
  await expect(dialog.getByTestId("confirm-order-review")).toBeVisible();
  await expect.poll(async () => (await focused(p)).name).toBe("Check before recording");
  await p.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).name).toBe("Confirm order contents…");
  expect(await q("SELECT 1 FROM orders")).toHaveLength(0);
  // Back to edit keeps the edits; the second step records.
  await opener.click();
  await dialog.getByRole("button", { name: "Confirm order…" }).click();
  await dialog.getByRole("button", { name: "Back to edit" }).click();
  await expect(dialog.getByRole("button", { name: "Confirm order…" })).toBeVisible();
  expect(await q("SELECT 1 FROM orders")).toHaveLength(0);
  await dialog.getByRole("button", { name: "Confirm order…" }).click();
  await dialog.getByRole("button", { name: "Yes, record this order" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(p.getByTestId("order")).toBeVisible();
  // The opener is gone (the card became the order): focus lands on the order, never <body>.
  await expect.poll(async () => (await focused(p)).isBody).toBe(false);
  expect((await focused(p)).testid === "order" || (await p.evaluate(() => !!document.activeElement?.closest('[data-testid="order"]')))).toBe(true);
  expect(await q("SELECT 1 FROM orders")).toHaveLength(1);
  await expect(p.getByRole("heading", { name: /^Broccoli: Ordered/ })).toHaveCount(1);
  await alex.context.close();
});

test("B15 receipts: substitute, 'does it work', and corrections are labelled dialogs (no prompt()), with field errors and append-only results", async ({ browser }) => {
  await seed();
  const alex = await member(browser, "alex");
  const p = alex.page;
  noNativeDialogs(p);
  await p.getByRole("link", { name: "Groceries" }).click();
  await p.getByTestId("approve-all").click();
  await p.getByTestId("send").click();
  await expect(p.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
  await p.getByRole("button", { name: "Confirm order contents…" }).click();
  const co = p.getByRole("dialog", { name: "Confirm order contents" });
  await co.getByRole("button", { name: "Confirm order…" }).click();
  await co.getByRole("button", { name: "Yes, record this order" }).click();
  await expect(p.getByTestId("order")).toBeVisible();

  // A substitute arrived for salmon.
  await p.getByRole("button", { name: "Substituted Salmon fillet…" }).click();
  const sub = p.getByRole("dialog", { name: "Record a substitute for Salmon fillet" });
  expect(await focused(p)).toMatchObject({ inDialog: true, id: "sub-text" });
  await sub.getByRole("button", { name: "Record substitute" }).click();
  await expect(sub.getByLabel("What arrived instead")).toHaveAccessibleDescription("Say what arrived instead");
  await expect.poll(async () => (await focused(p)).id).toBe("sub-text");
  await sub.getByLabel("What arrived instead").fill("Arctic char 12 oz");
  await sub.getByRole("button", { name: "Record substitute" }).click();
  await expect(sub).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).isBody).toBe(false);
  expect((await q<any>("SELECT state, substitute_text FROM receipt_observations"))).toEqual([{ state: "substituted", substitute_text: "Arctic char 12 oz" }]);
  // An unjudged substitute covers nothing: salmon is still to buy.
  await expect(p.getByTestId("line-salmon")).toHaveAttribute("data-status", "not_sent_yet");

  // Does it work: an amount is required; the decision is recorded with it.
  const judge = p.getByRole("button", { name: "Does Arctic char 12 oz work for Salmon fillet?" });
  await judge.click();
  const val = p.getByRole("dialog", { name: "Does Arctic char 12 oz (for Salmon fillet) work?" });
  await val.getByRole("button", { name: "It works" }).click();
  await expect.poll(async () => (await focused(p)).id).toBe("val-qty");
  await expect(val.getByLabel("How much arrived")).toHaveAccessibleDescription("Amount must be a positive number");
  await p.keyboard.press("Escape");
  await expect(val).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).name).toBe("Does Arctic char 12 oz work for Salmon fillet?");
  expect(await q("SELECT 1 FROM substitution_validations")).toHaveLength(0);
  await judge.click();
  await val.getByLabel("How much arrived").fill("12");
  await val.getByLabel("Unit").selectOption("oz");
  await val.getByRole("button", { name: "It works" }).click();
  await expect(val).toHaveCount(0);
  expect(await q<any>("SELECT suitable, quantity::text, unit FROM substitution_validations")).toEqual([{ suitable: true, quantity: "12", unit: "oz" }]);

  // Correct the chicken receipt: received was wrong, it was missing. The original stays.
  await p.getByTestId("order-line-chicken_thigh").getByRole("button", { name: "Received Chicken thighs" }).click();
  await p.getByRole("button", { name: /^Correct the receipt for Chicken thighs/ }).click();
  const cr = p.getByRole("dialog", { name: "Correct the receipt for Chicken thighs" });
  await cr.getByRole("button", { name: "Record correction" }).click();
  await expect.poll(async () => (await focused(p)).type).toBe("radio");
  await cr.getByRole("radio", { name: "missing" }).check();
  await cr.getByRole("button", { name: "Record correction" }).click();
  await expect(cr).toHaveCount(0);
  const rows = await q<any>("SELECT r.state, r.corrects_id IS NOT NULL AS correction FROM receipt_observations r JOIN order_lines l ON l.id=r.order_line_id WHERE l.ingredient_key='chicken_thigh' ORDER BY r.observed_at");
  expect(rows).toEqual([{ state: "received", correction: false }, { state: "missing", correction: true }]);
  await expect(p.getByTestId("line-chicken_thigh")).toHaveAttribute("data-status", "missing");
  await alex.context.close();
});

test("B15 uncertain transfer: the cart check needs a deliberate choice, Escape records nothing, and states are worded", async ({ browser }) => {
  const fx = await seed();
  await q("INSERT INTO fake_retailer_script(household_id, behavior) VALUES ($1,'accept_then_timeout')", [fx.householdId]);
  const alex = await member(browser, "alex");
  const p = alex.page;
  await p.getByRole("link", { name: "Groceries" }).click();
  await p.getByTestId("approve-all").click();
  await p.getByTestId("send").click();
  await expect(p.getByTestId("batch")).toHaveAttribute("data-status", "uncertain");
  await expect(p.getByTestId("batch")).toContainText("Uncertain — check the cart");
  await expect(p.getByRole("heading", { name: /^Broccoli: Uncertain — check cart/ })).toHaveCount(1);
  const events = async () => (await q("SELECT count(*)::int n FROM handoff_status_events"))[0];
  const before = await events();
  const opener = p.getByRole("button", { name: "Check the cart for transfer 1" });
  await opener.click();
  const dialog = p.getByRole("dialog", { name: "What is in the store cart?" });
  expect(await focused(p)).toMatchObject({ inDialog: true, type: "radio" });
  await expect(dialog.getByRole("button", { name: "Record what I saw" })).toBeDisabled(); // no default choice
  await p.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).name).toBe("Check the cart for transfer 1");
  expect(await events()).toEqual(before);
  await opener.click();
  await dialog.getByRole("radio", { name: "The items are not in the cart" }).check();
  await expect(dialog).toContainText("sending again would add them twice");
  await dialog.getByRole("button", { name: "Record what I saw" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(p.getByTestId("batch")).toHaveAttribute("data-status", "failed");
  await expect(p.getByTestId("batch")).toContainText("Not in the cart — the transfer failed");
  // The opener is gone; focus stays near the transfers.
  await expect.poll(async () => p.evaluate(() => !!document.activeElement?.closest('[data-testid="transfers"]'))).toBe(true);
  expect(await retailerCalls()).toBe(1); // recording an observation never resends
  await alex.context.close();
});

test("B15 removing a request needs confirmation, and the safe choice has focus", async ({ browser }) => {
  await seed();
  const alex = await member(browser, "alex");
  const p = alex.page;
  await p.getByRole("link", { name: "Groceries" }).click();
  const f = p.getByTestId("alsoneed-groceries");
  await f.getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
  await f.getByRole("button", { name: "Add", exact: true }).click();
  await expect(p.getByTestId("line-greek_yogurt")).toContainText("Usual amount — requested by Alex");
  const opener = p.getByRole("button", { name: "Remove usual request for Plain Greek yogurt" });
  await opener.click();
  const dialog = p.getByRole("dialog", { name: "Remove the usual request for Plain Greek yogurt?" });
  expect((await focused(p)).name).toBe("Keep it");
  await p.keyboard.press("Enter"); // the default does not remove
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).name).toBe("Remove usual request for Plain Greek yogurt");
  expect(await q<any>("SELECT state FROM household_requests WHERE ingredient_key='greek_yogurt'")).toEqual([{ state: "active" }]);
  await opener.click();
  // Jon asks for yogurt too while Alex is deciding: her confirmation is out of date and is held.
  const jon = await member(browser, "jon");
  await jon.page.getByTestId("alsoneed-week").getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
  await jon.page.getByTestId("alsoneed-week").getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByTestId("remove-conflict")).toContainText("now Alex and Jon");
  await expect(dialog.getByRole("button", { name: "Remove request" })).toBeDisabled();
  await dialog.getByRole("button", { name: "I've seen who asked" }).click();
  await dialog.getByRole("button", { name: "Remove request" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await q<any>("SELECT state FROM household_requests WHERE ingredient_key='greek_yogurt'")).toEqual([{ state: "removed" }]);
  await jon.context.close();
  // The dinner's own need for yogurt (Sunday) is still on the list.
  await expect(p.getByTestId("line-greek_yogurt")).toContainText("Dinners:");
  await expect.poll(async () => (await focused(p)).isBody).toBe(false);
  await alex.context.close();
});

test("B15 unavailable and unresolved lines are named as such to a screen reader", async ({ browser }) => {
  const fx = await seed();
  const kroger = await product(fx.householdId, "greek_yogurt", "Kroger Greek yogurt 32 oz", { retailer: "kroger", qty: "32", unit: "oz" });
  const alex = await member(browser, "alex");
  const p = alex.page;
  await p.getByRole("link", { name: "Groceries" }).click();
  const f = p.getByTestId("alsoneed-groceries");
  await f.getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
  await f.getByRole("button", { name: "Add", exact: true }).click();
  await expect(p.getByTestId("line-greek_yogurt")).toContainText("Usual amount");
  // The remembered package is one the active store doesn't sell (e.g. remembered under another store).
  await q("UPDATE household_requests SET product_id=$1 WHERE ingredient_key='greek_yogurt'", [kroger]);
  await alex.page.evaluate(async () => {
    // A purchasing-input change recomputes every list (any member could make one).
    const r = await fetch("/api/snapshot");
    const s = await r.json();
    const rice = s.groceries.products.find((x: any) => x.ingredientKey === "rice");
    await fetch("/api/commands/ChooseProduct", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `x-${crypto.randomUUID()}`, payload: { weekId: s.week.id, ingredientKey: "rice", productId: rice.id } }) });
  });
  await p.reload();
  await expect(p.getByRole("heading", { name: /^Plain Greek yogurt: Needs review, Product unavailable at this store, Unresolved$/ })).toHaveCount(1);
  await p.getByRole("button", { name: /^(Change product|Choose a product) for Plain Greek yogurt$/ }).click();
  const dialog = p.getByRole("dialog", { name: "Product for Plain Greek yogurt" });
  await expect(dialog.getByRole("radio", { name: /Kroger Greek yogurt 32 oz.*not available from this store/ })).toBeDisabled();
  await alex.context.close();
});

for (const width of [320, 390]) {
  test(`B15 dialogs at ${width}px with 150% text fit, scroll themselves, and stay clear of the nav; reduced motion is respected`, async ({ browser }) => {
    await seed();
    const alex = await member(browser, "alex", { viewport: { width, height: 640 }, reducedMotion: "reduce" });
    const p = alex.page;
    await p.getByRole("link", { name: "Groceries" }).click();
    await p.addStyleTag({ content: "html { font-size: 150% !important; }" });
    await p.getByRole("button", { name: "Change product for Broccoli" }).click();
    const dialog = p.getByRole("dialog", { name: "Product for Broccoli" });
    const box = await dialog.evaluate((d) => {
      const r = d.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, sw: d.scrollWidth, cw: d.clientWidth, vw: innerWidth, vh: innerHeight, anim: getComputedStyle(d).animationName };
    });
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.vw + 0.5);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(box.vh + 0.5);
    expect(box.sw, "no sideways scrolling inside the dialog").toBeLessThanOrEqual(box.cw);
    expect(box.anim).toBe("none");
    for (const name of ["Close product for Broccoli", "Use for this pickup", "Save product"]) {
      const el = dialog.getByRole("button", { name });
      await el.scrollIntoViewIfNeeded();
      const ok = await el.evaluate((b) => {
        const r = b.getBoundingClientRect();
        return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) && r.right <= innerWidth && r.left >= 0;
      });
      expect(ok, name).toBe(true);
    }
    await p.keyboard.press("Escape");
    // Every nav tab stays on screen and hittable at this width and text size (the Groceries tab
    // carries an outstanding-work count).
    for (const id of ["nav-week", "nav-explore", "nav-recipes", "nav-groceries", "nav-household"]) {
      const ok = await p.getByTestId(id).evaluate((a) => {
        const r = a.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth + 0.5 && a.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      });
      expect(ok, id).toBe(true);
    }
    await p.getByRole("link", { name: "Household" }).click();
    await p.getByTestId("add-staple").click();
    const add = p.getByRole("dialog", { name: "Add a usual item" });
    const ab = await add.evaluate((d) => ({ sw: d.scrollWidth, cw: d.clientWidth, right: d.getBoundingClientRect().right, vw: innerWidth }));
    expect(ab.sw).toBeLessThanOrEqual(ab.cw);
    expect(ab.right).toBeLessThanOrEqual(ab.vw + 0.5);
    const btn = add.getByRole("button", { name: "Add usual item" });
    await btn.scrollIntoViewIfNeeded();
    expect(await btn.evaluate((b) => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })).toBe(true);
    expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await alex.context.close();
  });
}

for (const order of ["Jon changes first", "Alex changes first"] as const) {
  test(`Scenario E: a product dialog open during the other member's change keeps typed work and focus, and shows the conflict — ${order}`, async ({ browser }) => {
    const fx = await seed();
    const organic = await product(fx.householdId, "broccoli", "Organic broccoli 1 lb");
    const frozen = await product(fx.householdId, "broccoli", "Frozen broccoli 1 lb");
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex", { init: recordAnnouncements });
    for (const m of [jon, alex]) {
      await m.page.getByRole("link", { name: "Groceries" }).click();
      await m.page.getByRole("button", { name: "Change product for Broccoli" }).click();
    }
    const [first, second] = order === "Jon changes first" ? [jon, alex] : [alex, jon];
    const firstPick = order === "Jon changes first" ? "Organic broccoli 1 lb" : "Frozen broccoli 1 lb";
    const secondPick = order === "Jon changes first" ? "Frozen broccoli 1 lb" : "Organic broccoli 1 lb";
    const d2 = second.page.getByRole("dialog", { name: "Product for Broccoli" });
    // The second member is mid-way: a radio picked and a new product name half-typed, focus in the field.
    await d2.getByRole("radio", { name: new RegExp(secondPick) }).check();
    const nameField = d2.getByLabel("Product name");
    await nameField.fill("Broccoli florets bag");
    await nameField.focus();
    // The first member commits a choice.
    const d1 = first.page.getByRole("dialog", { name: "Product for Broccoli" });
    await d1.getByRole("radio", { name: new RegExp(firstPick) }).check();
    await d1.getByRole("button", { name: "Use for this pickup" }).click();
    await expect(d1).toHaveCount(0);
    // The second sees the conflict live: typed work and selection kept, focus not moved, saving held.
    await expect(d2.getByTestId("product-conflict")).toContainText(`to ${firstPick}`);
    await expect(nameField).toHaveValue("Broccoli florets bag");
    await expect(d2.getByRole("radio", { name: new RegExp(secondPick) })).toBeChecked();
    expect(await focused(second.page)).toMatchObject({ id: "pd-name", inDialog: true });
    await expect(d2.getByRole("button", { name: "Use for this pickup" })).toBeDisabled();
    await expect(d2.getByRole("button", { name: "Save product" })).toBeDisabled();
    // After reviewing, the second member's deliberate choice goes through.
    await d2.getByRole("button", { name: "I've reviewed the current product" }).click();
    await d2.getByRole("button", { name: "Use for this pickup" }).click();
    await expect(d2).toHaveCount(0);
    const final = (await q<any>("SELECT p.name FROM product_mappings m JOIN products p ON p.id=m.product_id WHERE m.ingredient_key='broccoli'"))[0].name;
    expect(final).toBe(secondPick);
    void organic; void frozen;
    await jon.context.close();
    await alex.context.close();
  });
}

test("Scenario E (server side): a stale product choice sent anyway is refused with the current product", async ({ browser }) => {
  const fx = await seed();
  const organic = await product(fx.householdId, "broccoli", "Organic broccoli 1 lb");
  const alex = await member(browser, "alex");
  const r = await alex.page.evaluate(async ({ organic, original }) => {
    const s = await (await fetch("/api/snapshot")).json();
    const post = (expected: string) => fetch("/api/commands/ChooseProduct", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `e-${crypto.randomUUID()}`, payload: { weekId: s.week.id, ingredientKey: "broccoli", productId: organic, expectedProductId: expected } }) }).then((x) => x.json());
    return { stale: await post("00000000-0000-0000-0000-000000000000"), ok: await post(original) };
  }, { organic, original: fx.products.broccoli });
  expect(r.stale.code).toBe("product_changed");
  expect(r.ok.status).toBe("accepted");
  await alex.context.close();
});

for (const order of ["Jon saves first", "Alex saves first"] as const) {
  test(`Scenario A: both members edit the same staple; the first save survives, the second sees the conflict and the current value, then resubmits — ${order}`, async ({ browser }) => {
    await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    // Jon makes yogurt a usual item from Household.
    await jon.page.getByRole("link", { name: "Household" }).click();
    await jon.page.getByTestId("add-staple").click();
    const add = jon.page.getByRole("dialog", { name: "Add a usual item" });
    await add.getByLabel("Item").selectOption({ label: "Plain Greek yogurt" });
    await add.getByRole("button", { name: "Add usual item" }).click();
    await expect(add).toHaveCount(0);
    await alex.page.getByRole("link", { name: "Household" }).click();
    await expect(alex.page.getByTestId("staple-row-greek_yogurt")).toBeVisible();
    for (const m of [jon, alex]) await m.page.getByRole("button", { name: "Edit Plain Greek yogurt" }).click();
    const [first, second] = order === "Jon saves first" ? [jon, alex] : [alex, jon];
    const d1 = first.page.getByRole("dialog", { name: "Edit Plain Greek yogurt" });
    const d2 = second.page.getByRole("dialog", { name: "Edit Plain Greek yogurt" });
    await d2.getByLabel("Name on the shortcut (optional)").fill("Second's yogurt");
    await d2.getByLabel("Usual amount").fill("4");
    await d1.getByLabel("Name on the shortcut (optional)").fill("First's yogurt");
    await d1.getByLabel("Usual amount").fill("2");
    await d1.getByRole("button", { name: "Save" }).click();
    await expect(d1).toHaveCount(0);
    // Live conflict on the second: current values shown, typed values kept, save held until reviewed.
    await expect(d2.getByTestId("staple-conflict")).toContainText("Now: First's yogurt, 2 packages");
    await expect(d2.getByLabel("Name on the shortcut (optional)")).toHaveValue("Second's yogurt");
    await expect(d2.getByLabel("Usual amount")).toHaveValue("4");
    await expect(d2.getByRole("button", { name: "Save" })).toBeDisabled();
    expect((await q<any>("SELECT display_name, usual_packages, details_revision FROM household_staples"))[0]).toEqual({ display_name: "First's yogurt", usual_packages: 2, details_revision: 2 });
    await d2.getByRole("button", { name: "I’ve reviewed the current values" }).click();
    await d2.getByRole("button", { name: "Save" }).click();
    await expect(d2).toHaveCount(0);
    expect((await q<any>("SELECT display_name, usual_packages, details_revision FROM household_staples"))[0]).toEqual({ display_name: "Second's yogurt", usual_packages: 4, details_revision: 3 });
    await expect(first.page.getByTestId("staple-row-greek_yogurt")).toContainText("Second's yogurt");
    await jon.context.close();
    await alex.context.close();
  });
}

test("B16 Household: add, rename, change amount and product, remove and restore by keyboard; availability shown; both members see it; the shortcut follows", async ({ browser }) => {
  const fx = await seed();
  const fage = await product(fx.householdId, "greek_yogurt", "Fage Total 35 oz", { qty: "35", unit: "oz", price: 699 });
  const kroger = await product(fx.householdId, "greek_yogurt", "Kroger Greek yogurt 32 oz", { retailer: "kroger", qty: "32", unit: "oz" });
  const jon = await member(browser, "jon", { init: recordAnnouncements });
  const alex = await member(browser, "alex");
  const p = jon.page;
  noNativeDialogs(p);
  await p.getByRole("link", { name: "Household" }).click();
  // Add by keyboard.
  await p.getByTestId("add-staple").focus();
  await p.keyboard.press("Enter");
  const add = p.getByRole("dialog", { name: "Add a usual item" });
  expect(await focused(p)).toMatchObject({ inDialog: true, id: "st-item" });
  await trapped(p, 15);
  await add.getByRole("button", { name: "Add usual item" }).click();
  await expect(add.getByLabel("Item")).toHaveAccessibleDescription("Choose an item");
  await expect.poll(async () => (await focused(p)).id).toBe("st-item");
  await add.getByLabel("Item").selectOption({ label: "Plain Greek yogurt" });
  await add.getByLabel("Name on the shortcut (optional)").fill("Breakfast yogurt");
  await add.getByRole("button", { name: "Add usual item" }).click();
  await expect(add).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).testid).toBe("add-staple");
  const row = p.getByTestId("staple-row-greek_yogurt");
  await expect(row).toContainText("Usual amount: 1 package");
  await expect(row).toContainText("Product: Plain Greek yogurt 32 oz tub — available from the active store");
  await expect(row).toContainText("Last changed by Jon (created)");
  // Alex sees it and its one-tap chip.
  await alex.page.getByRole("link", { name: "Household" }).click();
  await expect(alex.page.getByTestId("staple-row-greek_yogurt")).toContainText("Breakfast yogurt");

  // Measured amount: 64 oz of the 32 oz tub.
  await row.getByRole("button", { name: "Edit Breakfast yogurt" }).click();
  const ed = p.getByRole("dialog", { name: "Edit Breakfast yogurt" });
  await ed.getByLabel("Usual amount").fill("64");
  await ed.getByLabel("Unit").selectOption("oz");
  await ed.getByRole("button", { name: "Save" }).click();
  await expect(ed).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).name).toBe("Edit Breakfast yogurt");
  await expect(row).toContainText("Usual amount: 64 oz (2 packages of the remembered product)");

  // Change product: the unavailable store product can't be picked; Escape changes nothing.
  await row.getByRole("button", { name: "Change product for Breakfast yogurt" }).click();
  const pd = p.getByRole("dialog", { name: "Remembered product for Breakfast yogurt" });
  await expect(pd.getByRole("radio", { name: /Kroger Greek yogurt 32 oz.*not available from this store/ })).toBeDisabled();
  await pd.getByRole("radio", { name: /Fage Total 35 oz/ }).check();
  await p.keyboard.press("Escape");
  await expect(pd).toHaveCount(0);
  expect((await q<any>("SELECT product_revision FROM household_staples"))[0].product_revision).toBe(1);
  await row.getByRole("button", { name: "Change product for Breakfast yogurt" }).click();
  await pd.getByRole("radio", { name: /Fage Total 35 oz/ }).check();
  await pd.getByRole("button", { name: "Make this our usual" }).click();
  await expect(pd).toHaveCount(0);
  await expect(row).toContainText("Product: Fage Total 35 oz — available");
  await expect(row).toContainText("64 oz (2 packages"); // 64/35 rounds up to 2
  await expect(alex.page.getByTestId("staple-row-greek_yogurt")).toContainText("Fage Total 35 oz");
  expect(await q("SELECT 1 FROM purchase_approvals")).toHaveLength(0); // a product preference approves nothing

  // A remembered product the store doesn't sell is shown as such.
  await q("UPDATE household_staples SET product_id=$1 WHERE ingredient_key='greek_yogurt'", [kroger]);
  await p.reload();
  await expect(p.getByTestId("staple-product-greek_yogurt")).toContainText("Kroger Greek yogurt 32 oz — not available from the active store");
  await q("UPDATE household_staples SET product_id=$1 WHERE ingredient_key='greek_yogurt'", [fage]);
  await p.reload();

  // Remove: confirmation with Keep as the default; then remove; the chip goes, the list stays.
  await p.getByRole("link", { name: "Week" }).click();
  await expect(p.getByTestId("alsoneed-week").getByRole("button", { name: /^Breakfast yogurt( ×\d+)? — your usual/ })).toBeVisible();
  await p.getByTestId("alsoneed-week").getByRole("button", { name: /^Breakfast yogurt( ×\d+)? — your usual/ }).click();
  await p.getByRole("link", { name: "Household" }).click();
  await row.getByRole("button", { name: "Remove Breakfast yogurt from usual items" }).click();
  const rm = p.getByRole("dialog", { name: "Remove Breakfast yogurt from usual items?" });
  expect((await focused(p)).name).toBe("Keep it");
  await rm.getByRole("button", { name: "Remove from usual items" }).click();
  await expect(rm).toHaveCount(0);
  await expect(p.getByTestId("removed-staples")).toContainText("Breakfast yogurt — removed by Jon");
  await expect.poll(async () => (await focused(p)).name).toBe("Restore Breakfast yogurt to usual items");
  expect(await q<any>("SELECT state FROM household_requests WHERE ingredient_key='greek_yogurt'")).toEqual([{ state: "active" }]);
  await p.getByRole("link", { name: "Week" }).click();
  await expect(p.getByTestId("alsoneed-week")).toBeVisible(); // (wait for the Week page before asserting absence)
  await expect(p.getByTestId("alsoneed-week").getByRole("button", { name: /^Breakfast yogurt/ })).toHaveCount(0);
  await p.getByTestId("nav-household").click();
  await p.getByRole("button", { name: "Restore Breakfast yogurt to usual items" }).click();
  await expect(p.getByTestId("staple-row-greek_yogurt")).toContainText("Last changed by Jon (restored)");
  await expect(alex.page.getByTestId("staple-row-greek_yogurt")).toContainText("Last changed by Jon (restored)");
  await jon.context.close();
  await alex.context.close();
});
