/**
 * Q4 (2026-10-11): primary navigation is Recipes · Selected · Groceries · More, signing in lands on
 * Recipes, and the dinner calendar, Explore and Budget Bytes, Saved links and Household are reached
 * through More. Q3: the app is dark whatever the device prefers.
 */
import { expect, test } from "@playwright/test";
import { member, seed, viaMore } from "./helpers";

const TABS = [
  ["nav-recipes", "Recipes"],
  ["nav-selected", "Selected"],
  ["nav-groceries", /^Groceries/],
  ["nav-more", "More"],
] as const;

test("Q4: four tabs with names and 44px targets; sign-in lands on Recipes; More holds the rest and stays current there", async ({ browser }) => {
  await seed();
  const { page, context } = await member(browser, "jon", { start: "/recipes", viewport: { width: 390, height: 844 } });
  await expect(page).toHaveURL(/\/recipes$/);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  for (const [id, name] of TABS) {
    const link = page.getByTestId(id);
    await expect(link).toHaveAccessibleName(name);
    const box = (await link.boundingBox())!;
    expect(box.height, id).toBeGreaterThanOrEqual(44);
    expect(box.width, id).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByTestId("nav-recipes")).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);

  // Selected: the placeholder screen, no count yet.
  await page.getByTestId("nav-selected").click();
  await expect(page.getByRole("heading", { name: "Selected meals" })).toBeVisible();
  await expect(page.getByText("Nothing selected yet.")).toBeVisible();
  await expect(page.getByTestId("nav-selected")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("nav-selected")).toHaveAccessibleName("Selected");

  // More: four entries, each with a one-line description; More is current on every screen it leads to.
  await page.getByTestId("nav-more").click();
  await expect(page.getByRole("heading", { name: "More", exact: true })).toBeVisible();
  await expect(page.getByTestId("nav-more")).toHaveAttribute("aria-current", "page");
  for (const [entry, description] of [
    ["Dinner calendar", /Plan dinners/],
    ["Explore and Budget Bytes", /Budget Bytes/],
    ["Saved links", /saved/],
    ["Household", /Settings/],
  ] as const) {
    await expect(page.getByRole("link", { name: entry, exact: true })).toHaveAccessibleDescription(description);
  }

  await viaMore(page, "Dinner calendar");
  await expect(page.getByTestId("week-title")).toBeVisible();
  await expect(page.getByTestId("nav-more")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("week-groceries-link").click();
  await expect(page).toHaveURL(/\/week\/groceries$/);
  await expect(page.getByTestId("still-to-buy")).toBeVisible();
  await expect(page.getByTestId("nav-more")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("nav-groceries")).not.toHaveAttribute("aria-current", "page");

  await viaMore(page, "Explore and Budget Bytes");
  await expect(page.getByTestId("explore-search")).toBeVisible();
  await expect(page.getByTestId("nav-more")).toHaveAttribute("aria-current", "page");

  await viaMore(page, "Saved links");
  await expect(page.getByRole("tab", { name: "Saved links" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("nav-recipes")).toHaveAttribute("aria-current", "page");
  // The Recipes tab itself opens the full list again.
  await page.getByTestId("nav-recipes").click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");

  await viaMore(page, "Household");
  await expect(page.getByTestId("settings")).toBeVisible();
  await expect(page.getByTestId("nav-more")).toHaveAttribute("aria-current", "page");
  await context.close();
});

test("Q3: dark whatever the device prefers — the same ground in a light-preferring browser", async ({ browser }) => {
  await seed();
  const { page, context } = await member(browser, "jon", { start: "/recipes" });
  const ground = async () => page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, scheme: getComputedStyle(document.documentElement).colorScheme }));
  await page.emulateMedia({ colorScheme: "light" });
  const light = await ground();
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await ground();
  expect(light).toEqual(dark);
  expect(dark.scheme).toBe("dark");
  const [r, g, b] = dark.bg.match(/\d+/g)!.map(Number);
  expect(Math.max(r, g, b)).toBeLessThan(24); // near-black
  expect(await page.locator('meta[name="theme-color"]').count()).toBe(1);
  await context.close();
});
