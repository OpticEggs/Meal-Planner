/**
 * B46: "Yes, record this order" pressed while the screen is not current (a snapshot refresh is in flight, or the app
 * is offline). The snapshot response is held by the test, so the overlap is deliberate, not a lucky race: the refresh
 * starts (focus event), its response is withheld, the button is pressed at its position (a person's tap, which does not
 * wait for the button to become usable), and only then is the response released.
 *
 * Each test records the request count and what was persisted. Diagnostics separate the two ways a press can do
 * nothing: the button already disabled so no click reaches its handler, or the handler runs and sends nothing.
 * The retailer is the simulated fake; ConfirmOrder makes no retailer call at all.
 */
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { member, q, retailerCalls, seed, weekGroceries } from "./helpers";

type Gate = { hold(): void; release(): void; freeze(): void; requests(): number };

/** Controls this page's snapshot responses: pass through, hold until released, or replay the last one (stale). */
async function snapshotGate(page: Page): Promise<Gate> {
  let holding = false;
  let frozen = false;
  let waiting: (() => void)[] = [];
  let last: { status: number; headers: Record<string, string>; body: string } | null = null;
  let n = 0;
  await page.route(/\/api\/snapshot(\?|$)/, async (route) => {
    n++;
    if (frozen && last) return route.fulfill(last);
    if (holding) await new Promise<void>((r) => waiting.push(r));
    const res = await route.fetch();
    const body = await res.text();
    last = { status: res.status(), headers: res.headers(), body };
    return route.fulfill({ status: res.status(), headers: res.headers(), body });
  });
  return {
    hold: () => { holding = true; },
    release: () => { holding = false; const w = waiting; waiting = []; w.forEach((r) => r()); },
    freeze: () => { frozen = true; },
    requests: () => n,
  };
}

/** Counts ConfirmOrder requests leaving the browser. */
function confirmRequests(page: Page) {
  let n = 0;
  page.on("request", (r) => { if (r.url().includes("/api/commands/ConfirmOrder")) n++; });
  return () => n;
}

/** Counts click events that actually reach the "Yes, record this order" button (capture phase, before React). */
async function countYesClicks(page: Page) {
  await page.evaluate(() => {
    (window as any).__b46clicks = 0;
    document.addEventListener("click", (e) => {
      const b = (e.target as Element | null)?.closest?.("button");
      if (b && b.textContent?.trim() === "Yes, record this order") (window as any).__b46clicks++;
    }, true);
  });
  return () => page.evaluate(() => (window as any).__b46clicks as number);
}

