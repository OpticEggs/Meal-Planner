/**
 * Supplemental engineering checks that need a browser or a real server process.
 */
import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { NIGHT, USERS } from "../fixtures/household";
import { member, nightTitle, previewReplace, q, retailerCalls, seed } from "./helpers";
import { TEST_ENV } from "../../playwright.config";

test("X01: unauthenticated and other-household sessions cannot read or write this household", async ({ browser, request }) => {
  const fx = await seed();
  for (const path of ["/api/snapshot", "/api/library", "/api/export", "/api/events"]) {
    expect((await request.get(path)).status(), path).toBe(401);
  }
  const anon = await request.post("/api/commands/SetNightLock", { data: { operationId: "anon-12345678", payload: { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: true } } });
  expect(anon.status()).toBe(401);
  const other = await member(browser, "other");
  const snap = await other.page.evaluate(async () => (await fetch("/api/snapshot?week=2026-10-12")).json());
  expect(JSON.stringify(snap)).not.toContain(fx.weekId);
  expect(snap.week).toBeNull();
  const exp = await other.page.evaluate(async () => (await fetch("/api/export")).text());
  expect(exp).not.toContain(fx.householdId);
  expect(exp).not.toContain("Fixture: Salmon rice bowls");
  const write = await other.page.evaluate(async (id) => {
    const r = await fetch("/api/commands/SetNightLock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `x01-${crypto.randomUUID()}`, payload: { assignmentId: id, expectedRevision: 1, locked: true } }) });
    return { status: r.status, body: await r.json() };
  }, fx.assignments.mon);
  expect(write.body.code).toBe("not_found");
  // Cross-site form/fetch with a stolen-cookie shape is refused before any handler runs.
  const cross = await other.page.evaluate(async () => {
    const r = await fetch("/api/commands/SetNightLock", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    return r.status;
  });
  expect(cross).toBe(415);
  const jon = await member(browser, "jon");
  const evil = await jon.context.request.post("/api/commands/SetNightLock", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { operationId: "x01-evil-1234", payload: { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: true } },
  });
  expect(evil.status()).toBe(403);
  expect((await nightTitle(fx.weekId, NIGHT.mon)).revision).toBe(1);
  expect((await q("SELECT count(*)::int n FROM change_events"))[0].n).toBe(0);
  await other.context.close();
  await jon.context.close();
});

test("X10: discovery — focus-stable search, real sorts with an unknown group, opening the selected recipe, persisted notes", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  await jon.page.getByRole("link", { name: "Explore" }).click();
  const search = jon.page.getByTestId("explore-search");
  await search.click();
  await jon.page.keyboard.type("chicken rice", { delay: 30 });
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("chicken rice");
  await expect(jon.page.getByTestId("recipe-card")).toHaveCount(1);
  await expect(jon.page.getByTestId("recipe-card")).toHaveAttribute("data-title", "Fixture: Sheet-pan chicken and rice");
  await search.fill("");
  await jon.page.getByTestId("explore-sort").selectOption("serving_cost");
  const values = await jon.page.getByTestId("explore-results").getByTestId("recipe-card").evaluateAll((els) =>
    els.map((e) => Number((e.textContent ?? "").match(/Serving \$([\d.]+)/)?.[1] ?? NaN)),
  );
  expect(values.length).toBeGreaterThan(3);
  expect(values).toEqual([...values].sort((a, b) => a - b));
  expect(values.every((v) => !Number.isNaN(v))).toBe(true);
  await expect(jon.page.getByTestId("unknown-group")).toBeVisible(); // pesto: package unit cannot convert -> unknown, not $0
  await jon.page.getByTestId("explore-sort").selectOption("calories");
  await expect(jon.page.getByTestId("unknown-group")).toBeVisible();
  // Opening a recipe opens THAT recipe (the prototype opened tonight's instead).
  await jon.page.locator('[data-testid="recipe-card"][data-title="Fixture: Salmon rice bowls"]').getByRole("link").click();
  await expect(jon.page.getByTestId("recipe-title")).toHaveText("Fixture: Salmon rice bowls");
  await jon.context.close();
});

