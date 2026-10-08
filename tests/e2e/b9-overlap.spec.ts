/**
 * B9 with real processes: during an overlapping deploy a second server process starts while the first
 * is still waiting on the store. The new process's startup recovery must leave that send alone; the
 * first process then records the store's answer. Simulated retailer only.
 */
import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { member, q, retailerCalls, seed } from "./helpers";
import { TEST_ENV } from "../../playwright.config";

const PORT_B = 3102;
const BASE_B = `http://127.0.0.1:${PORT_B}`;
let second: ChildProcess | null = null;

async function reachable(url: string) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}
test.afterEach(() => {
  if (second?.pid) process.kill(-second.pid, "SIGKILL");
  second = null;
});

test("B9: a server process starting during another's in-flight send does not mark it uncertain; the first process records the answer", async ({ browser }) => {
  const fx = await seed();
  await q("INSERT INTO fake_retailer_script(household_id, behavior, barrier) VALUES ($1,'delay_until_barrier','deploy-overlap')", [fx.householdId]);
  await q("INSERT INTO test_barriers(name) VALUES ('deploy-overlap')");
  const alex = await member(browser, "alex"); // served by the first process (Playwright's server)
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await alex.page.getByTestId("approve-all").click();
  await expect(alex.page.getByTestId("send")).toBeEnabled();
  await alex.page.getByTestId("send").click();
  await expect.poll(retailerCalls).toBe(1); // the request is at the "store", which has not answered
  const last = async () => (await q("SELECT status FROM handoff_status_events ORDER BY id DESC LIMIT 1"))[0].status;
  expect(await last()).toBe("dispatch_started");

  // The new release starts (default bounds — production behavior). Its port was free, so whatever
  // answers there is this process.
  expect(await reachable(`${BASE_B}/api/health`)).toBe(false);
  const { TABLE_DISPATCH_TIMEOUT_MS: _ignored, ...env } = { ...process.env, ...TEST_ENV } as Record<string, string | undefined>;
  second = spawn("npx", ["next", "start", "-p", String(PORT_B), "-H", "127.0.0.1"], { env: { ...env, BETTER_AUTH_URL: BASE_B } as unknown as NodeJS.ProcessEnv, stdio: "ignore", detached: true });
  await expect.poll(() => reachable(`${BASE_B}/api/health`), { timeout: 30_000 }).toBe(true); // startup recovery has run
  await new Promise((r) => setTimeout(r, 1500));
  expect(await last(), "the new process must not mark a live send uncertain").toBe("dispatch_started");

  // The store answers the first process; it records the acknowledgment (batch-level), nothing is resent.
  await q("UPDATE test_barriers SET released_at=now() WHERE name='deploy-overlap'");
  await expect.poll(last, { timeout: 15_000 }).toBe("acknowledged");
  await alex.page.reload();
  await expect(alex.page.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
  expect(await retailerCalls()).toBe(1);
  await alex.context.close();
});