/** A person's tap at the button's position: unlike locator.click(), it does not wait for the button to be enabled. */
async function tap(page: Page, name: string) {
  const b = page.getByRole("dialog", { name: "Confirm order contents" }).getByRole("button", { name });
  const box = (await b.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

const currency = (p: Page) => p.getByTestId("currency");
const orders = async () => (await q<{ n: number }>("SELECT count(*)::int AS n FROM orders"))[0].n;

/** Sent groceries → the order dialog's review step, with values the member typed (an extra line, a pickup time). */
async function toReview(p: Page) {
  await weekGroceries(p);
  await p.getByTestId("approve-all").click();
  await p.getByTestId("send").click();
  await expect(p.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
  await p.getByRole("button", { name: "Confirm order contents…" }).click();
  const dialog = p.getByRole("dialog", { name: "Confirm order contents" });
  await dialog.getByRole("button", { name: "add line" }).click();
  const items = dialog.getByRole("textbox", { name: /^Item \d+$/ });
  await items.last().fill("Paper towels");
  await dialog.getByLabel("Pickup time (optional)").fill("2026-10-14T17:30");
  await dialog.getByRole("button", { name: "Confirm order…" }).click();
  await expect(dialog.getByTestId("confirm-order-review")).toBeVisible();
  await expect(dialog.getByTestId("confirm-order-review")).toContainText("Paper towels ×1");
  await dialog.getByRole("button", { name: "Yes, record this order" }).scrollIntoViewIfNeeded();
  return dialog;
}

async function diag(info: TestInfo, data: Record<string, unknown>) {
  console.log("B46_DIAG", JSON.stringify(data));
  await info.attach("b46-diagnostics", { body: JSON.stringify(data, null, 2), contentType: "application/json" });
}

test("B46-1: pressed during a refresh → not recorded, said so, values kept; after the refresh one retry records it once", async ({ browser }, info) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  const gate = await snapshotGate(p);
  const sent = confirmRequests(p);
  const dialog = await toReview(p);
  await expect(currency(p)).toHaveAttribute("data-currency", "current");
  const clicks = await countYesClicks(p);
  const calls = await retailerCalls();

  // A refresh starts and its response is withheld: the screen is not current while the member presses Yes.
  gate.hold();
  await p.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(currency(p)).toHaveAttribute("data-currency", "refreshing");
  const yes = dialog.getByRole("button", { name: "Yes, record this order" });
  const atTap = await yes.evaluate((b) => ({ disabled: b.hasAttribute("disabled"), ariaDisabled: b.getAttribute("aria-disabled") }));
  await tap(p, "Yes, record this order");
  const note = dialog.getByTestId("confirm-order-not-recorded");
  const shown = await note.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
  await diag(info, { phase: "pressed during refresh", buttonAtTap: atTap, clickEventsReachingButton: await clicks(), confirmOrderRequests: sent(), ordersPersisted: await orders(), notRecordedNoteShown: shown });

  // Not recorded, and the dialog says so; nothing was sent; the dialog and everything typed are still there.
  await expect(note).toBeVisible();
  await expect(note).toContainText("Not recorded — nothing was sent.");
  await expect(note).toContainText("checking for the latest changes");
  expect(await clicks()).toBe(1); // the press reached the handler: it decided, it was not swallowed
  expect(sent()).toBe(0);
  expect(await orders()).toBe(0);
  await expect(dialog.getByTestId("confirm-order-review")).toContainText("Paper towels ×1");
  await expect(dialog.getByTestId("confirm-order-review")).toContainText("Pickup");
  await expect(yes).toHaveAttribute("aria-disabled", "true");

  // The refresh completes: recovery is stated, and nothing was sent on the member's behalf.
  gate.release();
  await expect(currency(p)).toHaveAttribute("data-currency", "current");
  await expect(note).toContainText("Not recorded yet. Table is up to date now");
  await expect(yes).not.toHaveAttribute("aria-disabled", "true");
  expect(sent()).toBe(0);
  expect(await orders()).toBe(0);

  // One deliberate retry records it exactly once, with what was typed.
  await dialog.getByRole("button", { name: "Yes, record this order" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(p.getByTestId("order")).toBeVisible();
  expect(sent()).toBe(1);
  expect(await orders()).toBe(1);
  const lines = (await q<{ name: string }>("SELECT name FROM order_lines ORDER BY name")).map((r) => r.name);
  expect(lines).toContain("Paper towels");
  expect((await q<any>("SELECT pickup_at FROM orders"))[0].pickup_at).not.toBeNull();
  expect(await retailerCalls()).toBe(calls); // confirming an order never calls the retailer
  await diag(info, { phase: "after retry", confirmOrderRequests: sent(), ordersPersisted: await orders(), snapshotRequests: gate.requests() });
  await jon.context.close();
});

test("B46-2: pressed while offline → not recorded and said so; back online, nothing is sent until the member presses again", async ({ browser }, info) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  const sent = confirmRequests(p);
  const dialog = await toReview(p);
  await expect(currency(p)).toHaveAttribute("data-currency", "current");
  const clicks = await countYesClicks(p);

  await jon.context.setOffline(true);
  await expect(currency(p)).toHaveAttribute("data-currency", "offline");
  await tap(p, "Yes, record this order");
  const note = dialog.getByTestId("confirm-order-not-recorded");
  const shown = await note.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
  await diag(info, { phase: "pressed offline", clickEventsReachingButton: await clicks(), confirmOrderRequests: sent(), ordersPersisted: await orders(), notRecordedNoteShown: shown });
  await expect(note).toContainText("Not recorded — nothing was sent.");
  await expect(note).toContainText("can’t reach Table");
  expect(sent()).toBe(0);

  // Back online: the screen becomes current, the note says so, and no order is queued or replayed.
  await jon.context.setOffline(false);
  await expect(currency(p)).toHaveAttribute("data-currency", "current");
  await expect(note).toContainText("Not recorded yet. Table is up to date now");
  await expect(dialog.getByTestId("confirm-order-review")).toContainText("Paper towels ×1");
  expect(sent()).toBe(0);
  expect(await orders()).toBe(0);
  await jon.context.close();
});

test("B46-3: a stale screen (another member already confirmed) is still refused by the server — one order, values kept", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  const gate = await snapshotGate(p);
  const sent = confirmRequests(p);
  const dialog = await toReview(p);
  await expect(currency(p)).toHaveAttribute("data-currency", "current");

  // Jon's screen stays current but stale: every refresh replays the snapshot from before Alex's confirmation.
  gate.freeze();
  const alex = await member(browser, "alex");
  const weekId = fx.weekId;
  const r = await alex.page.request.post("/api/commands/ConfirmOrder", { data: { operationId: `ConfirmOrder-${randomUUID()}`, payload: { weekId, contentsKnown: false, lines: [], pickupAt: null } } });
  expect((await r.json()).status).toBe("accepted");
  expect(await orders()).toBe(1);
  await p.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(currency(p)).toHaveAttribute("data-currency", "current");
  await expect(dialog.getByText("Someone already recorded this pickup's confirmed order")).toHaveCount(0); // stale on screen

  await dialog.getByRole("button", { name: "Yes, record this order" }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "An order is already confirmed for this pickup" })).toBeVisible();
  expect(sent()).toBe(1);
  expect(await orders()).toBe(1); // no duplicate order
  // The dialog stays open on the edit step with everything Jon typed.
  await expect(dialog.getByRole("textbox", { name: /^Item \d+$/ }).last()).toHaveValue("Paper towels");
  await expect(dialog.getByLabel("Pickup time (optional)")).toHaveValue("2026-10-14T17:30");
  await jon.context.close();
  await alex.context.close();
});

test("B46-4: a double press while current records once", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  const sent = confirmRequests(p);
  const dialog = await toReview(p);
  await expect(currency(p)).toHaveAttribute("data-currency", "current");
  await dialog.getByRole("button", { name: "Yes, record this order" }).dblclick();
  await expect(dialog).toHaveCount(0);
  await expect(p.getByTestId("order")).toBeVisible();
  expect(sent()).toBe(1);
  expect(await orders()).toBe(1);
  await jon.context.close();
});