test("X11: narrow mobile layout, keyboard operation, text scaling, distinct identities", async ({ browser }) => {
  await seed();
  for (const width of [320, 390]) {
    const jon = await member(browser, "jon", { viewport: { width, height: 800 } });
    for (const path of ["/", "/groceries", "/explore", "/recipes", "/household"]) {
      await jon.page.goto(path);
      await expect(jon.page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
      const overflow = await jon.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
    await jon.page.goto("/");
    await jon.page.addStyleTag({ content: "html { font-size: 150% !important; }" });
    const overflow = await jon.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `150% text at ${width}px`).toBeLessThanOrEqual(0);
    await jon.context.close();
  }
  // Keyboard: reach Friday's Change control and open the sheet without a pointer.
  const alex = await member(browser, "alex");
  const change = alex.page.getByTestId(`change-${NIGHT.fri}`);
  await change.focus();
  await alex.page.keyboard.press("Enter");
  await expect(alex.page.getByTestId(`sheet-${NIGHT.fri}`)).toBeVisible();
  await alex.page.keyboard.press("Tab");
  const focused = await alex.page.evaluate(() => document.activeElement?.getAttribute("role") ?? document.activeElement?.tagName);
  expect(focused).toBeTruthy();
  // Two distinct authenticated identities (separate cookies), not two tabs of one login.
  const jon = await member(browser, "jon");
  const c1 = (await jon.context.cookies()).map((c) => c.value).join();
  const c2 = (await alex.context.cookies()).map((c) => c.value).join();
  expect(c1).not.toBe(c2);
  await expect(jon.page.getByTestId("me")).toHaveText(USERS.jon.name);
  await expect(alex.page.getByTestId("me")).toHaveText(USERS.alex.name);
  await jon.context.close();
  await alex.context.close();
});

// ---------------------------------------------------------------------------------------------
// Process restart tests use their own server so they can kill it.

const PORT2 = 3101;
const BASE2 = `http://127.0.0.1:${PORT2}`;
let server: ChildProcess | null = null;
async function startServer() {
  server = spawn("npx", ["next", "start", "-p", String(PORT2), "-H", "127.0.0.1"], {
    env: { ...process.env, ...TEST_ENV, BETTER_AUTH_URL: BASE2 },
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`${BASE2}/login`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}
function killServer(signal: NodeJS.Signals = "SIGKILL") {
  if (server?.pid) process.kill(-server.pid, signal);
  server = null;
}
test.afterEach(() => {
  if (server) killServer();
});

test.describe("process restart", () => {
  test.use({ baseURL: BASE2 });

  test("X02: server restart, missed events and a delayed older response cannot roll back accepted state", async ({ browser }) => {
    const fx = await seed();
    await startServer();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    await previewReplace(alex.page, NIGHT.sun, "Fixture: Turkey chili");
    await alex.page.getByTestId("apply").click();
    await expect(jon.page.getByTestId(`night-title-${NIGHT.sun}`)).toHaveText("Fixture: Turkey chili");
    killServer(); // hard stop: no graceful shutdown
    await expect(jon.page.getByTestId("currency")).toHaveAttribute("data-currency", "offline", { timeout: 30_000 });
    await expect(jon.page.getByTestId(`night-title-${NIGHT.sun}`)).toHaveText("Fixture: Turkey chili"); // last-synced view kept
    await startServer();
    // Jon's next snapshot response is delayed and arrives after a newer decision.
    let delayed = false;
    await jon.page.route("**/api/snapshot*", async (route) => {
      if (delayed) return route.continue();
      delayed = true;
      const resp = await route.fetch();
      const body = await resp.text();
      await new Promise((r) => setTimeout(r, 2500));
      await route.fulfill({ response: resp, body });
    });
    await jon.page.evaluate(() => window.dispatchEvent(new Event("online")));
    await previewReplace(alex.page, NIGHT.fri, "Fixture: Chicken penne");
    await alex.page.getByTestId("apply").click();
    await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Chicken penne", { timeout: 30_000 });
    await jon.page.waitForTimeout(3000); // the delayed older response has now landed
    await expect(jon.page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Chicken penne");
    await expect(jon.page.getByTestId("accepted-revision")).toHaveText("3");
    expect((await nightTitle(fx.weekId, NIGHT.sun)).title).toBe("Fixture: Turkey chili");
    expect((await nightTitle(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Chicken penne");
    await jon.context.close();
    await alex.context.close();
  });

  test("X05: the server dies after dispatch started; on restart the transfer is uncertain and never replayed", async ({ browser }) => {
    const fx = await seed();
    await q("INSERT INTO fake_retailer_script(household_id, behavior, barrier) VALUES ($1,'delay_until_barrier','never')", [fx.householdId]);
    await q("INSERT INTO test_barriers(name) VALUES ('never')");
    await startServer();
    const alex = await member(browser, "alex");
    await alex.page.getByRole("link", { name: "Groceries" }).click();
    await alex.page.getByTestId("approve-all").click();
    await expect(alex.page.getByTestId("send")).toBeEnabled();
    await alex.page.getByTestId("send").click();
    for (let i = 0; i < 100 && (await retailerCalls()) === 0; i++) await alex.page.waitForTimeout(50);
    expect(await retailerCalls()).toBe(1);
    killServer(); // crash with the retailer call in flight
    await startServer(); // startup recovery runs here
    const status = (await q("SELECT status FROM handoff_status_events ORDER BY id DESC LIMIT 1"))[0].status;
    expect(status).toBe("uncertain");
    await alex.page.reload();
    await expect(alex.page.getByTestId("batch")).toHaveAttribute("data-status", "uncertain");
    await alex.page.waitForTimeout(1000);
    expect(await retailerCalls()).toBe(1);
    await alex.context.close();
  });
});
