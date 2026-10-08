/**
 * Found by the 4d0e822 verification run (T09 failed once, and a B14 background test once in a worker
 * run): a refresh that was already in flight when the app went to the background finished afterwards
 * and marked the view "Up to date" while hidden, so writes looked allowed on return before anything
 * was re-established. Deterministic reproduction: hold one snapshot response, background the page,
 * then let the response complete.
 */
import { expect, test } from "@playwright/test";
import { member, seed } from "./helpers";

test("a refresh that completes while the app is in the background never marks it up to date; returning re-establishes first", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  let caught = false;
  await p.route("**/api/snapshot*", async (route) => {
    if (!caught) {
      caught = true;
      await held; // this one response is delayed until the page is in the background
    }
    await route.continue();
  });
  await p.evaluate(() => window.dispatchEvent(new Event("focus"))); // starts a refresh (focus refetch)
  await expect.poll(() => caught).toBe(true);
  await p.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  release(); // the in-flight refresh now completes successfully, while hidden
  await p.waitForTimeout(1000);
  await expect(p.getByTestId("currency")).not.toHaveAttribute("data-currency", "current");
  // Return: re-established, then up to date.
  await p.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await jon.context.close();
});
